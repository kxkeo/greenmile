// Stripe processing fee helper — US standard rate: 2.9% + $0.30 per transaction.
// Keep this file in sync with src/utils/stripeFee.js (same numbers, same math).

export const STRIPE_FEE_PERCENT     = 0.029  // 2.9%
export const STRIPE_FEE_FIXED_CENTS = 30     // $0.30

export function grossUpForStripe(baseCents) {
  const base = Math.round(Number(baseCents) || 0)
  if (base <= 0) return 0
  return Math.ceil((base + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT))
}

export function processingFeeCents(baseCents) {
  const base = Math.round(Number(baseCents) || 0)
  if (base <= 0) return 0
  return grossUpForStripe(base) - base
}
