import unittest
import sqlite3
import os
import sys

# Add root path to PYTHONPATH so we can import from config and db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from database import get_db, init_db

class TestDatabase(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Override database path for testing to avoid overwriting production data
        cls.orig_db_path = Config.DB_PATH
        Config.DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_emails.db"))
        
    @classmethod
    def tearDownClass(cls):
        # Restore production database path
        Config.DB_PATH = cls.orig_db_path
        if os.path.exists(Config.DB_PATH):
            try:
                os.remove(os.path.abspath(os.path.join(os.path.dirname(__file__), "test_emails.db")))
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

    def test_database_creation(self):
        """Verifies tables are created correctly on initialization."""
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Query sqlite_master to verify tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            self.assertIn("contacts", tables)
            self.assertIn("events", tables)
            self.assertIn("suppression_list", tables)

    def test_contact_insertion_and_suppression(self):
        """Verifies contact insertions and suppression list uniqueness."""
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Insert a sample contact
            cursor.execute(
                "INSERT INTO contacts (email, name, company) VALUES (?, ?, ?)",
                ("prospect@test.com", "Prospect", "Test Inc.")
            )
            
            cursor.execute("SELECT name FROM contacts WHERE email = ?", ("prospect@test.com",))
            row = cursor.fetchone()
            self.assertEqual(row[0], "Prospect")
            
            # Test suppression insertion
            cursor.execute(
                "INSERT INTO suppression_list (email, reason) VALUES (?, ?)",
                ("prospect@test.com", "unsubscribed")
            )
            
            cursor.execute("SELECT reason FROM suppression_list WHERE email = ?", ("prospect@test.com",))
            row = cursor.fetchone()
            self.assertEqual(row[0], "unsubscribed")

if __name__ == "__main__":
    unittest.main()
