import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkTransition,
  getAvailableTransitions,
  performTransition,
  recordReleaseApproval,
} from '../services/lifecycleEngine'
import {
  demoStore,
  getCurrentUser,
  setRole,
} from '../services/demoDataService'
import { getDemoUserForRole } from '../data/users'
import { verifyAuditChain } from '../utils/hash'

function state() {
  return demoStore.getState()
}

function transitionContext() {
  const current = state()
  const instrument = current.instruments.find((item) => item.id === 'FDR-2026-017')
  return { current, instrument }
}

beforeEach(() => {
  demoStore.reset({ keepRole: false })
  setRole('admin')
})

describe('lifecycle policy enforcement', () => {
  it('blocks release when approving-authority sign-off is missing', () => {
    const { current, instrument } = transitionContext()
    const check = checkTransition({
      instrument,
      to: 'released',
      user: getDemoUserForRole('approver'),
      findings: current.findings,
    })
    expect(check.allowed).toBe(false)
    expect(check.reasons.join(' ')).toMatch(/sign-off is not recorded/i)
    expect(check.missingRequirements).toContain('Approving-authority sign-off')
  })

  it('records a blocked transition with outcome blocked', () => {
    const approver = getDemoUserForRole('approver')
    const result = performTransition({
      instrumentId: 'FDR-2026-017',
      to: 'released',
      reason: 'Judge demo: attempt release without approval.',
      user: approver,
    })
    expect(result.ok).toBe(false)
    const blocked = state().auditEvents.filter(
      (event) =>
        event.action === 'lifecycle.blocked' &&
        event.entityId === 'FDR-2026-017' &&
        event.outcome === 'blocked',
    )
    expect(blocked.length).toBeGreaterThan(0)
    expect(verifyAuditChain(state().auditEvents).valid).toBe(true)
  })

  it('rejects a release attempt from a role without lifecycle authority', () => {
    const { current, instrument } = transitionContext()
    const check = checkTransition({
      instrument,
      to: 'released',
      user: getDemoUserForRole('officer'),
      findings: current.findings,
    })
    expect(check.allowed).toBe(false)
    expect(check.reasons.join(' ')).toMatch(/not permitted/i)
  })

  it('never offers an undefined lifecycle transition', () => {
    const { current, instrument } = transitionContext()
    const options = getAvailableTransitions(
      instrument,
      getDemoUserForRole('admin'),
      current.findings,
    )
    expect(options.length).toBeGreaterThan(0)
    expect(options.every((option) => option.check.transition)).toBe(true)
  })

  it('allows release after approval is recorded and the policy finding is resolved', () => {
    setRole('approver')
    expect(getCurrentUser().role).toBe('approver')

    const approval = recordReleaseApproval(
      'FDR-2026-017',
      'Independent approval recorded for the demonstration.',
    )
    expect(approval.ok).toBe(true)

    const finding = state().findings.find((item) => item.id === 'FND-2026-009')
    expect(finding.reviewStatus).toBe('resolved')

    const result = performTransition({
      instrumentId: 'FDR-2026-017',
      to: 'released',
      reason: 'Approval and verification prerequisites satisfied.',
      user: getDemoUserForRole('approver'),
    })
    expect(result.ok).toBe(true)
    expect(state().instruments.find((item) => item.id === 'FDR-2026-017').lifecycleStatus).toBe(
      'released',
    )
  })

  it('requires a written reason for sensitive transitions', () => {
    setRole('approver')
    recordReleaseApproval('FDR-2026-017', 'Approval basis recorded for the test.')
    const result = performTransition({
      instrumentId: 'FDR-2026-017',
      to: 'released',
      reason: '',
      user: getDemoUserForRole('approver'),
    })
    expect(result.ok).toBe(false)
    expect(result.reasons.join(' ')).toMatch(/written reason/i)
  })
})
