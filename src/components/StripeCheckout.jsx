import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from './ui'

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
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}
      <Button size="lg" className="w-full" disabled={busy || !stripe}>
        {busy ? 'Processing…' : (buttonLabel || `Pay ${fmtUSD(amountCents)} Securely`)}
      </Button>
      <p className="text-xs text-zinc-500 text-center">
        {note || 'Processed securely by Stripe. Your card details never touch our servers.'}
      </p>
    </form>
  )
}
