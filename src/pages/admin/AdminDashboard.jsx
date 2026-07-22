import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Loading, StatStrip } from '../../components/ui'

// Fetch helper that treats 401 as "not logged in".
async function getJSON(path) {
  const r = await fetch(path, { credentials: 'include' })
  if (r.status === 401) throw new Error('UNAUTH')
  if (!r.ok) return null
  return r.json()
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    (async () => {
      try {
        const me = await getJSON('/api/auth/me')
        if (!me) throw new Error('UNAUTH')
        const [donations, eventRegs, campaigns] = await Promise.all([
          getJSON('/api/admin/donations').catch(() => null),
          getJSON('/api/admin/event-registrations').catch(() => null),
          getJSON('/api/campaigns').catch(() => null),
        ])
        setState({ loading: false, me: me.user, donations, eventRegs, campaigns })
      } catch (e) {
        navigate('/admin/login')
      }
    })()
  }, [navigate])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    navigate('/admin/login')
  }

  if (state.loading) return <Loading label="Loading admin…" />

  const donations = Array.isArray(state.donations) ? state.donations : []
  const eventRegs = Array.isArray(state.eventRegs) ? state.eventRegs : []
  const campaigns = Array.isArray(state.campaigns) ? state.campaigns : []
  const totalRaised = donations
    .filter(d => (d.paymentStatus || d.payment_status) !== 'refunded')
    .reduce((s, d) => s + (d.amount || (d.amountCents || 0) / 100 || 0), 0)

  const STATS = [
    { value: `$${Math.round(totalRaised).toLocaleString()}`, label: 'donations raised' },
    { value: donations.length, label: 'gifts' },
    { value: eventRegs.length, label: 'event registrations' },
    { value: campaigns.length, label: 'campaigns' },
  ]

  return (
    <section className="section py-16 min-h-[70vh]">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <div className="eyebrow mb-2">Booster Admin</div>
          <h1 className="display text-white text-4xl">Program Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">Signed in as {state.me?.email || 'admin'}</p>
        </div>
        <Button onClick={logout} variant="outline" size="md">Log out</Button>
      </div>

      <StatStrip stats={STATS} />

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Panel title="Recent Donations" empty="No donations yet.">
          {donations.slice(0, 8).map((d, i) => (
            <Row key={d.id || i}
              left={`${d.firstName || d.first_name || 'Anonymous'} ${d.lastName || d.last_name || ''}`}
              right={`$${d.amount || (d.amountCents || 0) / 100}`} />
          ))}
        </Panel>
        <Panel title="Recent Event Registrations" empty="No registrations yet.">
          {eventRegs.slice(0, 8).map((r, i) => (
            <Row key={r.id || i}
              left={`${r.first_name || r.firstName || ''} ${r.last_name || r.lastName || ''}`.trim() || `Reg #${r.id || i}`}
              right={r.campaign_title || r.event_title || ''} />
          ))}
        </Panel>
      </div>

      <SettingsPanel />

      <p className="mt-10 text-sm text-zinc-500">
        Full management tools (campaigns, store, registrations editing, game-day) run on the same
        backend and are being brought into this new admin design. Reach out to prioritize what's next.
      </p>
    </section>
  )
}

function SettingsPanel() {
  const [config, setConfig] = useState(null)
  const [resendKey, setResendKey] = useState('')
  const [testTo, setTestTo] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState(null) // { ok, text }
  const [busy, setBusy] = useState('')

  const loadConfig = () =>
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setConfig)
      .catch(() => setConfig(null))

  useEffect(() => { loadConfig() }, [])

  const post = async (action, value, busyKey, okText) => {
    setMsg(null); setBusy(busyKey)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMsg({ ok: true, text: okText })
      loadConfig()
      return true
    } catch (e) {
      setMsg({ ok: false, text: e.message })
      return false
    } finally {
      setBusy('')
    }
  }

  const saveKey = async () => {
    if (await post('set_resend_key', resendKey.trim(), 'key', 'Resend API key saved — email receipts are live.')) setResendKey('')
  }

  const sendTest = async () => {
    setMsg(null); setBusy('test')
    try {
      const res = await fetch('/api/admin/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'alumni_confirmation', to: testTo.trim(), campaignTitle: 'Country Nights', campaignType: 'dinner', eventDate: '2026-09-26', location: '40481 Road 80, Dinuba, CA 93618', totalCents: 5000 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setMsg({ ok: true, text: `Test receipt sent to ${testTo.trim()} — check the inbox.` })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy('')
    }
  }

  const savePw = async () => {
    if (await post('set_admin_password', newPw, 'pw', 'Admin password updated — use it on your next sign-in.')) setNewPw('')
  }

  return (
    <div className="mt-10 card p-6">
      <div className="font-heading uppercase tracking-wide text-white mb-1">Settings</div>
      <p className="text-xs text-zinc-500 mb-5">Email receipts and admin access.</p>

      {msg && (
        <div className={`mb-5 rounded-lg text-sm px-4 py-3 border ${msg.ok
          ? 'bg-field-900/40 border-field-500/30 text-field-300'
          : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resend key */}
        <div>
          <label className="label">Resend API key (email receipts)</label>
          <div className="text-xs mb-2">
            {config === null ? <span className="text-zinc-600">Checking…</span>
              : config?.resend_configured
                ? <span className="text-field-400">✓ Configured {config.resend_key_hint}{config.resend_from_env ? ' (set via environment variable)' : ''}</span>
                : <span className="text-amber-400">Not configured — receipts will not send</span>}
          </div>
          <div className="flex gap-2">
            <input className="input" type="password" placeholder="re_…" value={resendKey}
                   onChange={e => setResendKey(e.target.value)} autoComplete="off" />
            <Button size="md" onClick={saveKey} disabled={busy === 'key' || !resendKey.trim()}>
              {busy === 'key' ? 'Saving…' : 'Save'}
            </Button>
          </div>
          {config?.resend_from_env && (
            <p className="mt-2 text-xs text-zinc-600">The environment variable takes priority over a key saved here.</p>
          )}
          <div className="mt-4">
            <label className="label">Send a test receipt to</label>
            <div className="flex gap-2">
              <input className="input" type="email" placeholder="you@email.com" value={testTo}
                     onChange={e => setTestTo(e.target.value)} />
              <Button size="md" variant="outline" onClick={sendTest}
                      disabled={busy === 'test' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo.trim())}>
                {busy === 'test' ? 'Sending…' : 'Test'}
              </Button>
            </div>
          </div>
        </div>

        {/* Admin password */}
        <div>
          <label className="label">Change admin password</label>
          <p className="text-xs text-zinc-600 mb-2">For the built-in <span className="text-zinc-400">admin</span> login. Minimum 8 characters.</p>
          <div className="flex gap-2">
            <input className="input" type="password" placeholder="New password" value={newPw}
                   onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
            <Button size="md" onClick={savePw} disabled={busy === 'pw' || newPw.length < 8}>
              {busy === 'pw' ? 'Saving…' : 'Update'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children
  const isEmpty = !items || (Array.isArray(items) && items.length === 0)
  return (
    <div className="card p-6">
      <div className="font-heading uppercase tracking-wide text-white mb-4">{title}</div>
      {isEmpty ? <p className="text-sm text-zinc-500">{empty}</p> : <div className="divide-y divide-white/[0.06]">{items}</div>}
    </div>
  )
}

function Row({ left, right }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-zinc-200 truncate">{left}</span>
      <span className="text-field-400 font-heading truncate text-right shrink-0 max-w-[55%]">{right}</span>
    </div>
  )
}
