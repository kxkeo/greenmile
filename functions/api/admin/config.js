// GET /api/admin/config — returns current config flags
// POST /api/admin/config — updates a config flag

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ env }) {
  const geoBlock    = await env.SESSIONS.get('config:geo_block')
  const allowedIPs  = await env.SESSIONS.get('config:geo_allow_ips')
  const resendKey   = env.RESEND_API_KEY || await env.SESSIONS.get('config:resend_api_key')
  return json({
    geo_block:       geoBlock    === 'true',
    geo_allow_ips:   allowedIPs  ? allowedIPs.split(',').map(s => s.trim()).filter(Boolean) : [],
    // Never echo the key itself — just enough to show it's configured.
    resend_configured: Boolean(resendKey),
    resend_key_hint:   resendKey ? `••••${String(resendKey).slice(-4)}` : null,
    resend_from_env:   Boolean(env.RESEND_API_KEY),
  })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { action, value } = body

  if (action === 'set_geo_block') {
    await env.SESSIONS.put('config:geo_block', value ? 'true' : 'false')
    return json({ ok: true, geo_block: value })
  }

  if (action === 'set_allow_ips') {
    const clean = (value || '').split(',').map(s => s.trim()).filter(Boolean).join(',')
    await env.SESSIONS.put('config:geo_allow_ips', clean)
    return json({ ok: true, geo_allow_ips: clean })
  }

  if (action === 'set_resend_key') {
    const key = String(value || '').trim()
    if (!key) {
      await env.SESSIONS.delete('config:resend_api_key')
      return json({ ok: true, resend_configured: Boolean(env.RESEND_API_KEY) })
    }
    if (!/^re_[A-Za-z0-9_-]{10,}$/.test(key)) {
      return json({ error: 'That does not look like a Resend API key (they start with re_).' }, 400)
    }
    await env.SESSIONS.put('config:resend_api_key', key)
    return json({ ok: true, resend_configured: true, resend_key_hint: `••••${key.slice(-4)}` })
  }

  if (action === 'set_admin_password') {
    const pw = String(value || '')
    if (pw.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
    await env.SESSIONS.put('admin_password', pw)
    return json({ ok: true })
  }

  return json({ error: 'Unknown action' }, 400)
}
