import { beforeEach, describe, expect, it } from 'vitest'
import { demoStore, setRole } from '../services/demoDataService'
import { verifyStoredChain } from '../services/auditService'
import { computeEventHash, verifyAuditChain } from '../utils/hash'
import { performTransition } from '../services/lifecycleEngine'
import { getDemoUserForRole } from '../data/users'

function state() {
  return demoStore.getState()
}

beforeEach(() => {
  demoStore.reset({ keepRole: false })
  setRole('admin')
})

describe('local audit chain', () => {
  it('builds a valid seed chain', () => {
    const result = verifyStoredChain()
    expect(result.valid).toBe(true)
    expect(result.checked).toBeGreaterThan(0)
  })

  it('detects a tampered event summary', () => {
    const events = state().auditEvents.map((event) => ({ ...event }))
    events[2].summary = 'Tampered summary that was never authorized.'
    const result = verifyAuditChain(events)
    expect(result.valid).toBe(false)
    expect(result.broken.length).toBeGreaterThan(0)
  })

  it('detects a broken previous-event link', () => {
    const events = state().auditEvents.map((event) => ({ ...event }))
    events[4].previousEventHash = 'deadbeef'
    events[4].hash = computeEventHash(events[4], 'deadbeef')
    const result = verifyAuditChain(events)
    expect(result.valid).toBe(false)
  })

  it('appends chained events after a lifecycle attempt', () => {
    const before = state().auditEvents.length
    setRole('approver')
    performTransition({
      instrumentId: 'FDR-2026-017',
      to: 'released',
      reason: 'Blocked attempt used to test audit chaining.',
      user: getDemoUserForRole('approver'),
    })
    expect(state().auditEvents.length).toBeGreaterThan(before)
    expect(verifyStoredChain().valid).toBe(true)
  })
})
