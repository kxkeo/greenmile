// POST /api/admin/send-promo — broadcast a promo/announcement to opted-in
// contacts. Body: { subject, heading, message, ctaLabel?, ctaUrl?, test?, testTo? }.
//   test: true + testTo  → send a single preview to that address (no unsub link
//                          needed there; still included for realism).
//   otherwise            → send to every opted-in contact NOT on the unsubscribe
//                          list, each with a working unsubscribe link.
// Admin-only (enforced by _middleware.js; kept off the staff role in the
// deny-list). Sends are sequential and capped to protect the mail host.

import { sendEmail } from '../email/send.js'
import { promoEmail } from '../email/templates.js'
import { unsubscribeUrl } from '../../_lib/unsubscribe.js'

const MAX_RECIPIENTS = 250

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

async function subscribedRecipients(env) {
  const [parts, dons, regs, unsubs] = await Promise.all([
    env.DB.prepare(`SELECT email, first_name FROM participants WHERE newsletter = 1 AND email IS NOT NULL AND email != ''`).all(),
    env.DB.prepare(`SELECT email, first_name FROM donations WHERE email_opt_in = 1 AND email IS NOT NULL AND email != '' AND payment_status != 'refunded'`).all(),
    env.DB.prepare(`SELECT email, first_name FROM event_registrations WHERE email_opt_in = 1 AND email IS NOT NULL AND email != '' AND payment_status != 'refunded'`).all(),
    env.DB.prepare(`SELECT email FROM email_unsubscribes`).all(),
  ])
  const optedOut = new Set((unsubs.results || []).map(r => (r.email || '').toLowerCase()))
  const map = new Map()
  for (const rows of [parts.results, dons.results, regs.results]) {
    for (const r of (rows || [])) {
      const email = (r.email || '').trim().toLowerCase()
      if (!email || optedOut.has(email) || map.has(email)) continue
      map.set(email, { email, firstName: (r.first_name || '').trim() })
    }
  }
  return [...map.values()]
}

export async function onRequestPost({ request, env, data }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const subject = (body.subject || '').toString().trim()
  const heading = (body.heading || '').toString().trim()
  const message = (body.message || '').toString().trim()
  const ctaLabel = (body.ctaLabel || '').toString().trim()
  const ctaUrl   = (body.ctaUrl || '').toString().trim()
  if (!subject)  return json({ error: 'A subject is required.' }, 400)
  if (!message)  return json({ error: 'A message is required.' }, 400)
  if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) return json({ error: 'The button link must start with https://' }, 400)

  // ── Test send ───────────────────────────────────────────────────────────
  if (body.test) {
    const to = (body.testTo || '').toString().trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'Enter a valid test email address.' }, 400)
    const tpl = promoEmail({ subject, heading, message, ctaLabel, ctaUrl, unsubscribeUrl: await unsubscribeUrl(env, to) })
    const r = await sendEmail(env, { to, ...tpl })
    if (!r.ok) return json({ error: `Test send failed: ${r.error || 'unknown error'}` }, 502)
    return json({ ok: true, test: true, to })
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────
  try {
    const recipients = await subscribedRecipients(env)
    if (!recipients.length) return json({ error: 'No subscribed contacts to send to.' }, 400)

    const capped = recipients.slice(0, MAX_RECIPIENTS)
    let sent = 0, failed = 0
    for (const r of capped) {
      try {
        const tpl = promoEmail({ subject, heading, message, ctaLabel, ctaUrl, unsubscribeUrl: await unsubscribeUrl(env, r.email) })
        const res = await sendEmail(env, { to: r.email, ...tpl })
        if (res.ok) sent++; else failed++
      } catch { failed++ }
    }

    // Audit line.
    await env.DB.prepare(
      `INSERT INTO email_log (participant_id, to_email, email_type, subject, status)
       VALUES (NULL, ?, 'promo', ?, ?)`
    ).bind(`${sent} sent / ${failed} failed`, subject, failed ? 'partial' : 'sent').run().catch(() => {})

    return json({
      ok: true,
      sent, failed,
      total: recipients.length,
      truncated: recipients.length > MAX_RECIPIENTS ? recipients.length - MAX_RECIPIENTS : 0,
    })
  } catch (e) {
    console.error('[admin/send-promo]', e?.message, e?.stack)
    return json({ error: 'Something went wrong sending the promo.' }, 500)
  }
}
