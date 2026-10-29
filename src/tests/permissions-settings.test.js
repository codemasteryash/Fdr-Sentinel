import { beforeEach, describe, expect, it } from 'vitest'
import { can, PERMISSIONS, ROLES } from '../data/users'
import { demoStore, setRole } from '../services/demoDataService'
import { saveSettings, resetDemoSystem } from '../services/settingsService'
import { verifyAuditChain } from '../utils/hash'

beforeEach(() => {
  demoStore.reset({ keepRole: false })
  setRole('admin')
})

describe('role permission model', () => {
  it('grants administrators full configuration authority', () => {
    expect(can('admin', PERMISSIONS.SETTINGS_MANAGE)).toBe(true)
    expect(can('admin', PERMISSIONS.LIFECYCLE_APPROVE)).toBe(true)
    expect(can('admin', PERMISSIONS.SCENARIO_RUN)).toBe(true)
  })

  it('keeps auditors read-only and blocks sensitive actions', () => {
    expect(can('auditor', PERMISSIONS.VIEW_ALL)).toBe(true)
    expect(can('auditor', PERMISSIONS.INSTRUMENT_EDIT)).toBe(false)
    expect(can('auditor', PERMISSIONS.FINDING_REVIEW)).toBe(false)
    expect(can('auditor', PERMISSIONS.LIFECYCLE_APPROVE)).toBe(false)
    expect(can('auditor', PERMISSIONS.SETTINGS_MANAGE)).toBe(false)
  })

  it('separates officer submission rights from reviewer decision rights', () => {
    expect(can('officer', PERMISSIONS.INSTRUMENT_CREATE)).toBe(true)
    expect(can('officer', PERMISSIONS.FINDING_REVIEW)).toBe(false)
    expect(can('reviewer', PERMISSIONS.FINDING_REVIEW)).toBe(true)
    expect(can('reviewer', PERMISSIONS.INSTRUMENT_CREATE)).toBe(false)
    expect(can('approver', PERMISSIONS.LIFECYCLE_APPROVE)).toBe(true)
    expect(can('approver', PERMISSIONS.INSTRUMENT_EDIT)).toBe(false)
  })

  it('has a complete role description for every demo persona', () => {
    Object.values(ROLES).forEach((role) => {
      expect(role.label).toBeTruthy()
      expect(role.permissions.length).toBeGreaterThan(0)
    })
  })
})

describe('settings service permissions and auditing', () => {
  it('saves valid configuration and appends an audit event', () => {
    const result = saveSettings(
      {
        leadTimes: { criticalDays: 21, dueSoonDays: 45, upcomingDays: 75 },
        thresholds: { fuzzySimilarity: 85, amountVariancePercent: 2, amountVarianceAbsolute: 1500 },
        notifications: { maturity: false },
      },
      'Tightened demo thresholds for the judging run.',
    )
    expect(result.ok).toBe(true)
    const settings = demoStore.getState().settings
    expect(settings.leadTimes.criticalDays).toBe(21)
    expect(settings.thresholds.fuzzySimilarity).toBe(85)
    expect(settings.notifications.maturity).toBe(false)
    expect(
      demoStore.getState().auditEvents.some((event) => event.action === 'settings.updated'),
    ).toBe(true)
    expect(verifyAuditChain(demoStore.getState().auditEvents).valid).toBe(true)
  })

  it('rejects unordered lead times and out-of-range thresholds', () => {
    expect(
      saveSettings({
        leadTimes: { criticalDays: 90, dueSoonDays: 60, upcomingDays: 30 },
      }).ok,
    ).toBe(false)
    expect(saveSettings({ thresholds: { fuzzySimilarity: 10 } }).ok).toBe(false)
  })

  it('rejects configuration changes from read-only roles', () => {
    setRole('auditor')
    const result = saveSettings({ thresholds: { fuzzySimilarity: 90 } })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/cannot change/i)
  })

  it('resets data only for authorized roles and audits the reset', () => {
    const first = saveSettings(
      { leadTimes: { criticalDays: 25, dueSoonDays: 50, upcomingDays: 80 } },
      'Temporary configuration for reset test.',
    )
    expect(first.ok).toBe(true)
    expect(resetDemoSystem('Verify reset flow.').ok).toBe(true)
    expect(demoStore.getState().settings.leadTimes.criticalDays).toBe(30)
    const resetEvent = demoStore.getState().auditEvents.find(
      (event) => event.action === 'demo.reset',
    )
    expect(resetEvent).toBeTruthy()
    expect(verifyAuditChain(demoStore.getState().auditEvents).valid).toBe(true)

    setRole('auditor')
    expect(resetDemoSystem().ok).toBe(false)
  })
})
