import { Hero, SectionHeading, FeatureCard, CTABand, Button, Eyebrow } from '../components/ui'
import { IMG } from '../content/images'

const WHY = [
  { icon: '👀', title: 'Your Kid Sees You Show Up', body: 'Nothing tells a player they matter like watching their family work the gate, flip the burgers, or run the chains.' },
  { icon: '💪', title: 'Stronger Program', body: 'More volunteers means more funds, better gear, and bigger Friday nights. Many hands make a powerhouse.' },
  { icon: '🫶', title: 'Find Your People', body: 'This is a tight community, and the booster crew becomes family fast. You will leave every game with new friends and deeper Dinuba roots.' },
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

export default function Volunteer() {
  return (
    <>
      <Hero
        image={IMG.takeField}
        eyebrow="Get Involved"
        title={<>Volunteer.<br /><span className="text-field-400">Join. Belong.</span></>}
        subtitle="In Dinuba, Friday nights are built by families — and we take care of our own. Give a few hours, join the boosters, and be part of something this town has cheered for generations."
        minH="min-h-[68vh]"
      >
        <Button to="/my-account/signup" size="lg">Sign Up to Volunteer</Button>
        <Button to="/sponsors" variant="outline" size="lg">Sponsor the Team</Button>
      </Hero>

      {/* Why volunteer */}
      <section className="section py-20">
        <SectionHeading eyebrow="Why families join" title="It Pays Off — On the Field and At Home" intro="We're a small town that shows up for its kids. Booster involvement is one of the simplest, highest-impact ways a Dinuba family can do that." />
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

      <CTABand
        eyebrow="One sign-up away"
        title="Let's Build Something Great"
        subtitle="Joining the boosters is free. Create your free account to sign up for volunteer shifts and stay in the loop all season."
      >
        <Button to="/my-account/signup" size="lg" className="!bg-white !text-field-800 hover:!bg-field-50">Create My Account</Button>
        <Button href="mailto:info@greenmileboosters.org" variant="outline" size="lg" className="!border-white/40 !text-white hover:!bg-white/10">Email the Boosters</Button>
      </CTABand>
    </>
  )
}
