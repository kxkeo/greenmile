import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Button, Eyebrow, Loading } from '../components/ui'
import StripeCheckout, { STRIPE_READY, fmtUSD } from '../components/StripeCheckout'

// Public donation checkout — no account required. Collects the donor's name and
// email, spins up a PaymentIntent, takes the card via the shared Stripe
// element, then records the gift (which fires the receipt email).

export default function DonateCheckout() {
  const [params] = useSearchParams()
  const amount = Math.max(0, parseInt(params.get('amount'), 10) || 0)
  const amountCents = amount * 100

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [clientSecret, setClientSecret] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const detailsValid = form.firstName.trim() && form.lastName.trim()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())

  // Create the PaymentIntent once the donor details are filled in.
  useEffect(() => {
    if (!STRIPE_READY || !detailsValid || amountCents < 100) { setClientSecret(null); return }
    let cancelled = false
    setCreating(true); setError('')
    fetch('/api/donations/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents,
        email: form.email.trim(),
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        kind: 'donation',
        description: `Green Mile Boosters donation — $${amount}`,
      }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.clientSecret) setClientSecret(d.clientSecret); else setError(d.error || 'Could not start payment.') } })
      .catch(() => { if (!cancelled) setError('Could not start payment. Please try again.') })
      .finally(() => { if (!cancelled) setCreating(false) })
    return () => { cancelled = true }
  }, [amountCents, detailsValid, form.email, form.firstName, form.lastName])

  const recordDonation = async paymentIntentId => {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        amount,
        wantReceipt: true,
        paymentIntentId,
      }),
    })
    // Payment already succeeded at this point; if recording hiccups we still
    // thank the donor (Stripe emailed a receipt) rather than implying failure.
    if (!res.ok) { try { console.error((await res.json()).error) } catch {} }
    setDone(true)
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center">
          <img src="/img/logo.png" alt="" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="display text-white text-4xl">Thank You!</h1>
          <div className="display text-field-400 text-4xl my-4">{fmtUSD(amountCents)}</div>
          <p className="text-sm text-zinc-400">
            Your gift to Emperor football is in — a receipt is on its way to{' '}
            <span className="text-zinc-200">{form.email.trim()}</span>. This is what a small town
            taking care of its kids looks like. Go Emperors!
          </p>
          <div className="mt-7 flex flex-col gap-3">
            <Button to="/" size="md" className="w-full">Back to Home</Button>
            <Button to="/events/country-nights" variant="outline" size="md" className="w-full">See Country Nights</Button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <Eyebrow className="mb-2">Secure Checkout</Eyebrow>
      <h1 className="display text-white text-4xl">Your Gift</h1>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-charcoal-900 border border-white/[0.07] px-6 py-5">
        <span className="font-heading uppercase tracking-wide text-zinc-300">Donation</span>
        <span className="display text-field-400 text-4xl">{fmtUSD(amountCents)}</span>
      </div>

      {amount <= 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          No amount selected. <Link to="/donate" className="text-field-400 hover:text-field-300">Pick an amount</Link> to continue.
        </p>
      )}

      {amount > 0 && (
        <>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={set('lastName')} required />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Email (for your receipt)</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" required />
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

          {STRIPE_READY ? (
            <div className="mt-6">
              {!detailsValid ? (
                <p className="text-sm text-zinc-500">Fill in your name and email to enter your card.</p>
              ) : creating ? (
                <Loading label="Preparing secure payment…" />
              ) : (
                <StripeCheckout
                  clientSecret={clientSecret}
                  amountCents={amountCents}
                  onPaid={recordDonation}
                  buttonLabel={`Donate ${fmtUSD(amountCents)}`}
                />
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-field-900/40 border border-field-500/30 p-5">
              <div className="font-heading uppercase tracking-wide text-field-300 text-sm mb-1">Online giving is being connected</div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                We're finishing our secure payment setup. To give right now, email{' '}
                <a href="mailto:info@greenmileboosters.org" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>{' '}
                and we'll take care of you. Thank you for backing the Emperors!
              </p>
            </div>
          )}
        </>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <section className="section py-16 min-h-[75vh] max-w-2xl">
      <div className="mb-8">
        <Link to="/donate" className="text-sm text-zinc-400 hover:text-field-400">Back to donate</Link>
      </div>
      <div className="card p-8">{children}</div>
    </section>
  )
}
