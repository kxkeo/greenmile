// GET /api/auth/participant-me
// Returns current participant session + fresh profile data from DB

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ request, env }) {
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/participant_session=([^;]+)/)
  if (!match) return json({ error: 'Not authenticated' }, 401)

  const sessionId = match[1]
  const sessionKey = `participant_session:${sessionId}`
  const raw = await env.SESSIONS.get(sessionKey)
  if (!raw) return json({ error: 'Session expired' }, 401)

  let session
  try { session = JSON.parse(raw) } catch {
    return json({ error: 'Invalid session' }, 401)
  }

  // Slide session — 15 min from last activity
  const TTL = 60 * 15
  await env.SESSIONS.put(sessionKey, raw, { expirationTtl: TTL }).catch(() => {})

  // Pull fresh profile from DB (includes address fields)
  try {
    const p = await env.DB.prepare(
      `SELECT id, email, phone, first_name, last_name,
              address, city, state, zip, newsletter, created_at
       FROM participants WHERE id = ?`
    ).bind(session.participantId).first()

    if (!p) return json({ error: 'Account not found' }, 401)

    const body = {
      ok: true,
      participantId: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      phone: p.phone,
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip,
      newsletter: p.newsletter === 1,
      createdAt: p.created_at,
      isParticipant: true,
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Set-Cookie': `participant_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL}`,
      },
    })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
