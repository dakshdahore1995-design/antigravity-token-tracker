#!/usr/bin/env python3
"""
Antigravity Token & Credit Usage Sync Script
Scans ~/.gemini/antigravity-ide/conversations/*.db, extracts raw protobuf LLM telemetry,
and aggregates daily usage, models, streaks, peak hours, multi-account allocations,
and market cost estimation.
"""

import os
import glob
import sqlite3
import datetime
import json
from collections import defaultdict

CONVERSATIONS_DIR = os.path.expanduser("~/.gemini/antigravity-ide/conversations")
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
    db_files = sorted(glob.glob(os.path.join(CONVERSATIONS_DIR, "*.db")))
    all_events = []
    conversations = []
    hourly_histogram = defaultdict(int)

    # Load custom accounts configuration if present, otherwise default to 7 accounts
    config_path = os.path.join(os.path.dirname(__file__), "src", "data", "accounts_config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path) as f:
                cfg = json.load(f)
                account_names = [a["name"] for a in cfg.get("accounts", [])]
        except Exception:
            account_names = [f"Account #{i}" for i in range(1, 8)]
    else:
        account_names = [f"Account #{i}" for i in range(1, 8)]

    total_accounts_count = len(account_names)

    for db_idx, db in enumerate(db_files):
        cid = os.path.basename(db).replace(".db", "")
        model = extract_db_model(db)
        assigned_account_id = (db_idx % total_accounts_count) + 1
        assigned_account_name = account_names[assigned_account_id - 1]

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
                    if ts and (out_t > 0 or in_t > 0):
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
                            "account_id": assigned_account_id,
                            "account_name": assigned_account_name,
                        }
                        conv_events.append(event)
                        all_events.append(event)
                        hourly_histogram[event["hour"]] += (in_t + out_t)
        except Exception as e:
            pass

        if conv_events:
            c_in = sum(e["in"] for e in conv_events)
            c_out = sum(e["out"] for e in conv_events)
            c_cache = sum(e["cache"] for e in conv_events)
            c_cost = sum(e["cost"] for e in conv_events)
            conversations.append({
                "cid": cid,
                "model": model,
                "account_id": assigned_account_id,
                "account_name": assigned_account_name,
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

        acc_key = str(ev["account_id"])
        a = dm["accounts"][acc_key]
        a["in"] += ev["in"]
        a["out"] += ev["out"]
        a["total"] += ev["total"]
        a["calls"] += 1
        a["cost"] += ev["cost"]

    # Today's date reference
    today = datetime.date(2026, 10, 21)
    # Generate full 365 days window for the complete GitHub calendar grid
    start_date = today - datetime.timedelta(days=364)
    # Align to previous Sunday/Monday for clean calendar layout
    grid_start = start_date - datetime.timedelta(days=(start_date.weekday() + 1) % 7) # Sunday start

    calendar_days = []
    curr = grid_start
    while curr <= today:
        d_str = curr.strftime("%Y-%m-%d")
        record = daily_map.get(d_str)
        if record:
            tot = record["total_tokens"]
            # Level rules:
            # < 50: 0 (no color)
            # 50 - 500k: 1
            # 500k - 2M: 2
            # 2M - 5M: 3
            # 5M - 10M: 4
            # > 10M: 5 (Neon green super blast)
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

            # Top model of the day
            top_model = max(record["models"].items(), key=lambda x: x[1]["total"])[0] if record["models"] else "None"

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
                "accounts": {k: dict(v) for k, v in record["accounts"].items()},
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

    # Active days only (total_tokens >= 50)
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
    
    # Sort chronological
    chrono_days = sorted(calendar_days, key=lambda x: x["date"])
    for d in chrono_days:
        if d["total_tokens"] >= 50:
            temp_streak += 1
            if temp_streak > longest_streak:
                longest_streak = temp_streak
        else:
            temp_streak = 0

    # Current streak (working backwards from today)
    idx = len(chrono_days) - 1
    # Check if today has tokens or yesterday
    if chrono_days[idx]["total_tokens"] >= 50:
        while idx >= 0 and chrono_days[idx]["total_tokens"] >= 50:
            current_streak += 1
            idx -= 1
    elif idx > 0 and chrono_days[idx-1]["total_tokens"] >= 50:
        idx -= 1
        while idx >= 0 and chrono_days[idx]["total_tokens"] >= 50:
            current_streak += 1
            idx -= 1

    # Peak hour calculation
    peak_hour_num = max(hourly_histogram.items(), key=lambda x: x[1])[0] if hourly_histogram else 2
    peak_hour_str = datetime.time(peak_hour_num, 0).strftime("%I %p").lstrip("0")

    # Overall model aggregation
    model_totals = defaultdict(lambda: {"total": 0, "in": 0, "out": 0, "cache": 0, "calls": 0, "cost": 0.0})
    for ev in all_events:
        m = model_totals[ev["model"]]
        m["total"] += ev["total"]
        m["in"] += ev["in"]
        m["out"] += ev["out"]
        m["cache"] += ev["cache"]
        m["calls"] += 1
        m["cost"] += ev["cost"]

    favorite_model = max(model_totals.items(), key=lambda x: x[1]["total"])[0] if model_totals else "Claude 3.5 Sonnet"

    # Account totals
    account_stats = []
    # Assume 10M token limit or $20 credit limit per pro account cycle
    PRO_QUOTA_TOKENS = 10_000_000
    for acc_idx, acc_name in enumerate(account_names, 1):
        acc_evs = [e for e in all_events if e["account_id"] == acc_idx]
        acc_in = sum(e["in"] for e in acc_evs)
        acc_out = sum(e["out"] for e in acc_evs)
        acc_cache = sum(e["cache"] for e in acc_evs)
        acc_cost = sum(e["cost"] for e in acc_evs)
        acc_tot = acc_in + acc_out
        pct_used = min(100.0, round((acc_tot / PRO_QUOTA_TOKENS) * 100, 1))

        status = "Active" if acc_tot < PRO_QUOTA_TOKENS * 0.9 else ("Nearing Limit" if acc_tot < PRO_QUOTA_TOKENS else "Exhausted (Ready to Switch)")
        account_stats.append({
            "id": acc_idx,
            "name": acc_name,
            "total_tokens": acc_tot,
            "input_tokens": acc_in,
            "output_tokens": acc_out,
            "cached_tokens": acc_cache,
            "cost_usd": round(acc_cost, 2),
            "calls_count": len(acc_evs),
            "quota_tokens": PRO_QUOTA_TOKENS,
            "percent_used": pct_used,
            "status": status,
        })

    # Monthly breakdown
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

    # Comparative stats like Image 1: "You've used ~5720x more tokens than The Little Prince."
    # The Little Prince is ~16,500 words (~22,000 tokens)
    # War and Peace is ~587,000 words (~780,000 tokens)
    the_little_prince_tokens = 22_000
    prince_multiplier = round(total_tokens_all_time / the_little_prince_tokens)

    data = {
        "metadata": {
            "generated_at": datetime.datetime.now().isoformat(),
            "target_user": "Daksh",
            "app_title": "Antigravity AI Token Matrix",
            "total_accounts": len(account_names),
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
        "accounts": account_stats,
        "monthly": {k: dict(v) for k, v in sorted(monthly_totals.items())},
        "hourly_distribution": dict(hourly_histogram),
        "conversations": conversations[:100],  # top/recent 100
        "pricing_reference": MODEL_PRICING,
    }

    os.makedirs(os.path.dirname(OUTPUT_PUBLIC), exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_SRC), exist_ok=True)

    with open(OUTPUT_PUBLIC, "w") as f:
        json.dump(data, f, indent=2)

    with open(OUTPUT_SRC, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Data successfully synced! Total tokens: {total_tokens_all_time:,}")
    print(f"Saved to {OUTPUT_PUBLIC} and {OUTPUT_SRC}")
    return data

if __name__ == "__main__":
    import argparse
    import urllib.request

    parser = argparse.ArgumentParser(description="Antigravity Token Sync")
    parser.add_argument("--cloud-url", help="Netlify/Render cloud URL to push telemetry (e.g. https://yoursite.netlify.app/api/sync)")
    args = parser.parse_args()

    synced_data = extract_all()
    if args.cloud_url:
        print(f"Pushing telemetry to cloud: {args.cloud_url} ...")
        try:
            req = urllib.request.Request(
                args.cloud_url,
                data=json.dumps(synced_data).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req) as resp:
                print("Cloud sync response:", resp.read().decode())
        except Exception as e:
            print("Cloud push failed:", e)
