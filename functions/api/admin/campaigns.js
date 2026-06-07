// GET  /api/admin/campaigns        — list all campaigns
// POST /api/admin/campaigns        — create campaign
// PATCH /api/admin/campaigns       — update campaign
// DELETE /api/admin/campaigns      — delete campaign

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

function parseMeta(raw) {
  try { return JSON.parse(raw || '{}') } catch { return {} }
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, type, title, description, status, event_date, event_time,
              location, reg_opens_at, reg_closes_at, price_cents, meta, created_at, updated_at
       FROM campaigns ORDER BY created_at DESC`
    ).all()

    return json(results.map(r => ({
      ...r,
      meta: parseMeta(r.meta),
      priceDollars: r.price_cents != null ? r.price_cents / 100 : null,
    })))
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { type, title, description, status, event_date, event_time,
          location, reg_opens_at, reg_closes_at, price_cents, meta } = body

  if (!type)  return json({ error: 'type required' }, 400)
  if (!title?.trim()) return json({ error: 'title required' }, 400)

  try {
    const row = await env.DB.prepare(`
      INSERT INTO campaigns
        (type, title, description, status, event_date, event_time,
         location, reg_opens_at, reg_closes_at, price_cents, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      type,
      title.trim(),
      description?.trim() || '',
      status || 'draft',
      event_date || null,
      event_time || null,
      location?.trim() || null,
      reg_opens_at || null,
      reg_closes_at || null,
      price_cents != null ? Math.round(price_cents) : null,
      JSON.stringify(meta || {}),
    ).first()

    return json({ ok: true, id: row.id }, 201)
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestPatch({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id, ...fields } = body
  if (!id) return json({ error: 'id required' }, 400)

  const updates = []
  const vals = []

  const set = (col, val) => { updates.push(`${col} = ?`); vals.push(val) }

  if (fields.title       !== undefined) set('title',         fields.title?.trim() || '')
  if (fields.description !== undefined) set('description',   fields.description?.trim() || '')
  if (fields.status      !== undefined) set('status',        fields.status)
  if (fields.event_date  !== undefined) set('event_date',    fields.event_date || null)
  if (fields.event_time  !== undefined) set('event_time',    fields.event_time || null)
  if (fields.location    !== undefined) set('location',      fields.location?.trim() || null)
  if (fields.reg_opens_at  !== undefined) set('reg_opens_at',  fields.reg_opens_at || null)
  if (fields.reg_closes_at !== undefined) set('reg_closes_at', fields.reg_closes_at || null)
  if (fields.price_cents   !== undefined) set('price_cents',   fields.price_cents != null ? Math.round(fields.price_cents) : null)
  if (fields.meta          !== undefined) set('meta',          JSON.stringify(fields.meta || {}))

  set('updated_at', new Date().toISOString())
  vals.push(id)

  try {
    await env.DB.prepare(
      `UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...vals).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}

export async function onRequestDelete({ request, env }) {
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { id, all } = body

  // Clear ALL campaigns (dev tools factory use) — called after registrations are already cleared
  if (all) {
    try {
      const { meta } = await env.DB.prepare('DELETE FROM campaigns').run()
      return json({ ok: true, deleted: meta.changes })
    } catch (e) {
      return json({ error: 'Something went wrong. Please try again.' }, 500)
    }
  }

  // Delete single campaign by ID (normal admin use)
  if (!id) return json({ error: 'id required' }, 400)
  try {
    await env.DB.prepare('DELETE FROM campaigns WHERE id = ?').bind(id).run()
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
