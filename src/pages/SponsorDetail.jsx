import { useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, Loading } from '../components/ui'
import { IMG } from '../content/images'
import { findTier, SPONSOR_TIERS } from '../content/sponsorTiers'
import StripeCheckout, { STRIPE_READY, fmtUSD } from '../components/StripeCheckout'

// Sponsor package info + card checkout: /sponsors/:slug
// Public (a business owner shouldn't need an account). Records the sponsorship
// as a donation carrying the tier label and business name.

export default function SponsorDetail() {
  const { slug } = useParams()
  const tier = findTier(slug)
  if (!tier) return <Navigate to="/sponsors" replace />

  const [form, setForm] = useState({ business: '', firstName: '', lastName: '', email: '', phone: '' })
  const [clientSecret, setClientSecret] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const detailsValid = form.business.trim() && form.firstName.trim() && form.lastName.trim()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())

  useEffect(() => {
    if (!STRIPE_READY || !detailsValid) { setClientSecret(null); return }
    let cancelled = false
    setCreating(true); setError('')
    fetch('/api/donations/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents: tier.amountCents,
        email: form.email.trim(),
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        business: form.business.trim(),
        tierLabel: tier.name,
        kind: 'sponsorship',
        description: `${tier.name} — ${form.business.trim()}`,
      }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.clientSecret) setClientSecret(d.clientSecret); else setError(d.error || 'Could not start payment.') } })
      .catch(() => { if (!cancelled) setError('Could not start payment. Please try again.') })
      .finally(() => { if (!cancelled) setCreating(false) })
    return () => { cancelled = true }
  }, [tier.amountCents, tier.name, detailsValid, form.email, form.firstName, form.lastName, form.business])

  const recordSponsorship = async paymentIntentId => {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        amount: tier.amountCents / 100,
        tierLabel: tier.name,
        notes: `Sponsorship — ${form.business.trim()}${form.phone.trim() ? ` · ${form.phone.trim()}` : ''}`,
        wantReceipt: true,
        paymentIntentId,
      }),
    })
    if (!res.ok) { try { console.error((await res.json()).error) } catch {} }
    setDone(true)
  }

  if (done) {
    return (
      <section className="section py-16 min-h-[75vh] max-w-2xl">
        <div className="card p-8 text-center">
          <img src="/img/logo.png" alt="" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="display text-white text-4xl">Welcome to the Team!</h1>
          <div className="display text-field-400 text-4xl my-4">{tier.name}</div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Thank you, <span className="text-zinc-200">{form.business.trim()}</span>, for backing Dinuba
            football. A receipt is on its way to {form.email.trim()}, and a booster will reach out about
            your banner, program artwork, and game-day perks. Go Emperors!
          </p>
          <div className="mt-7 flex flex-col gap-3">
            <Button to="/sponsors" size="md" className="w-full">Back to Sponsors</Button>
            <Button to="/" variant="outline" size="md" className="w-full">Home</Button>
          </div>
        </div>
      </section>
    )
  }

  const otherTiers = SPONSOR_TIERS.filter(t => t.slug !== tier.slug)

  return (
    <>
      <Hero
        image={IMG.sideline}
        eyebrow="Sponsor Package"
        title={tier.name}
        subtitle={tier.blurb}
        minH="min-h-[52vh]"
      >
        <Button href="#checkout" size="lg">Become {tier.slug === 'emperor' ? 'an' : 'a'} {tier.name.split(' ')[0]} Sponsor</Button>
      </Hero>

      <section className="section py-16 max-w-4xl grid lg:grid-cols-[1fr_1.1fr] gap-10 items-start">
        {/* What's included */}
        <div>
          <SectionHeading center={false} eyebrow="What's included" title="Your Package" />
          <div className="mt-6 flex items-baseline gap-2">
            <span className="display text-white text-5xl">{tier.price}</span>
            <span className="text-zinc-400 text-sm">per season</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {tier.perks.map(p => (
              <li key={p} className="flex gap-2.5 text-zinc-200">
                <span className="text-field-400 shrink-0">✓</span><span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-zinc-500">
            The Green Mile Boosters is a registered nonprofit — sponsorships are tax-deductible where
            applicable. EIN 92-2360865.
          </p>
        </div>

        {/* Checkout */}
        <div id="checkout" className="card p-7 sm:p-8 scroll-mt-24">
          <Eyebrow className="mb-2">Secure Checkout</Eyebrow>
          <h2 className="display text-white text-3xl">Sponsor Now</h2>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-charcoal-900 border border-white/[0.07] px-5 py-4">
            <span className="font-heading uppercase tracking-wide text-zinc-300 text-sm">{tier.name}</span>
            <span className="display text-field-400 text-3xl">{fmtUSD(tier.amountCents)}</span>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Business Name</label>
              <input className="input" value={form.business} onChange={set('business')} placeholder="Your business" required />
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

          {error && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

          {STRIPE_READY ? (
            <div className="mt-6">
              {!detailsValid ? (
                <p className="text-sm text-zinc-500">Fill in your business and contact details to enter your card.</p>
              ) : creating ? (
                <Loading label="Preparing secure payment…" />
              ) : (
                <StripeCheckout
                  clientSecret={clientSecret}
                  amountCents={tier.amountCents}
                  onPaid={recordSponsorship}
                  buttonLabel={`Sponsor ${fmtUSD(tier.amountCents)}`}
                />
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-field-900/40 border border-field-500/30 p-5 text-sm text-zinc-300 leading-relaxed">
              Online card payment is being connected. To lock in your sponsorship now, email{' '}
              <a href="mailto:info@greenmileboosters.org?subject=Sponsorship%20Inquiry" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>{' '}
              or call Coach Lester at <a href="tel:5597370804" className="text-field-400 hover:text-field-300">(559) 737-0804</a>.
            </div>
          )}
        </div>
      </section>

      {/* Other tiers */}
      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-14">
          <SectionHeading eyebrow="Other packages" title="Compare Levels" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto">
            {otherTiers.map(t => (
              <Link key={t.slug} to={`/sponsors/${t.slug}`} className="card-hover p-6 flex items-center justify-between gap-4">
                <div>
                  <div className="font-heading uppercase tracking-wide text-white">{t.name}</div>
                  <div className="text-sm text-zinc-500 mt-0.5">{t.blurb}</div>
                </div>
                <div className="display text-field-400 text-2xl shrink-0">{t.price}</div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button to="/sponsors" variant="outline" size="md">All Sponsor Packages</Button>
          </div>
        </div>
      </section>
    </>
  )
}
