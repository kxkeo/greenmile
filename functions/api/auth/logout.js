export async function onRequestPost(context) {
  const { request, env } = context
  const cookie = request.headers.get('Cookie') || ''
  const match = cookie.match(/greenmile_session=([^;]+)/)
  if (match?.[1]) {
    await env.SESSIONS.delete(`session:${match[1]}`)
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'greenmile_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  })
}
