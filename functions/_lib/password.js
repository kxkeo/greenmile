// Password / PIN hashing utilities.
//
// Going forward we use PBKDF2-HMAC-SHA-256 with 100,000 iterations and a
// unique 16-byte random salt per credential. Format:
//
//   pbkdf2$100000$<salt-base64>$<hash-base64>
//
// Legacy hashes are raw 64-char SHA-256 hex strings (no salt, no iterations).
// `verifyCredential` accepts either; when a legacy hash matches we return a
// fresh PBKDF2 hash in `upgradedHash` so the caller can persist it back to the
// database on successful login. That lets us migrate users seamlessly without
// a forced password reset.
//
// WebCrypto PBKDF2 is supported in the Cloudflare Workers runtime, so this
// works without pulling in any npm deps.

const ITERATIONS = 100_000
const KEY_LEN    = 32   // 256-bit output
const SALT_LEN   = 16

function b64encode(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64decode(str) {
  const s = atob(str)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function pbkdf2(plain, salt, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(plain), { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    KEY_LEN * 8,
  )
  return new Uint8Array(bits)
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Hash a plaintext credential (password or PIN) using PBKDF2 + random salt.
// Returns a single self-describing string safe to store in the DB.
export async function hashCredential(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const hash = await pbkdf2(plain, salt)
  return `pbkdf2$${ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`
}

// Verify a plaintext credential against a stored hash. Returns:
//   { ok: false }                       — no match
//   { ok: true }                        — matched a current pbkdf2 hash
//   { ok: true, upgradedHash: 'pbkdf2…' } — matched a legacy sha256 hash;
//     caller should persist upgradedHash so the next verify is modern.
export async function verifyCredential(plain, stored) {
  if (!stored) return { ok: false }

  // Legacy: raw 64-char SHA-256 hex
  if (/^[0-9a-f]{64}$/i.test(stored)) {
    const legacy = await sha256Hex(plain)
    if (legacy.toLowerCase() !== stored.toLowerCase()) return { ok: false }
    // Matched — produce an upgraded hash so the caller can rewrite the DB row.
    const upgradedHash = await hashCredential(plain)
    return { ok: true, upgradedHash }
  }

  // Modern: pbkdf2$<iterations>$<salt-b64>$<hash-b64>
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$')
    if (parts.length !== 4) return { ok: false }
    const iterations = parseInt(parts[1], 10)
    if (!iterations || iterations < 1000) return { ok: false }
    let salt, expected
    try { salt = b64decode(parts[2]); expected = b64decode(parts[3]) }
    catch { return { ok: false } }
    const actual = await pbkdf2(plain, salt, iterations)
    if (!timingSafeEqual(actual, expected)) return { ok: false }
    return { ok: true }
  }

  return { ok: false }
}
