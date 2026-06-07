import { Hero, SectionHeading, FeatureCard, StatStrip, CTABand, Button, Eyebrow } from '../components/ui'
import { IMG } from '../content/images'

const VALUES = [
  { icon: '🤝', title: 'Family First', body: 'We are parents, alumni, and neighbors who believe Dinuba kids deserve the best. Everyone is welcome — no experience required.' },
  { icon: '💯', title: 'Straight to the Players', body: 'Booster funds skip the bureaucracy and go directly to gear, meals, travel, and the experiences that build a program.' },
  { icon: '🌿', title: 'Tradition & Pride', body: 'The Green Mile is more than a field — it is decades of Emperor pride. We keep that tradition alive for the next generation.' },
]

const BOARD = [
  { name: 'Booster President', role: 'President', initials: 'GP' },
  { name: 'Vice President', role: 'Vice President', initials: 'VP' },
  { name: 'Treasurer', role: 'Treasurer', initials: 'TR' },
  { name: 'Secretary', role: 'Secretary', initials: 'SC' },
  { name: 'Concessions Lead', role: 'Concessions', initials: 'CL' },
  { name: 'Fundraising Lead', role: 'Fundraising', initials: 'FL' },
]

const STATS = [
  { value: '1', label: 'mission: the players' },
  { value: '6', label: 'board volunteers' },
  { value: '52', label: 'weeks of work' },
  { value: '∞', label: 'emperor pride' },
]

export default function Boosters() {
  return (
    <>
      <Hero
        image={IMG.crowd}
        eyebrow="The Green Mile Boosters"
        title="Behind Every Emperor"
        subtitle="A volunteer-run booster club pouring time, energy, and resources into Dinuba High School football."
        minH="min-h-[60vh]"
      >
        <Button to="/volunteer" size="lg">Join Us →</Button>
        <Button to="/donate" variant="outline" size="lg">Support the Program</Button>
      </Hero>

      <section className="section py-20 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <div>
          <Eyebrow className="mb-3">Our mission</Eyebrow>
          <h2 className="display text-white text-4xl">Fund the dream. Fuel the team.</h2>
          <div className="mt-5 space-y-4 text-zinc-400 leading-relaxed">
            <p>
              The Green Mile Boosters exist to give Dinuba's student-athletes every advantage —
              quality equipment, safe travel, good food, and a community that shows up. We believe
              a strong football program builds disciplined, confident young people who carry those
              lessons far beyond the field.
            </p>
            <p>
              We are entirely volunteer-run. There are no paid staff and no overhead empire — just
              families rolling up their sleeves so the coaches can coach and the players can play.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button to="/donate" size="md">Make a Gift</Button>
            <Button to="/events" variant="ghost" size="md">Our events →</Button>
          </div>
        </div>
        <StatStrip stats={STATS} />
      </section>

      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-20">
          <SectionHeading eyebrow="What we stand for" title="Our Values" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {VALUES.map(v => <FeatureCard key={v.title} icon={v.icon} title={v.title}>{v.body}</FeatureCard>)}
          </div>
        </div>
      </section>

      <section className="section py-20">
        <SectionHeading eyebrow="Volunteer leadership" title="The Board" intro="The crew keeping the Green Mile running. Want to get involved at any level? We'd love to meet you." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BOARD.map(m => (
            <div key={m.role} className="card p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-field-500 to-field-800 grid place-items-center font-display text-xl text-charcoal-900 shrink-0">
                {m.initials}
              </div>
              <div>
                <div className="font-heading uppercase tracking-wide text-white">{m.name}</div>
                <div className="text-sm text-field-400">{m.role}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-zinc-500">
          Board roster is a placeholder — send Kevin the real names/photos to drop in.
        </p>
      </section>

      <CTABand
        title="Ready to Back the Emperors?"
        subtitle="Membership is open to every family. Bring your time, your skills, or just your green-and-white spirit."
      >
        <Button to="/volunteer" size="lg" className="!bg-white !text-field-800 hover:!bg-field-50">Become a Member →</Button>
      </CTABand>
    </>
  )
}
