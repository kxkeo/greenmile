// Twilio SMS helper. Usage:
//   import { sendSms } from '../_lib/sms.js'
//   await sendSms(env, { to, body, purpose: 'pin' })
//
// Required Cloudflare secrets (Pages → Settings → Environment Variables):
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM        — your Twilio phone number in +1XXXXXXXXXX format
//
// Behaviour:
//   • If any secret is missing, sendSms returns { ok: false, error: 'Not configured' }
//     and quietly no-ops. Callers should treat SMS as best-effort.
//   • Normalises recipient to E.164 when a 10-digit US number is passed.
//   • Writes a row to sms_log whether the send succeeds or fails, so we have
//     an audit trail of every PIN / reset we attempted to deliver.

function toE164(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (String(raw).startsWith('+')) return String(raw).trim()
  return null
}

async function logSms(env, { to, purpose, status, error = null, sid = null, participantId = null }) {
  try {
    await env.DB.prepare(
      `INSERT INTO sms_log (to_phone, purpose, status, provider_sid, error, participant_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(to || null, purpose || null, status, sid, error, participantId).run()
  } catch (e) {
    // Never let logging failures swallow the actual send result.
    console.error('[sms-log] insert failed', e?.message)
  }
}

export async function sendSms(env, { to, body, purpose = 'other', participantId = null, bypassOptOut = false } = {}) {
  const e164 = toE164(to)
  if (!e164) {
    await logSms(env, { to, purpose, status: 'invalid', error: 'Invalid phone', participantId })
    return { ok: false, error: 'Invalid phone number' }
  }
  if (!body?.trim()) {
    await logSms(env, { to: e164, purpose, status: 'invalid', error: 'Empty body', participantId })
    return { ok: false, error: 'Empty body' }
  }
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
    console.error('[sms] Twilio not configured')
    await logSms(env, { to: e164, purpose, status: 'not_configured', error: 'Twilio env missing', participantId })
    return { ok: false, error: 'SMS not configured' }
  }

  // Respect the participant's opt-out unless the caller explicitly overrides
  // (e.g. PIN-reset texts are security-critical and always sent).
  if (!bypassOptOut && participantId) {
    try {
      const p = await env.DB.prepare('SELECT sms_opt_out FROM participants WHERE id = ?').bind(participantId).first()
      if (p?.sms_opt_out === 1) {
        await logSms(env, { to: e164, purpose, status: 'opted_out', participantId })
        return { ok: false, error: 'Recipient opted out of SMS' }
      }
    } catch { /* fall through — missing column shouldn't block sends */ }
  }

  // Twilio Messages API uses HTTP Basic Auth with SID:AUTH_TOKEN.
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}/Messages.json`
  const auth = 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)
  const params = new URLSearchParams({
    From: env.TWILIO_FROM,
    To:   e164,
    Body: String(body),
  })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.message || `Twilio error (${res.status})`
      console.error('[sms] send failed', msg)
      await logSms(env, { to: e164, purpose, status: 'failed', error: msg, participantId })
      return { ok: false, error: msg }
    }
    await logSms(env, { to: e164, purpose, status: 'sent', sid: data.sid || null, participantId })
    return { ok: true, sid: data.sid }
  } catch (e) {
    console.error('[sms] exception', e?.message)
    await logSms(env, { to: e164, purpose, status: 'failed', error: e?.message, participantId })
    return { ok: false, error: e?.message || 'Send failed' }
  }
}

// Short, plain-text PIN message — email-to-SMS-free wording, no links, no
// carrier filter triggers. Keep under 160 chars.
export function pinSmsBody({ pin, newAccount = false }) {
  if (newAccount) {
    return `The Green Mile Boosters: Your login PIN is ${pin}. Keep it safe. Sign in at greenmileboosters.org/my-account/login`
  }
  return `The Green Mile Boosters: Your new login PIN is ${pin}. Sign in at greenmileboosters.org/my-account/login`
}
