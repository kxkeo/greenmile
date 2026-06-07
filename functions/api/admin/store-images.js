// POST /api/admin/store-images — upload product image to R2
// Auth: middleware enforces isAdmin for all /api/admin/* routes

function json(d, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestPost({ request, env }) {
  if (!env.SHOP_IMAGES) {
    return json({ error: 'Image storage not configured. Add R2 bucket in Cloudflare dashboard.' }, 503)
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file) return json({ error: 'No file provided' }, 400)

  const ext   = file.name.split('.').pop().toLowerCase()
  const key   = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()

  await env.SHOP_IMAGES.put(key, bytes, {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
  })

  // Return public URL — requires SHOP_IMAGES_URL env var (set in CF Pages settings)
  const base = env.SHOP_IMAGES_URL || 'https://images.greenmileboosters.com'
  return json({ url: `${base}/${key}` })
}
