import { recordEvent } from "../../lib/record";
import { readClient, readGeo } from "../../lib/geo";

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64"
);

export default async function handler(req, res) {
  await recordEvent({
    type: "track",
    id: req.query.id || "unknown",
    campaign: req.query.campaign || "none",
    time: new Date().toISOString(),
    ...readClient(req),
    ...readGeo(req),
  });

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.status(200).end(PIXEL);
}
