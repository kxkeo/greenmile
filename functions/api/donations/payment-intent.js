// POST /api/donations/payment-intent — PUBLIC (no login required)
// Creates a Stripe PaymentIntent for a one-off donation or a business
// sponsorship. The charge is grossed up to cover Stripe's fee so the program
// nets the full amount; /api/donations verifies the PI against the same math
// before recording the row.

import { grossUpForStripe } from '../../_lib/stripeFee.js'
import { getStripeSecretKey } from '../../_lib/stripeKey.js'
import { reuseIntent } from '../../_lib/reuseIntent.js'

// Sponsor packages have fixed prices (mirrors src/content/sponsorTiers.js).
// The tier label is what ends up on the sponsor's record and on the banner
// order, so the price behind it can't be whatever the browser says it is.
const TIER_CENTS = {
  'Emperor Sponsor': 100000,
  'Green Sponsor':    50000,
  'Silver Sponsor':   30000,
}

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestPost({ request, env }) {
  const stripeKey = await getStripeSecretKey(env)
  if (!stripeKey) return json({ error: 'Payment processing not configured' }, 503)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const amountCents = Math.round(Number(body.amountCents) || 0)
  if (amountCents < 100)       return json({ error: 'Minimum amount is $1.' }, 400)
  if (amountCents > 5_000_000) return json({ error: 'That amount is too large for online payment — please contact us.' }, 400)

  // A named sponsor tier must be paid at its listed price.
  const tierLabel = String(body.tierLabel || '').trim()
  if (tierLabel && TIER_CENTS[tierLabel] && TIER_CENTS[tierLabel] !== amountCents) {
    return json({ error: 'Sponsor amount does not match that package.' }, 400)
  }

  const charge = grossUpForStripe(amountCents)
  const params = new URLSearchParams({
    amount:   String(charge),
    currency: 'usd',
    description: String(body.description || 'Green Mile Boosters').slice(0, 200),
    'automatic_payment_methods[enabled]': 'true',
  })

  const email = String(body.email || '').trim()
  if (email) params.append('receipt_email', email)
  // Set unconditionally (empty when absent) so a value edited away on a reused
  // intent is cleared rather than left stale.
  params.append('metadata[name]',     String(body.name || '').slice(0, 200))
  params.append('metadata[kind]',     String(body.kind || '').slice(0, 40))
  params.append('metadata[tier]',     tierLabel.slice(0, 80))
  params.append('metadata[business]', String(body.business || '').slice(0, 200))
  params.append('metadata[base_amount_cents]', String(amountCents))

  try {
    // Same buyer coming back after an edit — update their intent in place
    // instead of stacking another one against their card.
    const reused = await reuseIntent(stripeKey, body.clientSecret, params)
    if (reused) {
      return json({ clientSecret: reused.client_secret, paymentIntentId: reused.id, chargeCents: charge })
    }

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const pi = await res.json()
    if (!res.ok || !pi.client_secret) {
      return json({ error: pi.error?.message || 'Failed to create payment' }, 400)
    }
    return json({ clientSecret: pi.client_secret, paymentIntentId: pi.id, chargeCents: charge })
  } catch (e) {
    console.error('[donations/payment-intent]', e?.message)
    return json({ error: 'Payment setup failed. Please try again.' }, 500)
  }
}
