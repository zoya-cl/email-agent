import { useEffect, useState } from "react";

const SAMPLE = {
  totals: { track: 1247, click: 312, uniqueTrack: 421, uniqueClick: 178, deviceTrack: 487, deviceClick: 201 },
  byCampaign: [
    { campaign: "spring-sale",  track: 612, click: 156, uniqueTrack: 198, uniqueClick: 89,  deviceTrack: 224, deviceClick: 102 },
    { campaign: "newsletter-04", track: 389, click: 92,  uniqueTrack: 142, uniqueClick: 51,  deviceTrack: 163, deviceClick: 58  },
    { campaign: "launch-week",   track: 246, click: 64,  uniqueTrack: 81,  uniqueClick: 38,  deviceTrack: 100, deviceClick: 41  },
  ],
  byDay: [
    { day: "2026-04-29", track: 18,  click: 4 },
    { day: "2026-04-30", track: 67,  click: 12 },
    { day: "2026-05-01", track: 142, click: 38 },
    { day: "2026-05-02", track: 308, click: 79 },
    { day: "2026-05-03", track: 261, click: 71 },
    { day: "2026-05-04", track: 219, click: 55 },
    { day: "2026-05-05", track: 232, click: 53 },
  ],
  events: [
    { time: "2026-05-05T14:21:09Z", type: "click", id: "u-8a3f", campaign: "spring-sale",  country: "US", city: "Brooklyn",     ua: "Chrome 124 · macOS 14.4",   ip: "73.214.82.14",  url: "https://example.com/sale" },
    { time: "2026-05-05T14:18:42Z", type: "track", id: "u-8a3f", campaign: "spring-sale",  country: "US", city: "Brooklyn",     ua: "Apple Mail · iOS 17.4",     ip: "73.214.82.14",  url: "" },
    { time: "2026-05-05T14:16:11Z", type: "track", id: "u-2bd9", campaign: "newsletter-04",country: "DE", city: "Berlin",       ua: "Safari 17 · iOS 17.4",      ip: "85.214.10.92",  url: "" },
    { time: "2026-05-05T14:12:55Z", type: "click", id: "u-7c41", campaign: "launch-week",  country: "IN", city: "Bengaluru",    ua: "Chrome 124 · Android 14",   ip: "49.207.150.31", url: "https://example.com/launch" },
    { time: "2026-05-05T14:09:33Z", type: "track", id: "u-3e10", campaign: "spring-sale",  country: "GB", city: "Manchester",   ua: "Firefox 125 · Windows 10/11", ip: "82.34.190.4", url: "" },
    { time: "2026-05-05T14:04:17Z", type: "track", id: "u-5fa2", campaign: "newsletter-04",country: "FR", city: "Lyon",         ua: "Chrome 124 · macOS 14.3",   ip: "92.184.110.22", url: "" },
    { time: "2026-05-05T13:58:02Z", type: "click", id: "u-2bd9", campaign: "newsletter-04",country: "DE", city: "Berlin",       ua: "Safari 17 · iOS 17.4",      ip: "85.214.10.92",  url: "https://example.com/post" },
    { time: "2026-05-05T13:51:41Z", type: "track", id: "bot",    campaign: "spring-sale",  country: "US", city: "Mountain View",ua: "GitHub Camo",               ip: "140.82.115.90", url: "", bot: true },
  ],
};

export default function DemoPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <main>
      {/* visit pixel — captures the real IP via /api/track */}
      <img
        src="/api/track?id=demo-visitor&campaign=demo-page"
        width="1"
        height="1"
        alt=""
        style={{ position: "absolute" }}
      />

      <div className="banner">
        <span className="dot" />
        <strong>Demo dashboard</strong>
        <span className="muted">— sample data; your dashboard would show real campaign stats.</span>
      </div>

      <header>
        <h1>Pixel Tracker</h1>
        <p className="sub">
          Serverless 1×1 email tracking pixel — opens, clicks, campaigns, webhooks, live dashboard.
        </p>
        <div className="cta">
          <a className="primary" href="https://github.com/anujarkitekt/pixel-tracker-vercel" target="_blank" rel="noreferrer">
            View on GitHub ↗
          </a>
          <a
            className="secondary"
            href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fanujarkitekt%2Fpixel-tracker-vercel&env=UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN"
            target="_blank"
            rel="noreferrer"
          >
            Deploy your own ↗
          </a>
        </div>
      </header>

      <section className="totals">
        <Stat label="Opens"      value={SAMPLE.totals.track}  sub={`${SAMPLE.totals.uniqueTrack} unique · ${SAMPLE.totals.deviceTrack} devices`} />
        <Stat label="Clicks"     value={SAMPLE.totals.click}  sub={`${SAMPLE.totals.uniqueClick} unique · ${SAMPLE.totals.deviceClick} devices`} />
        <Stat label="Campaigns"  value={SAMPLE.byCampaign.length} />
        <Stat label="Days active" value={SAMPLE.byDay.length} />
      </section>

      <section>
        <h2>Activity by day</h2>
        <Chart data={SAMPLE.byDay} />
      </section>

      <section>
        <h2>By campaign</h2>
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Opens</th>
              <th>Unique</th>
              <th>Devices</th>
              <th>Clicks</th>
              <th>Unique</th>
              <th>Devices</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE.byCampaign.map((c) => (
              <tr key={c.campaign}>
                <td>{c.campaign}</td>
                <td>{c.track}</td>
                <td className="muted-num">{c.uniqueTrack}</td>
                <td className="muted-num">{c.deviceTrack}</td>
                <td>{c.click}</td>
                <td className="muted-num">{c.uniqueClick}</td>
                <td className="muted-num">{c.deviceClick}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Recent events</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>ID</th>
              <th>Campaign</th>
              <th>Location</th>
              <th>Client</th>
              <th>IP</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE.events.map((e, i) => (
              <tr key={i}>
                <td>{new Date(e.time).toLocaleString()}</td>
                <td>
                  <span className={`pill pill-${e.type}`}>{e.type}</span>
                </td>
                <td>{e.id}</td>
                <td>{e.campaign}</td>
                <td>
                  <span className="flag">{flag(e.country)}</span>
                  <span>{e.city}</span>
                </td>
                <td className="client">
                  {e.bot ? <span className="pill pill-bot">{e.ua}</span> : e.ua}
                </td>
                <td>{e.ip}</td>
                <td className="url">{e.url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer>
        <p>
          Want the real thing?{" "}
          <a href="https://github.com/anujarkitekt/pixel-tracker-vercel#quick-start">
            Run it locally in 4 commands
          </a>{" "}
          or deploy to Vercel — free tier covers low-volume campaigns.
        </p>
        {origin && (
          <p className="muted small">
            You arrived at <code>{origin}/demo</code>. Your visit was just logged
            on the live tracker (campaign <code>demo-page</code>) — that's how it works.
          </p>
        )}
      </footer>

      <style jsx>{`
        main {
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 24px 64px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1a1a1a;
        }
        .banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef3c7;
          border: 1px solid #fde68a;
          color: #92400e;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 24px;
        }
        .banner .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f59e0b;
        }
        .banner .muted {
          color: #b45309;
          font-weight: 400;
        }
        h1 {
          margin: 0 0 4px;
          font-size: 30px;
        }
        h2 {
          margin: 32px 0 12px;
          font-size: 18px;
        }
        .sub {
          margin: 0 0 16px;
          color: #555;
          font-size: 14px;
        }
        .cta {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .cta a {
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          text-decoration: none;
        }
        .cta .primary {
          background: #1a1a1a;
          color: #fff;
        }
        .cta .secondary {
          background: #fff;
          color: #1a1a1a;
          border: 1px solid #ddd;
        }
        .totals {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        th,
        td {
          text-align: left;
          padding: 8px 10px;
          border-bottom: 1px solid #eee;
        }
        th {
          color: #666;
          font-weight: 600;
        }
        .pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
        }
        .pill-track { background: #e0f2fe; color: #075985; }
        .pill-click { background: #dcfce7; color: #166534; }
        .pill-bot   { background: #fef3c7; color: #92400e; }
        .flag { margin-right: 6px; font-size: 14px; }
        .muted-num { color: #888; }
        .url {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .client {
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #555;
          font-size: 14px;
        }
        footer p { margin: 6px 0; }
        .muted { color: #888; }
        .small { font-size: 12px; }
        code {
          background: #f3f4f6;
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 12px;
        }
      `}</style>
    </main>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {sub && <div className="sub">{sub}</div>}
      <style jsx>{`
        .card {
          background: #f7f7f8;
          border: 1px solid #ececf0;
          border-radius: 8px;
          padding: 14px 16px;
        }
        .value { font-size: 24px; font-weight: 600; }
        .label { font-size: 12px; color: #666; }
        .sub { font-size: 11px; color: #888; margin-top: 2px; }
      `}</style>
    </div>
  );
}

function flag(code) {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + code.toUpperCase().charCodeAt(0) - 65,
    A + code.toUpperCase().charCodeAt(1) - 65
  );
}

function Chart({ data }) {
  const W = 880, H = 220, PAD = { top: 12, right: 12, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map((d) => Math.max(d.track, d.click)));
  const groupW = innerW / data.length;
  const barW = Math.min(18, (groupW - 6) / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Activity by day">
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y} stroke="#eee" />
            <text x={PAD.left - 6} y={y + 4} fontSize="10" fill="#999" textAnchor="end">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const gx = PAD.left + i * groupW + groupW / 2;
        const trackH = (d.track / max) * innerH;
        const clickH = (d.click / max) * innerH;
        return (
          <g key={d.day}>
            <rect x={gx - barW - 1} y={PAD.top + innerH - trackH} width={barW} height={trackH} fill="#0ea5e9" />
            <rect x={gx + 1}        y={PAD.top + innerH - clickH} width={barW} height={clickH} fill="#22c55e" />
            <text x={gx} y={H - 10} fontSize="10" fill="#666" textAnchor="middle">{d.day.slice(5)}</text>
          </g>
        );
      })}
      <g transform={`translate(${PAD.left}, ${PAD.top - 2})`}>
        <rect width="10" height="10" fill="#0ea5e9" />
        <text x="14" y="9" fontSize="11" fill="#444">opens</text>
        <rect x="64" width="10" height="10" fill="#22c55e" />
        <text x="78" y="9" fontSize="11" fill="#444">clicks</text>
      </g>
    </svg>
  );
}
