// Admin-only editor endpoint for the "Season at a Glance" cards.
//   GET  /api/admin/season-calendar — current cards (override or default)
//   POST /api/admin/season-calendar — save { items: [...] } to KV
// Auth is enforced by _middleware.js (/api/admin/* requires an admin/staff session).
import { DEFAULT_CALENDAR, sanitizeCalendar } from '../../_lib/seasonCalendar.js'

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestGet({ env }) {
  try {
    const raw = await env.SESSIONS.get('config:season_calendar')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length) return json({ items: arr, isDefault: false })
    }
  } catch { /* fall through */ }
  return json({ items: DEFAULT_CALENDAR, isDefault: true })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  // Empty array or explicit reset restores the built-in default.
  if (body?.reset || (Array.isArray(body?.items) && body.items.length === 0)) {
    await env.SESSIONS.delete('config:season_calendar')
    return json({ ok: true, items: DEFAULT_CALENDAR, isDefault: true })
  }

  const clean = sanitizeCalendar(body?.items)
  if (!clean) return json({ error: 'items array required' }, 400)
  if (clean.length === 0) return json({ error: 'Add at least one card with a title.' }, 400)

  await env.SESSIONS.put('config:season_calendar', JSON.stringify(clean))
  return json({ ok: true, items: clean, isDefault: false })
}
