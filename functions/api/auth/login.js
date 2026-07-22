// POST /api/auth/login
// context: 'admin' (15 min sliding) | 'gameday' (4 hour sliding)

import { verifyCredential, hashCredential } from '../../_lib/password.js'
import { tooManyAttempts, recordFailure, clearAttempts, clientIp } from '../../_lib/rateLimit.js'

const RL_MAX = 12
const RL_WINDOW = 300 // 12 failed attempts / 5 min per IP

// Length-independent comparison so a wrong admin password can't be probed by
// response timing.
function constantTimeEqual(a, b) {
  const enc = new TextEncoder()
  const x = enc.encode(String(a)), y = enc.encode(String(b))
  const len = Math.max(x.length, y.length)
  let diff = x.length ^ y.length
  for (let i = 0; i < len; i++) diff |= (x[i] || 0) ^ (y[i] || 0)
  return diff === 0
}

const TTL = {
  admin:   60 * 15,        // 15 minutes
  gameday: 60 * 60 * 4,    // 4 hours
  staff:   60 * 60 * 8,    // 8 hours — event-day; matches Event Staff code login
}

export async function onRequestPost(context) {
  const { request, env } = context

  let body
  try { body = await request.json() } catch {
    return json({ error: 'Invalid request' }, 400)
  }

  const { email, password, context: loginContext } = body
  if (!email || !password) return json({ error: 'Email and password required' }, 400)

  const ttl = TTL[loginContext] || TTL.admin

  // Rate-limit by IP to blunt brute-force. A failed attempt increments the
  // counter; a successful login clears it.
  const rlId = `login:${clientIp(request)}`
  if (await tooManyAttempts(env, rlId, RL_MAX, RL_WINDOW)) {
    return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429)
  }
  const fail = async (msg = 'Invalid credentials', status = 401) => {
    await recordFailure(env, rlId, RL_WINDOW)
    return json({ error: msg }, status)
  }

  // Built-in admin account. Password comes from the KV override (Settings →
  // Security) or the ADMIN_PASSWORD env var — there is NO hardcoded default, so
  // if neither is set the admin login fails closed.
  if (email === 'admin') {
    const storedPw = (await env.SESSIONS.get('admin_password')) || env.ADMIN_PASSWORD || null
    const disabled = await env.SESSIONS.get('admin_disabled')
    if (disabled === '1') return json({ error: 'Account is disabled' }, 401)
    if (!storedPw) return json({ error: 'Admin login is not configured.' }, 503)
    if (!constantTimeEqual(password, storedPw)) return await fail()
    await clearAttempts(env, rlId, RL_WINDOW)
    return createSession(env, { id: 0, email: 'admin', firstName: 'Admin', isAdmin: true, role: 'admin', loginContext }, ttl)
  }

  // DB users
  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (!user) return await fail()
    if (user.is_disabled === 1) return json({ error: 'Account is disabled' }, 401)

    // Verify against stored hash (PBKDF2 or legacy SHA-256 hex). Historically
    // this endpoint compared raw plaintext to password_hash — if the column
    // still holds literal plaintext for an account we fall back to a direct
    // compare and then upgrade the stored value on the fly.
    let verified = false
    let upgradedHash = null
    const stored = user.password_hash || ''
    if (stored.startsWith('pbkdf2$') || /^[0-9a-f]{64}$/i.test(stored)) {
      const result = await verifyCredential(password, stored)
      verified = result.ok
      upgradedHash = result.upgradedHash || null
    } else if (stored === password) {
      verified = true
      upgradedHash = await hashCredential(password)
    }
    if (!verified) return await fail()
    await clearAttempts(env, rlId, RL_WINDOW)
    if (upgradedHash) {
      try {
        await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(upgradedHash, user.id).run()
      } catch (e) { console.error('[login] hash upgrade failed', e?.message) }
    }

    // Include `role` in the session so middleware can permission-gate
    // /api/admin/* paths for the email+password Staff role. Fall back to
    // 'admin' / 'event_staff' if the row predates the role column.
    const role = user.role || (user.is_admin === 1 ? 'admin' : 'event_staff')
    return createSession(env, { id: user.id, email: user.email, firstName: user.first_name, isAdmin: user.is_admin === 1, role, loginContext }, ttl)
  } catch (e) {
    console.error('[login]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

async function createSession(env, user, ttl) {
  const sessionId = crypto.randomUUID()
  try {
    await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify({ ...user, ttl }), { expirationTtl: ttl })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Session store error: ' + e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
  const cookie = `greenmile_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}`
  return new Response(JSON.stringify({ ok: true, user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}
