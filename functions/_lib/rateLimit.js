// Lightweight fixed-window rate limiter backed by KV (env.SESSIONS).
// Used to throttle credential endpoints (login, forgot-password) so a single
// IP can't brute-force passwords/PINs. Keyed per caller id (usually IP).
//
//   const id = `login:${clientIp(request)}`
//   if (await tooManyAttempts(env, id, 12, 300)) return 429
//   ...on a failed attempt:  await recordFailure(env, id, 300)
//   ...on success:           await clearAttempts(env, id, 300)

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown'
}

function bucketKey(id, windowSec) {
  const bucket = Math.floor(Date.now() / (windowSec * 1000))
  return `rl:${id}:${bucket}`
}

export async function tooManyAttempts(env, id, max, windowSec) {
  try {
    const count = parseInt(await env.SESSIONS.get(bucketKey(id, windowSec)), 10) || 0
    return count >= max
  } catch {
    return false // never block on a KV read error
  }
}

export async function recordFailure(env, id, windowSec) {
  try {
    const key = bucketKey(id, windowSec)
    const count = parseInt(await env.SESSIONS.get(key), 10) || 0
    await env.SESSIONS.put(key, String(count + 1), { expirationTtl: windowSec * 2 })
  } catch { /* ignore */ }
}

export async function clearAttempts(env, id, windowSec) {
  try { await env.SESSIONS.delete(bucketKey(id, windowSec)) } catch { /* ignore */ }
}
