// Shared guard against replaying a Stripe PaymentIntent across multiple
// registration / donation / order rows. Each PI is tied to exactly one
// successful charge, so once we've accepted it for one row the same PI id
// must not create a second row for free.
//
// Usage:
//   const dup = await piAlreadyUsed(env, paymentIntentId)
//   if (dup) return json({ error: 'This payment has already been recorded' }, 409)

const TABLES = [
  { table: 'golf_registrations',  col: 'stripe_session' },
  { table: 'camp_registrations',  col: 'stripe_session' },
  { table: 'event_registrations', col: 'stripe_session' },
  { table: 'donations',           col: 'stripe_payment_intent' },
  { table: 'store_orders',        col: 'stripe_payment_intent' },
]

export async function piAlreadyUsed(env, pi) {
  if (!pi || typeof pi !== 'string' || !pi.startsWith('pi_')) return false
  for (const { table, col } of TABLES) {
    try {
      const row = await env.DB.prepare(
        `SELECT id FROM ${table} WHERE ${col} = ? LIMIT 1`
      ).bind(pi).first()
      if (row) return { table, id: row.id }
    } catch {
      // If the column/table is missing on a given env we skip it instead of
      // failing the whole check — this helper shouldn't itself block payments.
    }
  }
  return false
}
