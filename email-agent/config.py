import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load from .env file
load_dotenv()

class Config:
    # Next.js Tracker Config
    TRACKER_BASE_URL = os.getenv("TRACKER_BASE_URL", "http://localhost:3000").rstrip("/")
    DASHBOARD_PASSWORD = os.getenv("DASHBOARD_PASSWORD", "")  # Basic-Auth password for /api/logs
    
    # Central Database
    DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "db", "emails.db"))
    
    # Gmail Credentials
    GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
    GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
    
    # Gemini AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    
    # Outbound Limits and Warmup Delays
    DAILY_SEND_LIMIT = int(os.getenv("DAILY_SEND_LIMIT", 50))
    SEND_DELAY_MIN = int(os.getenv("SEND_DELAY_MIN", 3))
    SEND_DELAY_MAX = int(os.getenv("SEND_DELAY_MAX", 8))
