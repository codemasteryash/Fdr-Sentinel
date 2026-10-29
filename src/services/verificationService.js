import { can, PERMISSIONS } from '../data/users'
import { demoStore, getCurrentUser } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { addNotification } from './notificationService'
import { performTransition } from './lifecycleEngine'
import {
  computeCoverage,
  getEvidenceForInstrument,
  verificationStatusFromCoverage,
} from './evidenceService'
import { todayISO } from '../utils/format'

export function buildVerificationChecklist(state, instrument) {
  const evidence = getEvidenceForInstrument(state, instrument.id)
  const coverage = computeCoverage(evidence)
  const analysisEvents = state.auditEvents.filter(
    (event) => event.entityId === instrument.id && event.action === 'integrity.analysis_run',
  )
  const activeFindings = state.findings.filter(
    (finding) =>
      finding.instrumentId === instrument.id &&
      ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
  )
  const material = activeFindings.filter((finding) =>
    ['critical', 'high'].includes(finding.severity),
  )
  return [
    {
      id: 'submission',
      label: 'Submission fields complete',
      detail: 'Reference, bank, amount, dates, beneficiary, and holder are present.',
      done: Boolean(
        instrument.reference &&
          instrument.bank &&
          instrument.amount &&
          instrument.issueDate &&
          instrument.maturityDate &&
          instrument.beneficiary &&
          instrument.holder,
      ),
    },
    {
      id: 'document',
      label: 'Supporting document attached',
      detail: instrument.document?.name ?? 'No document attached.',
      done: Boolean(instrument.document?.name),
    },
    {
      id: 'integrity',
      label: 'Integrity analysis run',
      detail: analysisEvents.length
        ? `${analysisEvents.length} analysis run(s) recorded.`
        : 'No integrity analysis recorded for this instrument.',
      done: analysisEvents.length > 0,
    },
    {
      id: 'internal',
      label: 'Internal checks completed',
      detail:
        instrument.verificationStatus === 'unverified'
          ? 'Internal verification has not started.'
          : `Verification status: ${instrument.verificationStatus.replaceAll('_', ' ')}.`,
      done: instrument.verificationStatus !== 'unverified',
    },
    {
      id: 'evidence',
      label: 'Evidence completeness',
      detail: `${coverage.complete}/${coverage.total} fields internally consistent; ${coverage.confirmed} independently confirmed (demo); ${coverage.missing} missing.`,
      done: coverage.total > 0 && coverage.complete === coverage.total,
    },
    {
      id: 'confirmation',
      label: 'Independent confirmation (demo)',
      detail:
        coverage.confirmed > 0
          ? `${coverage.confirmed} field(s) carry a simulated confirmation. This is not a bank response.`
          : 'No independent confirmation has been simulated.',
      done: coverage.total > 0 && coverage.confirmed === coverage.total,
    },
    {
      id: 'findings',
      label: 'No unresolved material findings',
      detail: material.length
        ? `${material.length} material finding(s) still open or confirmed.`
        : 'No unresolved material findings.',
      done: material.length === 0,
    },
  ]
}

export function getVerificationQueue(state) {
  const open = state.instruments.filter(
    (instrument) =>
      !['released', 'rejected'].includes(instrument.lifecycleStatus) &&
      (instrument.verificationStatus !== 'confirmed' ||
        instrument.lifecycleStatus === 'verification_pending'),
  )
  const order = { discrepancy: 0, confirmation_pending: 1, partially_confirmed: 2, internal_passed: 3, unverified: 4, confirmed: 5 }
  return open.sort((a, b) => {
    const rank = (order[a.verificationStatus] ?? 9) - (order[b.verificationStatus] ?? 9)
    if (rank !== 0) return rank
    return new Date(a.updatedAt) - new Date(b.updatedAt)
  })
}

function decide({ instrumentId, note, action, user, mutate, summary, outcome = 'success' }) {
  const state = demoStore.getState()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.' }
  if (!can(user.role, PERMISSIONS.VERIFICATION_DECIDE)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot record verification decisions. Required: verification reviewer or administrator.`,
    }
  }
  if (!note.trim()) return { ok: false, reason: 'A reviewer note is required.' }
  if (['released', 'rejected'].includes(instrument.lifecycleStatus)) {
    return { ok: false, reason: 'Verification is closed for this instrument.' }
  }
  const now = todayISO()
  demoStore.update((draft) => {
    const target = draft.instruments.find((item) => item.id === instrumentId)
    const previous = target.verificationStatus
    mutate(target, draft)
    target.updatedAt = now
    appendAuditEvent(draft, {
      action,
      entityType: 'instrument',
      entityId: instrumentId,
      summary: summary(instrument),
      previousState: previous,
      newState: target.verificationStatus,
      reason: note.trim(),
      outcome,
      role: user.role,
      actor: user,
    })
  })
  return { ok: true }
}

export function completeInternalChecks(instrumentId, note, userOverride) {
  const user = userOverride ?? getCurrentUser()
  const state = demoStore.getState()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.' }
  if (['confirmed', 'discrepancy'].includes(instrument.verificationStatus)) {
    return {
      ok: false,
      reason: `Internal checks cannot be reset from verification status "${instrument.verificationStatus.replaceAll('_', ' ')}".`,
    }
  }
  return decide({
    instrumentId,
    note,
    action: 'verification.decision',
    user,
    mutate: (target) => {
      if (target.verificationStatus === 'unverified') target.verificationStatus = 'internal_passed'
    },
    summary: () => `Internal verification checks completed for ${instrumentId}.`,
  })
}

export function requestAdditionalEvidence(instrumentId, note, userOverride) {
  const user = userOverride ?? getCurrentUser()
  return decide({
    instrumentId,
    note,
    action: 'verification.decision',
    user,
    mutate: (target) => {
      target.verificationStatus = 'confirmation_pending'
    },
    summary: () => `Additional evidence requested for ${instrumentId}; confirmation remains pending.`,
  })
}

export function flagVerificationDiscrepancy(instrumentId, note, userOverride) {
  const user = userOverride ?? getCurrentUser()
  return decide({
    instrumentId,
    note,
    action: 'verification.decision',
    user,
    mutate: (target) => {
      target.verificationStatus = 'discrepancy'
    },
    summary: () => `A discrepancy was recorded during verification of ${instrumentId}.`,
  })
}

export function recordIndependentConfirmation(instrumentId, note, userOverride) {
  const state = demoStore.getState()
  const user = userOverride ?? getCurrentUser()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.' }
  if (!can(user.role, PERMISSIONS.EVIDENCE_CONFIRM)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot record independent confirmations. Required: verification reviewer or administrator.`,
    }
  }
  if (!note.trim()) return { ok: false, reason: 'Record the basis for the simulated confirmation.' }
  if (['released', 'rejected'].includes(instrument.lifecycleStatus)) {
    return { ok: false, reason: 'Verification is closed for this instrument.' }
  }
  const records = getEvidenceForInstrument(state, instrumentId)
  if (!records.length) return { ok: false, reason: 'No evidence fields exist for this instrument.' }
  if (records.some((record) => record.status === 'missing')) {
    return {
      ok: false,
      reason:
        'A missing required field prevents full confirmation. Obtain the missing evidence or record a field-level discrepancy.',
    }
  }

  const now = todayISO()
  let newStatus = instrument.verificationStatus
  demoStore.update((draft) => {
    const target = draft.instruments.find((item) => item.id === instrumentId)
    const targetEvidence = draft.evidence.filter((item) => item.instrumentId === instrumentId)
    targetEvidence.forEach((record) => {
      const previous = record.status
      record.status = 'independently_confirmed'
      record.confirmationMode = 'demo'
      record.followUp = false
      record.lastUpdated = now
      record.validationMethod = 'Demo confirmation recorded by an authorized reviewer'
      record.reviewerNotes = [record.reviewerNotes, note.trim()].filter(Boolean).join(' · ')
      appendAuditEvent(draft, {
        action: 'evidence.confirmed',
        entityType: 'evidence',
        entityId: record.id,
        summary: `Demo verification recorded for ${record.fieldLabel} on ${instrumentId}. No external bank connection was used.`,
        previousState: previous,
        newState: 'independently_confirmed',
        reason: note.trim(),
        outcome: 'success',
        role: user.role,
        actor: user,
      })
    })
    target.verificationStatus = verificationStatusFromCoverage(
      targetEvidence,
      target.verificationStatus,
    )
    newStatus = target.verificationStatus
    target.updatedAt = now
    appendAuditEvent(draft, {
      action: 'verification.decision',
      entityType: 'instrument',
      entityId: instrumentId,
      summary: `Simulated independent confirmation recorded for ${instrumentId}. Verification status set to ${newStatus}.`,
      previousState: instrument.verificationStatus,
      newState: newStatus,
      reason: note.trim(),
      outcome: 'success',
      role: user.role,
      actor: user,
    })
  })
  return {
    ok: true,
    verificationStatus: newStatus,
    demo: true,
    message:
      newStatus === 'confirmed'
        ? 'All evidence fields carry a demo confirmation. This is simulated, not a bank response.'
        : 'Only partial confirmation coverage was recorded. The instrument remains partially confirmed.',
  }
}

export function returnInstrumentToInstitution(instrumentId, note, userOverride) {
  const user = userOverride ?? getCurrentUser()
  if (!can(user.role, PERMISSIONS.LIFECYCLE_REVIEW)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot return instruments. Required: verification reviewer or administrator.`,
    }
  }
  if (!note.trim()) return { ok: false, reason: 'A reason is required when returning an instrument.' }
  const result = performTransition({
    instrumentId,
    to: 'returned',
    reason: note.trim(),
    user,
  })
  if (result.ok) {
    const state = demoStore.getState()
    const instrument = state.instruments.find((item) => item.id === instrumentId)
    addNotification({
      type: 'correction',
      severity: 'warning',
      title: `Correction requested — ${instrumentId}`,
      message: `The instrument was returned to ${instrument?.institutionName ?? 'the institution'} with a reviewer reason.`,
      instrumentId,
      href: `/instruments/${instrumentId}`,
      actionLabel: 'Open instrument',
    })
  }
  return result
}

export function recommendVerificationApproval(instrumentId, note, userOverride) {
  const user = userOverride ?? getCurrentUser()
  if (!can(user.role, PERMISSIONS.LIFECYCLE_REVIEW)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot recommend verification approval.`,
    }
  }
  if (!note.trim()) return { ok: false, reason: 'A reason is required to recommend approval.' }
  return performTransition({
    instrumentId,
    to: 'verified',
    reason: note.trim(),
    user,
  })
}

export function rejectVerification(instrumentId, note, userOverride) {
  const user = userOverride ?? getCurrentUser()
  if (!note.trim()) return { ok: false, reason: 'A rejection reason is required.' }
  const state = demoStore.getState()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.' }
  if (!['verification_pending', 'scrutiny'].includes(instrument.lifecycleStatus)) {
    return {
      ok: false,
      reason: 'A verification attempt can only be rejected while the instrument is in scrutiny or verification pending.',
    }
  }
  return performTransition({
    instrumentId,
    to: 'discrepancy',
    reason: note.trim(),
    user,
  })
}
