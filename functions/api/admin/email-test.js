// POST /api/admin/email-test — sends a test email of the specified type

import { sendEmail } from '../email/send.js'
import { pinEmail, golfConfirmationEmail, golfReminderEmail, campConfirmationEmail, taxReceiptEmail, eventConfirmationEmail } from '../email/templates.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// Basic admin-wide rate limit on the test-email endpoint. A compromised admin
// session (or a careless click) shouldn't be able to blast mail through our
// Resend domain and torch our sender reputation. We count sends in a rolling
// 60s KV window.
const RATE_LIMIT_MAX    = 10
const RATE_LIMIT_WINDOW = 60 // seconds

async function rateLimitOk(env) {
  const bucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000))
  const key    = `ratelimit:email-test:${bucket}`
  const raw    = await env.SESSIONS.get(key)
  const count  = raw ? parseInt(raw, 10) || 0 : 0
  if (count >= RATE_LIMIT_MAX) return false
  await env.SESSIONS.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW * 2 })
  return true
}

export async function onRequestPost({ request, env }) {
  if (!(await rateLimitOk(env))) {
    return json({ error: 'Rate limit reached — try again in a minute.' }, 429)
  }

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { type, to, ...rest } = body
  if (!to) return json({ error: 'to email required' }, 400)
  if (!type) return json({ error: 'type required' }, 400)
  // Validate recipient shape before calling Resend — cheap defense against
  // obviously-bad addresses reaching our send budget / reputation score.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to).trim())) {
    return json({ error: 'Invalid recipient address' }, 400)
  }

  let template
  try {
    switch (type) {
      case 'pin':
        template = pinEmail({ firstName: rest.firstName || 'Test User', pin: rest.pin || '123456', eventType: rest.eventType || 'golf' })
        break
      case 'golf_confirmation':
        template = golfConfirmationEmail({
          firstName: rest.firstName || 'John',
          lastName: rest.lastName || 'Smith',
          email: to,
          entryType: rest.entryType || 'individual',
          sponsor: rest.sponsor || null,
          addons: rest.addons || {},
          total: rest.total || 125,
          paymentStatus: rest.paymentStatus || 'pending',
          teamMembers: rest.teamMembers || [],
          eventDate: rest.eventDate || null,
          isNewAccount: rest.isNewAccount || false,
        })
        break
      case 'golf_reminder':
        template = golfReminderEmail({
          firstName: rest.firstName || 'John',
          eventDate: rest.eventDate || null,
          location: rest.location || 'Ridge Creek Dinuba Golf Club',
          shotgunTime: rest.shotgunTime || '8:00 AM',
          paymentStatus: rest.paymentStatus || 'pay_at_event',
          entryType: rest.entryType || 'individual',
          sponsor: rest.sponsor || null,
        })
        break
      case 'camp_confirmation':
        template = campConfirmationEmail({
          parentFirst: rest.parentFirst || 'Jane',
          parentLast: rest.parentLast || 'Smith',
          email: to,
          players: rest.players || [{ firstName: 'Tyler', lastName: 'Smith', ageGroup: '9-11', shirtSize: 'YM' }],
          eventDate: rest.eventDate || null,
          paymentStatus: rest.paymentStatus || 'pending',
          isNewAccount: rest.isNewAccount || false,
        })
        break
      case 'tax_receipt':
        template = taxReceiptEmail({ email: to, amount: rest.amount || 100, donationDate: rest.donationDate || new Date().toISOString() })
        break
      case 'alumni_confirmation':
        template = eventConfirmationEmail({
          firstName:     rest.firstName     || 'Alex',
          campaignTitle: rest.campaignTitle || 'Emperors Alumni Game',
          campaignType:  rest.campaignType  || 'alumni',
          eventDate:     rest.eventDate     || '2026-04-25',
          location:      rest.location      || 'DHS Baseball Field at Washington Intermediate School',
          ticketQty:     rest.ticketQty     || 1,
          shirtSize:     rest.shirtSize     || 'XL',
          gradYear:      rest.gradYear      || '2010',
          positions:     rest.positions     || '["P","SS"]',
          totalCents:    rest.totalCents    || 2500,
          paymentStatus: rest.paymentStatus || 'paid',
        })
        break
      default:
        return json({ error: `Unknown email type: ${type}` }, 400)
    }

    const result = await sendEmail(env, { to, ...template })
    if (!result.ok) return json({ error: result.error || 'Send failed' }, 500)
    return json({ ok: true, message: `${type} email sent to ${to}`, id: result.id })

  } catch (e) {
    console.error('[admin/email-test]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
