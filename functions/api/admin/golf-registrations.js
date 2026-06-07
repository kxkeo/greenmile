function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// GET /api/admin/golf-registrations
export async function onRequestGet({ env }) {
  try {
    const { results: regs } = await env.DB.prepare(`
      SELECT
        gr.id, gr.event_id, gr.sponsor, gr.entry_type, gr.addons,
        gr.total_cents, gr.payment_status, gr.notes, gr.created_at,
        gr.stripe_session, gr.refund_id, gr.refund_amount_cents, gr.refunded_at,
        p.first_name, p.last_name, p.email, p.phone,
        p.address, p.city, p.state, p.zip,
        c.event_date AS event_date, c.title AS event_title,
        rp.first_name || ' ' || rp.last_name AS referred_player_name
      FROM golf_registrations gr
      JOIN participants p ON p.id = gr.participant_id
      LEFT JOIN campaigns c ON c.id = gr.event_id
      LEFT JOIN players rp ON rp.id = gr.referred_player_id
      ORDER BY gr.created_at DESC
    `).all()

    const out = []
    for (const reg of regs) {
      const { results: members } = await env.DB.prepare(`
        SELECT slot, name, email, phone, pin_sent
        FROM golf_team_members WHERE registration_id = ? ORDER BY slot ASC
      `).bind(reg.id).all()

      out.push({
        id: reg.id, eventDate: reg.event_date, eventTitle: reg.event_title,
        firstName: reg.first_name, lastName: reg.last_name,
        email: reg.email, phone: reg.phone,
        address: reg.address || null, city: reg.city || null, state: reg.state || null, zip: reg.zip || null,
        sponsor: reg.sponsor, entryType: reg.entry_type,
        addons: JSON.parse(reg.addons || '{}'),
        totalCents: reg.total_cents, total: (reg.total_cents || 0) / 100,
        paymentStatus: reg.payment_status, notes: reg.notes,
        createdAt: reg.created_at, team: members,
        referredPlayerName: reg.referred_player_name || null,
        stripeSession: reg.stripe_session || null,
        refundId: reg.refund_id || null,
        refundAmountCents: reg.refund_amount_cents || null,
        refundedAt: reg.refunded_at || null,
      })
    }
    return json(out)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

// PATCH /api/admin/golf-registrations
export async function onRequestPatch({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id, firstName, lastName, email, phone, address, city, state, zip, sponsor, entryType, paymentStatus, notes, team } = body
  if (!id) return json({ error: 'id required' }, 400)

  try {
    // Update participant name/contact/address
    await env.DB.prepare(`
      UPDATE participants SET first_name=?, last_name=?, phone=?, address=?, city=?, state=?, zip=?
      WHERE id = (SELECT participant_id FROM golf_registrations WHERE id=?)
    `).bind(firstName||'', lastName||'', phone||'', address?.trim()||null, city?.trim()||null, state?.trim()||null, zip?.trim()||null, id).run()

    // Update email separately (unique constraint)
    if (email) {
      await env.DB.prepare(`
        UPDATE participants SET email=?
        WHERE id = (SELECT participant_id FROM golf_registrations WHERE id=?)
          AND email != ?
      `).bind(email.trim().toLowerCase(), id, email.trim().toLowerCase()).run()
    }

    // Update registration
    await env.DB.prepare(`
      UPDATE golf_registrations
      SET sponsor=?, entry_type=?, payment_status=?, notes=?, updated_at=datetime('now')
      WHERE id=?
    `).bind(sponsor||null, entryType||null, paymentStatus||'pending', notes||'', id).run()

    // Update team members (slots 2–4 only)
    if (Array.isArray(team)) {
      for (const m of team) {
        const slot = parseInt(m.slot, 10)
        if (slot < 2 || slot > 4) continue
        const name  = (m.name  || '').trim()
        const mEmail = (m.email || '').trim().toLowerCase() || null
        if (!name) {
          await env.DB.prepare('DELETE FROM golf_team_members WHERE registration_id=? AND slot=?').bind(id, slot).run()
        } else {
          const existing = await env.DB.prepare('SELECT id FROM golf_team_members WHERE registration_id=? AND slot=?').bind(id, slot).first()
          if (existing) {
            await env.DB.prepare('UPDATE golf_team_members SET name=?, email=? WHERE registration_id=? AND slot=?').bind(name, mEmail, id, slot).run()
          } else {
            await env.DB.prepare('INSERT INTO golf_team_members (registration_id, slot, name, email) VALUES (?,?,?,?)').bind(id, slot, name, mEmail).run()
          }
        }
      }
    }

    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

// DELETE /api/admin/golf-registrations
export async function onRequestDelete({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id } = body
  if (!id) return json({ error: 'id required' }, 400)

  try {
    // Team members cascade delete via FK, but D1 doesn't enforce FK by default — delete manually
    await env.DB.prepare('DELETE FROM golf_team_members WHERE registration_id=?').bind(id).run()
    await env.DB.prepare('DELETE FROM golf_teams WHERE registration_id=?').bind(id).run()
    await env.DB.prepare('DELETE FROM golf_registrations WHERE id=?').bind(id).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
