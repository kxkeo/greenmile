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

// White (currentColor) line icons for the admin side nav.
const svg = (paths) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">{paths}</svg>
)
const NAV_ICON = {
  dashboard:      svg(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>),
  events:         svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
  registrations:  svg(<><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M14 6v12" /></>),
  purchases:      svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
  communications: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
  users:          svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" /></>),
  settings:       svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>),
}

const SECTIONS = [
  { key: 'dashboard',      label: 'Dashboard' },
  { key: 'events',         label: 'Events' },
  { key: 'registrations',  label: 'Registrations' },
  { key: 'purchases',      label: 'Purchases' },
  { key: 'communications', label: 'Communications' },
  { key: 'users',          label: 'User Management' },
  { key: 'settings',       label: 'Settings' },
]
const TITLES = {
  dashboard: 'Program Overview', events: 'Events', registrations: 'Registrations',
  purchases: 'Purchases', communications: 'Communications', users: 'User Management', settings: 'Settings',
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

  const logout = () => {
    // Redirect immediately — don't block on the network round-trip. The session
    // is cleared server-side by the fire-and-forget request.
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    navigate('/')
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
              {NAV_ICON[s.key]}{s.label}
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
          {section === 'communications' && <CommunicationsSection />}
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
      <TeamDinnersEditor />
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

// Editor for the Parents-page team-dinner schedule: who's hosting + address.
function TeamDinnersEditor() {
  const [dinners, setDinners] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () =>
    getJSON('/api/admin/team-dinners')
      .then(d => setDinners(Array.isArray(d?.dinners) ? d.dinners : []))
      .catch(() => setDinners([]))
  useEffect(() => { load() }, [])

  const update = (id, key, val) =>
    setDinners(dinners.map(d => d.id === id ? { ...d, [key]: val } : d))

  const save = async (d, opts = {}) => {
    setMsg(null); setBusyId(d.id)
    try {
      const res = await fetch('/api/admin/team-dinners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          id: d.id,
          hostNames: opts.reopen ? '' : (d.hostNames || ''),
          address:   opts.reopen ? '' : (d.address || ''),
          notes:     d.notes || '',
          status:    opts.reopen ? 'open' : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      await load()
      setMsg({ ok: true, text: opts.reopen ? 'Dinner reopened.' : 'Saved.' })
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-heading uppercase tracking-wide text-white">Team Dinners</h2>
        <p className="text-xs text-zinc-500 mt-1">Who's hosting each Thursday dinner (Parents page). Hosting provides food, drinks &amp; desserts. Set a host name + address, or reopen a date.</p>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg text-sm px-4 py-3 border ${msg.ok
          ? 'bg-field-900/40 border-field-500/30 text-field-300'
          : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>{msg.text}</div>
      )}

      {dinners === null ? <Loading label="Loading team dinners…" /> : (
        <div className="space-y-3">
          {dinners.filter(d => !d.isBye).map(d => (
            <div key={d.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="font-heading uppercase tracking-wide text-white text-sm">
                  {dateStr(d.dinnerDate)} · vs {d.opponent || '—'}
                </div>
                <StatusPill status={d.status} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Who's hosting</label>
                  <input className="input" value={d.hostNames || ''} placeholder="Family / group name"
                    onChange={e => update(d.id, 'hostNames', e.target.value)} />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input" value={d.address || ''} placeholder="Street address"
                    onChange={e => update(d.id, 'address', e.target.value)} />
                </div>
              </div>
              {(d.hostEmail || d.hostPhone) && (
                <p className="mt-2 text-xs text-zinc-500">
                  Signed up by {d.hostEmail || ''}{d.hostEmail && d.hostPhone ? ' · ' : ''}{d.hostPhone || ''}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" onClick={() => save(d)} disabled={busyId === d.id}>
                  {busyId === d.id ? 'Saving…' : 'Save'}
                </Button>
                {d.status === 'booked' && (
                  <Button size="sm" variant="outline" onClick={() => save(d, { reopen: true })} disabled={busyId === d.id}>
                    Reopen
                  </Button>
                )}
              </div>

              <DonationManager dinner={d} reload={load} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Admin manager for a dinner's potluck donations: add / edit / remove on a
// parent's behalf.
function DonationManager({ dinner, reload }) {
  const [adding, setAdding] = useState(false)
  const rows = dinner.donations || []
  return (
    <div className="mt-4 pt-3 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-heading uppercase tracking-wider text-[0.65rem] text-zinc-500">Donations (potluck)</span>
        {!adding && <button onClick={() => setAdding(true)} className="text-xs text-field-400 hover:text-field-300">+ Add donation</button>}
      </div>
      <div className="space-y-2">
        {rows.map(don => <DonationRow key={don.id} donation={don} reload={reload} />)}
        {adding && <DonationRow dinner={dinner} isNew onDone={() => setAdding(false)} reload={reload} />}
        {!adding && rows.length === 0 && <p className="text-xs text-zinc-600">No donations yet.</p>}
      </div>
    </div>
  )
}

function DonationRow({ donation, dinner, reload, isNew, onDone }) {
  const [name, setName] = useState(donation?.donorName || '')
  const [picks, setPicks] = useState({ food: donation?.food || false, drinks: donation?.drinks || false, desserts: donation?.desserts || false })
  const [notes, setNotes] = useState({ food: donation?.foodNote || '', drinks: donation?.drinksNote || '', desserts: donation?.dessertsNote || '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const toggle = k => setPicks(p => ({ ...p, [k]: !p[k] }))

  const post = async (payload) => {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/admin/team-dinner-donations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (onDone) onDone()
      await reload()
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  const save = () => post({
    action: isNew ? 'add' : 'update',
    ...(isNew ? { dinnerId: dinner.id } : { id: donation.id }),
    donorName: name.trim(),
    food: picks.food, drinks: picks.drinks, desserts: picks.desserts,
    foodNote: notes.food.trim(), drinksNote: notes.drinks.trim(), dessertsNote: notes.desserts.trim(),
  })

  return (
    <div className="rounded-lg border border-white/10 bg-charcoal-900/60 p-3">
      <input className="input !py-2 text-sm" placeholder="Name (parent / family)" value={name} onChange={e => setName(e.target.value)} />
      <div className="mt-2 space-y-1.5">
        {[['food', '🍽️ Food', 'e.g. Tri-tip'], ['drinks', '🥤 Drinks', 'e.g. Water'], ['desserts', '🍰 Dessert', 'e.g. Brownies']].map(([k, lbl, ph]) => (
          <div key={k} className="flex items-center gap-2">
            <button type="button" onClick={() => toggle(k)}
              className={`shrink-0 w-24 rounded-md border px-2 py-1.5 text-[0.7rem] font-heading uppercase tracking-wide text-center transition ${
                picks[k] ? 'bg-field-600 border-field-500 text-white' : 'bg-charcoal-800 border-white/10 text-zinc-400 hover:border-white/25'}`}>
              {lbl}
            </button>
            <input className="input !py-1.5 text-sm flex-1 disabled:opacity-40" placeholder={picks[k] ? ph : '—'}
              value={notes[k]} onChange={e => setNotes(n => ({ ...n, [k]: e.target.value }))} disabled={!picks[k]} />
          </div>
        ))}
      </div>
      {err && <p className="text-xs text-red-300 mt-2">{err}</p>}
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={save} disabled={busy}>{busy ? '…' : isNew ? 'Add' : 'Save'}</Button>
        {isNew
          ? <Button size="sm" variant="outline" onClick={onDone} disabled={busy}>Cancel</Button>
          : <Button size="sm" variant="outline" onClick={() => post({ action: 'remove', id: donation.id })} disabled={busy}>Remove</Button>}
      </div>
    </div>
  )
}

// ── Communications / CRM ─────────────────────────────────────────────────────
const TAG_STYLE = {
  Account:          'bg-white/10 text-zinc-300',
  Donor:            'bg-field-500/20 text-field-300',
  Sponsor:          'bg-amber-500/20 text-amber-300',
  'Country Nights': 'bg-emerald-500/20 text-emerald-300',
  Event:            'bg-sky-500/20 text-sky-300',
}
const CRM_FILTERS = [
  { key: 'all',           label: 'All' },
  { key: 'subscribed',    label: 'Subscribed' },
  { key: 'donors',        label: 'Donors' },
  { key: 'sponsors',      label: 'Sponsors' },
  { key: 'countryNights', label: 'Country Nights' },
  { key: 'accounts',      label: 'Accounts' },
]

function csvDownload(filename, contacts) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = ['Name', 'Email', 'Phone', 'Roles', 'Total Given', 'Email Opt-In', 'Last Activity']
  const lines = [header.map(q).join(',')]
  for (const c of contacts) {
    lines.push([c.name, c.email, c.phone, c.tags.join(' / '),
      (c.totalCents / 100).toFixed(2), c.optIn ? 'Yes' : 'No',
      c.lastActivity ? new Date(c.lastActivity).toLocaleDateString('en-US') : ''].map(q).join(','))
  }
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function CommunicationsSection() {
  const { loading, data } = useData('/api/admin/crm')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  if (loading) return <Loading label="Loading contacts…" />
  const summary = data?.summary || {}
  const contacts = Array.isArray(data?.contacts) ? data.contacts : []

  const matchFilter = c =>
    filter === 'all' ? true
    : filter === 'subscribed' ? (c.optIn && c.email)
    : filter === 'donors' ? c.tags.includes('Donor')
    : filter === 'sponsors' ? c.tags.includes('Sponsor')
    : filter === 'countryNights' ? c.tags.includes('Country Nights')
    : filter === 'accounts' ? c.tags.includes('Account')
    : true
  const needle = q.trim().toLowerCase()
  const rows = contacts.filter(c => matchFilter(c) &&
    (!needle || c.name.toLowerCase().includes(needle) || c.email.includes(needle) || c.phone.includes(needle)))

  const STATS = [
    { label: 'Contacts', value: summary.total ?? 0 },
    { label: 'Subscribed', value: summary.subscribed ?? 0 },
    { label: 'Donors + Sponsors', value: (summary.donors ?? 0) + (summary.sponsors ?? 0) },
    { label: 'Country Nights', value: summary.countryNights ?? 0 },
  ]

  const subscribed = contacts.filter(c => c.optIn && c.email)

  return (
    <div className="space-y-6">
      <StatStrip stats={STATS} />

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {CRM_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wide transition ${
                filter === f.key ? 'bg-field-500 text-white' : 'bg-white/[0.04] text-zinc-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => csvDownload('subscribed-emails.csv', subscribed)}
            disabled={!subscribed.length}>Export Subscribed ({subscribed.length})</Button>
          <Button size="sm" onClick={() => csvDownload('contacts.csv', rows)} disabled={!rows.length}>Export CSV</Button>
        </div>
      </div>

      <input className="input" placeholder="Search name, email, or phone…" value={q} onChange={e => setQ(e.target.value)} />

      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[0.7rem] uppercase tracking-wider text-zinc-500 border-b border-white/[0.06]">
              <th className="px-4 py-3 font-heading">Name</th>
              <th className="px-4 py-3 font-heading">Contact</th>
              <th className="px-4 py-3 font-heading">Roles</th>
              <th className="px-4 py-3 font-heading text-right">Given</th>
              <th className="px-4 py-3 font-heading text-center">Opt-In</th>
              <th className="px-4 py-3 font-heading">Last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={i} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 text-white whitespace-nowrap">{c.name}</td>
                <td className="px-4 py-3 text-zinc-400">
                  <div>{c.email || <span className="text-zinc-600">no email</span>}</div>
                  {c.phone && <div className="text-xs text-zinc-500">{c.phone}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map(t => (
                      <span key={t} className={`px-2 py-0.5 rounded text-[0.65rem] font-heading uppercase tracking-wide ${TAG_STYLE[t] || 'bg-white/10 text-zinc-300'}`}>{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-300 whitespace-nowrap">{c.totalCents ? money(c.totalCents / 100) : '—'}</td>
                <td className="px-4 py-3 text-center">{c.optIn ? <span className="text-field-400">✓</span> : <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{c.lastActivity ? dateStr(c.lastActivity) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="px-4 py-10 text-center text-sm text-zinc-500">No contacts match.</div>}
      </div>

      <p className="text-xs text-zinc-600">
        Only contacts who checked the email opt-in (or account newsletter) count as Subscribed. Export the subscribed list to send promos through your email tool.
      </p>
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
  const [smtp, setSmtp] = useState({ host: '', user: '', port: '465', pass: '' })
  const [msg, setMsg] = useState(null) // { ok, text }
  const [busy, setBusy] = useState('')

  const loadConfig = () =>
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(c => {
        setConfig(c)
        if (c) setSmtp(s => ({ ...s, host: c.smtp_host || '', user: c.smtp_user || 'noreply@greenmileboosters.org', port: String(c.smtp_port || 465) }))
      })
      .catch(() => setConfig(null))

  useEffect(() => { loadConfig() }, [])

  const saveSmtp = async () => {
    setMsg(null); setBusy('smtp')
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ action: 'set_smtp', value: {
          host: smtp.host.trim(), user: smtp.user.trim(), port: smtp.port.trim(),
          secure: parseInt(smtp.port, 10) === 465,
          ...(smtp.pass ? { pass: smtp.pass } : {}),
        } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMsg({ ok: true, text: smtp.host.trim() ? 'MXroute SMTP saved — receipts now send through it.' : 'SMTP cleared — using Resend.' })
      setSmtp(s => ({ ...s, pass: '' }))
      loadConfig()
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy('') }
  }

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

        {/* EMAIL — MXroute SMTP + Resend */}
        {tab === 'email' && (
          <div className="max-w-xl space-y-8">
            {/* MXroute SMTP (preferred) */}
            <div>
              <label className="label">MXroute SMTP (send from noreply@greenmileboosters.org)</label>
              <div className="text-xs mb-3">
                {config === null ? <span className="text-zinc-600">Checking…</span>
                  : config?.smtp_configured
                    ? <span className="text-field-400">✓ Active — receipts send through {config.smtp_host}{config.smtp_from_env ? ' (from environment variables)' : ''}</span>
                    : <span className="text-amber-400">Not set — receipts fall back to Resend</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[0.7rem] text-zinc-500 mb-1">SMTP host</div>
                  <input className="input" placeholder="e.g. mail.mxrouting.net" value={smtp.host}
                         onChange={e => setSmtp({ ...smtp, host: e.target.value })} autoComplete="off" />
                </div>
                <div>
                  <div className="text-[0.7rem] text-zinc-500 mb-1">Port</div>
                  <select className="input" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: e.target.value })}>
                    <option value="465">465 (SSL)</option>
                    <option value="587">587 (STARTTLS)</option>
                  </select>
                </div>
                <div>
                  <div className="text-[0.7rem] text-zinc-500 mb-1">Username (full email)</div>
                  <input className="input" placeholder="noreply@greenmileboosters.org" value={smtp.user}
                         onChange={e => setSmtp({ ...smtp, user: e.target.value })} autoComplete="off" />
                </div>
                <div>
                  <div className="text-[0.7rem] text-zinc-500 mb-1">Mailbox password {config?.smtp_pass_set && <span className="text-field-400">· saved</span>}</div>
                  <input className="input" type="password" placeholder={config?.smtp_pass_set ? '•••••• (unchanged)' : 'mailbox password'} value={smtp.pass}
                         onChange={e => setSmtp({ ...smtp, pass: e.target.value })} autoComplete="new-password" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="md" onClick={saveSmtp} disabled={busy === 'smtp' || (!smtp.host.trim() && !config?.smtp_configured)}>
                  {busy === 'smtp' ? 'Saving…' : 'Save SMTP'}
                </Button>
                {config?.smtp_configured && (
                  <Button size="md" variant="outline" onClick={() => { setSmtp({ host: '', user: 'noreply@greenmileboosters.org', port: '465', pass: '' }); saveSmtp() }} disabled={busy === 'smtp'}>
                    Clear
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-600">For deliverability, make sure SPF and DKIM for the domain are set in MXroute. The password is stored server-side and never shown again.</p>
            </div>

            {/* Resend (fallback) */}
            <div className="border-t border-white/[0.07] pt-6">
              <label className="label">Resend API key (fallback)</label>
              <div className="text-xs mb-2">
                {config === null ? <span className="text-zinc-600">Checking…</span>
                  : config?.resend_configured
                    ? <span className="text-field-400">✓ Configured {config.resend_key_hint}{config.resend_from_env ? ' (set via environment variable)' : ''}</span>
                    : <span className="text-zinc-500">Optional — used only if SMTP isn't set or fails</span>}
              </div>
              <div className="flex gap-2">
                <input className="input" type="password" placeholder="re_…" value={resendKey}
                       onChange={e => setResendKey(e.target.value)} autoComplete="off" />
                <Button size="md" variant="outline" onClick={saveResend} disabled={busy === 'key' || !resendKey.trim()}>
                  {busy === 'key' ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Test */}
            <div className="border-t border-white/[0.07] pt-6">
              <label className="label">Send a test receipt to</label>
              <div className="flex gap-2">
                <input className="input" type="email" placeholder="you@email.com" value={testTo}
                       onChange={e => setTestTo(e.target.value)} />
                <Button size="md" onClick={sendTest}
                        disabled={busy === 'test' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo.trim())}>
                  {busy === 'test' ? 'Sending…' : 'Send Test'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-zinc-600">Sends through whichever transport is active (SMTP if set, otherwise Resend).</p>
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
