// GET /api/team-dinners — public list of the 2026 team-dinner schedule.
// Personal contact details (email/phone) are never exposed here; only the
// public-facing host names and booking status are returned.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env, request }) {
  try {
    // Identify the signed-in parent (endpoint is behind participant auth) so we
    // can hand back their own donation for in-place editing.
    let myId = null
    try {
      const m = (request.headers.get('Cookie') || '').match(/participant_session=([^;]+)/)
      if (m) {
        const raw = await env.SESSIONS.get(`participant_session:${m[1]}`)
        if (raw) myId = JSON.parse(raw).participantId
      }
    } catch { /* ignore */ }

    const { results } = await env.DB.prepare(
      `SELECT id, dinner_date, game_date, opponent, is_bye, status,
              host_names, host_location, address
       FROM team_dinners
       ORDER BY dinner_date ASC`
    ).all()

    // Potluck donations, grouped by dinner. Each selected item can carry a note
    // about exactly what the parent is bringing (shown as "Food (Tri-tip)").
    const { results: donRows } = await env.DB.prepare(
      `SELECT dinner_id, participant_id, donor_name, food, drinks, desserts, food_note, drinks_note, desserts_note
       FROM team_dinner_donations
       ORDER BY created_at ASC`
    ).all()
    const label = (on, name, note) => on ? (note ? `${name} (${note})` : name) : null
    const byDinner = {}
    const mineByDinner = {}
    for (const d of (donRows || [])) {
      const items = [
        label(d.food, 'Food', d.food_note),
        label(d.drinks, 'Drinks', d.drinks_note),
        label(d.desserts, 'Dessert', d.desserts_note),
      ].filter(Boolean)
      if (!items.length) continue
      ;(byDinner[d.dinner_id] ||= []).push({ name: d.donor_name, items })
      // Hand the signed-in parent their own picks back so they can edit them.
      if (myId != null && d.participant_id === myId) {
        mineByDinner[d.dinner_id] = {
          food: d.food === 1, drinks: d.drinks === 1, desserts: d.desserts === 1,
          foodNote: d.food_note || '', drinksNote: d.drinks_note || '', dessertsNote: d.desserts_note || '',
        }
      }
    }

    const dinners = (results || []).map(r => ({
      id:            r.id,
      dinnerDate:    r.dinner_date,
      gameDate:      r.game_date,
      opponent:      r.opponent,
      isBye:         r.is_bye === 1,
      status:        r.status,
      hostNames:     r.host_names,
      hostLocation:  r.host_location,
      address:       r.address,
      donations:     byDinner[r.id] || [],
      myDonation:    mineByDinner[r.id] || null,
    }))

    return json({ dinners })
  } catch (e) {
    console.error('[team-dinners]', e?.message, e?.stack)
    return json({ error: 'Could not load the dinner schedule.' }, 500)
  }
}
