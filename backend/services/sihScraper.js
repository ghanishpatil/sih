// ─────────────────────────────────────────────────────────────────────────────
// SIH 2026 problem-statement scraper
//
// sih.gov.in has no public API, so we fetch the server-rendered listing page and
// parse it. Each problem statement is a table row whose title links to a hidden
// detail modal (#ViewProblemStatement26XXX) carrying the full description,
// organization and department; the row's trailing cells carry the category,
// PS number, LIVE submitted-idea count ("7/500"), theme and deadline.
//
// Design (matches existing backend patterns):
//   • Global `fetch` with an AbortController timeout (like services/geoIp.js).
//   • Fail-soft: a scrape error never throws into the request path — we keep and
//     serve the last good in-memory snapshot instead.
//   • In-memory snapshot with a staleness TTL + inflight de-dupe, refreshed on an
//     interval (started after app.listen) and via an admin "refresh now" endpoint.
//   • A tiny `config/sihScrape` meta doc records the last sync for admin display
//     and survives restarts (the item list itself lives in memory only — it is
//     public data re-fetchable from source, so we don't spend Firestore writes on
//     hundreds of rows every cycle).
//
// NOTE: The source page serves some text as double-encoded UTF-8 (mojibake such
// as "Indiaâ€™s"). We reverse only the corrupted sequences (prefixes â€ / Â / Ã)
// while preserving genuine characters (e.g. Sanskrit ū ā ṇ ṭ).
// ─────────────────────────────────────────────────────────────────────────────
import { getDb } from './firebaseAdmin.js'
import { FieldValue } from 'firebase-admin/firestore'

export const SIH_SOURCE_URL = 'https://sih.gov.in/sih2026PS'
const FETCH_TIMEOUT_MS = 20000
// Serve from memory; refresh when the snapshot is older than this on access.
const STALE_MS = 10 * 60 * 1000 // 10 minutes

// ── In-memory snapshot ───────────────────────────────────────────────────────
let snapshot = {
  items: [],
  count: 0,
  softwareCount: 0,
  hardwareCount: 0,
  lastSyncAt: null, // ISO string
  ok: false,
  error: null,
  source: SIH_SOURCE_URL,
}
let inflight = null

// ── Mojibake repair (UTF-8 misread as Windows-1252, then re-saved as UTF-8) ───
const REV1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}
function cp1252Byte(ch) {
  const cp = ch.codePointAt(0)
  if (cp <= 0xff) return cp
  const b = REV1252[cp]
  return b === undefined ? -1 : b
}
function fixMojibake(s) {
  if (!s || !/[\u00E2\u00C2\u00C3]/.test(s)) return s
  s = s.replace(/\u00E2\u20AC([\s\S])/g, (m, x) => {
    const b = cp1252Byte(x)
    if (b < 0x80 || b > 0xbf) return m
    return Buffer.from([0xe2, 0x80, b]).toString('utf8')
  })
  s = s.replace(/\u00C2([\u00A0-\u00BF])/g, (_, y) =>
    Buffer.from([0xc2, y.codePointAt(0)]).toString('utf8'),
  )
  s = s.replace(/\u00C3([\s\S])/g, (m, z) => {
    const b = cp1252Byte(z)
    if (b < 0x80 || b > 0xbf) return m
    return Buffer.from([0xc3, b]).toString('utf8')
  })
  return s
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
function decodeEntities(s) {
  if (!s) return ''
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018', rsquo: '\u2019',
    ldquo: '\u201C', rdquo: '\u201D', hellip: '\u2026', bull: '\u2022',
    deg: '\u00B0', trade: '\u2122', reg: '\u00AE', copy: '\u00A9',
  }
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCp(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (name in named ? named[name] : m))
}
function safeCp(cp) {
  try {
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}
function htmlToText(html) {
  if (!html) return ''
  let t = html
  t = t.replace(/<!--[\s\S]*?-->/g, ' ')
  t = t.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  t = t.replace(/<\/\s*(p|div|tr|li|ul|ol)\s*>/gi, '\n')
  t = t.replace(/<\s*li\s*>/gi, '\u2022 ')
  t = t.replace(/<[^>]+>/g, '')
  t = decodeEntities(t)
  t = t.replace(/[ \t\f\v\u00A0]+/g, ' ')
  t = t.replace(/\s*\n\s*/g, ' ').trim()
  t = t.replace(/ {2,}/g, ' ')
  return t
}
function firstStyle2(tdHtml) {
  const clean = tdHtml.replace(/<!--[\s\S]*?-->/g, ' ')
  const m = clean.match(/<div\s+class="style-2"[^>]*>([\s\S]*?)<\/div>/i)
  return m ? m[1] : clean
}
function extractField(windowHtml, label) {
  const re = new RegExp(
    `<th[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`,
    'i',
  )
  const m = windowHtml.match(re)
  return m ? m[1] : ''
}

/**
 * Parse the SIH listing HTML into an array of problem statements.
 * Pure function — no I/O — so it is easy to test.
 */
export function parseSihHtml(rawHtml) {
  const html = fixMojibake(rawHtml)
  const anchorRe = /id="ViewProblemStatement(\d+)"/g
  const anchors = []
  let m
  while ((m = anchorRe.exec(html)) !== null) {
    anchors.push({ id: m[1], index: m.index })
  }

  const items = []
  const seen = new Set()
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index
    const end = i + 1 < anchors.length ? anchors[i + 1].index : html.length
    const win = html.slice(start, end)
    const psId = anchors[i].id
    if (seen.has(psId)) continue
    seen.add(psId)

    const title = htmlToText(firstStyle2(extractField(win, 'Problem Statement Title')))
    const description = htmlToText(firstStyle2(extractField(win, 'Description')))
    const organization = htmlToText(extractField(win, 'Organization'))
    const department = htmlToText(extractField(win, 'Department'))

    // Authoritative row trailing cells: Category | PS# | count/max | theme | date
    let category = ''
    let psNumber = ''
    let submittedRaw = ''
    let submittedCount = null
    let submittedMax = null
    let theme = ''
    let deadline = ''
    const rowRe =
      /<td>\s*(Software|Hardware)\s*<\/td>\s*<td>\s*(SIH\d+)\s*<\/td>\s*<td>\s*(\d+)\/(\d+)\s*<\/td>\s*<td>\s*([^<]*?)\s*<\/td>\s*<td>\s*([^<]*?)\s*<\/td>/i
    const rm = win.match(rowRe)
    if (rm) {
      category = rm[1].trim()
      psNumber = rm[2].trim()
      submittedCount = Number(rm[3])
      submittedMax = Number(rm[4])
      submittedRaw = `${rm[3]}/${rm[4]}`
      theme = htmlToText(rm[5])
      deadline = htmlToText(rm[6])
    }
    if (!psNumber) psNumber = `SIH${psId}`
    if (!category) category = htmlToText(extractField(win, 'Category'))
    if (!theme) theme = htmlToText(extractField(win, 'Theme'))

    if (!title) continue // guard against a stray non-PS modal

    items.push({
      no: items.length + 1,
      psNumber,
      title,
      category,
      theme,
      organization,
      department,
      description,
      submittedCount,
      submittedMax,
      submittedRaw,
      deadline,
    })
  }
  return items
}

async function fetchSihHtml() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(SIH_SOURCE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SIH-Internal-Platform/1.0; +https://skh.sanjivaniuniversity.com)',
        Accept: 'text/html',
      },
    })
    if (!res.ok) throw new Error(`SIH responded ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/** Persist a tiny meta doc so the admin UI can show "last synced" across restarts. */
async function writeMeta(meta) {
  try {
    const db = getDb()
    if (!db) return
    const payload = {
      count: meta.count,
      softwareCount: meta.softwareCount,
      hardwareCount: meta.hardwareCount,
      ok: meta.ok,
      error: meta.error || null,
      source: SIH_SOURCE_URL,
      updatedAt: FieldValue.serverTimestamp(),
    }
    // Only advance lastSyncAt on a successful sync (leave prior value on failure).
    if (meta.ok) payload.lastSyncAt = FieldValue.serverTimestamp()
    await db.doc('config/sihScrape').set(payload, { merge: true })
  } catch {
    /* meta persistence is best-effort — never throw */
  }
}

async function doRefresh() {
  try {
    const html = await fetchSihHtml()
    const items = parseSihHtml(html)
    if (!items.length) throw new Error('Parsed 0 problem statements (page markup may have changed)')
    const softwareCount = items.filter((p) => /software/i.test(p.category)).length
    const hardwareCount = items.filter((p) => /hardware/i.test(p.category)).length
    snapshot = {
      items,
      count: items.length,
      softwareCount,
      hardwareCount,
      lastSyncAt: new Date().toISOString(),
      ok: true,
      error: null,
      source: SIH_SOURCE_URL,
    }
    void writeMeta(snapshot)
    console.log(`[sih-scraper] synced ${items.length} problem statements (${softwareCount} sw / ${hardwareCount} hw)`)
    return snapshot
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'Timed out fetching sih.gov.in' : e?.message || 'Scrape failed'
    // Keep the last good items; only update the error/ok flags.
    snapshot = { ...snapshot, ok: false, error: msg }
    void writeMeta(snapshot)
    console.warn(`[sih-scraper] refresh failed: ${msg}`)
    return snapshot
  }
}

/** Refresh the in-memory snapshot. De-dupes concurrent callers. */
export async function refreshSihSnapshot({ force = false } = {}) {
  const fresh =
    snapshot.lastSyncAt && Date.now() - new Date(snapshot.lastSyncAt).getTime() < STALE_MS
  if (!force && fresh && snapshot.items.length) return snapshot
  if (inflight) return inflight
  inflight = doRefresh().finally(() => {
    inflight = null
  })
  return inflight
}

/** Return the current snapshot, refreshing first if empty/stale. */
export async function getSihSnapshot() {
  if (!snapshot.items.length || !snapshot.lastSyncAt) {
    await refreshSihSnapshot({ force: true })
  } else {
    const age = Date.now() - new Date(snapshot.lastSyncAt).getTime()
    if (age > STALE_MS) void refreshSihSnapshot() // refresh in background, serve current
  }
  return snapshot
}

/** Synchronous accessor (no refresh) — used where a fast, possibly-stale read is fine. */
export function peekSihSnapshot() {
  return snapshot
}

let intervalHandle = null
/**
 * Start periodic background refresh. Interval from SIH_SCRAPE_INTERVAL_MINUTES
 * (default 30). Set to 0 to disable auto-refresh (manual/admin refresh only).
 * Fire-and-forget and guarded — a failure never crashes the process.
 */
export function startSihAutoRefresh() {
  const mins = Number(process.env.SIH_SCRAPE_INTERVAL_MINUTES ?? 30)
  // Kick an initial refresh shortly after boot regardless of the interval setting.
  refreshSihSnapshot({ force: true }).catch(() => {})
  if (!Number.isFinite(mins) || mins <= 0) {
    console.log('[sih-scraper] auto-refresh disabled (SIH_SCRAPE_INTERVAL_MINUTES<=0)')
    return
  }
  if (intervalHandle) return
  intervalHandle = setInterval(() => {
    refreshSihSnapshot({ force: true }).catch(() => {})
  }, mins * 60 * 1000)
  intervalHandle.unref?.()
  console.log(`[sih-scraper] auto-refresh every ${mins} min`)
}
