// GET/POST/PATCH/DELETE /api/admin/store-products
// Auth: middleware enforces isAdmin for all /api/admin/* routes

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM store_products ORDER BY type ASC, name ASC'
    ).all()
    return json(results.map(p => ({
      ...p,
      sizes:  JSON.parse(p.sizes  || '[]'),
      colors: JSON.parse(p.colors || '[]'),
    })))
  }

  if (request.method === 'POST') {
    const b = await request.json()
    const r = await env.DB.prepare(`
      INSERT INTO store_products (name, type, description, upc, sizes, colors, price_cents, cost_cents, inventory, weight_oz, image_url, active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      b.name, b.type, b.description || null, b.upc || null,
      JSON.stringify(b.sizes || []), JSON.stringify(b.colors || []),
      b.price_cents || 0, b.cost_cents || 0, b.inventory || 0,
      b.weight_oz || 0, b.image_url || null, b.active !== false ? 1 : 0
    ).run()
    const product = await env.DB.prepare('SELECT * FROM store_products WHERE id=?').bind(r.meta.last_row_id).first()
    return json({ ...product, sizes: JSON.parse(product.sizes || '[]'), colors: JSON.parse(product.colors || '[]') })
  }

  if (request.method === 'PATCH') {
    const b = await request.json()
    const { id, ...fields } = b
    if (!id) return json({ error: 'Missing id' }, 400)
    const cols = []
    const vals = []
    const allowed = ['name','type','description','upc','price_cents','cost_cents','inventory','weight_oz','image_url','active']
    for (const key of allowed) {
      if (key in fields) { cols.push(`${key}=?`); vals.push(fields[key]) }
    }
    if ('sizes'  in fields) { cols.push('sizes=?');  vals.push(JSON.stringify(fields.sizes  || [])) }
    if ('colors' in fields) { cols.push('colors=?'); vals.push(JSON.stringify(fields.colors || [])) }
    if (!cols.length) return json({ error: 'Nothing to update' }, 400)
    vals.push(id)
    await env.DB.prepare(`UPDATE store_products SET ${cols.join(',')} WHERE id=?`).bind(...vals).run()
    const product = await env.DB.prepare('SELECT * FROM store_products WHERE id=?').bind(id).first()
    return json({ ...product, sizes: JSON.parse(product.sizes || '[]'), colors: JSON.parse(product.colors || '[]') })
  }

  if (request.method === 'DELETE') {
    const { id } = await request.json()
    if (!id) return json({ error: 'Missing id' }, 400)
    await env.DB.prepare('UPDATE store_products SET active=0 WHERE id=?').bind(id).run()
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}
