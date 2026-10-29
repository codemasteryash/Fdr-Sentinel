import { describe, expect, it } from 'vitest'
import {
  formatFileSize,
  parseAmount,
  validateAmount,
  validateDateOrder,
  validateFile,
  validateReference,
} from '../utils/validation'

describe('currency, reference, and date validation', () => {
  it('parses Indian formatted amounts with currency symbols and commas', () => {
    expect(parseAmount('₹25,00,000')).toBe(2500000)
    expect(parseAmount(' 1,40,000 ')).toBe(140000)
    expect(Number.isNaN(parseAmount(''))).toBe(true)
  })

  it('rejects non-positive and excessive amounts', () => {
    expect(validateAmount('0')).toMatch(/greater than zero/i)
    expect(validateAmount('abc')).toMatch(/valid amount/i)
    expect(validateAmount('5000000001')).toMatch(/exceeds/i)
    expect(validateAmount('2500000')).toBeNull()
  })

  it('requires a plausible FDR reference format', () => {
    expect(validateReference('DNB-847291')).toBeNull()
    expect(validateReference('SLB-54I902')).toBeNull()
    expect(validateReference('')).toMatch(/required/i)
    expect(validateReference('12')).toMatch(/2–5 letters/i)
  })

  it('requires maturity to fall after the issue date', () => {
    expect(validateDateOrder('2026-01-01', '2027-01-01')).toBeNull()
    expect(validateDateOrder('2026-01-01', '2025-01-01')).toMatch(/after the issue date/i)
  })

  it('accepts only supported document types within the size limit', () => {
    expect(validateFile({ name: 'fdr.pdf', type: 'application/pdf', size: 1024 })).toBeNull()
    expect(validateFile({ name: 'fdr.jpg', type: 'image/jpeg', size: 1024 })).toBeNull()
    expect(validateFile({ name: 'malware.exe', type: 'application/x-msdownload', size: 10 })).toMatch(
      /only pdf/i,
    )
    expect(validateFile({ name: 'big.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 })).toMatch(
      /10 MB/i,
    )
    expect(formatFileSize(2048)).toBe('2 KB')
  })
})
