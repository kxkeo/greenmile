// POST /api/store/payment-intent — create Stripe PaymentIntent
import { getStripeSecretKey } from '../../_lib/stripeKey.js'

export async function onRequestPost({ request, env }) {
  const stripeKey = await getStripeSecretKey(env)
  if (!stripeKey) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  const { amount_cents } = await request.json()
  if (!amount_cents || amount_cents < 50) {
    return Response.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount:   String(amount_cents),
      currency: 'usd',
      'automatic_payment_methods[enabled]': 'true',
    }),
  })
  const pi = await resp.json()
  if (!resp.ok) {
    return Response.json({ error: pi.error?.message || 'Stripe error' }, { status: 400 })
  }
  return Response.json({ clientSecret: pi.client_secret, id: pi.id })
}
