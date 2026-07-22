import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { AuthShell } from './Login'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/auth/participant-forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check Your Email" subtitle="If an account exists for that email, a reset link is on its way.">
        <div className="rounded-lg bg-field-500/10 border border-field-500/30 text-field-200 text-sm px-4 py-4 leading-relaxed">
          We've sent a password reset link to <strong className="text-white">{email}</strong>. The link expires in 1 hour. Don't see it? Check your spam folder.
        </div>
        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link to="/my-account/login" className="text-field-400 hover:text-field-300">Back to sign in</Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Forgot Password" subtitle="Enter your email and we'll send you a link to reset your password.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}
        <div>
          <label className="label">Email Address</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
        </div>
        <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send Reset Link'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-400">
        Remembered it? <Link to="/my-account/login" className="text-field-400 hover:text-field-300">Back to sign in</Link>
      </p>
      <p className="mt-2 text-center text-xs text-zinc-500">
        Signed up with a phone number? Your PIN can't be reset here — contact <a href="mailto:info@greenmileboosters.org" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>.
      </p>
    </AuthShell>
  )
}
