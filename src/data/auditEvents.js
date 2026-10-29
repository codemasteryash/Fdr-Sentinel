import { addDays, formatISO, parseISO } from 'date-fns'
import { chainAuditEvents } from '../utils/hash'
import { LIFECYCLE_LABELS } from './statuses'
import { getUserById } from './users'
import { daysFromNow } from '../utils/format'

const STATE_PATHS = {
  submitted: [],
  scrutiny: ['scrutiny'],
  verification_pending: ['scrutiny', 'verification_pending'],
  verified: ['scrutiny', 'verification_pending', 'verified'],
  discrepancy: ['scrutiny', 'verification_pending', 'discrepancy'],
  renewal_due: ['scrutiny', 'verification_pending', 'verified', 'renewal_due'],
  renewal_pending: [
    'scrutiny',
    'verification_pending',
    'verified',
    'renewal_due',
    'renewal_pending',
  ],
  renewed: [
    'scrutiny',
    'verification_pending',
    'verified',
    'renewal_due',
    'renewal_pending',
    'renewed',
  ],
  replacement_pending: [
    'scrutiny',
    'verification_pending',
    'verified',
    'replacement_pending',
  ],
  replaced: [
    'scrutiny',
    'verification_pending',
    'verified',
    'replacement_pending',
    'replaced',
  ],
  release_requested: [
    'scrutiny',
    'verification_pending',
    'verified',
    'release_requested',
  ],
  release_review: [
    'scrutiny',
    'verification_pending',
    'verified',
    'release_requested',
    'release_review',
  ],
  released: [
    'scrutiny',
    'verification_pending',
    'verified',
    'release_requested',
    'release_review',
    'released',
  ],
  rejected: ['scrutiny', 'verification_pending', 'rejected'],
  returned: ['scrutiny', 'verification_pending', 'discrepancy', 'returned'],
}

function reviewerFor(instrument, index) {
  const id = index % 2 === 0 ? instrument.reviewerId : instrument.reviewerId === 'u-rev1' ? 'u-rev2' : 'u-rev1'
  return getUserById(id) ?? getUserById('u-rev1')
}

function transitionActor(toState, instrument, index) {
  if (['released', 'rejected'].includes(toState)) {
    const user = getUserById('u-approver')
    return { actorId: user.id, actorName: user.name, role: user.role }
  }
  const user = reviewerFor(instrument, index)
  return { actorId: user.id, actorName: user.name, role: user.role }
}

export function buildSeedAuditEvents(instruments, findings) {
  const events = []

  instruments.forEach((instrument) => {
    const submitter = { actorId: instrument.submittedById, actorName: instrument.submittedBy, role: 'officer' }
    events.push({
      timestamp: instrument.createdAt,
      ...submitter,
      action: 'instrument.created',
      entityType: 'instrument',
      entityId: instrument.id,
      summary: `${instrument.id} registered for ${instrument.institutionName} (${instrument.bank}, ${instrument.reference}).`,
      previousState: null,
      newState: 'submitted',
      reason: 'Instrument submitted through the institutional registry.',
      outcome: 'success',
    })

    const path = STATE_PATHS[instrument.lifecycleStatus] ?? []
    let previous = 'submitted'
    path.forEach((state, index) => {
      const timestamp = formatISO(addDays(parseISO(instrument.createdAt), (index + 1) * 2))
      const actor = transitionActor(state, instrument, index)
      events.push({
        timestamp,
        ...actor,
        action: 'lifecycle.transition',
        entityType: 'instrument',
        entityId: instrument.id,
        summary: `${instrument.id} moved from ${LIFECYCLE_LABELS[previous]} to ${LIFECYCLE_LABELS[state]}.`,
        previousState: previous,
        newState: state,
        reason:
          state === 'verified'
            ? 'Configured verification checks passed; demo confirmation recorded.'
            : state === 'discrepancy'
              ? 'Material variance recorded during integrity review.'
              : state === 'released'
                ? 'Release prerequisites satisfied and approving authority sign-off recorded.'
                : state === 'returned'
                  ? 'Returned to the institution for correction.'
                  : 'Lifecycle progression recorded by the review team.',
        outcome: 'success',
      })
      previous = state
    })
  })

  findings.forEach((finding) => {
    events.push({
      timestamp: finding.createdAt,
      actorId: 'system-engine',
      actorName: 'FDR Sentinel Integrity Engine',
      role: 'system',
      action: 'finding.created',
      entityType: 'finding',
      entityId: finding.id,
      summary: `${finding.id} created for ${finding.instrumentId}: ${finding.title}.`,
      previousState: null,
      newState: 'open',
      reason: finding.rule,
      outcome: 'success',
    })
    if (finding.reviewedAt) {
      const reviewer = getUserById(finding.reviewedBy) ?? getUserById('u-rev1')
      events.push({
        timestamp: finding.reviewedAt,
        actorId: reviewer.id,
        actorName: reviewer.name,
        role: reviewer.role,
        action: 'finding.reviewed',
        entityType: 'finding',
        entityId: finding.id,
        summary: `${finding.id} reviewed and closed as ${finding.reviewStatus.replaceAll('_', ' ')}.`,
        previousState: 'open',
        newState: finding.reviewStatus,
        reason: finding.reviewerNotes || 'Review decision recorded.',
        outcome: 'success',
      })
    }
  })

  const evidenceEvents = [
    ['FDR-2026-006', 'reference', 'OCR ambiguity flagged; independent confirmation requested.', 'u-rev1', -2],
    ['FDR-2026-009', 'amount', 'Amount variance recorded in the evidence passport.', 'u-rev1', -4],
    ['FDR-2026-014', 'beneficiary', 'Missing beneficiary field flagged for follow-up.', 'u-rev2', -5],
    ['FDR-2026-022', 'amount', 'Material amount variance flagged; bank confirmation requested.', 'u-rev2', -1],
    ['FDR-2026-019', 'maturityDate', 'One-day maturity variance recorded.', 'u-rev1', -3],
    ['FDR-2026-020', 'holder', 'Corrected holder declaration reviewed and accepted.', 'u-rev2', -20],
  ]
  evidenceEvents.forEach(([instrumentId, field, note, reviewerId, offset]) => {
    const reviewer = getUserById(reviewerId)
    events.push({
      timestamp: daysFromNow(offset),
      actorId: reviewer.id,
      actorName: reviewer.name,
      role: reviewer.role,
      action: 'evidence.updated',
      entityType: 'evidence',
      entityId: `EV-${instrumentId.replace('FDR-', '')}-${field.toUpperCase()}`,
      summary: `Evidence for ${instrumentId} · ${field} updated. ${note}`,
      previousState: 'confirmation_pending',
      newState: 'reviewed',
      reason: note,
      outcome: 'success',
    })
  })

  events.push({
    timestamp: daysFromNow(-2),
    actorId: 'u-approver',
    actorName: 'Priya Raghunathan',
    role: 'approver',
    action: 'lifecycle.blocked',
    entityType: 'instrument',
    entityId: 'FDR-2026-017',
    summary:
      'Release transition for FDR-2026-017 was blocked: required approving-authority sign-off is not recorded.',
    previousState: 'release_review',
    newState: 'released',
    reason: 'REL-03 requires a recorded approving-authority decision before release.',
    outcome: 'blocked',
  })
  events.push({
    timestamp: daysFromNow(-8),
    actorId: 'u-admin',
    actorName: 'Aarav Menon',
    role: 'admin',
    action: 'deadline.escalated',
    entityType: 'deadline',
    entityId: 'renewal:FDR-2025-024',
    summary: 'Overdue renewal for FDR-2025-024 escalated to the institution officer (in-app simulation).',
    previousState: 'overdue',
    newState: 'escalated',
    reason: 'Renewal overdue beyond the configured grace period.',
    outcome: 'success',
  })
  events.push({
    timestamp: daysFromNow(-3),
    actorId: 'u-rev1',
    actorName: 'Devansh Kulkarni',
    role: 'reviewer',
    action: 'deadline.acknowledged',
    entityType: 'deadline',
    entityId: 'maturity:FDR-2026-001',
    summary: 'Maturity action for FDR-2026-001 acknowledged by the reviewer.',
    previousState: 'open',
    newState: 'acknowledged',
    reason: 'Institution contacted for renewal instruction.',
    outcome: 'success',
  })
  events.push({
    timestamp: daysFromNow(-6),
    actorId: 'u-admin',
    actorName: 'Aarav Menon',
    role: 'admin',
    action: 'export.performed',
    entityType: 'system',
    entityId: 'registry-export',
    summary: 'FDR Registry export generated for 25 synthetic records.',
    previousState: null,
    newState: null,
    reason: 'Demo export.',
    outcome: 'success',
  })
  events.push({
    timestamp: daysFromNow(-9),
    actorId: 'u-admin',
    actorName: 'Aarav Menon',
    role: 'admin',
    action: 'role.changed',
    entityType: 'system',
    entityId: 'u-admin',
    summary: 'Demo role switched to AICTE Administrator.',
    previousState: 'reviewer',
    newState: 'admin',
    reason: 'Demonstration of role-based controls.',
    outcome: 'success',
  })
  events.push({
    timestamp: daysFromNow(-14),
    actorId: 'u-admin',
    actorName: 'Aarav Menon',
    role: 'admin',
    action: 'settings.updated',
    entityType: 'system',
    entityId: 'settings',
    summary: 'Deadline lead times updated to 90 / 60 / 30 days for the demo.',
    previousState: '60 / 30 / 15 days',
    newState: '90 / 60 / 30 days',
    reason: 'Align demo configuration with the review policy.',
    outcome: 'success',
  })

  const sorted = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  return chainAuditEvents(
    sorted.map((event, index) => ({
      ...event,
      id: `AUD-${String(index + 1).padStart(4, '0')}`,
    })),
  )
}
