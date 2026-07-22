// Default "Season at a Glance" cards shown on the Events page. Admins can
// override these from the admin Events section; the override is stored in KV
// (config:season_calendar) and this array is the fallback / seed.
export const DEFAULT_CALENDAR = [
  { icon: '🏈', when: 'August',    title: 'Meet the Emperors',     body: 'Kick off the season — meet the players and coaches, grab gear, and join the boosters.' },
  { icon: '🌭', when: 'September', title: 'Home Opener Tailgate',  body: 'Food, music, and Emperor spirit before the first home game on the Green Mile.' },
  { icon: '⛳', when: 'October',   title: 'Booster Golf Scramble', body: 'Our biggest fundraiser of the year. Sponsor a hole, build a team, swing for the program.' },
  { icon: '🎓', when: 'November',  title: 'Senior Night',          body: 'Honoring our seniors and their families under the lights.' },
  { icon: '🏆', when: 'December',  title: 'Football Banquet',      body: 'Celebrate the season, the awards, and the Emperors who made it special.' },
  { icon: '🏕️', when: 'Summer',    title: 'Youth Football Camp',   body: 'The next generation of Emperors learns from the program. Future stars start here.' },
]

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
