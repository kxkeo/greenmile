// POST /api/auth/staff-login  { code }
// Looks up the staff user by login_code, creates a session with isStaff=true.
// 8-hour sliding TTL — a realistic event-day duration.

const TTL = 60 * 60 * 8

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const code = (body.code || '').trim().toUpperCase()
  if (!/^[A-Z]{2}\d{4}$/.test(code)) return json({ error: 'Invalid code format' }, 400)

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE login_code = ? AND role = 'event_staff'"
  ).bind(code).first()
  if (!user) return json({ error: 'Invalid code' }, 401)
  if (user.is_disabled === 1) return json({ error: 'Account is disabled' }, 401)

  await env.DB.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").bind(user.id).run()

  const sessionData = {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    loginCode: user.login_code,
    isAdmin: false,
    isStaff: true,
    role: 'event_staff',
    loginContext: 'staff',
    ttl: TTL,
  }

  const sessionId = crypto.randomUUID()
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(sessionData), { expirationTtl: TTL })
  const cookie = `greenmile_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`
  return new Response(JSON.stringify({ ok: true, user: sessionData }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  })
}
