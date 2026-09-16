// POST /api/events/payment-intent
// Creates a Stripe PaymentIntent for event registrations (Country Nights, the
// raffle, alumni games, …). Optionally bundles an add-on campaign bought in the
// same checkout (e.g. raffle tickets alongside a dinner ticket) into ONE charge.
// Auth: middleware requires participant_session
import { grossUpForStripe } from '../../_lib/stripeFee.js'
import { getStripeSecretKey } from '../../_lib/stripeKey.js'

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

const loadActive = async (env, id) => {
  const c = await env.DB.prepare(
    'SELECT id, title, price_cents, status FROM campaigns WHERE id=?'
  ).bind(id).first()
  if (!c) return { error: 'Campaign not found', status: 404 }
  if (c.status !== 'active') return { error: 'Registration is closed', status: 400 }
  if (!c.price_cents) return { error: 'This event has no payment required', status: 400 }
  return { campaign: c }
}

export async function onRequestPost({ request, env }) {
  const stripeKey = await getStripeSecretKey(env)
  if (!stripeKey) return json({ error: 'Payment processing not configured' }, 503)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { campaignId, amount_cents } = body
  const qty = Math.max(1, Math.min(50, parseInt(body.ticketQty, 10) || 1))
  if (!campaignId)    return json({ error: 'campaignId required' }, 400)
  if (!amount_cents)  return json({ error: 'amount_cents required' }, 400)

  // Verify campaign and price from DB — never trust the client's amount
  const main = await loadActive(env, campaignId)
  if (main.error) return json({ error: main.error }, main.status)
  const campaign = main.campaign

  // Optional add-on campaign (e.g. raffle tickets bought with a dinner ticket).
  const addonId = body.addonCampaignId ? parseInt(body.addonCampaignId, 10) : 0
  const addonQty = addonId ? Math.max(0, Math.min(50, parseInt(body.addonQty, 10) || 0)) : 0
  let addon = null
  if (addonId && addonQty > 0) {
    if (addonId === parseInt(campaignId, 10)) return json({ error: 'Invalid add-on' }, 400)
    const a = await loadActive(env, addonId)
    if (a.error) return json({ error: a.error }, a.status)
    addon = a.campaign
  }

  // Expected total is computed entirely from DB prices; the client's
  // amount_cents only has to agree with it.
  const expectedBase = (campaign.price_cents * qty) + (addon ? addon.price_cents * addonQty : 0)
  if (expectedBase !== parseInt(amount_cents, 10)) {
    return json({ error: 'Amount does not match campaign price' }, 400)
  }

  const description = addon
    ? `Green Mile Boosters: ${campaign.title} × ${qty} + ${addon.title} × ${addonQty}`
    : `Green Mile Boosters: ${campaign.title || 'Event Registration'} × ${qty}`

  const params = {
    // Grossed up to cover Stripe's 2.9% + $0.30 so the program nets the full
    // ticket price — /api/registrations/event verifies against the same math.
    amount:                    String(grossUpForStripe(expectedBase)),
    currency:                  'usd',
    'payment_method_types[]':  'card',
    description,
    'metadata[campaign_id]':   String(campaignId),
    'metadata[ticket_qty]':    String(qty),
  }
  if (addon) {
    params['metadata[addon_campaign_id]'] = String(addon.id)
    params['metadata[addon_qty]']         = String(addonQty)
  }

  const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  })

  const pi = await resp.json()
  if (!pi.client_secret) {
    return json({ error: pi.error?.message || 'Failed to create payment' }, 400)
  }

  return json({ clientSecret: pi.client_secret, chargeCents: grossUpForStripe(expectedBase) })
}
