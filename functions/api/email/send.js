// Shared Resend email utility
// Usage: await sendEmail(env, { to, subject, html })

export async function sendEmail(env, { to, subject, html, replyTo = 'info@greenmileboosters.org' }) {
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set')
    return { ok: false, error: 'Email service not configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Green Mile Boosters <noreply@greenmileboosters.org>',
        to: [to],
        reply_to: replyTo,
        subject,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend error:', data)
      return { ok: false, error: data.message || 'Send failed' }
    }
    return { ok: true, id: data.id }
  } catch (e) {
    console.error('Resend exception:', e)
    return { ok: false, error: e.message }
  }
}
