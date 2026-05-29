function dec(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function readGeo(req) {
  const h = req.headers;
  return {
    country: h["x-vercel-ip-country"] || null,
    region: h["x-vercel-ip-country-region"] || null,
    city: h["x-vercel-ip-city"] ? dec(h["x-vercel-ip-city"]) : null,
  };
}

export function readClient(req) {
  const xff = req.headers["x-forwarded-for"] || "";
  const ip = xff.split(",")[0].trim() || "unknown";
  return {
    ip,
    userAgent: req.headers["user-agent"] || "unknown",
  };
}
