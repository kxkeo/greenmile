function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

const KEY = 'school_settings'

const DEFAULTS = {
  schoolName: 'Dinuba High School',
  address: '',
  mascot: 'Emperors',
  logoUrl: '',
}

// GET /api/school
export async function onRequestGet({ env }) {
  const raw = await env.SESSIONS.get(KEY)
  const settings = raw ? JSON.parse(raw) : DEFAULTS
  return json({ ...DEFAULTS, ...settings })
}

// PUT /api/school
export async function onRequestPut({ request, env }) {
  const body = await request.json()
  const current = await env.SESSIONS.get(KEY)
  const existing = current ? JSON.parse(current) : DEFAULTS
  const updated = {
    schoolName: body.schoolName ?? existing.schoolName,
    address:    body.address    ?? existing.address,
    mascot:     body.mascot     ?? existing.mascot,
    logoUrl:    body.logoUrl    ?? existing.logoUrl,
  }
  await env.SESSIONS.put(KEY, JSON.stringify(updated))
  return json({ ok: true, ...updated })
}
