function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPut({ request, env, params }) {
  const b = await request.json()
  const r = await env.DB.prepare(
    'UPDATE away_players SET first_name=?, last_name=?, number=?, positions=? WHERE id=? AND team_id=? RETURNING *'
  ).bind(b.firstName, b.lastName, b.number, JSON.stringify(b.positions || []), params.playerId, params.teamId).first()
  if (!r) return json({ error: 'Not found' }, 404)
  return json({ id: r.id, teamId: r.team_id, firstName: r.first_name, lastName: r.last_name, number: r.number, positions: JSON.parse(r.positions || '[]') })
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM away_players WHERE id=? AND team_id=?').bind(params.playerId, params.teamId).run()
  return json({ ok: true })
}
