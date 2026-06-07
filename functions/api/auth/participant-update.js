// PATCH /api/auth/participant-update
// Updates profile fields and/or PIN/password for the authenticated participant
// Also handles phone-only → email+password migration via { action: 'add-email' }

import { hashCredential, verifyCredential } from '../../_lib/password.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

function normalizePhone(raw) {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1)
  return digits
}

export async function onRequestPatch({ request, env }) {
  // Auth check
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/participant_session=([^;]+)/)
  if (!match) return json({ error: 'Not authenticated' }, 401)
  const raw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!raw) return json({ error: 'Session expired' }, 401)
  const session = JSON.parse(raw)
  const participantId = session.participantId

  let body
  try { body = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { action, firstName, lastName, email, phone, address, city, state, zip, newsletter, currentPin, newPin } = body

  try {

    // ── Migration: phone-only account adds email + sets password ──
    if (action === 'add-email') {
      const { addEmail, newPassword, confirmPassword } = body

      if (!addEmail?.trim())
        return json({ error: 'Email address required' }, 400)

      const emailClean = addEmail.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean))
        return json({ error: 'Enter a valid email address' }, 400)

      if (!newPassword?.trim())
        return json({ error: 'Password is required' }, 400)
      if (newPassword.trim().length < 6)
        return json({ error: 'Password must be at least 6 characters' }, 400)
      if (newPassword !== confirmPassword)
        return json({ error: 'Passwords do not match' }, 400)
      if (!currentPin?.trim())
        return json({ error: 'Current PIN is required to verify your identity' }, 400)

      // Load participant — must be a phone-only account
      const p = await env.DB.prepare(
        'SELECT id, email, pin_hash FROM participants WHERE id = ?'
      ).bind(participantId).first()

      if (!p) return json({ error: 'Account not found' }, 404)
      if (p.email) return json({ error: 'This account already has an email address' }, 409)

      // Verify current PIN (handles both PBKDF2 and legacy SHA-256 hashes).
      const check = await verifyCredential(currentPin.trim().replace(/\D/g, ''), p.pin_hash)
      if (!check.ok) return json({ error: 'Incorrect PIN' }, 401)

      // Check email not already taken
      const dup = await env.DB.prepare(
        'SELECT id FROM participants WHERE email = ?'
      ).bind(emailClean).first()
      if (dup) return json({ error: 'An account with that email already exists' }, 409)

      // Atomically set email + replace pin_hash with PBKDF2 password hash
      const passwordHash = await hashCredential(newPassword.trim())
      await env.DB.prepare(
        'UPDATE participants SET email = ?, pin_hash = ? WHERE id = ?'
      ).bind(emailClean, passwordHash, participantId).run()

      return json({ ok: true, message: 'Email and password set. You can now sign in with your email.' })
    }

    // ── PIN / password change ──
    if (newPin !== undefined) {
      if (!currentPin) return json({ error: 'Current credential required' }, 400)

      const p = await env.DB.prepare(
        'SELECT pin_hash, email FROM participants WHERE id = ?'
      ).bind(participantId).first()

      const isPasswordAccount = !!p.email

      if (isPasswordAccount) {
        if (newPin.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400)
        const check = await verifyCredential(currentPin.trim(), p.pin_hash)
        if (!check.ok) return json({ error: 'Current password is incorrect' }, 400)
        const newHash = await hashCredential(newPin.trim())
        await env.DB.prepare('UPDATE participants SET pin_hash = ? WHERE id = ?').bind(newHash, participantId).run()
        return json({ ok: true, message: 'Password updated' })
      } else {
        const pinClean = newPin.replace(/\D/g, '')
        if (pinClean.length !== 6) return json({ error: 'New PIN must be 6 digits' }, 400)
        const check = await verifyCredential(currentPin.replace(/\D/g, ''), p.pin_hash)
        if (!check.ok) return json({ error: 'Current PIN is incorrect' }, 400)
        const newHash = await hashCredential(pinClean)
        await env.DB.prepare('UPDATE participants SET pin_hash = ? WHERE id = ?').bind(newHash, participantId).run()
        return json({ ok: true, message: 'PIN updated' })
      }
    }

    // ── Profile update ──
    const emailClean = email?.trim().toLowerCase() || null
    const phoneClean = phone?.trim() ? normalizePhone(phone) : null

    if (!emailClean && !phoneClean) {
      return json({ error: 'Email or phone number required' }, 400)
    }

    if (emailClean) {
      const dup = await env.DB.prepare(
        'SELECT id FROM participants WHERE email = ? AND id != ?'
      ).bind(emailClean, participantId).first()
      if (dup) return json({ error: 'That email is already used by another account' }, 409)
    }

    // Newsletter opt-in is optional on the payload. Only touch the column
    // when the caller actually sent a value so unrelated profile saves
    // don't clobber the user's preference.
    const setNewsletter = newsletter !== undefined
    const newsletterVal = newsletter ? 1 : 0

    await env.DB.prepare(`
      UPDATE participants SET
        first_name = ?, last_name = ?,
        email = ?, phone = ?,
        address = ?, city = ?, state = ?, zip = ?
        ${setNewsletter ? ', newsletter = ?' : ''}
      WHERE id = ?
    `).bind(
      firstName?.trim() || '',
      lastName?.trim() || '',
      emailClean,
      phoneClean,
      address?.trim() || null,
      city?.trim() || null,
      state?.trim() || null,
      zip?.trim() || null,
      ...(setNewsletter ? [newsletterVal] : []),
      participantId,
    ).run()

    return json({ ok: true, message: 'Profile updated' })

  } catch (e) {
    console.error('[participant-update]', e?.message, e?.stack)
    if (e.message?.includes('UNIQUE')) return json({ error: 'Email or phone already in use' }, 409)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
