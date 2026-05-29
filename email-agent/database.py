import os
import sqlite3
from contextlib import contextmanager
from config import Config

@contextmanager
def get_db():
    """
    Context manager that yields a robust SQLite database connection.
    Enables Write-Ahead Logging (WAL) for safe concurrent reads/writes
    and enforces foreign key constraints.
    """
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        # Enable WAL mode for high performance concurrency
        conn.execute("PRAGMA journal_mode=WAL")
        # Enforce foreign key constraints
        conn.execute("PRAGMA foreign_keys=ON")
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_db():
    """
    Initializes the SQLite database schema and creates standard tracking-focused indexes.
    Note: The 'sent_emails' table has been removed to align with the Inbound-Only & Tracking architecture.
    """
    # Ensure db directory exists
    os.makedirs(os.path.dirname(Config.DB_PATH), exist_ok=True)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Contacts Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            company TEXT,
            status TEXT DEFAULT 'pending', -- pending | sent | replied | bounced | unsubscribed
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        
        # 2. Events Table (Open, click, unsubscribe, and reply/bounce events)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_id TEXT NOT NULL,
            event_type TEXT NOT NULL, -- track (open) | click | unsubscribe | reply | bounce
            event_data TEXT, -- URL clicked, AI classification justification, reply body, etc.
            ip_address TEXT,
            user_agent TEXT,
            country TEXT,
            city TEXT,
            created_at TIMESTAMP
        )""")
        
        # 3. Suppression List (bounces & unsubscribes to prevent email sending)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS suppression_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            reason TEXT NOT NULL, -- unsubscribed | hard_bounce
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        
        # Indexes for optimization
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_tracking ON events(tracking_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_suppression_email ON suppression_list(email)")
        
        print("[DB] Database successfully initialized and migrated!")

if __name__ == "__main__":
    init_db()
