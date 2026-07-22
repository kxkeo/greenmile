// POST /api/team-dinners/book — a logged-in parent signs up to host an open
// team dinner. Requires a participant session (self-checked here, same as
// /api/registrations/event). An open date is claimed atomically so two parents
// can't book the same night.

import { sendEmail } from '../email/send.js'
import { teamDinnerEmail } from '../email/templates.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPost({ request, env }) {
  // Auth — participant session required.
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return json({ error: 'Please sign in to host a dinner.' }, 401)

  const sessionRaw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!sessionRaw) return json({ error: 'Your session expired — please sign in again.' }, 401)
  const session = JSON.parse(sessionRaw)
  const participantId = session.participantId

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const dinnerId = parseInt(body.dinnerId, 10)
  if (!dinnerId) return json({ error: 'Which dinner?' }, 400)

  const bringFood     = body.bringFood ? 1 : 0
  const bringDrinks   = body.bringDrinks ? 1 : 0
  const bringDesserts = body.bringDesserts ? 1 : 0
  const hostLocation  = (body.hostLocation || '').toString().trim().slice(0, 200) || null
  const notes         = (body.notes || '').toString().trim().slice(0, 1000) || null

  try {
    // Pull the participant's profile for the host name + contact info.
    const p = await env.DB.prepare(
      'SELECT first_name, last_name, email, phone FROM participants WHERE id = ?'
    ).bind(participantId).first()
    if (!p) return json({ error: 'Account not found. Please sign in again.' }, 401)

    const dinner = await env.DB.prepare(
      'SELECT id, dinner_date, game_date, opponent, is_bye, status FROM team_dinners WHERE id = ?'
    ).bind(dinnerId).first()
    if (!dinner)               return json({ error: 'That dinner is no longer available.' }, 404)
    if (dinner.is_bye === 1)   return json({ error: 'That is a bye week — no game, no dinner.' }, 400)
    if (dinner.status !== 'open') return json({ error: 'Sorry — that dinner has already been claimed.' }, 409)

    const hostNames = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Emperor Family'

    // Atomic claim — only succeeds if the row is still open, so a race between
    // two parents can only book one of them.
    const upd = await env.DB.prepare(
      `UPDATE team_dinners
         SET status = 'booked', participant_id = ?, host_names = ?, host_location = ?,
             host_email = ?, host_phone = ?,
             bring_food = ?, bring_drinks = ?, bring_desserts = ?, notes = ?,
             booked_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'open'`
    ).bind(
      participantId, hostNames, hostLocation,
      p.email || null, p.phone || null,
      bringFood, bringDrinks, bringDesserts, notes,
      dinnerId
    ).run()

    if (!upd.meta?.changes) {
      return json({ error: 'Sorry — that dinner was just claimed by someone else.' }, 409)
    }

    // Confirmation email (best-effort).
    const emailTo = p.email?.trim()
    if (emailTo) {
      const tpl = teamDinnerEmail({
        firstName:  p.first_name,
        opponent:   dinner.opponent,
        dinnerDate: dinner.dinner_date,
        gameDate:   dinner.game_date,
        hostLocation,
        bringFood:  !!bringFood,
        bringDrinks:!!bringDrinks,
        bringDesserts: !!bringDesserts,
        notes,
      })
      await sendEmail(env, { to: emailTo, ...tpl }).catch(() => {})
      await env.DB.prepare(
        `INSERT INTO email_log (participant_id, to_email, email_type, subject, status) VALUES (?, ?, 'team_dinner', ?, 'sent')`
      ).bind(participantId, emailTo, tpl.subject).run().catch(() => {})
    }

    return json({ ok: true, opponent: dinner.opponent, dinnerDate: dinner.dinner_date })
  } catch (e) {
    console.error('[team-dinners/book]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
