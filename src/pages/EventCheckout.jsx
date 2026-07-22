import { useEffect, useMemo, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button, Eyebrow, Loading } from '../components/ui'

// Generic paid-event checkout: /events/register/:id
// Works for any active campaign (Country Nights dinner, raffle, alumni, …).
// Requires a participant account — the registration + receipt APIs are tied to
// one. Card payment via Stripe when keys are configured; "pay at the door"
// otherwise (raffles always require card/online payment once Stripe is live).

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const STRIPE_READY = PK && !PK.includes('placeholder')
const stripePromise = STRIPE_READY ? loadStripe(PK) : null

const fmt = c => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export default function EventCheckout() {
  const { id } = useParams()
  const location = useLocation()
  const [campaign, setCampaign] = useState(undefined)
  const [me, setMe] = useState(undefined) // undefined = loading, null = not signed in

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(list => setCampaign((Array.isArray(list) ? list : []).find(c => String(c.id) === String(id)) || null))
      .catch(() => setCampaign(null))
    fetch('/api/auth/participant-me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setMe(d?.firstName ? d : null))
      .catch(() => setMe(null))
  }, [id])

  if (campaign === undefined || me === undefined) return <Loading label="Loading checkout…" />

  if (campaign === null) {
    return (
      <Shell title="Event Not Found">
        <p className="text-zinc-400 text-sm">This event isn't open for registration. It may have closed or sold out.</p>
        <div className="mt-6"><Button to="/events" size="md">Back to Events</Button></div>
      </Shell>
    )
  }

  if (me === null) {
    const next = encodeURIComponent(location.pathname)
    return (
      <Shell title={campaign.title} subtitle="Sign in to buy tickets — it takes under a minute and gets you your email receipt.">
        <div className="flex flex-col gap-3">
          <Button to={`/my-account/login?next=${next}`} size="lg" className="w-full">Sign In</Button>
          <Button to={`/my-account/signup?next=${next}`} variant="outline" size="lg" className="w-full">Create a Free Account</Button>
        </div>
      </Shell>
    )
  }

  return <CheckoutForm campaign={campaign} me={me} />
}

function CheckoutForm({ campaign, me }) {
  const isRaffle = campaign.meta?.kind === 'raffle'
  const maxTickets = campaign.meta?.max_tickets || 0
  const remaining = maxTickets ? Math.max(0, maxTickets - (campaign.tickets_sold || 0)) : null
  const maxQty = remaining != null ? Math.min(10, remaining) : 10

  const [qty, setQty] = useState(1)
  const [form, setForm] = useState({
    firstName: me.firstName || '', lastName: me.lastName || '',
    email: me.email || '', phone: me.phone || '',
    address: '', city: '', state: 'CA', zip: '',
  })
  const [payAtEvent, setPayAtEvent] = useState(!STRIPE_READY)
  const [clientSecret, setClientSecret] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const totalCents = (campaign.price_cents || 0) * qty
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const formValid = form.firstName.trim() && form.lastName.trim() && form.address.trim()
    && form.city.trim() && form.state.trim() && form.zip.trim()

  // Create the payment intent when paying by card and details are complete.
  useEffect(() => {
    if (!STRIPE_READY || payAtEvent || !formValid || totalCents <= 0) { setClientSecret(null); return }
    let cancelled = false
    fetch('/api/events/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ campaignId: campaign.id, amount_cents: totalCents, ticketQty: qty }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) setClientSecret(d.clientSecret || null) })
      .catch(() => { if (!cancelled) setClientSecret(null) })
    return () => { cancelled = true }
  }, [campaign.id, totalCents, qty, payAtEvent, formValid])

  const register = async (paymentIntentId = null) => {
    const res = await fetch('/api/registrations/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        campaignId: campaign.id,
        ...form,
        ticketQty: qty,
        totalCents,
        payAtEvent: payAtEvent && !paymentIntentId,
        paymentIntentId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    setDone(true)
  }

  const submitPayAtEvent = async e => {
    e.preventDefault()
    setError(''); setBusy(true)
    try { await register() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (done) {
    return (
      <Shell title="You're In! 🤠" subtitle={`${qty} ${isRaffle ? 'raffle ' : ''}ticket${qty > 1 ? 's' : ''} for ${campaign.title}.`}>
        <div className="text-center">
          <div className="display text-field-400 text-4xl mb-4">{fmt(totalCents)}</div>
          <p className="text-sm text-zinc-400 mb-2">
            {form.email
              ? <>A receipt is on its way to <span className="text-zinc-200">{form.email}</span>.</>
              : 'Your registration is recorded.'}
          </p>
          {payAtEvent && <p className="text-sm text-zinc-400">Payment is due at the event — see you there!</p>}
          {isRaffle && <p className="text-sm text-zinc-400">Drawing on September 26, 2026. Need not be present to win.</p>}
          <div className="mt-7 flex flex-col gap-3">
            <Button to="/events/country-nights" size="md" className="w-full">Back to Country Nights</Button>
            <Button to="/my-account/dashboard" variant="outline" size="md" className="w-full">My Account</Button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title={campaign.title} subtitle={campaign.event_date ? `${campaign.event_date}${campaign.location ? ` · ${campaign.location}` : ''}` : null} wide>
      <form onSubmit={submitPayAtEvent} className="space-y-5">
        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

        {/* Quantity + total */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-charcoal-900 border border-white/[0.07] px-5 py-4">
          <div>
            <div className="label !mb-1">{isRaffle ? 'Raffle tickets' : 'Tickets'} · {fmt(campaign.price_cents)} each</div>
            <div className="flex items-center gap-3">
              <QtyBtn onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</QtyBtn>
              <span className="display text-white text-2xl w-8 text-center">{qty}</span>
              <QtyBtn onClick={() => setQty(q => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>+</QtyBtn>
            </div>
            {remaining != null && <div className="mt-1.5 text-xs text-zinc-500">{remaining} of {maxTickets} remaining</div>}
          </div>
          <div className="text-right">
            <div className="label !mb-1">Total</div>
            <div className="display text-field-400 text-4xl">{fmt(totalCents)}</div>
          </div>
        </div>

        {/* Contact + billing info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First Name"><input className="input" value={form.firstName} onChange={set('firstName')} required /></Field>
          <Field label="Last Name"><input className="input" value={form.lastName} onChange={set('lastName')} required /></Field>
        </div>
        <Field label="Email (for your receipt)"><input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} placeholder="(559) 555-1234" /></Field>
        <Field label="Address"><input className="input" value={form.address} onChange={set('address')} required /></Field>
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
          <Field label="City"><input className="input" value={form.city} onChange={set('city')} required /></Field>
          <Field label="State"><input className="input" value={form.state} onChange={set('state')} required /></Field>
          <Field label="ZIP"><input className="input" value={form.zip} onChange={set('zip')} required inputMode="numeric" /></Field>
        </div>

        {/* Payment */}
        {STRIPE_READY ? (
          <>
            <div className="flex gap-3">
              <PayToggle active={!payAtEvent} onClick={() => setPayAtEvent(false)}>💳 Pay by Card</PayToggle>
              {!isRaffle && <PayToggle active={payAtEvent} onClick={() => setPayAtEvent(true)}>🎟️ Pay at the Door</PayToggle>}
            </div>
            {!payAtEvent && (
              formValid
                ? (clientSecret
                    ? <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                        <StripeSection onPaid={register} totalCents={totalCents} setError={setError} />
                      </Elements>
                    : <Loading label="Preparing secure payment…" />)
                : <p className="text-sm text-zinc-500">Fill in your details above to continue to card payment.</p>
            )}
            {payAtEvent && (
              <Button size="lg" className="w-full" disabled={busy || !formValid}>
                {busy ? 'Reserving…' : `Reserve ${qty} Ticket${qty > 1 ? 's' : ''} — Pay at the Door`}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="rounded-xl bg-field-900/40 border border-field-500/30 p-5 text-sm text-zinc-300 leading-relaxed">
              Online card payment is being connected. Reserve your tickets now and pay at the door
              (cash or card), or email <a href="mailto:info@greenmileboosters.org" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>.
            </div>
            <Button size="lg" className="w-full" disabled={busy || !formValid}>
              {busy ? 'Reserving…' : `Reserve ${qty} Ticket${qty > 1 ? 's' : ''} — ${fmt(totalCents)} at the Door`}
            </Button>
          </>
        )}

        <p className="text-xs text-zinc-600 text-center">
          You'll get an email confirmation with your ticket details. The Green Mile Boosters is a
          registered nonprofit — Tax ID 92-2360865.
        </p>
      </form>
    </Shell>
  )
}

function StripeSection({ onPaid, totalCents, setError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const pay = async e => {
    e.preventDefault()
    if (!stripe || !elements) return
    setError(''); setBusy(true)
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })
      if (error) throw new Error(error.message)
      if (paymentIntent?.status !== 'succeeded') throw new Error('Payment not completed')
      await onPaid(paymentIntent.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button size="lg" className="w-full" disabled={busy || !stripe} onClick={pay}>
        {busy ? 'Processing…' : `Pay ${fmt(totalCents)} Securely`}
      </Button>
      <p className="text-xs text-zinc-500 text-center">Card total includes standard card-processing fees so 100% of your ticket backs the program.</p>
    </div>
  )
}

function Shell({ title, subtitle, children, wide = false }) {
  return (
    <section className="py-16 min-h-[75vh]">
      <div className={`mx-auto px-5 w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-6">
          <Link to="/events/country-nights" className="text-sm text-zinc-400 hover:text-field-400">Back</Link>
        </div>
        <div className="text-center mb-8">
          <Eyebrow className="mb-2">Green Mile Boosters</Eyebrow>
          <h1 className="display text-white text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-zinc-400 text-sm">{subtitle}</p>}
        </div>
        <div className="card p-7 sm:p-8">{children}</div>
      </div>
    </section>
  )
}

function Field({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>
}

function QtyBtn({ children, ...rest }) {
  return (
    <button type="button" {...rest}
      className="w-10 h-10 rounded-lg border border-white/15 text-white text-xl grid place-items-center
                 hover:border-field-400 hover:text-field-300 disabled:opacity-30 disabled:cursor-not-allowed transition">
      {children}
    </button>
  )
}
