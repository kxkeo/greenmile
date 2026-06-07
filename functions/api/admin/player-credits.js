// GET /api/admin/player-credits
// Returns all players who have received referral credits,
// with aggregate totals by type + a full list of individual referrals
// (registrant name, campaign title, amount, date).
// Each query is wrapped independently — one bad column never kills the whole response.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

async function safeQuery(db, sql) {
  try {
    const { results } = await db.prepare(sql).all()
    return results || []
  } catch {
    return []
  }
}

export async function onRequestGet({ request, env }) {
  const cookie = request.headers.get('Cookie') || ''
  if (!cookie.includes('greenmile_session')) return json({ error: 'Not authenticated' }, 401)

  try {
    // ── Aggregate totals (for stat cells) ────────────────────────────────────
    // Refunded rows are excluded — a refunded registration/donation netted $0 to DHRC,
    // so it shouldn't earn referral credit for the referring player.
    const [campAgg, golfAgg, eventAgg, donationAgg] = await Promise.all([
      safeQuery(env.DB, `
        SELECT referred_player_id AS player_id,
               COUNT(*) AS count,
               SUM(total_cents) AS total_cents
        FROM camp_registrations
        WHERE referred_player_id IS NOT NULL
          AND COALESCE(payment_status,'') != 'refunded'
        GROUP BY referred_player_id
      `),
      safeQuery(env.DB, `
        SELECT referred_player_id AS player_id,
               COUNT(*) AS count,
               SUM(total_cents) AS total_cents
        FROM golf_registrations
        WHERE referred_player_id IS NOT NULL
          AND COALESCE(payment_status,'') != 'refunded'
        GROUP BY referred_player_id
      `),
      safeQuery(env.DB, `
        SELECT referred_player_id AS player_id,
               COUNT(*) AS count,
               SUM(total_cents) AS total_cents
        FROM event_registrations
        WHERE referred_player_id IS NOT NULL
          AND COALESCE(payment_status,'') != 'refunded'
        GROUP BY referred_player_id
      `),
      safeQuery(env.DB, `
        SELECT referred_player_id AS player_id,
               COUNT(*) AS count,
               SUM(amount_cents) AS total_cents
        FROM donations
        WHERE referred_player_id IS NOT NULL
          AND COALESCE(payment_status,'') != 'refunded'
        GROUP BY referred_player_id
      `),
    ])

    // ── Individual referral rows (for detail list) ────────────────────────────
    const [campRows, golfRows, eventRows, donationRows] = await Promise.all([
      safeQuery(env.DB, `
        SELECT cr.referred_player_id AS player_id,
               p.first_name || ' ' || p.last_name AS registrant_name,
               e.title AS campaign_title,
               cr.total_cents AS amount_cents,
               cr.created_at AS date,
               'camp' AS type
        FROM camp_registrations cr
        JOIN participants p ON p.id = cr.participant_id
        JOIN events e ON e.id = cr.event_id
        WHERE cr.referred_player_id IS NOT NULL
          AND COALESCE(cr.payment_status,'') != 'refunded'
        ORDER BY cr.created_at DESC
      `),
      safeQuery(env.DB, `
        SELECT gr.referred_player_id AS player_id,
               p.first_name || ' ' || p.last_name AS registrant_name,
               COALESCE(c.title, 'Golf Tournament') AS campaign_title,
               gr.total_cents AS amount_cents,
               gr.created_at AS date,
               'golf' AS type
        FROM golf_registrations gr
        JOIN participants p ON p.id = gr.participant_id
        LEFT JOIN campaigns c ON c.id = gr.event_id
        WHERE gr.referred_player_id IS NOT NULL
          AND COALESCE(gr.payment_status,'') != 'refunded'
        ORDER BY gr.created_at DESC
      `),
      safeQuery(env.DB, `
        SELECT er.referred_player_id AS player_id,
               er.first_name || ' ' || er.last_name AS registrant_name,
               c.title AS campaign_title,
               er.total_cents AS amount_cents,
               er.created_at AS date,
               'event' AS type
        FROM event_registrations er
        JOIN campaigns c ON c.id = er.campaign_id
        WHERE er.referred_player_id IS NOT NULL
          AND COALESCE(er.payment_status,'') != 'refunded'
        ORDER BY er.created_at DESC
      `),
      safeQuery(env.DB, `
        SELECT d.referred_player_id AS player_id,
               d.first_name || ' ' || d.last_name AS registrant_name,
               'Donation' AS campaign_title,
               d.amount_cents,
               d.created_at AS date,
               'donation' AS type
        FROM donations d
        WHERE d.referred_player_id IS NOT NULL
          AND COALESCE(d.payment_status,'') != 'refunded'
        ORDER BY d.created_at DESC
      `),
    ])

    // ── Collect all unique player IDs ─────────────────────────────────────────
    const allPlayerIds = [...new Set([
      ...campAgg, ...golfAgg, ...eventAgg, ...donationAgg
    ].map(r => r.player_id).filter(Boolean))]

    if (allPlayerIds.length === 0) return json([])

    // ── Fetch player info ─────────────────────────────────────────────────────
    const placeholders = allPlayerIds.map(() => '?').join(',')
    const { results: players } = await env.DB.prepare(
      `SELECT id, first_name, last_name, number, roster_year FROM players WHERE id IN (${placeholders})`
    ).bind(...allPlayerIds).all()

    // ── Build lookup maps ─────────────────────────────────────────────────────
    const toAggMap = rows => Object.fromEntries(rows.map(r => [r.player_id, r]))
    const campMap     = toAggMap(campAgg)
    const golfMap     = toAggMap(golfAgg)
    const eventMap    = toAggMap(eventAgg)
    const donationMap = toAggMap(donationAgg)

    // All detail rows combined, keyed by player_id
    const allDetailRows = [...campRows, ...golfRows, ...eventRows, ...donationRows]
    const referralsByPlayer = {}
    for (const row of allDetailRows) {
      if (!referralsByPlayer[row.player_id]) referralsByPlayer[row.player_id] = []
      referralsByPlayer[row.player_id].push({
        type:           row.type,
        campaignTitle:  row.campaign_title,
        registrantName: row.registrant_name,
        amountCents:    row.amount_cents || 0,
        date:           row.date,
      })
    }
    // Sort each player's referrals newest first
    for (const pid of Object.keys(referralsByPlayer)) {
      referralsByPlayer[pid].sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    // ── Build final result ────────────────────────────────────────────────────
    const result = players.map(p => {
      const camp     = campMap[p.id]     || { count: 0, total_cents: 0 }
      const golf     = golfMap[p.id]     || { count: 0, total_cents: 0 }
      const event    = eventMap[p.id]    || { count: 0, total_cents: 0 }
      const donation = donationMap[p.id] || { count: 0, total_cents: 0 }
      const totalCents = (camp.total_cents||0) + (golf.total_cents||0) + (event.total_cents||0) + (donation.total_cents||0)
      return {
        playerId:   p.id,
        firstName:  p.first_name,
        lastName:   p.last_name,
        number:     p.number,
        rosterYear: p.roster_year,
        camp:     { count: camp.count||0,     totalCents: camp.total_cents||0 },
        golf:     { count: golf.count||0,     totalCents: golf.total_cents||0 },
        event:    { count: event.count||0,    totalCents: event.total_cents||0 },
        donation: { count: donation.count||0, totalCents: donation.total_cents||0 },
        totalCount: (camp.count||0) + (golf.count||0) + (event.count||0) + (donation.count||0),
        totalCents,
        referrals: referralsByPlayer[p.id] || [],
      }
    }).sort((a, b) => b.totalCents - a.totalCents)

    return json(result)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
