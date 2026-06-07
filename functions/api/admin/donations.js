// DELETE /api/admin/donations — clear all donations (dev/testing only)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestDelete({ env }) {
  try {
    const { meta } = await env.DB.prepare('DELETE FROM donations').run()
    return json({ ok: true, deleted: meta.changes })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
