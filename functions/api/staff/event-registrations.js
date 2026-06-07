// Event Staff view of event_registrations for the currently active campaign
// of a given type (default: alumni). Used by /staff/alumni to check players
// in, hand out shirts, and mark payment received at the door.
//
// GET   /api/staff/event-registrations?type=alumni
//       → { campaign, registrations[] }
// PATCH /api/staff/event-registrations
//       body: { id, checkedIn?, shirtAssigned?, paymentStatus? }
//       → { ok: true }
//
// Auth: gated by root middleware (isStaff || isAdmin || role==='staff'). Event
// Staff will typically be on /staff/alumni via code login; this endpoint only
// ever returns data for a single active campaign so code-login event staff
// can't enumerate other events.

import { logEventAction } from '../../_lib/eventLog.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

async function resolveCampaignByType(env, type) {
  return env.DB.prepare(
    `SELECT id, title, type, event_date, location, status, price_cents
     FROM campaigns
     WHERE type = ? AND status = 'active'
     ORDER BY event_date DESC
     LIMIT 1`
  ).bind(type).first()
}

async function resolveCampaignById(env, id) {
  return env.DB.prepare(
    `SELECT id, title, type, event_date, location, status, price_cents
     FROM campaigns
     WHERE id = ?`
  ).bind(parseInt(id, 10) || 0).first()
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  // Two ways to pick the event:
  //   ?campaignId=N — explicit, used by the admin Event Check-In page so any
  //                   active campaign can be opened by id.
  //   ?type=alumni  — default for /staff/alumni, picks the most recent
  //                   active campaign of that type.
  const campaignId = url.searchParams.get('campaignId')
  const type       = (url.searchParams.get('type') || 'alumni').toLowerCase()

  const campaign = campaignId
    ? await resolveCampaignById(env, campaignId)
    : await resolveCampaignByType(env, type)

  if (!campaign) return json({ error: 'Event not found', campaign: null, registrations: [] }, 404)

  try {
    const { results } = await env.DB.prepare(
      `SELECT er.id, er.first_name, er.last_name, er.email, er.phone,
              er.ticket_qty, er.shirt_size, er.grad_year, er.game_type,
              er.total_cents, er.payment_status,
              er.checked_in, er.checked_in_at,
              er.shirt_made, er.shirt_assigned,
              er.created_at
       FROM event_registrations er
       WHERE er.campaign_id = ?
       ORDER BY er.last_name, er.first_name`
    ).bind(campaign.id).all()

    return json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        type: campaign.type,
        eventDate: campaign.event_date,
        location: campaign.location,
        priceCents: campaign.price_cents,
      },
      registrations: results,
    })
  } catch (e) {
    console.error('[staff/event-registrations:get]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPatch({ request, env, data }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id, checkedIn, shirtAssigned, paymentStatus } = body
  const rowId = parseInt(id, 10)
  if (!rowId) return json({ error: 'id required' }, 400)

  // Whitelist payment transitions Event Staff can make — "paid" when someone
  // hands over cash at the door, or revert to "pay_at_event". Refunds and
  // other status changes stay in the full admin UI.
  const allowedPaymentStatuses = ['paid', 'pay_at_event']
  if (paymentStatus !== undefined && !allowedPaymentStatuses.includes(paymentStatus)) {
    return json({ error: 'Invalid payment status' }, 400)
  }

  try {
    // Pull the full row so we can:
    //   1. validate it exists and its campaign is active
    //   2. snapshot name + campaign title for a human-readable audit row
    //   3. compare old → new values and log each toggle independently
    const row = await env.DB.prepare(
      `SELECT er.id, er.first_name, er.last_name, er.campaign_id,
              er.checked_in, er.shirt_assigned, er.payment_status,
              c.type AS campaign_type, c.status AS campaign_status, c.title AS campaign_title
       FROM event_registrations er
       JOIN campaigns c ON c.id = er.campaign_id
       WHERE er.id = ?`
    ).bind(rowId).first()
    if (!row) return json({ error: 'Registration not found' }, 404)
    if (row.campaign_status !== 'active') {
      return json({ error: 'Event is not active' }, 400)
    }

    const fields = []
    const vals   = []
    if (checkedIn !== undefined) {
      fields.push('checked_in=?'); vals.push(checkedIn ? 1 : 0)
      if (checkedIn) fields.push("checked_in_at=datetime('now')")
    }
    if (shirtAssigned !== undefined) { fields.push('shirt_assigned=?'); vals.push(shirtAssigned ? 1 : 0) }
    if (paymentStatus !== undefined) { fields.push('payment_status=?'); vals.push(paymentStatus) }
    if (!fields.length) return json({ error: 'Nothing to update' }, 400)
    fields.push("updated_at=datetime('now')")
    vals.push(rowId)

    await env.DB.prepare(
      `UPDATE event_registrations SET ${fields.join(',')} WHERE id=?`
    ).bind(...vals).run()

    // Audit log — one row per attribute the caller actually changed. "Undo"
    // variants (e.g. undo_check_in) make it clear this was a reversal and
    // not a separate check-in.
    const session     = data?.user
    const targetLabel = `${row.first_name || ''} ${row.last_name || ''}`.trim() + (row.campaign_title ? ` — ${row.campaign_title}` : '')
    const logBase = { targetId: rowId, targetLabel, campaignId: row.campaign_id }

    if (checkedIn !== undefined && (row.checked_in === 1) !== !!checkedIn) {
      await logEventAction(env, session, { ...logBase, action: checkedIn ? 'check_in' : 'undo_check_in' })
    }
    if (shirtAssigned !== undefined && (row.shirt_assigned === 1) !== !!shirtAssigned) {
      await logEventAction(env, session, { ...logBase, action: shirtAssigned ? 'shirt_given' : 'shirt_undo' })
    }
    if (paymentStatus !== undefined && row.payment_status !== paymentStatus) {
      const action = paymentStatus === 'paid' ? 'payment_received' : 'payment_undo'
      await logEventAction(env, session, { ...logBase, action, meta: { paymentStatus } })
    }

    return json({ ok: true })
  } catch (e) {
    console.error('[staff/event-registrations:patch]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
