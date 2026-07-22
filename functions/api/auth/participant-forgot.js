// POST /api/auth/participant-forgot
// Body: { email }
// If an account with that email exists, generate a single-use reset token,
// store it in KV for 1 hour, and email a reset link. Always responds with the
// same success message so the endpoint can't be used to enumerate accounts.

import { sendEmail } from '../email/send.js'
import { passwordResetEmail } from '../email/templates.js'
import { tooManyAttempts, recordFailure, clientIp } from '../../_lib/rateLimit.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

const GENERIC_OK = { ok: true, message: 'If an account exists for that email, a reset link is on its way.' }

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Enter a valid email address' }, 400)
  }

  // Throttle by IP so this can't be used to email-bomb an address or probe for
  // accounts. Every request counts; response stays generic either way.
  const rlId = `forgot:${clientIp(request)}`
  if (await tooManyAttempts(env, rlId, 6, 900)) {
    return json(GENERIC_OK)
  }
  await recordFailure(env, rlId, 900)

  try {
    const participant = await env.DB.prepare(
      'SELECT id, email, first_name, disabled FROM participants WHERE email = ?'
    ).bind(email).first()

    // Only actually send when the account exists and is active — but always
    // return the same generic response.
    if (participant && !participant.disabled) {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
      // Store token → participant id for 1 hour. Single use (deleted on reset).
      await env.SESSIONS.put(
        `pwreset:${token}`,
        JSON.stringify({ participantId: participant.id, email: participant.email }),
        { expirationTtl: 60 * 60 }
      )

      const resetUrl = `https://greenmileboosters.org/my-account/reset?token=${token}`
      const tpl = passwordResetEmail({ firstName: participant.first_name, resetUrl })
      await sendEmail(env, { to: participant.email, ...tpl }).catch(() => {})
      await env.DB.prepare(
        `INSERT INTO email_log (participant_id, to_email, email_type, subject, status) VALUES (?, ?, 'password_reset', ?, 'sent')`
      ).bind(participant.id, participant.email, tpl.subject).run().catch(() => {})
    }

    return json(GENERIC_OK)
  } catch (e) {
    console.error('[participant-forgot]', e?.message, e?.stack)
    // Even on error, don't leak whether the account exists.
    return json(GENERIC_OK)
  }
}
