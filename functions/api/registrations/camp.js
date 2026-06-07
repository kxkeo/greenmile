// POST /api/registrations/camp
// Parent registers one or more children.
// Price per child taken from active camp campaign.
// Admin can pass existingParticipantId or explicitCampaignId.

import { sendEmail } from '../email/send.js'
import { pinEmail, campConfirmationEmail } from '../email/templates.js'
import { grossUpForStripe } from '../../_lib/stripeFee.js'
import { piAlreadyUsed } from '../../_lib/paymentGuard.js'
import { hashCredential } from '../../_lib/password.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// Verify the request comes from an authenticated admin session
async function isAdminRequest(request, env) {
  try {
    const cookie = request.headers.get('Cookie') || ''
    const match  = cookie.match(/(?:^|;\s*)greenmile_session=([^;]+)/)
    if (!match) return false
    const raw = await env.SESSIONS.get(`session:${match[1].trim()}`)
    if (!raw) return false
    return JSON.parse(raw).isAdmin === true
  } catch { return false }
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
    parentFirst, parentLast, email, phone,
    street, city, state, zip,
    referredBy, referredPlayerId, waiver, payAtCamp, skipPayment, skipReason, adminAdded, children,
    existingParticipantId,
    explicitCampaignId,
  } = body
  const paymentIntentId = body.paymentIntentId || body.stripe_payment_intent || null

  // Only trust admin-only flags if the request has a valid admin session
  const isAdmin = await isAdminRequest(request, env)
  const trustedAdmin = isAdmin ? !!adminAdded : false

  if (!existingParticipantId) {
    if (!parentFirst?.trim()) return json({ error: 'Parent first name required' }, 400)
    if (!parentLast?.trim())  return json({ error: 'Parent last name required' }, 400)
    if (!email?.trim())       return json({ error: 'Email required' }, 400)
    if (!phone?.trim())       return json({ error: 'Phone required' }, 400)
  }
  if (!waiver && !trustedAdmin) return json({ error: 'Waiver agreement required' }, 400)
  if (!Array.isArray(children) || children.length === 0)
    return json({ error: 'At least one player is required' }, 400)

  try {
    // ── 1. Resolve campaign & price ────────────────────────────────────────
    let campaign
    if (explicitCampaignId) {
      campaign = await env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(explicitCampaignId).first()
    } else {
      campaign = await env.DB.prepare(
        "SELECT * FROM campaigns WHERE type='camp' AND status='active' ORDER BY created_at DESC LIMIT 1"
      ).first()
    }
    if (!campaign) return json({ error: 'No active camp registration found' }, 404)

    // Price per child in cents from campaign
    const pricePerChildCents = campaign.price_cents || 0

    // ── 2. Resolve participant (parent) ────────────────────────────────────
    let plainPin = null
    let participantId, emailNorm, phoneNorm

    if (existingParticipantId) {
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
        if (phoneNorm) {
          const phoneCheck = await env.DB.prepare(
            'SELECT id FROM participants WHERE phone = ?'
          ).bind(phoneNorm).first()
          if (phoneCheck) return json({ error: 'That phone number is already associated with a different account. Please use the email address for that account, or contact us at info@greenmileboosters.com for help.' }, 409)
        }
        plainPin = generatePin()
        const pinHash = await hashCredential(plainPin)
        participant = await env.DB.prepare(
          `INSERT INTO participants (email, pin_hash, first_name, last_name, phone)
           VALUES (?, ?, ?, ?, ?) RETURNING id`
        ).bind(emailNorm, pinHash, parentFirst.trim(), parentLast.trim(), phoneNorm).first()
      } else {
        await env.DB.prepare(
          `UPDATE participants SET first_name=?, last_name=?, phone=? WHERE id=?`
        ).bind(parentFirst.trim(), parentLast.trim(), phoneNorm, participant.id).run()
      }
      participantId = participant.id

      // Update address on participant if provided
      if (street || city || state || zip) {
        await env.DB.prepare(
          `UPDATE participants SET address=?, city=?, state=?, zip=? WHERE id=?`
        ).bind(street?.trim()||null, city?.trim()||null, state?.trim()||null, zip?.trim()||null, participantId).run()
      }
    }

    const waiverAt     = new Date().toISOString()
    // Admin-only overrides: only honored if request is authenticated as admin
    const allowSkip    = isAdmin && skipPayment
    const validChildren = children.filter(c => c.playerFirst?.trim() && c.playerLast?.trim())

    if (validChildren.length === 0) return json({ error: 'No valid players submitted' }, 400)

    // ── 2b. Verify Stripe PaymentIntent (card orders only) ────────────────
    // Card payments are grossed up to cover Stripe's 2.9% + $0.30 fee, so pi.amount will
    // normally be greater than base. Accept either the grossed-up or raw total.
    const baseTotalCents = pricePerChildCents * validChildren.length
    let verifiedCardPayment = false
    if (!allowSkip && !payAtCamp && baseTotalCents > 0) {
      if (!paymentIntentId) return json({ error: 'Missing payment info' }, 400)
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 503)
      if (await piAlreadyUsed(env, paymentIntentId)) {
        return json({ error: 'This payment has already been recorded.' }, 409)
      }
      const piResp = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
      })
      const pi = await piResp.json()
      if (pi.status !== 'succeeded') return json({ error: 'Payment not confirmed' }, 400)
      const expectedGrossed = grossUpForStripe(baseTotalCents)
      if (pi.amount !== expectedGrossed && pi.amount !== baseTotalCents) {
        return json({ error: 'Payment amount does not match order total' }, 400)
      }
      verifiedCardPayment = true
    }

    const paymentStatus = allowSkip
      ? 'waived'
      : (payAtCamp ? 'pay_at_camp' : (verifiedCardPayment ? 'paid' : (baseTotalCents === 0 ? 'paid' : 'pending')))
    const baseNotes    = allowSkip && skipReason ? `[WAIVED] ${skipReason}` : (trustedAdmin ? '[Admin added]' : '')

    // Referred by — credited once per child row for credit counting later
    const referredByValue = referredBy?.trim() || null

    const regIds = []

    // ── 3. Insert one row per child — price per child ──────────────────────
    // Store the Stripe PI id (when card-paid) in stripe_session for audit/refund ease.
    const stripeRef = verifiedCardPayment ? paymentIntentId : null
    for (const child of validChildren) {
      const reg = await env.DB.prepare(`
        INSERT INTO camp_registrations (
          event_id, participant_id,
          player_first_name, player_last_name, player_dob,
          player_age_group, player_skill_level, tshirt_size,
          emergency_name, emergency_phone, emergency_relation,
          waiver_signed, waiver_signed_at,
          total_cents, payment_status, stripe_session, notes, referred_by, positions, referred_player_id
        ) VALUES (
          (SELECT id FROM events WHERE type='camp' ORDER BY date DESC LIMIT 1),
          ?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?
        ) RETURNING id`
      ).bind(
        participantId,
        child.playerFirst.trim(), child.playerLast.trim(),
        child.dob || null,
        child.ageGroup || null,
        child.skillLevel || null,
        child.shirtSize || null,
        child.emergencyName?.trim() || null,
        child.emergencyPhone?.trim() || null,
        child.emergencyRelation?.trim() || null,
        waiverAt,
        pricePerChildCents,
        paymentStatus,
        stripeRef,
        baseNotes || '',
        referredByValue,
        child.positions ? JSON.stringify(child.positions) : null,
        referredPlayerId ? parseInt(referredPlayerId, 10) : null,
      ).first()
      regIds.push(reg.id)
    }

    // ── 4. Send emails ─────────────────────────────────────────────────────
    if (emailNorm) {
      if (plainPin) {
        const pinTpl = pinEmail({ firstName: parentFirst?.trim() || 'there', pin: plainPin, eventType: 'camp' })
        await sendEmail(env, { to: emailNorm, ...pinTpl })
      }

      const confTpl = campConfirmationEmail({
        parentFirst: parentFirst?.trim() || '',
        parentLast:  parentLast?.trim()  || '',
        email: emailNorm,
        players: validChildren.map(c => ({
          firstName: c.playerFirst.trim(),
          lastName:  c.playerLast.trim(),
          shirtSize: c.shirtSize || null,
        })),
        eventDate: campaign.event_date || null,
        paymentStatus,
        isNewAccount: plainPin !== null,
      })
      await sendEmail(env, { to: emailNorm, ...confTpl })

      await env.DB.prepare(
        `INSERT INTO email_log (participant_id, to_email, email_type, subject, status)
         VALUES (?, ?, 'camp_confirmation', 'Emperors Baseball Camp — Registration Received', 'sent')`
      ).bind(participantId, emailNorm).run()
    }

    return json({
      ok: true,
      registrationIds: regIds,
      participantId,
      playerCount: regIds.length,
      totalCents: pricePerChildCents * regIds.length,
      isNewAccount: plainPin !== null,
      pin: plainPin,
      message: 'Registration received',
    }, 201)

  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
