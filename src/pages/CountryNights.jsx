import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, Loading } from '../components/ui'
import { IMG } from '../content/images'

// Country Nights — the boosters' flagship fundraiser dinner + raffle.
// Campaign data (price, date, availability) comes from /api/campaigns via the
// slugs seeded in migrations/030_country_nights.sql.

const DETAILS = [
  { icon: '🍖', title: 'Tri-Tip Dinner', body: 'A full tri-tip dinner served at 6:00 PM — come hungry.' },
  { icon: '🤠', title: 'Silent & Live Auction', body: 'Bid on donated packages from local businesses and booster families.' },
  { icon: '🎶', title: 'Country Night Out', body: 'Boots, hats, and Emperor pride — a proper country evening for a great cause.' },
]

export default function CountryNights() {
  const [campaigns, setCampaigns] = useState(undefined)

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(list => setCampaigns(Array.isArray(list) ? list : []))
      .catch(() => setCampaigns([]))
  }, [])

  const ticket = campaigns?.find(c => c.meta?.slug === 'country-nights')
  const raffle = campaigns?.find(c => c.meta?.slug === 'country-nights-raffle')
  const raffleLeft = raffle?.meta?.max_tickets
    ? Math.max(0, raffle.meta.max_tickets - (raffle.tickets_sold || 0))
    : null

  return (
    <>
      <Hero
        image={IMG.crowd}
        eyebrow="Green Mile Boosters Fundraiser"
        title={<>Country<br /><span className="text-field-400">Nights</span></>}
        subtitle="Saturday, September 26, 2026 · 40481 Road 80, Dinuba · Doors 5:30 PM, dinner 6:00. Tri-tip, auctions, and the biggest booster night of the year."
        minH="min-h-[62vh]"
      >
        {ticket && <Button to={`/events/register/${ticket.id}`} size="lg">Buy Tickets — $50 →</Button>}
        {raffle && <Button to={`/events/register/${raffle.id}`} variant="outline" size="lg">Raffle Tickets — $100</Button>}
      </Hero>

      <section className="section py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {DETAILS.map(d => (
            <div key={d.title} className="card p-7">
              <div className="text-3xl mb-4">{d.icon}</div>
              <h3 className="font-heading uppercase tracking-wide text-lg text-white">{d.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-16">
          <SectionHeading eyebrow="Get your tickets" title="Two Ways In" />
          {campaigns === undefined ? (
            <Loading label="Loading tickets…" />
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {/* Admission */}
              <div className="card p-8 flex flex-col">
                <Eyebrow className="mb-2">Admission</Eyebrow>
                <div className="flex items-baseline gap-2">
                  <span className="display text-white text-5xl">$50</span>
                  <span className="text-zinc-400 text-sm">per person · admit one</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-zinc-200 flex-1">
                  <li className="flex gap-2"><span className="text-field-400">✓</span>Tri-tip dinner (served 6:00 PM)</li>
                  <li className="flex gap-2"><span className="text-field-400">✓</span>Silent & live auction access</li>
                  <li className="flex gap-2"><span className="text-field-400">✓</span>Doors open 5:30 PM</li>
                </ul>
                <div className="mt-7">
                  {ticket
                    ? <Button to={`/events/register/${ticket.id}`} size="md" className="w-full">Buy Event Tickets →</Button>
                    : <p className="text-sm text-zinc-500">Ticket sales open soon.</p>}
                </div>
              </div>

              {/* Raffle */}
              <div className="relative rounded-2xl p-8 flex flex-col bg-gradient-to-b from-field-700 to-field-900 border border-field-500/50 shadow-glow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-field-400 text-charcoal-900 font-heading uppercase tracking-wider text-[0.65rem] px-3 py-1 rounded-full whitespace-nowrap">
                  Only 200 tickets sold
                </div>
                <Eyebrow className="mb-2 !text-field-100">Cash Raffle</Eyebrow>
                <div className="flex items-baseline gap-2">
                  <span className="display text-white text-5xl">$100</span>
                  <span className="text-field-50/80 text-sm">per ticket</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-field-50 flex-1">
                  <li className="flex gap-2"><span>🏆</span>Grand Prize: <strong>$5,000</strong></li>
                  <li className="flex gap-2"><span>🥈</span>2nd Prize: <strong>$600</strong></li>
                  <li className="flex gap-2"><span>🥉</span>3rd Prize: <strong>$400</strong></li>
                  <li className="flex gap-2"><span>📅</span>Drawing September 26, 2026 — need not be present to win</li>
                </ul>
                {raffleLeft != null && (
                  <div className="mt-4 text-xs font-heading uppercase tracking-wider text-field-100">
                    {raffleLeft > 0 ? `${raffleLeft} of ${raffle.meta.max_tickets} tickets left` : 'Sold out'}
                  </div>
                )}
                <div className="mt-5">
                  {raffle && raffleLeft !== 0
                    ? <Button to={`/events/register/${raffle.id}`} variant="outline" size="md"
                        className="w-full !border-white/40 !text-white hover:!bg-white/10">Buy Raffle Tickets →</Button>
                    : <p className="text-sm text-field-100/80">{raffleLeft === 0 ? 'All 200 raffle tickets are gone!' : 'Raffle sales open soon.'}</p>}
                </div>
              </div>
            </div>
          )}
          <p className="mt-8 text-center text-sm text-zinc-500">
            Questions or want to donate an auction item? Email{' '}
            <a href="mailto:info@greenmileboosters.org" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>
          </p>
        </div>
      </section>
    </>
  )
}
