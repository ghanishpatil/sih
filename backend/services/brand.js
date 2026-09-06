/**
 * Brand / identity — single source of truth for the backend.
 *
 * Everything user-visible that carries the event's name (email chrome, subject
 * fallbacks, sender name, the AI assistant persona) reads from here so a
 * rebrand is a one-file change instead of a repo-wide find-and-replace.
 *
 * NOTE: the *live* event name still comes from Firestore (`events/{id}.name`).
 * `BRAND.name` is the fallback used when that lookup is unavailable, and the
 * name baked into the email header/footer chrome (which is not event-scoped).
 */

export const BRAND = {
  name: 'Internal Smart India Hackathon',
  shortName: 'Internal SIH',
  university: 'Sanjivani University',
  parentEvent: 'Smart India Hackathon',
  location: 'Kopargaon, Maharashtra, India',
  /**
   * Public site origin used in EMAILS (links + image URLs).
   *
   * Deliberately independent of FRONTEND_URL: that variable also drives CORS and
   * may still point at an older host, whereas every mail we send must land on the
   * current public site. Override with PUBLIC_SITE_URL if the domain changes.
   */
  siteUrl: 'https://sih.sanjivaniuniversity.com',
}

/**
 * Every participant in this event belongs to the host university, so the college
 * is stamped server-side at registration instead of being typed in (and is never
 * trusted from the client).
 */
export const FIXED_COLLEGE = BRAND.university

/** Public site origin for emails, without a trailing slash. */
export function siteUrl() {
  const fromEnv = String(process.env.PUBLIC_SITE_URL || '').trim()
  return (fromEnv || BRAND.siteUrl).replace(/\/+$/, '')
}

/** Canonical login URL used by every credentials / access email. */
export function brandLoginUrl() {
  return `${siteUrl()}/auth`
}

/** Email palette — kept in one place so templates and inline HTML agree. */
export const EMAIL_COLORS = {
  primary: '#185983',
  primaryDark: '#124a6e',
  wash: '#e6f4ff',
  muted: '#a9d4ec',
  page: '#f2f6f9',
}

/**
 * Logos used in email headers — the Smart India Hackathon wordmark and the
 * Sanjivani University mark. These are the ONLY images our emails embed: the
 * old partner-logo strip, the retired SKH bulb graphic and the social icons
 * were intentionally removed.
 */
export function brandAssets(base) {
  const origin = String(base || siteUrl()).replace(/\/+$/, '')
  return {
    logo: `${origin}/sih-logo.png`,
    university: `${origin}/sanjivani-logo.png`,
  }
}

/** Hostname shown as the footer's website label. */
export function brandWebsiteLabel(base) {
  const url = base || siteUrl()
  try {
    return new URL(url).host
  } catch {
    return String(url).replace(/^https?:\/\//, '').replace(/\/+$/, '')
  }
}

export default BRAND
