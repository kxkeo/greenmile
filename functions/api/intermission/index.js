function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

function dbToTrack(r) {
  return { id: r.id, name: r.name, artist: r.artist, spotifyUrl: r.spotify_url, spotifyUri: r.spotify_uri, startTime: r.start_time }
}

// GET /api/intermission
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM intermission_tracks ORDER BY sort_order, id'
  ).all()
  return json(results.map(dbToTrack))
}

// POST /api/intermission
export async function onRequestPost({ request, env }) {
  const b = await request.json()
  if (!b.name) return json({ error: 'Name required' }, 400)
  const { results } = await env.DB.prepare('SELECT MAX(sort_order) as mx FROM intermission_tracks').all()
  const sortOrder = (results[0]?.mx ?? -1) + 1
  const r = await env.DB.prepare(
    `INSERT INTO intermission_tracks (name, artist, spotify_url, spotify_uri, start_time, sort_order)
     VALUES (?,?,?,?,?,?) RETURNING *`
  ).bind(b.name, b.artist || '', b.spotifyUrl || '', b.spotifyUri || '', b.startTime || '', sortOrder).first()
  return json(dbToTrack(r), 201)
}

// PUT /api/intermission — reorder: body is array of { id, sortOrder }
export async function onRequestPut({ request, env }) {
  const items = await request.json()
  const stmts = items.map(item =>
    env.DB.prepare('UPDATE intermission_tracks SET sort_order=? WHERE id=?').bind(item.sortOrder, item.id)
  )
  await env.DB.batch(stmts)
  return json({ ok: true })
}
