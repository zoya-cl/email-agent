import { redis } from "../../lib/redis";

const FIELDS = [
  "time",
  "type",
  "id",
  "campaign",
  "country",
  "region",
  "city",
  "ip",
  "userAgent",
  "url",
];

function escape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default async function handler(req, res) {
  try {
    const raw = await redis.lrange("logs", 0, 999);
    const logs = raw.map((e) => (typeof e === "string" ? JSON.parse(e) : e));

    const header = FIELDS.join(",");
    const rows = logs.map((l) => FIELDS.map((f) => escape(l[f])).join(","));
    const body = [header, ...rows].join("\n") + "\n";

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pixel-tracker-${stamp}.csv"`
    );
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(body);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to export");
  }
}
