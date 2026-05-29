import { recordEvent } from "../../lib/record";
import { readClient, readGeo } from "../../lib/geo";

export default async function handler(req, res) {
  const target = req.query.url;

  let safeUrl;
  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    safeUrl = parsed.toString();
  } catch {
    res.status(400).json({ error: "invalid url" });
    return;
  }

  await recordEvent({
    type: "click",
    id: req.query.id || "unknown",
    campaign: req.query.campaign || "none",
    url: safeUrl,
    time: new Date().toISOString(),
    ...readClient(req),
    ...readGeo(req),
  });

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.redirect(302, safeUrl);
}
