// GET  /api/auth/participant-donations       — list participant's donations by email
// POST /api/auth/participant-donations       — action: resend-receipt

import { sendEmail } from '../email/send.js'
import { taxReceiptEmail } from '../email/templates.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

async function getParticipant(request, env) {
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return null
  const raw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    const p = await env.DB.prepare(
      'SELECT id, email, first_name, last_name FROM participants WHERE id = ?'
    ).bind(session.participantId).first()
    return p || null
  } catch { return null }
}

export async function onRequestGet({ request, env }) {
  const p = await getParticipant(request, env)
  if (!p) return json({ error: 'Not authenticated' }, 401)
  if (!p.email) return json([])

  try {
    const { results } = await env.DB.prepare(`
      SELECT id, first_name, last_name, email, amount_cents, tier_id, tier_label,
             want_receipt, payment_status, created_at
      FROM donations
      WHERE LOWER(email) = LOWER(?)
      ORDER BY created_at DESC
    `).bind(p.email).all()
    return json(results || [])
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPost({ request, env }) {
  const p = await getParticipant(request, env)
  if (!p) return json({ error: 'Not authenticated' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { action, donationId } = body
  if (action !== 'resend-receipt') return json({ error: 'Unknown action' }, 400)
  if (!donationId) return json({ error: 'donationId required' }, 400)

  try {
    const donation = await env.DB.prepare(
      'SELECT * FROM donations WHERE id = ? AND LOWER(email) = LOWER(?)'
    ).bind(donationId, p.email).first()

    if (!donation) return json({ error: 'Donation not found' }, 404)
    if (!donation.email) return json({ error: 'No email on file for this donation' }, 400)

    const tpl = taxReceiptEmail({
      email:        donation.email,
      amount:       donation.amount_cents / 100,
      donationDate: donation.created_at,
    })

    const result = await sendEmail(env, { to: donation.email, ...tpl })
    if (!result.ok) return json({ error: 'Failed to send email: ' + result.error }, 500)

    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
