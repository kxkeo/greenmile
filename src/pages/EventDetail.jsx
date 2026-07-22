import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, Loading } from '../components/ui'
import { IMG } from '../content/images'
import { fmtUSD } from '../components/StripeCheckout'

// Generic info page for any single event/campaign: /events/:id
// Country Nights keeps its own richer page; everything else lands here.

function imageFor(c) {
  if (c.meta?.kind === 'raffle') return IMG.ballTurf
  if (String(c.meta?.slug || '').startsWith('country-nights')) return IMG.crowd
  return IMG.action
}

function formatDate(d) {
  if (!d) return null
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return d }
}

export default function EventDetail() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(undefined)

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(list => setCampaign((Array.isArray(list) ? list : []).find(c => String(c.id) === String(id)) || null))
      .catch(() => setCampaign(null))
  }, [id])

  if (campaign === undefined) return <Loading label="Loading event…" />

  // Country Nights (and its raffle) have a dedicated, richer landing page.
  if (campaign && String(campaign.meta?.slug || '').startsWith('country-nights')) {
    return <Navigate to="/events/country-nights" replace />
  }

  if (campaign === null) {
    return (
      <section className="section py-24 min-h-[70vh] text-center">
        <div className="text-4xl mb-3">📅</div>
        <h1 className="display text-white text-4xl">Event Not Found</h1>
        <p className="mt-3 text-zinc-400">This event may have wrapped up or isn't open yet.</p>
        <div className="mt-8"><Button to="/events" size="lg">See All Events</Button></div>
      </section>
    )
  }

  const dateLabel = formatDate(campaign.event_date)
  const isRaffle = campaign.meta?.kind === 'raffle'
  const maxTickets = campaign.meta?.max_tickets || 0
  const remaining = maxTickets ? Math.max(0, maxTickets - (campaign.tickets_sold || 0)) : null
  const soldOut = remaining === 0
  const prizes = Array.isArray(campaign.meta?.prizes) ? campaign.meta.prizes : []

  const facts = [
    dateLabel && { icon: '📅', label: 'Date', value: dateLabel },
    campaign.event_time && { icon: '🕔', label: 'Time', value: campaign.event_time },
    campaign.location && { icon: '📍', label: 'Where', value: campaign.location },
    campaign.price_cents ? { icon: '🎟️', label: isRaffle ? 'Per raffle ticket' : 'Per ticket', value: fmtUSD(campaign.price_cents) } : null,
  ].filter(Boolean)

  return (
    <>
      <Hero
        image={imageFor(campaign)}
        eyebrow="Green Mile Boosters Event"
        title={campaign.title}
        subtitle={dateLabel ? `${dateLabel}${campaign.location ? ` · ${campaign.location}` : ''}` : campaign.location || undefined}
        minH="min-h-[56vh]"
      >
        {campaign.price_cents
          ? (soldOut
              ? <Button variant="outline" size="lg" className="pointer-events-none opacity-70">Sold Out</Button>
              : <Button to={`/events/register/${campaign.id}`} size="lg">{isRaffle ? 'Buy Raffle Tickets' : 'Get Tickets'}</Button>)
          : <Button to={`/events/register/${campaign.id}`} size="lg">Register</Button>}
      </Hero>

      <section className="section py-16 max-w-4xl">
        {/* Fact strip */}
        <div className="grid gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06] sm:grid-cols-2 lg:grid-cols-4 shadow-card">
          {facts.map(f => (
            <div key={f.label} className="bg-charcoal-850 px-5 py-6">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-heading uppercase tracking-wider text-[0.7rem] text-zinc-500">{f.label}</div>
              <div className="text-white text-sm mt-0.5 leading-snug">{f.value}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {campaign.description && (
          <div className="mt-10 max-w-2xl">
            <SectionHeading center={false} eyebrow="About this event" title="What to Know" />
            <p className="mt-4 text-zinc-300 leading-relaxed whitespace-pre-line">{campaign.description}</p>
          </div>
        )}

        {/* Raffle prizes */}
        {prizes.length > 0 && (
          <div className="mt-10">
            <SectionHeading center={false} eyebrow="Prizes" title="What You Could Win" />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {prizes.map((p, i) => (
                <div key={p.label} className="card p-6 text-center">
                  <div className="text-3xl mb-2">{['🏆', '🥈', '🥉'][i] || '🎉'}</div>
                  <div className="font-heading uppercase tracking-wide text-white text-sm">{p.label}</div>
                  <div className="display text-field-400 text-3xl mt-1">{fmtUSD(p.amount)}</div>
                </div>
              ))}
            </div>
            {campaign.meta?.need_not_be_present && (
              <p className="mt-4 text-sm text-zinc-500">Need not be present to win.</p>
            )}
          </div>
        )}

        {/* Availability + CTA */}
        <div className="mt-12 card p-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="font-heading uppercase tracking-wide text-white text-lg">
              {campaign.price_cents ? (isRaffle ? 'Get your raffle tickets' : 'Reserve your spot') : 'Register now'}
            </div>
            {remaining != null && (
              <div className="text-sm text-zinc-400 mt-1">
                {soldOut ? 'All tickets have been claimed.' : `${remaining} of ${maxTickets} tickets remaining`}
              </div>
            )}
          </div>
          {soldOut
            ? <span className="btn btn-outline btn-lg pointer-events-none opacity-70">Sold Out</span>
            : <Button to={`/events/register/${campaign.id}`} size="lg">
                {campaign.price_cents ? (isRaffle ? 'Buy Raffle Tickets' : 'Get Tickets') : 'Register'}
              </Button>}
        </div>
      </section>
    </>
  )
}
