// Unsubscribe token helpers. A promo email carries a link with the recipient's
// email + an HMAC signature so the /api/unsubscribe endpoint can verify the
// request came from our email (not someone unsubscribing a stranger) without
// storing a token per recipient. The signing key lives in KV, generated once.

async function getSecret(env) {
  let secret = await env.SESSIONS.get('config:email_hmac_secret')
  if (!secret) {
    secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    await env.SESSIONS.put('config:email_hmac_secret', secret)
  }
  return secret
}

function b64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return b64url(new Uint8Array(sig))
}

export async function unsubToken(env, email) {
  return hmac(await getSecret(env), String(email).trim().toLowerCase())
}

export async function verifyUnsub(env, email, token) {
  if (!email || !token) return false
  const expected = await unsubToken(env, email)
  // Constant-time-ish compare.
  if (expected.length !== token.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i)
  return diff === 0
}

export async function unsubscribeUrl(env, email) {
  const e = encodeURIComponent(String(email).trim().toLowerCase())
  const t = await unsubToken(env, email)
  return `https://greenmileboosters.org/unsubscribe?e=${e}&t=${t}`
}
