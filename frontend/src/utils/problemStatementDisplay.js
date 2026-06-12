/** Normalized labels for problem statements (supports legacy `domain` / `poweredBy`). */
export function displayOrganization(ps) {
  if (!ps || typeof ps !== 'object') return ''
  return String(ps.organization || ps.poweredBy || ps.sponsor || '').trim()
}

export function displayDepartment(ps) {
  if (!ps || typeof ps !== 'object') return ''
  return String(ps.department || '').trim()
}

export function displayCategory(ps) {
  if (!ps || typeof ps !== 'object') return ''
  return String(ps.category || ps.domain || '').trim()
}

export function displayTheme(ps) {
  if (!ps || typeof ps !== 'object') return ''
  return String(ps.theme || '').trim()
}
