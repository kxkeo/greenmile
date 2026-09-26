// Reusing a Stripe PaymentIntent instead of creating another one.
//
// A checkout that mints a fresh PaymentIntent every time the buyer edits
// something leaves a trail of abandoned intents, and Stripe Radar counts those
// repeated attempts against the card — a real buyer gets declined for "card
// velocity exceeded". So when a buyer backs up and changes their order, we
// update the intent they already have.
//
// Proof of ownership is the client secret itself: the caller has to send back
// the secret we gave them, and we only proceed if it matches what Stripe has on
// file. Knowing an intent's id alone is not enough, so this can't be used to
// pull a client secret for someone else's payment.

export function intentIdFromSecret(clientSecret) {
  if (typeof clientSecret !== 'string') return null
  const m = clientSecret.match(/^(pi_[A-Za-z0-9]+)_secret_[A-Za-z0-9]+$/)
  return m ? m[1] : null
}

// Fields Stripe only accepts at creation time — stripped before an update.
const CREATE_ONLY = ['currency', 'payment_method_types[]', 'automatic_payment_methods[enabled]', 'confirm']

// Returns the updated PaymentIntent, or null when the caller should just create
// a new one (no secret, secret doesn't match, already paid, cancelled, …).
export async function reuseIntent(stripeKey, clientSecret, params, { verify } = {}) {
  const id = intentIdFromSecret(clientSecret)
  if (!id) return null
  try {
    const pi = await fetch(`https://api.stripe.com/v1/payment_intents/${id}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    }).then(r => r.json())

    if (!pi?.id) return null
    // The secret must match Stripe's copy — this is the ownership check.
    if (pi.client_secret !== clientSecret) return null
    // Only an intent that hasn't taken money yet may be re-priced.
    if (pi.status !== 'requires_payment_method' && pi.status !== 'requires_confirmation') return null
    // Optional extra check from the caller (e.g. "this is the same buyer").
    if (typeof verify === 'function' && !verify(pi)) return null

    const body = new URLSearchParams(params)
    for (const k of CREATE_ONLY) body.delete(k)

    const updated = await fetch(`https://api.stripe.com/v1/payment_intents/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }).then(r => r.json())

    return updated?.client_secret ? updated : null
  } catch {
    return null
  }
}
