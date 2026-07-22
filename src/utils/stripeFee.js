// Stripe processing fee helper (frontend mirror of functions/_lib/stripeFee.js).
// US standard rate: 2.9% + $0.30 per transaction. Keep the numbers and math in
// sync with the server copy — the backend grosses up the PaymentIntent by the
// same formula, so what we show the buyer here must match what Stripe charges.

export const STRIPE_FEE_PERCENT     = 0.029  // 2.9%
export const STRIPE_FEE_FIXED_CENTS = 30     // $0.30

// Amount the card is actually charged so the program nets `baseCents` after
// Stripe takes its cut. This is the fee-inclusive total shown to the buyer.
export function grossUpForStripe(baseCents) {
  const base = Math.round(Number(baseCents) || 0)
  if (base <= 0) return 0
  return Math.ceil((base + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT))
}

// The processing fee portion added on top of the base amount.
export function processingFeeCents(baseCents) {
  const base = Math.round(Number(baseCents) || 0)
  if (base <= 0) return 0
  return grossUpForStripe(base) - base
}
