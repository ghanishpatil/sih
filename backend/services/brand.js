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
  supportEmail: 'sih@sanjivani.edu.in',
}

/** Official social accounts shown in email footers. */
export const SOCIALS = {
  twitter: 'https://x.com/skhackathon',
  instagram: 'https://instagram.com/smartkophack.su',
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
 * Brand assets, resolved against the frontend origin at call time.
 * `logo` is the square mark; `partners` is the partner-logos strip.
 */
export function brandAssets(base) {
  const origin = String(base || '').replace(/\/$/, '')
  return {
    logo: `${origin}/sih-logo.png`,
    partners: `${origin}/email-logos.png`,
    iconX: `${origin}/email-x.png`,
    iconInstagram: `${origin}/email-ig.png`,
  }
}

/** Hostname shown as the footer's website label, derived from FRONTEND_URL. */
export function brandWebsiteLabel(base) {
  try {
    return new URL(base).host
  } catch {
    return String(base || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

export default BRAND
