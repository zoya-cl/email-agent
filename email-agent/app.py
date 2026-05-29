import csv
import io
import os
import sys
import sqlite3
from flask import Flask, request, jsonify, redirect, render_template, url_for

from config import Config
from database import get_db
from sender import send_outreach_emails

app = Flask(__name__)

@app.route("/api/webhook", methods=["POST"])
def tracker_webhook():
    """
    Webhook receiver that receives real-time opens, clicks, and unsubscribe events
    from the global Next.js Vercel tracking application.
    """
    payload = request.json
    if not payload:
        return jsonify({"error": "No payload payload"}), 400
        
    event_type = payload.get("type") # track | click | unsubscribe
    tracking_id = payload.get("id")
    time = payload.get("time")
    ip = payload.get("ip", "unknown")
    ua = payload.get("userAgent", "unknown")
    country = payload.get("country", "Unknown")
    city = payload.get("city", "Unknown")
    url = payload.get("url", "") # populated on clicks
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # In the tracking-centric architecture, the tracking ID is the prospect's email address.
        # We optionally create a placeholder contact if the tracking_id looks like an email address.
        if tracking_id and "@" in tracking_id:
            cursor.execute("INSERT OR IGNORE INTO contacts (email, name, company, status) VALUES (?, 'Unknown', 'Unknown', 'pending')", 
                           (tracking_id,))
        
        try:
            # 1. Insert the tracking event
            cursor.execute("""
                INSERT INTO events (tracking_id, event_type, event_data, ip_address, user_agent, country, city, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (tracking_id, event_type, url, ip, ua, country, city, time))
            
            # 2. If it is an Unsubscribe, add to suppression list & update status
            if event_type == "unsubscribe":
                if tracking_id and "@" in tracking_id:
                    cursor.execute("UPDATE contacts SET status = 'unsubscribed' WHERE email = ?", (tracking_id,))
                    cursor.execute("INSERT OR IGNORE INTO suppression_list (email, reason) VALUES (?, 'unsubscribed')", (tracking_id,))
                    
            print(f"[Webhook] Webhook sync success: {event_type} logged for Tracking ID (Email): {tracking_id}")
        except Exception as e:
            print(f"[Webhook] Webhook database write failed: {e}")
            return jsonify({"error": "Database error"}), 500
            
    return jsonify({"status": "success"}), 200


def import_contacts_file(file_storage):
    if not file_storage:
        return {
            "status": "error",
            "message": "No CSV file was uploaded. Please choose a file and try again.",
        }

    try:
        stream = io.TextIOWrapper(file_storage.stream, encoding="utf-8")
        reader = csv.DictReader(stream)
    except Exception as err:
        return {"status": "error", "message": f"Failed to read CSV file: {err}"}

    if not reader.fieldnames:
        return {"status": "error", "message": "CSV file appears empty or missing headers."}

    headers = [h.lower() for h in reader.fieldnames]
    if "email" not in headers:
        return {"status": "error", "message": "CSV file must include an email column."}

    email_key = next(h for h in reader.fieldnames if h.lower() == "email")
    name_key = next((h for h in reader.fieldnames if h.lower() in ("name", "first name", "full name")), None)
    company_key = next((h for h in reader.fieldnames if h.lower() in ("company", "organization")), None)

    imported = 0
    skipped = 0
    duplicates = 0

    with get_db() as conn:
        cursor = conn.cursor()
        for row in reader:
            email_val = row[email_key].strip() if row[email_key] else ""
            name_val = row[name_key].strip() if name_key and row.get(name_key) else None
            company_val = row[company_key].strip() if company_key and row.get(company_key) else None

            if not email_val or "@" not in email_val:
                skipped += 1
                continue

            try:
                cursor.execute(
                    "INSERT INTO contacts (email, name, company) VALUES (?, ?, ?)",
                    (email_val, name_val, company_val),
                )
                imported += 1
            except sqlite3.IntegrityError:
                duplicates += 1

    return {
        "status": "success",
        "message": f"Imported {imported} contacts. Skipped {skipped} invalid rows. {duplicates} duplicates were ignored.",
    }


@app.route("/import-contacts", methods=["POST"])
def import_contacts():
    summary = import_contacts_file(request.files.get("csv_file"))
    return redirect(
        url_for(
            "index",
            message=summary["message"],
            message_type="success" if summary["status"] == "success" else "error",
        )
    )


@app.route("/send-emails", methods=["POST"])
def ui_send_emails():
    try:
        send_outreach_emails()
        return redirect(
            url_for(
                "index",
                message="Outbound send process finished. Check contacts for updated statuses.",
                message_type="success",
            )
        )
    except Exception as err:
        print(f"[Dashboard] Send emails error: {err}")
        return redirect(
            url_for(
                "index",
                message=f"Send failed: {err}",
                message_type="error",
            )
        )


@app.route("/")
def index():
    """Renders the central analytics control plane with real-time KPI metrics."""
    kpis = {}
    events = []
    contacts = []
    chart_stats = []
    
    message = request.args.get("message")
    message_type = request.args.get("message_type", "info")

    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. KPI Calculations (No sent_emails references!)
        cursor.execute("SELECT COUNT(*) FROM contacts")
        kpis['total_contacts'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT tracking_id) FROM events WHERE event_type = 'track'")
        kpis['unique_opens'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT tracking_id) FROM events WHERE event_type = 'click'")
        kpis['total_clicks'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM suppression_list")
        kpis['total_suppressions'] = cursor.fetchone()[0]
        
        # 2. Fetch Latest 10 Events (Join directly on email)
        cursor.execute("""
            SELECT 
                COALESCE(c.name, 'Unknown'), 
                COALESCE(c.company, 'N/A'), 
                e.event_type, 
                e.created_at, 
                e.country, 
                e.city,
                e.tracking_id
            FROM events e
            LEFT JOIN contacts c ON e.tracking_id = c.email
            ORDER BY e.created_at DESC
            LIMIT 10
        """)
        for row in cursor.fetchall():
            name = row[0]
            if name == 'Unknown' and row[6] and '@' in row[6]:
                name = row[6].split('@')[0] # Use email prefix as name if unknown
                
            events.append({
                "name": name,
                "company": row[1],
                "event_type": row[2],
                "created_at": row[3][:16].replace("T", " ") if row[3] else "N/A", # Nice human-readable formatting
                "country": row[4],
                "city": row[5]
            })
            
        # 3. Fetch Contacts Explorer
        cursor.execute("SELECT name, email, company, status FROM contacts LIMIT 100")
        for row in cursor.fetchall():
            contacts.append({
                "name": row[0],
                "email": row[1],
                "company": row[2],
                "status": row[3]
            })
            
        # 4. Fetch Chart Data (Daily Opens & Clicks for past 7 days)
        cursor.execute("""
            SELECT 
                date(created_at) as day,
                SUM(CASE WHEN event_type = 'track' THEN 1 ELSE 0 END) as opens,
                SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks
            FROM events
            WHERE day IS NOT NULL
            GROUP BY day
            ORDER BY day ASC
            LIMIT 7
        """)
        for row in cursor.fetchall():
            chart_stats.append({
                "day": row[0],
                "opens": row[1],
                "clicks": row[2]
            })
            
    return render_template(
        "index.html", 
        kpis=kpis, 
        events=events, 
        contacts=contacts, 
        chart_stats=chart_stats,
        message=message,
        message_type=message_type,
    )

if __name__ == "__main__":
    # Run dashboard on standard Port 5001 (central manager)
    print("[Dashboard] Initializing outreach control plane on http://127.0.0.1:5001")
    app.run(port=5001, debug=True)
