// POST /api/unsubscribe  { email, token }  — public. Records an email opt-out
// so future promo sends skip it. The token is the HMAC from the email link.

import { verifyUnsub } from '../_lib/unsubscribe.js'

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const email = (body.email || '').toString().trim().toLowerCase()
  const token = (body.token || '').toString().trim()
  if (!email) return json({ error: 'Missing email' }, 400)

  if (!(await verifyUnsub(env, email, token))) {
    return json({ error: 'This unsubscribe link is invalid or has expired. Contact info@greenmileboosters.org to be removed.' }, 400)
  }

  try {
    await env.DB.prepare(
      `INSERT INTO email_unsubscribes (email, source) VALUES (?, 'link')
       ON CONFLICT(email) DO NOTHING`
    ).bind(email).run()
    return json({ ok: true, email })
  } catch (e) {
    console.error('[unsubscribe]', e?.message)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
