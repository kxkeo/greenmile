import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Button, Eyebrow } from '../components/ui'

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const STRIPE_READY = PK && !PK.includes('placeholder')

export default function DonateCheckout() {
  const [params] = useSearchParams()
  const amount = Math.max(0, parseInt(params.get('amount'), 10) || 0)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <section className="section py-16 min-h-[75vh] max-w-2xl">
      <div className="mb-8">
        <Link to="/donate" className="text-sm text-zinc-400 hover:text-field-400">← Back to donate</Link>
      </div>

      <div className="card p-8">
        <Eyebrow className="mb-2">Secure Checkout</Eyebrow>
        <h1 className="display text-white text-4xl">Your Gift</h1>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-charcoal-900 border border-white/[0.07] px-6 py-5">
          <span className="font-heading uppercase tracking-wide text-zinc-300">Donation</span>
          <span className="display text-field-400 text-4xl">${amount}</span>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input className="input" value={form.firstName} onChange={set('firstName')} />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input className="input" value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Email (for your receipt)</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
        </div>

        {STRIPE_READY ? (
          <div className="mt-6">
            {/* Stripe Payment Element mounts here once live keys are connected. */}
            <Button size="lg" className="w-full">Pay ${amount} Securely</Button>
            <p className="mt-3 text-xs text-zinc-500 text-center">Payments processed securely by Stripe.</p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-field-900/40 border border-field-500/30 p-5">
            <div className="font-heading uppercase tracking-wide text-field-300 text-sm mb-1">Online giving is being connected</div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We're finishing our secure payment setup. To give right now, email{' '}
              <a href="mailto:info@greenmileboosters.com" className="text-field-400 hover:text-field-300">info@greenmileboosters.com</a>{' '}
              and we'll take care of you. Thank you for backing the Emperors!
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
