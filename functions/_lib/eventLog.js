// Tiny helper for writing audit rows into event_logs. Used anywhere an
// Event Staff / Staff / Admin action on an event registration needs to be
// traceable (check-in, shirt given, payment received, etc.).
//
// The caller passes `session` (middleware's context.data.user) so we snapshot
// the actor's id/role/name at the moment of the action — don't recompute
// later from the users table, because roles/names can change.

export async function logEventAction(env, session, {
  action,
  targetType = 'event_registration',
  targetId,
  targetLabel = null,
  campaignId = null,
  meta = null,
}) {
  if (!action || !targetId) return
  const actorId   = session?.id ?? null
  const actorRole = session?.role ?? (session?.isAdmin ? 'admin' : (session?.isStaff ? 'event_staff' : null))
  const actorName = [session?.firstName, session?.lastName].filter(Boolean).join(' ').trim()
              || session?.email || session?.loginCode || null
  try {
    await env.DB.prepare(
      `INSERT INTO event_logs
        (actor_id, actor_role, actor_name, action, target_type, target_id, target_label, campaign_id, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      actorId,
      actorRole,
      actorName,
      action,
      targetType,
      targetId,
      targetLabel,
      campaignId,
      meta ? JSON.stringify(meta) : null,
    ).run()
  } catch (e) {
    // Logging must never block a real state change — swallow + console.error
    // so Cloudflare tails still see the failure.
    console.error('[event-log] insert failed', e?.message)
  }
}
