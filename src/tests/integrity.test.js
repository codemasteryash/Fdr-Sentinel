import { beforeEach, describe, expect, it } from 'vitest'
import { demoStore } from '../services/demoDataService'
import {
  evaluateInstrument,
  findingKey,
  runIntegrityAnalysis,
} from '../services/integrityEngine'
import { referenceMatch } from '../utils/normalization'

function state() {
  return demoStore.getState()
}

beforeEach(() => {
  demoStore.reset({ keepRole: true })
})

describe('deterministic integrity engine', () => {
  it('identifies the cross-institution reference conflict without declaring fraud', () => {
    const current = state()
    const instrument = current.instruments.find((item) => item.id === 'FDR-2026-004')
    const candidates = evaluateInstrument(
      instrument,
      current.instruments,
      current.settings.thresholds,
    )
    const conflict = candidates.find(
      (candidate) => candidate.category === 'cross_institution_conflict',
    )
    expect(conflict).toBeTruthy()
    expect(conflict.relatedInstrumentId).toBe('FDR-2026-011')
    expect(conflict.confidence).toBe(96)
    expect(conflict.rule).toMatch(/XREF-01/)
    expect(conflict.explanation.toLowerCase()).toContain('potential')
    expect(conflict.explanation.toLowerCase()).toContain('not proof of fraud')
  })

  it('detects the OCR reference ambiguity at medium severity', () => {
    const current = state()
    const instrument = current.instruments.find((item) => item.id === 'FDR-2026-006')
    const candidates = evaluateInstrument(
      instrument,
      current.instruments,
      current.settings.thresholds,
    )
    const ocr = candidates.find((candidate) => candidate.category === 'ocr_ambiguity')
    expect(ocr).toBeTruthy()
    expect(ocr.confidence).toBe(84)
    expect(ocr.severity).toBe('medium')
    expect(referenceMatch(instrument.reference, instrument.extracted.reference).level).toBe(
      'ocr_variant',
    )
  })

  it('is idempotent when analysis is re-run without changes', () => {
    const first = runIntegrityAnalysis('FDR-2026-004')
    const second = runIntegrityAnalysis('FDR-2026-004')
    expect(first.ok).toBe(true)
    expect(second.created).toHaveLength(0)
  })

  it('never creates duplicate active findings for the same rule key', () => {
    runIntegrityAnalysis('FDR-2026-004')
    runIntegrityAnalysis('FDR-2026-004')
    const active = state().findings.filter(
      (finding) =>
        finding.instrumentId === 'FDR-2026-004' &&
        ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
    )
    const keys = active.map(findingKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('records an integrity analysis audit event linked to the instrument', () => {
    runIntegrityAnalysis('FDR-2026-006')
    const events = state().auditEvents.filter(
      (event) => event.action === 'integrity.analysis_run' && event.entityId === 'FDR-2026-006',
    )
    expect(events.length).toBeGreaterThan(0)
  })
})
