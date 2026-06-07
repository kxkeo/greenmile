// POST /api/stripe/create-payment-intent
// Creates a Stripe Customer (if we have payer info) and a PaymentIntent
// linked to that Customer. Returns the client secret.
// Requires: STRIPE_SECRET_KEY env var set in Cloudflare dashboard.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// Find an existing Stripe Customer by email, or create a new one.
// Uses Stripe's search API so we don't churn out duplicate customers
// for repeat payers (same participant registering for multiple events).
async function getOrCreateCustomer(env, customer) {
  if (!customer) return null
  const email = (customer.email || '').trim().toLowerCase()
  const name  = (customer.name  || '').trim()
  if (!email && !name) return null

  // Try to find by email first (cheap lookup — skips if no email)
  if (email) {
    try {
      const searchUrl = `https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(`email:"${email}"`)}`
      const r = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
      })
      const s = await r.json()
      if (r.ok && s.data?.length > 0) {
        // Update name/phone/address on the existing customer so latest info sticks
        const id = s.data[0].id
        const upd = new URLSearchParams()
        if (name)           upd.append('name',  name)
        if (customer.phone) upd.append('phone', customer.phone)
        if (customer.city)  upd.append('address[city]',        customer.city)
        if (customer.state) upd.append('address[state]',       customer.state)
        if (customer.zip)   upd.append('address[postal_code]', customer.zip)
        if (customer.country) upd.append('address[country]', customer.country)
        if ([...upd].length) {
          await fetch(`https://api.stripe.com/v1/customers/${id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
              'Content-Type':  'application/x-www-form-urlencoded',
            },
            body: upd.toString(),
          }).catch(() => {})
        }
        return id
      }
    } catch { /* fall through to create */ }
  }

  // Create new
  const p = new URLSearchParams()
  if (name)           p.append('name',  name)
  if (email)          p.append('email', email)
  if (customer.phone) p.append('phone', customer.phone)
  if (customer.city)  p.append('address[city]',        customer.city)
  if (customer.state) p.append('address[state]',       customer.state)
  if (customer.zip)   p.append('address[postal_code]', customer.zip)
  p.append('address[country]', customer.country || 'US')
  p.append('metadata[source]', 'greenmile-registration')

  const r = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: p.toString(),
  })
  const c = await r.json()
  if (!r.ok) return null
  return c.id
}

export async function onRequestPost({ request, env }) {
  // Auth gate — must be a logged-in participant
  const cookie = request.headers.get('Cookie') || ''
  const match  = cookie.match(/participant_session=([^;]+)/)
  if (!match) return json({ error: 'Not authenticated' }, 401)

  const sessionRaw = await env.SESSIONS.get(`participant_session:${match[1]}`)
  if (!sessionRaw) return json({ error: 'Session expired' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const {
    amountCents,
    description = 'Green Mile Boosters Registration',
    receiptEmail = null,
    customer = null,   // { name, email, phone, city, state, zip, country }
    metadata = null,   // arbitrary flat key→string map
  } = body

  if (!amountCents || amountCents < 50) return json({ error: 'Invalid amount' }, 400)
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured' }, 500)

  try {
    // Create or reuse Stripe Customer so the dashboard "Customer" column is populated
    const customerId = await getOrCreateCustomer(env, customer)

    const params = new URLSearchParams({
      amount:   String(Math.round(amountCents)),
      currency: 'usd',
      description,
      'automatic_payment_methods[enabled]': 'true',
    })

    if (customerId) params.append('customer', customerId)

    // Email receipt (Stripe sends buyer a receipt if email present)
    const email = receiptEmail || customer?.email
    if (email) params.append('receipt_email', email)

    // Customer metadata — also on the PI for cross-reference in the transaction view
    if (customer) {
      if (customer.name)  params.append('metadata[customer_name]',  customer.name)
      if (customer.email) params.append('metadata[customer_email]', customer.email)
      if (customer.phone) params.append('metadata[customer_phone]', customer.phone)
      if (customer.city)  params.append('metadata[customer_city]',  customer.city)
      if (customer.state) params.append('metadata[customer_state]', customer.state)
      if (customer.zip)   params.append('metadata[customer_zip]',   customer.zip)
    }
    if (metadata && typeof metadata === 'object') {
      for (const [k, v] of Object.entries(metadata)) {
        if (v != null) params.append(`metadata[${k}]`, String(v).slice(0, 500))
      }
    }

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const pi = await res.json()
    if (!res.ok) return json({ error: pi.error?.message || 'Stripe error' }, 500)

    return json({ clientSecret: pi.client_secret, customerId })
  } catch (e) {
    return json({ error: 'Payment setup failed: ' + e.message }, 500)
  }
}
