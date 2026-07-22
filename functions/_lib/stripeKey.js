// Resolve the Stripe secret key. A Cloudflare env secret (STRIPE_SECRET_KEY)
// always wins; otherwise we fall back to the key saved from the admin
// Settings → Payments panel (KV: config:stripe_secret_key). This lets the
// boosters turn on card payments from the dashboard without a redeploy.
//
// NOTE: the *publishable* key (VITE_STRIPE_PUBLISHABLE_KEY) is baked into the
// frontend bundle at build time and cannot be set at runtime — it must be a
// Cloudflare build variable.
export async function getStripeSecretKey(env) {
  if (env.STRIPE_SECRET_KEY) return env.STRIPE_SECRET_KEY
  try {
    return (await env.SESSIONS.get('config:stripe_secret_key')) || null
  } catch {
    return null
  }
}
