export async function fireWebhook(event) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    console.error("webhook failed", err);
  }
}
