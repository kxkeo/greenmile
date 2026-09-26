// POST /api/events/payment-intent
// Creates a Stripe PaymentIntent for event registrations (Country Nights, the
// raffle, alumni games, …). Optionally bundles an add-on campaign bought in the
// same checkout (e.g. raffle tickets alongside a dinner ticket) into ONE charge.
// Auth: middleware requires participant_session
//
// Pass an existing `paymentIntentId` and we UPDATE that intent in place rather
// than creating another one. A buyer who backs up to change their ticket count
// should end up with a single intent, not a trail of abandoned ones — Stripe's
// Radar counts repeated intents on the same card toward its card-velocity rule
// and will start declining a legitimate buyer.
import { grossUpForStripe } from '../../_lib/stripeFee.js'
import { getStripeSecretKey } from '../../_lib/stripeKey.js'
import { reuseIntent } from '../../_lib/reuseIntent.js'

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

// Who's buying, straight from the session — never trusted from the client.
// Attaching this to the PaymentIntent makes payments searchable by name/email
// in the Stripe dashboard and ties the charge back to the booster account.
async function buyerFromSession(request, env) {
  try {
    const m = (request.headers.get('Cookie') || '').match(/participant_session=([^;]+)/)
    if (!m) return null
    const raw = await env.SESSIONS.get(`participant_session:${m[1]}`)
    if (!raw) return null
    const { participantId } = JSON.parse(raw)
    if (!participantId) return null
    return await env.DB.prepare(
      'SELECT id, first_name, last_name, email, phone FROM participants WHERE id = ?'
    ).bind(participantId).first()
  } catch { return null }
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

  const buyer = await buyerFromSession(request, env)
  const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() : ''

  // What they bought, in plain words — this is the line that shows in the
  // Stripe payments list, so it has to be readable at a glance on event day.
  const items = [`${qty} × ${campaign.title}`]
  if (addon) items.push(`${addonQty} × ${addon.title}`)
  const description = [
    `Green Mile Boosters: ${items.join(' + ')}`,
    buyerName || null,
  ].filter(Boolean).join(' — ')

  const params = {
    // Grossed up to cover Stripe's 2.9% + $0.30 so the program nets the full
    // ticket price — /api/registrations/event verifies against the same math.
    amount:                    String(grossUpForStripe(expectedBase)),
    currency:                  'usd',
    'payment_method_types[]':  'card',
    description,
    'metadata[campaign_id]':   String(campaignId),
    'metadata[event]':         String(campaign.title || ''),
    'metadata[ticket_qty]':    String(qty),
    'metadata[purchase]':      items.join(' + ').slice(0, 500),
    // Cleared rather than left stale when an add-on is dropped on a re-edit.
    'metadata[addon_campaign_id]': addon ? String(addon.id) : '',
    'metadata[addon_event]':       addon ? String(addon.title || '') : '',
    'metadata[addon_qty]':         addon ? String(addonQty) : '',
  }
  if (buyer) {
    params['metadata[participant_id]'] = String(buyer.id)
    if (buyerName)    params['metadata[buyer_name]']  = buyerName.slice(0, 200)
    if (buyer.email)  params['metadata[buyer_email]'] = String(buyer.email).slice(0, 200)
    if (buyer.phone)  params['metadata[buyer_phone]'] = String(buyer.phone).slice(0, 40)
    // Stripe emails its own receipt and surfaces the address in the dashboard.
    if (buyer.email)  params['receipt_email'] = String(buyer.email)
  }

  const stripePost = (path, body) => fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  }).then(r => r.json())

  // Reuse the buyer's existing intent when they come back to change something,
  // rather than leaving a trail of abandoned intents on their card.
  const reused = await reuseIntent(stripeKey, body.clientSecret, params, {
    verify: pi => !buyer || String(pi.metadata?.participant_id || '') === String(buyer.id),
  })
  if (reused) {
    return json({
      clientSecret:    reused.client_secret,
      paymentIntentId: reused.id,
      chargeCents:     grossUpForStripe(expectedBase),
    })
  }

  const pi = await stripePost('payment_intents', params)
  if (!pi.client_secret) {
    return json({ error: pi.error?.message || 'Failed to create payment' }, 400)
  }

  return json({
    clientSecret:    pi.client_secret,
    paymentIntentId: pi.id,
    chargeCents:     grossUpForStripe(expectedBase),
  })
}
