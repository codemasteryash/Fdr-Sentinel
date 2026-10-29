import { differenceInCalendarDays, parseISO } from 'date-fns'
import { referenceMatch } from '../utils/normalization'
import { parseAmount, REFERENCE_PATTERN } from '../utils/validation'
import { formatCurrency, formatDate, todayISO } from '../utils/format'
import { demoStore } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { LIFECYCLE_LABELS } from '../data/statuses'

/**
 * Deterministic, explainable rules. Every finding states the rule, the fields
 * compared, and the recommended next step. No external AI service is involved.
 */
const REQUIRED_FIELDS = [
  ['reference', 'FDR reference'],
  ['bank', 'Bank'],
  ['institutionId', 'Institution'],
  ['amount', 'Principal amount'],
  ['issueDate', 'Issue date'],
  ['maturityDate', 'Maturity date'],
  ['beneficiary', 'Beneficiary'],
  ['holder', 'Instrument holder'],
]

const DUPLICATE_FAMILY = ['potential_duplicate', 'cross_institution_conflict']

export function findingKey(finding) {
  const family = DUPLICATE_FAMILY.includes(finding.category) ? 'duplicate' : finding.category
  return `${finding.instrumentId}|${family}|${finding.relatedInstrumentId ?? 'self'}`
}

export function deriveIntegrityStatus(findings, instrumentId) {
  const active = findings.filter(
    (finding) =>
      finding.instrumentId === instrumentId &&
      ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
  )
  if (active.some((finding) => ['critical', 'high'].includes(finding.severity))) return 'conflict'
  if (active.some((finding) => finding.severity === 'medium')) return 'attention'
  return 'clear'
}

function daysBetween(a, b) {
  if (!a || !b) return null
  const left = parseISO(a)
  const right = parseISO(b)
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return null
  return differenceInCalendarDays(left, right)
}

export function evaluateInstrument(instrument, allInstruments, thresholds = {}) {
  const findings = []
  const fuzzyThreshold = thresholds.fuzzySimilarity ?? 82
  const variancePercent = thresholds.amountVariancePercent ?? 1
  const varianceAbsolute = thresholds.amountVarianceAbsolute ?? 1000

  const push = (finding) => findings.push({ ...finding, instrumentId: instrument.id })

  const missing = REQUIRED_FIELDS.filter(([key]) => {
    const value = instrument[key]
    if (key === 'amount') return !Number.isFinite(parseAmount(value))
    return value === null || value === undefined || String(value).trim() === ''
  })

  if (missing.length) {
    push({
      category: 'missing_information',
      severity: missing.some(([key]) => ['reference', 'amount', 'institutionId'].includes(key))
        ? 'high'
        : 'medium',
      confidence: 100,
      matchType: 'required_field',
      title: `Missing required ${missing.length === 1 ? 'field' : 'fields'}: ${missing
        .map(([, label]) => label)
        .join(', ')}`,
      explanation: `${instrument.id} cannot complete verification because ${missing
        .map(([, label]) => label.toLowerCase())
        .join(', ')} ${missing.length === 1 ? 'is' : 'are'} empty.`,
      matchedFields: [],
      differingFields: missing.map(([key]) => key),
      rule: 'REQ-01 · Required field presence',
      recommendedAction: 'Request the missing values with document evidence, then update the record.',
      evidenceMissing: missing.map(([, label]) => label),
      relatedInstrumentId: null,
    })
  }

  if (instrument.reference && !REFERENCE_PATTERN.test(instrument.reference.trim())) {
    push({
      category: 'invalid_reference',
      severity: 'high',
      confidence: 100,
      matchType: 'format_check',
      title: 'FDR reference does not match the expected format',
      explanation: `The submitted reference "${instrument.reference}" does not follow the configured pattern (2–5 letters, optional separator, 5–12 alphanumeric characters).`,
      matchedFields: [],
      differingFields: ['reference'],
      rule: 'FMT-01 · Reference format',
      recommendedAction: 'Confirm the reference against the source instrument and correct it if needed.',
      evidenceMissing: [],
      relatedInstrumentId: null,
    })
  }

  const amount = parseAmount(instrument.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    push({
      category: 'amount_discrepancy',
      severity: 'high',
      confidence: 100,
      matchType: 'format_check',
      title: 'Principal amount is not a valid positive value',
      explanation: `The principal amount "${instrument.amount}" cannot be interpreted as a positive currency value.`,
      matchedFields: [],
      differingFields: ['amount'],
      rule: 'AMT-01 · Positive principal amount',
      recommendedAction: 'Obtain the correct principal amount and supporting bank evidence.',
      evidenceMissing: ['Valid principal amount'],
      relatedInstrumentId: null,
    })
  }

  if (instrument.issueDate && instrument.maturityDate) {
    const span = daysBetween(instrument.maturityDate, instrument.issueDate)
    if (span !== null && span <= 0) {
      push({
        category: 'date_inconsistency',
        severity: 'critical',
        confidence: 100,
        matchType: 'date_comparison',
        title: 'Maturity date does not fall after the issue date',
        explanation: `Issue date ${formatDate(instrument.issueDate)} and maturity date ${formatDate(
          instrument.maturityDate,
        )} produce a non-positive instrument term.`,
        matchedFields: [],
        differingFields: ['issueDate', 'maturityDate'],
        rule: 'DATE-01 · Chronological validity',
        recommendedAction: 'Correct the date pair after checking the source document.',
        evidenceMissing: [],
        relatedInstrumentId: null,
      })
    }
  }

  const extracted = instrument.extracted
  if (extracted) {
    if (extracted.reference && instrument.reference) {
      const match = referenceMatch(instrument.reference, extracted.reference)
      if (match.level === 'ocr_variant') {
        push({
          category: 'ocr_ambiguity',
          severity: 'medium',
          confidence: match.score,
          matchType: 'ocr_variant',
          title: 'OCR ambiguity between submitted and extracted reference',
          explanation: `Submitted "${instrument.reference}" and extracted "${extracted.reference}" align only after mapping confusable characters (${match.explanation}) OCR extraction is not authentication.`,
          matchedFields: ['reference (OCR-normalized)'],
          differingFields: ['reference (raw submitted vs raw extracted)'],
          rule: 'OCR-01 · Confusable character mapping',
          recommendedAction:
            'Inspect the reference block at high resolution and obtain independent confirmation before promoting the extracted value.',
          evidenceMissing: ['Independent reference confirmation'],
          relatedInstrumentId: null,
        })
      } else if (match.level !== 'exact' && match.level !== 'strong_normalized') {
        push({
          category: 'extraction_mismatch',
          severity: 'high',
          confidence: 92,
          matchType: match.level,
          title: 'Submitted reference differs from the extracted reference',
          explanation: `Submitted "${instrument.reference}" and extracted "${extracted.reference}" remain different after normalization. The discrepancy is not an OCR confusable-character match.`,
          matchedFields: [],
          differingFields: ['reference'],
          rule: 'EXTR-02 · Submitted vs extracted identifier',
          recommendedAction: 'Verify the reference manually against the attached document.',
          evidenceMissing: ['Manual reference confirmation'],
          relatedInstrumentId: null,
        })
      }
    }

    if (extracted.amount !== undefined && extracted.amount !== null && extracted.amount !== '') {
      const extractedAmount = parseAmount(extracted.amount)
      if (
        Number.isFinite(amount) &&
        Number.isFinite(extractedAmount) &&
        extractedAmount !== amount
      ) {
        const difference = Math.abs(extractedAmount - amount)
        const base = Math.max(amount, 1)
        const percent = (difference / base) * 100
        const material = difference >= varianceAbsolute && percent >= variancePercent
        if (material) {
          push({
            category: 'amount_discrepancy',
            severity: 'high',
            confidence: 91,
            matchType: 'field_comparison',
            title: `Material amount variance of ${formatCurrency(difference)}`,
            explanation: `The submitted principal ${formatCurrency(
              amount,
            )} differs from the extracted principal ${formatCurrency(
              extractedAmount,
            )} by ${percent.toFixed(2)}%, which exceeds the configured materiality threshold.`,
            matchedFields: ['reference', 'issueDate', 'maturityDate'],
            differingFields: ['amount'],
            rule: 'AMT-03 · Material amount variance',
            recommendedAction:
              'Request bank-issued amount evidence and resolve the variance before verification completes.',
            evidenceMissing: ['Bank-issued amount confirmation'],
            relatedInstrumentId: null,
          })
        }
      }
    }

    if (extracted.maturityDate && instrument.maturityDate) {
      const diff = daysBetween(extracted.maturityDate, instrument.maturityDate)
      if (diff !== null && Math.abs(diff) > 0) {
        push({
          category: 'date_inconsistency',
          severity: 'high',
          confidence: 87,
          matchType: 'field_comparison',
          title: 'Maturity date differs between submission and extraction',
          explanation: `Submitted maturity ${formatDate(
            instrument.maturityDate,
          )} differs from extracted maturity ${formatDate(extracted.maturityDate)} by ${Math.abs(
            diff,
          )} day${Math.abs(diff) === 1 ? '' : 's'}.`,
          matchedFields: ['reference', 'amount'],
          differingFields: ['maturityDate'],
          rule: 'DATE-02 · Maturity date variance',
          recommendedAction: 'Inspect the maturity block and record the confirmed value.',
          evidenceMissing: ['Clear maturity date field block'],
          relatedInstrumentId: null,
        })
      }
    }

    if (
      extracted.beneficiary &&
      instrument.beneficiary &&
      extracted.beneficiary.trim() !== instrument.beneficiary.trim()
    ) {
      push({
        category: 'extraction_mismatch',
        severity: 'medium',
        confidence: 80,
        matchType: 'field_comparison',
        title: 'Beneficiary differs between submission and extraction',
        explanation: `The submitted beneficiary and the extracted beneficiary are not identical.`,
        matchedFields: ['reference'],
        differingFields: ['beneficiary'],
        rule: 'EXTR-03 · Beneficiary comparison',
        recommendedAction: 'Confirm the beneficiary against the source document.',
        evidenceMissing: ['Beneficiary confirmation'],
        relatedInstrumentId: null,
      })
    }
  }

  const activeOthers = allInstruments.filter(
    (other) =>
      other.id !== instrument.id &&
      !['released', 'rejected', 'replaced'].includes(other.lifecycleStatus),
  )

  activeOthers.forEach((other) => {
    if (!instrument.reference || !other.reference) return
    const match = referenceMatch(instrument.reference, other.reference)
    if (match.level === 'none') return
    const sameInstitution = other.institutionId === instrument.institutionId
    const sameBank = other.bank === instrument.bank
    const sameAmount = parseAmount(other.amount) === parseAmount(instrument.amount)
    const sameMaturity = other.maturityDate === instrument.maturityDate

    if (match.level === 'exact' || match.level === 'strong_normalized') {
      const differingFields = []
      const matchedFields = ['reference']
      if (sameBank) matchedFields.push('bank')
      if (sameMaturity) matchedFields.push('maturityDate')
      if (sameInstitution) matchedFields.push('institutionId')
      if (!sameBank) differingFields.push('bank')
      if (!sameAmount) differingFields.push('amount')
      if (!sameMaturity) differingFields.push('maturityDate')
      if (!sameInstitution) differingFields.push('institutionId')
      if (other.branch !== instrument.branch) differingFields.push('branch')
      const crossInstitution = !sameInstitution
      push({
        category: crossInstitution ? 'cross_institution_conflict' : 'potential_duplicate',
        severity: crossInstitution ? 'critical' : sameAmount ? 'medium' : 'high',
        confidence: match.score,
        matchType: match.level,
        title: crossInstitution
          ? `Cross-institution reference conflict with ${other.id}`
          : `Possible duplicate reference within ${instrument.institutionName}`,
        explanation: `${match.explanation} ${instrument.id} (${instrument.institutionName}, ${formatCurrency(
          instrument.amount,
        )}) and ${other.id} (${other.institutionName}, ${formatCurrency(
          other.amount,
        )}) share reference ${instrument.reference} / ${other.reference}. ${
          differingFields.length
            ? `Fields that differ: ${differingFields.join(', ')}.`
            : 'No differing fields were detected in the compared set.'
        } This is a potential conflict requiring review, not proof of fraud.`,
        matchedFields,
        differingFields,
        rule: crossInstitution
          ? 'XREF-01 · Cross-institution identifier reuse'
          : 'DUP-02 · Strong normalized reference reuse',
        recommendedAction:
          'Compare original bank advices for both records and record a reviewer decision. Do not release either instrument until the conflict is resolved.',
        evidenceMissing: ['Original bank advice for both records'],
        relatedInstrumentId: other.id,
      })
      return
    }

    if (match.level === 'ocr_variant') {
      push({
        category: 'ocr_ambiguity',
        severity: 'medium',
        confidence: match.score,
        matchType: 'ocr_variant',
        title: `Possible OCR-related reference match with ${other.id}`,
        explanation: `${instrument.reference} and ${other.reference} align only after OCR normalization. ${match.explanation} The records should not be merged based on this signal.`,
        matchedFields: ['reference (OCR-normalized)'],
        differingFields: ['reference (raw)'],
        rule: 'OCR-02 · OCR-normalized cross-record comparison',
        recommendedAction:
          'Compare the raw document images and confirm the reference with the issuing bank before concluding anything.',
        evidenceMissing: ['Raw reference confirmation for both records'],
        relatedInstrumentId: other.id,
      })
      return
    }

    if (match.level === 'fuzzy') {
      const contextMatch = sameBank && (sameAmount || sameInstitution)
      if (!contextMatch || match.score < fuzzyThreshold) return
      push({
        category: 'potential_duplicate',
        severity: 'medium',
        confidence: match.score,
        matchType: 'fuzzy',
        title: `Partial reference similarity with ${other.id}`,
        explanation: `${instrument.reference} and ${other.reference} are ${match.score}% similar after normalization. ${
          sameAmount ? 'The principal amounts match. ' : ''
        }${
          sameBank ? 'The issuing bank matches. ' : ''
        }Similarity alone is not evidence of duplication; this finding requires human review.`,
        matchedFields: [
          'bank',
          ...(sameAmount ? ['amount'] : []),
          ...(sameInstitution ? ['institutionId'] : []),
        ],
        differingFields: ['reference', 'issueDate', 'maturityDate'],
        rule: 'DUP-04 · Partial similarity, review required',
        recommendedAction:
          'Do not merge or invalidate either record. Compare both bank advices and record a review decision.',
        evidenceMissing: ['Bank advice for both records'],
        relatedInstrumentId: other.id,
      })
    }
  })

  if (instrument.lifecycleStatus === 'release_review' && !instrument.approval?.approved) {
    push({
      category: 'lifecycle_policy_violation',
      severity: 'high',
      confidence: 100,
      matchType: 'policy_check',
      title: 'Release under review without recorded approval',
      explanation:
        'Policy REL-03 requires a recorded approving-authority sign-off before an instrument can be released. The approval prerequisite is not satisfied.',
      matchedFields: [],
      differingFields: ['approval'],
      rule: 'REL-03 · Release requires approving authority',
      recommendedAction:
        'Record the simulated approval or return the request with a reason. The lifecycle engine will block release until the prerequisite is met.',
      evidenceMissing: ['Approving authority decision'],
      relatedInstrumentId: null,
    })
  }

  if (
    ['release_requested', 'release_review'].includes(instrument.lifecycleStatus) &&
    instrument.verificationStatus !== 'confirmed'
  ) {
    push({
      category: 'lifecycle_policy_violation',
      severity: 'high',
      confidence: 100,
      matchType: 'policy_check',
      title: 'Release requested before verification confirmation',
      explanation: `The instrument is in ${LIFECYCLE_LABELS[instrument.lifecycleStatus]} but verification status is "${instrument.verificationStatus}". Release requires confirmed verification.`,
      matchedFields: [],
      differingFields: ['verificationStatus'],
      rule: 'REL-02 · Release requires confirmed verification',
      recommendedAction: 'Complete verification before continuing the release workflow.',
      evidenceMissing: ['Verification confirmation'],
      relatedInstrumentId: null,
    })
  }

  if (instrument.verificationStatus === 'unverified') {
    const age = daysBetween(todayISO(), instrument.createdAt)
    if (age !== null && age > 5) {
      push({
        category: 'unverified_instrument',
        severity: 'low',
        confidence: 100,
        matchType: 'status_check',
        title: 'No verification activity beyond submission',
        explanation: `The record has been available for ${age} days without internal verification activity.`,
        matchedFields: [],
        differingFields: [],
        rule: 'VER-01 · Verification inactivity',
        recommendedAction: 'Assign the case and complete the internal verification checklist.',
        evidenceMissing: ['Internal checks'],
        relatedInstrumentId: null,
      })
    }
  }

  return findings
}

function nextFindingNumber(findings) {
  let max = 0
  findings.forEach((finding) => {
    const match = String(finding.id).match(/-(\d+)$/)
    if (match) max = Math.max(max, Number(match[1]))
  })
  return max + 1
}

export function runIntegrityAnalysis(instrumentId) {
  const state = demoStore.getState()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  if (!instrument) return { ok: false, reason: 'Instrument not found.', created: [], candidates: [] }

  const candidates = evaluateInstrument(
    instrument,
    state.instruments,
    state.settings.thresholds,
  )
  const activeKeys = new Set(
    state.findings
      .filter((finding) => ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus))
      .map(findingKey),
  )
  const fresh = candidates.filter((candidate) => !activeKeys.has(findingKey(candidate)))
  const year = new Date().getFullYear()
  let number = nextFindingNumber(state.findings)
  const now = todayISO()
  const created = fresh.map((candidate) => {
    const id = `FND-${year}-${String(number).padStart(3, '0')}`
    number += 1
    return {
      ...candidate,
      id,
      reviewStatus: 'open',
      decision: null,
      reviewerNotes: '',
      reviewedAt: null,
      reviewedBy: null,
      createdAt: now,
    }
  })

  demoStore.update((draft) => {
    const target = draft.instruments.find((item) => item.id === instrumentId)
    draft.findings.push(...created)
    target.integrityStatus = deriveIntegrityStatus(draft.findings, instrumentId)
    target.updatedAt = now
    appendAuditEvent(draft, {
      action: 'integrity.analysis_run',
      entityType: 'instrument',
      entityId: instrumentId,
      summary: `Integrity analysis completed for ${instrumentId}: ${candidates.length} rule matches, ${created.length} new finding(s).`,
      previousState: instrument.integrityStatus,
      newState: target.integrityStatus,
      reason: 'Deterministic rule evaluation with configured thresholds.',
      outcome: 'success',
    })
    created.forEach((finding) => {
      appendAuditEvent(draft, {
        actor: { id: 'system-engine', name: 'FDR Sentinel Integrity Engine', role: 'system' },
        action: 'finding.created',
        entityType: 'finding',
        entityId: finding.id,
        summary: `${finding.id} created for ${instrumentId}: ${finding.title}.`,
        previousState: null,
        newState: 'open',
        reason: finding.rule,
        outcome: 'success',
      })
    })
  })

  return { ok: true, instrumentId, candidates, created }
}
