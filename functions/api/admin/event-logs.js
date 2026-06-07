// GET /api/admin/event-logs — chronological audit log of event-day actions.
// Query params (all optional):
//   limit       — default 200, hard-capped at 1000
//   campaignId  — filter to one campaign
//   action      — filter to one action type (check_in, shirt_given, etc.)
//   actorRole   — filter to admin|staff|event_staff
// Access: /api/admin/* middleware allows admin + the email+password staff role.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const limit      = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 200))
  const campaignId = url.searchParams.get('campaignId')
  const action     = url.searchParams.get('action')
  const actorRole  = url.searchParams.get('actorRole')

  const where = []
  const binds = []
  if (campaignId) { where.push('l.campaign_id = ?'); binds.push(parseInt(campaignId, 10) || 0) }
  if (action)     { where.push('l.action = ?');      binds.push(action) }
  if (actorRole)  { where.push('l.actor_role = ?');  binds.push(actorRole) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const { results } = await env.DB.prepare(
      `SELECT l.id, l.actor_id, l.actor_role, l.actor_name, l.action,
              l.target_type, l.target_id, l.target_label,
              l.campaign_id, l.meta, l.created_at,
              c.title AS campaign_title, c.type AS campaign_type
       FROM event_logs l
       LEFT JOIN campaigns c ON c.id = l.campaign_id
       ${whereSql}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ?`
    ).bind(...binds, limit).all()

    return json(results.map(r => ({
      id: r.id,
      actorId: r.actor_id,
      actorRole: r.actor_role,
      actorName: r.actor_name,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      targetLabel: r.target_label,
      campaignId: r.campaign_id,
      campaignTitle: r.campaign_title,
      campaignType: r.campaign_type,
      meta: r.meta ? JSON.parse(r.meta) : null,
      createdAt: r.created_at,
    })))
  } catch (e) {
    console.error('[admin/event-logs]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
