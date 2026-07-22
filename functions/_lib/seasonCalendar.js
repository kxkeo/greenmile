// "Season at a Glance" cards shown on the Events page. There is NO seeded
// default — the section is admin-managed and starts empty, so nothing fake ever
// shows. Admins add real cards from the admin Events section; the list is stored
// in KV (config:season_calendar). When it's empty, the public page hides the
// whole section.
export const DEFAULT_CALENDAR = []

// Trim + cap an incoming calendar array so admin edits can't bloat KV or break
// the layout. Drops cards with no title.
export function sanitizeCalendar(items) {
  if (!Array.isArray(items)) return null
  return items.slice(0, 12).map(it => ({
    icon:  String(it?.icon  ?? '').slice(0, 8),
    when:  String(it?.when  ?? '').slice(0, 40),
    title: String(it?.title ?? '').trim().slice(0, 80),
    body:  String(it?.body  ?? '').trim().slice(0, 400),
  })).filter(it => it.title)
}
