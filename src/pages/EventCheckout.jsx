import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { Button, Eyebrow, Loading } from '../components/ui'
import StripeCheckout, { STRIPE_READY, fmtUSD as fmt, FeeBreakdown, grossUpForStripe } from '../components/StripeCheckout'

// Generic paid-event checkout: /events/register/:id
// Works for any active campaign (Country Nights dinner, raffle, alumni, …).
// Requires a participant account — the registration + receipt APIs are tied to
// one. Card payment only (no pay-at-the-door).
//
// When the event has a matching raffle on the same date, the raffle is offered
// as an add-on so one card charge covers both; the server re-prices everything
// from the database and records a registration row per campaign.
//
// Two steps on purpose. The PaymentIntent is created once, when the buyer taps
// Continue to Payment — never on a render or a keystroke. Backing up to change
// the ticket count updates that same intent instead of making another, so one
// purchase leaves exactly one intent in Stripe. (Creating one per keystroke
// tripped Stripe Radar's card-velocity rule and declined real buyers.)

export default function EventCheckout() {
  const { id } = useParams()
  const location = useLocation()
  const [campaign, setCampaign] = useState(undefined)
  const [addonCampaign, setAddonCampaign] = useState(null)
  const [me, setMe] = useState(undefined) // undefined = loading, null = not signed in

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const all = Array.isArray(list) ? list : []
        const c = all.find(x => String(x.id) === String(id)) || null
        setCampaign(c)
        // Offer the raffle as an add-on when this isn't itself the raffle.
        if (c && c.meta?.kind !== 'raffle') {
          setAddonCampaign(
            all.find(x => x.meta?.kind === 'raffle' && x.event_date === c.event_date && x.id !== c.id) || null
          )
        } else {
          setAddonCampaign(null)
        }
      })
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

  return <CheckoutForm campaign={campaign} addonCampaign={addonCampaign} me={me} />
}

// Remaining tickets for a capped campaign (e.g. the 200-ticket raffle).
const remainingFor = c => {
  const max = c?.meta?.max_tickets || 0
  return max ? Math.max(0, max - (c.tickets_sold || 0)) : null
}

function CheckoutForm({ campaign, addonCampaign, me }) {
  const isRaffle = campaign.meta?.kind === 'raffle'
  const maxTickets = campaign.meta?.max_tickets || 0
  const remaining = remainingFor(campaign)
  const maxQty = remaining != null ? Math.min(10, remaining) : 10

  // Add-on (raffle) availability
  const addonRemaining = remainingFor(addonCampaign)
  const addonAvailable = !!addonCampaign && (addonRemaining == null || addonRemaining > 0)
  const addonMaxQty = addonRemaining != null ? Math.min(10, addonRemaining) : 10

  const [qty, setQty] = useState(1)
  const [addonQty, setAddonQty] = useState(0)
  const [form, setForm] = useState({
    firstName: me.firstName || '', lastName: me.lastName || '',
    email: me.email || '', phone: me.phone || '',
    address: '', city: '', state: 'CA', zip: '',
    emailOptIn: true,
  })
  const [step, setStep] = useState('details')   // details | pay
  const [clientSecret, setClientSecret] = useState(null)
  const [prepping, setPrepping] = useState(false)
  const [payError, setPayError] = useState('')
  const [done, setDone] = useState(false)

  const mainCents  = (campaign.price_cents || 0) * qty
  const addonCents = addonAvailable ? (addonCampaign.price_cents || 0) * addonQty : 0
  const totalCents = mainCents + addonCents

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const formValid = form.firstName.trim() && form.lastName.trim() && form.address.trim()
    && form.city.trim() && form.state.trim() && form.zip.trim()

  const addonId = addonAvailable && addonQty > 0 ? addonCampaign.id : null

  // One intent per purchase. Created on Continue, reused (server-side update)
  // if they come back and change quantities.
  const goToPayment = async () => {
    if (!STRIPE_READY || !formValid || totalCents <= 0) return
    setPayError(''); setPrepping(true)
    try {
      const res = await fetch('/api/events/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          campaignId: campaign.id,
          amount_cents: totalCents,
          ticketQty: qty,
          addonCampaignId: addonId,
          addonQty: addonId ? addonQty : 0,
          clientSecret,   // reuse this intent if they came back to edit
        }),
      })
      const d = await res.json()
      if (!res.ok || !d.clientSecret) throw new Error(d.error || 'Could not start payment. Please try again.')
      setClientSecret(d.clientSecret)
      setStep('pay')
    } catch (err) {
      setPayError(err.message)
    } finally {
      setPrepping(false)
    }
  }

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
        addonCampaignId: addonId,
        addonQty: addonId ? addonQty : 0,
        paymentIntentId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    setDone(true)
  }

  if (done) {
    return (
      <Shell title="You're In! 🤠" subtitle={`${qty} ${isRaffle ? 'raffle ' : ''}ticket${qty > 1 ? 's' : ''} for ${campaign.title}.`}>
        <div className="text-center">
          <div className="display text-field-400 text-4xl mb-4">{fmt(totalCents)}</div>
          {addonId > 0 && (
            <p className="text-sm text-field-300 mb-2">
              Plus {addonQty} {addonCampaign.title} ticket{addonQty > 1 ? 's' : ''} — good luck!
            </p>
          )}
          <p className="text-sm text-zinc-400 mb-2">
            {form.email
              ? <>A receipt is on its way to <span className="text-zinc-200">{form.email}</span>.</>
              : 'Your registration is recorded.'}
          </p>
          {(isRaffle || addonId) && <p className="text-sm text-zinc-400">Drawing on September 26, 2026. Need not be present to win.</p>}
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
      <div className="space-y-5">
        {!STRIPE_READY && (
          <div className="rounded-xl bg-field-900/40 border border-field-500/30 p-5 text-sm text-zinc-300 leading-relaxed">
            Online card payment is being connected. To buy tickets right now, email{' '}
            <a href="mailto:info@greenmileboosters.org" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>{' '}
            and we'll take care of you.
          </div>
        )}

        {step === 'details' ? (<>
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

        {/* Raffle add-on */}
        {addonAvailable && (
          <div className="rounded-xl bg-charcoal-900 border border-field-500/30 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-heading uppercase tracking-wide text-sm text-field-300">
                  Add {addonCampaign.title}
                </div>
                <p className="mt-1 text-xs text-zinc-400 max-w-sm leading-relaxed">
                  {fmt(addonCampaign.price_cents)} each · Grand Prize $5,000. Need not be present to win.
                  {addonRemaining != null && ` ${addonRemaining} left.`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <QtyBtn onClick={() => setAddonQty(q => Math.max(0, q - 1))} disabled={addonQty <= 0}>−</QtyBtn>
                <span className="display text-white text-2xl w-8 text-center">{addonQty}</span>
                <QtyBtn onClick={() => setAddonQty(q => Math.min(addonMaxQty, q + 1))} disabled={addonQty >= addonMaxQty}>+</QtyBtn>
              </div>
            </div>
            {addonQty > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.07] flex items-center justify-between text-sm">
                <span className="text-zinc-400">{qty} × {campaign.title} + {addonQty} × raffle</span>
                <span className="text-zinc-200">{fmt(mainCents)} + {fmt(addonCents)}</span>
              </div>
            )}
          </div>
        )}

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

        <label className="flex items-start gap-3 rounded-xl bg-charcoal-900 border border-white/[0.07] px-4 py-3 cursor-pointer">
          <input type="checkbox" checked={form.emailOptIn}
            onChange={e => setForm(f => ({ ...f, emailOptIn: e.target.checked }))}
            className="accent-field-500 w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-sm text-zinc-300">Keep me in the loop — email me about future Green Mile Boosters events and promotions.</span>
        </label>

        {/* Step 1 → 2. No payment intent exists until this is tapped. */}
        {STRIPE_READY && (<>
          <FeeBreakdown baseCents={totalCents} label={addonQty > 0 ? 'Tickets + raffle' : `${qty} Ticket${qty > 1 ? 's' : ''}`} />
          {payError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{payError}</div>
          )}
          <Button size="lg" className="w-full" onClick={goToPayment} disabled={!formValid || prepping || totalCents <= 0}>
            {prepping ? 'Preparing secure payment…' : `Continue to Payment · ${fmt(grossUpForStripe(totalCents))}`}
          </Button>
          {!formValid && <p className="text-sm text-zinc-500 text-center">Fill in your details above to continue to card payment.</p>}
        </>)}
        </>) : (<>
          {/* Step 2: pay. Quantities are locked here so the amount on the card
              can't drift from the intent that was created. */}
          <div className="rounded-xl bg-charcoal-900 border border-white/[0.07] px-5 py-4 text-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span>{qty} × {campaign.title}</span><span className="text-zinc-200">{fmt(mainCents)}</span>
            </div>
            {addonQty > 0 && (
              <div className="flex items-center justify-between text-zinc-400 mt-2">
                <span>{addonQty} × {addonCampaign.title}</span><span className="text-zinc-200">{fmt(addonCents)}</span>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-white/[0.07] text-xs text-zinc-500">
              {form.firstName} {form.lastName} · {form.email || 'no email'}
            </div>
          </div>

          <FeeBreakdown baseCents={totalCents} label={addonQty > 0 ? 'Tickets + raffle' : `${qty} Ticket${qty > 1 ? 's' : ''}`} />

          {clientSecret
            ? <StripeCheckout
                clientSecret={clientSecret}
                amountCents={grossUpForStripe(totalCents)}
                onPaid={register}
                buttonLabel={`Pay ${fmt(grossUpForStripe(totalCents))}`}
              />
            : <Loading label="Preparing secure payment…" />}

          <button type="button" onClick={() => setStep('details')}
            className="w-full text-sm text-zinc-400 hover:text-field-400 py-1">
            Back to edit tickets or details
          </button>
        </>)}

        <p className="text-xs text-zinc-600 text-center">
          You'll get an email confirmation with your ticket details. The Green Mile Boosters is a
          registered nonprofit — Tax ID 92-2360865.
        </p>
      </div>
    </Shell>
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
      className="w-11 h-11 rounded-none border-2 border-white/20 text-white text-xl grid place-items-center
                 hover:border-field-400 hover:text-field-300 disabled:opacity-30 disabled:cursor-not-allowed transition">
      {children}
    </button>
  )
}
