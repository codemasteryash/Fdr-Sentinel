import { can, PERMISSIONS } from '../data/users'
import { LIFECYCLE_LABELS } from '../data/statuses'
import { getCurrentUser, demoStore } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { deriveIntegrityStatus } from './integrityEngine'
import { todayISO } from '../utils/format'
import { addNotification } from './notificationService'

/**
 * Central lifecycle transition configuration. UI components never set a
 * lifecycle status directly — every change goes through this engine.
 */
export const LIFECYCLE_STATES = {
  submitted: { label: 'Submitted', tone: 'neutral', group: 'Intake' },
  scrutiny: { label: 'Under Scrutiny', tone: 'info', group: 'Review' },
  verification_pending: { label: 'Verification Pending', tone: 'warning', group: 'Review' },
  verified: { label: 'Verified', tone: 'success', group: 'Verified' },
  discrepancy: { label: 'Discrepancy Found', tone: 'critical', group: 'Exception' },
  renewal_due: { label: 'Renewal Due', tone: 'warning', group: 'Renewal' },
  renewal_pending: {
    label: 'Renewal Pending Verification',
    tone: 'warning',
    group: 'Renewal',
  },
  renewed: { label: 'Renewed', tone: 'success', group: 'Renewal' },
  replacement_pending: {
    label: 'Replacement Pending Verification',
    tone: 'warning',
    group: 'Replacement',
  },
  replaced: { label: 'Replaced', tone: 'success', group: 'Replacement' },
  release_requested: { label: 'Release Requested', tone: 'info', group: 'Release' },
  release_review: { label: 'Release Under Review', tone: 'warning', group: 'Release' },
  released: { label: 'Released', tone: 'success', group: 'Closed' },
  rejected: { label: 'Rejected', tone: 'critical', group: 'Closed' },
  returned: { label: 'Returned for Correction', tone: 'critical', group: 'Exception' },
}

export const TRANSITIONS = [
  {
    id: 'T-01',
    from: 'submitted',
    to: 'scrutiny',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    label: 'Begin scrutiny',
  },
  {
    id: 'T-02',
    from: 'submitted',
    to: 'returned',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Return for correction',
  },
  {
    id: 'T-03',
    from: 'scrutiny',
    to: 'verification_pending',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    label: 'Send to verification',
  },
  {
    id: 'T-04',
    from: 'scrutiny',
    to: 'discrepancy',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Record discrepancy',
  },
  {
    id: 'T-05',
    from: 'scrutiny',
    to: 'returned',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Return for correction',
  },
  {
    id: 'T-06',
    from: 'verification_pending',
    to: 'verified',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Mark verified',
    policy: 'verification',
  },
  {
    id: 'T-07',
    from: 'verification_pending',
    to: 'discrepancy',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Record discrepancy',
  },
  {
    id: 'T-08',
    from: 'verification_pending',
    to: 'returned',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Return for correction',
  },
  {
    id: 'T-09',
    from: 'discrepancy',
    to: 'verification_pending',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Resume verification after correction',
    policy: 'clear_findings',
  },
  {
    id: 'T-10',
    from: 'discrepancy',
    to: 'returned',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Return for correction',
  },
  {
    id: 'T-11',
    from: 'returned',
    to: 'submitted',
    permission: PERMISSIONS.LIFECYCLE_REQUEST,
    allowedRoles: ['officer', 'admin'],
    requiresReason: true,
    label: 'Resubmit corrected record',
    institutionScoped: true,
  },
  {
    id: 'T-12',
    from: 'verified',
    to: 'renewal_due',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    label: 'Open renewal window',
  },
  {
    id: 'T-13',
    from: 'renewal_due',
    to: 'renewal_pending',
    permission: PERMISSIONS.LIFECYCLE_REQUEST,
    allowedRoles: ['officer', 'reviewer', 'admin'],
    requiresReason: true,
    label: 'Submit renewal for verification',
    institutionScoped: true,
  },
  {
    id: 'T-14',
    from: 'renewal_pending',
    to: 'renewed',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Confirm renewal',
    policy: 'verification',
  },
  {
    id: 'T-15',
    from: 'renewal_pending',
    to: 'discrepancy',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Record renewal discrepancy',
  },
  {
    id: 'T-16',
    from: 'verified',
    to: 'replacement_pending',
    permission: PERMISSIONS.LIFECYCLE_REQUEST,
    allowedRoles: ['officer', 'reviewer', 'admin'],
    requiresReason: true,
    label: 'Send replacement for verification',
    institutionScoped: true,
  },
  {
    id: 'T-17',
    from: 'replacement_pending',
    to: 'replaced',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Confirm replacement',
    policy: 'verification',
  },
  {
    id: 'T-18',
    from: 'verified',
    to: 'release_requested',
    permission: PERMISSIONS.LIFECYCLE_REQUEST,
    allowedRoles: ['officer', 'admin'],
    requiresReason: true,
    label: 'Request release',
    policy: 'verification',
  },
  {
    id: 'T-19',
    from: 'release_requested',
    to: 'release_review',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    label: 'Begin release review',
    policy: 'verification',
  },
  {
    id: 'T-20',
    from: 'release_review',
    to: 'released',
    permission: PERMISSIONS.LIFECYCLE_APPROVE,
    allowedRoles: ['approver', 'admin'],
    requiresReason: true,
    label: 'Approve and release',
    policy: 'release',
  },
  {
    id: 'T-21',
    from: 'release_review',
    to: 'rejected',
    permission: PERMISSIONS.LIFECYCLE_APPROVE,
    allowedRoles: ['approver', 'admin'],
    requiresReason: true,
    label: 'Reject release',
  },
  {
    id: 'T-22',
    from: 'release_review',
    to: 'returned',
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    allowedRoles: ['reviewer', 'admin'],
    requiresReason: true,
    label: 'Return release request',
  },
]

export function transitionsFrom(status) {
  return TRANSITIONS.filter((transition) => transition.from === status)
}

function unresolvedMaterialFindings(findings, instrumentId) {
  return findings.filter(
    (finding) =>
      finding.instrumentId === instrumentId &&
      ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus) &&
      ['critical', 'high'].includes(finding.severity),
  )
}

export function checkTransition({ instrument, to, user, findings }) {
  const transition = TRANSITIONS.find((item) => item.from === instrument.lifecycleStatus && item.to === to)
  const reasons = []
  const missingRequirements = []

  if (!transition) {
    return {
      allowed: false,
      transition: null,
      reasons: [
        `Transition from "${LIFECYCLE_LABELS[instrument.lifecycleStatus]}" to "${
          LIFECYCLE_LABELS[to] ?? to
        }" is not defined by the lifecycle policy.`,
      ],
      missingRequirements: ['A configured policy transition'],
      requiredRole: '—',
    }
  }

  const role = user?.role
  const roleAllowed = transition.allowedRoles.includes(role)
  const permissionAllowed = can(role, transition.permission)
  if (!roleAllowed || !permissionAllowed) {
    reasons.push(
      `Role "${role}" is not permitted to perform this transition. Required: ${transition.allowedRoles.join(
        ' or ',
      )}.`,
    )
    missingRequirements.push('A permitted role')
  }

  if (
    transition.institutionScoped &&
    role === 'officer' &&
    user?.institutionId !== instrument.institutionId
  ) {
    reasons.push('Institution officers may only act on instruments belonging to their institution.')
    missingRequirements.push('Institution ownership')
  }

  if (transition.policy === 'verification') {
    if (instrument.verificationStatus !== 'confirmed') {
      reasons.push(
        `Verification status is "${instrument.verificationStatus}". This transition requires independently confirmed evidence (demo confirmation).`,
      )
      missingRequirements.push('Confirmed verification status')
    }
    const material = unresolvedMaterialFindings(findings, instrument.id).filter(
      (finding) => finding.category !== 'lifecycle_policy_violation',
    )
    if (material.length) {
      reasons.push(
        `${material.length} unresolved material finding(s) must be resolved first: ${material
          .map((finding) => finding.id)
          .join(', ')}.`,
      )
      missingRequirements.push('Resolution of material findings')
    }
  }

  if (transition.policy === 'clear_findings') {
    const material = unresolvedMaterialFindings(findings, instrument.id)
    if (material.length) {
      reasons.push(
        `${material.length} unresolved material finding(s) remain: ${material
          .map((finding) => finding.id)
          .join(', ')}. Corrections must be reviewed before resuming verification.`,
      )
      missingRequirements.push('Resolution of material findings')
    }
  }

  if (transition.policy === 'release') {
    if (!instrument.approval?.approved) {
      reasons.push(
        'Required approving-authority sign-off is not recorded. Policy REL-03 blocks release without it.',
      )
      missingRequirements.push('Approving-authority sign-off')
    }
    if (instrument.verificationStatus !== 'confirmed') {
      reasons.push('Verification must be confirmed before release.')
      missingRequirements.push('Confirmed verification')
    }
    const material = unresolvedMaterialFindings(findings, instrument.id)
    if (material.length) {
      reasons.push(
        `${material.length} unresolved material finding(s) block release: ${material
          .map((finding) => finding.id)
          .join(', ')}.`,
      )
      missingRequirements.push('No unresolved material findings')
    }
  }

  return {
    allowed: reasons.length === 0,
    transition,
    reasons,
    missingRequirements,
    requiredRole: transition.allowedRoles.join(' / '),
  }
}

export function getAvailableTransitions(instrument, user, findings) {
  return transitionsFrom(instrument.lifecycleStatus).map((transition) => ({
    ...transition,
    check: checkTransition({ instrument, to: transition.to, user, findings }),
  }))
}

export function performTransition({ instrumentId, to, reason = '', user: userOverride }) {
  const state = demoStore.getState()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  const user = userOverride ?? getCurrentUser()
  if (!instrument) {
    return { ok: false, reasons: ['Instrument not found.'], check: null }
  }
  const check = checkTransition({ instrument, to, user, findings: state.findings })
  const reasons = [...check.reasons]
  if (check.transition?.requiresReason && !reason.trim()) {
    reasons.push('A written reason is required for this sensitive lifecycle decision.')
  }

  if (reasons.length) {
    demoStore.update((draft) => {
      appendAuditEvent(draft, {
        action: 'lifecycle.blocked',
        entityType: 'instrument',
        entityId: instrumentId,
        summary: `Transition ${LIFECYCLE_LABELS[instrument.lifecycleStatus]} → ${
          LIFECYCLE_LABELS[to] ?? to
        } was blocked for ${instrumentId}. ${reasons.join(' ')}`,
        previousState: instrument.lifecycleStatus,
        newState: to,
        reason: reason || reasons.join(' '),
        outcome: 'blocked',
        role: user?.role,
        actor: user,
      })
    })
    return { ok: false, reasons, check }
  }

  const now = todayISO()
  demoStore.update((draft) => {
    const target = draft.instruments.find((item) => item.id === instrumentId)
    const previous = target.lifecycleStatus
    target.lifecycleStatus = to
    target.updatedAt = now
    if (to === 'discrepancy') {
      target.verificationStatus = 'discrepancy'
    }
    if (to === 'released') {
      target.tags = Array.from(new Set([...(target.tags ?? []), 'closed']))
    }
    if (to === 'verified') {
      target.tags = Array.from(new Set([...(target.tags ?? []), 'verified']))
    }
    target.integrityStatus = deriveIntegrityStatus(draft.findings, instrumentId)
    appendAuditEvent(draft, {
      action: 'lifecycle.transition',
      entityType: 'instrument',
      entityId: instrumentId,
      summary: `${instrumentId} moved from ${LIFECYCLE_LABELS[previous]} to ${LIFECYCLE_LABELS[to]}.`,
      previousState: previous,
      newState: to,
      reason: reason || check.transition?.label,
      outcome: 'success',
      role: user?.role,
      actor: user,
    })
  })

  if (to === 'release_requested') {
    addNotification({
      type: 'release',
      severity: 'warning',
      title: `Release requested — ${instrumentId}`,
      message: `${instrument.institutionName} requested release of instrument ${instrument.reference}.`,
      instrumentId,
      href: `/lifecycle/${instrumentId}`,
      actionLabel: 'Open release',
    })
  }

  return { ok: true, check, previousState: instrument.lifecycleStatus, newState: to }
}

export function recordReleaseApproval(instrumentId, note = '') {
  const state = demoStore.getState()
  const user = getCurrentUser()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.' }
  if (!can(user.role, PERMISSIONS.LIFECYCLE_APPROVE)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot record a release approval. Required: approving authority.`,
    }
  }
  if (!['release_requested', 'release_review'].includes(instrument.lifecycleStatus)) {
    return {
      ok: false,
      reason: 'A release approval can only be recorded while a release is requested or under review.',
    }
  }
  if (!note.trim()) {
    return { ok: false, reason: 'Record the basis for the approval before proceeding.' }
  }

  const now = todayISO()
  demoStore.update((draft) => {
    const target = draft.instruments.find((item) => item.id === instrumentId)
    const previousLifecycle = target.lifecycleStatus
    target.approval = {
      required: true,
      approved: true,
      approvedBy: user.id,
      approvedAt: now,
      note: note.trim(),
      demo: true,
    }
    target.updatedAt = now
    const resolved = []
    draft.findings.forEach((finding) => {
      if (
        finding.instrumentId === instrumentId &&
        finding.category === 'lifecycle_policy_violation' &&
        ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus)
      ) {
        const previousReviewStatus = finding.reviewStatus
        finding.reviewStatus = 'resolved'
        finding.decision = 'resolved_after_correction'
        finding.reviewerNotes = `Release approval recorded in demo mode: ${note.trim()}`
        finding.reviewedAt = now
        finding.reviewedBy = user.id
        resolved.push({ id: finding.id, previousState: previousReviewStatus })
      }
    })
    target.integrityStatus = deriveIntegrityStatus(draft.findings, instrumentId)
    appendAuditEvent(draft, {
      action: 'release.approved',
      entityType: 'instrument',
      entityId: instrumentId,
      summary: `Demo release approval recorded for ${instrumentId} by ${user.name}.`,
      previousState: previousLifecycle,
      newState: 'approval_recorded',
      reason: note.trim(),
      outcome: 'success',
      role: user.role,
      actor: user,
    })
    resolved.forEach(({ id: findingId, previousState }) => {
      appendAuditEvent(draft, {
        action: 'finding.reviewed',
        entityType: 'finding',
        entityId: findingId,
        summary: `${findingId} resolved after the release approval prerequisite was recorded.`,
        previousState,
        newState: 'resolved',
        reason: 'Policy prerequisite satisfied by a simulated approving-authority decision.',
        outcome: 'success',
        role: user.role,
        actor: user,
      })
    })
  })
  return { ok: true }
}
