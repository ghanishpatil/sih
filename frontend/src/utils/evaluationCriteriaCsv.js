/** Parse admin-uploaded CSV / pasted spreadsheet rows into criterion rows (client-side). */
export function parseCriterionLines(lines) {
  const rows = []
  let start = 0
  if (lines.length > 0) {
    const h = lines[0].join('').toLowerCase()
    if (h.includes('label') || h.includes('key')) start = 1
  }
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].map((c) => String(c || '').trim())
    const filled = cols.filter(Boolean)
    if (filled.length === 0) continue

    let key = ''
    let label = ''
    let maxScore = NaN
    let hint = ''

    if (filled.length === 1) {
      label = filled[0]
    } else {
      key = cols[0] || ''
      label = cols[1] || cols[0] || ''
      maxScore = cols[2] ? Number(cols[2]) : NaN
      hint = cols[3] || ''
    }

    if (!label && key && Number.isNaN(maxScore)) {
      label = key
      key = ''
    }
    if (!label && !key) continue
    rows.push({
      key: key || undefined,
      label,
      maxScore: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 10,
      hint,
    })
  }
  return rows
}

/** Split pasted TSV/CSV blob into grid cells (minimal quoting). */
export function splitPasteGrid(text) {
  const rawLines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
  return rawLines.map((line) => parseCsvLine(line))
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      q = !q
      continue
    }
    if (!q && ch === '\t') {
      out.push(cur.trim())
      cur = ''
      continue
    }
    if (!q && ch === ',' && !line.includes('\t')) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

export const EVALUATION_CRITERIA_TEMPLATE_CSV = [
  'key,label,maxScore,hint',
  'innovation,Innovation & novelty,10,"Creative solution, differentiation"',
  'execution,Execution & feasibility,10,"Build quality, realism"',
  'impact,Impact & relevance,10,Problem fit and outcomes',
  'communication,Communication / deck / demo,10,Clarity of PPT and walkthrough',
].join('\n')
