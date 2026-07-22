import { Hero, SectionHeading, Button, Eyebrow } from '../components/ui'
import { IMG } from '../content/images'

// 2026 Dinuba Emperors football schedule (from @dinuba_football).
// home: true = home game (green), false = away (white), null = bye week.
const SCHEDULE = [
  { opponent: 'Redwood',          date: 'Aug 21', home: false },
  { opponent: 'Reedley',          date: 'Aug 28', home: false },
  { opponent: 'Sunnyside',        date: 'Sep 4',  home: true },
  { opponent: 'Golden West',      date: 'Sep 11', home: false },
  { opponent: 'Porterville',      date: 'Sep 18', home: true },
  { opponent: 'Bye Week',         date: 'Sep 25', home: null },
  { opponent: 'Exeter',           date: 'Oct 2',  home: true },
  { opponent: 'Immanuel',         date: 'Oct 9',  home: false },
  { opponent: 'Kerman',           date: 'Oct 16', home: false },
  { opponent: 'Washington Union', date: 'Oct 23', home: true },
  { opponent: 'Kingsburg',        date: 'Oct 30', home: true },
]

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
  return (
    <>
      <Hero
        image={IMG.lineDay}
        eyebrow="Dinuba Emperors Football"
        title="The Team"
        subtitle="Three levels, one program, one Green Mile. These are Dinuba's kids — meet the staff and follow the season."
        minH="min-h-[58vh]"
      >
        <Button to="/events" size="lg">Upcoming Events</Button>
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
        <SectionHeading eyebrow="Mark your calendar" title="2026 Football Schedule" intro="Green means a home game on the Green Mile. White means we're on the road. Kickoffs are Fridays." />
        <div className="mt-10 max-w-3xl mx-auto space-y-3">
          {SCHEDULE.map((g) => (
            <div
              key={g.date}
              className={`card p-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 ${
                g.home === true ? 'border-l-4 border-l-field-500' : g.home === false ? 'border-l-4 border-l-white/60' : 'opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                {g.home !== null && (
                  <span className={`font-heading uppercase tracking-wider text-[0.65rem] px-2 py-0.5 rounded ${
                    g.home ? 'bg-field-500 text-white' : 'bg-white text-charcoal-900'
                  }`}>
                    {g.home ? 'Home' : 'Away'}
                  </span>
                )}
                <span className="font-heading uppercase tracking-wide text-white">
                  {g.home === null ? g.opponent : `${g.home ? 'vs' : 'at'} ${g.opponent}`}
                </span>
              </div>
              <div className="font-heading uppercase tracking-wide text-sm text-field-400 whitespace-nowrap">{g.date}</div>
            </div>
          ))}
          <div className="pt-5 text-center">
            <Button to="/events" variant="outline" size="md">See All Events</Button>
          </div>
        </div>
      </section>
    </>
  )
}
