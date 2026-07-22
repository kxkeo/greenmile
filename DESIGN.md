# Green Mile Boosters — Design Standard

The rules every page follows. When adding UI, use these tokens and components
(`src/index.css` + `src/components/ui.jsx`) — don't invent one-off styles.

## Voice
Dinuba High football boosters. Rural Central Valley town, tight community,
passionate about football, we take care of our kids, Friday night lights are
huge. Say "our kids", not "the players".

## Color
- **Page background:** `charcoal-900` (#181b19) — true charcoal, not black.
- **Bands / alternating sections:** `charcoal-850` with `border-white/[0.06]`.
- **Cards:** `charcoal-800` via the `.card` class.
- **Brand green:** `field-500` (#18532a, DHRC heritage green) for fills;
  `field-400` for accent text; `silver-400` for secondary text accents.
- Body text `zinc-100`; muted `zinc-400`; fine print `zinc-600`.

## Type
- `font-display` (Anton) — big headlines, uppercase, via `.display`.
- `font-heading` (Oswald) — buttons, labels, card titles, uppercase.
- `font-body` (Inter) — paragraphs.
- `.eyebrow` — small green all-caps kicker above headings.

## Buttons (`.btn-*` + `<Button>` from ui.jsx)
- Substantial: bold Oswald caps, generous padding (py-4), **rectangular
  (rounded-none)**, real shadow. Every clickable CTA uses `<Button>` or a
  `btn btn-*` class — never bare styled text or a thin bordered link.
- Sizes: `lg` (heroes/CTAs), `md` (in-section CTAs), `sm` (nav / tight rows).
- Variants: `primary` (solid green — the main action), `outline` (solid,
  green-tinted fill + green border — the substantial *secondary* button, NOT
  transparent outlined text), `ghost` (text only — use sparingly).
- **No arrow characters (→ ←) in labels.** Plain verbs: "Buy Tickets",
  "Donate", "Our Events", "Back".

## Cards (`.card` / `.card-hover`)
- `charcoal-800`, `rounded-2xl`, hairline border, **`shadow-card` always**.
- `.card-hover` adds lift + green glow on hover for clickable cards.
- Image-topped cards: image strip first (`h-36`–`h-40`, bg-cover), content
  in a padded wrapper below.

## Imagery
- **Only photos uploaded by the boosters** (real Dinuba Emperors shots in
  `/public/img`, mapped in `src/content/images.js`). Never stock photos,
  never external image URLs.
- Each context gets a distinct photo (see the map in images.js); raffle
  contexts use `ballTurf` so they read differently from event admission.
- Heroes: dark gradient + field-line overlays handled by `<Hero>`.
- The crest (`/img/logo.png`) replaces any football emoji as the brand mark.

## Footer / legal
- EIN 92-2360865 appears in the footer bottom bar on every page.
- Contact email is info@greenmileboosters.org (.org everywhere, including
  transactional email templates).

## Mobile
- Everything works at 320px with zero horizontal scroll.
- Inputs are ≥16px on mobile (no iOS zoom); buttons may wrap, never overflow.
