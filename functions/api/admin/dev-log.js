// GET  /api/admin/dev-log     — list all snapshots
// POST /api/admin/dev-log     — save new snapshot
// DELETE /api/admin/dev-log   — delete by id

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, version, title, summary, built, pending, decisions, snapshot, created_at
       FROM dev_log ORDER BY created_at DESC`
    ).all()
    return json(results.map(r => ({
      ...r,
      built:     JSON.parse(r.built     || '[]'),
      pending:   JSON.parse(r.pending   || '[]'),
      decisions: JSON.parse(r.decisions || '[]'),
      snapshot:  JSON.parse(r.snapshot  || '{}'),
    })))
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { version, title, summary, built, pending, decisions, snapshot } = body
  if (!version?.trim()) return json({ error: 'version required' }, 400)
  if (!title?.trim())   return json({ error: 'title required' }, 400)
  if (!summary?.trim()) return json({ error: 'summary required' }, 400)

  try {
    const row = await env.DB.prepare(`
      INSERT INTO dev_log (version, title, summary, built, pending, decisions, snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      version.trim(),
      title.trim(),
      summary.trim(),
      JSON.stringify(built     || []),
      JSON.stringify(pending   || []),
      JSON.stringify(decisions || []),
      JSON.stringify(snapshot  || {}),
    ).first()
    return json({ ok: true, id: row.id }, 201)
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

export async function onRequestDelete({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { id } = body
  if (!id) return json({ error: 'id required' }, 400)
  try {
    await env.DB.prepare('DELETE FROM dev_log WHERE id = ?').bind(id).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}
