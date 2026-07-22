import { Hero, SectionHeading, FeatureCard, CTABand, Button, Eyebrow } from '../components/ui'
import { IMG } from '../content/images'

const WHY = [
  { icon: '👀', title: 'Your Kid Sees You Show Up', body: 'Nothing tells a player they matter like watching their family work the gate, flip the burgers, or run the chains.' },
  { icon: '💪', title: 'Stronger Program', body: 'More volunteers means more funds, better gear, and bigger Friday nights. Many hands make a powerhouse.' },
  { icon: '🫶', title: 'Find Your People', body: 'The booster crew becomes family fast. You will leave every game with new friends and a deeper connection to Dinuba.' },
  { icon: '⏱️', title: 'Any Amount of Time Helps', body: 'One shift a season or every single game — there is a spot for you. No minimum, no pressure, all appreciated.' },
]

const ROLES = [
  { icon: '🌭', title: 'Concessions', body: 'Serve up snack-bar favorites. The #1 fundraiser, and the most fun seat in the house.' },
  { icon: '⛓️', title: 'Chain Crew', body: 'Work the sidelines on game night running the down markers. Best view in the stadium.' },
  { icon: '🍝', title: 'Team Meals', body: 'Help prep and serve pre-game meals that fuel the Emperors before they take the field.' },
  { icon: '🎟️', title: 'Gate & Tickets', body: 'Welcome fans, take tickets, and set the tone for a great night on the Green Mile.' },
  { icon: '📣', title: 'Spirit & Events', body: 'Senior night, homecoming, banquets, decorations — make the milestones memorable.' },
  { icon: '💵', title: 'Fundraising', body: 'Sponsorships, raffles, and campaigns. Got connections or ideas? We want them.' },
]

const TIERS = [
  { name: 'Fan', price: '$25', perks: ['Booster membership card', 'Season newsletter', 'That warm Emperor glow'] },
  { name: 'Family', price: '$100', featured: true, perks: ['Everything in Fan', 'Family window decal', 'Name on the booster banner', 'Priority volunteer picks'] },
  { name: 'Champion', price: '$250+', perks: ['Everything in Family', 'Game-day shout-out', 'Booster apparel item', 'Sponsor recognition'] },
]

export default function Volunteer() {
  return (
    <>
      <Hero
        image={IMG.huddle}
        eyebrow="Get Involved"
        title={<>Volunteer.<br /><span className="text-field-400">Join. Belong.</span></>}
        subtitle="Friday nights are built by families. Give a few hours, join the boosters, and become part of something Dinuba has cheered for generations."
        minH="min-h-[68vh]"
      >
        <Button to="/my-account/signup" size="lg">Sign Up to Volunteer →</Button>
        <Button href="#tiers" variant="outline" size="lg">Membership</Button>
      </Hero>

      {/* Why volunteer */}
      <section className="section py-20">
        <SectionHeading eyebrow="Why families join" title="It Pays Off — On the Field and At Home" intro="Booster involvement is one of the simplest, highest-impact things a Dinuba family can do." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(w => <FeatureCard key={w.title} icon={w.icon} title={w.title}>{w.body}</FeatureCard>)}
        </div>
      </section>

      {/* What volunteering funds — quick band */}
      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-14 text-center">
          <Eyebrow className="mb-3">Where your hours go</Eyebrow>
          <p className="display text-white text-2xl sm:text-3xl max-w-3xl mx-auto leading-snug">
            Concession profits buy <span className="text-field-400">helmets</span>. Volunteer hours cover
            <span className="text-field-400"> team meals</span>. Your time becomes
            <span className="text-field-400"> their opportunity</span>.
          </p>
        </div>
      </section>

      {/* Roles */}
      <section className="section py-20">
        <SectionHeading eyebrow="Where you fit" title="Volunteer Roles" intro="Pick what suits you — or try a little of everything. We'll train you, we promise it's fun." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map(r => <FeatureCard key={r.title} icon={r.icon} title={r.title}>{r.body}</FeatureCard>)}
        </div>
      </section>

      {/* Membership tiers */}
      <section id="tiers" className="bg-charcoal-850 border-y border-white/[0.06] scroll-mt-20">
        <div className="section py-20">
          <SectionHeading eyebrow="Join the boosters" title="Membership Tiers" intro="Not able to volunteer in person? Membership keeps the program strong all season long." />
          <div className="mt-12 grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {TIERS.map(t => (
              <div key={t.name} className={`relative rounded-2xl p-7 ${t.featured ? 'bg-gradient-to-b from-field-700 to-field-900 border border-field-500/50 shadow-glow' : 'card'}`}>
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-field-400 text-charcoal-900 font-heading uppercase tracking-wider text-[0.65rem] px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="font-heading uppercase tracking-wider text-sm text-zinc-300">{t.name}</div>
                <div className="display text-5xl text-white mt-2">{t.price}</div>
                <div className="text-xs text-zinc-400 mb-5">per season</div>
                <ul className="space-y-2.5 text-sm">
                  {t.perks.map(p => (
                    <li key={p} className="flex gap-2 text-zinc-200">
                      <span className="text-field-400">✓</span><span>{p}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <Button to="/donate" variant={t.featured ? 'outline' : 'primary'} size="md"
                    className={`w-full ${t.featured ? '!border-white/40 !text-white hover:!bg-white/10' : ''}`}>
                    Choose {t.name}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand
        eyebrow="One sign-up away"
        title="Let's Build Something Great"
        subtitle="Create your free account to sign up for volunteer shifts, manage your membership, and stay in the loop all season."
      >
        <Button to="/my-account/signup" size="lg" className="!bg-white !text-field-800 hover:!bg-field-50">Create My Account →</Button>
        <Button href="mailto:info@greenmileboosters.org" variant="outline" size="lg" className="!border-white/40 !text-white hover:!bg-white/10">Email the Boosters</Button>
      </CTABand>
    </>
  )
}
