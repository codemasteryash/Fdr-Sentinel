import { computeEventHash, verifyAuditChain } from '../utils/hash'
import { getDemoUserForRole } from '../data/users'
import { demoStore } from './demoDataService'
import { todayISO } from '../utils/format'

function nextAuditId(events) {
  let max = 0
  events.forEach((event) => {
    const match = String(event.id).match(/AUD-(\d+)/)
    if (match) max = Math.max(max, Number(match[1]))
  })
  return `AUD-${String(max + 1).padStart(4, '0')}`
}

export function appendAuditEvent(draft, payload) {
  const events = draft.auditEvents
  const actor =
    payload.actor ??
    getDemoUserForRole(draft.settings.role) ??
    getDemoUserForRole('admin')
  const previousEventHash = events.length ? events[events.length - 1].hash : 'GENESIS'
  const event = {
    id: nextAuditId(events),
    timestamp: payload.timestamp ?? todayISO(),
    actorId: actor.id,
    actorName: actor.name,
    role: payload.role ?? actor.role,
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId,
    summary: payload.summary,
    previousState: payload.previousState ?? null,
    newState: payload.newState ?? null,
    reason: payload.reason ?? '',
    outcome: payload.outcome ?? 'success',
  }
  event.previousEventHash = previousEventHash
  event.hash = computeEventHash(event, previousEventHash)
  events.push(event)
  return event
}

export function recordAudit(payload) {
  let recorded = null
  demoStore.update((draft) => {
    recorded = appendAuditEvent(draft, payload)
  })
  return recorded
}

export function getAuditEvents(state) {
  return [...state.auditEvents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export function getEntityAudit(state, entityId) {
  return getAuditEvents(state).filter(
    (event) => event.entityId === entityId || event.summary?.includes(entityId),
  )
}

export function verifyStoredChain() {
  const state = demoStore.getState()
  return verifyAuditChain(state.auditEvents)
}

export function auditActionLabel(action) {
  const labels = {
    'instrument.created': 'Instrument created',
    'instrument.updated': 'Metadata corrected',
    'document.uploaded': 'Document added',
    'integrity.analysis_run': 'Integrity analysis run',
    'finding.created': 'Finding created',
    'finding.reviewed': 'Finding reviewed',
    'evidence.updated': 'Evidence updated',
    'evidence.confirmed': 'Demo confirmation recorded',
    'verification.decision': 'Verification decision',
    'lifecycle.transition': 'Lifecycle transition',
    'lifecycle.blocked': 'Transition blocked',
    'release.approved': 'Release approved',
    'deadline.acknowledged': 'Deadline acknowledged',
    'deadline.completed': 'Deadline completed',
    'deadline.assigned': 'Deadline reassigned',
    'deadline.escalated': 'Deadline escalated',
    'role.changed': 'Demo role changed',
    'settings.updated': 'Settings updated',
    'export.performed': 'Export performed',
    'demo.reset': 'Demo data reset',
    'demo.scenario_run': 'Demo scenario run',
    'institution.created': 'Institution registered',
    'institution.updated': 'Institution updated',
  }
  return labels[action] ?? action
}

export function auditActionTone(action, outcome) {
  if (outcome === 'blocked') return 'critical'
  if (action === 'finding.reviewed' || action === 'release.approved') return 'success'
  if (action === 'lifecycle.blocked') return 'critical'
  if (action.startsWith('deadline')) return 'warning'
  if (action === 'integrity.analysis_run' || action === 'finding.created') return 'info'
  return 'neutral'
}
