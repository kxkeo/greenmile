function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPost({ request, env, params }) {
  const b = await request.json()
  if (!b.firstName || !b.lastName || !b.number) return json({ error: 'Missing required fields' }, 400)
  const r = await env.DB.prepare(
    `INSERT INTO away_players (team_id, first_name, last_name, number, positions)
     VALUES (?,?,?,?,?) RETURNING *`
  ).bind(params.teamId, b.firstName, b.lastName, b.number, JSON.stringify(b.positions || [])).first()
  return json({ id: r.id, teamId: r.team_id, firstName: r.first_name, lastName: r.last_name, number: r.number, positions: JSON.parse(r.positions || '[]') }, 201)
}
