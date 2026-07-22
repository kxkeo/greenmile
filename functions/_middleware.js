export async function onRequest(context) {
  const { request, env, next } = context
  const url = new URL(request.url)

  // ── Geo block check (applies to all routes) ──────────────────────────────
  const geoBlock = await env.SESSIONS.get('config:geo_block').catch(() => null)
  if (geoBlock === 'true') {
    const country = request.cf?.country
    if (country && country !== 'US') {
      const allowedIPs = await env.SESSIONS.get('config:geo_allow_ips').catch(() => '')
      const clientIP   = request.headers.get('CF-Connecting-IP') || ''
      const allowed    = (allowedIPs || '').split(',').map(s => s.trim()).filter(Boolean)
      if (!allowed.includes(clientIP)) {
        return new Response(
          '<!DOCTYPE html><html><head><title>Not Available</title></head><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#e2e4e8"><h1 style="color:#1c7d3f">🏈 GREEN MILE BOOSTERS</h1><p>This site is only available in the United States.</p></body></html>',
          { status: 403, headers: { 'Content-Type': 'text/html' } }
        )
      }
    }
  }

  // Only guard /api/* routes
  if (!url.pathname.startsWith('/api/')) return next()

  // ── Public routes — no session needed ────────────────────────────────────
  const open = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/staff-login',
    '/api/auth/participant-login',
    '/api/auth/participant-me',
    '/api/auth/participant-signup',
    '/api/auth/participant-logout',
    '/api/school',
    '/api/lineup',
    '/api/roster',
    '/api/away-teams',
    '/api/events',
    '/api/campaigns',
    '/api/players/active-roster',
    // Store public
    '/api/store/products',
    '/api/store/shipping-rate',
    '/api/store/orders/confirmation',
    // Registrations & donations public submit
    '/api/registrations/golf',
    '/api/registrations/camp',
    // Public payment-intent for donations & business sponsorships (no login)
    '/api/donations/payment-intent',
  ]
  if (open.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) return next()

  // Donations POST is public (anyone can donate); GET/PATCH require admin
  if (url.pathname === '/api/donations' && request.method === 'POST') return next()

  // ── Participant routes — require participant_session ───────────────────────
  const participantRoutes = [
    '/api/auth/participant-update',
    '/api/auth/my-orders',
    '/api/auth/participant-registrations',
    '/api/auth/participant-donations',
    '/api/store/orders',
    '/api/store/payment-intent',
    '/api/events/payment-intent',
    '/api/registrations/event',
    '/api/stripe/create-payment-intent',
  ]
  if (participantRoutes.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) {
    const cookie = request.headers.get('Cookie') || ''
    const match  = cookie.match(/participant_session=([^;]+)/)
    if (!match) return unauth('Unauthorized')
    const sessionKey = `participant_session:${match[1]}`
    const raw = await env.SESSIONS.get(sessionKey)
    if (!raw) return unauth('Session expired')
    const TTL = 60 * 15
    await env.SESSIONS.put(sessionKey, raw, { expirationTtl: TTL })
    const response   = await next()
    const newHeaders = new Headers(response.headers)
    newHeaders.append('Set-Cookie',
      `participant_session=${match[1]}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`)
    return new Response(response.body, { status: response.status, headers: newHeaders })
  }

  // ── Admin / Game Day routes — require greenmile_session ────────────────────────
  const cookie    = request.headers.get('Cookie') || ''
  const match     = cookie.match(/(?:^|;\s*)greenmile_session=([^;]+)/)
  const sessionId = match?.[1]?.trim()
  if (!sessionId) return unauth('Unauthorized')

  try {
    const sessionKey = `session:${sessionId}`
    const raw        = await env.SESSIONS.get(sessionKey)
    if (!raw) return unauth('Session expired or invalid')

    const sessionData = JSON.parse(raw)
    context.data.user = sessionData

    // /api/admin/* — admins always allowed; the email+password "staff" role
    // (role === 'staff') gets most admin surfaces too, but with a deny list for
    // the genuinely admin-only endpoints (data wipes, admin-user CRUD, geo
    // config, server-paid refunds, test mail, dev log).
    if (url.pathname.startsWith('/api/admin/')) {
      const isStaffRole = sessionData.role === 'staff'
      if (!sessionData.isAdmin && !isStaffRole) {
        return unauth('Admin access required')
      }
      if (isStaffRole) {
        // Staff role's nav exposes Schedule, Registrations, Store, Donations,
        // and Player Credits. Anything outside that — campaign config,
        // participant CRUD, audit logs, and the dev/system surface — stays
        // admin-only at the API layer.
        const adminOnlyAdminPaths = [
          '/api/admin/dev-log',
          '/api/admin/email-test',
          '/api/admin/factory-reset',
          '/api/admin/config',
          '/api/admin/refund',
          '/api/admin/campaigns',
          '/api/admin/participants',
          '/api/admin/event-logs',
        ]
        if (adminOnlyAdminPaths.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) {
          return unauth('Admin access required')
        }
      }
    }

    // /api/accounts/* — DHRC admin user CRUD stays admin-only; staff cannot
    // create or modify admin-login users.
    if (url.pathname.startsWith('/api/accounts') && !sessionData.isAdmin) {
      return unauth('Admin access required')
    }

    // /api/staff/* requires either a staff session (event_staff code login or
    // new staff email/password) or an admin (admins can see everything).
    if (url.pathname.startsWith('/api/staff/') && !sessionData.isStaff && !sessionData.isAdmin && sessionData.role !== 'staff') {
      return unauth('Staff access required')
    }

    // Donations GET/PATCH require admin
    if (url.pathname === '/api/donations' && !sessionData.isAdmin) {
      return unauth('Admin access required')
    }

    const ttl = sessionData.ttl || 60 * 15
    await env.SESSIONS.put(sessionKey, raw, { expirationTtl: ttl })

    const response   = await next()
    const newHeaders = new Headers(response.headers)
    newHeaders.append('Set-Cookie',
      `greenmile_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}`)
    return new Response(response.body, { status: response.status, headers: newHeaders })

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Session error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}

function unauth(msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401, headers: { 'Content-Type': 'application/json' }
  })
}
