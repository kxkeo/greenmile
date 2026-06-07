// DELETE /api/admin/registrations — clear all registrations (dev/testing only)
// Deletes in FK-safe order: dependent tables first, then registration rows.
// Covers: golf (team members, teams, scores, contest results, registrations),
//         camp registrations, event registrations.
// Does NOT touch: donations, campaigns, participants, players, schedule.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestDelete({ env }) {
  try {
    const db = env.DB
    // Golf dependents first (FK constraints)
    const { meta: m1 } = await db.prepare('DELETE FROM golf_team_members').run()
    const { meta: m2 } = await db.prepare('DELETE FROM golf_teams').run()
    const { meta: m3 } = await db.prepare('DELETE FROM golf_scores').run()
    const { meta: m4 } = await db.prepare('DELETE FROM golf_contest_results').run()
    const { meta: m5 } = await db.prepare('DELETE FROM golf_registrations').run()
    const { meta: m6 } = await db.prepare('DELETE FROM camp_registrations').run()
    const { meta: m7 } = await db.prepare('DELETE FROM event_registrations').run()

    const deleted = (m1.changes||0) + (m2.changes||0) + (m3.changes||0) +
                    (m4.changes||0) + (m5.changes||0) + (m6.changes||0) + (m7.changes||0)
    return json({ ok: true, deleted })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
