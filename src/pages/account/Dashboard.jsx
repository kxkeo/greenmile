import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button, Loading, SectionHeading } from '../../components/ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const [me, setMe] = useState(undefined)

  useEffect(() => {
    fetch('/api/auth/participant-me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.firstName) { navigate('/my-account/login'); return }
        setMe(d)
      })
      .catch(() => navigate('/my-account/login'))
  }, [navigate])

  const logout = async () => {
    await fetch('/api/auth/participant-logout', { method: 'POST', credentials: 'include' }).catch(() => {})
    navigate('/')
  }

  if (me === undefined) return <Loading label="Loading your account…" />

  return (
    <section className="section py-16 min-h-[70vh]">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <div className="eyebrow mb-2">My Account</div>
          <h1 className="display text-white text-4xl">Hey, {me.firstName} 👋</h1>
        </div>
        <Button onClick={logout} variant="outline" size="md">Log out</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-7">
          <div className="font-heading uppercase tracking-wide text-white mb-4">Profile</div>
          <dl className="space-y-3 text-sm">
            <Row label="Name" value={`${me.firstName} ${me.lastName}`} />
            <Row label="Email" value={me.email || '—'} />
            <Row label="Phone" value={me.phone || '—'} />
            <Row label="Newsletter" value={me.newsletter ? 'Subscribed' : 'Off'} />
          </dl>
        </div>

        <div className="card p-7 lg:col-span-2">
          <div className="font-heading uppercase tracking-wide text-white mb-4">Get Involved</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <ActionCard to="/volunteer" icon="🙌" title="Volunteer" body="Browse roles and sign up for game-day shifts." />
            <ActionCard to="/events" icon="📅" title="Events" body="See what's coming up and register." />
            <ActionCard to="/donate" icon="💚" title="Donate" body="Make a gift to Emperors football." />
            <ActionCard to="/shop" icon="🛍️" title="Shop" body="Rep the green and white." />
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-200 text-right">{value}</dd>
    </div>
  )
}

function ActionCard({ to, icon, title, body }) {
  return (
    <Link to={to} className="rounded-xl border border-white/[0.07] bg-charcoal-900 p-5 hover:border-field-500/40 hover:-translate-y-0.5 transition-all">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-heading uppercase tracking-wide text-white text-sm">{title}</div>
      <p className="mt-1 text-xs text-zinc-400">{body}</p>
    </Link>
  )
}
