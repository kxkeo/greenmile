// GET /api/season-calendar — PUBLIC. Returns the "Season at a Glance" cards
// (admin override from KV, or the built-in default).
import { DEFAULT_CALENDAR } from '../_lib/seasonCalendar.js'

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestGet({ env }) {
  try {
    const raw = await env.SESSIONS.get('config:season_calendar')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return json(arr)
    }
  } catch { /* fall through to default */ }
  return json(DEFAULT_CALENDAR)
}
