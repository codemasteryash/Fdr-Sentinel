import { normalizationProfile } from '../utils/normalization'

/**
 * Field-level provenance is generated from the instrument records so the
 * Evidence Passport and the registry can never disagree about a value.
 */
export const EVIDENCE_FIELDS = [
  { key: 'reference', label: 'FDR reference', sourceRef: 'Document p.1 · Reference block' },
  { key: 'amount', label: 'Principal amount', sourceRef: 'Document p.1 · Principal block' },
  { key: 'issueDate', label: 'Issue date', sourceRef: 'Document p.1 · Issue date block' },
  { key: 'maturityDate', label: 'Maturity date', sourceRef: 'Document p.1 · Maturity block' },
  { key: 'bank', label: 'Issuing bank', sourceRef: 'Document header · Issuing bank' },
  { key: 'beneficiary', label: 'Beneficiary', sourceRef: 'Document p.1 · Beneficiary block' },
  { key: 'holder', label: 'Instrument holder', sourceRef: 'Document p.2 · Holder declaration' },
]

const VALIDATION_METHODS = {
  institution_submitted: 'Required field presence check',
  ocr_extracted: 'Simulated OCR read · not authentication',
  internally_consistent: 'Format and internal consistency check',
  confirmation_pending: 'Awaiting independent confirmation',
  independently_confirmed: 'Demo confirmation recorded by an authorized reviewer',
  discrepancy: 'Submitted vs extracted comparison',
  reviewed: 'Reviewer reviewed corrected evidence',
  missing: 'Required field presence check',
}

const FIELD_NOTES = {
  'FDR-2026-006:reference':
    'I/1 ambiguity means the OCR value cannot be promoted without human review.',
  'FDR-2026-009:amount':
    'Amount variance of ₹50,000 between institution submission and simulated extraction.',
  'FDR-2026-014:beneficiary': 'Beneficiary is blank in both the submission and the document.',
  'FDR-2026-022:amount':
    'Material variance of ₹1,80,000. Additional evidence requested before confirmation.',
  'FDR-2026-019:maturityDate': 'One-day variance between submitted and extracted maturity dates.',
  'FDR-2026-020:holder': 'Corrected holder declaration reviewed. Prior finding retained.',
}

const FLAGGED = {
  'FDR-2026-006': { reference: { status: 'confirmation_pending', findingId: 'FND-2026-003' } },
  'FDR-2026-009': { amount: { status: 'discrepancy', findingId: 'FND-2026-004' } },
  'FDR-2026-014': { beneficiary: { status: 'missing', findingId: 'FND-2026-005' } },
  'FDR-2026-022': { amount: { status: 'discrepancy', findingId: 'FND-2026-006' } },
  'FDR-2026-019': { maturityDate: { status: 'discrepancy', findingId: 'FND-2026-007' } },
  'FDR-2026-020': { holder: { status: 'reviewed', findingId: 'FND-2026-011' } },
}

function statusFor(instrument, field) {
  if (instrument.extractionStatus === 'pending') return 'institution_submitted'
  const override = FLAGGED[instrument.id]?.[field]
  if (override) return override.status
  const vs = instrument.verificationStatus
  if (vs === 'confirmed') {
    return ['reference', 'amount', 'issueDate', 'maturityDate', 'bank'].includes(field)
      ? 'independently_confirmed'
      : 'internally_consistent'
  }
  if (vs === 'partially_confirmed') {
    if (['reference', 'amount', 'issueDate', 'maturityDate'].includes(field)) {
      return 'independently_confirmed'
    }
    return field === 'bank' ? 'internally_consistent' : 'confirmation_pending'
  }
  if (vs === 'confirmation_pending') {
    if (field === 'reference' || field === 'bank') return 'internally_consistent'
    return 'confirmation_pending'
  }
  if (vs === 'internal_passed') return 'internally_consistent'
  if (vs === 'discrepancy') {
    return ['reference', 'bank'].includes(field) ? 'internally_consistent' : 'confirmation_pending'
  }
  if (instrument.extracted) {
    return ['reference', 'amount', 'issueDate', 'maturityDate', 'beneficiary'].includes(field)
      ? 'ocr_extracted'
      : 'institution_submitted'
  }
  return 'institution_submitted'
}

function valueFor(instrument, field) {
  if (field === 'bank') return instrument.bank
  return instrument[field] ?? ''
}

function extractedFor(instrument, field) {
  if (!instrument.extracted) return ''
  if (field === 'bank') return instrument.extracted.bank ?? ''
  return instrument.extracted[field] ?? ''
}

export function buildSeedEvidence(instruments) {
  const records = []
  instruments.forEach((instrument) => {
    EVIDENCE_FIELDS.forEach((field) => {
      const status = statusFor(instrument, field.key)
      const submitted = valueFor(instrument, field.key)
      const extracted = extractedFor(instrument, field.key)
      const flagged = FLAGGED[instrument.id]?.[field.key]
      const isMissing = status === 'missing' || (!submitted && field.key !== 'beneficiary')
      const normalized =
        field.key === 'reference' && submitted ? normalizationProfile(submitted) : null
      records.push({
        id: `EV-${instrument.id.replace('FDR-', '')}-${field.key.toUpperCase()}`,
        instrumentId: instrument.id,
        field: field.key,
        fieldLabel: field.label,
        submittedValue: submitted,
        extractedValue: extracted,
        normalizedValue: normalized,
        sourceType: extracted ? 'ocr_extraction' : 'institution_submission',
        sourceRef: field.sourceRef,
        validationMethod: VALIDATION_METHODS[status],
        status: isMissing && field.key === 'beneficiary' && !submitted ? 'missing' : status,
        confirmationMode: status === 'independently_confirmed' ? 'demo' : null,
        lastUpdated: instrument.updatedAt,
        findingId: flagged?.findingId ?? null,
        reviewerNotes: FIELD_NOTES[`${instrument.id}:${field.key}`] ?? '',
        followUp: ['confirmation_pending', 'discrepancy', 'missing'].includes(status),
      })
    })
  })
  return records
}

export function evidenceCompleteness(records) {
  if (!records.length) return { complete: 0, total: 0, percent: 0, independent: 0 }
  const complete = records.filter((record) =>
    ['internally_consistent', 'independently_confirmed', 'reviewed'].includes(record.status),
  ).length
  const independent = records.filter((record) => record.status === 'independently_confirmed').length
  return {
    complete,
    total: records.length,
    percent: Math.round((complete / records.length) * 100),
    independent,
  }
}
