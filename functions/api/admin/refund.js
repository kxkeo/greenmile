// POST /api/admin/refund
// Admin-only. Initiates a full Stripe refund against the stored PaymentIntent on
// a registration or donation row, then marks payment_status='refunded' so the
// row is treated as canceled-but-retained. Uses a Stripe Idempotency-Key so
// double-clicks can't double-refund.
//
// Body: { kind: 'event'|'camp'|'golf'|'donation', id: <row id> }
// Returns: { ok, refundId, amountCents } or { error } with a clear message.

const TABLES = {
  event:    { table: 'event_registrations', piCol: 'stripe_session' },
  camp:     { table: 'camp_registrations',  piCol: 'stripe_session' },
  golf:     { table: 'golf_registrations',  piCol: 'stripe_session' },
  donation: { table: 'donations',           piCol: 'stripe_payment_intent' },
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPost({ request, env }) {
  // Auth: /api/admin/* is already gated by the root _middleware.js which
  // requires a valid greenmile_session + isAdmin flag. No self-check needed here —
  // a single enforcement point prevents drift between middleware and handler.

  let body
  try { body = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { kind, id } = body
  if (!kind || !TABLES[kind]) return json({ error: 'Invalid refund kind' }, 400)
  const rowId = parseInt(id, 10)
  if (!rowId) return json({ error: 'Invalid id' }, 400)

  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500)

  const { table, piCol } = TABLES[kind]

  // ── Load row and validate refundability ──────────────────────────────────
  let row
  try {
    row = await env.DB.prepare(`SELECT id, payment_status, ${piCol} AS pi_id FROM ${table} WHERE id = ?`)
      .bind(rowId).first()
  } catch (e) {
    console.error('[admin/refund]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
  if (!row) return json({ error: 'Record not found' }, 404)
  if (row.payment_status === 'refunded') return json({ error: 'Already refunded' }, 400)
  if (!row.pi_id || !String(row.pi_id).startsWith('pi_')) {
    return json({ error: 'No card payment on this record — nothing to refund' }, 400)
  }

  // ── Issue Stripe refund ──────────────────────────────────────────────────
  // Full refund (no amount param = refund everything Stripe captured, including
  // the 2.9% + $0.30 fee we passed through). Idempotency key dedupes on retry.
  const params = new URLSearchParams()
  params.set('payment_intent', row.pi_id)
  params.set('reason', 'requested_by_customer')

  let refund
  try {
    const resp = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization':   `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type':    'application/x-www-form-urlencoded',
        'Idempotency-Key': `refund-${kind}-${rowId}`,
      },
      body: params.toString(),
    })
    refund = await resp.json()
    if (!resp.ok || refund.error) {
      const msg = refund.error?.message || `Stripe error (${resp.status})`
      return json({ error: msg }, 400)
    }
  } catch (e) {
    return json({ error: 'Could not reach Stripe: ' + e.message }, 500)
  }

  // Stripe returns refund.status: 'succeeded' | 'pending' | 'failed' | 'canceled'
  // 'pending' is rare but possible (ACH, some bank methods). We still record
  // and mark refunded — if it later fails, Stripe sends a webhook we can wire
  // up in a follow-up. For now card refunds nearly always come back 'succeeded'.
  if (refund.status === 'failed' || refund.status === 'canceled') {
    return json({ error: `Refund ${refund.status}: ${refund.failure_reason || 'unknown reason'}` }, 400)
  }

  // ── Mark row refunded ────────────────────────────────────────────────────
  try {
    await env.DB.prepare(
      `UPDATE ${table}
       SET payment_status = 'refunded',
           refund_id = ?,
           refund_amount_cents = ?,
           refunded_at = datetime('now')
       WHERE id = ?`
    ).bind(refund.id, refund.amount, rowId).run()
  } catch (e) {
    // Refund succeeded in Stripe but DB update failed. Surface clearly so admin
    // knows the money is refunded even if the row didn't flip locally.
    return json({
      error: 'Stripe refund succeeded but database update failed: ' + e.message,
      refundId: refund.id,
      amountCents: refund.amount,
    }, 500)
  }

  return json({ ok: true, refundId: refund.id, amountCents: refund.amount, status: refund.status })
}
