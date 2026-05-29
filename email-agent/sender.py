import os
import sys
import time
import random
import smtplib
import urllib.parse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Ensure config and database imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config
from database import get_db

def render_outreach_template(name, company, email):
    """Renders the HTML outreach template with dynamically personalized properties."""
    template_path = os.path.join(os.path.dirname(__file__), "templates", "outreach.html")
    
    if not os.path.exists(template_path):
        # Fail-safe plain HTML body fallback
        html_content = f"""
        <html>
        <body>
          <p>Hi {name or 'there'},</p>
          <p>We are collecting research stats for 2026 at {company or 'your organization'}. Your insights are highly valuable.</p>
          <p>Please take our 3-minute research survey: <a href="{{cta_url}}">Participate Here</a></p>
          <p>Best regards,<br>Research Team</p>
          <hr>
          <p style="font-size: 11px;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
          <img src="{{pixel_url}}" width="1" height="1" style="display:none;" />
        </body>
        </html>
        """
    else:
        with open(template_path, "r", encoding="utf-8") as f:
            html_content = f.read()

    # Define original CTA URL target
    target_survey_url = "https://forms.gle/sampleResearchSurvey2026"
    
    # In this system's architecture, tracking ID is the prospect's email.
    tracking_id = email
    
    # Construct Vercel-bound Tracking URLs
    base_url = Config.TRACKER_BASE_URL
    
    # 1. Pixel Open Tracking URL: e.g., https://my-app.vercel.app/api/track?id=email&campaign=outreach
    pixel_url = f"{base_url}/api/track?id={urllib.parse.quote(tracking_id)}&campaign=outreach"
    
    # 2. Redirect/Wrap Click Tracking URL: e.g., https://my-app.vercel.app/api/click?id=email&campaign=outreach&url=target
    cta_url = f"{base_url}/api/click?id={urllib.parse.quote(tracking_id)}&campaign=outreach&url={urllib.parse.quote(target_survey_url)}"
    
    # 3. Unsubscribe Tracking URL: e.g., https://my-app.vercel.app/api/unsubscribe?id=email&campaign=outreach
    unsubscribe_url = f"{base_url}/api/unsubscribe?id={urllib.parse.quote(tracking_id)}&campaign=outreach"
    
    # Perform personalization replacements
    rendered_html = html_content \
        .replace("{{ name }}", name or "there") \
        .replace("{{ company or 'your organization' }}", company or "your organization") \
        .replace("{{ cta_url }}", cta_url) \
        .replace("{{ unsubscribe_url }}", unsubscribe_url) \
        .replace("{{ pixel_url }}", pixel_url)
        
    return rendered_html

def send_outreach_emails():
    """Runs outbound sending pipeline, checking daily caps, suppression status, and rate-limits."""
    print("="*60)
    print("[Sender] Outbound Email Outreach Pipeline Activated")
    print("="*60)
    
    if not Config.GMAIL_ADDRESS or not Config.GMAIL_APP_PASSWORD:
        print("[Sender] Error: Gmail credentials are not set in your .env configuration.")
        return
        
    # Check suppression list and pending prospects
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Pull all suppressed emails to filter actively
        cursor.execute("SELECT email FROM suppression_list")
        suppressed_emails = {row["email"].lower().strip() for row in cursor.fetchall()}
        
        # Select pending contacts
        cursor.execute("SELECT id, email, name, company FROM contacts WHERE status = 'pending'")
        prospects = cursor.fetchall()
        
    if not prospects:
        print("[Sender] No contacts are currently marked as 'pending'. Nothing to send.")
        return
        
    print(f"[Sender] Found {len(prospects)} prospective contacts marked as 'pending'.")
    
    # Track metrics
    sent_count = 0
    fail_count = 0
    daily_limit = Config.DAILY_SEND_LIMIT
    
    try:
        # Establish connection with Gmail SMTP servers over Secure TLS
        print("[Sender] Connecting to Gmail SMTP server on TLS Port 587...")
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(Config.GMAIL_ADDRESS, Config.GMAIL_APP_PASSWORD)
        
        for prospect in prospects:
            # Enforce daily sending rate-limits
            if sent_count >= daily_limit:
                print(f"[Sender] Daily limit threshold ({daily_limit}) reached for this batch. Pausing.")
                break
                
            contact_id = prospect["id"]
            email_addr = prospect["email"].lower().strip()
            name = prospect["name"]
            company = prospect["company"]
            
            # Skip if recipient is on the suppression list
            if email_addr in suppressed_emails:
                print(f"[Sender] Skipping {email_addr} (Matched in active Suppression List).")
                with get_db() as conn:
                    conn.execute("UPDATE contacts SET status = 'unsubscribed' WHERE id = ?", (contact_id,))
                continue
                
            print(f"[Sender] Rendering and dispatching outreach email to: {email_addr}...")
            
            try:
                # Render personalized HTML
                html_body = render_outreach_template(name, company, email_addr)
                
                # Build Multipart email message envelope
                msg = MIMEMultipart("alternative")
                msg["Subject"] = "Important Research Survey: 2026 Technology Trends"
                msg["From"] = f"Research Outreach Team <{Config.GMAIL_ADDRESS}>"
                msg["To"] = email_addr
                
                # Compliance Headers (List-Unsubscribe RFC 8058 standard)
                base_url = Config.TRACKER_BASE_URL
                unsub_endpoint = f"{base_url}/api/unsubscribe?id={urllib.parse.quote(email_addr)}&campaign=outreach"
                msg["List-Unsubscribe"] = f"<{unsub_endpoint}>"
                msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
                
                # Plaintext fallback context
                fallback_survey_url = f"{base_url}/api/click?id={urllib.parse.quote(email_addr)}&campaign=outreach&url={urllib.parse.quote('https://forms.gle/sampleResearchSurvey2026')}"
                fallback_unsub_url = f"{base_url}/api/unsubscribe?id={urllib.parse.quote(email_addr)}&campaign=outreach"
                plaintext_body = f"Hi {name or 'there'},\n\nWe are gathering statistics for our 2026 Industry Technology Survey. Your insights at {company or 'your organization'} would be highly valuable.\n\nParticipate in the Survey: {fallback_survey_url}\n\nTo unsubscribe: {fallback_unsub_url}"
                
                msg.attach(MIMEText(plaintext_body, "plain"))
                msg.attach(MIMEText(html_body, "html"))
                
                # Send email
                server.sendmail(Config.GMAIL_ADDRESS, [email_addr], msg.as_string())
                
                # Update SQLite Database State on success
                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute("UPDATE contacts SET status = 'sent' WHERE id = ?", (contact_id,))
                    cursor.execute("""
                        INSERT INTO events (tracking_id, event_type, event_data, ip_address, user_agent, country, city, created_at)
                        VALUES (?, 'sent', 'Outbound Outreach Sent Success', 'N/A', 'SMTP Engine', 'N/A', 'N/A', datetime('now'))
                    """, (email_addr,))
                    
                sent_count += 1
                print(f"[Sender] Outreach successfully delivered to: {email_addr}!")
                
                # Apply rate-limiting delay jitter (3-8 seconds default) to mimic human activity patterns
                delay = random.randint(Config.SEND_DELAY_MIN, Config.SEND_DELAY_MAX)
                print(f"[Sender] Anti-spam cooling delay: waiting for {delay}s...")
                time.sleep(delay)
                
            except Exception as email_err:
                fail_count += 1
                print(f"[Sender] Failed to send email to {email_addr}: {email_err}")
                
        server.quit()
        print(f"\n[Sender] Dispatch summary: Batch processing complete. Delivered: {sent_count}, Failed: {fail_count}.")
        
    except Exception as connection_err:
        print(f"[Sender] Connection Error during SMTP server login: {connection_err}")

if __name__ == "__main__":
    send_outreach_emails()
