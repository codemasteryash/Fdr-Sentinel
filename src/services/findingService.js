import { can, PERMISSIONS } from '../data/users'
import { FINDING_DECISIONS } from '../data/statuses'
import { demoStore, getCurrentUser } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { deriveIntegrityStatus } from './integrityEngine'
import { addNotification } from './notificationService'
import { todayISO } from '../utils/format'

const DECISION_STATUS = {
  confirmed_discrepancy: 'confirmed',
  potential_false_positive: 'false_positive',
  additional_verification: 'in_review',
  resolved_after_correction: 'resolved',
}

export function getFindingStats(state) {
  const active = state.findings.filter((finding) =>
    ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
  )
  return {
    total: state.findings.length,
    critical: active.filter((finding) => finding.severity === 'critical').length,
    high: active.filter((finding) => finding.severity === 'high').length,
    unreviewed: state.findings.filter((finding) => finding.reviewStatus === 'open').length,
    inReview: state.findings.filter((finding) => finding.reviewStatus === 'in_review').length,
    confirmed: state.findings.filter((finding) => finding.reviewStatus === 'confirmed').length,
    resolved: state.findings.filter((finding) =>
      ['resolved', 'false_positive'].includes(finding.reviewStatus),
    ).length,
    active: active.length,
  }
}

export function reviewFinding({ findingId, decision, notes = '', user: userOverride }) {
  const state = demoStore.getState()
  const user = userOverride ?? getCurrentUser()
  const finding = state.findings.find((item) => item.id === findingId)
  if (!finding) return { ok: false, reason: 'Finding not found.' }
  if (!can(user.role, PERMISSIONS.FINDING_REVIEW)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot record finding decisions. Required: verification reviewer or administrator.`,
    }
  }
  if (!DECISION_STATUS[decision]) return { ok: false, reason: 'Select a valid reviewer decision.' }
  if (!FINDING_DECISIONS[decision]) return { ok: false, reason: 'Select a valid reviewer decision.' }
  if (!notes.trim() || notes.trim().length < 5) {
    return { ok: false, reason: 'Reviewer notes of at least 5 characters are required.' }
  }
  if (['resolved', 'false_positive'].includes(finding.reviewStatus)) {
    return {
      ok: false,
      reason: 'This finding is already closed. Closed findings are retained for audit and cannot be re-opened in the demo.',
    }
  }
  if (finding.reviewStatus === DECISION_STATUS[decision] && finding.reviewedAt) {
    return { ok: false, reason: 'That decision is already recorded for this finding.' }
  }

  const newStatus = DECISION_STATUS[decision]
  const now = todayISO()
  demoStore.update((draft) => {
    const target = draft.findings.find((item) => item.id === findingId)
    target.reviewStatus = newStatus
    target.decision = decision
    target.reviewerNotes = [target.reviewerNotes, notes.trim()].filter(Boolean).join(' · ')
    target.reviewedAt = now
    target.reviewedBy = user.id

    const instrument = draft.instruments.find((item) => item.id === finding.instrumentId)
    if (instrument) {
      instrument.integrityStatus = deriveIntegrityStatus(draft.findings, instrument.id)
      instrument.updatedAt = now
    }

    appendAuditEvent(draft, {
      action: 'finding.reviewed',
      entityType: 'finding',
      entityId: findingId,
      summary: `${findingId} reviewed: ${FINDING_DECISIONS[decision]}. ${notes.trim()}`,
      previousState: finding.reviewStatus,
      newState: newStatus,
      reason: notes.trim(),
      outcome: 'success',
      role: user.role,
      actor: user,
    })
  })

  addNotification({
    type: 'integrity',
    severity: ['resolved', 'false_positive'].includes(newStatus) ? 'success' : 'warning',
    title: `${findingId} ${FINDING_DECISIONS[decision].toLowerCase()}`,
    message: `Decision recorded for ${finding.instrumentId}: ${FINDING_DECISIONS[decision]}.`,
    instrumentId: finding.instrumentId,
    href: `/integrity?finding=${findingId}`,
    actionLabel: 'View finding',
  })

  return { ok: true, newStatus }
}

export function relatedFindingsForInstrument(state, instrumentId) {
  return state.findings.filter(
    (finding) =>
      finding.instrumentId === instrumentId || finding.relatedInstrumentId === instrumentId,
  )
}
