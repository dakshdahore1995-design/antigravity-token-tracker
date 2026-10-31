#!/usr/bin/env python3
"""
Antigravity Token & Credit Usage Sync Script
Scans ~/.gemini/antigravity-ide/conversations/*.db and ~/.gemini/antigravity-cli/conversations/*.db,
extracts 100% authentic raw protobuf LLM telemetry, and aggregates daily usage, models, streaks,
peak hours, and market cost estimation. Automatically syncs to local JSON and Supabase Cloud.
"""

import os
import glob
import sqlite3
import datetime
import json
import urllib.request
from collections import defaultdict

CONVERSATION_DIRS = [
    os.path.expanduser("~/.gemini/antigravity-ide/conversations"),
    os.path.expanduser("~/.gemini/antigravity-cli/conversations"),
]

OUTPUT_PUBLIC = os.path.join(os.path.dirname(__file__), "public", "antigravity-data.json")
OUTPUT_SRC = os.path.join(os.path.dirname(__file__), "src", "data", "initialData.json")

# Model pricing estimates ($ per 1 Million tokens)
# input_rate, output_rate, cached_rate
MODEL_PRICING = {
    "claude-opus-4-6-thinking": {"in": 15.00, "out": 75.00, "cache": 3.75, "label": "Claude 3.7 / 4.6 Opus Thinking"},
    "claude-sonnet-4-6": {"in": 3.00, "out": 15.00, "cache": 0.75, "label": "Claude 3.5 / 4.6 Sonnet"},
    "gemini-3.1-pro-low": {"in": 1.25, "out": 5.00, "cache": 0.31, "label": "Gemini 3.1 Pro (Low)"},
    "gemini-3.8-flash-high": {"in": 0.15, "out": 0.60, "cache": 0.04, "label": "Gemini 3.8 Flash (High)"},
    "gemini-3.8-flash-medium": {"in": 0.10, "out": 0.40, "cache": 0.025, "label": "Gemini 3.8 Flash (Med)"},
    "gemini-3.6-flash-low": {"in": 0.075, "out": 0.30, "cache": 0.02, "label": "Gemini 3.6 Flash (Low)"},
    "default": {"in": 0.50, "out": 2.00, "cache": 0.125, "label": "Antigravity AI Pro"},
}

def decode_protobuf(data):
    """Decodes arbitrary wire-format protobuf into dictionary."""
    i = 0
    res = {}
    while i < len(data):
        key = 0
        shift = 0
        while i < len(data):
            if i >= len(data): break
            b = data[i]
            i += 1
            key |= (b & 0x7f) << shift
            if not (b & 0x80): break
            shift += 7
        fn = key >> 3
        wt = key & 0x7
        if wt == 0:  # varint
            v = 0
            shift = 0
            while i < len(data):
                b = data[i]
                i += 1
                v |= (b & 0x7f) << shift
                if not (b & 0x80): break
                shift += 7
            res[fn] = v
        elif wt == 2:  # length-delimited
            l = 0
            shift = 0
            while i < len(data):
                b = data[i]
                i += 1
                l |= (b & 0x7f) << shift
                if not (b & 0x80): break
                shift += 7
            val = data[i:i+l]
            i += l
            res[fn] = val
        elif wt == 1:
            res[fn] = data[i:i+8]
            i += 8
        elif wt == 5:
            res[fn] = data[i:i+4]
            i += 4
        else:
            break
    return res

def extract_db_model(db_path):
    """Detects active model name in a conversation DB."""
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("SELECT data FROM executor_metadata")
        models = []
        for (d,) in c.fetchall():
            for m in [
                b"gemini-3.8-flash-high",
                b"gemini-3.8-flash-medium",
                b"gemini-3.6-flash-low",
                b"gemini-3.1-pro-low",
                b"claude-opus-4-6-thinking",
                b"claude-sonnet-4-6",
            ]:
                if m in d:
                    models.append(m.decode())
        if models:
            return models[-1]
    except Exception:
        pass
    return "gemini-3.8-flash-high"

def calculate_cost(model_name, in_t, out_t, cache_t):
    pricing = MODEL_PRICING.get(model_name, MODEL_PRICING["default"])
    cost = (
        (in_t / 1_000_000.0) * pricing["in"]
        + (out_t / 1_000_000.0) * pricing["out"]
        + (cache_t / 1_000_000.0) * pricing["cache"]
    )
    return round(cost, 4)

def extract_all():
    db_files = []
    for d in CONVERSATION_DIRS:
        if os.path.exists(d):
            db_files.extend(glob.glob(os.path.join(d, "*.db")))
    db_files = sorted(set(db_files))

    all_events = []
    conversations = []
    hourly_histogram = defaultdict(int)

    for db_idx, db in enumerate(db_files):
        cid = os.path.basename(db).replace(".db", "")
        model = extract_db_model(db)
        conv_events = []

        try:
            conn = sqlite3.connect(db)
            c = conn.cursor()
            c.execute("SELECT idx, metadata FROM steps WHERE metadata IS NOT NULL ORDER BY idx ASC")
            for idx, m in c.fetchall():
                top = decode_protobuf(m)
                if 9 in top and isinstance(top[9], bytes):
                    sub = decode_protobuf(top[9])
                    ts = None
                    if 1 in top and isinstance(top[1], bytes):
                        t_sub = decode_protobuf(top[1])
                        if 1 in t_sub:
                            ts = t_sub[1]

                    out_t = sub.get(1, 0)
                    in_t = sub.get(2, 0)
                    cache_t = sub.get(3, 0)

                    # Fallback timestamp from DB file modified time if protobuf timestamp is missing
                    if not ts:
                        ts = int(os.path.getmtime(db))

                    if out_t > 0 or in_t > 0:
                        cost = calculate_cost(model, in_t, out_t, cache_t)
                        event = {
                            "ts": ts,
                            "date": datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d"),
                            "time": datetime.datetime.fromtimestamp(ts).strftime("%H:%M:%S"),
                            "hour": datetime.datetime.fromtimestamp(ts).hour,
                            "in": in_t,
                            "out": out_t,
                            "cache": cache_t,
                            "total": in_t + out_t,
                            "cost": cost,
                            "model": model,
                            "cid": cid,
                        }
                        conv_events.append(event)
                        all_events.append(event)
                        hourly_histogram[event["hour"]] += (in_t + out_t)
        except Exception:
            pass

        if conv_events:
            c_in = sum(e["in"] for e in conv_events)
            c_out = sum(e["out"] for e in conv_events)
            c_cache = sum(e["cache"] for e in conv_events)
            c_cost = sum(e["cost"] for e in conv_events)
            conversations.append({
                "cid": cid,
                "model": model,
                "total_tokens": c_in + c_out,
                "input_tokens": c_in,
                "output_tokens": c_out,
                "cached_tokens": c_cache,
                "cost_usd": round(c_cost, 3),
                "calls_count": len(conv_events),
                "first_seen": min(e["ts"] for e in conv_events),
                "last_seen": max(e["ts"] for e in conv_events),
            })

    # Group daily
    daily_map = defaultdict(lambda: {
        "date": "",
        "input_tokens": 0,
        "output_tokens": 0,
        "cached_tokens": 0,
        "total_tokens": 0,
        "cost_usd": 0.0,
        "calls_count": 0,
        "models": defaultdict(lambda: {"in": 0, "out": 0, "cache": 0, "total": 0, "calls": 0, "cost": 0.0}),
        "accounts": defaultdict(lambda: {"in": 0, "out": 0, "total": 0, "calls": 0, "cost": 0.0}),
    })

    for ev in all_events:
        d = ev["date"]
        dm = daily_map[d]
        dm["date"] = d
        dm["input_tokens"] += ev["in"]
        dm["output_tokens"] += ev["out"]
        dm["cached_tokens"] += ev["cache"]
        dm["total_tokens"] += ev["total"]
        dm["cost_usd"] += ev["cost"]
        dm["calls_count"] += 1

        m = dm["models"][ev["model"]]
        m["in"] += ev["in"]
        m["out"] += ev["out"]
        m["cache"] += ev["cache"]
        m["total"] += ev["total"]
        m["calls"] += 1
        m["cost"] += ev["cost"]

    # True Today date reference (Dynamic, never hardcoded)
    today = datetime.date.today()
    # Generate full 365 days window for the complete GitHub calendar grid
    start_date = today - datetime.timedelta(days=364)
    grid_start = start_date - datetime.timedelta(days=(start_date.weekday() + 1) % 7) # Sunday start

    calendar_days = []
    curr = grid_start
    while curr <= today:
        d_str = curr.strftime("%Y-%m-%d")
        record = daily_map.get(d_str)
        if record:
            tot = record["total_tokens"]
            if tot < 50:
                level = 0
            elif tot < 500_000:
                level = 1
            elif tot < 2_000_000:
                level = 2
            elif tot < 5_000_000:
                level = 3
            elif tot < 10_000_000:
                level = 4
            else:
                level = 5

            top_model = max(record["models"].items(), key=lambda x: x[1]["total"])[0] if record["models"] else "gemini-3.8-flash-high"

            calendar_days.append({
                "date": d_str,
                "day_of_week": curr.weekday(),
                "month": curr.strftime("%b"),
                "year": curr.year,
                "has_data": True,
                "level": level,
                "total_tokens": tot,
                "input_tokens": record["input_tokens"],
                "output_tokens": record["output_tokens"],
                "cached_tokens": record["cached_tokens"],
                "cost_usd": round(record["cost_usd"], 2),
                "calls_count": record["calls_count"],
                "top_model": top_model,
                "models": {k: dict(v) for k, v in record["models"].items()},
                "accounts": {},
            })
        else:
            calendar_days.append({
                "date": d_str,
                "day_of_week": curr.weekday(),
                "month": curr.strftime("%b"),
                "year": curr.year,
                "has_data": False,
                "level": 0,
                "total_tokens": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cached_tokens": 0,
                "cost_usd": 0.0,
                "calls_count": 0,
                "top_model": None,
                "models": {},
                "accounts": {},
            })
        curr += datetime.timedelta(days=1)

    active_days = [d for d in calendar_days if d["total_tokens"] >= 50]
    total_tokens_all_time = sum(d["total_tokens"] for d in calendar_days)
    total_input_all_time = sum(d["input_tokens"] for d in calendar_days)
    total_output_all_time = sum(d["output_tokens"] for d in calendar_days)
    total_cache_all_time = sum(d["cached_tokens"] for d in calendar_days)
    total_cost_usd_all_time = sum(d["cost_usd"] for d in calendar_days)

    max_day = max(calendar_days, key=lambda x: x["total_tokens"]) if calendar_days else None
    min_day = min(active_days, key=lambda x: x["total_tokens"]) if active_days else None

    # Calculate streaks
    longest_streak = 0
    current_streak = 0
    temp_streak = 0

    chrono_days = sorted(calendar_days, key=lambda x: x["date"])
    for d in chrono_days:
        if d["total_tokens"] >= 50:
            temp_streak += 1
            if temp_streak > longest_streak:
                longest_streak = temp_streak
        else:
            temp_streak = 0

    idx = len(chrono_days) - 1
    if chrono_days[idx]["total_tokens"] >= 50:
        while idx >= 0 and chrono_days[idx]["total_tokens"] >= 50:
            current_streak += 1
            idx -= 1
    elif idx > 0 and chrono_days[idx-1]["total_tokens"] >= 50:
        idx -= 1
        while idx >= 0 and chrono_days[idx]["total_tokens"] >= 50:
            current_streak += 1
            idx -= 1

    peak_hour_num = max(hourly_histogram.items(), key=lambda x: x[1])[0] if hourly_histogram else 14
    peak_hour_str = datetime.time(peak_hour_num).strftime("%I %p").lstrip("0")

    model_totals = defaultdict(lambda: {"total": 0, "in": 0, "out": 0, "cache": 0, "calls": 0, "cost": 0.0})
    for ev in all_events:
        m = model_totals[ev["model"]]
        m["total"] += ev["total"]
        m["in"] += ev["in"]
        m["out"] += ev["out"]
        m["cache"] += ev["cache"]
        m["calls"] += 1
        m["cost"] += ev["cost"]

    favorite_model = max(model_totals.items(), key=lambda x: x[1]["total"])[0] if model_totals else "gemini-3.8-flash-high"

    monthly_totals = defaultdict(lambda: {"total": 0, "in": 0, "out": 0, "cache": 0, "calls": 0, "cost": 0.0})
    for d in calendar_days:
        if d["total_tokens"] > 0:
            month_key = d["date"][:7] # YYYY-MM
            m = monthly_totals[month_key]
            m["total"] += d["total_tokens"]
            m["in"] += d["input_tokens"]
            m["out"] += d["output_tokens"]
            m["cache"] += d["cached_tokens"]
            m["calls"] += d["calls_count"]
            m["cost"] += d["cost_usd"]

    the_little_prince_tokens = 22_000
    prince_multiplier = round(total_tokens_all_time / the_little_prince_tokens)

    data = {
        "metadata": {
            "generated_at": datetime.datetime.now().isoformat(),
            "target_user": "Daksh",
            "app_title": "Antigravity AI Token Matrix",
            "total_accounts": 0,
        },
        "summary": {
            "total_tokens": total_tokens_all_time,
            "total_input_tokens": total_input_all_time,
            "total_output_tokens": total_output_all_time,
            "total_cached_tokens": total_cache_all_time,
            "total_cost_usd": round(total_cost_usd_all_time, 2),
            "total_calls": len(all_events),
            "total_sessions": len(conversations),
            "active_days": len(active_days),
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "peak_hour": peak_hour_str,
            "peak_hour_num": peak_hour_num,
            "favorite_model": favorite_model,
            "little_prince_multiplier": prince_multiplier,
            "max_day": {
                "date": max_day["date"] if max_day else None,
                "tokens": max_day["total_tokens"] if max_day else 0,
                "cost": max_day["cost_usd"] if max_day else 0.0,
            },
            "min_day": {
                "date": min_day["date"] if min_day else None,
                "tokens": min_day["total_tokens"] if min_day else 0,
                "cost": min_day["cost_usd"] if min_day else 0.0,
            },
        },
        "calendar_days": calendar_days,
        "models": {k: dict(v) for k, v in model_totals.items()},
        "accounts": [],
        "monthly": {k: dict(v) for k, v in sorted(monthly_totals.items())},
        "hourly_distribution": dict(hourly_histogram),
        "conversations": conversations[:100],
        "pricing_reference": MODEL_PRICING,
    }

    os.makedirs(os.path.dirname(OUTPUT_PUBLIC), exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_SRC), exist_ok=True)

    with open(OUTPUT_PUBLIC, "w") as f:
        json.dump(data, f, indent=2)

    with open(OUTPUT_SRC, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Data successfully synced! Total authentic tokens: {total_tokens_all_time:,}")
    print(f"Saved to {OUTPUT_PUBLIC} and {OUTPUT_SRC}")

    # Upload to Supabase Cloud
    sync_to_supabase(data)

    return data

def sync_to_supabase(telemetry_data):
    """Pushes the real telemetry payload to Supabase PostgreSQL table workspace_telemetry."""
    try:
        creds_path = os.path.expanduser("~/.shared-ai-memory/credentials.json")
        if not os.path.exists(creds_path):
            return

        with open(creds_path) as f:
            creds = json.load(f)

        sb_url = creds.get("supabase", {}).get("url")
        sb_key = creds.get("supabase", {}).get("anon_key")

        if not sb_url or not sb_key:
            return

        payload = {
            "id": "primary_workspace",
            "metadata": telemetry_data.get("metadata", {}),
            "summary": telemetry_data.get("summary", {}),
            "calendar_days": telemetry_data.get("calendar_days", []),
            "models": telemetry_data.get("models", {}),
            "monthly": telemetry_data.get("monthly", {}),
            "hourly_distribution": telemetry_data.get("hourly_distribution", {}),
            "conversations": telemetry_data.get("conversations", [])[:50],
            "updated_at": datetime.datetime.now().isoformat(),
        }

        req = urllib.request.Request(
            f"{sb_url}/rest/v1/workspace_telemetry",
            headers={
                "apikey": sb_key,
                "Authorization": f"Bearer {sb_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            data=json.dumps(payload).encode(),
            method="POST"
        )

        with urllib.request.urlopen(req) as resp:
            print(f"Uploaded telemetry to Supabase (HTTP {resp.status})!")
    except Exception as e:
        print("Note: Supabase sync skipped or failed:", e)

if __name__ == "__main__":
    extract_all()
