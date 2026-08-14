import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, FeatureCard } from '../components/ui'
import { IMG } from '../content/images'

export default function Donate() {
  const navigate = useNavigate()
  const [custom, setCustom] = useState('')

  const amount = Math.max(0, parseInt(custom, 10) || 0)

  const goCheckout = () => {
    if (amount > 0) navigate(`/donate/checkout?amount=${amount}`)
  }

  return (
    <>
      <Hero
        image={IMG.gear}
        eyebrow="Back the Emperors"
        title="Donate"
        subtitle="Every donation goes straight to our kids — gear, meals, travel, and scholarships. No red tape, 100% community powered. That's the Dinuba way."
        minH="min-h-[56vh]"
      />

      <section className="section py-20">
        <SectionHeading
          eyebrow="Back the Emperors"
          title="Make a Donation"
          intro="Give whatever works for you — tax-deductible where applicable. In a town like ours, every dollar suits up one of our kids."
        />

        <div className="mt-12 max-w-md mx-auto">
          <div className="card p-7 sm:p-8">
            <label className="label">Donation Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 display text-2xl text-field-400">$</span>
              <input
                type="text" inputMode="numeric" placeholder="0"
                value={custom}
                onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
                className="input !pl-11 !text-3xl !font-display !py-4"
                aria-label="Donation amount in dollars"
              />
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="text-zinc-400 mb-4">
              Giving <span className="display text-field-400 text-2xl align-middle">${amount || 0}</span> to Emperors football
            </div>
            <Button onClick={goCheckout} size="lg" disabled={amount <= 0}
              className={`w-full ${amount <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
              Continue to Secure Checkout
            </Button>
            <p className="mt-4 text-xs text-zinc-600">
              Payments are processed securely by Stripe.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-charcoal-850 border-y border-white/[0.06]">
        <div className="section py-16">
          <SectionHeading eyebrow="Other ways to give" title="More Than Money" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <FeatureCard title="Give Time">Volunteer at games and events — often worth more than a check.</FeatureCard>
            <FeatureCard title="Corporate Sponsor">Put your business on the banner and the Green Mile — packages from $300 a season.</FeatureCard>
            <FeatureCard title="Shop the Store">Rep the Emperors. Every purchase supports the program.</FeatureCard>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button to="/volunteer" variant="outline" size="md">Volunteer</Button>
            <Button to="/sponsors" variant="outline" size="md">Become a Sponsor</Button>
            <Button to="/shop" variant="outline" size="md">Visit the Shop</Button>
          </div>
        </div>
      </section>
    </>
  )
}
