import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  try {
    const raw = await redis.lrange("logs", 0, 99);
    const logs = raw.map((entry) =>
      typeof entry === "string" ? JSON.parse(entry) : entry
    );
    res.status(200).json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
}
