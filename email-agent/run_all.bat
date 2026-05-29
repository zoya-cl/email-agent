@echo off
:: outreach-scheduler.bat
:: Runs the continuous Agent Scheduler Loop and Daily Outbound Dispatches
:: Change path to match your project root folder

cd /d "c:\Users\yashm\Downloads\pixel-tracker-vercel-main\email-agent"

:: Activate the Python Virtual Environment
call venv\Scripts\activate

:: 1. Initialize and migrate the SQLite database (safe to re-run)
python cli.py init-db

:: 2. Launch the Flask glassmorphic control plane in the background
start "Outreach Dashboard" /min python app.py

:: 3. Spin up the continuous Scheduler loop (checks for incoming IMAP responses/bounces)
start "Scheduler System" python cli.py run-scheduler

echo Outreach Automation Suite is successfully initialized!
echo The dashboard control panel is running on: http://127.0.0.1:5001
echo Keep this terminal open to maintain background IMAP scanning.
echo.
pause
