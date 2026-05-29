import { recordEvent } from "../../lib/record";
import { readClient, readGeo } from "../../lib/geo";

export default async function handler(req, res) {
  const id = req.query.id || "unknown";
  const campaign = req.query.campaign || "none";

  await recordEvent({
    type: "unsubscribe",
    id: id,
    campaign: campaign,
    time: new Date().toISOString(),
    ...readClient(req),
    ...readGeo(req),
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  // Send a beautiful premium confirmation page
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribed Successfully</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          background-color: #0b0f19;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: hidden;
        }

        .background-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 100%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
          pointer-events: none;
        }

        .card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 440px;
          padding: 40px;
          margin: 20px;
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          text-align: center;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .icon-container {
          width: 72px;
          height: 72px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        p {
          font-size: 15px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0 0 32px 0;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background-color: #ef4444;
          border-radius: 50%;
          margin-right: 8px;
        }

        .footer {
          margin-top: 40px;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="background-glow"></div>
      <div class="card">
        <div class="icon-container">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#ef4444"/>
          </svg>
        </div>
        <h1>Unsubscribed Successfully</h1>
        <p>You have been removed from our outreach list. We will no longer send you any research or marketing emails.</p>
        
        <div class="status-badge">
          <span class="status-dot"></span>
          Unsubscribed: ${id}
        </div>
        
        <div class="footer">
          If you did this by mistake, please contact our support team.
        </div>
      </div>
    </body>
    </html>
  `);
}
