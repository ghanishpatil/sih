/** Browser CSV download (UTF-8). */
export function downloadCsv(filename, rows, columns) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = columns.map((c) => esc(c.header)).join(',')
  const lines = rows.map((row) => columns.map((c) => esc(c.accessor(row))).join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
