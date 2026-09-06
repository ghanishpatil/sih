// One-off scraper for SIH 2026 problem statements (sih.gov.in/sih2026PS)
// Parses the server-rendered HTML and writes a CSV with full details incl. description.
// Usage: node _scrape_sih.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const URL = 'https://sih.gov.in/sih2026PS';
const RAW = 'd:\\skh-main\\_sih_raw.html';
const OUT = 'd:\\skh-main\\sih_2026_problem_statements.csv';

async function getHtml() {
  // Prefer the already-downloaded raw file for reproducibility; fall back to live fetch.
  if (existsSync(RAW)) {
    const buf = await readFile(RAW, 'utf8');
    if (buf.length > 100000) return buf;
  }
  const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.text();
}

// --- Mojibake repair -------------------------------------------------------
// sih.gov.in serves some text as double-encoded UTF-8 (original UTF-8 bytes were
// misread as Windows-1252 then re-saved as UTF-8). Every such artifact begins with
// a signature prefix: "â€" (U+00E2 U+20AC), "Â" (U+00C2), or "Ã" (U+00C3).
// We reverse ONLY those sequences, so genuine characters (e.g. Sanskrit ū ā ṇ ṭ,
// and correctly-encoded curly quotes not glued to "â€") are preserved.
const REV1252 = { // Unicode codepoint -> Windows-1252 byte (for 0x80-0x9F specials)
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};
function cp1252Byte(ch) {
  const cp = ch.codePointAt(0);
  if (cp <= 0xFF) return cp;              // Latin-1 range matches CP1252 for 0xA0-0xFF
  const b = REV1252[cp];
  return b === undefined ? -1 : b;
}
function fixMojibake(s) {
  if (!s || !/[\u00E2\u00C2\u00C3]/.test(s)) return s;
  // "â€" + third byte  -> E2 80 XX
  s = s.replace(/\u00E2\u20AC([\s\S])/g, (m, x) => {
    const b = cp1252Byte(x);
    if (b < 0x80 || b > 0xBF) return m;   // must be a valid UTF-8 continuation byte
    return Buffer.from([0xE2, 0x80, b]).toString('utf8');
  });
  // "Â" + (U+00A0..U+00BF) -> C2 XX   (° © ± µ ¢ nbsp ...)
  s = s.replace(/\u00C2([\u00A0-\u00BF])/g, (_, y) =>
    Buffer.from([0xC2, y.codePointAt(0)]).toString('utf8'));
  // "Ã" + continuation -> C3 XX   (accented Latin letters)
  s = s.replace(/\u00C3([\s\S])/g, (m, z) => {
    const b = cp1252Byte(z);
    if (b < 0x80 || b > 0xBF) return m;
    return Buffer.from([0xC3, b]).toString('utf8');
  });
  return s;
}

// Decode HTML entities (named + numeric decimal/hex).
function decodeEntities(s) {
  if (!s) return '';
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018', rsquo: '\u2019',
    ldquo: '\u201C', rdquo: '\u201D', hellip: '\u2026', bull: '\u2022',
    deg: '\u00B0', trade: '\u2122', reg: '\u00AE', copy: '\u00A9',
  };
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (name in named ? named[name] : m));
}
function safeCodePoint(cp) {
  try { return String.fromCodePoint(cp); } catch { return ''; }
}

// Convert an HTML fragment to clean single-line-ish text.
function htmlToText(html) {
  if (!html) return '';
  let t = html;
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');       // drop comments
  t = t.replace(/<\s*br\s*\/?\s*>/gi, '\n');     // <br> -> newline
  t = t.replace(/<\/\s*(p|div|tr|li|ul|ol)\s*>/gi, '\n');
  t = t.replace(/<\s*li\s*>/gi, '\u2022 ');      // <li> -> bullet
  t = t.replace(/<[^>]+>/g, '');                  // strip remaining tags
  t = decodeEntities(t);
  t = t.replace(/[ \t\f\v\u00A0]+/g, ' ');        // collapse spaces
  t = t.replace(/\s*\n\s*/g, ' ').trim();          // flatten newlines to single spaces
  t = t.replace(/ {2,}/g, ' ');
  return t;
}

function firstStyle2(tdHtml) {
  // Remove comments first so we only get the live div, then grab the first style-2 div content.
  const clean = tdHtml.replace(/<!--[\s\S]*?-->/g, ' ');
  const m = clean.match(/<div\s+class="style-2"[^>]*>([\s\S]*?)<\/div>/i);
  return m ? m[1] : clean;
}

function extractField(windowHtml, label) {
  // Matches <th ...>LABEL</th> ... <td ...>VALUE</td>
  const re = new RegExp(
    `<th[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
    'i'
  );
  const m = windowHtml.match(re);
  return m ? m[1] : '';
}

function csvField(v) {
  const s = (v ?? '').toString();
  return '"' + s.replace(/"/g, '""') + '"';
}

async function main() {
  let html = await getHtml();
  html = fixMojibake(html); // repair server-side double-encoded UTF-8 before parsing

  // Locate every modal start; each modal id is the PS numeric id.
  const anchorRe = /id="ViewProblemStatement(\d+)"/g;
  const anchors = [];
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    anchors.push({ id: m[1], index: m.index });
  }
  if (anchors.length === 0) throw new Error('No problem statement modals found.');

  const rows = [];
  const seen = new Set();
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : html.length;
    const win = html.slice(start, end);
    const psId = anchors[i].id;
    if (seen.has(psId)) continue; // guard against dup ids
    seen.add(psId);

    // Modal fields
    const titleTd = extractField(win, 'Problem Statement Title');
    const title = htmlToText(firstStyle2(titleTd));
    const descTd = extractField(win, 'Description');
    const description = htmlToText(firstStyle2(descTd));
    const organization = htmlToText(extractField(win, 'Organization'));
    const department = htmlToText(extractField(win, 'Department'));

    // Authoritative row trailing cells: Category | PS number | count | theme | date
    let category = '', psNumber = '', count = '', theme = '', date = '';
    const rowRe = /<td>\s*(Software|Hardware)\s*<\/td>\s*<td>\s*(SIH\d+)\s*<\/td>\s*<td>\s*([\d]+\/[\d]+)\s*<\/td>\s*<td>\s*([^<]*?)\s*<\/td>\s*<td>\s*([^<]*?)\s*<\/td>/i;
    const rm = win.match(rowRe);
    if (rm) {
      category = rm[1].trim();
      psNumber = rm[2].trim();
      count = rm[3].trim();
      theme = htmlToText(rm[4]);
      date = htmlToText(rm[5]);
    }
    // Fallbacks from modal if row cells missing
    if (!psNumber) psNumber = 'SIH' + psId;
    if (!category) category = htmlToText(extractField(win, 'Category'));
    if (!theme) theme = htmlToText(extractField(win, 'Theme'));

    rows.push({
      no: rows.length + 1,
      psNumber,
      title,
      category,
      theme,
      organization,
      department,
      submittedIdeas: count,
      submissionDeadline: date,
      description,
    });
  }

  // Build CSV (UTF-8 with BOM for Excel)
  const headers = [
    'No', 'PS Number', 'Title', 'Category', 'Theme',
    'Organization', 'Department', 'Submitted Ideas', 'Submission Deadline', 'Description',
  ];
  const lines = [headers.map(csvField).join(',')];
  for (const r of rows) {
    lines.push([
      r.no, r.psNumber, r.title, r.category, r.theme,
      r.organization, r.department, r.submittedIdeas, r.submissionDeadline, r.description,
    ].map(csvField).join(','));
  }
  const csv = '\uFEFF' + lines.join('\r\n') + '\r\n';
  await writeFile(OUT, csv, 'utf8');

  // Report
  const soft = rows.filter(r => /software/i.test(r.category)).length;
  const hard = rows.filter(r => /hardware/i.test(r.category)).length;
  const missingDesc = rows.filter(r => !r.description).length;
  const missingTitle = rows.filter(r => !r.title).length;
  const missingOrg = rows.filter(r => !r.organization).length;
  console.log(JSON.stringify({
    totalRows: rows.length,
    software: soft,
    hardware: hard,
    other: rows.length - soft - hard,
    missingDescription: missingDesc,
    missingTitle,
    missingOrganization: missingOrg,
    firstPs: rows[0]?.psNumber,
    lastPs: rows[rows.length - 1]?.psNumber,
    out: OUT,
  }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
