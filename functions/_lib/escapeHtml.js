// Tiny HTML-escape helper for email templates and anywhere user input is
// interpolated into HTML. Null/undefined safe — returns an empty string.
// Keep the entity set small on purpose; these five cover the injection vectors
// that matter in email clients and React-server-rendered HTML.

export function esc(v) {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
