export async function onRequestPost({ request, env }) {
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)

  if (match?.[1]) {
    await env.SESSIONS.delete(`participant_session:${match[1]}`).catch(() => {})
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Clear-Site-Data': '"cache", "cookies"',
      'Set-Cookie': 'participant_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    },
  })
}
