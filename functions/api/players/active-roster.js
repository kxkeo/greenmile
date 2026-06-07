// GET /api/players/active-roster
// Returns first_name, last_name, id for players on the active roster year
// Used by referral dropdowns on registration and donation pages

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT p.id, p.first_name, p.last_name
      FROM players p
      JOIN roster_years ry ON p.roster_year = ry.year
      WHERE ry.is_active = 1
      ORDER BY p.last_name, p.first_name
    `).all()
    return json(results)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
