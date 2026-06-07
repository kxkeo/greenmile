// GET /api/staff/me — returns the current staff user from the session.
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export async function onRequestGet({ data }) {
  const u = data?.user
  if (!u) return json({ error: 'Unauthorized' }, 401)
  return json({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    loginCode: u.loginCode,
    role: u.role,
    isStaff: !!u.isStaff,
    isAdmin: !!u.isAdmin,
  })
}
