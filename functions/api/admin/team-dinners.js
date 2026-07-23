// Admin editor for team dinners.
//   GET  /api/admin/team-dinners — full schedule with host contact details
//   POST /api/admin/team-dinners — update one dinner: { id, hostNames, address,
//        status, notes }. Setting status to 'open' clears the host.
// Auth is enforced by _middleware.js (/api/admin/* requires an admin/staff session).

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, dinner_date, game_date, opponent, is_bye, status,
              host_names, host_location, address, host_email, host_phone, notes, booked_at
       FROM team_dinners
       ORDER BY dinner_date ASC`
    ).all()

    // Potluck donations for the manager (with ids + raw item flags/notes).
    const { results: donRows } = await env.DB.prepare(
      `SELECT id, dinner_id, participant_id, donor_name, food, drinks, desserts,
              food_note, drinks_note, desserts_note
       FROM team_dinner_donations ORDER BY created_at ASC`
    ).all()
    const donByDinner = {}
    for (const d of (donRows || [])) {
      ;(donByDinner[d.dinner_id] ||= []).push({
        id: d.id,
        donorName: d.donor_name,
        isParent: d.participant_id != null,
        food: d.food === 1, drinks: d.drinks === 1, desserts: d.desserts === 1,
        foodNote: d.food_note || '', drinksNote: d.drinks_note || '', dessertsNote: d.desserts_note || '',
      })
    }

    const dinners = (results || []).map(r => ({
      id:           r.id,
      dinnerDate:   r.dinner_date,
      gameDate:     r.game_date,
      opponent:     r.opponent,
      isBye:        r.is_bye === 1,
      status:       r.status,
      hostNames:    r.host_names,
      hostLocation: r.host_location,
      address:      r.address,
      hostEmail:    r.host_email,
      hostPhone:    r.host_phone,
      notes:        r.notes,
      bookedAt:     r.booked_at,
      donations:    donByDinner[r.id] || [],
    }))
    return json({ dinners })
  } catch (e) {
    console.error('[admin/team-dinners GET]', e?.message, e?.stack)
    return json({ error: 'Could not load team dinners.' }, 500)
  }
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const id = parseInt(body.id, 10)
  if (!id) return json({ error: 'Dinner id required' }, 400)

  const dinner = await env.DB.prepare('SELECT id, is_bye FROM team_dinners WHERE id = ?').bind(id).first()
  if (!dinner) return json({ error: 'Dinner not found' }, 404)

  const hostNames = (body.hostNames || '').toString().trim().slice(0, 200) || null
  const address   = (body.address || '').toString().trim().slice(0, 300) || null
  const notes     = (body.notes || '').toString().trim().slice(0, 1000) || null
  // Status: a dinner with a host is 'booked'; clearing the host reopens it.
  let status = body.status === 'open' ? 'open' : (hostNames ? 'booked' : 'open')

  try {
    if (status === 'open') {
      // Reopen — clear host details but keep the schedule row.
      await env.DB.prepare(
        `UPDATE team_dinners
            SET status = 'open', host_names = NULL, address = NULL, host_email = NULL,
                host_phone = NULL, participant_id = NULL, notes = NULL,
                bring_food = 0, bring_drinks = 0, bring_desserts = 0, booked_at = NULL
          WHERE id = ?`
      ).bind(id).run()
    } else {
      // Booked — admin-set host provides food, drinks, and desserts.
      await env.DB.prepare(
        `UPDATE team_dinners
            SET status = 'booked', host_names = ?, address = ?, notes = ?,
                bring_food = 1, bring_drinks = 1, bring_desserts = 1,
                booked_at = COALESCE(booked_at, CURRENT_TIMESTAMP)
          WHERE id = ?`
      ).bind(hostNames, address, notes, id).run()
    }
    return json({ ok: true })
  } catch (e) {
    console.error('[admin/team-dinners POST]', e?.message, e?.stack)
    return json({ error: 'Could not save.' }, 500)
  }
}
