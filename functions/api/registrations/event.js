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

  const { campaignId, firstName, lastName, email, phone, address, city, state, zip, ticketQty, shirtSize, gradYear, positions, gameType, totalCents, referredPlayerId, emailOptIn, addonCampaignId, addonQty } = body
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

    const parseMeta = c => { try { return JSON.parse(c?.meta || '{}') } catch { return {} } }
    const campaignMeta = parseMeta(campaign)

    // Optional add-on bought in the same checkout (e.g. raffle tickets picked up
    // alongside a Country Nights dinner ticket). One card charge and one
    // PaymentIntent, but a separate registration row per campaign so each keeps
    // its own ticket count, cap, and confirmation email.
    const addonId = addonCampaignId ? parseInt(addonCampaignId, 10) : 0
    const addonN  = addonId ? Math.max(0, parseInt(addonQty, 10) || 0) : 0
    let addon = null, addonMeta = {}
    if (addonId && addonN > 0) {
      if (addonId === parseInt(campaignId, 10)) return json({ error: 'Invalid add-on' }, 400)
      addon = await env.DB.prepare(
        'SELECT id, type, title, status, price_cents, event_date, location, meta FROM campaigns WHERE id = ?'
      ).bind(addonId).first()
      if (!addon)                    return json({ error: 'Add-on not found' }, 404)
      if (addon.status !== 'active') return json({ error: 'That add-on is no longer available' }, 400)
      addonMeta = parseMeta(addon)
    }

    const qty        = Math.max(1, parseInt(ticketQty, 10) || 1)
    const mainTotal  = campaign.price_cents ? campaign.price_cents * qty : 0
    const addonTotal = addon ? (addon.price_cents || 0) * addonN : 0
    const total      = mainTotal + addonTotal

    // Capped campaigns (e.g. the 200-ticket raffle): count what's already sold
    // and reject anything that would go over. Checked for the add-on too.
    const checkCap = async (c, meta, want) => {
      const maxTickets = parseInt(meta.max_tickets, 10) || 0
      if (maxTickets <= 0) return null
      const sold = await env.DB.prepare(
        `SELECT COALESCE(SUM(ticket_qty), 0) AS n FROM event_registrations
         WHERE campaign_id = ? AND payment_status != 'refunded'`
      ).bind(c.id).first()
      const remaining = maxTickets - (sold?.n || 0)
      if (remaining <= 0)   return `${c.title} is sold out — all tickets have been claimed.`
      if (want > remaining) return `Only ${remaining} ${c.title} ticket${remaining === 1 ? '' : 's'} left.`
      return null
    }
    const capErr = (await checkCap(campaign, campaignMeta, qty))
      || (addon ? await checkCap(addon, addonMeta, addonN) : null)
    if (capErr) return json({ error: capErr }, 400)

    // Card payment only — there is no pay-at-the-door path. Card charges are
    // grossed up to cover Stripe's 2.9% + $0.30, so the PI amount exceeds the
    // raw ticket total, and it's verified against the COMBINED total.
    let paymentStatus = total === 0 ? 'free' : 'pending'
    let verifiedCardPayment = false
    if (total > 0) {
      if (!paymentIntentId) return json({ error: 'Payment required — please complete card payment' }, 400)
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
      if (pi.amount !== expectedCharged && pi.amount !== total) {
        return json({ error: 'Payment amount mismatch' }, 400)
      }
      paymentStatus = 'paid'
      verifiedCardPayment = true
    }

    const stripeRef = verifiedCardPayment ? paymentIntentId : null

    // One row per campaign; both carry the same PaymentIntent id.
    const insertReg = async (cid, n, cents) => {
      await env.DB.prepare(`
        INSERT INTO event_registrations
          (campaign_id, participant_id, first_name, last_name, email, phone,
           address, city, state, zip, ticket_qty, total_cents, shirt_size,
           grad_year, positions, game_type, payment_status, stripe_session, referred_player_id, email_opt_in)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        cid, participantId,
        firstName.trim(), lastName.trim(),
        email?.trim().toLowerCase() || null,
        phone?.trim() || null,
        address.trim(), city.trim(), state.trim(), zip.trim(),
        n, cents,
        shirtSize || null,
        gradYear || null,
        positions || null,
        gameType || null,
        paymentStatus,
        stripeRef,
        referredPlayerId ? parseInt(referredPlayerId, 10) : null,
        emailOptIn ? 1 : 0
      ).run()
    }

    await insertReg(campaign.id, qty, mainTotal)
    if (addon && addonN > 0) await insertReg(addon.id, addonN, addonTotal)

    // Confirmation email per campaign. Country Nights (kind:'ticket') and the
    // raffle (kind:'raffle') get dedicated templates; everything else falls
    // back to the generic event confirmation.
    const emailTo = email?.trim().toLowerCase()
    if (emailTo) {
      const tplFor = (c, meta, n, cents) => {
        if (meta.kind === 'raffle') {
          return [raffleTicketEmail({
            firstName:        firstName.trim(),
            ticketQty:        n,
            totalCents:       cents,
            paymentStatus,
            eventDate:        c.event_date || null,
            location:         c.location || null,
            prizes:           meta.prizes || null,
            needNotBePresent: meta.need_not_be_present === true,
          }), 'raffle_confirmation']
        }
        if (meta.kind === 'ticket' && meta.slug === 'country-nights') {
          return [countryNightsEmail({
            firstName:     firstName.trim(),
            ticketQty:     n,
            totalCents:    cents,
            paymentStatus,
            eventDate:     c.event_date || null,
            location:      c.location || null,
            doors:         meta.doors || null,
            dinner:        meta.dinner || null,
            highlights:    meta.highlights || null,
          }), 'country_nights_confirmation']
        }
        return [eventConfirmationEmail({
          firstName:     firstName.trim(),
          campaignTitle: c.title,
          campaignType:  c.type,
          eventDate:     c.event_date || null,
          location:      c.location || null,
          ticketQty:     n,
          shirtSize:     shirtSize || null,
          gradYear:      gradYear || null,
          positions:     positions || null,
          totalCents:    cents,
          paymentStatus,
        }), 'event_confirmation']
      }

      const sends = [[campaign, campaignMeta, qty, mainTotal]]
      if (addon && addonN > 0) sends.push([addon, addonMeta, addonN, addonTotal])
      for (const [c, meta, n, cents] of sends) {
        const [tpl, emailType] = tplFor(c, meta, n, cents)
        await sendEmail(env, { to: emailTo, ...tpl }).catch(() => {})
        await env.DB.prepare(
          `INSERT INTO email_log (participant_id, to_email, email_type, subject, status) VALUES (?, ?, ?, ?, 'sent')`
        ).bind(participantId, emailTo, emailType, tpl.subject).run().catch(() => {})
      }
    }

    return json({ ok: true, campaignTitle: campaign.title, addonTitle: addon ? addon.title : null, addonQty: addonN })
  } catch (e) {
    console.error('[registrations/event]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
