// POST /api/donations/payment-intent — PUBLIC (no login required)
// Creates a Stripe PaymentIntent for a one-off donation or a business
// sponsorship. The charge is grossed up to cover Stripe's fee so the program
// nets the full amount; /api/donations verifies the PI against the same math
// before recording the row.

import { grossUpForStripe } from '../../_lib/stripeFee.js'

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Payment processing not configured' }, 503)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const amountCents = Math.round(Number(body.amountCents) || 0)
  if (amountCents < 100)       return json({ error: 'Minimum amount is $1.' }, 400)
  if (amountCents > 5_000_000) return json({ error: 'That amount is too large for online payment — please contact us.' }, 400)

  const charge = grossUpForStripe(amountCents)
  const params = new URLSearchParams({
    amount:   String(charge),
    currency: 'usd',
    description: String(body.description || 'Green Mile Boosters').slice(0, 200),
    'automatic_payment_methods[enabled]': 'true',
  })

  const email = String(body.email || '').trim()
  if (email) params.append('receipt_email', email)
  if (body.name)      params.append('metadata[name]',       String(body.name).slice(0, 200))
  if (body.kind)      params.append('metadata[kind]',       String(body.kind).slice(0, 40))
  if (body.tierLabel) params.append('metadata[tier]',       String(body.tierLabel).slice(0, 80))
  if (body.business)  params.append('metadata[business]',   String(body.business).slice(0, 200))
  params.append('metadata[base_amount_cents]', String(amountCents))

  try {
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const pi = await res.json()
    if (!res.ok || !pi.client_secret) {
      return json({ error: pi.error?.message || 'Failed to create payment' }, 400)
    }
    return json({ clientSecret: pi.client_secret, chargeCents: charge })
  } catch (e) {
    console.error('[donations/payment-intent]', e?.message)
    return json({ error: 'Payment setup failed. Please try again.' }, 500)
  }
}
