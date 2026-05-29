import os
import sys
import csv
import re
import time
import argparse
import sqlite3
import requests
from datetime import datetime

from config import Config
from database import get_db, init_db
from agent import process_inbound_replies, process_bounces
from sender import send_outreach_emails

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def validate_email(email):
    """Simple regex validation for email format."""
    return bool(EMAIL_REGEX.match(email.strip()))

def import_csv(csv_path):
    """Imports contacts from a CSV file into the local SQLite database."""
    if not os.path.exists(csv_path):
        print(f"[Import] File not found at path: {csv_path}")
        return
        
    print(f"[Import] Starting CSV import from: {csv_path}")
    imported = 0
    skipped = 0
    duplicates = 0
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Verify columns exist
        if not reader.fieldnames:
            print("[Import] CSV file is empty or missing headers.")
            return
            
        headers = [h.lower() for h in reader.fieldnames]
        if 'email' not in headers:
            print("[Import] CSV file must contain an 'email' column.")
            return
            
        # Match CSV field names (case insensitive)
        email_key = next(h for h in reader.fieldnames if h.lower() == 'email')
        name_key = next((h for h in reader.fieldnames if h.lower() in ('name', 'first name', 'full name')), None)
        company_key = next((h for h in reader.fieldnames if h.lower() in ('company', 'organization')), None)
        
        with get_db() as conn:
            cursor = conn.cursor()
            for row in reader:
                email_val = row[email_key].strip()
                name_val = row[name_key].strip() if name_key and row[name_key] else None
                company_val = row[company_key].strip() if company_key and row[company_key] else None
                
                if not validate_email(email_val):
                    print(f"[Import] Skipping invalid email format: {email_val}")
                    skipped += 1
                    continue
                    
                try:
                    cursor.execute(
                        "INSERT INTO contacts (email, name, company) VALUES (?, ?, ?)",
                        (email_val, name_val, company_val)
                    )
                    imported += 1
                except sqlite3.IntegrityError:
                    duplicates += 1
                    
    print("\n[Import] Import Summary:")
    print(f"   [OK] Successfully Imported: {imported}")
    print(f"   [WARN] Invalid Skipped: {skipped}")
    print(f"   [INFO] Duplicates (Already in DB): {duplicates}")

def sync_vercel_logs():
    """Syncs raw tracking event logs from Next.js tracking app to local SQLite database."""
    print("[Sync] Connecting to Vercel Tracker log API...")
    url = f"{Config.TRACKER_BASE_URL}/api/logs"
    
    try:
        auth_user = os.getenv("DASHBOARD_USER", "admin")
        auth_pass = Config.DASHBOARD_PASSWORD
        
        auth = (auth_user, auth_pass) if auth_pass else None
        response = requests.get(url, auth=auth, timeout=10)
        
        if response.status_code == 401:
            print("[Sync] Authentication failed! Ensure DASHBOARD_PASSWORD matches Vercel environment.")
            return
        elif response.status_code != 200:
            print(f"[Sync] Failed to fetch logs from Next.js API: {response.status_code}")
            return
        
        events = response.json()
    except Exception as e:
        print(f"[Sync] Error hitting Next.js API: {e}")
        return
        
    print(f"[Sync] Received {len(events)} tracking logs. Syncing with local SQLite database...")
    
    synced_count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        
        for event in events:
            tracking_id = event.get("id")
            event_type = event.get("type") # track | click | unsubscribe
            event_time = event.get("time")
            
            # Check if event already exists locally
            cursor.execute("""
                SELECT id FROM events 
                WHERE tracking_id = ? AND event_type = ? AND created_at = ?
            """, (tracking_id, event_type, event_time))
            
            if cursor.fetchone():
                continue # Already synced, skip
                
            # Create a placeholder contact if the tracking_id is an email address
            if tracking_id and "@" in tracking_id:
                cursor.execute("INSERT OR IGNORE INTO contacts (email, name, company, status) VALUES (?, 'Unknown', 'Unknown', 'pending')", 
                               (tracking_id,))
                
            # Parse event metadata
            ip = event.get("ip", "unknown")
            ua = event.get("userAgent", "unknown")
            country = event.get("country", "Unknown")
            city = event.get("city", "Unknown")
            url_data = event.get("url", "") # populated on clicks
            
            cursor.execute("""
                INSERT INTO events (tracking_id, event_type, event_data, ip_address, user_agent, country, city, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (tracking_id, event_type, url_data, ip, ua, country, city, event_time))
            
            # Unsubscribe Suppression List Sync
            if event_type == "unsubscribe":
                if tracking_id and "@" in tracking_id:
                    cursor.execute("UPDATE contacts SET status = 'unsubscribed' WHERE email = ?", (tracking_id,))
                    cursor.execute("INSERT OR IGNORE INTO suppression_list (email, reason) VALUES (?, 'unsubscribed')", (tracking_id,))
                    print(f"[Sync] Suppression List Added: {tracking_id} unsubscribed.")
            
            synced_count += 1
            
    print(f"[Sync] Sync complete! Imported {synced_count} new tracking events into local SQLite.")

def run_scheduler_loop():
    """Runs the background AI classification and bounce monitoring loop."""
    print("="*60)
    print("[Scheduler] Central Scheduler Engine Activated (Running in Background)")
    print("   Tasks:")
    print("     - AI Inbound Classifier: Triggers every 30 minutes")
    print("     - Bounce suppression sync: Triggers every 1 hour")
    print("="*60)

    last_ai_check = 0
    last_bounce_check = 0
    
    # Time intervals in seconds (30m AI, 1hr bounce)
    AI_INTERVAL = 30 * 60       
    BOUNCE_INTERVAL = 60 * 60   

    try:
        while True:
            current_time = time.time()
            
            # 1. Trigger AI Inbound Agent
            if current_time - last_ai_check >= AI_INTERVAL:
                print(f"[Scheduler] [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Triggering Inbound AI Classifier...")
                process_inbound_replies()
                last_ai_check = time.time()
                
            # 2. Trigger Bounce Handler
            if current_time - last_bounce_check >= BOUNCE_INTERVAL:
                print(f"[Scheduler] [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Triggering Bounce Suppression Handler...")
                process_bounces()
                last_bounce_check = time.time()
                
            time.sleep(10)
            
    except KeyboardInterrupt:
        print("\n[Scheduler] Scheduler terminated gracefully by user request.")

def main():
    parser = argparse.ArgumentParser(description="Unified Email Agent CLI Engine")
    subparsers = parser.add_subparsers(dest="command", required=True, help="Sub-commands to execute")
    
    # Init DB command
    subparsers.add_parser("init-db", help="Initialize and migrate the SQLite database schema")
    
    # Import CSV command
    import_parser = subparsers.add_parser("import-contacts", help="Import outreach contacts from a CSV file")
    import_parser.add_argument("csv_path", help="Path to the CSV file to import")
    
    # Sync command
    subparsers.add_parser("sync", help="Manually pull latest tracking logs from Vercel")
    
    # Run Scheduler command
    subparsers.add_parser("run-scheduler", help="Run the continuous AI reply and bounce checker loop")
    
    # Send Emails command
    subparsers.add_parser("send-emails", help="Run the outbound email outreach dispatches")
    
    args = parser.parse_args()
    
    if args.command == "init-db":
        init_db()
    elif args.command == "import-contacts":
        import_csv(args.csv_path)
    elif args.command == "sync":
        sync_vercel_logs()
    elif args.command == "run-scheduler":
        run_scheduler_loop()
    elif args.command == "send-emails":
        send_outreach_emails()

if __name__ == "__main__":
    main()
