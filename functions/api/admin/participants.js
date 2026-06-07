// GET   /api/admin/participants  — list all participants
// POST  /api/admin/participants  — action: reset-pin | disable | enable | delete | create
// PATCH /api/admin/participants  — edit account fields

import { hashCredential } from '../../_lib/password.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, first_name, last_name, email, phone,
             address, city, state, zip,
             disabled, created_at, last_login_at
      FROM participants
      ORDER BY created_at DESC
    `).all()
    return json(results)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPatch({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id, firstName, lastName, email, phone, address, city, state, zip } = body
  if (!id) return json({ error: 'id required' }, 400)

  try {
    // Check for phone conflict with a different account
    if (phone?.trim()) {
      const conflict = await env.DB.prepare(
        'SELECT id FROM participants WHERE phone = ? AND id != ?'
      ).bind(phone.trim(), id).first()
      if (conflict) return json({ error: 'That phone number is already used by another account.' }, 409)
    }

    // Check for email conflict with a different account
    if (email?.trim()) {
      const conflict = await env.DB.prepare(
        'SELECT id FROM participants WHERE email = ? AND id != ?'
      ).bind(email.trim().toLowerCase(), id).first()
      if (conflict) return json({ error: 'That email is already used by another account.' }, 409)
    }

    await env.DB.prepare(`
      UPDATE participants
      SET first_name = ?, last_name = ?, email = ?, phone = ?,
          address = ?, city = ?, state = ?, zip = ?
      WHERE id = ?
    `).bind(
      firstName?.trim() || '',
      lastName?.trim()  || '',
      email?.trim().toLowerCase() || null,
      phone?.trim() || null,
      address?.trim() || null,
      city?.trim()    || null,
      state?.trim()   || null,
      zip?.trim()     || null,
      id
    ).run()

    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { action, id } = body

  try {
    // ── Create new account ─────────────────────────────────────────────────────
    if (action === 'create') {
      const { firstName, lastName, email, phone } = body
      if (!firstName?.trim()) return json({ error: 'First name is required' }, 400)
      if (!lastName?.trim())  return json({ error: 'Last name is required' }, 400)
      if (!email?.trim())     return json({ error: 'Email is required' }, 400)

      const emailNorm = email.trim().toLowerCase()

      // Check for existing account
      const existing = await env.DB.prepare(
        'SELECT id FROM participants WHERE email = ?'
      ).bind(emailNorm).first()
      if (existing) return json({ error: 'An account with that email already exists.' }, 409)

      if (phone?.trim()) {
        const phoneConflict = await env.DB.prepare(
          'SELECT id FROM participants WHERE phone = ?'
        ).bind(phone.trim()).first()
        if (phoneConflict) return json({ error: 'That phone number is already used by another account.' }, 409)
      }

      const pin     = generatePin()
      const pinHash = await hashCredential(pin)

      const result = await env.DB.prepare(`
        INSERT INTO participants (first_name, last_name, email, pin_hash, phone)
        VALUES (?, ?, ?, ?, ?) RETURNING id
      `).bind(
        firstName.trim(), lastName.trim(), emailNorm, pinHash, phone?.trim() || null
      ).first()

      // Admin hands the PIN to the participant out-of-band (verbally / text
      // from their own phone). We return the PIN in the response so the
      // admin UI reveals it once.
      return json({ ok: true, pin, id: result?.id })
    }

    // ── Existing actions ───────────────────────────────────────────────────────
    if (!id) return json({ error: 'id required' }, 400)

    if (action === 'reset-pin') {
      const pin  = generatePin()
      const hash = await hashCredential(pin)
      await env.DB.prepare('UPDATE participants SET pin_hash = ? WHERE id = ?').bind(hash, id).run()
      // PIN is revealed to the admin in the UI; admin shares it with the
      // participant out-of-band (phone call / text from their own phone).
      return json({ ok: true, pin })
    }

    if (action === 'disable') {
      await env.DB.prepare('UPDATE participants SET disabled = 1 WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }

    if (action === 'enable') {
      await env.DB.prepare('UPDATE participants SET disabled = 0 WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }

    if (action === 'delete') {
      const tables = [
        'DELETE FROM participant_sessions WHERE participant_id = ?',
        'DELETE FROM golf_team_members WHERE participant_id = ?',
        'DELETE FROM golf_contest_results WHERE participant_id = ?',
        'DELETE FROM hall_of_fame WHERE participant_id = ?',
        'DELETE FROM golf_registrations WHERE participant_id = ?',
        'DELETE FROM camp_registrations WHERE participant_id = ?',
        'DELETE FROM event_registrations WHERE participant_id = ?',
        'DELETE FROM participant_players WHERE participant_id = ?',
        'DELETE FROM email_log WHERE participant_id = ?',
      ]
      for (const sql of tables) {
        try { await env.DB.prepare(sql).bind(id).run() } catch { /* table may not exist yet */ }
      }
      await env.DB.prepare('DELETE FROM participants WHERE id = ?').bind(id).run()
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
