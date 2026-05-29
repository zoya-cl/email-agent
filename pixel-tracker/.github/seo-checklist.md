# GitHub SEO / discoverability checklist

A short, opinionated punch list. Most of this is configured in the repo
**Settings** page or via `gh repo edit`.

## Repo metadata (Settings → General)

- [ ] **Description** (≤350 chars, keyword-front-loaded). Suggested:
      `Serverless 1×1 email tracking pixel on Next.js + Vercel + Upstash Redis. Tracks opens, clicks, campaigns, with webhooks and a live dashboard. Zero-config, MIT.`
- [ ] **Website** — point at the deployed Vercel URL once live.
- [ ] **Topics** — apply the list in `.github/topics.txt` (max 20).
- [ ] **Include in the home page** — Releases, Packages: off; Deployments: on.

## Apply topics in one shot

```bash
gh repo edit anujarkitekt/pixel-tracker-vercel \
  --add-topic pixel-tracker \
  --add-topic email-tracking \
  --add-topic open-tracking \
  --add-topic click-tracking \
  --add-topic email-analytics \
  --add-topic tracking-pixel \
  --add-topic nextjs \
  --add-topic vercel \
  --add-topic serverless \
  --add-topic upstash \
  --add-topic upstash-redis \
  --add-topic redis \
  --add-topic analytics \
  --add-topic webhooks \
  --add-topic marketing-automation \
  --add-topic email-marketing \
  --add-topic campaign-tracking \
  --add-topic zero-config \
  --add-topic javascript \
  --add-topic demo
```

## README signals that move the needle

- [x] Banner image at the top (`.github/banner.svg`)
- [x] Badges row (stars/forks/issues/license + tech stack)
- [x] **Deploy with Vercel** button (one-click activation = stars)
- [x] One-liner "Why" above the fold
- [x] Code-copyable Quick start (≤4 lines)
- [x] Usage examples with real `<img>` / `<a>` snippets
- [x] Architecture diagram (ASCII is fine; renders everywhere)
- [ ] **Screenshot/GIF** of the dashboard near the top — replace the banner
      caption with a real recording once deployed (`vhs` / `peek` / quicktime).
- [ ] LICENSE and a license badge (already present)
- [ ] CodeQL or simple CI badge once you add a workflow

## Soft-launch checklist (post-merge)

- [ ] Pin the repo on your GitHub profile.
- [ ] Tweet/post with the banner image; link the Vercel demo, not the repo.
- [ ] Submit to:
  - [ ] https://github.com/topics/email-tracking (already auto-listed via topics)
  - [ ] r/selfhosted, r/nextjs (only if you have a live demo)
  - [ ] Hacker News "Show HN" — title under 80 chars, link the demo
  - [ ] dev.to / Hashnode write-up linking back to the repo

## Don't bother

- Star-for-star schemes — GitHub demotes these and they don't convert.
- Bloated badge rows (>10 badges) — looks like fluff, hurts trust.
- AI-generated README emojis on every line — reads as spam.
