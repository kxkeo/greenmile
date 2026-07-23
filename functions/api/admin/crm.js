// GET /api/admin/crm — booster CRM: a unified, deduped view of every contact
// the club has touched (account holders, donors, sponsors, event/Country Nights
// attendees), with their roles, lifetime giving, email-opt-in status, and last
// activity. Aggregated live from participants + donations + event_registrations
// so it never drifts. Auth: /api/admin/* is gated by _middleware.js.

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

const clean = s => (s == null ? '' : String(s)).trim()
const lower = s => clean(s).toLowerCase()
const cap = s => clean(s).replace(/\b\w/g, c => c.toUpperCase())

export async function onRequestGet({ env }) {
  try {
    const [parts, dons, regs, camps] = await Promise.all([
      env.DB.prepare(`SELECT first_name, last_name, email, phone, newsletter, created_at FROM participants`).all(),
      env.DB.prepare(`SELECT first_name, last_name, email, amount_cents, tier_label, notes, email_opt_in, created_at FROM donations WHERE payment_status != 'refunded'`).all(),
      env.DB.prepare(`SELECT first_name, last_name, email, phone, campaign_id, total_cents, email_opt_in, created_at FROM event_registrations WHERE payment_status != 'refunded'`).all(),
      env.DB.prepare(`SELECT id, title, meta FROM campaigns`).all(),
    ])

    // Which campaigns are Country Nights (ticket + raffle)?
    const cnIds = new Set()
    for (const c of (camps.results || [])) {
      let slug = ''
      try { slug = JSON.parse(c.meta || '{}').slug || '' } catch {}
      if (/^country-nights/.test(slug) || /country nights/i.test(c.title || '')) cnIds.add(c.id)
    }

    // key: email if present, else name+phone so anonymous-ish rows still merge.
    const map = new Map()
    const keyFor = (email, name, phone) => lower(email) || `${lower(name)}|${clean(phone)}`
    const get = (email, first, last, phone) => {
      const name = clean(`${clean(first)} ${clean(last)}`) || clean(email) || 'Unknown'
      const k = keyFor(email, name, phone)
      let c = map.get(k)
      if (!c) {
        c = { name, email: lower(email) || '', phone: clean(phone), tags: new Set(),
              totalCents: 0, optIn: false, lastActivity: null }
        map.set(k, c)
      }
      // Fill in any missing bits from later sources.
      if (!c.email && email) c.email = lower(email)
      if (!c.phone && phone) c.phone = clean(phone)
      if ((c.name === 'Unknown' || !c.name) && name) c.name = name
      return c
    }
    const touch = (c, at) => { if (at && (!c.lastActivity || at > c.lastActivity)) c.lastActivity = at }

    // Accounts
    for (const p of (parts.results || [])) {
      const c = get(p.email, p.first_name, p.last_name, p.phone)
      c.tags.add('Account')
      if (p.newsletter === 1) c.optIn = true
      touch(c, p.created_at)
    }
    // Donations & sponsorships
    for (const d of (dons.results || [])) {
      const c = get(d.email, d.first_name, d.last_name, null)
      const isSponsor = /sponsor/i.test(d.tier_label || '') || /^sponsorship/i.test(d.notes || '')
      c.tags.add(isSponsor ? 'Sponsor' : 'Donor')
      c.totalCents += (parseInt(d.amount_cents, 10) || 0)
      if (d.email_opt_in === 1) c.optIn = true
      touch(c, d.created_at)
    }
    // Event / Country Nights attendees
    for (const r of (regs.results || [])) {
      const c = get(r.email, r.first_name, r.last_name, r.phone)
      c.tags.add(cnIds.has(r.campaign_id) ? 'Country Nights' : 'Event')
      c.totalCents += (parseInt(r.total_cents, 10) || 0)
      if (r.email_opt_in === 1) c.optIn = true
      touch(c, r.created_at)
    }

    const contacts = [...map.values()]
      .map(c => ({ ...c, name: cap(c.name), tags: [...c.tags] }))
      .sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''))

    const has = (c, t) => c.tags.includes(t)
    const summary = {
      total:         contacts.length,
      subscribed:    contacts.filter(c => c.optIn && c.email).length,
      accounts:      contacts.filter(c => has(c, 'Account')).length,
      donors:        contacts.filter(c => has(c, 'Donor')).length,
      sponsors:      contacts.filter(c => has(c, 'Sponsor')).length,
      countryNights: contacts.filter(c => has(c, 'Country Nights')).length,
      totalRaisedCents: contacts.reduce((s, c) => s + c.totalCents, 0),
    }

    return json({ summary, contacts })
  } catch (e) {
    console.error('[admin/crm]', e?.message, e?.stack)
    return json({ error: 'Could not load contacts.' }, 500)
  }
}
