import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, Loading } from '../components/ui'
import { IMG } from '../content/images'
import StripeCheckout, { STRIPE_READY, fmtUSD, FeeBreakdown, grossUpForStripe } from '../components/StripeCheckout'

// Custom-amount sponsorship: /sponsors/custom
// For businesses that want to give an amount outside the printed tiers. Public
// (a business owner shouldn't need an account). Two steps so we only create one
// PaymentIntent instead of one per keystroke while they type an amount:
//   1. Sponsor name + contact + amount  →  Continue to Payment
//   2. Fee breakdown + card
// Recorded as a donation tagged "Custom Sponsor" so it lands in the CRM as a
// Sponsor alongside the tier packages.

const PRESETS = [25000, 50000, 100000, 250000]
const MIN_CENTS = 2500        // $25 floor — keeps card fees sane on tiny sponsorships
const MAX_CENTS = 5_000_000   // $50,000 ceiling, matches the payment-intent endpoint

export default function SponsorCustom() {
  const [form, setForm] = useState({
    business: '', firstName: '', lastName: '', email: '', phone: '',
    amount: '', emailOptIn: true,
  })
  const [step, setStep] = useState('details')  // details | pay
  const [clientSecret, setClientSecret] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Amount typed as dollars; keep only digits and a single decimal point.
  const onAmount = e => {
    const raw = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    setForm(f => ({ ...f, amount: raw }))
  }
  const amountCents = Math.round((parseFloat(form.amount) || 0) * 100)
  const amountValid = amountCents >= MIN_CENTS && amountCents <= MAX_CENTS

  const detailsValid = form.business.trim() && form.firstName.trim() && form.lastName.trim()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && amountValid

  const label = `Custom Sponsor — ${fmtUSD(amountCents)}`

  // Create the PaymentIntent once, when they move to the payment step.
  const continueToPayment = async () => {
    if (!detailsValid) {
      setError(!amountValid
        ? `Enter a sponsorship amount between ${fmtUSD(MIN_CENTS)} and ${fmtUSD(MAX_CENTS)}.`
        : 'Please fill in your business name, contact name, and a valid email.')
      return
    }
    setError(''); setCreating(true)
    try {
      const res = await fetch('/api/donations/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          email: form.email.trim(),
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          business: form.business.trim(),
          tierLabel: label,
          kind: 'sponsorship',
          description: `Custom Sponsorship — ${form.business.trim()}`,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) throw new Error(data.error || 'Could not start payment.')
      setClientSecret(data.clientSecret)
      setStep('pay')
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const backToDetails = () => { setStep('details'); setClientSecret(null); setError('') }

  const recordSponsorship = async paymentIntentId => {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        amount: amountCents / 100,
        tierLabel: label,
        notes: `Sponsorship — ${form.business.trim()}${form.phone.trim() ? ` · ${form.phone.trim()}` : ''}`,
        wantReceipt: true,
        emailOptIn: form.emailOptIn,
        paymentIntentId,
      }),
    })
    // The charge already succeeded; if recording hiccups we still thank them
    // (Stripe emailed a receipt) rather than implying failure.
    if (!res.ok) { try { console.error((await res.json()).error) } catch {} }
    setDone(true)
  }

  if (done) {
    return (
      <section className="section py-16 min-h-[75vh] max-w-2xl">
        <div className="card p-8 text-center">
          <img src={IMG.logo} alt="" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="display text-white text-4xl">Thank You!</h1>
          <div className="display text-field-400 text-4xl my-4">{fmtUSD(amountCents)}</div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Thank you, <span className="text-zinc-200">{form.business.trim()}</span>, for backing Dinuba
            football. A receipt is on its way to {form.email.trim()}, and a booster will reach out about
            your banner and program listing. This is what a small town taking care of its kids looks like.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Button to="/" size="md">Back to Home</Button>
            <Button to="/sponsors" variant="outline" size="md">See All Packages</Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <Hero
        image={IMG.sideline}
        eyebrow="One Town, One Team, One Dream"
        title={<>Sponsor Your<br /><span className="text-field-400">Way</span></>}
        subtitle="Pick your own amount. Every dollar from local business goes straight to our kids — gear, meals, travel, and the Friday nights this whole town circles on the calendar."
        minH="min-h-[52vh]"
      >
        <Button href="#give" size="lg">Choose an Amount</Button>
        <Button to="/sponsors" variant="outline" size="lg">See Packages</Button>
      </Hero>

      <section id="give" className="section py-16 max-w-2xl scroll-mt-20">
        <SectionHeading
          eyebrow="Custom sponsorship"
          title="Give What Works for You"
          intro="Not every business fits a package. Enter any amount and we'll make sure your support gets where it counts — and that the Green Mile crowd knows who backed them."
        />

        <div className="card p-7 sm:p-8 mt-10">
          {step === 'details' ? (
            <>
              <Eyebrow className="mb-2">Step 1 of 2</Eyebrow>
              <h2 className="display text-white text-3xl">Your Sponsorship</h2>

              {/* Amount */}
              <div className="mt-6">
                <label className="label">Sponsorship Amount</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESETS.map(p => (
                    <button key={p} type="button"
                      onClick={() => setForm(f => ({ ...f, amount: String(p / 100) }))}
                      className={`px-4 py-2 rounded-lg border text-sm font-heading uppercase tracking-wide transition ${
                        amountCents === p
                          ? 'bg-field-600 border-field-500 text-white'
                          : 'bg-charcoal-900 border-white/10 text-zinc-400 hover:border-white/25'
                      }`}>
                      {fmtUSD(p)}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">$</span>
                  <input
                    className="input !pl-9 !text-2xl !py-4 font-heading"
                    value={form.amount}
                    onChange={onAmount}
                    placeholder="0.00"
                    inputMode="decimal"
                    aria-label="Sponsorship amount in dollars"
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Any amount from {fmtUSD(MIN_CENTS)} to {fmtUSD(MAX_CENTS)}.
                </p>
              </div>

              {/* Sponsor + contact */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">Sponsor / Business Name</label>
                  <input className="input" value={form.business} onChange={set('business')} placeholder="Your business or family name" required />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact First Name</label>
                    <input className="input" value={form.firstName} onChange={set('firstName')} required />
                  </div>
                  <div>
                    <label className="label">Contact Last Name</label>
                    <input className="input" value={form.lastName} onChange={set('lastName')} required />
                  </div>
                </div>
                <div>
                  <label className="label">Email (for your receipt)</label>
                  <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@business.com" required />
                </div>
                <div>
                  <label className="label">Phone <span className="text-zinc-600 normal-case">(optional)</span></label>
                  <input className="input" value={form.phone} onChange={set('phone')} placeholder="(559) 555-1234" />
                </div>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-xl bg-charcoal-900 border border-white/[0.07] px-4 py-3 cursor-pointer">
                <input type="checkbox" checked={form.emailOptIn}
                  onChange={e => setForm(f => ({ ...f, emailOptIn: e.target.checked }))}
                  className="accent-field-500 w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-300">Email me about future Green Mile Boosters events, promotions, and sponsor opportunities.</span>
              </label>

              {/* What Stripe will charge */}
              {amountValid && <FeeBreakdown baseCents={amountCents} label="Sponsorship" className="mt-5" />}

              {error && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

              {STRIPE_READY ? (
                <Button size="lg" className="w-full mt-5" onClick={continueToPayment} disabled={creating}>
                  {creating ? 'Preparing…' : 'Continue to Payment'}
                </Button>
              ) : (
                <div className="mt-5 rounded-xl bg-field-900/40 border border-field-500/30 p-5 text-sm text-zinc-300 leading-relaxed">
                  Online card payment is being connected. To lock in your sponsorship now, email{' '}
                  <a href="mailto:info@greenmileboosters.org?subject=Sponsorship%20Inquiry" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>{' '}
                  or call Coach Lester at <a href="tel:5597370804" className="text-field-400 hover:text-field-300">(559) 737-0804</a>.
                </div>
              )}
            </>
          ) : (
            <>
              <Eyebrow className="mb-2">Step 2 of 2</Eyebrow>
              <h2 className="display text-white text-3xl">Secure Payment</h2>
              <p className="mt-1 text-sm text-zinc-400">{form.business.trim()} · {fmtUSD(amountCents)} sponsorship</p>

              <FeeBreakdown baseCents={amountCents} label="Sponsorship" className="mt-5" />

              {error && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

              <div className="mt-5">
                {clientSecret ? (
                  <StripeCheckout
                    clientSecret={clientSecret}
                    amountCents={grossUpForStripe(amountCents)}
                    onPaid={recordSponsorship}
                    buttonLabel={`Sponsor ${fmtUSD(grossUpForStripe(amountCents))}`}
                  />
                ) : <Loading label="Preparing secure payment…" />}
              </div>

              <button onClick={backToDetails} className="mt-4 w-full text-center text-xs text-zinc-500 hover:text-field-300 transition">
                ← Change amount or details
              </button>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          The Green Mile Boosters is a registered nonprofit — sponsorships are tax-deductible where
          applicable. EIN 92-2360865.
        </p>
        <p className="mt-3 text-center text-sm text-zinc-500">
          Want the banner, program, and game-day perks? <Link to="/sponsors" className="text-field-400 hover:text-field-300">See our sponsor packages</Link>.
        </p>
      </section>
    </>
  )
}
