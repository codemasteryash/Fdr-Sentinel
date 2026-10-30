import { parseISO } from 'date-fns'
import { daysUntil, formatCurrency } from './format'
import { buildDeadlineActions } from '../services/deadlineEngine'

export function getInstrument(state, id) {
  return state.instruments.find((instrument) => instrument.id === id) ?? null
}

export function getInstitution(state, id) {
  return state.institutions.find((institution) => institution.id === id) ?? null
}

export function getInstitutionInstruments(state, institutionId) {
  return state.instruments.filter((instrument) => instrument.institutionId === institutionId)
}

export function getInstrumentFindings(state, instrumentId) {
  return state.findings.filter(
    (finding) =>
      finding.instrumentId === instrumentId || finding.relatedInstrumentId === instrumentId,
  )
}

export function getInstrumentEvidence(state, instrumentId) {
  return state.evidence.filter((record) => record.instrumentId === instrumentId)
}

export function isActiveFinding(finding) {
  return ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus)
}

export function isMaterialFinding(finding) {
  return isActiveFinding(finding) && ['critical', 'high'].includes(finding.severity)
}

export function dashboardMetrics(state) {
  const instruments = state.instruments
  const activeInstrument = (instrument) =>
    !['released', 'rejected'].includes(instrument.lifecycleStatus)
  const active = instruments.filter(activeInstrument)
  const openFindings = state.findings.filter(isActiveFinding)

  const awaitingVerification = active.filter((instrument) =>
    ['unverified', 'internal_passed', 'confirmation_pending', 'partially_confirmed'].includes(
      instrument.verificationStatus,
    ),
  ).length
  const duplicateConflicts = new Set(
    openFindings
      .filter((finding) =>
        ['potential_duplicate', 'cross_institution_conflict'].includes(finding.category),
      )
      .map((finding) => finding.instrumentId),
  ).size
  const upcomingMaturity = active.filter((instrument) => {
    const days = daysUntil(instrument.maturityDate)
    return days !== null && days >= 0 && days <= 90 && !['renewed', 'replaced'].includes(instrument.lifecycleStatus)
  }).length
  const overdueRenewal = active.filter((instrument) => {
    const days = daysUntil(instrument.maturityDate)
    return (
      days !== null &&
      days < 0 &&
      ['renewal_due', 'renewal_pending', 'verified'].includes(instrument.lifecycleStatus)
    )
  }).length
  const instrumentsWithDiscrepancies = new Set(
    openFindings
      .filter((finding) =>
        [
          'amount_discrepancy',
          'date_inconsistency',
          'ocr_ambiguity',
          'missing_information',
          'extraction_mismatch',
          'invalid_reference',
        ].includes(finding.category),
      )
      .map((finding) => finding.instrumentId),
  ).size
  const pendingRelease = active.filter((instrument) =>
    ['release_requested', 'release_review'].includes(instrument.lifecycleStatus),
  ).length

  const totalExposure = instruments.reduce((sum, instrument) => sum + Number(instrument.amount || 0), 0)
  const activeExposure = active.reduce((sum, instrument) => sum + Number(instrument.amount || 0), 0)
  const verified = active.filter(
    (instrument) => instrument.verificationStatus === 'confirmed',
  ).length
  const deadlines = buildDeadlineActions(state)

  return {
    institutions: state.institutions.length,
    activeInstitutions: state.institutions.filter((institution) => institution.status === 'active')
      .length,
    instruments: instruments.length,
    activeInstruments: active.length,
    awaitingVerification,
    duplicateConflicts,
    upcomingMaturity,
    overdueRenewal,
    instrumentsWithDiscrepancies,
    pendingRelease,
    totalExposure,
    activeExposure,
    verified,
    verifiedPercent: active.length ? Math.round((verified / active.length) * 100) : 0,
    openFindings: openFindings.length,
    criticalFindings: openFindings.filter((finding) => finding.severity === 'critical').length,
    deadlines,
    deadlineOverdue: deadlines.filter((action) => action.priority === 'overdue' && action.status !== 'completed').length,
    deadlineCritical: deadlines.filter((action) => action.priority === 'critical' && action.status !== 'completed').length,
  }
}

export function lifecycleDistribution(state) {
  const counts = new Map()
  state.instruments.forEach((instrument) => {
    counts.set(instrument.lifecycleStatus, (counts.get(instrument.lifecycleStatus) ?? 0) + 1)
  })
  return counts
}

export function verificationDistribution(state) {
  const counts = new Map()
  state.instruments.forEach((instrument) => {
    counts.set(instrument.verificationStatus, (counts.get(instrument.verificationStatus) ?? 0) + 1)
  })
  return counts
}

export function institutionMetrics(state, institution) {
  const instruments = getInstitutionInstruments(state, institution.id)
  const active = instruments.filter(
    (instrument) => !['released', 'rejected'].includes(instrument.lifecycleStatus),
  )
  const findings = state.findings.filter(
    (finding) =>
      isActiveFinding(finding) &&
      instruments.some((instrument) => instrument.id === finding.instrumentId),
  )
  const upcoming = active.filter((instrument) => {
    const days = daysUntil(instrument.maturityDate)
    return days !== null && days >= 0 && days <= 90
  }).length
  const pendingVerification = active.filter(
    (instrument) => instrument.verificationStatus !== 'confirmed',
  ).length
  const exposure = instruments.reduce((sum, instrument) => sum + Number(instrument.amount || 0), 0)
  return {
    instruments: instruments.length,
    active: active.length,
    exposure,
    pendingVerification,
    findings: findings.length,
    materialFindings: findings.filter((finding) => ['critical', 'high'].includes(finding.severity)).length,
    upcoming,
    lastUpdated: instruments
      .map((instrument) => instrument.updatedAt)
      .sort((a, b) => new Date(b) - new Date(a))[0],
  }
}

export function institutionAttentionRank(state, institution) {
  const metrics = institutionMetrics(state, institution)
  return (
    metrics.materialFindings * 3 +
    metrics.pendingVerification * 1.5 +
    metrics.upcoming * 0.5 +
    (institution.status === 'probation' ? 6 : institution.status === 'attention' ? 4 : 0)
  )
}

export function priorityQueue(state, limit = 6) {
  return buildDeadlineActions(state)
    .filter((action) => action.status !== 'completed')
    .slice(0, limit)
}

export function upcomingMaturityTimeline(state, weeks = 8) {
  const buckets = Array.from({ length: weeks }, (_, index) => {
    const start = index * 7
    return {
      label: index === 0 ? 'This week' : `+${index} wk`,
      start,
      end: start + 6,
      count: 0,
      amount: 0,
    }
  })
  state.instruments.forEach((instrument) => {
    if (['released', 'rejected', 'replaced', 'renewed'].includes(instrument.lifecycleStatus)) return
    const days = daysUntil(instrument.maturityDate)
    if (days === null || days < 0) return
    const bucket = buckets.find((item) => days >= item.start && days <= item.end)
    if (bucket) {
      bucket.count += 1
      bucket.amount += Number(instrument.amount || 0)
    }
  })
  return buckets
}

export function statusDistributionChart(state) {
  const palette = {
    submitted: '#8A948D',
    scrutiny: '#3D5C6B',
    verification_pending: '#B9873C',
    verified: '#2E6B4E',
    discrepancy: '#9E3B33',
    renewal_due: '#A85C36',
    renewal_pending: '#C08A3E',
    renewed: '#4F7B62',
    replacement_pending: '#7C9483',
    replaced: '#5C7A68',
    release_requested: '#6C7F8A',
    release_review: '#B06A45',
    released: '#2F5C46',
    rejected: '#7C4A44',
    returned: '#A06A5A',
  }
  const labels = {
    submitted: 'Submitted',
    scrutiny: 'Scrutiny',
    verification_pending: 'Verification',
    verified: 'Verified',
    discrepancy: 'Discrepancy',
    renewal_due: 'Renewal due',
    renewal_pending: 'Renewal pending',
    renewed: 'Renewed',
    replacement_pending: 'Replacement',
    replaced: 'Replaced',
    release_requested: 'Release requested',
    release_review: 'Release review',
    released: 'Released',
    rejected: 'Rejected',
    returned: 'Returned',
  }
  return state.instruments.reduce((acc, instrument) => {
    const existing = acc.find((item) => item.key === instrument.lifecycleStatus)
    if (existing) existing.value += 1
    else
      acc.push({
        key: instrument.lifecycleStatus,
        name: labels[instrument.lifecycleStatus] ?? instrument.lifecycleStatus,
        value: 1,
        color: palette[instrument.lifecycleStatus] ?? '#8A948D',
      })
    return acc
  }, [])
}

export function globalSearch(state, rawQuery) {
  const query = rawQuery.trim().toLowerCase()
  if (query.length < 2) return []
  const results = []

  const instruments = state.instruments
    .filter((instrument) =>
      [instrument.id, instrument.reference, instrument.bank, instrument.institutionName]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 5)
    .map((instrument) => ({
      id: instrument.id,
      title: instrument.id,
      subtitle: `${instrument.reference} · ${instrument.institutionName}`,
      href: `/app/instruments/${instrument.id}`,
      meta: formatCurrency(instrument.amount),
    }))
  if (instruments.length) results.push({ group: 'Instruments', items: instruments })

  const institutions = state.institutions
    .filter((institution) =>
      [institution.id, institution.name, institution.city, institution.state]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 4)
    .map((institution) => ({
      id: institution.id,
      title: institution.name,
      subtitle: `${institution.city}, ${institution.state}`,
      href: `/app/institutions/${institution.id}`,
      meta: institution.id,
    }))
  if (institutions.length) results.push({ group: 'Institutions', items: institutions })

  const banks = [...new Set(state.instruments.map((instrument) => instrument.bank))]
    .filter((bank) => bank.toLowerCase().includes(query))
    .slice(0, 3)
    .map((bank) => ({
      id: `bank-${bank}`,
      title: bank,
      subtitle: 'Bank · filter registry',
      href: `/app/instruments?bank=${encodeURIComponent(bank)}`,
      meta: 'Registry',
    }))
  if (banks.length) results.push({ group: 'Banks', items: banks })

  const findings = state.findings
    .filter((finding) =>
      [finding.id, finding.title, finding.instrumentId, finding.category]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 4)
    .map((finding) => ({
      id: finding.id,
      title: finding.id,
      subtitle: finding.title,
      href: `/app/verification?view=findings&finding=${finding.id}`,
      meta: finding.severity,
    }))
  if (findings.length) results.push({ group: 'Integrity findings', items: findings })

  const evidence = state.evidence
    .filter((record) =>
      [record.id, record.instrumentId, record.fieldLabel, record.submittedValue]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 4)
    .map((record) => ({
      id: record.id,
      title: `${record.instrumentId} · ${record.fieldLabel}`,
      subtitle: String(record.submittedValue || 'Missing value'),
      href: `/app/instruments/${record.instrumentId}?tab=evidence&field=${record.field}`,
      meta: 'Evidence',
    }))
  if (evidence.length) results.push({ group: 'Evidence fields', items: evidence })

  return results
}

export function sortInstruments(instruments, sort) {
  const sorted = [...instruments]
  const direction = sort.direction === 'desc' ? -1 : 1
  sorted.sort((a, b) => {
    const left = a[sort.key]
    const right = b[sort.key]
    if (sort.key === 'amount') return (Number(left) - Number(right)) * direction
    if (sort.key === 'maturityDate' || sort.key === 'issueDate') {
      return (parseISO(left) - parseISO(right)) * direction
    }
    return String(left ?? '').localeCompare(String(right ?? '')) * direction
  })
  return sorted
}

export function filterInstruments(state, filters) {
  const query = filters.query?.trim().toLowerCase() ?? ''
  const min = filters.minAmount ? Number(filters.minAmount) : null
  const max = filters.maxAmount ? Number(filters.maxAmount) : null
  const maturityWindow = filters.maturity
  return state.instruments.filter((instrument) => {
    if (query) {
      const haystack = [
        instrument.id,
        instrument.reference,
        instrument.institutionName,
        instrument.bank,
        instrument.branch,
        instrument.reviewerId,
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    if (filters.lifecycle && instrument.lifecycleStatus !== filters.lifecycle) return false
    if (filters.verification && instrument.verificationStatus !== filters.verification) return false
    if (filters.integrity && instrument.integrityStatus !== filters.integrity) return false
    if (filters.institution && instrument.institutionId !== filters.institution) return false
    if (filters.bank && instrument.bank !== filters.bank) return false
    if (min !== null && Number(instrument.amount) < min) return false
    if (max !== null && Number(instrument.amount) > max) return false
    if (maturityWindow) {
      const days = daysUntil(instrument.maturityDate)
      if (maturityWindow === 'overdue' && !(days < 0)) return false
      if (maturityWindow === '30' && !(days >= 0 && days <= 30)) return false
      if (maturityWindow === '60' && !(days > 30 && days <= 60)) return false
      if (maturityWindow === '90' && !(days > 60 && days <= 90)) return false
    }
    return true
  })
}
