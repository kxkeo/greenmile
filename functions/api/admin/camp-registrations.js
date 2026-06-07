function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// GET /api/admin/camp-registrations
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT
        cr.id, cr.event_id, cr.participant_id,
        cr.player_first_name, cr.player_last_name, cr.player_dob,
        cr.player_age_group, cr.player_skill_level, cr.tshirt_size,
        cr.emergency_name, cr.emergency_phone, cr.emergency_relation,
        cr.waiver_signed, cr.waiver_signed_at,
        cr.checked_in, cr.checked_in_at,
        cr.total_cents, cr.payment_status, cr.notes, cr.created_at,
        cr.referred_by, cr.shirt_made, cr.shirt_assigned, cr.positions,
        cr.stripe_session, cr.refund_id, cr.refund_amount_cents, cr.refunded_at,
        p.first_name AS parent_first, p.last_name AS parent_last,
        p.email, p.phone, p.address, p.city, p.state, p.zip,
        e.date AS event_date, e.title AS event_title,
        rp.first_name || ' ' || rp.last_name AS referred_player_name
      FROM camp_registrations cr
      JOIN participants p ON p.id = cr.participant_id
      JOIN events e ON e.id = cr.event_id
      LEFT JOIN players rp ON rp.id = cr.referred_player_id
      ORDER BY cr.created_at DESC
    `).all()

    return json(results.map(r => ({
      id: r.id, eventDate: r.event_date, eventTitle: r.event_title,
      parentFirst: r.parent_first, parentLast: r.parent_last,
      email: r.email, phone: r.phone,
      playerFirst: r.player_first_name, playerLast: r.player_last_name,
      playerName: `${r.player_first_name} ${r.player_last_name}`,
      dob: r.player_dob, ageGroup: r.player_age_group,
      skillLevel: r.player_skill_level, shirtSize: r.tshirt_size,
      emergencyName: r.emergency_name, emergencyPhone: r.emergency_phone,
      emergencyRelation: r.emergency_relation,
      waiverSigned: r.waiver_signed === 1, waiverSignedAt: r.waiver_signed_at,
      checkedIn: r.checked_in === 1, checkedInAt: r.checked_in_at,
      totalCents: r.total_cents, total: (r.total_cents || 0) / 100,
      paymentStatus: r.payment_status, notes: r.notes, createdAt: r.created_at,
      referredBy: r.referred_by, shirtMade: r.shirt_made === 1, shirtAssigned: r.shirt_assigned === 1,
      participantId: r.participant_id,
      positions: r.positions ? JSON.parse(r.positions) : [],
      referredPlayerName: r.referred_player_name || null,
      address: r.address || null, city: r.city || null, state: r.state || null, zip: r.zip || null,
      stripeSession: r.stripe_session || null,
      refundId: r.refund_id || null,
      refundAmountCents: r.refund_amount_cents || null,
      refundedAt: r.refunded_at || null,
    })))
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

// PATCH /api/admin/camp-registrations
export async function onRequestPatch({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id, parentFirst, parentLast, email, phone,
          playerFirst, playerLast, dob, ageGroup, skillLevel, shirtSize,
          emergencyName, emergencyPhone, emergencyRelation,
          paymentStatus, checkedIn, shirtMade, shirtAssigned, notes } = body
  if (!id) return json({ error: 'id required' }, 400)

  try {
    // Update participant (parent)
    await env.DB.prepare(`
      UPDATE participants SET first_name=?, last_name=?, phone=?
      WHERE id = (SELECT participant_id FROM camp_registrations WHERE id=?)
    `).bind(parentFirst||'', parentLast||'', phone||'', id).run()

    if (email) {
      await env.DB.prepare(`
        UPDATE participants SET email=?
        WHERE id = (SELECT participant_id FROM camp_registrations WHERE id=?)
          AND email != ?
      `).bind(email.trim().toLowerCase(), id, email.trim().toLowerCase()).run()
    }

    // Update registration
    await env.DB.prepare(`
      UPDATE camp_registrations SET
        player_first_name=?, player_last_name=?, player_dob=?,
        player_age_group=?, player_skill_level=?, tshirt_size=?,
        emergency_name=?, emergency_phone=?, emergency_relation=?,
        payment_status=?, checked_in=?, shirt_made=?, shirt_assigned=?, notes=?,
        updated_at=datetime('now')
      WHERE id=?
    `).bind(
      playerFirst||'', playerLast||'', dob||null,
      ageGroup||null, skillLevel||null, shirtSize||null,
      emergencyName||null, emergencyPhone||null, emergencyRelation||null,
      paymentStatus||'pending', checkedIn ? 1 : 0,
      shirtMade ? 1 : 0, shirtAssigned ? 1 : 0, notes||'',
      id
    ).run()

    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

// DELETE /api/admin/camp-registrations
export async function onRequestDelete({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id } = body
  if (!id) return json({ error: 'id required' }, 400)

  try {
    await env.DB.prepare('DELETE FROM camp_registrations WHERE id=?').bind(id).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
