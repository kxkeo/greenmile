import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, context: 'admin' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="min-h-[80vh] flex items-center py-16">
      <div className="w-full max-w-md mx-auto px-5">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🛡️</div>
          <h1 className="display text-white text-4xl">Booster Admin</h1>
          <p className="mt-2 text-zinc-400 text-sm">Sign in to manage the program.</p>
        </div>
        <div className="card p-8">
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}
            <div>
              <label className="label">Username</label>
              <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin" autoComplete="username" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</Button>
          </form>
        </div>
      </div>
    </section>
  )
}
