import { useEffect, useState } from 'react'
import { Hero, SectionHeading, Button, Eyebrow, EmptyState, Loading } from '../components/ui'
import { IMG } from '../content/images'

const COACHES = [
  { name: 'Head Coach', role: 'Head Coach', initials: 'HC' },
  { name: 'Offensive Coordinator', role: 'Offense', initials: 'OC' },
  { name: 'Defensive Coordinator', role: 'Defense', initials: 'DC' },
  { name: 'Strength & Conditioning', role: 'S&C', initials: 'SC' },
]

const HIGHLIGHTS = [
  { stat: 'Varsity', label: 'Friday night lights' },
  { stat: 'JV', label: 'Building the future' },
  { stat: 'Frosh', label: 'Where it starts' },
]

export default function Team() {
  const [schedule, setSchedule] = useState(undefined)

  useEffect(() => {
    // Reuse DHRC events API as a schedule source; gracefully empty otherwise.
    fetch('/api/events')
      .then(r => r.ok ? r.json() : [])
      .then(list => setSchedule(Array.isArray(list) ? list : []))
      .catch(() => setSchedule([]))
  }, [])

  return (
    <>
      <Hero
        image={IMG.action}
        eyebrow="Dinuba Emperors Football"
        title="The Team"
        subtitle="Three levels, one program, one Green Mile. These are Dinuba's kids — meet the staff and follow the season."
        minH="min-h-[58vh]"
      >
        <Button to="/events" size="lg">Upcoming Events →</Button>
      </Hero>

      {/* Program levels */}
      <section className="section py-16">
        <div className="grid sm:grid-cols-3 gap-5">
          {HIGHLIGHTS.map(h => (
            <div key={h.stat} className="card p-8 text-center">
              <div className="display text-field-400 text-4xl">{h.stat}</div>
              <div className="mt-2 font-heading uppercase tracking-wider text-sm text-zinc-400">{h.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Coaching staff */}
      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-20">
          <SectionHeading eyebrow="Sidelines" title="Coaching Staff" intro="The leaders developing our kids on the field and in life. Real names & bios coming soon." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COACHES.map(c => (
              <div key={c.role} className="card-hover p-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-field-500 to-field-900 grid place-items-center font-display text-2xl text-charcoal-900">
                  {c.initials}
                </div>
                <div className="mt-4 font-heading uppercase tracking-wide text-white">{c.name}</div>
                <div className="text-sm text-field-400">{c.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section className="section py-20">
        <SectionHeading eyebrow="Mark your calendar" title="Season & Events" />
        <div className="mt-10 max-w-3xl mx-auto">
          {schedule === undefined ? (
            <Loading label="Loading schedule…" />
          ) : schedule.length === 0 ? (
            <EmptyState icon="📅" title="Schedule coming soon">
              The {new Date().getFullYear()} slate drops here. In the meantime, check our events.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {schedule.map((e, i) => (
                <div key={e.id || i} className="card p-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div>
                    <div className="font-heading uppercase tracking-wide text-white">{e.title || e.name || 'Event'}</div>
                    {e.location && <div className="text-sm text-zinc-500">{e.location}</div>}
                  </div>
                  {(e.event_date || e.date) && (
                    <div className="font-heading uppercase tracking-wide text-sm text-field-400 whitespace-nowrap">
                      {e.event_date || e.date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Button to="/events" variant="outline" size="md">See all events →</Button>
          </div>
        </div>
      </section>
    </>
  )
}
