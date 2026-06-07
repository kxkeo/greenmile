import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, FeatureCard } from '../components/ui'
import { IMG } from '../content/images'

const TIERS = [
  { amount: 25, icon: '🌿', title: 'Green', body: 'Stocks the sideline — water, tape, and the little things a team burns through every week.' },
  { amount: 50, icon: '🧤', title: 'Grit', body: 'Gloves, mouthguards, and practice gear for an Emperor.' },
  { amount: 100, icon: '🪖', title: 'Gridiron', body: 'A meaningful chunk of a helmet or shoulder pads — real protection on the field.' },
  { amount: 250, icon: '🏆', title: 'Champion', body: 'Covers team meals for a game night, or travel for an away matchup.' },
  { amount: 500, icon: '🌟', title: 'Legacy', body: 'Fuels scholarships and the experiences that change a young athlete\'s life.' },
]

export default function Donate() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(100)
  const [custom, setCustom] = useState('')

  const amount = custom ? Math.max(0, parseInt(custom, 10) || 0) : selected

  const goCheckout = () => {
    if (amount > 0) navigate(`/donate/checkout?amount=${amount}`)
  }

  return (
    <>
      <Hero
        image={IMG.gear}
        eyebrow="Back the Emperors"
        title="Donate"
        subtitle="Every gift goes straight to the players — gear, meals, travel, and scholarships. 100% community powered."
        minH="min-h-[56vh]"
      />

      <section className="section py-20">
        <SectionHeading eyebrow="Choose your impact" title="Pick an Amount" intro="Tax-deductible where applicable. Pick a tier or enter your own — every dollar suits up an Emperor." />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {TIERS.map(t => {
            const active = !custom && selected === t.amount
            return (
              <button
                key={t.amount}
                onClick={() => { setSelected(t.amount); setCustom('') }}
                className={`text-left rounded-2xl p-7 transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-b from-field-700 to-field-900 border border-field-500/60 shadow-glow -translate-y-1'
                    : 'card hover:border-field-500/40 hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{t.icon}</span>
                  <span className={`display text-3xl ${active ? 'text-white' : 'text-field-400'}`}>${t.amount}</span>
                </div>
                <div className="mt-4 font-heading uppercase tracking-wide text-white">{t.title}</div>
                <p className={`mt-1 text-sm leading-relaxed ${active ? 'text-field-50/90' : 'text-zinc-400'}`}>{t.body}</p>
              </button>
            )
          })}

          {/* Custom amount */}
          <div className={`rounded-2xl p-7 ${custom ? 'bg-gradient-to-b from-field-700 to-field-900 border border-field-500/60 shadow-glow' : 'card'}`}>
            <div className="text-3xl mb-4">✍️</div>
            <label className="label">Custom amount</label>
            <div className="flex items-center gap-2">
              <span className="display text-3xl text-field-400">$</span>
              <input
                type="text" inputMode="numeric" placeholder="0"
                value={custom}
                onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
                className="input !text-2xl !font-display"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="text-zinc-400 mb-4">
            Giving <span className="display text-field-400 text-2xl align-middle">${amount || 0}</span> to Emperors football
          </div>
          <Button onClick={goCheckout} size="lg" disabled={amount <= 0} className={amount <= 0 ? 'opacity-50 cursor-not-allowed' : ''}>
            Continue to Secure Checkout →
          </Button>
          <p className="mt-4 text-xs text-zinc-600 max-w-md mx-auto">
            Payments are processed securely by Stripe. Online giving goes live once the Green Mile
            Stripe keys are connected.
          </p>
        </div>
      </section>

      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-16">
          <SectionHeading eyebrow="Other ways to give" title="More Than Money" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <FeatureCard icon="⏱️" title="Give Time">Volunteer at games and events — often worth more than a check.</FeatureCard>
            <FeatureCard icon="🏢" title="Corporate Sponsor">Put your business on the banner and the Green Mile. Email us to sponsor.</FeatureCard>
            <FeatureCard icon="🛍️" title="Shop the Store">Rep the Emperors. Every purchase supports the program.</FeatureCard>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button to="/volunteer" variant="outline" size="md">Volunteer</Button>
            <Button to="/shop" variant="ghost" size="md">Visit the Shop →</Button>
          </div>
        </div>
      </section>
    </>
  )
}
