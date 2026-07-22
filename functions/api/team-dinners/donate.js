// POST /api/team-dinners/donate — a signed-in parent pledges to bring food,
// drinks, and/or dessert to a team dinner (potluck-style, on top of the host).
// One pledge per parent per dinner — submitting again updates it. Requires a
// participant session (enforced by _middleware.js; re-checked here).

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPost({ request, env }) {
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return json({ error: 'Please sign in to donate.' }, 401)

  const sessionRaw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!sessionRaw) return json({ error: 'Your session expired — please sign in again.' }, 401)
  const session = JSON.parse(sessionRaw)
  const participantId = session.participantId

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const dinnerId = parseInt(body.dinnerId, 10)
  if (!dinnerId) return json({ error: 'Which dinner?' }, 400)

  const food     = body.food ? 1 : 0
  const drinks   = body.drinks ? 1 : 0
  const desserts = body.desserts ? 1 : 0
  if (!food && !drinks && !desserts) {
    return json({ error: 'Pick at least one: food, drinks, or dessert.' }, 400)
  }
  const clip = v => (v || '').toString().trim().slice(0, 200) || null
  // Notes only count for items that were actually selected.
  const foodNote     = food     ? clip(body.foodNote)     : null
  const drinksNote   = drinks   ? clip(body.drinksNote)   : null
  const dessertsNote = desserts ? clip(body.dessertsNote) : null

  try {
    const dinner = await env.DB.prepare(
      'SELECT id, is_bye FROM team_dinners WHERE id = ?'
    ).bind(dinnerId).first()
    if (!dinner)             return json({ error: 'That dinner is no longer available.' }, 404)
    if (dinner.is_bye === 1) return json({ error: 'That is a bye week — no dinner.' }, 400)

    const p = await env.DB.prepare(
      'SELECT first_name, last_name FROM participants WHERE id = ?'
    ).bind(participantId).first()
    if (!p) return json({ error: 'Account not found. Please sign in again.' }, 401)
    const donorName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'An Emperor family'

    // Upsert on (dinner_id, participant_id) so a parent updating their pledge
    // replaces it instead of stacking duplicates.
    await env.DB.prepare(
      `INSERT INTO team_dinner_donations
         (dinner_id, participant_id, donor_name, food, drinks, desserts, food_note, drinks_note, desserts_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(dinner_id, participant_id)
       DO UPDATE SET donor_name = excluded.donor_name, food = excluded.food,
                     drinks = excluded.drinks, desserts = excluded.desserts,
                     food_note = excluded.food_note, drinks_note = excluded.drinks_note,
                     desserts_note = excluded.desserts_note,
                     created_at = CURRENT_TIMESTAMP`
    ).bind(dinnerId, participantId, donorName, food, drinks, desserts, foodNote, drinksNote, dessertsNote).run()

    return json({ ok: true })
  } catch (e) {
    console.error('[team-dinners/donate]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
