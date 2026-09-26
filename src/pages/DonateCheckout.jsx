import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Button, Eyebrow, Loading } from '../components/ui'
import StripeCheckout, { STRIPE_READY, fmtUSD, FeeBreakdown, grossUpForStripe } from '../components/StripeCheckout'

// Public donation checkout — no account required. Collects the donor's details,
// then (on Continue, never on a keystroke) creates ONE PaymentIntent, takes the
// card via the shared Stripe element, and records the gift, which fires the
// receipt email. Editing details and continuing again updates that same intent
// rather than stacking another against the donor's card.

export default function DonateCheckout() {
  const [params] = useSearchParams()
  const amount = Math.max(0, parseInt(params.get('amount'), 10) || 0)
  const amountCents = amount * 100

  const [form, setForm] = useState({
    firstName: '', lastName: '', organization: '', email: '', phone: '',
    address: '', city: '', state: 'CA', zip: '', emailOptIn: true,
  })
  const [step, setStep] = useState('details')   // details | pay
  const [clientSecret, setClientSecret] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Company/organization is optional (individual donors won't have one);
  // everything else is required so receipts and thank-yous can actually be sent.
  const detailsValid = form.firstName.trim() && form.lastName.trim()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    && form.phone.trim() && form.address.trim() && form.city.trim()
    && form.state.trim() && form.zip.trim()

  // One intent per donation, created when they tap Continue.
  const goToPayment = async () => {
    if (!STRIPE_READY || !detailsValid || amountCents < 100) return
    setCreating(true); setError('')
    try {
      const res = await fetch('/api/donations/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          email: form.email.trim(),
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          business: form.organization.trim() || undefined,
          kind: 'donation',
          description: `Green Mile Boosters donation — $${amount}`,
          clientSecret,   // reuse this intent if they came back to edit
        }),
      })
      const d = await res.json()
      if (!res.ok || !d.clientSecret) throw new Error(d.error || 'Could not start payment.')
      setClientSecret(d.clientSecret)
      setStep('pay')
    } catch (err) {
      setError(err.message || 'Could not start payment. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const recordDonation = async paymentIntentId => {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        organization: form.organization.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        amount,
        wantReceipt: true,
        emailOptIn: form.emailOptIn,
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
            Your donation to Emperor football is in — a receipt is on its way to{' '}
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
      <h1 className="display text-white text-4xl">Your Donation</h1>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-charcoal-900 border border-white/[0.07] px-6 py-5">
        <span className="font-heading uppercase tracking-wide text-zinc-300">Donation</span>
        <span className="display text-field-400 text-4xl">{fmtUSD(amountCents)}</span>
      </div>

      {amount <= 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          No amount selected. <Link to="/donate" className="text-field-400 hover:text-field-300">Pick an amount</Link> to continue.
        </p>
      )}

      {amount > 0 && step === 'details' && (
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
            <label className="label">Company or Organization <span className="text-zinc-600 normal-case">(optional)</span></label>
            <input className="input" value={form.organization} onChange={set('organization')} placeholder="Business, church, or group name" />
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email (for your receipt)</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="(559) 555-1234" required />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={set('address')} placeholder="123 Main St" required />
          </div>
          <div className="mt-4 grid grid-cols-[2fr_1fr_1fr] gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={set('city')} required />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.state} onChange={set('state')} required />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="input" value={form.zip} onChange={set('zip')} required inputMode="numeric" />
            </div>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-xl bg-charcoal-900 border border-white/[0.07] px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={form.emailOptIn}
              onChange={e => setForm(f => ({ ...f, emailOptIn: e.target.checked }))}
              className="accent-field-500 w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-sm text-zinc-300">Email me about future Green Mile Boosters events and promotions.</span>
          </label>

          {error && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

          {STRIPE_READY ? (
            <div className="mt-6">
              <FeeBreakdown baseCents={amountCents} label="Donation" className="mb-5" />
              <Button size="lg" className="w-full" onClick={goToPayment} disabled={!detailsValid || creating}>
                {creating ? 'Preparing secure payment…' : `Continue to Payment · ${fmtUSD(grossUpForStripe(amountCents))}`}
              </Button>
              {!detailsValid && (
                <p className="mt-3 text-sm text-zinc-500 text-center">Fill in your name, contact info, and address to enter your card.</p>
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

      {amount > 0 && step === 'pay' && (
        <>
          <div className="mt-6 rounded-xl bg-charcoal-900 border border-white/[0.07] px-5 py-4 text-sm text-zinc-400">
            {form.firstName.trim()} {form.lastName.trim()}
            {form.organization.trim() ? ` · ${form.organization.trim()}` : ''}
            <div className="text-xs text-zinc-500 mt-1">{form.email.trim()}</div>
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

          <div className="mt-6">
            <FeeBreakdown baseCents={amountCents} label="Donation" className="mb-5" />
            {clientSecret
              ? <StripeCheckout
                  clientSecret={clientSecret}
                  amountCents={grossUpForStripe(amountCents)}
                  onPaid={recordDonation}
                  buttonLabel={`Donate ${fmtUSD(grossUpForStripe(amountCents))}`}
                />
              : <Loading label="Preparing secure payment…" />}
            <button type="button" onClick={() => setStep('details')}
              className="mt-3 w-full text-sm text-zinc-400 hover:text-field-400 py-1">
              Back to edit your details
            </button>
          </div>
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
