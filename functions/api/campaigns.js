// GET /api/campaigns — public endpoint, returns active campaigns only (inactive/draft/closed are hidden)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url)
    const all = url.searchParams.get('all') === '1'

    const query = all
      ? 'SELECT * FROM campaigns ORDER BY created_at DESC'
      : "SELECT * FROM campaigns WHERE status = 'active' ORDER BY event_date ASC"

    const { results } = await env.DB.prepare(query).all()

    const rows = results.map(r => ({
      ...r,
      meta: (() => { try { return JSON.parse(r.meta || '{}') } catch { return {} } })(),
    }))

    // For capped campaigns (meta.max_tickets, e.g. raffles) expose how many
    // tickets are already sold so the UI can show remaining availability.
    for (const r of rows) {
      if (r.meta?.max_tickets > 0) {
        const sold = await env.DB.prepare(
          `SELECT COALESCE(SUM(ticket_qty), 0) AS n FROM event_registrations
           WHERE campaign_id = ? AND payment_status != 'refunded'`
        ).bind(r.id).first().catch(() => null)
        r.tickets_sold = sold?.n || 0
      }
    }

    return json(rows)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
