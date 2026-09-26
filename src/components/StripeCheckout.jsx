import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from './ui'
import { grossUpForStripe, processingFeeCents } from '../utils/stripeFee'

// Shared Stripe card-payment surface, used by Donate, Sponsor, and Event
// checkouts so there's one place that mounts the Payment Element and confirms
// a charge. The parent creates the PaymentIntent (amount + endpoint differ per
// flow) and passes its clientSecret; on a succeeded charge we hand back the
// PaymentIntent id so the parent can record the sale.

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
export const STRIPE_READY = Boolean(PK && !PK.includes('placeholder'))
const stripePromise = STRIPE_READY ? loadStripe(PK) : null

export const fmtUSD = c =>
  `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`

// Re-export the fee math so pages can import everything Stripe-related from one
// place (single source of truth: src/utils/stripeFee.js).
export { grossUpForStripe, processingFeeCents } from '../utils/stripeFee'

// Buyer-facing breakdown: base amount + the 2.9% + $0.30 card fee = total
// charged. Shown on every card checkout so the amount on the button matches
// what Stripe actually charges — the fee is passed transparently to the payer.
export function FeeBreakdown({ baseCents, label = 'Subtotal', className = '' }) {
  const fee   = processingFeeCents(baseCents)
  const total = grossUpForStripe(baseCents)
  if (baseCents <= 0) return null
  return (
    <div className={`rounded-xl bg-charcoal-900 border border-white/[0.07] px-5 py-4 text-sm ${className}`}>
      <div className="flex items-center justify-between text-zinc-400">
        <span>{label}</span><span className="text-zinc-200">{fmtUSD(baseCents)}</span>
      </div>
      <div className="flex items-center justify-between text-zinc-400 mt-2">
        <span>Card processing fee</span><span className="text-zinc-200">{fmtUSD(fee)}</span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.07]">
        <span className="font-heading uppercase tracking-wide text-zinc-200">Total</span>
        <span className="display text-field-400 text-2xl">{fmtUSD(total)}</span>
      </div>
    </div>
  )
}

export default function StripeCheckout({ clientSecret, amountCents, onPaid, buttonLabel, note }) {
  if (!STRIPE_READY || !clientSecret) return null
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#4aa86a', borderRadius: '10px' } } }}
    >
      <PayForm amountCents={amountCents} onPaid={onPaid} buttonLabel={buttonLabel} note={note} />
    </Elements>
  )
}

function PayForm({ amountCents, onPaid, buttonLabel, note }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fails, setFails] = useState(0)

  const pay = async e => {
    e.preventDefault()
    if (!stripe || !elements) return
    setError(''); setBusy(true)
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
      if (error) throw new Error(error.message)
      if (paymentIntent?.status !== 'succeeded') throw new Error('Payment was not completed. Please try again.')
      await onPaid(paymentIntent.id)
    } catch (err) {
      setError(err.message)
      setFails(n => n + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">
          {error}
          {/* Repeated attempts on one card trip Stripe's fraud checks, which
              declines an otherwise good card. Steer them off that path. */}
          {fails >= 2 && (
            <p className="mt-2 text-red-200/80">
              Repeated tries on the same card can get it blocked automatically. Try a different card,
              or email{' '}
              <a href="mailto:info@greenmileboosters.org" className="underline">info@greenmileboosters.org</a>{' '}
              and we'll get you taken care of.
            </p>
          )}
        </div>
      )}
      <Button size="lg" className="w-full" disabled={busy || !stripe}>
        {busy ? 'Processing…' : (buttonLabel || `Pay ${fmtUSD(amountCents)} Securely`)}
      </Button>
      <p className="text-xs text-zinc-500 text-center">
        {note || 'Processed securely by Stripe. Your card details never touch our servers.'}
      </p>
    </form>
  )
}
