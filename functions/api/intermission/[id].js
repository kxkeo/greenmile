function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

// DELETE /api/intermission/:id
export async function onRequestDelete({ env, params }) {
  await env.DB.prepare('DELETE FROM intermission_tracks WHERE id=?').bind(params.id).run()
  return json({ ok: true })
}
