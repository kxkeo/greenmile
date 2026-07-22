import { useEffect, useState } from 'react'
import { Hero, SectionHeading, FeatureCard, StatStrip, CTABand, Button, SectionDivider, Eyebrow } from '../components/ui'
import { IMG } from '../content/images'

const PILLARS = [
  { icon: '🪖', title: 'Gear & Equipment', body: 'Helmets, pads, uniforms, and the safety equipment every Emperor needs to take the field with confidence.' },
  { icon: '💚', title: 'Taking Care of Our Kids', body: 'Team meals, scholarships, travel, and the little things — because in Dinuba, these aren\'t just players. They\'re our kids.' },
  { icon: '🏟️', title: 'Friday Night Lights', body: 'Concessions, senior nights, a packed Claud Hebert Field — the nights this whole town circles on the calendar.' },
]

const STATS = [
  { value: '1', label: 'town behind the team' },
  { value: '60+', label: 'of our kids on the field' },
  { value: '10', label: 'friday nights a year' },
  { value: '100%', label: 'community powered' },
]

export default function Home() {
  const [featured, setFeatured] = useState(undefined)

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const active = Array.isArray(list) ? list.find(c => c.status === 'active') : null
        setFeatured(active || null)
      })
      .catch(() => setFeatured(null))
  }, [])

  return (
    <>
      <Hero
        image={IMG.heroStadium}
        eyebrow="Dinuba High School Football"
        title={<>Under The<br /><span className="text-field-400">Lights</span></>}
        subtitle="In Dinuba, Friday night lights are everything. The Green Mile Boosters are the families behind Emperor football — feeding the team, funding the gear, and packing the stands. This is how a small town takes care of its kids."
      >
        <Button to="/volunteer" size="lg">Join the Boosters →</Button>
        <Button to="/donate" variant="outline" size="lg">Donate</Button>
      </Hero>

      {/* Mission strip */}
      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-14 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <Eyebrow className="mb-3">Who we are</Eyebrow>
            <h2 className="display text-white text-3xl sm:text-4xl">
              In Dinuba, football is family.
            </h2>
            <p className="mt-4 text-zinc-400 leading-relaxed max-w-xl">
              We're a rural town in the heart of the Central Valley, and on Friday nights there's
              only one place to be. The Green Mile Boosters are the parents, grandparents, alumni,
              and neighbors behind Dinuba High football — every dollar and every volunteer hour
              goes straight to our kids, not red tape. When this community shows up, the Emperors rise.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button to="/boosters" variant="outline" size="md">Meet the boosters</Button>
              <Button to="/team" variant="ghost" size="md">See the team →</Button>
            </div>
          </div>
          <div>
            <img src={IMG.ballTurf} alt="Game ball on the turf as the Emperors take a knee behind it"
                 className="rounded-2xl border border-white/[0.07] w-full object-cover aspect-[4/3] mb-5" />
            <StatStrip stats={STATS} />
          </div>
        </div>
      </section>

      {/* What your support funds */}
      <section className="section py-20">
        <SectionHeading
          eyebrow="What your support funds"
          title="Built for the Game"
          intro="Every dollar and every hour shows up on the field, on our kids. Here's where it goes."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PILLARS.map(p => (
            <FeatureCard key={p.title} icon={p.icon} title={p.title}>{p.body}</FeatureCard>
          ))}
        </div>
      </section>

      {/* Featured event (data-driven) */}
      <FeaturedEvent featured={featured} />

      {/* Why volunteer band */}
      <CTABand
        eyebrow="Why it matters"
        title="Friday Nights Are Built by Families"
        subtitle="Concessions, chain crew, team meals, senior night — none of it happens without Dinuba families. This is a town that takes care of its own. Give a few hours and be part of it."
      >
        <Button to="/volunteer" size="lg" className="!bg-white !text-field-800 hover:!bg-field-50">Volunteer Today →</Button>
        <Button to="/donate" variant="outline" size="lg" className="!border-white/40 !text-white hover:!bg-white/10">Make a Gift</Button>
      </CTABand>

      {/* Team teaser */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${IMG.sideline})` }} />
        <div className="absolute inset-0 bg-charcoal-900/85" />
        <div className="relative section py-20 text-center">
          <Eyebrow className="mb-3">Go Emperors</Eyebrow>
          <h2 className="display text-white text-4xl sm:text-6xl">Be There Friday Night</h2>
          <p className="mt-4 text-zinc-300 max-w-xl mx-auto">
            There's nothing like a Friday night on the Green Mile — the lights, the band, the whole
            town in green and white. Catch the schedule and come be part of it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button to="/team" size="lg">Team & Schedule</Button>
            <Button to="/events" variant="outline" size="lg">Upcoming Events</Button>
          </div>
        </div>
      </section>
    </>
  )
}

function FeaturedEvent({ featured }) {
  if (!featured) return null
  return (
    <section className="bg-charcoal-850 border-y border-white/[0.06]">
      <div className="section py-16">
        <div className="card overflow-hidden grid md:grid-cols-[1fr_1.2fr]">
          <div className="bg-cover bg-center min-h-[220px]" style={{ backgroundImage: `url(${IMG.crowd})` }} />
          <div className="p-8 sm:p-10">
            <Eyebrow className="mb-3">Featured event</Eyebrow>
            <h3 className="display text-white text-3xl">{featured.title || 'Upcoming Event'}</h3>
            {featured.event_date && (
              <div className="mt-3 inline-block bg-field-500 text-charcoal-900 font-heading uppercase tracking-wide text-sm px-4 py-1.5 rounded-full">
                {featured.event_date}
              </div>
            )}
            {featured.description && <p className="mt-4 text-zinc-400 leading-relaxed">{featured.description}</p>}
            <div className="mt-6">
              <Button
                to={String(featured.meta?.slug || '').startsWith('country-nights') ? '/events/country-nights' : '/events'}
                size="md">
                {featured.price_cents ? 'Get Tickets →' : 'View details →'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
