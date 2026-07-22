// POST /api/auth/participant-login
// Email → password auth (any length, not digit-restricted)
// Phone → 6-digit PIN auth

import { verifyCredential } from '../../_lib/password.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { identifier, credential } = body
  if (!identifier?.trim())  return json({ error: 'Email or phone required' }, 400)
  if (!credential?.trim())  return json({ error: 'Password or PIN required' }, 400)

  const id = identifier.trim()
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)
  const digitsOnly = id.replace(/\D/g, '')
  const isPhone = !isEmail && digitsOnly.length >= 10

  if (!isEmail && !isPhone) {
    return json({ error: 'Enter a valid email address or phone number' }, 400)
  }

  // For phone logins enforce 6-digit PIN
  if (isPhone) {
    const pinClean = credential.trim().replace(/\D/g, '')
    if (pinClean.length !== 6) return json({ error: 'PIN must be exactly 6 digits' }, 400)
  }

  try {
    let participant
    if (isEmail) {
      participant = await env.DB.prepare(
        'SELECT id, email, phone, first_name, last_name, pin_hash, disabled FROM participants WHERE email = ?'
      ).bind(id.toLowerCase()).first()
    } else {
      const phone10 = digitsOnly.slice(-10)
      const { results } = await env.DB.prepare(
        'SELECT id, email, phone, first_name, last_name, pin_hash, disabled FROM participants'
      ).all()
      participant = results.find(p => (p.phone || '').replace(/\D/g, '').slice(-10) === phone10) || null
    }

    if (!participant) {
      return json({ error: 'No account found with that email or phone' }, 401)
    }

    if (participant.disabled) {
      return json({ error: 'This account has been disabled. Contact info@greenmileboosters.org for help.' }, 403)
    }

    // Verify credential via PBKDF2 (or legacy SHA-256 with auto-upgrade on
    // successful match). For phone PINs strip non-digits first.
    const credToCheck = isPhone
      ? credential.trim().replace(/\D/g, '')
      : credential.trim()

    const result = await verifyCredential(credToCheck, participant.pin_hash)
    if (!result.ok) {
      return json({ error: isPhone ? 'Incorrect PIN' : 'Incorrect password' }, 401)
    }
    // Silent upgrade: if the stored hash was legacy SHA-256, rewrite it as
    // a fresh PBKDF2 hash on this successful login.
    if (result.upgradedHash) {
      try {
        await env.DB.prepare('UPDATE participants SET pin_hash = ? WHERE id = ?')
          .bind(result.upgradedHash, participant.id).run()
      } catch (e) { console.error('[participant-login] hash upgrade failed', e?.message) }
    }

    // Create session
    const sessionId = crypto.randomUUID()
    await env.SESSIONS.put(
      `participant_session:${sessionId}`,
      JSON.stringify({
        participantId: participant.id,
        email: participant.email,
        phone: participant.phone,
        firstName: participant.first_name,
        lastName: participant.last_name,
        isParticipant: true,
      }),
      { expirationTtl: 60 * 15 }
    )

    const res = json({ ok: true, firstName: participant.first_name, lastName: participant.last_name })
    const headers = new Headers(res.headers)
    headers.set('Set-Cookie',
      `participant_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*15}`)
    return new Response(res.body, { status: 200, headers })

  } catch (e) {
    console.error('[participant-login]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
