// POST /api/auth/participant-reset
// Body: { token, password }
// Validates a reset token from KV, sets the new password, and invalidates the
// token so it can only be used once.

import { hashCredential } from '../../_lib/password.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const token = (body.token || '').trim()
  const password = (body.password || '').trim()

  if (!token) return json({ error: 'Reset link is missing or invalid.' }, 400)
  if (!password) return json({ error: 'Please choose a new password.' }, 400)
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400)

  try {
    const raw = await env.SESSIONS.get(`pwreset:${token}`)
    if (!raw) return json({ error: 'This reset link has expired or already been used. Please request a new one.' }, 400)

    let data
    try { data = JSON.parse(raw) } catch { data = null }
    if (!data?.participantId) {
      await env.SESSIONS.delete(`pwreset:${token}`)
      return json({ error: 'This reset link is invalid. Please request a new one.' }, 400)
    }

    const credHash = await hashCredential(password)
    await env.DB.prepare('UPDATE participants SET pin_hash = ? WHERE id = ?')
      .bind(credHash, data.participantId).run()

    // Single use — burn the token.
    await env.SESSIONS.delete(`pwreset:${token}`)

    return json({ ok: true, message: 'Your password has been reset. You can now sign in.' })
  } catch (e) {
    console.error('[participant-reset]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
