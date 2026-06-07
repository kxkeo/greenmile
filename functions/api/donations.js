// POST /api/donations — record a donation with Stripe PaymentIntent verification
// GET  /api/donations — admin list of all donations
import { sendEmail } from './email/send.js'
import { donationAckEmail } from './email/templates.js'
import { grossUpForStripe } from '../_lib/stripeFee.js'
import { piAlreadyUsed } from '../_lib/paymentGuard.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT d.id, d.first_name, d.last_name, d.email, d.amount_cents, d.tier_id, d.tier_label,
             d.want_receipt, d.payment_status, d.notes, d.address, d.city, d.state, d.zip,
             d.referred_player_id, d.stripe_payment_intent,
             d.refund_id, d.refund_amount_cents, d.refunded_at,
             d.created_at,
             p.first_name AS ref_first_name, p.last_name AS ref_last_name
      FROM donations d
      LEFT JOIN players p ON p.id = d.referred_player_id
      ORDER BY d.created_at DESC
    `).all()

    return json(results.map(r => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      amount: r.amount_cents / 100,
      amountCents: r.amount_cents,
      tierId: r.tier_id,
      tierLabel: r.tier_label,
      wantReceipt: r.want_receipt === 1,
      paymentStatus: r.payment_status,
      notes: r.notes,
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      referredPlayerId: r.referred_player_id,
      referredPlayerName: r.ref_first_name ? `${r.ref_first_name} ${r.ref_last_name}` : null,
      stripePaymentIntent: r.stripe_payment_intent,
      refundId: r.refund_id || null,
      refundAmountCents: r.refund_amount_cents || null,
      refundedAt: r.refunded_at || null,
      createdAt: r.created_at,
    })))
  } catch (e) {
    console.error('[donations:get]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { firstName, lastName, email, amount, tierId, tierLabel, wantReceipt, referredPlayerId, address, city, state, zip } = body
  const paymentIntentId = body.paymentIntentId || body.stripe_payment_intent || null

  if (!firstName?.trim()) return json({ error: 'First name required' }, 400)
  if (!lastName?.trim())  return json({ error: 'Last name required' }, 400)
  if (!amount || isNaN(amount) || amount < 1) return json({ error: 'Valid amount required' }, 400)
  if (wantReceipt && !email?.trim()) return json({ error: 'Email required for receipt' }, 400)

  const amountCents = Math.round(amount * 100)

  // ── Verify Stripe PaymentIntent server-side before recording the donation ──
  // Any donation with a positive amount must be backed by a succeeded PI whose
  // amount matches either the grossed-up charge or the raw base amount.
  const allowSkip = body.skipPaymentCheck === true && env.ALLOW_SKIP_PAYMENT === 'true'
  if (!allowSkip && amountCents > 0) {
    if (!paymentIntentId) return json({ error: 'Missing payment info' }, 400)
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500)
    if (await piAlreadyUsed(env, paymentIntentId)) {
      return json({ error: 'This payment has already been recorded.' }, 409)
    }
    try {
      const piResp = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
      })
      const pi = await piResp.json()
      if (!piResp.ok || pi.error) {
        return json({ error: 'Payment verification failed' }, 400)
      }
      if (pi.status !== 'succeeded') {
        return json({ error: 'Payment not confirmed' }, 400)
      }
      const expectedGrossed = grossUpForStripe(amountCents)
      if (pi.amount !== expectedGrossed && pi.amount !== amountCents) {
        return json({ error: 'Payment amount does not match donation total' }, 400)
      }
    } catch {
      return json({ error: 'Could not verify payment' }, 500)
    }
  }

  try {
    const row = await env.DB.prepare(`
      INSERT INTO donations
        (first_name, last_name, email, amount_cents, tier_id, tier_label, want_receipt, payment_status, referred_player_id, address, city, state, zip, stripe_payment_intent)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      firstName.trim(),
      lastName.trim(),
      email?.trim().toLowerCase() || null,
      amountCents,
      tierId || null,
      tierLabel || null,
      wantReceipt ? 1 : 0,
      referredPlayerId ? parseInt(referredPlayerId, 10) : null,
      address?.trim() || null,
      city?.trim() || null,
      state?.trim() || null,
      zip?.trim() || null,
      paymentIntentId || null,
    ).first()

    // Send acknowledgment email if email provided
    const emailTo = email?.trim().toLowerCase()
    if (emailTo) {
      const tpl = donationAckEmail({
        firstName:    firstName.trim(),
        lastName:     lastName.trim(),
        amount:       amount,
        tierLabel:    tierLabel || null,
        donationDate: new Date().toISOString(),
      })
      await sendEmail(env, { to: emailTo, ...tpl }).catch(() => {})
    }

    return json({ ok: true, donationId: row.id, message: 'Donation recorded' }, 201)
  } catch (e) {
    console.error('[donations:post]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPatch({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { id, paymentStatus, email } = body
  if (!id) return json({ error: 'id required' }, 400)
  try {
    if (email !== undefined) {
      await env.DB.prepare(`UPDATE donations SET email=?, updated_at=datetime('now') WHERE id=?`).bind(email || null, id).run()
    }
    if (paymentStatus !== undefined) {
      await env.DB.prepare(`UPDATE donations SET payment_status=?, updated_at=datetime('now') WHERE id=?`).bind(paymentStatus, id).run()
    }
    return json({ ok: true })
  } catch (e) {
    console.error('[donations:patch]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
