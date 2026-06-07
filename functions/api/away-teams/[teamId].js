function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// PUT /api/away-teams/:teamId
export async function onRequestPut({ request, env, params }) {
  const b = await request.json()
  const r = await env.DB.prepare(
    'UPDATE away_teams SET school=?, city=?, name=? WHERE id=? RETURNING *'
  ).bind(b.school || '', b.city, b.name, params.teamId).first()
  if (!r) return json({ error: 'Not found' }, 404)
  return json({ ...r, school: r.school || '' })
}

// DELETE /api/away-teams/:teamId  (cascade deletes players)
export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM away_teams WHERE id=?').bind(params.teamId).run()
  return json({ ok: true })
}
