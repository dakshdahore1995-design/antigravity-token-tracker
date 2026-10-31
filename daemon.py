#!/usr/bin/env python3
"""
Antigravity Live Telemetry Daemon
Continuously monitors local SQLite conversation databases in:
  - ~/.gemini/antigravity-ide/conversations/*.db
  - ~/.gemini/antigravity-cli/conversations/*.db
Whenever an active conversation writes a new step or generates tokens,
this daemon instantly re-extracts the true telemetry and synchronizes it to:
  1. Local JSON files (src/data/initialData.json, public/antigravity-data.json)
  2. Supabase Cloud (workspace_telemetry table)
  3. Optional local HTTP endpoint for zero-latency localhost live streaming
"""

import os
import sys
import time
import glob
import json
import sqlite3
import datetime
from sync_antigravity import extract_all

WATCH_DIRS = [
    os.path.expanduser("~/.gemini/antigravity-ide/conversations"),
    os.path.expanduser("~/.gemini/antigravity-cli/conversations"),
]

def get_dir_state():
    """Returns a dict of {db_path: mtime} for all db files."""
    state = {}
    for d in WATCH_DIRS:
        if os.path.exists(d):
            for f in glob.glob(os.path.join(d, "*.db")):
                try:
                    state[f] = os.path.getmtime(f)
                except OSError:
                    pass
    return state

def run_daemon(poll_interval=2.0):
    print(f"🚀 Antigravity Live Telemetry Daemon started at {datetime.datetime.now()}")
    print(f"👀 Watching conversation directories:")
    for d in WATCH_DIRS:
        print(f"   - {d}")

    # Initial extraction to ensure everything is fresh
    print("\n📦 Running baseline telemetry sync...")
    try:
        extract_all()
    except Exception as e:
        print(f"Initial sync warning: {e}")

    last_state = get_dir_state()
    print(f"✅ Baseline complete. Monitoring {len(last_state)} databases in real-time (polling every {poll_interval}s)...\n")

    try:
        while True:
            time.sleep(poll_interval)
            current_state = get_dir_state()

            # Check for modified or new databases
            changed_dbs = []
            for db, mtime in current_state.items():
                if db not in last_state or mtime > last_state[db]:
                    changed_dbs.append(db)

            if changed_dbs:
                now_str = datetime.datetime.now().strftime("%H:%M:%S")
                for db in changed_dbs:
                    cid = os.path.basename(db).replace(".db", "")
                    print(f"[{now_str}] ⚡ Activity detected in conversation {cid[:12]}... (Modified: {os.path.basename(db)})")

                try:
                    data = extract_all()
                    tot = data["summary"]["total_tokens"]
                    calls = data["summary"]["total_calls"]
                    print(f"[{now_str}] 🟢 Synced live telemetry: {tot:,} tokens across {calls:,} calls.")
                except Exception as e:
                    print(f"[{now_str}] ❌ Sync error: {e}")

                last_state = current_state

    except KeyboardInterrupt:
        print("\n🛑 Live daemon stopped by user.")

if __name__ == "__main__":
    interval = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0
    run_daemon(poll_interval=interval)
