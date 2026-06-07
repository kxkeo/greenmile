// GET /api/staff/active-events
// Returns every campaign that is currently active AND uses event_registrations
// (alumni, fundraiser, dinner) — the campaigns that the Event Check-In list
// can actually open — together with rolled-up registration counts. One SQL
// round-trip so the EventList page doesn't have to fan-out N+1 fetches.
//
// Auth: same as everything else under /api/staff/* (admin || staff role ||
// event_staff via code login).

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT c.id, c.title, c.type, c.event_date, c.location, c.price_cents,
              COUNT(er.id) AS total,
              SUM(CASE WHEN er.checked_in     = 1 THEN 1 ELSE 0 END) AS checked_in,
              SUM(CASE WHEN er.shirt_assigned = 1 THEN 1 ELSE 0 END) AS shirts_out,
              SUM(CASE WHEN er.payment_status = 'paid' THEN 1 ELSE 0 END) AS paid
       FROM campaigns c
       LEFT JOIN event_registrations er ON er.campaign_id = c.id
       WHERE c.status = 'active'
         AND c.type IN ('alumni', 'fundraiser', 'dinner')
       GROUP BY c.id
       ORDER BY c.event_date DESC`
    ).all()

    return json({
      campaigns: (results || []).map(r => ({
        id:         r.id,
        title:      r.title,
        type:       r.type,
        event_date: r.event_date,
        location:   r.location,
        price_cents: r.price_cents,
        stats: {
          total:     Number(r.total)      || 0,
          checkedIn: Number(r.checked_in) || 0,
          shirtsOut: Number(r.shirts_out) || 0,
          paid:      Number(r.paid)       || 0,
        },
      })),
    })
  } catch (e) {
    console.error('[staff/active-events]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
