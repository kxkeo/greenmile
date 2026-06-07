// Temporary debug endpoint — remove after confirming login works
export async function onRequestGet(context) {
  const { env } = context
  const checks = {
    hasDB: !!env.DB,
    hasSESSIONS: !!env.SESSIONS,
    compatDate: '2025-01-01',
  }

  // Try a simple DB query
  try {
    await env.DB.prepare('SELECT 1').first()
    checks.dbConnected = true
  } catch (e) {
    checks.dbConnected = false
    checks.dbError = e.message
  }

  // Try KV
  try {
    await env.SESSIONS.put('_healthcheck', '1', { expirationTtl: 60 })
    await env.SESSIONS.delete('_healthcheck')
    checks.kvConnected = true
  } catch (e) {
    checks.kvConnected = false
    checks.kvError = e.message
  }

  return new Response(JSON.stringify(checks, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
}
