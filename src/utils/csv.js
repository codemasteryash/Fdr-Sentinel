function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value).replace(/"/g, '""')
  return /[",\n\r]/.test(str) ? `"${str}"` : str
}

export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label)).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const raw = typeof column.value === 'function' ? column.value(row) : row[column.key]
          return escapeCell(raw)
        })
        .join(','),
    )
    .join('\n')
  return `${header}\n${body}`
}

export function downloadCsv(filename, rows, columns) {
  const csv = toCsv(rows, columns)
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
