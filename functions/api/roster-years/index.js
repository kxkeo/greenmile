function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

const CLASS_ORDER = ['Fr.', 'So.', 'Jr.', 'Sr.']
function nextClass(c) {
  const i = CLASS_ORDER.indexOf(c)
  return i >= 0 && i < CLASS_ORDER.length - 1 ? CLASS_ORDER[i + 1] : null // Sr. → null (graduated)
}

// GET /api/roster-years
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM roster_years ORDER BY year DESC'
  ).all()
  return json(results)
}

// POST /api/roster-years
// Body: { year, label, importUnderclassmen: bool, sourceYear: int }
export async function onRequestPost({ request, env }) {
  const b = await request.json()
  const { year, label, importUnderclassmen, sourceYear } = b

  if (!year) return json({ error: 'year is required' }, 400)

  // Check not duplicate
  const existing = await env.DB.prepare('SELECT year FROM roster_years WHERE year=?').bind(year).first()
  if (existing) return json({ error: 'Year already exists' }, 409)

  // Deactivate all years, activate new one
  await env.DB.prepare('UPDATE roster_years SET is_active=0').run()
  await env.DB.prepare(
    'INSERT INTO roster_years (year, label, is_active) VALUES (?,?,1)'
  ).bind(year, label || `${year}-${String(year + 1).slice(2)} Season`).run()

  let imported = 0

  if (importUnderclassmen && sourceYear) {
    // Get all non-Sr. players from source year
    const { results: sourcePlayers } = await env.DB.prepare(
      `SELECT * FROM players WHERE roster_year=? AND class_year != 'Sr.' AND class_year != ''`
    ).bind(Number(sourceYear)).all()

    for (const p of sourcePlayers) {
      const newClass = nextClass(p.class_year)
      if (!newClass) continue // Shouldn't happen but safety check
      await env.DB.prepare(
        `INSERT INTO players (first_name, last_name, number, positions, song_name, song_artist,
         spotify_url, spotify_uri, start_time, class_year, roster_year)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        p.first_name, p.last_name, p.number, p.positions,
        p.song_name, p.song_artist, p.spotify_url, p.spotify_uri, p.start_time,
        newClass, year
      ).run()
      imported++
    }
  }

  const { results: years } = await env.DB.prepare('SELECT * FROM roster_years ORDER BY year DESC').all()
  return json({ years, imported }, 201)
}

// PATCH /api/roster-years — set active year
// Body: { year }
export async function onRequestPatch({ request, env }) {
  const { year } = await request.json()
  await env.DB.prepare('UPDATE roster_years SET is_active=0').run()
  await env.DB.prepare('UPDATE roster_years SET is_active=1 WHERE year=?').bind(year).run()
  return json({ ok: true })
}
