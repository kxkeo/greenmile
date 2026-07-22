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

const money = c => `$${(Number(c) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
const dateStr = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fullName = (f, l) => `${f || ''} ${l || ''}`.trim() || '—'

const SECTIONS = [
  { key: 'dashboard',     label: 'Dashboard',       icon: '📊' },
  { key: 'events',        label: 'Events',          icon: '📅' },
  { key: 'registrations', label: 'Registrations',   icon: '🎟️' },
  { key: 'purchases',     label: 'Purchases',       icon: '💳' },
  { key: 'users',         label: 'User Management', icon: '👥' },
  { key: 'settings',      label: 'Settings',        icon: '⚙️' },
]
const TITLES = {
  dashboard: 'Program Overview', events: 'Events', registrations: 'Registrations',
  purchases: 'Purchases', users: 'User Management', settings: 'Settings',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [me, setMe] = useState(undefined)
  const [section, setSection] = useState('dashboard')

  useEffect(() => {
    getJSON('/api/auth/me')
      .then(d => { if (!d?.user) throw new Error('UNAUTH'); setMe(d.user) })
      .catch(() => navigate('/admin/login'))
  }, [navigate])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    navigate('/admin/login')
  }

  if (me === undefined) return <Loading label="Loading admin…" />

  return (
    <section className="section py-10 min-h-[75vh]">
      <div className="mb-8">
        <div className="eyebrow mb-2">Booster Admin</div>
        <h1 className="display text-white text-4xl">{TITLES[section]}</h1>
        <p className="text-sm text-zinc-500 mt-1">Signed in as {me?.email || 'admin'}</p>
      </div>

      <div className="grid lg:grid-cols-[230px_1fr] gap-8 items-start">
        {/* Side nav */}
        <nav className="card p-3 flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-24">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-heading uppercase tracking-wider text-xs whitespace-nowrap transition-colors ${
                section === s.key ? 'bg-field-500 text-white' : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <span className="text-base leading-none">{s.icon}</span>{s.label}
            </button>
          ))}
          <div className="hidden lg:block border-t border-white/[0.07] mt-2 pt-3">
            <Button onClick={logout} variant="outline" size="sm" className="w-full">Log Out</Button>
          </div>
        </nav>

        {/* Section content */}
        <div className="min-w-0">
          {section === 'dashboard'     && <DashboardSection />}
          {section === 'events'        && <EventsSection />}
          {section === 'registrations' && <RegistrationsSection />}
          {section === 'purchases'     && <PurchasesSection />}
          {section === 'users'         && <UsersSection />}
          {section === 'settings'      && <SettingsPanel />}

          <div className="lg:hidden mt-8">
            <Button onClick={logout} variant="outline" size="md" className="w-full">Log Out</Button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Shared data hook + table ────────────────────────────────────────────────
function useData(path) {
  const [state, setState] = useState({ loading: true, data: null, error: false })
  useEffect(() => {
    let live = true
    getJSON(path)
      .then(d => live && setState({ loading: false, data: d, error: false }))
      .catch(() => live && setState({ loading: false, data: null, error: true }))
    return () => { live = false }
  }, [path])
  return state
}

function Table({ cols, rows, empty }) {
  if (!rows || rows.length === 0) return <EmptyCard>{empty}</EmptyCard>
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {cols.map(c => (
                <th key={c.key} className="text-left font-heading uppercase tracking-wider text-[0.7rem] text-zinc-500 px-4 py-3 whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((r, i) => (
              <tr key={r.id ?? i} className="hover:bg-white/[0.02]">
                {cols.map(c => (
                  <td key={c.key} className="px-4 py-3 text-zinc-200 align-top">{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptyCard({ children }) {
  return <div className="card p-10 text-center text-sm text-zinc-500">{children}</div>
}

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase()
  const tone = s === 'refunded' ? 'bg-red-500/15 text-red-300'
    : s === 'pending' ? 'bg-amber-500/15 text-amber-300'
    : s === 'pay_at_event' ? 'bg-zinc-500/15 text-zinc-300'
    : 'bg-field-500/20 text-field-300'
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-heading uppercase tracking-wide ${tone}`}>{status || '—'}</span>
}

// ── Sections ────────────────────────────────────────────────────────────────
function DashboardSection() {
  const donationsQ = useData('/api/admin/donations')
  const regsQ      = useData('/api/admin/event-registrations')
  const campaignsQ = useData('/api/campaigns')

  if (donationsQ.loading || regsQ.loading || campaignsQ.loading) return <Loading label="Loading overview…" />

  const donations = Array.isArray(donationsQ.data) ? donationsQ.data : []
  const eventRegs = Array.isArray(regsQ.data) ? regsQ.data : []
  const campaigns = Array.isArray(campaignsQ.data) ? campaignsQ.data : []
  const totalRaised = donations
    .filter(d => (d.paymentStatus || d.payment_status) !== 'refunded')
    .reduce((s, d) => s + (d.amount || (d.amountCents || 0) / 100 || 0), 0)

  const STATS = [
    { value: money(totalRaised), label: 'donations raised' },
    { value: donations.length, label: 'gifts' },
    { value: eventRegs.length, label: 'event registrations' },
    { value: campaigns.length, label: 'campaigns' },
  ]

  return (
    <div>
      <StatStrip stats={STATS} />
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <Panel title="Recent Donations" empty="No donations yet.">
          {donations.slice(0, 8).map((d, i) => (
            <Row key={d.id || i}
              left={fullName(d.firstName || d.first_name, d.lastName || d.last_name)}
              right={money(d.amount || (d.amountCents || 0) / 100)} />
          ))}
        </Panel>
        <Panel title="Recent Event Registrations" empty="No registrations yet.">
          {eventRegs.slice(0, 8).map((r, i) => (
            <Row key={r.id || i}
              left={fullName(r.first_name || r.firstName, r.last_name || r.lastName)}
              right={r.campaign_title || r.event_title || ''} />
          ))}
        </Panel>
      </div>
    </div>
  )
}

function EventsSection() {
  const { loading, data } = useData('/api/admin/campaigns')
  const rows = Array.isArray(data) ? data : []
  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-heading uppercase tracking-wide text-white mb-4">Campaigns &amp; Ticketed Events</h2>
        {loading ? <Loading label="Loading events…" /> : (
          <Table
            empty="No events yet. Country Nights and other campaigns will appear here."
            rows={rows}
            cols={[
              { key: 'title', label: 'Event', render: r => <span className="text-white font-heading uppercase tracking-wide">{r.title}</span> },
              { key: 'type', label: 'Type' },
              { key: 'event_date', label: 'Date', render: r => dateStr(r.event_date) },
              { key: 'price', label: 'Price', render: r => r.price_cents ? money(r.price_cents / 100) : 'Free' },
              { key: 'status', label: 'Status', render: r => <StatusPill status={r.status} /> },
            ]}
          />
        )}
      </div>
      <SeasonCalendarEditor />
    </div>
  )
}

// Editor for the public Events page "Season at a Glance" cards.
function SeasonCalendarEditor() {
  const [items, setItems] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState('')

  const load = () =>
    getJSON('/api/admin/season-calendar')
      .then(d => setItems(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setItems([]))
  useEffect(() => { load() }, [])

  const update = (i, key, val) => setItems(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it))
  const addCard = () => setItems([...(items || []), { icon: '🏈', when: '', title: '', body: '' }])
  const removeCard = i => setItems(items.filter((_, idx) => idx !== i))

  const save = async () => {
    setMsg(null); setBusy('save')
    try {
      const res = await fetch('/api/admin/season-calendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setItems(data.items)
      setMsg({ ok: true, text: 'Saved — the Events page is updated.' })
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy('') }
  }

  const reset = async () => {
    setMsg(null); setBusy('reset')
    try {
      const res = await fetch('/api/admin/season-calendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ reset: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      setItems(data.items)
      setMsg({ ok: true, text: 'Restored the default calendar.' })
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy('') }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-heading uppercase tracking-wide text-white">Season at a Glance</h2>
          <p className="text-xs text-zinc-500 mt-1">The calendar cards on the public Events page. Up to 12.</p>
        </div>
        <Button size="sm" variant="outline" onClick={addCard} disabled={!items || items.length >= 12}>Add Card</Button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg text-sm px-4 py-3 border ${msg.ok
          ? 'bg-field-900/40 border-field-500/30 text-field-300'
          : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>
      )}

      {items === null ? <Loading label="Loading calendar…" /> : (
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="card p-4">
              <div className="flex gap-3">
                <input
                  className="input !w-16 text-center !text-xl !px-2" value={it.icon}
                  onChange={e => update(i, 'icon', e.target.value)} aria-label="Icon" />
                <input
                  className="input" placeholder="When (e.g. October)" value={it.when}
                  onChange={e => update(i, 'when', e.target.value)} />
                <button onClick={() => removeCard(i)}
                  className="shrink-0 w-11 h-11 grid place-items-center rounded-lg border border-white/10 text-zinc-400 hover:text-red-300 hover:border-red-500/40 transition"
                  aria-label="Remove card">✕</button>
              </div>
              <input
                className="input mt-3" placeholder="Title" value={it.title}
                onChange={e => update(i, 'title', e.target.value)} />
              <textarea
                className="input mt-3 min-h-[70px]" placeholder="Description" value={it.body}
                onChange={e => update(i, 'body', e.target.value)} />
            </div>
          ))}
          {items.length === 0 && <EmptyCard>No cards. Add one to fill the Events calendar.</EmptyCard>}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button size="md" onClick={save} disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save Calendar'}</Button>
            <Button size="md" variant="outline" onClick={reset} disabled={busy === 'reset'}>{busy === 'reset' ? 'Resetting…' : 'Reset to Default'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function RegistrationsSection() {
  const { loading, data } = useData('/api/admin/event-registrations')
  if (loading) return <Loading label="Loading registrations…" />
  const rows = Array.isArray(data) ? data : []
  return (
    <Table
      empty="No event registrations yet."
      rows={rows}
      cols={[
        { key: 'name', label: 'Name', render: r => <span className="text-white">{fullName(r.first_name || r.firstName, r.last_name || r.lastName)}</span> },
        { key: 'event', label: 'Event', render: r => r.campaign_title || r.event_title || '—' },
        { key: 'qty', label: 'Qty', render: r => r.ticket_qty ?? 1 },
        { key: 'total', label: 'Total', render: r => r.total_cents != null ? money(r.total_cents / 100) : '—' },
        { key: 'status', label: 'Payment', render: r => <StatusPill status={r.payment_status || r.paymentStatus} /> },
        { key: 'created_at', label: 'Registered', render: r => dateStr(r.created_at) },
      ]}
    />
  )
}

function PurchasesSection() {
  const donationsQ = useData('/api/admin/donations')
  const ordersQ    = useData('/api/admin/store-orders')
  if (donationsQ.loading || ordersQ.loading) return <Loading label="Loading purchases…" />
  const donations = Array.isArray(donationsQ.data) ? donationsQ.data : []
  const orders    = Array.isArray(ordersQ.data) ? ordersQ.data : []

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-heading uppercase tracking-wide text-white mb-4">Donations &amp; Sponsorships</h2>
        <Table
          empty="No donations or sponsorships yet."
          rows={donations}
          cols={[
            { key: 'name', label: 'Name', render: d => <span className="text-white">{fullName(d.firstName || d.first_name, d.lastName || d.last_name)}</span> },
            { key: 'tier', label: 'Type', render: d => d.tierLabel || d.tier_label || d.notes || 'Donation' },
            { key: 'amount', label: 'Amount', render: d => money(d.amount || (d.amountCents || 0) / 100) },
            { key: 'status', label: 'Status', render: d => <StatusPill status={d.paymentStatus || d.payment_status} /> },
            { key: 'created_at', label: 'Date', render: d => dateStr(d.createdAt || d.created_at) },
          ]}
        />
      </div>
      <div>
        <h2 className="font-heading uppercase tracking-wide text-white mb-4">Store Orders</h2>
        <Table
          empty="No store orders yet."
          rows={orders}
          cols={[
            { key: 'name', label: 'Customer', render: o => <span className="text-white">{fullName(o.first_name || o.firstName || o.customer_name, o.last_name || o.lastName)}</span> },
            { key: 'total', label: 'Total', render: o => money((o.total_cents ?? o.totalCents ?? 0) / 100) },
            { key: 'status', label: 'Status', render: o => <StatusPill status={o.status} /> },
            { key: 'created_at', label: 'Date', render: o => dateStr(o.created_at || o.createdAt) },
          ]}
        />
      </div>
    </div>
  )
}

function UsersSection() {
  const { loading, data } = useData('/api/admin/participants')
  if (loading) return <Loading label="Loading members…" />
  const rows = Array.isArray(data) ? data : []
  return (
    <Table
      empty="No member accounts yet."
      rows={rows}
      cols={[
        { key: 'name', label: 'Name', render: u => <span className="text-white">{fullName(u.first_name || u.firstName, u.last_name || u.lastName)}</span> },
        { key: 'email', label: 'Email', render: u => u.email || '—' },
        { key: 'phone', label: 'Phone', render: u => u.phone || '—' },
        { key: 'created_at', label: 'Joined', render: u => dateStr(u.created_at || u.createdAt) },
        { key: 'status', label: 'Status', render: u => (u.disabled || u.is_disabled) ? <StatusPill status="disabled" /> : <StatusPill status="active" /> },
      ]}
    />
  )
}

const SETTINGS_TABS = [
  { key: 'payments', label: 'Payments' },
  { key: 'email',    label: 'Email' },
  { key: 'security', label: 'Security' },
]

function SettingsPanel() {
  const [tab, setTab] = useState('payments')
  const [config, setConfig] = useState(null)
  const [stripeKey, setStripeKey] = useState('')
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

  const saveStripe = async () => {
    if (await post('set_stripe_key', stripeKey.trim(), 'stripe', 'Stripe secret key saved — card payments are live.')) setStripeKey('')
  }
  const saveResend = async () => {
    if (await post('set_resend_key', resendKey.trim(), 'key', 'Resend API key saved — email receipts are live.')) setResendKey('')
  }
  const savePw = async () => {
    if (await post('set_admin_password', newPw, 'pw', 'Admin password updated — use it on your next sign-in.')) setNewPw('')
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

  return (
    <div className="mt-10 card overflow-hidden">
      <div className="px-6 pt-6">
        <div className="font-heading uppercase tracking-wide text-white mb-1">Settings</div>
        <p className="text-xs text-zinc-500">Payments, email receipts, and admin access.</p>
      </div>

      {/* Sub-nav */}
      <div className="mt-5 px-6 flex gap-1 border-b border-white/[0.07]">
        {SETTINGS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMsg(null) }}
            className={`px-4 py-3 font-heading uppercase tracking-wider text-xs border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'text-field-400 border-field-500'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {msg && (
          <div className={`mb-5 rounded-lg text-sm px-4 py-3 border ${msg.ok
            ? 'bg-field-900/40 border-field-500/30 text-field-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {msg.text}
          </div>
        )}

        {/* PAYMENTS — Stripe */}
        {tab === 'payments' && (
          <div className="max-w-xl">
            <label className="label">Stripe secret key (card payments)</label>
            <div className="text-xs mb-2">
              {config === null ? <span className="text-zinc-600">Checking…</span>
                : config?.stripe_configured
                  ? <span className="text-field-400">✓ Configured {config.stripe_key_hint}
                      {config.stripe_mode && <span className={config.stripe_mode === 'live' ? 'text-field-300' : 'text-amber-400'}> · {config.stripe_mode.toUpperCase()} mode</span>}
                      {config.stripe_from_env ? ' (set via environment variable)' : ''}</span>
                  : <span className="text-amber-400">Not configured — checkouts show "being connected"</span>}
            </div>
            <div className="flex gap-2">
              <input className="input" type="password" placeholder="sk_live_… or sk_test_…" value={stripeKey}
                     onChange={e => setStripeKey(e.target.value)} autoComplete="off" />
              <Button size="md" onClick={saveStripe} disabled={busy === 'stripe' || !stripeKey.trim()}>
                {busy === 'stripe' ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {config?.stripe_from_env && (
              <p className="mt-2 text-xs text-zinc-600">The environment variable takes priority over a key saved here.</p>
            )}
            <div className="mt-5 rounded-lg bg-charcoal-900 border border-white/[0.07] p-4 text-xs text-zinc-400 leading-relaxed">
              <div className="font-heading uppercase tracking-wider text-zinc-300 text-[0.7rem] mb-1.5">One more step</div>
              The matching <span className="text-zinc-200">publishable key</span> (<code className="text-field-400">pk_live_…</code>) is
              built into the site, so it must be added in Cloudflare Pages → Settings → Variables as
              <span className="text-zinc-200"> VITE_STRIPE_PUBLISHABLE_KEY</span>, then redeploy. This key here powers charges,
              refunds, and receipts server-side.
            </div>
          </div>
        )}

        {/* EMAIL — Resend */}
        {tab === 'email' && (
          <div className="max-w-xl">
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
              <Button size="md" onClick={saveResend} disabled={busy === 'key' || !resendKey.trim()}>
                {busy === 'key' ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {config?.resend_from_env && (
              <p className="mt-2 text-xs text-zinc-600">The environment variable takes priority over a key saved here.</p>
            )}
            <div className="mt-5">
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
        )}

        {/* SECURITY — admin password */}
        {tab === 'security' && (
          <div className="max-w-xl">
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
        )}
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
