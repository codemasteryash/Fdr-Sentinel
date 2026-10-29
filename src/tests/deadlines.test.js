import { beforeEach, describe, expect, it } from 'vitest'
import {
  acknowledgeDeadline,
  buildDeadlineActions,
  completeDeadline,
  escalateDeadline,
  getDeadlineStats,
  priorityForDays,
} from '../services/deadlineEngine'
import { demoStore, setRole } from '../services/demoDataService'
import { getDemoUserForRole } from '../data/users'

function state() {
  return demoStore.getState()
}

beforeEach(() => {
  demoStore.reset({ keepRole: false })
  setRole('admin')
})

describe('deadline intelligence', () => {
  it('classifies urgency against configured lead times', () => {
    const leadTimes = state().settings.leadTimes
    expect(priorityForDays(-1, leadTimes)).toBe('overdue')
    expect(priorityForDays(13, leadTimes)).toBe('critical')
    expect(priorityForDays(45, leadTimes)).toBe('due_soon')
    expect(priorityForDays(85, leadTimes)).toBe('upcoming')
    expect(priorityForDays(null, leadTimes)).toBe('upcoming')
  })

  it('generates the renewal action for the seeded 13-day maturity case', () => {
    const actions = buildDeadlineActions(state())
    const action = actions.find((item) => item.id === 'renewal:FDR-2026-003')
    expect(action).toBeTruthy()
    expect(action.type).toBe('renewal')
    expect(action.daysRemaining).toBe(13)
    expect(action.priority).toBe('critical')
    expect(action.status).toBe('open')
  })

  it('keeps the overdue escalated case visible in the queue', () => {
    const actions = buildDeadlineActions(state())
    const action = actions.find((item) => item.id === 'renewal:FDR-2025-024')
    expect(action).toBeTruthy()
    expect(action.priority).toBe('critical')
    expect(action.status).toBe('escalated')
    expect(action.daysRemaining).toBeLessThan(0)
  })

  it('acknowledges an action and writes an audit event', () => {
    const result = acknowledgeDeadline(
      'renewal:FDR-2026-003',
      'Institution contacted for renewal instructions.',
      getDemoUserForRole('admin'),
    )
    expect(result.ok).toBe(true)
    expect(state().deadlineState.acknowledged['renewal:FDR-2026-003']).toBeTruthy()
    expect(
      state().auditEvents.some(
        (event) =>
          event.action === 'deadline.acknowledged' &&
          event.entityId === 'renewal:FDR-2026-003',
      ),
    ).toBe(true)
  })

  it('prevents closing a finding or release through the deadline queue', () => {
    const actions = buildDeadlineActions(state())
    const findingAction = actions.find((action) => action.type === 'finding')
    const releaseAction = actions.find((action) => action.type === 'release')
    expect(findingAction).toBeTruthy()
    expect(releaseAction).toBeTruthy()
    expect(
      completeDeadline(findingAction.id, 'Closing without a review.', getDemoUserForRole('admin')).ok,
    ).toBe(false)
    expect(
      completeDeadline(releaseAction.id, 'Closing without approval.', getDemoUserForRole('admin')).ok,
    ).toBe(false)
  })

  it('restricts escalation to authorized deadline managers', () => {
    const auditor = getDemoUserForRole('auditor')
    expect(escalateDeadline('renewal:FDR-2026-003', 'Escalating.', auditor).ok).toBe(false)
    expect(escalateDeadline('renewal:FDR-2026-003', 'Escalating.', getDemoUserForRole('admin')).ok).toBe(
      true,
    )
  })

  it('returns a consistent stats summary', () => {
    const stats = getDeadlineStats(buildDeadlineActions(state()))
    expect(stats.total).toBeGreaterThan(0)
    expect(stats.overdue).toBeGreaterThan(0)
    expect(stats.critical).toBeGreaterThan(0)
  })
})
