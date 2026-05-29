# 🐍 Inbound AI Email Agent & Dashboard (`email-agent`)

Welcome to the central control plane for the **Inbound AI Email Automation & Tracking System**. 

This system operates in tandem with your serverless Next.js Vercel tracking pixel, maintaining a local WAL-enabled SQLite database to handle inbound replies, log opens/clicks/bounces/replies, manage suppression lists, and run automated AI reply classifications via Google Gemini.

---

## 📂 System Architecture

The codebase has been refactored into a highly clean, flat package layout:

* **`config.py`:** Configuration loader that reads from your `.env` file.
* **`database.py`:** Handles SQLite connection pooling (WAL mode enabled) and database schema migrations.
* **`agent.py`:** Cohesive email worker containing:
  - **AI Inbound Reply Classifier**: Fetches unseen emails, extracts plaintext bodies, and leverages Google Gemini to categorize leads (e.g. *INTERESTED*, *UNSUBSCRIBE*, *QUESTION*).
  - **Bounce Handler**: Monitors delivery failures and suppresses bounces immediately.
* **`app.py`:** Flask web server exposing the Webhook receiver (`/api/webhook`) and a gorgeous glassmorphic control plane dashboard.
* **`cli.py`:** The unified command-line entrypoint for management tasks.
* **`templates/`:** Dashboard HTML UI.
* **`tests/`:** Consolidated unit test suite (`test_db.py` & `test_tracker.py`).

---

## ⚡ Setup & Launch Instructions

Follow these quick commands to spin up the local environment in seconds:

### Step 1: Create Virtual Environment & Install Dependencies
Open your terminal in the `email-agent/` directory:
```bash
# 1. Create a Python virtual environment
python -m venv venv

# 2. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 3. Install required libraries
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in:
   * `TRACKER_BASE_URL`: Your deployed Next.js Vercel app URL (e.g. `https://my-pixel-tracker.vercel.app`).
   * `DASHBOARD_PASSWORD`: Basic auth password configured in Vercel.
   * `GMAIL_ADDRESS` & `GMAIL_APP_PASSWORD`: Your Gmail IMAP credential details.
   * `GEMINI_API_KEY`: Your Google AI Studio API key.

### Step 3: Run Database Migrations
Initialize the local SQLite database schema using the unified CLI:
```bash
python cli.py init-db
```

### Step 4: Seed Outreach Contacts (Optional)
Seed your database with prospect lists from a CSV file:
```bash
python cli.py import-contacts <path_to_csv_file>
```

### Step 5: Start the Dashboard
```bash
python app.py
```
Open **`http://127.0.0.1:5001`** in your browser to view your analytics control board.

The dashboard now includes:

* CSV upload for bulk contact import
* A send-emails button to dispatch outreach to pending contacts

---

## ⚙️ Unified CLI Commands

The system features a streamlined `cli.py` engine for automation tasks:

### Run Background Scheduler (Continuous Loop):
This executes the AI Inbound classification checks every 30 minutes, and Gmail bounce monitoring every 1 hour continuously:
```bash
python cli.py run-scheduler
```

### Manually Sync Vercel Tracker Logs (Polling Fallback):
If your local dashboard was offline and missed real-time Vercel webhooks, run the sync script to pull all Vercel logs in bulk:
```bash
python cli.py sync
```
