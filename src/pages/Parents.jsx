import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero, SectionHeading, Button, Eyebrow, Loading } from '../components/ui'
import { IMG } from '../content/images'

// Parents hub — the 2026 Emperor Football team-dinner calendar. Parents host a
// team dinner the Thursday before each Friday game; logged-in families can claim
// any open date. Data comes from /api/team-dinners (booking via /book).

const fmtDate = (d, opts) => {
  if (!d) return ''
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', opts) }
  catch { return d }
}
const dayMonth = d => fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' })
const longDay  = d => fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })

const PERKS = [
  { icon: '🤝', title: 'Build Brotherhood', body: 'Stronger together, on the field and off.' },
  { icon: '🍽️', title: 'Enjoy a Meal', body: 'Good food, great company, the night before game day.' },
  { icon: '❤️', title: 'Create Memories', body: 'Moments that last long after the season.' },
  { icon: '🏈', title: 'Support Our Athletes', body: 'Fuel for 25–50 athletes and coaches.' },
]

export default function Parents() {
  const navigate = useNavigate()
  const [dinners, setDinners] = useState(undefined)
  const [participant, setParticipant] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [booking, setBooking] = useState(null)   // dinner being booked (hosted)
  const [donating, setDonating] = useState(null) // dinner being donated to
  const [toast, setToast] = useState('')

  const load = () => {
    // Members-only: the schedule endpoint requires a signed-in participant.
    fetch('/api/team-dinners', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { dinners: [] })
      .then(d => setDinners(Array.isArray(d.dinners) ? d.dinners : []))
      .catch(() => setDinners([]))
  }

  useEffect(() => {
    fetch('/api/auth/participant-me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const p = d?.firstName ? d : null
        setParticipant(p)
        if (p) load()               // only load the calendar once we know they're in
        else setDinners([])
      })
      .catch(() => setParticipant(null))
      .finally(() => setAuthChecked(true))
  }, [])

  const openCount = dinners?.filter(d => d.status === 'open' && !d.isBye).length || 0

  const onHostClick = (dinner) => {
    if (!participant) {
      navigate('/my-account/login?next=/parents')
      return
    }
    setBooking(dinner)
  }

  const onBooked = (dinner) => {
    setBooking(null)
    setToast(`You're hosting the ${dinner.opponent} week dinner — thank you! A confirmation is on its way.`)
    load()
    setTimeout(() => setToast(''), 8000)
  }

  const onDonated = (dinner) => {
    setDonating(null)
    setToast(`Thank you for pitching in on the ${dinner.opponent} week dinner!`)
    load()
    setTimeout(() => setToast(''), 8000)
  }

  return (
    <>
      <Hero
        image={IMG.huddle}
        eyebrow="Emperor Football Family"
        title={<>Parents</>}
        subtitle="Team dinners are where the brotherhood is built. Parents host a meal the night before each game — pick a date, plan a menu, and help create memories that last long after the season."
        minH="min-h-[58vh]"
      >
        <Button href="#calendar" size="lg">See the Calendar</Button>
      </Hero>

      {/* Appreciation — parents are the backbone */}
      <section className="relative overflow-hidden bg-gradient-to-b from-field-700 to-field-900 border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-field-lines opacity-40" />
        <div className="relative section py-16 text-center max-w-3xl">
          <Eyebrow className="mb-3 !text-field-200">You Are the Backbone</Eyebrow>
          <h2 className="display text-white text-3xl sm:text-4xl">None of This Happens Without You</h2>
          <p className="mt-5 text-field-50/90 leading-relaxed text-lg">
            In a town like Dinuba, Friday night lights aren't run by a big budget — they're
            carried by parents. The meals before every game, the rides, the fundraisers, the
            full stands, the little things nobody sees: that's you. You are the reason these
            boys get to just be players and chase something together.
          </p>
          <p className="mt-4 text-field-50/90 leading-relaxed">
            The boosters can raise every dollar we can, but it's <strong className="text-white">Emperor
            parents</strong> who keep the program running week to week. When you host a dinner, sign up
            for a shift, or simply show up, you're building the brotherhood on the field and the
            community around it. We couldn't do a single Friday night without you — and we don't take
            it for granted. Thank you for showing up for our kids.
          </p>
          <p className="mt-6 font-heading uppercase tracking-[0.2em] text-sm text-field-200">
            Together, we are Emperor Football.
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section className="section py-16">
        <SectionHeading eyebrow="Building brotherhood beyond the field" title="Why Team Dinners" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(p => (
            <div key={p.title} className="card p-6 text-center">
              <div className="text-4xl mb-3">{p.icon}</div>
              <h3 className="font-heading uppercase tracking-wide text-white">{p.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Calendar — members only */}
      <section id="calendar" className="bg-charcoal-850 border-y border-white/[0.06] scroll-mt-20">
        <div className="section py-16">
          {!authChecked ? (
            <div className="py-8"><Loading label="Loading…" /></div>
          ) : !participant ? (
            <MembersGate />
          ) : (
            <>
              <SectionHeading
                eyebrow="On the calendar"
                title="2026 Team Dinner Schedule"
                intro="Dinners are the Thursday before each Friday game, planned for 25–50 athletes and coaches. Booked dates show the family hosting. Open dates are up for grabs — claim one to host."
              />

              {toast && (
                <div className="mt-8 max-w-3xl mx-auto rounded-xl bg-field-500/15 border border-field-500/40 text-field-100 px-5 py-4 text-sm">
                  {toast}
                </div>
              )}

              {dinners === undefined ? (
                <div className="mt-12"><Loading label="Loading the dinner calendar…" /></div>
              ) : (
                <>
                  {openCount > 0 && (
                    <p className="mt-8 text-center text-sm text-zinc-400">
                      Welcome, {participant.firstName} — {openCount} open {openCount === 1 ? 'date' : 'dates'} still {openCount === 1 ? 'needs' : 'need'} a host.
                    </p>
                  )}

                  <div className="mt-10 max-w-3xl mx-auto space-y-3">
                    {dinners.map(d => (
                      <DinnerRow key={d.id} dinner={d} onHost={() => onHostClick(d)} onDonate={() => setDonating(d)} />
                    ))}
                  </div>

                  <p className="mt-10 text-center text-sm text-zinc-500">
                    Questions or want to host with another family? Contact{' '}
                    <a href="mailto:info@greenmileboosters.org" className="text-field-400 hover:text-field-300">info@greenmileboosters.org</a>{' '}
                    — or reach out to Adela or Anabel.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {booking && (
        <BookModal
          dinner={booking}
          participant={participant}
          onClose={() => setBooking(null)}
          onBooked={() => onBooked(booking)}
        />
      )}

      {donating && (
        <DonateModal
          dinner={donating}
          onClose={() => setDonating(null)}
          onDonated={() => onDonated(donating)}
        />
      )}
    </>
  )
}

function MembersGate() {
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-field-500 to-field-800 grid place-items-center text-3xl shadow-glow">
        🔒
      </div>
      <Eyebrow className="mt-6 mb-2">Emperor Families Only</Eyebrow>
      <h2 className="display text-white text-3xl sm:text-4xl">Sign In to See the Calendar</h2>
      <p className="mt-4 text-zinc-400 leading-relaxed">
        The team-dinner schedule and hosting sign-up are for signed-in Emperor
        football families. Create a free account with your email — that's how we send
        dinner reminders and game-week notifications — then you can view the calendar
        and claim a night to host.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button to="/my-account/signup?next=/parents" size="lg">Create Account</Button>
        <Button to="/my-account/login?next=/parents" variant="outline" size="lg">Sign In</Button>
      </div>
      <p className="mt-5 text-xs text-zinc-500">Free to join · Email required for dinner notifications</p>
    </div>
  )
}

function DinnerRow({ dinner, onHost, onDonate }) {
  if (dinner.isBye) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-charcoal-900/50 px-5 py-4 flex items-center justify-center">
        <span className="font-heading uppercase tracking-[0.2em] text-sm text-zinc-500">
          Bye Week · {dayMonth(dinner.dinnerDate)}
        </span>
      </div>
    )
  }

  const booked = dinner.status === 'booked'
  const donations = Array.isArray(dinner.donations) ? dinner.donations : []
  return (
    <div className="card p-5 flex flex-col sm:flex-row sm:items-start gap-4">
      {/* Date block */}
      <div className="shrink-0 text-center sm:w-24">
        <div className="font-display text-field-400 text-3xl leading-none">
          {fmtDate(dinner.dinnerDate, { day: 'numeric' })}
        </div>
        <div className="font-heading uppercase tracking-wide text-xs text-zinc-400 mt-1">
          {fmtDate(dinner.dinnerDate, { month: 'short' })} · Thu
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 border-t sm:border-t-0 sm:border-l border-white/[0.07] pt-3 sm:pt-0 sm:pl-4">
        <div className="font-heading uppercase tracking-wide text-white">
          vs {dinner.opponent}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          Game {longDay(dinner.gameDate)}
        </div>
        {booked ? (
          <div className="mt-1.5 text-sm text-field-300">
            Hosted by <span className="text-zinc-200">{dinner.hostNames || 'an Emperor family'}</span>
            {dinner.address ? <span className="text-zinc-500"> · {dinner.address}</span>
              : dinner.hostLocation ? <span className="text-zinc-500"> · {dinner.hostLocation}</span> : null}
          </div>
        ) : (
          <div className="mt-1.5 text-sm text-zinc-400">Open — this dinner needs a host.</div>
        )}

        {/* Potluck donations */}
        {donations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="font-heading uppercase tracking-wider text-[0.65rem] text-zinc-500 mb-1.5">Parents bringing</div>
            <ul className="space-y-1">
              {donations.map((d, i) => (
                <li key={i} className="text-sm text-zinc-300 flex flex-wrap gap-x-2">
                  <span className="text-zinc-200">{d.name}</span>
                  <span className="text-field-300">{d.items.join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action — Booked / Host + Donate, all the same size. Host is white
          until the date is claimed, then it becomes the green Booked block. */}
      <div className="shrink-0 flex sm:flex-col gap-2 sm:w-44">
        {booked ? (
          <span className="flex-1 sm:w-full inline-flex items-center justify-center font-heading uppercase tracking-[0.12em] text-[0.9rem] font-bold text-white bg-field-500 px-6 py-3">
            ✓ Booked
          </span>
        ) : (
          <Button onClick={onHost} size="sm" className="flex-1 sm:w-full !bg-white !text-field-700 hover:!bg-field-50">Host This Dinner</Button>
        )}
        <Button onClick={onDonate} variant="outline" size="sm" className="flex-1 sm:w-full">Donate</Button>
      </div>
    </div>
  )
}

function BookModal({ dinner, participant, onClose, onBooked }) {
  const defaultHost = `${participant?.firstName || ''} ${participant?.lastName || ''}`.trim()
  const [form, setForm] = useState({ hostNames: defaultHost, address: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.address.trim()) { setError('Please add the address where the dinner will be held.'); return }
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/team-dinners/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dinnerId: dinner.id,
          hostNames: form.hostNames.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not book this dinner.')
      onBooked()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md card p-7 sm:p-8" onClick={e => e.stopPropagation()}>
        <Eyebrow className="mb-2">Host a Team Dinner</Eyebrow>
        <h2 className="display text-white text-3xl">vs {dinner.opponent}</h2>
        <p className="mt-1 text-sm text-zinc-400">Dinner {longDay(dinner.dinnerDate)} · game {longDay(dinner.gameDate)}</p>

        <div className="mt-5 rounded-lg bg-field-900/30 border border-field-500/25 px-4 py-3 text-sm text-field-100">
          Hosting means providing <strong>food, drinks, and desserts</strong> for 25–50 athletes and coaches.
        </div>

        <form onSubmit={submit} className="mt-5 space-y-5">
          <div>
            <label className="label">Who's hosting</label>
            <input className="input" value={form.hostNames} onChange={e => set('hostNames', e.target.value)} placeholder="Your name or family/group" />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Where the dinner will be held" required />
          </div>
          <div>
            <label className="label">Notes for the coaches <span className="text-zinc-600 normal-case">(optional)</span></label>
            <textarea className="input min-h-[80px]" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Menu ideas, families helping, anything to share…" />
          </div>

          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

          <div className="flex gap-3">
            <Button type="button" onClick={onClose} variant="outline" size="md" className="flex-1">Cancel</Button>
            <Button size="md" className="flex-1" disabled={busy}>{busy ? 'Booking…' : 'Confirm Hosting'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DONATE_ITEMS = [
  { key: 'food',     label: '🍽️ Food',    placeholder: 'e.g. Tri-tip sandwiches' },
  { key: 'drinks',   label: '🥤 Drinks',   placeholder: 'e.g. Water & Gatorade' },
  { key: 'desserts', label: '🍰 Dessert',  placeholder: 'e.g. Brownies' },
]

function DonateModal({ dinner, onClose, onDonated }) {
  const [picks, setPicks] = useState({ food: false, drinks: false, desserts: false })
  const [notes, setNotes] = useState({ food: '', drinks: '', desserts: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toggle = k => setPicks(p => ({ ...p, [k]: !p[k] }))
  const setNote = (k, v) => setNotes(n => ({ ...n, [k]: v }))
  const any = picks.food || picks.drinks || picks.desserts

  const submit = async (e) => {
    e.preventDefault()
    if (!any) { setError('Pick at least one: food, drinks, or dessert.'); return }
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/team-dinners/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dinnerId: dinner.id,
          food: picks.food, drinks: picks.drinks, desserts: picks.desserts,
          foodNote: notes.food.trim(), drinksNote: notes.drinks.trim(), dessertsNote: notes.desserts.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save your donation.')
      onDonated()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md card p-7 sm:p-8" onClick={e => e.stopPropagation()}>
        <Eyebrow className="mb-2">Donate to This Dinner</Eyebrow>
        <h2 className="display text-white text-3xl">vs {dinner.opponent}</h2>
        <p className="mt-1 text-sm text-zinc-400">Dinner {longDay(dinner.dinnerDate)}</p>
        <p className="mt-4 text-sm text-zinc-400">Pick what you'll bring, then add what you're bringing.</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {DONATE_ITEMS.map(({ key, label, placeholder }) => {
            const on = picks[key]
            return (
              <div key={key} className="flex items-center gap-2">
                <button type="button" onClick={() => toggle(key)}
                  className={`shrink-0 w-32 rounded-lg border px-3 py-3 text-sm font-heading uppercase tracking-wide transition text-left ${
                    on ? 'bg-field-600 border-field-500 text-white' : 'bg-charcoal-900 border-white/10 text-zinc-400 hover:border-white/25'
                  }`}>
                  {label}
                </button>
                <input
                  className="input flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  value={notes[key]}
                  onChange={e => setNote(key, e.target.value)}
                  placeholder={on ? placeholder : 'Select to add details'}
                  disabled={!on}
                />
              </div>
            )
          })}

          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button type="button" onClick={onClose} variant="outline" size="md" className="flex-1">Cancel</Button>
            <Button size="md" className="flex-1" disabled={busy}>{busy ? 'Saving…' : 'Confirm Donation'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
