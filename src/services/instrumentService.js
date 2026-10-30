import { addDays, formatISO } from 'date-fns'
import { can, PERMISSIONS } from '../data/users'
import { demoStore, getCurrentUser } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { addNotification } from './notificationService'
import { buildSeedEvidence } from '../data/evidence'
import { deriveIntegrityStatus } from './integrityEngine'
import { normalizationProfile } from '../utils/normalization'
import { saveDocument } from './fileService'
import { formatCurrency, formatDate, todayISO } from '../utils/format'
import {
  parseAmount,
  validateAmount,
  validateDate,
  validateDateOrder,
  validateFile,
  validateReference,
} from '../utils/validation'

function nextInstrumentNumber(instruments) {
  let max = 0
  instruments.forEach((instrument) => {
    const match = String(instrument.id).match(/-(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  })
  return max + 1
}

function reviewerWorkload(instruments, reviewerId) {
  return instruments.filter(
    (instrument) =>
      instrument.reviewerId === reviewerId &&
      !['released', 'rejected', 'replaced'].includes(instrument.lifecycleStatus),
  ).length
}

function pickReviewer(instruments) {
  const rev1 = reviewerWorkload(instruments, 'u-rev1')
  const rev2 = reviewerWorkload(instruments, 'u-rev2')
  return rev1 <= rev2 ? 'u-rev1' : 'u-rev2'
}

export function validateInstrumentForm(form) {
  const errors = {}
  if (!form.institutionId) errors.institutionId = 'Select an institution.'
  if (!form.bank?.trim()) errors.bank = 'Bank name is required.'
  if (!form.branch?.trim()) errors.branch = 'Branch is required.'
  const referenceError = validateReference(form.reference)
  if (referenceError) errors.reference = referenceError
  const amountError = validateAmount(form.amount)
  if (amountError) errors.amount = amountError
  const issueError = validateDate(form.issueDate, 'Issue date')
  if (issueError) errors.issueDate = issueError
  const maturityError = validateDate(form.maturityDate, 'Maturity date')
  if (maturityError) errors.maturityDate = maturityError
  if (!errors.issueDate && !errors.maturityDate) {
    const orderError = validateDateOrder(form.issueDate, form.maturityDate)
    if (orderError) errors.maturityDate = orderError
  }
  if (!form.beneficiary?.trim()) errors.beneficiary = 'Beneficiary is required.'
  if (!form.holder?.trim()) errors.holder = 'Instrument holder is required.'
  if (!form.purpose?.trim()) errors.purpose = 'Select or enter the deposit purpose.'
  if (form.file !== undefined) {
    const fileError = validateFile(form.file)
    if (fileError) errors.file = fileError
  }
  return errors
}

export async function createInstrument(form) {
  const state = demoStore.getState()
  const user = getCurrentUser()
  if (!can(user.role, PERMISSIONS.INSTRUMENT_CREATE)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot register instruments. Required: institution officer or administrator.`,
    }
  }
  if (user.role === 'officer' && user.institutionId !== form.institutionId) {
    return {
      ok: false,
      reason: 'Institution officers may only register instruments for their assigned institution.',
    }
  }
  const errors = validateInstrumentForm(form)
  if (!form.file) errors.file = 'Attach a supporting document.'
  if (Object.keys(errors).length) {
    return { ok: false, errors, reason: 'Please correct the highlighted fields.' }
  }
  const institution = state.institutions.find((item) => item.id === form.institutionId)
  if (!institution) return { ok: false, reason: 'Selected institution does not exist.' }

  const year = new Date().getFullYear()
  const number = nextInstrumentNumber(state.instruments)
  const id = `FDR-${year}-${String(number).padStart(3, '0')}`
  const now = todayISO()
  const amount = parseAmount(form.amount)
  const documentId = `doc-${id}`
  let storageWarning = null
  if (form.file) {
    const saved = await saveDocument(documentId, form.file)
    storageWarning = saved.warning ?? null
  }

  const instrument = {
    id,
    reference: form.reference.trim().toUpperCase(),
    institutionId: institution.id,
    institutionName: institution.name,
    bank: form.bank.trim(),
    branch: form.branch.trim(),
    amount,
    issueDate: form.issueDate,
    maturityDate: form.maturityDate,
    beneficiary: form.beneficiary.trim(),
    holder: form.holder.trim(),
    purpose: form.purpose,
    lifecycleStatus: 'submitted',
    verificationStatus: 'unverified',
    integrityStatus: 'unanalyzed',
    reviewerId: pickReviewer(state.instruments),
    submittedById: user.id,
    submittedBy: user.name,
    createdAt: now,
    updatedAt: now,
    extractionStatus: 'pending',
    extracted: null,
    document: {
      id: documentId,
      name: form.file?.name ?? `${form.reference.trim()}_submission.pdf`,
      type: form.file?.type ?? 'application/pdf',
      size: form.file?.size ?? 0,
      source: 'uploaded',
    },
    approval: { required: false, approved: false },
    notes:
      'Registered through the prototype. All values are institution-entered; OCR extraction has not been simulated for this submission.',
    tags: ['new'],
  }

  const evidence = buildSeedEvidence([instrument])
  demoStore.update((draft) => {
    draft.instruments.push(instrument)
    draft.evidence.push(...evidence)
    appendAuditEvent(draft, {
      action: 'instrument.created',
      entityType: 'instrument',
      entityId: id,
      summary: `${id} registered for ${institution.name} with reference ${instrument.reference} and principal ${formatCurrency(amount)}.`,
      previousState: null,
      newState: 'submitted',
      reason: 'Instrument submitted through the institutional registry.',
      outcome: 'success',
      role: user.role,
      actor: user,
    })
    if (form.file) {
      appendAuditEvent(draft, {
        action: 'document.uploaded',
        entityType: 'instrument',
        entityId: id,
        summary: `Document ${form.file.name} stored in local browser document storage for ${id}.`,
        previousState: null,
        newState: 'document_attached',
        reason: 'Submitted with the instrument registration.',
        outcome: 'success',
        role: user.role,
        actor: user,
      })
    }
  })

  addNotification({
    type: 'verification',
    severity: 'info',
    title: `New instrument submitted — ${id}`,
    message: `${institution.name} registered ${instrument.reference}. Internal checks have not yet started.`,
    instrumentId: id,
    href: `/app/instruments/${id}`,
    actionLabel: 'Open instrument',
  })

  return { ok: true, id, storageWarning }
}

const EDITABLE_FIELDS = [
  'reference',
  'bank',
  'branch',
  'amount',
  'issueDate',
  'maturityDate',
  'beneficiary',
  'holder',
  'purpose',
]

const RESOLVABLE_CATEGORIES = [
  'amount_discrepancy',
  'date_inconsistency',
  'missing_information',
  'extraction_mismatch',
  'invalid_reference',
]

export function updateInstrumentMetadata(instrumentId, patch, reason, userOverride) {
  const state = demoStore.getState()
  const user = userOverride ?? getCurrentUser()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.' }
  if (['released', 'rejected'].includes(instrument.lifecycleStatus)) {
    return { ok: false, reason: 'Closed instruments cannot be edited.' }
  }
  const isReviewer = can(user.role, PERMISSIONS.FINDING_REVIEW)
  const isOfficer = user.role === 'officer' && user.institutionId === instrument.institutionId
  if (!isReviewer && !isOfficer) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot edit this record. Institution officers may edit their own institution's submitted or returned instruments.`,
    }
  }
  if (isOfficer && !['submitted', 'returned', 'renewal_due'].includes(instrument.lifecycleStatus)) {
    return {
      ok: false,
      reason:
        'Institution officers can only edit records that are submitted, returned for correction, or in a renewal window.',
    }
  }
  if (!reason.trim()) return { ok: false, reason: 'A reason is required for every correction.' }

  const changes = {}
  EDITABLE_FIELDS.forEach((field) => {
    if (patch[field] === undefined) return
    const nextValue = field === 'amount' ? parseAmount(patch[field]) : String(patch[field]).trim()
    const currentValue = instrument[field]
    if (nextValue !== currentValue) changes[field] = nextValue
  })
  if (!Object.keys(changes).length) {
    return { ok: false, reason: 'No metadata values were changed.' }
  }

  if (changes.reference) {
    const error = validateReference(changes.reference)
    if (error) return { ok: false, reason: error }
  }
  if (changes.amount !== undefined) {
    const error = validateAmount(changes.amount)
    if (error) return { ok: false, reason: error }
  }
  if (changes.issueDate || changes.maturityDate) {
    const issue = changes.issueDate ?? instrument.issueDate
    const maturity = changes.maturityDate ?? instrument.maturityDate
    const issueError = validateDate(issue, 'Issue date')
    const maturityError = validateDate(maturity, 'Maturity date')
    if (issueError || maturityError) return { ok: false, reason: issueError ?? maturityError }
    const orderError = validateDateOrder(issue, maturity)
    if (orderError) return { ok: false, reason: orderError }
  }
  if (changes.reference) changes.reference = changes.reference.toUpperCase()

  const now = todayISO()
  const changedFields = Object.keys(changes)
  const resolvedFindings = []
  demoStore.update((draft) => {
    const target = draft.instruments.find((item) => item.id === instrumentId)
    Object.assign(target, changes)
    target.updatedAt = now
    target.notes = `${target.notes ? `${target.notes} ` : ''}Corrected ${changedFields.join(
      ', ',
    )} — ${reason.trim()}`

    changedFields.forEach((field) => {
      const evidence = draft.evidence.find(
        (item) => item.instrumentId === instrumentId && item.field === field,
      )
      if (!evidence) return
      const previous = evidence.status
      evidence.submittedValue = changes[field]
      if (field === 'reference') {
        evidence.normalizedValue = changes[field] ? normalizationProfile(changes[field]) : null
      }
      if (evidence.status !== 'missing') evidence.status = 'institution_submitted'
      evidence.confirmationMode = null
      evidence.followUp = true
      evidence.lastUpdated = now
      evidence.validationMethod = 'Corrected value awaiting re-verification'
      evidence.reviewerNotes = [evidence.reviewerNotes, `Correction: ${reason.trim()}`]
        .filter(Boolean)
        .join(' · ')
      appendAuditEvent(draft, {
        action: 'evidence.updated',
        entityType: 'evidence',
        entityId: evidence.id,
        summary: `${evidence.fieldLabel} evidence on ${instrumentId} updated after a correction.`,
        previousState: previous,
        newState: evidence.status,
        reason: reason.trim(),
        outcome: 'success',
        role: user.role,
        actor: user,
      })
    })

    draft.findings.forEach((finding) => {
      if (
        finding.instrumentId !== instrumentId ||
        !['open', 'in_review', 'confirmed'].includes(finding.reviewStatus) ||
        !RESOLVABLE_CATEGORIES.includes(finding.category)
      ) {
        return
      }
      const intersects = (finding.differingFields ?? []).some((field) => changedFields.includes(field))
      if (!intersects) return
      finding.reviewStatus = 'resolved'
      finding.decision = 'resolved_after_correction'
      finding.reviewedAt = now
      finding.reviewedBy = user.id
      finding.reviewerNotes = [finding.reviewerNotes, `Resolved after correction: ${reason.trim()}`]
        .filter(Boolean)
        .join(' · ')
      resolvedFindings.push(finding.id)
      appendAuditEvent(draft, {
        action: 'finding.reviewed',
        entityType: 'finding',
        entityId: finding.id,
        summary: `${finding.id} retained and marked resolved after correction of ${changedFields.join(
          ', ',
        )}.`,
        previousState: 'open',
        newState: 'resolved',
        reason: reason.trim(),
        outcome: 'success',
        role: user.role,
        actor: user,
      })
    })

    if (target.verificationStatus === 'discrepancy') {
      target.verificationStatus = 'confirmation_pending'
    }
    target.integrityStatus = deriveIntegrityStatus(draft.findings, instrumentId)
    appendAuditEvent(draft, {
      action: 'instrument.updated',
      entityType: 'instrument',
      entityId: instrumentId,
      summary: `${instrumentId} metadata corrected: ${changedFields
        .map((field) => `${field} ${formatValue(instrument[field])} → ${formatValue(changes[field])}`)
        .join('; ')}.`,
      previousState: JSON.stringify(
        Object.fromEntries(changedFields.map((field) => [field, instrument[field]])),
      ),
      newState: JSON.stringify(changes),
      reason: reason.trim(),
      outcome: 'success',
      role: user.role,
      actor: user,
    })
  })

  addNotification({
    type: 'evidence',
    severity: 'info',
    title: `Metadata corrected — ${instrumentId}`,
    message: `Correction recorded by ${user.name}. Prior findings were preserved and marked resolved where applicable.`,
    instrumentId,
    href: `/app/instruments/${instrumentId}?tab=integrity`,
    actionLabel: 'View history',
  })

  return { ok: true, changedFields, resolvedFindings }
}

function formatValue(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return formatCurrency(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value)
  return String(value)
}

export function nextMaturityFromIssue(issueDate, years = 3) {
  if (!issueDate) return ''
  return formatISO(addDays(new Date(issueDate), years * 365), { representation: 'date' })
}
