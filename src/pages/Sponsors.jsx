import { Hero, SectionHeading, Button, Eyebrow, CTABand } from '../components/ui'
import { IMG } from '../content/images'

// Sponsorship packages for local businesses — mirrors the printed
// Green Mile Boosters sponsor flyer.

const TIERS = [
  {
    name: 'Emperor Sponsor',
    price: '$1,000',
    featured: true,
    perks: [
      'Banner displayed on the field at every home game',
      '½-page business card in the home game program',
      'Entry for TWO at every home game',
      '2 food vouchers per game',
      '2 custom DINUBA hats',
      '2 Green Mile Boosters sponsor t-shirts',
      'Shout-out on the Green Mile Boosters social media',
      'Announced at home games over the PA system',
    ],
  },
  {
    name: 'Green Sponsor',
    price: '$500',
    perks: [
      'Personal banner displayed on the field at every home game',
      'Business card in the home game program',
      'Free entry for 4 to any ONE home game',
      'Shout-out on the Green Mile Boosters social media',
      'Announced at home games over the PA system',
    ],
  },
  {
    name: 'Silver Sponsor',
    price: '$300',
    perks: [
      'Personal banner displayed on the field at every home game',
      'Free entry for 2 to any ONE home game',
      'Announced at home games over the PA system',
    ],
  },
]

const CONTACTS = [
  { name: 'Coach Lester', role: 'Head of Program', phone: '(559) 737-0804', tel: '5597370804' },
  { name: 'Kevin Keo', role: 'Green Mile Booster Club', phone: '(559) 397-5555', tel: '5593975555' },
]

export default function Sponsors() {
  return (
    <>
      <Hero
        image={IMG.sideline}
        eyebrow="One Town, One Team, One Dream"
        title={<>Sponsor the<br /><span className="text-field-400">Emperors</span></>}
        subtitle="In a town like Dinuba, Friday night lights are where everyone is. Put your business on the banner, in the program, and over the PA — in front of the whole community, all season long."
        minH="min-h-[62vh]"
      >
        <Button href="#packages" size="lg">See Packages</Button>
        <Button href="mailto:info@greenmileboosters.org?subject=Sponsorship%20Inquiry" variant="outline" size="lg">Email Us</Button>
      </Hero>

      <section id="packages" className="section py-20 scroll-mt-20">
        <SectionHeading
          eyebrow="Sponsor packages"
          title="Pick Your Level"
          intro="Local businesses are the backbone of this community, and the community fills those stands. Every package puts your name in front of the Green Mile crowd — and every dollar goes straight to our kids."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto items-start">
          {TIERS.map(t => (
            <div key={t.name}
              className={`relative rounded-2xl p-7 ${t.featured
                ? 'bg-gradient-to-b from-field-700 to-field-900 border border-field-500/50 shadow-glow'
                : 'card'}`}>
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-field-400 text-charcoal-900 font-heading uppercase tracking-wider text-[0.65rem] px-3 py-1 rounded-full whitespace-nowrap">
                  Top billing
                </div>
              )}
              <div className="font-heading uppercase tracking-wider text-sm text-zinc-300">{t.name}</div>
              <div className="display text-5xl text-white mt-2">{t.price}</div>
              <div className="text-xs text-zinc-400 mb-5">per season</div>
              <ul className="space-y-2.5 text-sm">
                {t.perks.map(p => (
                  <li key={p} className={`flex gap-2 ${t.featured ? 'text-field-50' : 'text-zinc-200'}`}>
                    <span className="text-field-400 shrink-0">✓</span><span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button
                  href={`mailto:info@greenmileboosters.org?subject=${encodeURIComponent(`${t.name} — Sponsorship Inquiry`)}`}
                  variant={t.featured ? 'outline' : 'primary'} size="md"
                  className={`w-full ${t.featured ? '!border-white/40 !text-white hover:!bg-white/10' : ''}`}>
                  Become {t.name.startsWith('E') ? 'an' : 'a'} {t.name.split(' ')[0]} Sponsor
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-zinc-500">
          The Green Mile Boosters is a registered nonprofit — sponsorships are tax-deductible where applicable. Tax ID 92-2360865.
        </p>
      </section>

      {/* Contacts */}
      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-16">
          <SectionHeading eyebrow="Ready to join the team?" title="Talk to a Real Person" intro="Message any of our social pages, or call or text directly — we'll get your business on the Green Mile." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 max-w-2xl mx-auto">
            {CONTACTS.map(c => (
              <a key={c.name} href={`tel:${c.tel}`} className="card-hover p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-field-500 to-field-800 grid place-items-center text-xl shrink-0">📞</div>
                <div>
                  <div className="font-heading uppercase tracking-wide text-white">{c.name}</div>
                  <div className="text-xs text-zinc-500">{c.role}</div>
                  <div className="text-sm text-field-400 mt-0.5">{c.phone}</div>
                </div>
              </a>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-400">
            Follow us <a href="https://www.instagram.com/thegreenmileboosters" target="_blank" rel="noopener noreferrer" className="text-field-400 hover:text-field-300">@thegreenmileboosters</a>
          </p>
        </div>
      </section>

      <CTABand
        eyebrow="Go Emperors!"
        title="One Town. One Team. One Dream."
        subtitle="Join the local businesses backing Dinuba football — your name under the Friday-night lights, all season long."
      >
        <Button href="mailto:info@greenmileboosters.org?subject=Sponsorship%20Inquiry" size="lg" className="!bg-white !text-field-800 hover:!bg-field-50">Start a Sponsorship</Button>
      </CTABand>
    </>
  )
}
