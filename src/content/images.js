// Centralized imagery. These are stock placeholders (Unsplash) — swap with real
// Dinuba Emperors football photos by replacing the URLs below, or drop files in
// /public and reference them as '/your-photo.jpg'. The dark design works even if
// an image fails to load (the charcoal + field-line background carries it).
const u = (id, w = 1920) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`

export const IMG = {
  heroStadium: u('1566577739112-5180d4bf9390'),     // stadium under lights
  fieldNight:  u('1577223625816-7546f13df25d'),     // ball on field
  action:      u('1574629810360-7efbbe195018'),     // game action
  huddle:      u('1471295253337-3ceaaedca402', 1600),  // stands / community energy
  gear:        u('1607962837359-5e7e89f86776', 1200),// athletic gear
  crowd:       u('1471295253337-3ceaaedca402'),      // stands / community
}
