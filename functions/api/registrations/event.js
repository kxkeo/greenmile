// POST /api/registrations/event
import { sendEmail } from '../email/send.js'
import { eventConfirmationEmail, countryNightsEmail, raffleTicketEmail } from '../email/templates.js'
import { grossUpForStripe } from '../../_lib/stripeFee.js'
import { piAlreadyUsed } from '../../_lib/paymentGuard.js'
import { getStripeSecretKey } from '../../_lib/stripeKey.js'
// Generic registration for alumni, fundraiser, other campaign types

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPost({ request, env }) {
  // Auth check
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return json({ error: 'Not authenticated' }, 401)

  const sessionRaw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!sessionRaw) return json({ error: 'Session expired' }, 401)
  const session = JSON.parse(sessionRaw)
  const participantId = session.participantId

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { campaignId, firstName, lastName, email, phone, address, city, state, zip, ticketQty, shirtSize, gradYear, positions, gameType, totalCents, payAtEvent, referredPlayerId } = body
  // Accept both camelCase (new) and snake_case (legacy) payment intent field names
  const paymentIntentId = body.paymentIntentId || body.stripe_payment_intent || null

  if (!campaignId)          return json({ error: 'Campaign ID required' }, 400)
  if (!firstName?.trim())   return json({ error: 'First name required' }, 400)
  if (!lastName?.trim())    return json({ error: 'Last name required' }, 400)
  if (!address?.trim())     return json({ error: 'Address required' }, 400)
  if (!city?.trim())        return json({ error: 'City required' }, 400)
  if (!state?.trim())       return json({ error: 'State required' }, 400)
  if (!zip?.trim())         return json({ error: 'ZIP required' }, 400)

  try {
    // Verify campaign exists and is active
    const campaign = await env.DB.prepare(
      'SELECT id, type, title, status, price_cents, event_date, event_time, location, meta FROM campaigns WHERE id = ?'
    ).bind(campaignId).first()

    if (!campaign)               return json({ error: 'Campaign not found' }, 404)
    if (campaign.status !== 'active') return json({ error: 'Registration is closed for this event' }, 400)

    const qty   = Math.max(1, parseInt(ticketQty, 10) || 1)
    const total = campaign.price_cents ? campaign.price_cents * qty : 0

    // Campaigns with meta.max_tickets (e.g. a 200-ticket raffle) are capped:
    // count already-sold tickets and reject anything that would go over.
    let campaignMeta = {}
    try { campaignMeta = JSON.parse(campaign.meta || '{}') } catch {}
    const maxTickets = parseInt(campaignMeta.max_tickets, 10) || 0
    if (maxTickets > 0) {
      const sold = await env.DB.prepare(
        `SELECT COALESCE(SUM(ticket_qty), 0) AS n FROM event_registrations
         WHERE campaign_id = ? AND payment_status != 'refunded'`
      ).bind(campaignId).first()
      const remaining = maxTickets - (sold?.n || 0)
      if (remaining <= 0)  return json({ error: 'Sold out — all tickets have been claimed.' }, 400)
      if (qty > remaining) return json({ error: `Only ${remaining} ticket${remaining === 1 ? '' : 's'} left.` }, 400)
    }

    // Verify Stripe payment if card payment was used. Card payments are
    // grossed up to cover Stripe's 2.9% + $0.30 fee, so the PI amount will
    // be greater than the raw ticket total.
    let paymentStatus = payAtEvent ? 'pay_at_event' : (total === 0 ? 'free' : 'pending')
    let verifiedCardPayment = false
    if (!payAtEvent && total > 0 && paymentIntentId) {
      const stripeKey = await getStripeSecretKey(env)
      if (!stripeKey) return json({ error: 'Payment processing not configured' }, 503)
      if (await piAlreadyUsed(env, paymentIntentId)) {
        return json({ error: 'This payment has already been recorded.' }, 409)
      }
      const piResp = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      })
      const pi = await piResp.json()
      if (pi.status !== 'succeeded') return json({ error: 'Payment not confirmed' }, 400)
      const expectedCharged = grossUpForStripe(total)
      // Accept either the grossed-up total (expected) or the raw total (legacy/zero-fee),
      // never anything else.
      if (pi.amount !== expectedCharged && pi.amount !== total) {
        return json({ error: 'Payment amount mismatch' }, 400)
      }
      paymentStatus = 'paid'
      verifiedCardPayment = true
    } else if (!payAtEvent && total > 0 && !paymentIntentId) {
      return json({ error: 'Payment required — please complete card payment' }, 400)
    }

    const stripeRef = verifiedCardPayment ? paymentIntentId : null

    await env.DB.prepare(`
      INSERT INTO event_registrations
        (campaign_id, participant_id, first_name, last_name, email, phone,
         address, city, state, zip, ticket_qty, total_cents, shirt_size,
         grad_year, positions, game_type, payment_status, stripe_session, referred_player_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      campaignId, participantId,
      firstName.trim(), lastName.trim(),
      email?.trim().toLowerCase() || null,
      phone?.trim() || null,
      address.trim(), city.trim(), state.trim(), zip.trim(),
      qty, total,
      shirtSize || null,
      gradYear || null,
      positions || null,
      gameType || null,
      paymentStatus,
      stripeRef,
      referredPlayerId ? parseInt(referredPlayerId, 10) : null
    ).run()

    // Send confirmation email if email provided. Country Nights (kind:'ticket')
    // and the raffle (kind:'raffle') get dedicated templates; everything else
    // falls back to the generic event confirmation.
    const emailTo = email?.trim().toLowerCase()
    if (emailTo) {
      const kind = campaignMeta.kind
      let tpl, emailType
      if (kind === 'raffle') {
        tpl = raffleTicketEmail({
          firstName:        firstName.trim(),
          ticketQty:        qty,
          totalCents:       total,
          paymentStatus,
          eventDate:        campaign.event_date || null,
          location:         campaign.location || null,
          prizes:           campaignMeta.prizes || null,
          needNotBePresent: campaignMeta.need_not_be_present === true,
        })
        emailType = 'raffle_confirmation'
      } else if (kind === 'ticket' && campaignMeta.slug === 'country-nights') {
        tpl = countryNightsEmail({
          firstName:     firstName.trim(),
          ticketQty:     qty,
          totalCents:    total,
          paymentStatus,
          eventDate:     campaign.event_date || null,
          location:      campaign.location || null,
          doors:         campaignMeta.doors || null,
          dinner:        campaignMeta.dinner || null,
          highlights:    campaignMeta.highlights || null,
        })
        emailType = 'country_nights_confirmation'
      } else {
        tpl = eventConfirmationEmail({
          firstName:     firstName.trim(),
          campaignTitle: campaign.title,
          campaignType:  campaign.type,
          eventDate:     campaign.event_date || null,
          location:      campaign.location || null,
          ticketQty:     qty,
          shirtSize:     shirtSize || null,
          gradYear:      gradYear || null,
          positions:     positions || null,
          totalCents:    total,
          paymentStatus,
        })
        emailType = 'event_confirmation'
      }
      await sendEmail(env, { to: emailTo, ...tpl }).catch(() => {})
      await env.DB.prepare(
        `INSERT INTO email_log (participant_id, to_email, email_type, subject, status) VALUES (?, ?, ?, ?, 'sent')`
      ).bind(participantId, emailTo, emailType, tpl.subject).run().catch(() => {})
    }

    return json({ ok: true, campaignTitle: campaign.title })
  } catch (e) {
    console.error('[registrations/event]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
