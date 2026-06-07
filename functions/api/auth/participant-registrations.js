// GET /api/auth/participant-registrations
// Returns all registrations for the logged-in participant (parent)
// Camp: grouped by participant — one entry with all kids as children[]
// Golf: one per registration
// Event (alumni, fundraiser, other): one per registration

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

async function getParticipantId(request, env) {
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return null
  const raw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!raw) return null
  try { return JSON.parse(raw).participantId } catch { return null }
}

export async function onRequestGet({ request, env }) {
  const participantId = await getParticipantId(request, env)
  if (!participantId) return json({ error: 'Not authenticated' }, 401)

  try {
    // ── Camp registrations — all rows for this parent ──────────────────────
    const { results: campRows } = await env.DB.prepare(`
      SELECT
        cr.id, cr.player_first_name, cr.player_last_name,
        cr.tshirt_size, cr.payment_status, cr.total_cents,
        cr.checked_in, cr.referred_by, cr.created_at,
        e.date AS event_date, e.title AS event_title,
        c.title AS campaign_title, c.location
      FROM camp_registrations cr
      LEFT JOIN events e ON e.id = cr.event_id
      LEFT JOIN campaigns c ON c.type = 'camp' AND c.status = 'active'
      WHERE cr.participant_id = ?
      ORDER BY cr.created_at DESC
    `).bind(participantId).all()

    // Group camp rows by event date (one card per registration session)
    // Group by created_at date (same day = same session)
    const campGroups = {}
    for (const row of campRows) {
      const dateKey = `${row.event_date || 'nodate'}`  // one group per event per parent
      if (!campGroups[dateKey]) {
        campGroups[dateKey] = {
          type: 'camp',
          eventDate: row.event_date,
          eventTitle: row.campaign_title || row.event_title || 'Emperors Baseball Camp',
          location: row.location || null,
          paymentStatus: row.payment_status,
          totalCents: 0,
          registeredAt: row.created_at,
          _latestAt: row.created_at,
          players: [],
        }
      }
      campGroups[dateKey].totalCents += row.total_cents || 0
      campGroups[dateKey].players.push({
        id: row.id,
        firstName: row.player_first_name,
        lastName:  row.player_last_name,
        shirtSize: row.tshirt_size,
        checkedIn: row.checked_in === 1,
      })
    }
    const campRegistrations = Object.values(campGroups)

    // ── Golf registrations ─────────────────────────────────────────────────
    const { results: golfRows } = await env.DB.prepare(`
      SELECT
        gr.id, gr.sponsor, gr.entry_type, gr.total_cents,
        gr.payment_status, gr.created_at, gr.referred_by,
        c.title AS campaign_title, c.event_date, c.location
      FROM golf_registrations gr
      LEFT JOIN campaigns c ON c.type = 'golf'
      WHERE gr.participant_id = ?
      ORDER BY gr.created_at DESC
    `).bind(participantId).all()

    // Fetch team members for all golf registrations in one query
    let teamMemberMap = {}
    if (golfRows.length > 0) {
      const placeholders = golfRows.map(() => '?').join(',')
      const { results: memberRows } = await env.DB.prepare(
        `SELECT registration_id, slot, name, email, phone FROM golf_team_members WHERE registration_id IN (${placeholders}) ORDER BY slot ASC`
      ).bind(...golfRows.map(r => r.id)).all()
      for (const m of memberRows) {
        if (!teamMemberMap[m.registration_id]) teamMemberMap[m.registration_id] = []
        teamMemberMap[m.registration_id].push({ slot: m.slot, name: m.name, email: m.email, phone: m.phone })
      }
    }

    const golfRegistrations = golfRows.map(r => ({
      type: 'golf',
      id: r.id,
      eventTitle: r.campaign_title || 'Emperors Golf Tournament',
      eventDate: r.event_date,
      location: r.location,
      sponsor: r.sponsor,
      entryType: r.entry_type,
      totalCents: r.total_cents,
      paymentStatus: r.payment_status,
      registeredAt: r.created_at,
      team: teamMemberMap[r.id] || [],
    }))

    // ── Event registrations (alumni, fundraiser, other) ────────────────────
    const { results: eventRows } = await env.DB.prepare(`
      SELECT
        er.id, er.ticket_qty, er.total_cents, er.payment_status,
        er.checked_in, er.shirt_size, er.created_at,
        c.title, c.type, c.event_date, c.location
      FROM event_registrations er
      JOIN campaigns c ON c.id = er.campaign_id
      WHERE er.participant_id = ?
      ORDER BY er.created_at DESC
    `).bind(participantId).all()

    const eventRegistrations = eventRows.map(r => ({
      type: r.type || 'event',
      id: r.id,
      eventTitle: r.title,
      eventDate: r.event_date,
      location: r.location,
      ticketQty: r.ticket_qty,
      shirtSize: r.shirt_size,
      totalCents: r.total_cents,
      paymentStatus: r.payment_status,
      checkedIn: r.checked_in === 1,
      registeredAt: r.created_at,
    }))

    return json({
      camp:  campRegistrations,
      golf:  golfRegistrations,
      event: eventRegistrations,
    })

  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
