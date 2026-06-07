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
    // Pre-role rows (very old) fall back to admin or event_staff based on the
    // is_admin flag — a legacy "staff" row would have been migrated to
    // event_staff by migration 026, so we never return bare "staff" here.
    role: r.role || (r.is_admin === 1 ? 'admin' : 'event_staff'),
    loginCode: r.login_code || null,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  }
}

// Build a unique Event Staff login code: initials (A-Z) + 4 random digits.
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

// GET /api/accounts
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, first_name, last_name, email, is_admin, is_disabled, role, login_code, created_at, last_login_at FROM users WHERE email != 'admin' ORDER BY created_at"
  ).all()
  return json(results.map(dbToAccount))
}

// POST /api/accounts
export async function onRequestPost({ request, env }) {
  const b = await request.json()
  const role = b.role || 'event_staff'
  if (!b.firstName || !b.lastName) return json({ error: 'First and last name required' }, 400)

  // Event Staff use an auto-generated login code — no password/email required.
  if (role === 'event_staff') {
    const code = await generateLoginCode(env, b.firstName, b.lastName)
    const email = b.email || `event-staff-${code.toLowerCase()}@greenmile.local`
    const exists = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first()
    if (exists) return json({ error: 'Email already exists' }, 409)
    const r = await env.DB.prepare(
      'INSERT INTO users (first_name, last_name, email, password_hash, is_admin, role, login_code) VALUES (?,?,?,?,0,?,?) RETURNING *'
    ).bind(b.firstName, b.lastName, email, '', role, code).first()
    return json(dbToAccount(r), 201)
  }

  // Admin / staff / gameday / readonly: traditional email + password.
  if (!b.email || !b.password) return json({ error: 'Email and password required' }, 400)
  const exists = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(b.email).first()
  if (exists) return json({ error: 'Email already exists' }, 409)
  const isAdmin = role === 'admin' ? 1 : 0
  const passwordHash = await hashCredential(String(b.password))
  const r = await env.DB.prepare(
    'INSERT INTO users (first_name, last_name, email, password_hash, is_admin, role) VALUES (?,?,?,?,?,?) RETURNING *'
  ).bind(b.firstName, b.lastName, b.email, passwordHash, isAdmin, role).first()
  return json(dbToAccount(r), 201)
}
