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

      <p className="mt-10 text-sm text-zinc-500">
        Full management tools (campaigns, store, registrations editing, game-day) run on the same
        backend and are being brought into this new admin design. Reach out to prioritize what's next.
      </p>
    </section>
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
      <span className="text-field-400 font-heading whitespace-nowrap">{right}</span>
    </div>
  )
}
