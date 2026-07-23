// Admin management of team-dinner potluck donations.
//   POST /api/admin/team-dinner-donations  { action, ... }
//     action 'add'    : { dinnerId, donorName, food, drinks, desserts, foodNote, drinksNote, dessertsNote }
//     action 'update' : { id, donorName, food, drinks, desserts, foodNote, drinksNote, dessertsNote }
//     action 'remove' : { id }
// Auth enforced by _middleware.js (/api/admin/* requires an admin/staff session).

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

function readItems(body) {
  const food     = body.food ? 1 : 0
  const drinks   = body.drinks ? 1 : 0
  const desserts = body.desserts ? 1 : 0
  const clip = v => (v || '').toString().trim().slice(0, 200) || null
  return {
    food, drinks, desserts,
    foodNote:     food     ? clip(body.foodNote)     : null,
    drinksNote:   drinks   ? clip(body.drinksNote)   : null,
    dessertsNote: desserts ? clip(body.dessertsNote) : null,
    any: food || drinks || desserts,
  }
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const action = body.action

  try {
    if (action === 'remove') {
      const id = parseInt(body.id, 10)
      if (!id) return json({ error: 'id required' }, 400)
      await env.DB.prepare('DELETE FROM team_dinner_donations WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }

    if (action === 'add') {
      const dinnerId  = parseInt(body.dinnerId, 10)
      const donorName = (body.donorName || '').toString().trim().slice(0, 120)
      if (!dinnerId)  return json({ error: 'dinnerId required' }, 400)
      if (!donorName) return json({ error: 'A name is required.' }, 400)
      const it = readItems(body)
      if (!it.any) return json({ error: 'Pick at least one: food, drinks, or dessert.' }, 400)
      // Admin-entered donations have no participant_id (manual entry).
      await env.DB.prepare(
        `INSERT INTO team_dinner_donations
           (dinner_id, participant_id, donor_name, food, drinks, desserts, food_note, drinks_note, desserts_note)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(dinnerId, donorName, it.food, it.drinks, it.desserts, it.foodNote, it.drinksNote, it.dessertsNote).run()
      return json({ ok: true })
    }

    if (action === 'update') {
      const id = parseInt(body.id, 10)
      const donorName = (body.donorName || '').toString().trim().slice(0, 120)
      if (!id)        return json({ error: 'id required' }, 400)
      if (!donorName) return json({ error: 'A name is required.' }, 400)
      const it = readItems(body)
      if (!it.any) return json({ error: 'Pick at least one: food, drinks, or dessert.' }, 400)
      await env.DB.prepare(
        `UPDATE team_dinner_donations
            SET donor_name = ?, food = ?, drinks = ?, desserts = ?,
                food_note = ?, drinks_note = ?, desserts_note = ?
          WHERE id = ?`
      ).bind(donorName, it.food, it.drinks, it.desserts, it.foodNote, it.drinksNote, it.dessertsNote, id).run()
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('[admin/team-dinner-donations]', e?.message, e?.stack)
    return json({ error: 'Could not save.' }, 500)
  }
}
