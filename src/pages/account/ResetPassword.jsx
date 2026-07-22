import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui'
import { AuthShell } from './Login'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/participant-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setDone(true)
      setTimeout(() => navigate('/my-account/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid Link" subtitle="This password reset link is missing or invalid.">
        <p className="text-center text-sm text-zinc-400">
          <Link to="/my-account/forgot" className="text-field-400 hover:text-field-300">Request a new reset link</Link>
        </p>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Password Reset" subtitle="You're all set.">
        <div className="rounded-lg bg-field-500/10 border border-field-500/30 text-field-200 text-sm px-4 py-4 leading-relaxed">
          Your password has been reset. Redirecting you to sign in…
        </div>
        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link to="/my-account/login" className="text-field-400 hover:text-field-300">Sign in now</Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Set a New Password" subtitle="Choose a new password for your account.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}
        <div>
          <label className="label">New Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
        </div>
        <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Resetting…' : 'Reset Password'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-400">
        <Link to="/my-account/login" className="text-field-400 hover:text-field-300">Back to sign in</Link>
      </p>
    </AuthShell>
  )
}
