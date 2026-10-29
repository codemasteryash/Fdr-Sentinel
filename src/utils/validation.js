import { isValid, parseISO } from 'date-fns'

export const REFERENCE_PATTERN = /^[A-Z]{2,5}[-/ ]?[A-Z0-9]{5,12}$/i

export function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (value === null || value === undefined) return NaN
  const cleaned = String(value).replace(/[₹,\s]/g, '')
  if (!cleaned) return NaN
  return Number(cleaned)
}

export function validateAmount(value) {
  const amount = parseAmount(value)
  if (Number.isNaN(amount)) return 'Enter a valid amount.'
  if (amount <= 0) return 'Amount must be greater than zero.'
  if (amount > 5000000000) return 'Amount exceeds the demo limit of ₹500 crore.'
  return null
}

export function validateReference(value) {
  if (!value?.trim()) return 'FDR reference is required.'
  if (!REFERENCE_PATTERN.test(value.trim())) {
    return 'Use 2–5 letters, an optional separator, then 5–12 letters or digits (e.g. DNB-847291).'
  }
  return null
}

export function validateDate(value, label = 'Date') {
  if (!value) return `${label} is required.`
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return `${label} is not a valid date.`
  return null
}

export function validateDateOrder(issueDate, maturityDate) {
  if (!issueDate || !maturityDate) return null
  if (parseISO(maturityDate) <= parseISO(issueDate)) {
    return 'Maturity date must fall after the issue date.'
  }
  return null
}

export function validateFile(file) {
  if (!file) return 'Attach a supporting document.'
  const allowed = ['application/pdf', 'image/jpeg', 'image/png']
  const nameOk = /\.(pdf|jpe?g|png)$/i.test(file.name)
  if (!allowed.includes(file.type) && !nameOk) return 'Only PDF, JPG, or PNG documents are supported.'
  if (file.size > 10 * 1024 * 1024) return 'File exceeds the 10 MB demo limit.'
  return null
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
