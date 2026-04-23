export function formatAuditUser(value, fallback = 'Unknown') {
  const raw = String(value || '').trim()
  if (!raw) return { primary: fallback, secondary: null, tooltip: null, raw: '' }

  const bracketMatch = raw.match(/^(.+?)\s*<([^>]+@[^>]+)>$/)
  if (bracketMatch) {
    const displayName = bracketMatch[1].trim()
    const email = bracketMatch[2].trim()
    const primary = displayName || email.split('@')[0] || fallback
    const secondary = email && primary !== email ? email : null
    return { primary, secondary, tooltip: email || raw, raw }
  }

  if (raw.includes('@')) {
    const username = raw.split('@')[0].trim() || fallback
    const secondary = username !== raw ? raw : null
    return { primary: username, secondary, tooltip: raw, raw }
  }

  return { primary: raw, secondary: null, tooltip: raw, raw }
}
