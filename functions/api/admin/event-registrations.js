// GET  /api/admin/event-registrations — list all event registrations
// PATCH /api/admin/event-registrations — update payment_status or checked_in
// DELETE /api/admin/event-registrations — delete a registration

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT
        er.id, er.campaign_id, er.participant_id,
        er.first_name, er.last_name, er.email, er.phone,
        er.address, er.city, er.state, er.zip,
        er.ticket_qty, er.total_cents, er.shirt_size, er.game_type,
        er.grad_year, er.positions,
        er.payment_status, er.checked_in, er.checked_in_at,
        er.shirt_made, er.shirt_assigned,
        er.stripe_session, er.refund_id, er.refund_amount_cents, er.refunded_at,
        er.notes, er.created_at,
        c.title   AS campaign_title,
        c.type    AS campaign_type,
        c.event_date,
        rp.first_name || ' ' || rp.last_name AS referred_player_name
      FROM event_registrations er
      JOIN campaigns c ON c.id = er.campaign_id
      LEFT JOIN players rp ON rp.id = er.referred_player_id
      ORDER BY er.created_at DESC
    `).all()
    return json(results)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPatch({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { id, paymentStatus, checkedIn, shirtMade, shirtAssigned, notes } = body
  if (!id) return json({ error: 'ID required' }, 400)
  try {
    const fields = []
    const vals   = []
    if (paymentStatus !== undefined) { fields.push('payment_status=?'); vals.push(paymentStatus) }
    if (checkedIn     !== undefined) {
      fields.push('checked_in=?'); vals.push(checkedIn ? 1 : 0)
      if (checkedIn) { fields.push("checked_in_at=datetime('now')") }
    }
    if (shirtMade     !== undefined) { fields.push('shirt_made=?');     vals.push(shirtMade     ? 1 : 0) }
    if (shirtAssigned !== undefined) { fields.push('shirt_assigned=?'); vals.push(shirtAssigned ? 1 : 0) }
    if (notes !== undefined) { fields.push('notes=?'); vals.push(notes) }
    if (!fields.length) return json({ error: 'Nothing to update' }, 400)
    fields.push("updated_at=datetime('now')")
    vals.push(id)
    await env.DB.prepare(`UPDATE event_registrations SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestDelete({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { id } = body
  if (!id) return json({ error: 'ID required' }, 400)
  try {
    await env.DB.prepare('DELETE FROM event_registrations WHERE id=?').bind(id).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
