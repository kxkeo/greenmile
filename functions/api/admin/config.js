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
  return json({
    geo_block:       geoBlock    === 'true',
    geo_allow_ips:   allowedIPs  ? allowedIPs.split(',').map(s => s.trim()).filter(Boolean) : [],
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

  return json({ error: 'Unknown action' }, 400)
}
