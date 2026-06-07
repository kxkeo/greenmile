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

// PUT /api/events/:id
export async function onRequestPut({ request, env, params }) {
  const b = await request.json()
  const r = await env.DB.prepare(
    `UPDATE events SET type=?, title=?, date=?, end_date=?, time=?, site=?, level=?, home=?, notes=?
     WHERE id=? RETURNING *`
  ).bind(
    b.type || 'game', b.title, b.date, b.endDate || '', b.time || '',
    b.site || '', b.level || '', b.home ? 1 : 0, b.notes || '', params.id
  ).first()
  if (!r) return json({ error: 'Not found' }, 404)
  return json(dbToEvent(r))
}

// DELETE /api/events/:id
export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM events WHERE id=?').bind(params.id).run()
  return json({ ok: true })
}
