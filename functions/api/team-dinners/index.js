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
              host_names, host_location,
              bring_food, bring_drinks, bring_desserts
       FROM team_dinners
       ORDER BY dinner_date ASC`
    ).all()

    const dinners = (results || []).map(r => ({
      id:            r.id,
      dinnerDate:    r.dinner_date,
      gameDate:      r.game_date,
      opponent:      r.opponent,
      isBye:         r.is_bye === 1,
      status:        r.status,
      hostNames:     r.host_names,
      hostLocation:  r.host_location,
      bringFood:     r.bring_food === 1,
      bringDrinks:   r.bring_drinks === 1,
      bringDesserts: r.bring_desserts === 1,
    }))

    return json({ dinners })
  } catch (e) {
    console.error('[team-dinners]', e?.message, e?.stack)
    return json({ error: 'Could not load the dinner schedule.' }, 500)
  }
}
