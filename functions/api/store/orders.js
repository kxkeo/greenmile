// POST /api/store/orders — create order from cart
// GET  /api/store/orders/confirmation/:num — public confirmation lookup
import { sendEmail } from '../email/send.js'
import { orderConfirmationEmail, orderAdminAlertEmail } from '../email/templates.js'
import { grossUpForStripe } from '../../_lib/stripeFee.js'
import { piAlreadyUsed } from '../../_lib/paymentGuard.js'

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

function pad(n, z = 4) { return String(n).padStart(z, '0') }

async function genOrderNumber(env) {
  const yr = new Date().getFullYear()
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM store_orders WHERE order_number LIKE ?"
  ).bind(`GMB-${yr}-%`).first()
  return `GMB-${yr}-${pad((row?.cnt || 0) + 1)}`
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url)

  // GET /api/store/orders/confirmation/:num
  if (request.method === 'GET') {
    const parts = url.pathname.split('/')
    const num = parts[parts.length - 1]
    if (!num || num === 'orders') return json({ error: 'Not found' }, 404)
    const order = await env.DB.prepare('SELECT * FROM store_orders WHERE order_number=?').bind(num).first()
    if (!order) return json({ error: 'Order not found' }, 404)
    const { results: items } = await env.DB.prepare('SELECT * FROM store_order_items WHERE order_id=?').bind(order.id).all()
    return json({ order, items })
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await request.json()
  const { cart, fulfillment, name, email, phone, address, payment_method, stripe_payment_intent, shipping_cents } = body

  if (!cart?.length || !name || !email || !fulfillment) {
    return json({ error: 'Missing required fields' }, 400)
  }

  // Verify products still exist + compute subtotal from DB prices
  let subtotal = 0
  const lineItems = []
  for (const item of cart) {
    const p = await env.DB.prepare('SELECT * FROM store_products WHERE id=? AND active=1').bind(item.productId).first()
    if (!p) return json({ error: `Product "${item.name}" is no longer available` }, 400)
    subtotal += p.price_cents * item.qty
    lineItems.push({ product: p, item })
  }

  const shippingCents = Math.max(0, parseInt(shipping_cents, 10) || 0)

  // Verify Stripe payment if card — also validates amount to prevent shipping manipulation.
  // Card payments are grossed up to cover Stripe's 2.9% + $0.30 fee, so pi.amount will
  // normally be greater than subtotal+shipping. Accept either the grossed-up or raw total.
  if (payment_method === 'stripe') {
    if (!stripe_payment_intent) return json({ error: 'Missing payment info' }, 400)
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 503)
    if (await piAlreadyUsed(env, stripe_payment_intent)) {
      return json({ error: 'This payment has already been recorded.' }, 409)
    }
    const piResp = await fetch(`https://api.stripe.com/v1/payment_intents/${stripe_payment_intent}`, {
      headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
    })
    const pi = await piResp.json()
    if (pi.status !== 'succeeded') return json({ error: 'Payment not confirmed' }, 400)
    const baseCents          = subtotal + shippingCents
    const expectedGrossed    = grossUpForStripe(baseCents)
    if (pi.amount !== expectedGrossed && pi.amount !== baseCents) {
      return json({ error: 'Payment amount does not match order total' }, 400)
    }
  }
  const totalCents = subtotal + shippingCents
  const orderNumber = await genOrderNumber(env)

  // Insert order
  const orderResult = await env.DB.prepare(`
    INSERT INTO store_orders (order_number, status, fulfillment, name, email, phone, address,
      subtotal_cents, shipping_cents, total_cents, stripe_payment_intent, payment_method)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    orderNumber,
    payment_method === 'stripe' ? 'paid' : 'pending',
    fulfillment, name, email, phone || null,
    address ? JSON.stringify(address) : null,
    subtotal, shippingCents, totalCents,
    stripe_payment_intent || null,
    payment_method || 'cash'
  ).run()

  const orderId = orderResult.meta.last_row_id

  // Insert line items
  for (const { product: p, item } of lineItems) {
    await env.DB.prepare(`
      INSERT INTO store_order_items (order_id, product_id, product_name, product_upc, size, color, quantity, unit_price_cents, unit_cost_cents)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).bind(orderId, p.id, p.name, p.upc || null, item.size || null, item.color || null, item.qty, p.price_cents, p.cost_cents).run()
  }

  const order = await env.DB.prepare('SELECT * FROM store_orders WHERE id=?').bind(orderId).first()
  const { results: items } = await env.DB.prepare('SELECT * FROM store_order_items WHERE order_id=?').bind(orderId).all()

  // Emails
  sendEmail(env, {
    to: email,
    subject: `Order Confirmed — ${orderNumber}`,
    html: orderConfirmationEmail({ order, items }),
  }).catch(() => {})

  const adminEmail = env.ADMIN_EMAIL || 'info@greenmileboosters.com'
  sendEmail(env, {
    to: adminEmail,
    subject: `🛒 New Shop Order — ${orderNumber}`,
    html: orderAdminAlertEmail({ order, items }),
  }).catch(() => {})

  return json({ order, items })
}
