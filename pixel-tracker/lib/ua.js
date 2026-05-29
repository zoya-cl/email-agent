const BOTS = [
  [/github[-_ ]?camo/i, "GitHub Camo"],
  [/googleimageproxy/i, "Gmail image proxy"],
  [/yahoomailproxy/i, "Yahoo Mail proxy"],
  [/outlook-ios/i, "Outlook iOS"],
  [/outlook-android/i, "Outlook Android"],
  [/MicrosoftOutlook/i, "Outlook"],
  [/Mailru/i, "Mail.ru"],
  [/Googlebot/i, "Googlebot"],
  [/bingbot/i, "Bingbot"],
  [/DuckDuckBot/i, "DuckDuckBot"],
  [/Slackbot|Slack-ImgProxy/i, "Slackbot"],
  [/TelegramBot/i, "Telegram"],
  [/WhatsApp/i, "WhatsApp"],
  [/facebookexternalhit/i, "Facebook"],
  [/Twitterbot/i, "Twitter"],
  [/LinkedInBot/i, "LinkedIn"],
  [/Discordbot/i, "Discord"],
  [/curl/i, "curl"],
  [/wget/i, "wget"],
  [/python-requests/i, "python-requests"],
  [/^node$|node-fetch/i, "node"],
  [/PostmanRuntime/i, "Postman"],
];

const BROWSERS = [
  [/Edg(?:e|A|iOS)?\/(\d+)/, "Edge"],
  [/OPR\/(\d+)/, "Opera"],
  [/Opera\/(\d+)/, "Opera"],
  [/SamsungBrowser\/(\d+)/, "Samsung Internet"],
  [/Chrome\/(\d+)/, "Chrome"],
  [/Firefox\/(\d+)/, "Firefox"],
  [/Version\/(\d+).*Safari/, "Safari"],
];

const WIN = {
  "10.0": "Windows 10/11",
  "6.3": "Windows 8.1",
  "6.2": "Windows 8",
  "6.1": "Windows 7",
};

export function parseUa(ua) {
  const raw = ua || "";
  if (!raw || raw === "unknown") return { label: "unknown", raw };

  for (const [re, name] of BOTS) {
    if (re.test(raw)) return { kind: "bot", label: name, raw };
  }

  let os = null;
  if (/iPhone|iPod/.test(raw)) {
    const m = raw.match(/OS (\d+(?:_\d+)?)/);
    os = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  } else if (/iPad/.test(raw)) {
    os = "iPadOS";
  } else if (/Android/.test(raw)) {
    const m = raw.match(/Android (\d+(?:\.\d+)?)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/Mac OS X/.test(raw)) {
    const m = raw.match(/Mac OS X (\d+[._]\d+)/);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Windows NT (\d+\.\d+)/.test(raw)) {
    const m = raw.match(/Windows NT (\d+\.\d+)/);
    os = WIN[m[1]] || `Windows ${m[1]}`;
  } else if (/CrOS/.test(raw)) {
    os = "ChromeOS";
  } else if (/Linux/.test(raw)) {
    os = "Linux";
  }

  let browser = null;
  for (const [re, name] of BROWSERS) {
    const m = raw.match(re);
    if (m) {
      browser = `${name} ${m[1]}`;
      break;
    }
  }

  let device = "desktop";
  if (/iPad|Tablet/.test(raw)) device = "tablet";
  else if (/Mobile|iPhone|Android/.test(raw)) device = "mobile";

  const parts = [browser, os].filter(Boolean);
  return {
    kind: "browser",
    browser,
    os,
    device,
    label: parts.length ? parts.join(" · ") : "unknown",
    raw,
  };
}
