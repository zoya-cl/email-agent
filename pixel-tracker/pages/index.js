import { useEffect, useMemo, useState, useCallback } from "react";
import { parseUa } from "../lib/ua";

const REFRESH_MS = 10000;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [campaign, setCampaign] = useState("all");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        fetch("/api/stats").then((r) => r.json()),
        fetch("/api/logs").then((r) => r.json()),
      ]);
      setStats(s);
      setLogs(Array.isArray(l) ? l : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const filteredLogs = useMemo(
    () =>
      campaign === "all"
        ? logs
        : logs.filter((l) => (l.campaign || "none") === campaign),
    [logs, campaign]
  );

  return (
    <main>
      <header>
        <h1>Pixel Tracker</h1>
        <p className="sub">Live dashboard · refreshes every 10s</p>
      </header>

      {error && <div className="error">Error: {error}</div>}

      <LinkBuilder onTestFire={load} />

      <section className="totals">
        <Stat
          label="Opens"
          value={stats?.totals.track ?? "—"}
          sub={statSub(stats?.totals, "Track")}
        />
        <Stat
          label="Clicks"
          value={stats?.totals.click ?? "—"}
          sub={statSub(stats?.totals, "Click")}
        />
        <Stat label="Campaigns" value={stats?.byCampaign.length ?? "—"} />
        <Stat label="Days active" value={stats?.byDay.length ?? "—"} />
      </section>

      <section>
        <h2>Activity by day</h2>
        <Chart data={stats?.byDay ?? []} />
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
            {(stats?.byCampaign ?? []).map((c) => (
              <tr key={c.campaign}>
                <td>{c.campaign}</td>
                <td>{c.track}</td>
                <td className="muted-num">{c.uniqueTrack ?? "—"}</td>
                <td className="muted-num">{c.deviceTrack ?? "—"}</td>
                <td>{c.click}</td>
                <td className="muted-num">{c.uniqueClick ?? "—"}</td>
                <td className="muted-num">{c.deviceClick ?? "—"}</td>
              </tr>
            ))}
            {!stats?.byCampaign?.length && (
              <tr>
                <td colSpan="7" className="empty">
                  No data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <div className="row">
          <h2>Recent events</h2>
          <div className="row-actions">
            <select
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            >
              <option value="all">All campaigns</option>
              {(stats?.byCampaign ?? []).map((c) => (
                <option key={c.campaign} value={c.campaign}>
                  {c.campaign}
                </option>
              ))}
            </select>
            <a className="csv-btn" href="/api/export.csv" download>
              Download CSV
            </a>
          </div>
        </div>
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
            {filteredLogs.map((l, i) => {
              const ua = parseUa(l.userAgent);
              return (
                <tr key={i}>
                  <td>{new Date(l.time).toLocaleString()}</td>
                  <td>
                    <span className={`pill pill-${l.type || "track"}`}>
                      {l.type || "track"}
                    </span>
                  </td>
                  <td>{l.id}</td>
                  <td>{l.campaign || "none"}</td>
                  <td title={geoTitle(l)}>
                    {l.country ? (
                      <>
                        <span className="flag">{flag(l.country)}</span>
                        <span>{l.city || l.country}</span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td title={ua.raw} className="client">
                    {ua.kind === "bot" ? (
                      <span className="pill pill-bot">{ua.label}</span>
                    ) : (
                      <>
                        <span>{ua.label}</span>
                        {ua.device && ua.device !== "desktop" && (
                          <span className="device"> · {ua.device}</span>
                        )}
                      </>
                    )}
                  </td>
                  <td>{l.ip}</td>
                  <td className="url">{l.url || ""}</td>
                </tr>
              );
            })}
            {!filteredLogs.length && (
              <tr>
                <td colSpan="8" className="empty">
                  No events yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <style jsx>{`
        main {
          max-width: 960px;
          margin: 0 auto;
          padding: 32px 24px 64px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          color: #1a1a1a;
        }
        h1 {
          margin: 0 0 4px;
          font-size: 28px;
        }
        h2 {
          margin: 32px 0 12px;
          font-size: 18px;
        }
        .sub {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
        .error {
          background: #fde8e8;
          color: #9b1c1c;
          padding: 8px 12px;
          border-radius: 6px;
          margin: 16px 0;
        }
        .totals {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 24px;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        select {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
          background: #fff;
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
          vertical-align: top;
        }
        th {
          color: #666;
          font-weight: 600;
        }
        .empty {
          text-align: center;
          color: #999;
          padding: 24px;
        }
        .url {
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
        }
        .pill-track {
          background: #e0f2fe;
          color: #075985;
        }
        .pill-click {
          background: #dcfce7;
          color: #166534;
        }
        .pill-bot {
          background: #fef3c7;
          color: #92400e;
        }
        .client {
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: help;
        }
        .device {
          color: #888;
          font-size: 11px;
        }
        .flag {
          margin-right: 6px;
          font-size: 14px;
        }
        .muted {
          color: #aaa;
        }
        .row-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .csv-btn {
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #ddd;
          background: #fff;
          color: #1a1a1a;
          border-radius: 6px;
          text-decoration: none;
        }
        .csv-btn:hover {
          background: #f5f5f7;
        }
        .muted-num {
          color: #888;
        }
      `}</style>
    </main>
  );
}

function LinkBuilder({ onTestFire }) {
  const [tab, setTab] = useState("pixel");
  const [id, setId] = useState("user-123");
  const [campaign, setCampaign] = useState("spring-sale");
  const [url, setUrl] = useState("https://example.com");
  const [copied, setCopied] = useState(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (id) p.set("id", id);
    if (campaign) p.set("campaign", campaign);
    return p;
  }, [id, campaign]);

  const pixelUrl = origin ? `${origin}/api/track?${qs.toString()}` : "";
  const pixelSnippet = pixelUrl
    ? `<img src="${pixelUrl}" width="1" height="1" alt="" />`
    : "";

  const urlValid = useMemo(() => {
    if (!url) return false;
    try {
      const p = new URL(url);
      return p.protocol === "http:" || p.protocol === "https:";
    } catch {
      return false;
    }
  }, [url]);

  const clickUrl = useMemo(() => {
    if (!origin || !urlValid) return "";
    const p = new URLSearchParams(qs);
    p.set("url", url);
    return `${origin}/api/click?${p.toString()}`;
  }, [origin, qs, url, urlValid]);

  const clickSnippet = clickUrl
    ? `<a href="${clickUrl}">Open</a>`
    : "";

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      setCopied("error");
    }
  };

  const testFirePixel = () => {
    if (!pixelUrl) return;
    const img = new Image();
    img.src = pixelUrl + `&_=${Date.now()}`;
    setCopied("fired");
    setTimeout(() => setCopied((c) => (c === "fired" ? null : c)), 1500);
    setTimeout(() => onTestFire?.(), 800);
  };

  const testFireClick = async () => {
    if (!clickUrl) return;
    try {
      await fetch(clickUrl, { method: "GET", redirect: "manual" });
    } catch {}
    setCopied("fired");
    setTimeout(() => setCopied((c) => (c === "fired" ? null : c)), 1500);
    setTimeout(() => onTestFire?.(), 800);
  };

  return (
    <section className="builder">
      <div className="head">
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "pixel"}
            className={tab === "pixel" ? "active" : ""}
            onClick={() => setTab("pixel")}
          >
            Pixel
          </button>
          <button
            role="tab"
            aria-selected={tab === "click"}
            className={tab === "click" ? "active" : ""}
            onClick={() => setTab("click")}
          >
            Click
          </button>
        </div>
        <span className="hint">Build a tracking URL or snippet</span>
      </div>

      <div className="grid">
        <Field label="Recipient ID" value={id} onChange={setId} placeholder="user-123" />
        <Field label="Campaign" value={campaign} onChange={setCampaign} placeholder="spring-sale" />
        {tab === "click" && (
          <Field
            label="Destination URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com"
            error={url && !urlValid ? "must be http(s)" : null}
            full
          />
        )}
      </div>

      {tab === "pixel" ? (
        <>
          <Output
            label="Tracking URL"
            value={pixelUrl}
            copied={copied === "pixelUrl"}
            onCopy={() => copy("pixelUrl", pixelUrl)}
          />
          <Output
            label="HTML snippet"
            value={pixelSnippet}
            copied={copied === "pixelSnip"}
            onCopy={() => copy("pixelSnip", pixelSnippet)}
            mono
          />
          <div className="actions">
            <button className="primary" onClick={testFirePixel} disabled={!pixelUrl}>
              {copied === "fired" ? "Fired ✓" : "Test fire"}
            </button>
            <span className="hint">
              Loads the pixel once; the dashboard refreshes in a moment.
            </span>
          </div>
        </>
      ) : (
        <>
          <Output
            label="Tracking URL"
            value={clickUrl}
            copied={copied === "clickUrl"}
            onCopy={() => copy("clickUrl", clickUrl)}
            disabled={!urlValid}
          />
          <Output
            label="HTML snippet"
            value={clickSnippet}
            copied={copied === "clickSnip"}
            onCopy={() => copy("clickSnip", clickSnippet)}
            mono
            disabled={!urlValid}
          />
          <div className="actions">
            <button className="primary" onClick={testFireClick} disabled={!clickUrl}>
              {copied === "fired" ? "Fired ✓" : "Test fire"}
            </button>
            <a
              className="secondary"
              href={clickUrl || "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!clickUrl}
              onClick={(e) => !clickUrl && e.preventDefault()}
            >
              Open in new tab ↗
            </a>
            <span className="hint">
              Test fire records a click without redirecting away.
            </span>
          </div>
        </>
      )}

      <style jsx>{`
        .builder {
          margin-top: 16px;
          padding: 16px 18px 18px;
          border: 1px solid #ececf0;
          border-radius: 10px;
          background: #fafafb;
        }
        .head {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
        }
        .tabs {
          display: inline-flex;
          background: #fff;
          border: 1px solid #e5e5ea;
          border-radius: 8px;
          padding: 2px;
        }
        .tabs button {
          appearance: none;
          background: transparent;
          border: 0;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #555;
          border-radius: 6px;
          cursor: pointer;
        }
        .tabs button.active {
          background: #1a1a1a;
          color: #fff;
        }
        .hint {
          color: #777;
          font-size: 12px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 12px;
          margin-bottom: 12px;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        button.primary {
          appearance: none;
          background: #1a1a1a;
          color: #fff;
          border: 0;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
        }
        button.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        a.secondary {
          font-size: 13px;
          color: #1a1a1a;
          text-decoration: none;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
        }
        a.secondary[aria-disabled="true"] {
          opacity: 0.4;
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, error, full }) {
  return (
    <label className={full ? "full" : ""}>
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        aria-invalid={!!error}
      />
      {error && <em>{error}</em>}
      <style jsx>{`
        label {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        label.full {
          grid-column: 1 / -1;
        }
        span {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        input {
          padding: 8px 10px;
          font-size: 13px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fff;
          font-family: inherit;
        }
        input[aria-invalid="true"] {
          border-color: #ef4444;
        }
        em {
          font-style: normal;
          font-size: 11px;
          color: #b91c1c;
        }
      `}</style>
    </label>
  );
}

function Output({ label, value, onCopy, copied, mono, disabled }) {
  return (
    <div className={`out ${disabled ? "disabled" : ""}`}>
      <div className="label-row">
        <span>{label}</span>
        <button onClick={onCopy} disabled={disabled || !value}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className={mono ? "mono" : ""}>{value || "—"}</pre>
      <style jsx>{`
        .out {
          margin-top: 10px;
        }
        .out.disabled {
          opacity: 0.55;
        }
        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .label-row span {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        button {
          appearance: none;
          background: #fff;
          border: 1px solid #ddd;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: #333;
          border-radius: 6px;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        pre {
          margin: 0;
          padding: 9px 11px;
          background: #fff;
          border: 1px solid #e5e5ea;
          border-radius: 6px;
          font-size: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: pre-wrap;
          word-break: break-all;
          color: #1a1a1a;
        }
        pre.mono {
          background: #1a1a1a;
          color: #f5f5f7;
          border-color: #1a1a1a;
        }
      `}</style>
    </div>
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
        .value {
          font-size: 24px;
          font-weight: 600;
        }
        .label {
          font-size: 12px;
          color: #666;
        }
        .sub {
          font-size: 11px;
          color: #888;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

function statSub(totals, suffix) {
  if (!totals) return null;
  const u = totals[`unique${suffix}`];
  const d = totals[`device${suffix}`];
  const parts = [];
  if (u != null) parts.push(`${u} unique`);
  if (d != null) parts.push(`${d} devices`);
  return parts.length ? parts.join(" · ") : null;
}

function flag(code) {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + code.toUpperCase().charCodeAt(0) - 65,
    A + code.toUpperCase().charCodeAt(1) - 65
  );
}

function geoTitle(l) {
  return [l.city, l.region, l.country].filter(Boolean).join(", ") || "";
}

function Chart({ data }) {
  const W = 880;
  const H = 220;
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (!data.length) {
    return (
      <div className="empty-chart">
        No activity yet
        <style jsx>{`
          .empty-chart {
            height: ${H}px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            background: #f7f7f8;
            border-radius: 8px;
          }
        `}</style>
      </div>
    );
  }

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
            <rect
              x={gx - barW - 1}
              y={PAD.top + innerH - trackH}
              width={barW}
              height={trackH}
              fill="#0ea5e9"
            />
            <rect
              x={gx + 1}
              y={PAD.top + innerH - clickH}
              width={barW}
              height={clickH}
              fill="#22c55e"
            />
            <text x={gx} y={H - 10} fontSize="10" fill="#666" textAnchor="middle">
              {d.day.slice(5)}
            </text>
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
