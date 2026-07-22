// GET /api/team-dinners — public list of the 2026 team-dinner schedule.
// Personal contact details (email/phone) are never exposed here; only the
// public-facing host names and booking status are returned.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, dinner_date, game_date, opponent, is_bye, status,
              host_names, host_location, address
       FROM team_dinners
       ORDER BY dinner_date ASC`
    ).all()

    // Potluck donations, grouped by dinner. Each selected item can carry a note
    // about exactly what the parent is bringing (shown as "Food (Tri-tip)").
    const { results: donRows } = await env.DB.prepare(
      `SELECT dinner_id, donor_name, food, drinks, desserts, food_note, drinks_note, desserts_note
       FROM team_dinner_donations
       ORDER BY created_at ASC`
    ).all()
    const label = (on, name, note) => on ? (note ? `${name} (${note})` : name) : null
    const byDinner = {}
    for (const d of (donRows || [])) {
      const items = [
        label(d.food, 'Food', d.food_note),
        label(d.drinks, 'Drinks', d.drinks_note),
        label(d.desserts, 'Dessert', d.desserts_note),
      ].filter(Boolean)
      if (!items.length) continue
      ;(byDinner[d.dinner_id] ||= []).push({ name: d.donor_name, items })
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
    }))

    return json({ dinners })
  } catch (e) {
    console.error('[team-dinners]', e?.message, e?.stack)
    return json({ error: 'Could not load the dinner schedule.' }, 500)
  }
}
