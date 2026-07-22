import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, Loading } from '../components/ui'
import { IMG } from '../content/images'

// "Season at a Glance" cards come from /api/season-calendar (admin-managed in
// the admin Events section). There's no fake fallback — if it's empty, the
// section is simply hidden.

export default function Events() {
  const [events, setEvents] = useState(undefined)
  const [calendar, setCalendar] = useState([])

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const active = Array.isArray(list) ? list.filter(c => c.status === 'active') : []
        setEvents(active)
      })
      .catch(() => setEvents([]))

    fetch('/api/season-calendar')
      .then(r => r.ok ? r.json() : null)
      .then(list => { if (Array.isArray(list)) setCalendar(list) })
      .catch(() => {})
  }, [])

  return (
    <>
      <Hero
        image={IMG.practice}
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
        ) : (
          <>
            {events.length > 0 && (
              <>
                <SectionHeading eyebrow="Happening now" title="Register & Attend" />
                <div className={`mt-12 grid gap-5 ${
                  events.length === 1 ? 'max-w-md mx-auto'
                  : events.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {events.map((e, i) => {
                    const infoTo = String(e.meta?.slug || '').startsWith('country-nights')
                      ? '/events/country-nights' : `/events/${e.id}`
                    return (
                      <Link key={e.id || i} to={infoTo} className="card-hover overflow-hidden block group">
                        <div className="bg-cover bg-center h-40 transition-transform duration-300 group-hover:scale-[1.03]"
                             style={{ backgroundImage: `url(${e.meta?.kind === 'raffle' ? IMG.ballTurf : e.meta?.slug === 'country-nights' ? IMG.crowd : IMG.nightRun})` }} />
                        <div className="p-6">
                          {e.event_date && <div className="text-field-400 font-heading uppercase tracking-wide text-xs mb-2">{e.event_date}</div>}
                          <h3 className="font-heading uppercase tracking-wide text-lg text-white">{e.title}</h3>
                          {e.description && <p className="mt-2 text-sm text-zinc-400 leading-relaxed line-clamp-3">{e.description}</p>}
                          <div className="mt-5">
                            <span className="btn btn-primary btn-sm">{e.price_cents ? 'Get Tickets' : 'Register'}</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}

            {/* Season at a Glance — only shown when the admin has added cards. */}
            {calendar.length > 0 && (
              <div className={events.length > 0 ? 'mt-16' : ''}>
                <SectionHeading eyebrow="On the calendar" title="Season at a Glance" />
                <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {calendar.map((e, i) => (
                    <div key={e.title || i} className="card-hover p-7">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{e.icon}</span>
                        <span className="font-heading uppercase tracking-wider text-xs text-field-400">{e.when}</span>
                      </div>
                      <h3 className="font-heading uppercase tracking-wide text-lg text-white">{e.title}</h3>
                      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{e.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {events.length === 0 && calendar.length === 0 && (
              <SectionHeading eyebrow="Booster calendar" title="More Coming Soon"
                intro="We're lining up the season. Check back soon for upcoming Emperor events and registration." />
            )}
          </>
        )}
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
