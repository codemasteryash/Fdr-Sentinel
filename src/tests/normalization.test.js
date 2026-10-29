import { describe, expect, it } from 'vitest'
import {
  normalizationProfile,
  referenceMatch,
  normalizeInstitutionName,
  similarity,
} from '../utils/normalization'

describe('reference normalization', () => {
  it('classifies separator and case differences as a strong normalized match', () => {
    const match = referenceMatch('DNB-847291', 'dnb 847291')
    expect(match.level).toBe('strong_normalized')
    expect(match.score).toBe(96)
  })

  it('classifies I/1 confusion as an OCR variant requiring human review', () => {
    const match = referenceMatch('SLB-54I902', 'SLB-541902')
    expect(match.level).toBe('ocr_variant')
    expect(match.score).toBe(84)
    expect(match.explanation).toMatch(/human review/i)
  })

  it('does not label unrelated identifiers as matches', () => {
    const match = referenceMatch('DNB-847291', 'MBN-118452')
    expect(match.level).toBe('none')
    expect(match.score).toBeLessThan(82)
  })

  it('exposes the ordered normalization profile instead of overwriting raw values', () => {
    const profile = normalizationProfile('dnb / 84-7291')
    expect(profile.exact).toBe('DNB / 84-7291')
    expect(profile.strong).toBe('DNB847291')
    expect(profile.ocr).toBe('DN8847291')
  })

  it('normalizes institution suffixes without affecting unrelated words', () => {
    expect(normalizeInstitutionName('Deccan Institute of Applied Sciences')).toContain('DECCAN')
    expect(normalizeInstitutionName('Deccan Institute of Applied Sciences')).not.toContain('INSTITUTE')
  })

  it('returns a bounded similarity ratio', () => {
    expect(similarity('ABCDE', 'ABCDE')).toBe(1)
    expect(similarity('ABCDE', 'ABXDE')).toBeGreaterThan(0.7)
    expect(similarity('ABCDE', 'ZZZZZ')).toBeLessThan(0.3)
  })
})
