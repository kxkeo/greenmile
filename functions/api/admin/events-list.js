// GET /api/admin/events-list?type=tournament|camp
// Returns all events of a given type, newest first — for year picker in admin forms

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')

  try {
    const query = type
      ? `SELECT id, title, date, type FROM events WHERE type = ? ORDER BY date DESC`
      : `SELECT id, title, date, type FROM events WHERE type IN ('tournament','camp') ORDER BY date DESC`

    const { results } = type
      ? await env.DB.prepare(query).bind(type).all()
      : await env.DB.prepare(query).all()

    return json(results.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      type: e.type,
      year: e.date ? new Date(e.date).getFullYear() : null,
      label: `${e.title} (${e.date ? e.date.slice(0, 4) : '?'})`,
    })))
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
