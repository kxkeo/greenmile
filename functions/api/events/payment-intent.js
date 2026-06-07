// POST /api/events/payment-intent
// Creates a Stripe PaymentIntent for event registrations (alumni game, etc.)
// Auth: middleware requires participant_session

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Payment processing not configured' }, 503)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { campaignId, amount_cents } = body
  if (!campaignId)    return json({ error: 'campaignId required' }, 400)
  if (!amount_cents)  return json({ error: 'amount_cents required' }, 400)

  // Verify campaign and price from DB — never trust the client's amount
  const campaign = await env.DB.prepare(
    'SELECT id, title, price_cents, status FROM campaigns WHERE id=?'
  ).bind(campaignId).first()

  if (!campaign)                     return json({ error: 'Campaign not found' }, 404)
  if (campaign.status !== 'active')  return json({ error: 'Registration is closed' }, 400)
  if (!campaign.price_cents)         return json({ error: 'This event has no payment required' }, 400)
  if (campaign.price_cents !== parseInt(amount_cents, 10)) {
    return json({ error: 'Amount does not match campaign price' }, 400)
  }

  const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount:                    String(campaign.price_cents),
      currency:                  'usd',
      'payment_method_types[]':  'card',
      description:               `Green Mile Boosters: ${campaign.title || 'Event Registration'}`,
      'metadata[campaign_id]':   String(campaignId),
    }),
  })

  const pi = await resp.json()
  if (!pi.client_secret) {
    return json({ error: pi.error?.message || 'Failed to create payment' }, 400)
  }

  return json({ clientSecret: pi.client_secret })
}
