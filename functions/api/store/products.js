// GET /api/store/products — public product listing (active only)
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM store_products WHERE active=1 ORDER BY type ASC, name ASC'
  ).all()
  return Response.json(results.map(p => ({
    ...p,
    sizes:  JSON.parse(p.sizes  || '[]'),
    colors: JSON.parse(p.colors || '[]'),
  })))
}
