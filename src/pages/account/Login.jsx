import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // Only allow same-site relative redirects
  const rawNext = params.get('next') || ''
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/my-account/dashboard'
  const [identifier, setIdentifier] = useState('')
  const [credential, setCredential] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/auth/participant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      navigate(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome Back" subtitle="Sign in to manage your membership and volunteer shifts.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}
        <div>
          <label className="label">Email or Phone</label>
          <input className="input" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@email.com" autoComplete="username" />
        </div>
        <div>
          <label className="label">Password or PIN</label>
          <input className="input" type="password" value={credential} onChange={e => setCredential(e.target.value)} placeholder="••••••" autoComplete="current-password" />
        </div>
        <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-400">
        New here? <Link to={rawNext ? `/my-account/signup?next=${encodeURIComponent(rawNext)}` : '/my-account/signup'} className="text-field-400 hover:text-field-300">Create an account</Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <section className="min-h-[80vh] flex items-center py-16">
      <div className="w-full max-w-md mx-auto px-5">
        <div className="text-center mb-8">
          <img src="/img/logo.png" alt="Dinuba Emperors crest" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="display text-white text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-zinc-400 text-sm">{subtitle}</p>}
        </div>
        <div className="card p-7 sm:p-8">{children}</div>
      </div>
    </section>
  )
}
