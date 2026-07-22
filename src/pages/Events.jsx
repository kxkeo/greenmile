import { useEffect, useState } from 'react'
import { Hero, SectionHeading, Button, Eyebrow, Loading } from '../components/ui'
import { IMG } from '../content/images'

// Curated fallback events — football-relevant booster calendar. Shown when the
// campaigns/events API has nothing active yet so the page never looks empty.
const FALLBACK = [
  { icon: '🏈', title: 'Meet the Emperors', when: 'August', body: 'Kick off the season — meet the players and coaches, grab gear, and join the boosters.' },
  { icon: '🌭', title: 'Home Opener Tailgate', when: 'September', body: 'Food, music, and Emperor spirit before the first home game on the Green Mile.' },
  { icon: '⛳', title: 'Booster Golf Scramble', when: 'October', body: 'Our biggest fundraiser of the year. Sponsor a hole, build a team, swing for the program.' },
  { icon: '🎓', title: 'Senior Night', when: 'November', body: 'Honoring our seniors and their families under the lights.' },
  { icon: '🏆', title: 'Football Banquet', when: 'December', body: 'Celebrate the season, the awards, and the Emperors who made it special.' },
  { icon: '🏕️', title: 'Youth Football Camp', when: 'Summer', body: 'The next generation of Emperors learns from the program. Future stars start here.' },
]

export default function Events() {
  const [events, setEvents] = useState(undefined)

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const active = Array.isArray(list) ? list.filter(c => c.status === 'active') : []
        setEvents(active)
      })
      .catch(() => setEvents([]))
  }, [])

  return (
    <>
      <Hero
        image={IMG.fieldNight}
        eyebrow="Booster Calendar"
        title="Events"
        subtitle="From the season kickoff to the year-end banquet — this is where Dinuba comes together. Small town, big Friday nights."
        minH="min-h-[56vh]"
      >
        <Button to="/volunteer" size="lg">Volunteer at an Event</Button>
      </Hero>

      <section className="section py-20">
        {events === undefined ? (
          <Loading label="Loading events…" />
        ) : events.length > 0 ? (
          <>
            <SectionHeading eyebrow="Happening now" title="Register & Attend" />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e, i) => (
                <div key={e.id || i} className="card-hover overflow-hidden">
                  <div className="bg-cover bg-center h-40"
                       style={{ backgroundImage: `url(${e.meta?.kind === 'raffle' ? IMG.ballTurf : e.meta?.slug === 'country-nights' ? IMG.crowd : IMG.action})` }} />
                  <div className="p-6">
                    {e.event_date && <div className="text-field-400 font-heading uppercase tracking-wide text-xs mb-2">{e.event_date}</div>}
                    <h3 className="font-heading uppercase tracking-wide text-lg text-white">{e.title}</h3>
                    {e.description && <p className="mt-2 text-sm text-zinc-400 leading-relaxed line-clamp-3">{e.description}</p>}
                    <div className="mt-5">
                      <Button
                        to={String(e.meta?.slug || '').startsWith('country-nights') ? '/events/country-nights' : `/events/register/${e.id}`}
                        size="sm">
                        {e.price_cents ? 'Get Tickets' : 'Register'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-16">
              <SectionHeading eyebrow="On the calendar" title="Season at a Glance" />
            </div>
          </>
        ) : (
          <SectionHeading eyebrow="On the calendar" title="Season at a Glance" intro="Our annual booster calendar. Specific dates and registration open up as each event approaches." />
        )}

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FALLBACK.map(e => (
            <div key={e.title} className="card-hover p-7">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{e.icon}</span>
                <span className="font-heading uppercase tracking-wider text-xs text-field-400">{e.when}</span>
              </div>
              <h3 className="font-heading uppercase tracking-wide text-lg text-white">{e.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-14 text-center">
          <Eyebrow className="mb-3">Want a heads-up?</Eyebrow>
          <h2 className="display text-white text-3xl">Never Miss a Friday Night</h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">Create an account to register for events and get reminders all season.</p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button to="/my-account/signup" size="lg">Create Account</Button>
            <Button to="/donate" variant="outline" size="lg">Support the Program</Button>
          </div>
        </div>
      </section>
    </>
  )
}
