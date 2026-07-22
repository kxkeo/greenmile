// Shared email sender.
//   Usage: await sendEmail(env, { to, subject, html })
//
// Transport order:
//   1. MXroute (or any) SMTP — when SMTP settings are present. Sends FROM
//      noreply@greenmileboosters.org straight through your mail host, using a
//      Workers-native SMTP client (worker-mailer over Cloudflare sockets).
//   2. Resend HTTP API — automatic fallback so receipts never silently break
//      while SMTP is being set up.
//
// SMTP settings come from Cloudflare env vars (recommended for the password)
// or the admin Settings → Email panel (KV config:smtp_*):
//   SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS,
//   SMTP_SECURE ('true'|'false'), SMTP_AUTH ('login'|'plain')

const FROM_NAME  = 'The Green Mile Boosters'
const FROM_EMAIL = 'noreply@greenmileboosters.org'

async function cfg(env, key, ...fallbacks) {
  const envVal = env[key]
  if (envVal != null && envVal !== '') return envVal
  try {
    const kv = await env.SESSIONS.get(`config:${key.toLowerCase()}`)
    if (kv != null && kv !== '') return kv
  } catch { /* ignore */ }
  for (const f of fallbacks) if (f != null && f !== '') return f
  return null
}

function htmlToText(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

async function sendViaSmtp(env, { to, subject, html, replyTo }) {
  const host = await cfg(env, 'SMTP_HOST')
  const pass = await cfg(env, 'SMTP_PASS')
  if (!host || !pass) return null // not configured — signal caller to fall back

  const user   = (await cfg(env, 'SMTP_USER', FROM_EMAIL))
  const port   = parseInt(await cfg(env, 'SMTP_PORT', '465'), 10)
  const secRaw = await cfg(env, 'SMTP_SECURE')
  const secure = secRaw != null ? String(secRaw) === 'true' : port === 465
  const authRaw = (await cfg(env, 'SMTP_AUTH', '') || '').toLowerCase()
  const authType = authRaw || ['login', 'plain']

  // Port 465 = implicit TLS (secure). Port 587 = plaintext then STARTTLS.
  const tls = secure ? { secure: true } : { startTls: true }

  // Dynamic import so a bundling issue can only affect the SMTP path, never
  // the whole functions bundle (the caller falls back to Resend on throw).
  const { WorkerMailer } = await import('worker-mailer')
  const mailer = await WorkerMailer.connect({
    host, port, ...tls, authType,
    credentials: { username: user, password: pass },
  })
  try {
    await mailer.send({
      from: { name: FROM_NAME, email: user },
      to: { name: '', email: to },
      subject,
      text: htmlToText(html),
      html,
    })
  } finally {
    try { await mailer.close?.() } catch { /* ignore */ }
  }
  return { ok: true, via: 'smtp' }
}

async function sendViaResend(env, { to, subject, html, replyTo }) {
  const apiKey = env.RESEND_API_KEY || await env.SESSIONS.get('config:resend_api_key').catch(() => null)
  if (!apiKey) return { ok: false, error: 'Email service not configured' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.message || 'Send failed' }
  return { ok: true, id: data.id, via: 'resend' }
}

export async function sendEmail(env, { to, subject, html, replyTo = 'info@greenmileboosters.org' }) {
  // 1. Try SMTP (MXroute) first when configured.
  let smtpErr = null
  try {
    const smtp = await sendViaSmtp(env, { to, subject, html, replyTo })
    if (smtp) return smtp // SMTP not configured returns null → fall through to Resend
  } catch (e) {
    smtpErr = e?.message || String(e)
    console.error('SMTP send failed:', smtpErr)
  }

  // 2. Fall back to Resend. If SMTP was actually attempted and failed, surface
  //    that real error rather than Resend's generic "not configured".
  try {
    const r = await sendViaResend(env, { to, subject, html, replyTo })
    if (r.ok) return r
    return { ok: false, error: smtpErr ? `SMTP error: ${smtpErr}` : r.error }
  } catch (e) {
    return { ok: false, error: smtpErr ? `SMTP error: ${smtpErr}` : (e?.message || 'Send failed') }
  }
}
