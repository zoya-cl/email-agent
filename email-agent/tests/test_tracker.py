import unittest
import os
import sys
import json
import sqlite3

# Add root path to PYTHONPATH so we can import from config and db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from database import get_db, init_db
from app import app

class TestTrackerWebhook(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Override database path for testing to prevent modifying prod records
        cls.orig_db_path = Config.DB_PATH
        cls.test_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_tracker.db"))
        Config.DB_PATH = cls.test_db
        
    @classmethod
    def tearDownClass(cls):
        # Restore production database path
        Config.DB_PATH = cls.orig_db_path
        if os.path.exists(cls.test_db):
            try:
                os.remove(cls.test_db)
            except Exception:
                pass
                
    def setUp(self):
        # Ensure a clean database for each test run
        if os.path.exists(Config.DB_PATH):
            try:
                os.remove(Config.DB_PATH)
            except Exception:
                pass
        init_db()
        
        # Seed test data: 1 contact and 1 sent email entry
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO contacts (id, email, name, company) VALUES (?, ?, ?, ?)",
                (1, "prospect@test.com", "Prospect Alpha", "Test Company")
            )
            
        # Configure Flask test client
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_webhook_open_tracking(self):
        """Verifies Vercel track (open) event payload is parsed and registered in SQLite events."""
        payload = {
            "type": "track",
            "id": "prospect@test.com",
            "time": "2026-05-28T12:00:00Z",
            "ip": "127.0.0.1",
            "userAgent": "Mozilla/5.0 Test",
            "country": "United States",
            "city": "San Francisco"
        }
        
        response = self.client.post(
            "/api/webhook",
            data=json.dumps(payload),
            content_type="application/json"
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"status": "success"})
        
        # Verify event recorded in db
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT event_type, country, city FROM events WHERE tracking_id = ?", ("prospect@test.com",))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[0], "track")
            self.assertEqual(row[1], "United States")
            self.assertEqual(row[2], "San Francisco")

    def test_webhook_unsubscribe_suppression(self):
        """Verifies unsubscribe events automatically apply suppressions and update status."""
        payload = {
            "type": "unsubscribe",
            "id": "prospect@test.com",
            "time": "2026-05-28T12:05:00Z",
            "ip": "127.0.0.1",
            "userAgent": "Mozilla/5.0 Test",
            "country": "United Kingdom",
            "city": "London"
        }
        
        response = self.client.post(
            "/api/webhook",
            data=json.dumps(payload),
            content_type="application/json"
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify suppression list and contact status
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Check contact status changed to unsubscribed
            cursor.execute("SELECT status FROM contacts WHERE id = 1")
            self.assertEqual(cursor.fetchone()[0], "unsubscribed")
            
            # Check added to suppression list
            cursor.execute("SELECT reason FROM suppression_list WHERE email = ?", ("prospect@test.com",))
            self.assertIsNotNone(cursor.fetchone())

if __name__ == "__main__":
    unittest.main()
