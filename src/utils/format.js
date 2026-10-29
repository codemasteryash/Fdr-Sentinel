import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const compactInr = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return inr.format(Number(value))
}

export function formatCompactCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  return inr.format(n)
}

const plainNumber = new Intl.NumberFormat('en-IN')

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return plainNumber.format(Number(value))
}

export function formatCompactNumber(value) {
  if (value === null || value === undefined) return '—'
  return compactInr.format(Number(value))
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '—'
  return format(date, pattern)
}

export function formatDateTime(value) {
  return formatDate(value, 'dd MMM yyyy, HH:mm')
}

export function formatDateShort(value) {
  return formatDate(value, 'dd MMM yy')
}

export function daysUntil(value, base = new Date()) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return null
  return differenceInCalendarDays(date, base)
}

export function daysFromNow(days) {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function relativeDays(value, base = new Date()) {
  const n = daysUntil(value, base)
  if (n === null) return '—'
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return '1 day overdue'
  if (n < 0) return `${Math.abs(n)} days overdue`
  return `in ${n} days`
}

export function todayISO() {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

export function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
