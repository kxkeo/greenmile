// PATCH /api/auth/golf-team
// Update team members (slots 2–4) for a golf registration owned by the logged-in participant.
// Slot 1 is always the primary registrant — never editable here.
// Send slot with empty name to remove that teammate.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

async function getParticipantId(request, env) {
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return null
  const raw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!raw) return null
  try { return JSON.parse(raw).participantId } catch { return null }
}

export async function onRequestPatch({ request, env }) {
  const participantId = await getParticipantId(request, env)
  if (!participantId) return json({ error: 'Not authenticated' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { registrationId, members } = body
  if (!registrationId) return json({ error: 'registrationId required' }, 400)
  if (!Array.isArray(members)) return json({ error: 'members must be an array' }, 400)

  try {
    // Verify this registration belongs to the logged-in participant
    // Refunded (canceled) registrations can't have their team edited anymore.
    const reg = await env.DB.prepare(
      `SELECT id FROM golf_registrations
       WHERE id = ? AND participant_id = ?
         AND COALESCE(payment_status,'') != 'refunded'`
    ).bind(registrationId, participantId).first()
    if (!reg) return json({ error: 'Registration not found' }, 404)

    // Process slots 2–4 only (slot 1 = primary registrant, never touched here)
    for (const m of members) {
      const slot = parseInt(m.slot, 10)
      if (slot < 2 || slot > 4) continue

      const name  = (m.name  || '').trim()
      const email = (m.email || '').trim().toLowerCase() || null
      const phone = (m.phone || '').trim() || null

      if (!name) {
        // Empty name = remove this slot
        await env.DB.prepare(
          'DELETE FROM golf_team_members WHERE registration_id = ? AND slot = ?'
        ).bind(registrationId, slot).run()
      } else {
        // Upsert: update if exists, insert if not
        const existing = await env.DB.prepare(
          'SELECT id FROM golf_team_members WHERE registration_id = ? AND slot = ?'
        ).bind(registrationId, slot).first()

        if (existing) {
          await env.DB.prepare(
            'UPDATE golf_team_members SET name = ?, email = ?, phone = ? WHERE registration_id = ? AND slot = ?'
          ).bind(name, email, phone, registrationId, slot).run()
        } else {
          await env.DB.prepare(
            'INSERT INTO golf_team_members (registration_id, slot, name, email, phone) VALUES (?, ?, ?, ?, ?)'
          ).bind(registrationId, slot, name, email, phone).run()
        }
      }
    }

    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
