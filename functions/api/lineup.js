function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// GET /api/lineup
export async function onRequestGet({ env }) {
  const lastSaved = await env.SESSIONS.get('lineup_last_saved')
  const { results } = await env.DB.prepare(
    `SELECT ls.slot_index, ls.batting_position, ls.dh_defender_position,
       p.id as player_id, p.first_name, p.last_name, p.number, p.positions, p.song_name, p.song_artist, p.spotify_url, p.spotify_uri, p.start_time,
       d.id as defender_id, d.first_name as def_first, d.last_name as def_last, d.number as def_number
     FROM lineup_slots ls
     LEFT JOIN players p ON ls.player_id = p.id
     LEFT JOIN players d ON ls.dh_defender_id = d.id
     ORDER BY ls.slot_index`
  ).all()

  return json({ lastSaved: lastSaved || null, slots: results.map(r => ({
    slotIndex: r.slot_index,
    battingPosition: r.batting_position || '',
    dhDefenderPosition: r.dh_defender_position || '',
    player: r.player_id ? {
      id: r.player_id, firstName: r.first_name, lastName: r.last_name, number: r.number,
      positions: JSON.parse(r.positions || '[]'),
      songName: r.song_name, songArtist: r.song_artist,
      spotifyUrl: r.spotify_url, spotifyUri: r.spotify_uri, startTime: r.start_time,
    } : null,
    dhDefender: r.defender_id ? {
      id: r.defender_id, firstName: r.def_first, lastName: r.def_last, number: r.def_number,
    } : null,
  })) })
}

// PUT /api/lineup  (send full 9-slot array)
export async function onRequestPut({ request, env }) {
  const slots = await request.json()
  const stmts = slots.map(s =>
    env.DB.prepare(
      `UPDATE lineup_slots SET player_id=?, batting_position=?, dh_defender_id=?, dh_defender_position=? WHERE slot_index=?`
    ).bind(
      s.playerId || null,
      s.battingPosition || '',
      s.dhDefenderId || null,
      s.dhDefenderPosition || '',
      s.slotIndex
    )
  )
  const now = new Date().toISOString()
  await Promise.all([env.DB.batch(stmts), env.SESSIONS.put('lineup_last_saved', now)])
  return json({ ok: true, lastSaved: now })
}
