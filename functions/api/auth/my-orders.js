// GET /api/auth/my-orders — participant order history

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestGet({ request, env }) {
  const cookie = request.headers.get('cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return json({ error: 'Not authenticated' }, 401)
  const raw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!raw) return json({ error: 'Session expired' }, 401)
  const { participantId } = JSON.parse(raw)
  if (!participantId) return json({ error: 'Not authenticated' }, 401)

  const { results: orders } = await env.DB.prepare(
    'SELECT * FROM store_orders WHERE participant_id=? ORDER BY created_at DESC'
  ).bind(participantId).all()

  const full = await Promise.all(orders.map(async o => {
    const { results: items } = await env.DB.prepare(
      'SELECT * FROM store_order_items WHERE order_id=?'
    ).bind(o.id).all()
    return { ...o, items }
  }))

  return json(full)
}
