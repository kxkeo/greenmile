// DELETE /api/admin/factory-reset — wipe all transactional/test data
// Clears: registrations, donations, participants, sessions, email log,
//         golf/camp meta.
// PRESERVES: campaigns, players, schedule, events, dev_log, hall_of_fame,
//            scorer_accounts, admin KV sessions, site config.
// Campaigns are preserved because they appear on the public schedule
// and game day calendar — use Clear All Campaigns separately if needed.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// Confirmation phrase the caller must type to actually wipe data. Deliberately
// not an env var — the phrase is documented here so a misconfigured env can't
// let a hostile request through with a blank string.
const CONFIRM_PHRASE = 'FACTORY RESET'

export async function onRequestDelete({ request, env }) {
  // Require an explicit confirmation phrase in the request body. Admin auth is
  // enforced by middleware, but factory-reset destroys data and should also
  // require an out-of-band confirmation. A single fat-fingered click must not
  // wipe prod.
  let body = {}
  try { body = await request.json() } catch { /* optional body */ }
  if ((body.confirm || '').trim() !== CONFIRM_PHRASE) {
    return json({ error: `Confirmation required. POST { "confirm": "${CONFIRM_PHRASE}" }.` }, 400)
  }

  try {
    const db = env.DB
    // Registrations — FK-safe order
    await db.prepare('DELETE FROM golf_team_members').run()
    await db.prepare('DELETE FROM golf_teams').run()
    await db.prepare('DELETE FROM golf_scores').run()
    await db.prepare('DELETE FROM golf_contest_results').run()
    await db.prepare('DELETE FROM golf_registrations').run()
    await db.prepare('DELETE FROM camp_registrations').run()
    await db.prepare('DELETE FROM event_registrations').run()
    // Donations
    await db.prepare('DELETE FROM donations').run()
    // Golf/camp meta (linked to events, not campaigns)
    await db.prepare('DELETE FROM golf_tournament_meta').run()
    await db.prepare('DELETE FROM camp_meta').run()
    // Participants + sessions (sessions reference participants)
    await db.prepare('DELETE FROM participant_sessions').run()
    await db.prepare('DELETE FROM participants').run()
    // Email log
    await db.prepare('DELETE FROM email_log').run()

    return json({ ok: true })
  } catch (e) {
    console.error('[admin/factory-reset]', e?.message, e?.stack)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
