import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui'
import { IMG } from '../content/images'

// Public unsubscribe confirmation. Reached from the link in a promo email
// (?e=<email>&t=<token>). We confirm with a button rather than auto-unsubscribe
// on load so email-scanner link prefetching can't opt someone out by accident.
export default function Unsubscribe() {
  const [params] = useSearchParams()
  const email = params.get('e') || ''
  const token = params.get('t') || ''
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [error, setError] = useState('')

  const unsubscribe = async () => {
    setState('busy'); setError('')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not unsubscribe.')
      setState('done')
    } catch (e) { setError(e.message); setState('error') }
  }

  return (
    <section className="min-h-[80vh] flex items-center py-16">
      <div className="w-full max-w-md mx-auto px-5 text-center">
        <img src={IMG.logo} alt="Dinuba Emperors crest" className="h-16 w-auto mx-auto mb-4" />
        {state === 'done' ? (
          <>
            <h1 className="display text-white text-4xl">You're Unsubscribed</h1>
            <p className="mt-3 text-zinc-400">{email && <strong className="text-zinc-200">{email}</strong>} won't receive any more promotional emails from The Green Mile Boosters. You'll still get receipts and confirmations for anything you sign up for.</p>
            <div className="mt-7"><Button to="/" size="lg">Back to Home</Button></div>
          </>
        ) : (
          <>
            <h1 className="display text-white text-4xl">Unsubscribe</h1>
            <p className="mt-3 text-zinc-400">
              Stop promotional emails from The Green Mile Boosters{email ? <> to <strong className="text-zinc-200">{email}</strong></> : ''}?
            </p>
            {(state === 'error') && <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={unsubscribe} size="lg" disabled={state === 'busy' || !email}>
                {state === 'busy' ? 'Working…' : 'Unsubscribe Me'}
              </Button>
              <Button to="/" variant="outline" size="lg">Never Mind</Button>
            </div>
            <p className="mt-5 text-xs text-zinc-600">Questions? <a href="mailto:info@greenmileboosters.org" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a></p>
          </>
        )}
      </div>
    </section>
  )
}
