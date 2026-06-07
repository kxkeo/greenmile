function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function dbToTeam(t, players = []) {
  return { id: t.id, school: t.school || '', city: t.city, name: t.name, players }
}

function dbToPlayer(r) {
  return { id: r.id, teamId: r.team_id, firstName: r.first_name, lastName: r.last_name, number: r.number, positions: JSON.parse(r.positions || '[]') }
}

// GET /api/away-teams
export async function onRequestGet({ env }) {
  const { results: teams } = await env.DB.prepare('SELECT * FROM away_teams ORDER BY school, city, name').all()
  const { results: players } = await env.DB.prepare('SELECT * FROM away_players ORDER BY CAST(number AS INTEGER) ASC').all()
  return json(teams.map(t => dbToTeam(t, players.filter(p => p.team_id === t.id).map(dbToPlayer))))
}

// POST /api/away-teams
export async function onRequestPost({ request, env }) {
  const b = await request.json()
  if (!b.school || !b.city || !b.name) return json({ error: 'School, city, and name required' }, 400)
  const r = await env.DB.prepare(
    'INSERT INTO away_teams (school, city, name) VALUES (?,?,?) RETURNING *'
  ).bind(b.school, b.city, b.name).first()
  return json(dbToTeam(r, []), 201)
}
