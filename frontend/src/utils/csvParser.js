/**
 * Lightweight CSV parser — handles quoted fields, commas inside quotes, and escaped quotes.
 * Returns an array of objects keyed by header row.
 */

export function parseCSV(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { headers: [], rows: [], error: 'Empty file' }
  }

  // Strip BOM if present
  const cleaned = text.replace(/^\uFEFF/, '')

  // Split into lines respecting quoted newlines
  const lines = splitCSVLines(cleaned)
  if (lines.length === 0) return { headers: [], rows: [], error: 'No data found' }

  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase())
  if (headers.length === 0) return { headers: [], rows: [], error: 'No headers found' }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue // skip blank lines
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim()
    })
    // Skip rows where every field is empty
    if (Object.values(row).every((v) => !v)) continue
    rows.push(row)
  }

  return { headers, rows, error: null }
}

/** Parse a single CSV line into an array of fields. */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // escaped quote
          current += '"'
          i += 2
          continue
        } else {
          inQuotes = false
          i += 1
          continue
        }
      } else {
        current += ch
        i += 1
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i += 1
      } else if (ch === ',') {
        result.push(current)
        current = ''
        i += 1
      } else {
        current += ch
        i += 1
      }
    }
  }
  result.push(current)
  return result
}

/** Split CSV text into lines respecting quoted multi-line fields. */
function splitCSVLines(text) {
  const lines = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      // Toggle quote, but keep doubled quotes inline
      if (inQuotes && text[i + 1] === '"') {
        current += '""'
        i += 1
      } else {
        inQuotes = !inQuotes
        current += ch
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // Line break outside quotes
      if (current.length > 0 || lines.length === 0) {
        lines.push(current)
        current = ''
      }
      // Skip \r\n combo
      if (ch === '\r' && text[i + 1] === '\n') i += 1
    } else {
      current += ch
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

/** Generate a downloadable CSV template for problem statements. */
export function buildProblemStatementTemplate() {
  // `PS Number` is the unique ID from your sheet (e.g. SIH26001) — used as the PS id.
  // `No` sets the display order. `category` accepts: Software | Hardware.
  // `theme` accepts one of the 17 official themes (e.g. Fintech, Smart Automation,
  //   MedTech / BioTech / HealthTech, Disaster Management, Blockchain & Cybersecurity, …).
  const headers = ['PS Number', 'No', 'title', 'category', 'theme', 'organization', 'department', 'description', 'published', 'maxTeams']
  const example1 = [
    'SIH26001',
    '1',
    'Civic engagement dashboard',
    'Software',
    'Smart Education',
    'Municipal Council',
    'Urban Planning',
    'Build a dashboard that lets citizens track municipal projects and provide feedback in real time.',
    'true',
    '5',
  ]
  const example2 = [
    'SIH26002',
    '2',
    'Low-cost crop disease scanner',
    'Hardware',
    'Agriculture, FoodTech & Rural Development',
    'Agriculture Department',
    'Plant Pathology',
    'Portable IoT device using camera + ML to detect leaf diseases offline for small farmers.',
    'true',
    '',
  ]

  function escape(v) {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [
    headers.join(','),
    example1.map(escape).join(','),
    example2.map(escape).join(','),
  ]
  return lines.join('\n')
}

/**
 * Generate a downloadable CSV template specifically for "Super PS" — the
 * flagship / high-priority problem statements. Same column schema as the
 * regular template (so the bulk-import parser is shared), but with Super-PS
 * themed example rows so it's clear these are a separate, curated tier.
 */
export function buildSuperPsTemplate() {
  // `PS Number` is the unique ID from your sheet (e.g. SIH26001) — used as the PS id.
  // `No` sets the display order. `category` accepts: Software | Hardware.
  // `theme` accepts one of the 17 official themes.
  const headers = ['PS Number', 'No', 'title', 'category', 'theme', 'organization', 'department', 'description', 'published', 'maxTeams']
  const example1 = [
    'SIH26001',
    '1',
    'National-scale disaster response platform',
    'Software',
    'Disaster Management',
    'State Disaster Management Authority',
    'Emergency Operations',
    'Flagship challenge: build a real-time, multi-agency coordination platform for large-scale disaster response.',
    'true',
    '3',
  ]
  const example2 = [
    'SIH26002',
    '2',
    'AI-assisted early cancer screening kit',
    'Hardware',
    'MedTech / BioTech / HealthTech',
    'Apex Medical Research Institute',
    'Oncology',
    'High-impact challenge: an affordable point-of-care device for early screening in rural clinics.',
    'true',
    '3',
  ]

  function escape(v) {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [
    headers.join(','),
    example1.map(escape).join(','),
    example2.map(escape).join(','),
  ]
  return lines.join('\n')
}

/** Trigger CSV download in the browser. */
export function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
