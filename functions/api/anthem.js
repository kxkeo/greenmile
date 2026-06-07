function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// GET /api/anthem
export async function onRequestGet({ env }) {
  const r = await env.DB.prepare('SELECT * FROM anthem WHERE id=1').first()
  return json(r ? dbToAnthem(r) : {})
}

// POST /api/anthem
export async function onRequestPost({ request, env }) {
  const b = await request.json()
  await env.DB.prepare(
    `UPDATE anthem SET name=?, artist=?, spotify_url=?, spotify_uri=?, start_time=? WHERE id=1`
  ).bind(b.name || '', b.artist || '', b.spotifyUrl || '', b.spotifyUri || '', b.startTime || '').run()
  const r = await env.DB.prepare('SELECT * FROM anthem WHERE id=1').first()
  return json(dbToAnthem(r))
}

function dbToAnthem(r) {
  return { name: r.name, artist: r.artist, spotifyUrl: r.spotify_url, spotifyUri: r.spotify_uri, startTime: r.start_time }
}
