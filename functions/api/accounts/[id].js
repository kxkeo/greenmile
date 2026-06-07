import { hashCredential } from '../../_lib/password.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function dbToAccount(r) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    isAdmin: r.is_admin === 1,
    isDisabled: r.is_disabled === 1,
    role: r.role || (r.is_admin === 1 ? 'admin' : 'event_staff'),
    loginCode: r.login_code || null,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  }
}

async function generateLoginCode(env, firstName, lastName) {
  const i1 = (firstName || 'X').trim().charAt(0).toUpperCase().replace(/[^A-Z]/, 'X')
  const i2 = (lastName  || 'X').trim().charAt(0).toUpperCase().replace(/[^A-Z]/, 'X')
  for (let attempt = 0; attempt < 25; attempt++) {
    const num = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    const code = `${i1}${i2}${num}`
    const exists = await env.DB.prepare('SELECT 1 FROM users WHERE login_code=?').bind(code).first()
    if (!exists) return code
  }
  throw new Error('Could not generate unique login code')
}

// PATCH /api/accounts/:id
export async function onRequestPatch({ request, env, params }) {
  const b = await request.json()
  const { id } = params

  // Built-in admin — only password and disabled supported
  if (id === 'admin') {
    if (b.password) await env.SESSIONS.put('admin_password', b.password)
    if (typeof b.isDisabled === 'boolean') await env.SESSIONS.put('admin_disabled', b.isDisabled ? '1' : '0')
    return json({ ok: true, id, isDisabled: b.isDisabled })
  }

  const current = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first()
  if (!current) return json({ error: 'Not found' }, 404)

  const sets = []
  const vals = []

  if (b.firstName) { sets.push('first_name=?'); vals.push(b.firstName) }
  if (b.lastName !== undefined) { sets.push('last_name=?'); vals.push(b.lastName) }
  if (b.email) { sets.push('email=?'); vals.push(b.email) }
  if (b.password) { sets.push('password_hash=?'); vals.push(await hashCredential(String(b.password))) }
  if (typeof b.isAdmin === 'boolean') { sets.push('is_admin=?'); vals.push(b.isAdmin ? 1 : 0) }
  if (typeof b.isDisabled === 'boolean') { sets.push('is_disabled=?'); vals.push(b.isDisabled ? 1 : 0) }
  if (b.role) { sets.push('role=?'); vals.push(b.role) }

  // If switching to event_staff and no code yet, or explicit regenerate,
  // mint a new one. Any other role clears the login_code.
  const targetRole = b.role || current.role
  const needsCode = targetRole === 'event_staff' && (b.regenerateCode || !current.login_code)
  if (needsCode) {
    const firstName = b.firstName || current.first_name
    const lastName  = b.lastName  || current.last_name
    const code = await generateLoginCode(env, firstName, lastName)
    sets.push('login_code=?'); vals.push(code)
  } else if (b.role && b.role !== 'event_staff') {
    sets.push('login_code=?'); vals.push(null)
  }

  if (sets.length > 0) {
    vals.push(id)
    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id=?`).bind(...vals).run()
  }

  const r = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first()
  return json(dbToAccount(r))
}

// DELETE /api/accounts/:id
export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM users WHERE id=?').bind(params.id).run()
  return json({ ok: true })
}
