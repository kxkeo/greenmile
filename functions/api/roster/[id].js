function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

function dbToPlayer(r) {
  return {
    id: r.id, firstName: r.first_name, lastName: r.last_name, number: r.number,
    positions: JSON.parse(r.positions || '[]'),
    songName: r.song_name, songArtist: r.song_artist,
    spotifyUrl: r.spotify_url, spotifyUri: r.spotify_uri, startTime: r.start_time,
    classYear: r.class_year || '',
    rosterYear: r.roster_year || 0,
  }
}

// PUT /api/roster/:id
export async function onRequestPut({ request, env, params }) {
  const b = await request.json()
  const r = await env.DB.prepare(
    `UPDATE players SET first_name=?, last_name=?, number=?, positions=?, song_name=?, song_artist=?,
     spotify_url=?, spotify_uri=?, start_time=?, class_year=?
     WHERE id=? RETURNING *`
  ).bind(
    b.firstName, b.lastName, b.number, JSON.stringify(b.positions || []),
    b.songName || '', b.songArtist || '', b.spotifyUrl || '', b.spotifyUri || '', b.startTime || '',
    b.classYear || '',
    params.id
  ).first()
  if (!r) return json({ error: 'Not found' }, 404)
  return json(dbToPlayer(r))
}

// DELETE /api/roster/:id
export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM players WHERE id=?').bind(params.id).run()
  return json({ ok: true })
}
