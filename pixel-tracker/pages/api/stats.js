import { redis } from "../../lib/redis";

const num = (v) => Number(v ?? 0);

export default async function handler(req, res) {
  try {
    const [campaigns, days] = await Promise.all([
      redis.smembers("campaigns"),
      redis.smembers("days"),
    ]);

    const p = redis.pipeline();
    p.get("stats:total:track");
    p.get("stats:total:click");
    p.scard("unique:track");
    p.scard("unique:click");
    p.scard("device:track");
    p.scard("device:click");
    campaigns.forEach((c) => {
      p.get(`stats:campaign:${c}:track`);
      p.get(`stats:campaign:${c}:click`);
      p.scard(`unique:track:${c}`);
      p.scard(`unique:click:${c}`);
      p.scard(`device:track:${c}`);
      p.scard(`device:click:${c}`);
    });
    days.forEach((d) => {
      p.get(`stats:day:${d}:track`);
      p.get(`stats:day:${d}:click`);
    });
    const r = await p.exec();

    let i = 0;
    const totals = {
      track: num(r[i++]),
      click: num(r[i++]),
      uniqueTrack: num(r[i++]),
      uniqueClick: num(r[i++]),
      deviceTrack: num(r[i++]),
      deviceClick: num(r[i++]),
    };
    const byCampaign = campaigns
      .map((campaign) => ({
        campaign,
        track: num(r[i++]),
        click: num(r[i++]),
        uniqueTrack: num(r[i++]),
        uniqueClick: num(r[i++]),
        deviceTrack: num(r[i++]),
        deviceClick: num(r[i++]),
      }))
      .sort((a, b) => b.track + b.click - (a.track + a.click));
    const byDay = days
      .map((day) => ({
        day,
        track: num(r[i++]),
        click: num(r[i++]),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    res.status(200).json({ totals, byCampaign, byDay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}
