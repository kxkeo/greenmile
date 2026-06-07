function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// GET /api/roster?year=2025
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  let year = url.searchParams.get('year')

  // If no year specified, use active year
  if (!year) {
    const active = await env.DB.prepare(
      'SELECT year FROM roster_years WHERE is_active=1 ORDER BY year DESC LIMIT 1'
    ).first()
    year = active ? active.year : new Date().getFullYear()
  }

  const { results } = await env.DB.prepare(
    'SELECT * FROM players WHERE roster_year=? ORDER BY CAST(number AS INTEGER) ASC'
  ).bind(Number(year)).all()
  return json(results.map(dbToPlayer))
}

// POST /api/roster
export async function onRequestPost({ request, env }) {
  const b = await request.json()
  if (!b.firstName || !b.lastName || !b.number) return json({ error: 'Missing required fields' }, 400)

  // Get active year if not specified
  let year = b.rosterYear
  if (!year) {
    const active = await env.DB.prepare(
      'SELECT year FROM roster_years WHERE is_active=1 ORDER BY year DESC LIMIT 1'
    ).first()
    year = active ? active.year : new Date().getFullYear()
  }

  const r = await env.DB.prepare(
    `INSERT INTO players (first_name, last_name, number, positions, song_name, song_artist, spotify_url, spotify_uri, start_time, class_year, roster_year)
     VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *`
  ).bind(
    b.firstName, b.lastName, b.number, JSON.stringify(b.positions || []),
    b.songName || '', b.songArtist || '', b.spotifyUrl || '', b.spotifyUri || '', b.startTime || '',
    b.classYear || '', Number(year)
  ).first()
  return json(dbToPlayer(r), 201)
}

export function dbToPlayer(r) {
  return {
    id: r.id, firstName: r.first_name, lastName: r.last_name, number: r.number,
    positions: JSON.parse(r.positions || '[]'),
    songName: r.song_name, songArtist: r.song_artist,
    spotifyUrl: r.spotify_url, spotifyUri: r.spotify_uri, startTime: r.start_time,
    classYear: r.class_year || '',
    rosterYear: r.roster_year || 0,
  }
}
