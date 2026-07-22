// POST /api/registrations/golf
// Public — no auth required. Creates participant if new, then registration + team.
// Admin can pass existingParticipantId (pull from pool) or explicitEventId (target a specific year).

import { getStripeSecretKey } from '../../_lib/stripeKey.js'
import { sendEmail } from '../email/send.js'
import { pinEmail, golfConfirmationEmail } from '../email/templates.js'
import { grossUpForStripe } from '../../_lib/stripeFee.js'
import { piAlreadyUsed } from '../../_lib/paymentGuard.js'
import { hashCredential } from '../../_lib/password.js'

// Recompute golf registration total server-side from campaign meta.
// Client-sent totalCents is NEVER trusted for payment verification.
function computeGolfTotalCents(meta, { sponsor, entry, addons }) {
  if (!meta) return 0
  let cents = 0
  // Sponsor tier
  const sponsorTier = sponsor && Array.isArray(meta.sponsor_tiers)
    ? meta.sponsor_tiers.find(t => t.id === sponsor)
    : null
  if (sponsorTier) cents += Math.round((parseFloat(sponsorTier.price) || 0) * 100)
  // Entry (skip if sponsor includes entry)
  const sponsorIncludesEntry = sponsorTier?.includesEntry === true
  if (entry && !sponsorIncludesEntry) {
    if (entry === 'individual') cents += parseInt(meta.price_individual_cents, 10) || 0
    else if (entry === 'group') cents += parseInt(meta.price_group_cents, 10) || 0
  }
  // Add-ons
  const addonCatalog = Array.isArray(meta.addons) ? meta.addons : []
  if (addons && typeof addons === 'object') {
    for (const [id, qty] of Object.entries(addons)) {
      const q = parseInt(qty, 10) || 0
      if (q <= 0) continue
      const a = addonCatalog.find(x => x.id === id)
      if (a && a.enabled !== false) {
        cents += Math.round((parseFloat(a.price) || 0) * 100) * q
      }
    }
  }
  return cents
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const {
    firstName, lastName, email, phone,
    sponsor, entry, addons, team,
    payAtEvent, referredPlayerId, skipPayment, skipReason, adminAdded,
    existingParticipantId,   // admin: pull from participant pool
    explicitEventId,         // admin: target a specific year's event
  } = body
  // Accept both camelCase (new) and snake_case (legacy) payment intent field names
  const paymentIntentId = body.paymentIntentId || body.stripe_payment_intent || null

  // Validation — skip if using existing participant
  if (!existingParticipantId) {
    if (!firstName?.trim()) return json({ error: 'First name required' }, 400)
    if (!lastName?.trim())  return json({ error: 'Last name required' }, 400)
    if (!email?.trim())     return json({ error: 'Email required' }, 400)
    if (!phone?.trim())     return json({ error: 'Phone required' }, 400)
  }

  try {
    // ── 1. Resolve event + campaign meta ───────────────────────────────────
    let eventId, campaignRow
    if (explicitEventId) {
      eventId = explicitEventId
      campaignRow = await env.DB.prepare(
        "SELECT id, meta FROM campaigns WHERE id = ?"
      ).bind(explicitEventId).first()
    } else {
      campaignRow = await env.DB.prepare(
        "SELECT id, meta FROM campaigns WHERE type='golf' AND status='active' ORDER BY event_date DESC LIMIT 1"
      ).first()
      if (!campaignRow) return json({ error: 'No active tournament found' }, 404)
      eventId = campaignRow.id
    }
    let meta = null
    try { meta = campaignRow?.meta ? (typeof campaignRow.meta === 'string' ? JSON.parse(campaignRow.meta) : campaignRow.meta) : null } catch { meta = null }

    // Authoritative total — NEVER trust client-sent totalCents for payment
    const serverTotalCents = computeGolfTotalCents(meta, { sponsor, entry, addons })

    // ── 2. Resolve participant ─────────────────────────────────────────────
    let plainPin = null
    let participantId, emailNorm, phoneNorm

    if (existingParticipantId) {
      // Admin pulled from pool — use existing record as-is
      const p = await env.DB.prepare(
        'SELECT id, email, phone FROM participants WHERE id = ?'
      ).bind(existingParticipantId).first()
      if (!p) return json({ error: 'Participant not found' }, 404)
      participantId = p.id
      emailNorm = p.email
      phoneNorm = p.phone
    } else {
      emailNorm = email.trim().toLowerCase()
      phoneNorm = phone.trim()

      let participant = await env.DB.prepare(
        'SELECT id, pin_hash FROM participants WHERE email = ?'
      ).bind(emailNorm).first()

      if (!participant) {
        // Check phone isn't already tied to a different account
        if (phoneNorm) {
          const phoneCheck = await env.DB.prepare(
            'SELECT id FROM participants WHERE phone = ?'
          ).bind(phoneNorm).first()
          if (phoneCheck) return json({ error: 'That phone number is already associated with a different account. Please use the email address for that account, or contact us at info@greenmileboosters.org for help.' }, 409)
        }
        // New — generate PIN
        plainPin = generatePin()
        const pinHash = await hashCredential(plainPin)
        participant = await env.DB.prepare(
          `INSERT INTO participants (email, pin_hash, first_name, last_name, phone)
           VALUES (?, ?, ?, ?, ?) RETURNING id`
        ).bind(emailNorm, pinHash, firstName.trim(), lastName.trim(), phoneNorm).first()
      } else {
        // Existing — update contact, never overwrite PIN
        await env.DB.prepare(
          `UPDATE participants SET first_name=?, last_name=?, phone=? WHERE id=?`
        ).bind(firstName.trim(), lastName.trim(), phoneNorm, participant.id).run()
      }
      participantId = participant.id
    }

    // ── 2b. Verify Stripe PaymentIntent (card orders only) ────────────────
    // Card payments are grossed up to cover Stripe's 2.9% + $0.30 fee, so pi.amount
    // will normally exceed the base. Accept either the grossed-up or raw total.
    let verifiedCardPayment = false
    if (!skipPayment && !payAtEvent && serverTotalCents > 0) {
      if (!paymentIntentId) return json({ error: 'Missing payment info' }, 400)
      const stripeKey = await getStripeSecretKey(env)
      if (!stripeKey) return json({ error: 'Stripe not configured' }, 503)
      // Prevent PI replay — a single successful Stripe charge can only back
      // one registration/donation/order row across the whole database.
      if (await piAlreadyUsed(env, paymentIntentId)) {
        return json({ error: 'This payment has already been recorded.' }, 409)
      }
      const piResp = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      })
      const pi = await piResp.json()
      if (pi.status !== 'succeeded') return json({ error: 'Payment not confirmed' }, 400)
      const expectedGrossed = grossUpForStripe(serverTotalCents)
      if (pi.amount !== expectedGrossed && pi.amount !== serverTotalCents) {
        return json({ error: 'Payment amount does not match order total' }, 400)
      }
      verifiedCardPayment = true
    }

    // ── 3. Create registration ─────────────────────────────────────────────
    const paymentStatus = skipPayment
      ? 'waived'
      : (payAtEvent ? 'pay_at_event' : (verifiedCardPayment ? 'paid' : (serverTotalCents === 0 ? 'paid' : 'pending')))
    const notes = skipPayment && skipReason ? `[WAIVED] ${skipReason}` : (adminAdded ? '[Admin added]' : '')
    const stripeRef = verifiedCardPayment ? paymentIntentId : null

    const reg = await env.DB.prepare(
      `INSERT INTO golf_registrations
         (event_id, participant_id, sponsor, entry_type, addons, total_cents, payment_status, stripe_session, notes, referred_player_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(eventId, participantId, sponsor||null, entry||null, JSON.stringify(addons||{}), serverTotalCents, paymentStatus, stripeRef, notes, referredPlayerId ? parseInt(referredPlayerId, 10) : null).first()

    const regId = reg.id

    // ── 4. Create team ─────────────────────────────────────────────────────
    const teamRow = await env.DB.prepare(
      `INSERT INTO golf_teams (event_id, registration_id) VALUES (?, ?) RETURNING id`
    ).bind(eventId, regId).first()

    // ── 5. Insert team members ─────────────────────────────────────────────
    // Slot 1 = primary registrant — get their name from participants table if pool pull
    let slot1Name, slot1Email
    if (existingParticipantId) {
      const p = await env.DB.prepare('SELECT first_name, last_name, email FROM participants WHERE id=?').bind(existingParticipantId).first()
      slot1Name = `${p.first_name} ${p.last_name}`
      slot1Email = p.email
    } else {
      slot1Name = `${firstName.trim()} ${lastName.trim()}`
      slot1Email = emailNorm
    }

    await env.DB.prepare(
      `INSERT INTO golf_team_members
         (registration_id, slot, name, email, phone, participant_id, pin_sent)
       VALUES (?, 1, ?, ?, ?, ?, 0)`
    ).bind(regId, slot1Name, slot1Email, phoneNorm, participantId).run()

    if (Array.isArray(team)) {
      for (let i = 0; i < team.length; i++) {
        const m = team[i]
        if (!m?.name?.trim()) continue
        await env.DB.prepare(
          `INSERT INTO golf_team_members
             (registration_id, slot, name, email, phone, pin_sent)
           VALUES (?, ?, ?, ?, ?, 0)`
        ).bind(regId, i + 2, m.name.trim(), m.email?.trim().toLowerCase()||null, m.phone?.trim()||null).run()
      }
    }

    // ── 6. Send emails ─────────────────────────────────────────────────────
    if (emailNorm) {
      // PIN email for new accounts
      if (plainPin) {
        const pinTpl = pinEmail({ firstName: firstName?.trim() || 'there', pin: plainPin, eventType: 'golf' })
        await sendEmail(env, { to: emailNorm, ...pinTpl })
      }

      // Get event date for confirmation
      const eventRow = await env.DB.prepare('SELECT date FROM events WHERE id=?').bind(eventId).first()

      // Confirmation email
      const confTpl = golfConfirmationEmail({
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        email: emailNorm,
        entryType: entry || null,
        sponsor: sponsor || null,
        addons: addons || {},
        total: serverTotalCents / 100,
        paymentStatus,
        teamMembers: [], // team members fetched separately if needed
        eventDate: eventRow?.date || null,
        isNewAccount: plainPin !== null,
      })
      await sendEmail(env, { to: emailNorm, ...confTpl })

      // Log to email_log
      await env.DB.prepare(
        `INSERT INTO email_log (participant_id, to_email, email_type, subject, status)
         VALUES (?, ?, 'golf_confirmation', 'Emperors Golf Tournament — Registration Received', 'sent')`
      ).bind(participantId, emailNorm).run()
    }

    return json({
      ok: true,
      registrationId: regId,
      teamId: teamRow.id,
      participantId,
      isNewAccount: plainPin !== null,
      pin: plainPin,
      message: 'Registration received',
    }, 201)

  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
