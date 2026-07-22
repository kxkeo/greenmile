// POST /api/auth/participant-signup
// Email provided → requires password (any string), stored as SHA-256
// Phone only     → generates 6-digit PIN, returned in response

import { sendEmail } from '../email/send.js'
import { accountWelcomeEmail } from '../email/templates.js'
import { hashCredential } from '../../_lib/password.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function normalizePhone(raw) {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1)
  return digits
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { firstName, lastName, email, phone, password, address, city, state, zip, newsletter } = body
  // Newsletter opt-in defaults to ON for new signups — the checkbox on the
  // form is pre-checked, so a missing value should also be treated as a yes.
  const newsletterOptIn = newsletter === false ? 0 : 1

  if (!firstName?.trim()) return json({ error: 'First name required' }, 400)
  if (!lastName?.trim())  return json({ error: 'Last name required' }, 400)

  const emailClean = email?.trim().toLowerCase() || null
  const phoneClean = phone?.trim() ? normalizePhone(phone) : null

  // Email is required for every account — the boosters send event reminders and
  // team-dinner notifications by email, so an account must have one. Phone is an
  // optional extra contact.
  if (!emailClean) {
    return json({ error: 'Email is required' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return json({ error: 'Enter a valid email address' }, 400)
  }
  if (phoneClean && phoneClean.length < 10) {
    return json({ error: 'Enter a valid 10-digit phone number' }, 400)
  }
  if (!password?.trim()) {
    return json({ error: 'Password is required' }, 400)
  }
  if (password.trim().length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, 400)
  }

  try {
    // Check duplicates
    if (emailClean) {
      const existing = await env.DB.prepare('SELECT id FROM participants WHERE email = ?').bind(emailClean).first()
      if (existing) return json({ error: 'An account with that email already exists. Try signing in.' }, 409)
    }
    if (phoneClean) {
      const { results } = await env.DB.prepare('SELECT id, phone FROM participants WHERE phone IS NOT NULL').all()
      const dup = results.find(p => normalizePhone(p.phone) === phoneClean)
      if (dup) return json({ error: 'An account with that phone number already exists. Try signing in.' }, 409)
    }

    // Credential — password for email accounts, generated PIN for phone-only
    let plainPin = null
    let credHash

    if (emailClean) {
      // Email account — PBKDF2 hash of the user-chosen password
      credHash = await hashCredential(password.trim())
    } else {
      // Phone-only account — generate PIN and store its PBKDF2 hash
      plainPin = generatePin()
      credHash = await hashCredential(plainPin)
    }

    // Insert
    const row = await env.DB.prepare(`
      INSERT INTO participants
        (email, phone, pin_hash, first_name, last_name, address, city, state, zip, newsletter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      emailClean, phoneClean, credHash,
      firstName.trim(), lastName.trim(),
      address?.trim() || null, city?.trim() || null,
      state?.trim() || null, zip?.trim() || null,
      newsletterOptIn,
    ).first()

    // Email accounts get a branded welcome/registration email; phone-only
    // accounts get their PIN so they can log in.
    if (emailClean) {
      try {
        const tpl = accountWelcomeEmail({ firstName: firstName.trim(), email: emailClean })
        await sendEmail(env, { to: emailClean, ...tpl })
      } catch (e) { console.error('Email send failed:', e) }
    } else if (phoneClean) {
      // Phone-only accounts have no email address to send the PIN to; the PIN
      // is returned in the response body and shown to the user on screen.
    }

    // Session
    const sessionId = crypto.randomUUID()
    await env.SESSIONS.put(
      `participant_session:${sessionId}`,
      JSON.stringify({
        participantId: row.id,
        email: emailClean, phone: phoneClean,
        firstName: firstName.trim(), lastName: lastName.trim(),
        isParticipant: true,
      }),
      { expirationTtl: 60 * 15 }
    )

    const res = json({
      ok: true,
      pin: plainPin,           // null for email accounts
      isPasswordAccount: !!emailClean,
      participantId: row.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }, 201)

    const headers = new Headers(res.headers)
    headers.set('Set-Cookie',
      `participant_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*15}`)
    return new Response(res.body, { status: 201, headers })

  } catch (e) {
    console.error('[participant-signup]', e?.message, e?.stack)
    if (e.message?.includes('UNIQUE')) return json({ error: 'An account with that email or phone already exists.' }, 409)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
