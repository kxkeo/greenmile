# The Green Mile Boosters

Booster-club website for **Dinuba High School Emperors football**. Bold
Friday-night-football design (Tailwind, green + charcoal) on a Cloudflare Pages
+ Functions + D1 backend reused from the DHRC platform.

## Stack
- **Frontend:** Vite + React 18 + React Router, Tailwind CSS
- **Backend:** Cloudflare Pages Functions (`/functions/api/*`)
- **Data:** Cloudflare D1 (`greenmile-db`), KV (sessions), R2 (`greenmile-shop-images`)
- **Payments:** Stripe (keys not yet connected — see below)

## Develop
```bash
npm install
npm run dev          # Vite dev server (UI only; API calls fall back gracefully)
```

## Build & deploy
```bash
npm run build
npx wrangler pages deploy dist --project-name greenmile
```
Bindings (D1/KV/R2/vars) are defined in `wrangler.toml`.

## Admin
Built-in admin login at `/admin/login` — username `admin`, password `letmein26`
(stored in KV key `admin_password`; change it in production).

## Stripe (TODO before live payments)
Online donations/checkout are gated until real keys are set:
1. `VITE_STRIPE_PUBLISHABLE_KEY` — set as a CF Pages build env var (or `.env`).
2. `STRIPE_SECRET_KEY` — `npx wrangler pages secret put STRIPE_SECRET_KEY --project-name greenmile`.

## Notes
- Stock photos in `src/content/images.js` are placeholders — swap with real team photos.
- Board/coach names on Boosters/Team pages are placeholders.
- Game-day tooling (lineups, etc.) from DHRC exists in the backend; football-specific
  game-day UI is a follow-up.
