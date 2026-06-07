export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  return new Response(JSON.stringify({ user }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
