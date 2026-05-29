import crypto from "node:crypto";
import { redis } from "./redis";
import { fireWebhook } from "./webhook";

function fingerprint(event) {
  return crypto
    .createHash("sha256")
    .update(`${event.ip}|${event.userAgent}`)
    .digest("hex")
    .slice(0, 16);
}

export async function recordEvent(event) {
  const day = event.time.slice(0, 10);
  const campaign = event.campaign || "none";
  const type = event.type;
  const fp = fingerprint(event);

  try {
    const p = redis.pipeline();
    p.lpush("logs", JSON.stringify(event));
    p.ltrim("logs", 0, 999);
    p.incr(`stats:total:${type}`);
    p.incr(`stats:campaign:${campaign}:${type}`);
    p.incr(`stats:day:${day}:${type}`);
    p.sadd("campaigns", campaign);
    p.sadd("days", day);
    p.sadd(`unique:${type}`, event.id);
    p.sadd(`unique:${type}:${campaign}`, event.id);
    p.sadd(`device:${type}`, fp);
    p.sadd(`device:${type}:${campaign}`, fp);
    await p.exec();
  } catch (err) {
    console.error("redis write failed", err);
  }

  await fireWebhook(event);
}
