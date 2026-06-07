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

    return json(results.map(r => ({
      ...r,
      meta: (() => { try { return JSON.parse(r.meta || '{}') } catch { return {} } })(),
    })))
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
