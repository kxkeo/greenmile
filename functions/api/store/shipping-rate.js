// POST /api/store/shipping-rate — get cheapest USPS rate from EasyPost
export async function onRequestPost({ request, env }) {
  if (!env.EASYPOST_API_KEY) {
    return Response.json({ error: 'Shipping rate lookup not configured' }, { status: 503 })
  }
  const { to_address, weight_oz } = await request.json()
  if (!to_address || !weight_oz) {
    return Response.json({ error: 'Missing to_address or weight_oz' }, { status: 400 })
  }

  const from = env.SHOP_FROM_ADDRESS
    ? JSON.parse(env.SHOP_FROM_ADDRESS)
    : { name: 'The Green Mile Boosters', street1: '1401 E El Monte Way', city: 'Dinuba', state: 'CA', zip: '93618', country: 'US' }

  const auth = btoa(`${env.EASYPOST_API_KEY}:`)
  const resp = await fetch('https://api.easypost.com/v2/shipments', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shipment: {
        to_address:   { ...to_address, country: 'US' },
        from_address: from,
        parcel: { weight: weight_oz },
      },
    }),
  })
  const data = await resp.json()
  if (!resp.ok) {
    return Response.json({ error: data.error?.message || 'EasyPost error' }, { status: 400 })
  }

  const usps = (data.rates || [])
    .filter(r => r.carrier === 'USPS')
    .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))

  if (!usps.length) {
    return Response.json({ error: 'No USPS rates available for this address' }, { status: 400 })
  }

  const best = usps[0]
  return Response.json({
    rate_cents:    Math.round(parseFloat(best.rate) * 100),
    service:       best.service,
    delivery_days: best.delivery_days,
    shipment_id:   data.id,
    rate_id:       best.id,
  })
}
