import { can, PERMISSIONS } from '../data/users'
import { demoStore, getCurrentUser } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { todayISO } from '../utils/format'

export function getEvidenceForInstrument(state, instrumentId) {
  return state.evidence.filter((record) => record.instrumentId === instrumentId)
}

export function getEvidenceRecord(state, evidenceId) {
  return state.evidence.find((record) => record.id === evidenceId) ?? null
}

export function computeCoverage(records) {
  const total = records.length
  const missing = records.filter((record) => record.status === 'missing').length
  const confirmed = records.filter((record) => record.status === 'independently_confirmed').length
  const complete = records.filter((record) =>
    ['internally_consistent', 'independently_confirmed', 'reviewed'].includes(record.status),
  ).length
  const pending = records.filter((record) =>
    ['confirmation_pending', 'ocr_extracted', 'institution_submitted', 'discrepancy'].includes(
      record.status,
    ),
  ).length
  return {
    total,
    missing,
    confirmed,
    complete,
    pending,
    percent: total ? Math.round((complete / total) * 100) : 0,
    confirmationPercent: total ? Math.round((confirmed / total) * 100) : 0,
  }
}

export function verificationStatusFromCoverage(records, current) {
  const coverage = computeCoverage(records)
  if (current === 'discrepancy') return current
  if (coverage.missing > 0) {
    return coverage.confirmed > 0 ? 'partially_confirmed' : 'confirmation_pending'
  }
  if (coverage.total > 0 && coverage.confirmed === coverage.total) return 'confirmed'
  if (coverage.confirmed > 0) return 'partially_confirmed'
  const internallyConsistent = records.every((record) =>
    ['internally_consistent', 'independently_confirmed', 'reviewed'].includes(record.status),
  )
  return internallyConsistent ? 'internal_passed' : 'confirmation_pending'
}

const ACTION_PERMISSION = {
  note: PERMISSIONS.EVIDENCE_REVIEW,
  follow_up: PERMISSIONS.EVIDENCE_REVIEW,
  demo_confirm: PERMISSIONS.EVIDENCE_CONFIRM,
  record_discrepancy: PERMISSIONS.EVIDENCE_REVIEW,
  clear_follow_up: PERMISSIONS.EVIDENCE_REVIEW,
}

export function updateEvidenceField({
  instrumentId,
  field,
  action,
  note = '',
  user: userOverride,
}) {
  const state = demoStore.getState()
  const user = userOverride ?? getCurrentUser()
  const record = state.evidence.find(
    (item) => item.instrumentId === instrumentId && item.field === field,
  )
  if (!record) return { ok: false, reason: 'Evidence record not found.' }
  const permission = ACTION_PERMISSION[action]
  if (!permission || !can(user.role, permission)) {
    return { ok: false, reason: `Role "${user.role}" cannot perform this evidence action.` }
  }
  if (action === 'demo_confirm' && record.status === 'missing') {
    return {
      ok: false,
      reason: 'A missing field cannot be confirmed. Obtain source evidence first.',
    }
  }
  if (
    ['note', 'demo_confirm', 'record_discrepancy'].includes(action) &&
    !note.trim()
  ) {
    return { ok: false, reason: 'A reviewer note is required for this evidence action.' }
  }
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.' }
  if (['released', 'rejected'].includes(instrument.lifecycleStatus) && action !== 'note') {
    return { ok: false, reason: 'Evidence cannot be changed after the instrument is closed.' }
  }

  const now = todayISO()
  let newStatus = record.status
  let summary = ''
  let auditAction = 'evidence.updated'

  if (action === 'note') {
    summary = `Reviewer note added to ${record.fieldLabel} evidence on ${instrumentId}.`
  } else if (action === 'follow_up') {
    newStatus = record.status
    summary = `${record.fieldLabel} evidence on ${instrumentId} marked for follow-up.`
  } else if (action === 'clear_follow_up') {
    newStatus = record.status
    summary = `${record.fieldLabel} evidence follow-up cleared on ${instrumentId}.`
  } else if (action === 'demo_confirm') {
    newStatus = 'independently_confirmed'
    auditAction = 'evidence.confirmed'
    summary = `Demo verification recorded for ${record.fieldLabel} on ${instrumentId}. This is a simulated confirmation, not a bank response.`
  } else if (action === 'record_discrepancy') {
    newStatus = 'discrepancy'
    summary = `Discrepancy recorded for ${record.fieldLabel} on ${instrumentId}.`
  }

  demoStore.update((draft) => {
    const target = draft.evidence.find((item) => item.id === record.id)
    target.status = newStatus
    target.lastUpdated = now
    target.followUp =
      action === 'clear_follow_up'
        ? false
        : action === 'demo_confirm'
          ? false
          : ['follow_up', 'record_discrepancy'].includes(action)
            ? true
            : target.followUp
    if (action === 'demo_confirm') {
      target.confirmationMode = 'demo'
      target.validationMethod = 'Demo confirmation recorded by an authorized reviewer'
      target.sourceType = target.sourceType === 'ocr_extraction' ? 'ocr_extraction' : target.sourceType
      target.reviewerNotes = [target.reviewerNotes, note.trim()].filter(Boolean).join(' · ')
    } else if (note.trim()) {
      target.reviewerNotes = [target.reviewerNotes, note.trim()].filter(Boolean).join(' · ')
    }

    const inst = draft.instruments.find((item) => item.id === instrumentId)
    const instrumentEvidence = draft.evidence.filter((item) => item.instrumentId === instrumentId)
    if (action === 'record_discrepancy') {
      inst.verificationStatus = 'discrepancy'
    } else if (action === 'demo_confirm') {
      inst.verificationStatus = verificationStatusFromCoverage(
        instrumentEvidence,
        inst.verificationStatus,
      )
    }
    inst.updatedAt = now

    appendAuditEvent(draft, {
      action: auditAction,
      entityType: 'evidence',
      entityId: record.id,
      summary,
      previousState: record.status,
      newState: newStatus,
      reason: note.trim() || 'Reviewer action in the Evidence Passport.',
      outcome: 'success',
      role: user.role,
      actor: user,
    })
    if (action === 'record_discrepancy') {
      appendAuditEvent(draft, {
        action: 'verification.decision',
        entityType: 'instrument',
        entityId: instrumentId,
        summary: `Verification status set to discrepancy after a field-level discrepancy on ${record.fieldLabel}.`,
        previousState: instrument.verificationStatus,
        newState: 'discrepancy',
        reason: note.trim(),
        outcome: 'success',
        role: user.role,
        actor: user,
      })
    }
  })

  return { ok: true, status: newStatus }
}

export function evidenceTimeline(state, instrumentId) {
  const ids = new Set(
    state.evidence
      .filter((record) => record.instrumentId === instrumentId)
      .map((record) => record.id),
  )
  return state.auditEvents
    .filter(
      (event) =>
        event.entityType === 'evidence' &&
        (ids.has(event.entityId) || event.summary?.includes(instrumentId)),
    )
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}
