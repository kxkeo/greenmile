import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui'
import { AuthShell } from './Login'

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const rawNext = params.get('next') || ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/my-account/dashboard'
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', newsletter: true })
  const [error, setError] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/auth/participant-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      // Phone-only accounts get a PIN back — show it before redirecting.
      if (data.pin) { setPin(data.pin); return }
      navigate(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (pin) {
    return (
      <AuthShell title="You're In!" subtitle="Save this 6-digit PIN — it's how you'll sign in.">
        <div className="text-center">
          <div className="display text-field-400 text-4xl sm:text-5xl tracking-[0.2em] sm:tracking-[0.3em] py-6">{pin}</div>
          <p className="text-sm text-zinc-400 mb-6">Write it down somewhere safe. You'll use your phone number + this PIN to log in.</p>
          <Button to="/my-account/login" size="lg" className="w-full">Continue to Login</Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Join the Boosters" subtitle="Create a free account to volunteer, register for events, and back the Emperors.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name</label>
            <input className="input" value={form.firstName} onChange={set('firstName')} required />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input className="input" value={form.lastName} onChange={set('lastName')} required />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" required />
        </div>
        <div>
          <label className="label">Phone <span className="text-zinc-600 normal-case">(optional)</span></label>
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="(559) 555-1234" />
        </div>
        <div>
          <label className="label">Password <span className="text-zinc-600 normal-case">(min 6 characters)</span></label>
          <input className="input" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required minLength={6} />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={form.newsletter} onChange={set('newsletter')} className="accent-field-500 w-4 h-4" />
          Send me booster news and event reminders
        </label>
        <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-400">
        Already a member? <Link to={rawNext ? `/my-account/login?next=${encodeURIComponent(rawNext)}` : '/my-account/login'} className="text-field-400 hover:text-field-300">Sign in</Link>
      </p>
    </AuthShell>
  )
}
