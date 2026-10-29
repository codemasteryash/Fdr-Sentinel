import { beforeEach, describe, expect, it } from 'vitest'
import { demoStore, setRole } from '../services/demoDataService'
import { updateInstrumentMetadata } from '../services/instrumentService'
import { getDemoUserForRole } from '../data/users'
import { verifyAuditChain } from '../utils/hash'

function state() {
  return demoStore.getState()
}

beforeEach(() => {
  demoStore.reset({ keepRole: false })
  setRole('admin')
})

describe('correction retention', () => {
  it('corrects the amount, resolves the original finding, and preserves history', () => {
    const before = state().findings.find((item) => item.id === 'FND-2026-004')
    expect(before.reviewStatus).toBe('open')

    const result = updateInstrumentMetadata(
      'FDR-2026-009',
      { amount: 1450000 },
      'Corrected against the source document amount block.',
      getDemoUserForRole('reviewer'),
    )
    expect(result.ok).toBe(true)
    expect(result.changedFields).toContain('amount')
    expect(result.resolvedFindings).toContain('FND-2026-004')

    const instrument = state().instruments.find((item) => item.id === 'FDR-2026-009')
    expect(instrument.amount).toBe(1450000)

    const after = state().findings.find((item) => item.id === 'FND-2026-004')
    expect(after).toBeTruthy()
    expect(after.reviewStatus).toBe('resolved')
    expect(after.decision).toBe('resolved_after_correction')
    expect(after.reviewerNotes).toMatch(/resolved after correction/i)

    const updateEvent = state().auditEvents.find(
      (event) => event.action === 'instrument.updated' && event.entityId === 'FDR-2026-009',
    )
    expect(updateEvent).toBeTruthy()
    expect(updateEvent.previousState).toContain('1400000')
    expect(updateEvent.newState).toContain('1450000')

    const findingEvent = state().auditEvents.find(
      (event) =>
        event.action === 'finding.reviewed' &&
        event.entityId === 'FND-2026-004' &&
        event.newState === 'resolved',
    )
    expect(findingEvent).toBeTruthy()
    expect(verifyAuditChain(state().auditEvents).valid).toBe(true)
  })

  it('does not delete closed or historical findings during correction', () => {
    const countBefore = state().findings.length
    updateInstrumentMetadata(
      'FDR-2026-009',
      { amount: 1450000 },
      'Re-testing retention after correction.',
      getDemoUserForRole('reviewer'),
    )
    expect(state().findings.length).toBe(countBefore)
    expect(state().findings.some((item) => item.id === 'FND-2026-004')).toBe(true)
  })

  it('requires a reason and a permitted role', () => {
    const instrument = state().instruments.find((item) => item.id === 'FDR-2026-009')
    expect(
      updateInstrumentMetadata(
        'FDR-2026-009',
        { amount: 1450000 },
        '',
        getDemoUserForRole('reviewer'),
      ).ok,
    ).toBe(false)
    expect(
      updateInstrumentMetadata(
        'FDR-2026-009',
        { amount: 1450000 },
        'Unauthorized attempt.',
        getDemoUserForRole('auditor'),
      ).ok,
    ).toBe(false)
    expect(state().instruments.find((item) => item.id === 'FDR-2026-009').amount).toBe(
      instrument.amount,
    )
  })

  it('rejects editing a closed instrument', () => {
    const released = state().instruments.find(
      (item) => item.lifecycleStatus === 'released',
    )
    if (!released) return
    const result = updateInstrumentMetadata(
      released.id,
      { branch: 'Changed branch' },
      'Attempt on a closed record.',
      getDemoUserForRole('reviewer'),
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/closed/i)
  })
})
