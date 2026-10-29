import { appendAuditEvent } from './auditService'
import { demoStore } from './demoDataService'
import { can, getDemoUserForRole, PERMISSIONS } from '../data/users'
import { todayISO } from '../utils/format'

function activeRole() {
  return demoStore.getState().settings.role
}

function activeUser() {
  const state = demoStore.getState()
  return getDemoUserForRole(state.settings.role)
}

function asInteger(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : NaN
}

function validateConfig(patch) {
  const leadTimes = patch.leadTimes
  if (leadTimes) {
    const criticalDays = asInteger(leadTimes.criticalDays)
    const dueSoonDays = asInteger(leadTimes.dueSoonDays)
    const upcomingDays = asInteger(leadTimes.upcomingDays)
    if ([criticalDays, dueSoonDays, upcomingDays].some((value) => !Number.isFinite(value) || value < 1)) {
      return 'Lead times must be positive whole numbers of days.'
    }
    if (!(criticalDays < dueSoonDays && dueSoonDays < upcomingDays)) {
      return 'Lead times must increase: critical < due soon < upcoming.'
    }
  }
  const thresholds = patch.thresholds
  if (thresholds) {
    const fuzzy = Number(thresholds.fuzzySimilarity)
    const variancePercent = Number(thresholds.amountVariancePercent)
    const varianceAbsolute = Number(thresholds.amountVarianceAbsolute)
    if (!Number.isFinite(fuzzy) || fuzzy < 50 || fuzzy > 100) {
      return 'Fuzzy match similarity must be between 50 and 100.'
    }
    if (!Number.isFinite(variancePercent) || variancePercent < 0 || variancePercent > 100) {
      return 'Amount variance percentage must be between 0 and 100.'
    }
    if (!Number.isFinite(varianceAbsolute) || varianceAbsolute < 0) {
      return 'Absolute amount tolerance cannot be negative.'
    }
  }
  return null
}

export function saveSettings(patch, note = '') {
  if (!can(activeRole(), PERMISSIONS.SETTINGS_MANAGE)) {
    return { ok: false, reason: 'Your demo role cannot change system configuration.' }
  }
  const invalid = validateConfig(patch)
  if (invalid) return { ok: false, reason: invalid }

  const current = demoStore.getState().settings
  const next = {
    ...current,
    ...patch,
    leadTimes: { ...current.leadTimes, ...(patch.leadTimes ?? {}) },
    thresholds: { ...current.thresholds, ...(patch.thresholds ?? {}) },
    notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
  }
  const summary = `Configuration updated: lead times ${next.leadTimes.criticalDays}/${next.leadTimes.dueSoonDays}/${next.leadTimes.upcomingDays} days; fuzzy threshold ${next.thresholds.fuzzySimilarity}; amount tolerance ${next.thresholds.amountVariancePercent}% or ${next.thresholds.amountVarianceAbsolute}.`
  demoStore.update((draft) => {
    draft.settings = next
    appendAuditEvent(draft, {
      action: 'settings.updated',
      entityType: 'system',
      entityId: 'configuration',
      summary: note ? `${summary} Note: ${note}` : summary,
      previousState: JSON.stringify({
        leadTimes: current.leadTimes,
        thresholds: current.thresholds,
        notifications: current.notifications,
      }),
      newState: JSON.stringify({
        leadTimes: next.leadTimes,
        thresholds: next.thresholds,
        notifications: next.notifications,
      }),
      reason: 'Administrator updated deterministic demo configuration.',
      outcome: 'success',
      actor: activeUser(),
      role: activeRole(),
    })
  })
  return { ok: true, settings: next }
}

export function resetDemoSystem(note = '') {
  if (!can(activeRole(), PERMISSIONS.RESET_DEMO)) {
    return { ok: false, reason: 'Your demo role cannot reset demonstration data.' }
  }
  const actor = activeUser()
  const role = activeRole()
  demoStore.reset({ keepRole: true })
  demoStore.update((draft) => {
    appendAuditEvent(draft, {
      action: 'demo.reset',
      entityType: 'system',
      entityId: 'demo-data',
      summary: note
        ? `Demo dataset reset to seeded state. Note: ${note}`
        : 'Demo dataset reset to seeded state. Current demo role was preserved.',
      previousState: null,
      newState: 'seeded',
      reason: 'Administrator restored the deterministic demonstration dataset.',
      outcome: 'success',
      actor,
      role,
    })
  })
  return { ok: true }
}

export function snapshotPayload() {
  const state = demoStore.getState()
  return {
    exportedAt: new Date().toISOString(),
    schema: 'fdr-sentinel-demo',
    version: state.version,
    seededAt: state.seededAt,
    updatedAt: state.meta?.updatedAt ?? todayISO(),
    state,
  }
}
