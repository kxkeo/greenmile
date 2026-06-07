// GET/PATCH /api/admin/store-orders
// Auth: middleware enforces isAdmin for all /api/admin/* routes
import { sendEmail } from '../email/send.js'
import { orderShippedEmail, orderReadyPickupEmail, orderRefundedEmail } from '../email/templates.js'

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    const url    = new URL(request.url)
    const status = url.searchParams.get('status')
    const query  = status && status !== 'all'
      ? 'SELECT * FROM store_orders WHERE status=? ORDER BY created_at DESC'
      : 'SELECT * FROM store_orders ORDER BY created_at DESC'
    const { results: orders } = await env.DB.prepare(query).bind(...(status && status !== 'all' ? [status] : [])).all()

    const full = await Promise.all(orders.map(async o => {
      const { results: items } = await env.DB.prepare('SELECT * FROM store_order_items WHERE order_id=?').bind(o.id).all()
      return { ...o, items }
    }))
    return json(full)
  }

  if (request.method === 'PATCH') {
    const b = await request.json()
    const { id, status, tracking_number, notes } = b
    if (!id) return json({ error: 'Missing id' }, 400)

    const cols = ['updated_at=datetime(\'now\')']
    const vals = []
    if (status)           { cols.push('status=?');           vals.push(status) }
    if (tracking_number !== undefined) { cols.push('tracking_number=?'); vals.push(tracking_number) }
    if (notes !== undefined)           { cols.push('notes=?');           vals.push(notes) }
    vals.push(id)
    await env.DB.prepare(`UPDATE store_orders SET ${cols.join(',')} WHERE id=?`).bind(...vals).run()

    const order = await env.DB.prepare('SELECT * FROM store_orders WHERE id=?').bind(id).first()
    const { results: items } = await env.DB.prepare('SELECT * FROM store_order_items WHERE order_id=?').bind(id).all()

    // Status-triggered emails
    if (status === 'shipped' && tracking_number) {
      sendEmail(env, {
        to: order.email,
        subject: `Your Green Mile Boosters Order Has Shipped — ${order.order_number}`,
        html: orderShippedEmail({ order, items, tracking: tracking_number }),
      }).catch(() => {})
    }
    if (status === 'ready_pickup') {
      sendEmail(env, {
        to: order.email,
        subject: `Your Green Mile Boosters Order is Ready for Pickup — ${order.order_number}`,
        html: orderReadyPickupEmail({ order, items }),
      }).catch(() => {})
    }
    if (status === 'refunded') {
      sendEmail(env, {
        to: order.email,
        subject: `Refund Processed — ${order.order_number}`,
        html: orderRefundedEmail({ order, items }),
      }).catch(() => {})
    }

    return json({ ...order, items })
  }

  return json({ error: 'Method not allowed' }, 405)
}
