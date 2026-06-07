function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
function dbToEvent(r) {
  return {
    id: r.id, type: r.type, title: r.title, date: r.date, endDate: r.end_date || '',
    time: r.time || '', site: r.site || '', level: r.level || '',
    home: r.home === 1, notes: r.notes || '',
  }
}

// GET /api/events
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM events ORDER BY date ASC, time ASC'
  ).all()
  return json(results.map(dbToEvent))
}

// POST /api/events
export async function onRequestPost({ request, env }) {
  const b = await request.json()
  if (!b.title || !b.date) return json({ error: 'title and date required' }, 400)
  const r = await env.DB.prepare(
    `INSERT INTO events (type, title, date, end_date, time, site, level, home, notes)
     VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`
  ).bind(
    b.type || 'game', b.title, b.date, b.endDate || '', b.time || '',
    b.site || '', b.level || '', b.home ? 1 : 0, b.notes || ''
  ).first()
  return json(dbToEvent(r), 201)
}
