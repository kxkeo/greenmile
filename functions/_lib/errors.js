// Generic error helper — never echo raw SQLite / Stripe exception text to the
// client. Log the full error server-side (Cloudflare tails pick it up) and
// return a stable, user-safe message.

export function dbError(e, route = 'api') {
  try { console.error(`[${route}]`, e?.message || e, e?.stack || '') } catch {}
  return new Response(
    JSON.stringify({ error: 'Something went wrong. Please try again.' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  )
}
