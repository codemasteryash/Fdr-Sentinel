import { downloadCsv } from '../utils/csv'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format'
import { buildDeadlineActions } from './deadlineEngine'
import { recordAudit } from './auditService'
import { demoStore } from './demoDataService'

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

function finish(filename, rows, columns, label) {
  downloadCsv(filename, rows, columns)
  recordAudit({
    action: 'export.performed',
    entityType: 'system',
    entityId: filename,
    summary: `${label} exported locally as CSV (${rows.length} rows). No data left the browser.`,
    reason: 'User-initiated demo export.',
    outcome: 'success',
  })
}

export function exportInstruments(instruments, label = 'FDR Registry') {
  const columns = [
    { label: 'FDR ID', key: 'id' },
    { label: 'Reference', key: 'reference' },
    { label: 'Institution', key: 'institutionName' },
    { label: 'Institution ID', key: 'institutionId' },
    { label: 'Bank', key: 'bank' },
    { label: 'Branch', key: 'branch' },
    { label: 'Principal (INR)', value: (row) => row.amount },
    { label: 'Issue date', value: (row) => formatDate(row.issueDate) },
    { label: 'Maturity date', value: (row) => formatDate(row.maturityDate) },
    { label: 'Lifecycle', key: 'lifecycleStatus' },
    { label: 'Verification', key: 'verificationStatus' },
    { label: 'Integrity', key: 'integrityStatus' },
    { label: 'Reviewer', key: 'reviewerId' },
  ]
  finish(`fdr-sentinel-instruments-${stamp()}.csv`, instruments, columns, label)
}

export function exportFindings(findings) {
  const columns = [
    { label: 'Finding ID', key: 'id' },
    { label: 'Instrument', key: 'instrumentId' },
    { label: 'Related instrument', key: 'relatedInstrumentId' },
    { label: 'Category', key: 'category' },
    { label: 'Severity', key: 'severity' },
    { label: 'Confidence', key: 'confidence' },
    { label: 'Match type', key: 'matchType' },
    { label: 'Rule', key: 'rule' },
    { label: 'Review status', key: 'reviewStatus' },
    { label: 'Decision', key: 'decision' },
    { label: 'Created', value: (row) => formatDateTime(row.createdAt) },
    { label: 'Reviewed', value: (row) => (row.reviewedAt ? formatDateTime(row.reviewedAt) : '') },
    { label: 'Reviewer notes', key: 'reviewerNotes' },
  ]
  finish(`fdr-sentinel-findings-${stamp()}.csv`, findings, columns, 'Integrity findings')
}

export function exportEvidence(evidence) {
  const columns = [
    { label: 'Evidence ID', key: 'id' },
    { label: 'Instrument', key: 'instrumentId' },
    { label: 'Field', key: 'fieldLabel' },
    { label: 'Submitted value', value: (row) => (row.field === 'amount' ? row.submittedValue : row.submittedValue) },
    { label: 'Extracted value', value: (row) => (row.field === 'amount' ? row.extractedValue : row.extractedValue) },
    { label: 'Source type', key: 'sourceType' },
    { label: 'Source reference', key: 'sourceRef' },
    { label: 'Validation method', key: 'validationMethod' },
    { label: 'Status', key: 'status' },
    { label: 'Confirmation mode', key: 'confirmationMode' },
    { label: 'Finding', key: 'findingId' },
    { label: 'Last updated', value: (row) => formatDateTime(row.lastUpdated) },
    { label: 'Reviewer notes', key: 'reviewerNotes' },
  ]
  finish(`fdr-sentinel-evidence-${stamp()}.csv`, evidence, columns, 'Evidence passport fields')
}

export function exportAudit(events) {
  const columns = [
    { label: 'Event ID', key: 'id' },
    { label: 'Timestamp', value: (row) => formatDateTime(row.timestamp) },
    { label: 'Actor', key: 'actorName' },
    { label: 'Role', key: 'role' },
    { label: 'Action', key: 'action' },
    { label: 'Entity type', key: 'entityType' },
    { label: 'Entity ID', key: 'entityId' },
    { label: 'Summary', key: 'summary' },
    { label: 'Previous state', key: 'previousState' },
    { label: 'New state', key: 'newState' },
    { label: 'Reason', key: 'reason' },
    { label: 'Outcome', key: 'outcome' },
    { label: 'Previous hash', key: 'previousEventHash' },
    { label: 'Hash', key: 'hash' },
  ]
  finish(`fdr-sentinel-audit-${stamp()}.csv`, events, columns, 'Audit trail')
}

export function exportDeadlines(state, actions) {
  const columns = [
    { label: 'Action ID', key: 'id' },
    { label: 'Instrument', key: 'instrumentId' },
    { label: 'Institution', key: 'institutionName' },
    { label: 'Type', key: 'type' },
    { label: 'Priority', key: 'priority' },
    { label: 'Status', key: 'status' },
    { label: 'Due date', value: (row) => formatDate(row.dueDate) },
    { label: 'Days remaining', key: 'daysRemaining' },
    { label: 'Assignee', key: 'assignedTo' },
    { label: 'Reason', key: 'reason' },
    { label: 'Recommended action', key: 'recommendedAction' },
  ]
  finish(`fdr-sentinel-deadlines-${stamp()}.csv`, actions, columns, 'Deadline action queue')
}

export function exportInstitutions(state) {
  const columns = [
    { label: 'Institution ID', key: 'id' },
    { label: 'Name', key: 'name' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state' },
    { label: 'Category', key: 'category' },
    { label: 'Officer', key: 'officer' },
    { label: 'Status', key: 'status' },
    { label: 'Contact', key: 'contact' },
  ]
  finish(`fdr-sentinel-institutions-${stamp()}.csv`, state.institutions, columns, 'Institutions')
}

export function exportReportsInstrumentSummary(state) {
  const columns = [
    { label: 'Instrument', key: 'id' },
    { label: 'Institution', key: 'institutionName' },
    { label: 'Bank', key: 'bank' },
    { label: 'Principal (INR)', key: 'amount' },
    { label: 'Maturity', value: (row) => formatDate(row.maturityDate) },
    { label: 'Lifecycle', key: 'lifecycleStatus' },
    { label: 'Verification', key: 'verificationStatus' },
    { label: 'Integrity', key: 'integrityStatus' },
  ]
  finish(
    `fdr-sentinel-report-${stamp()}.csv`,
    state.instruments,
    columns,
    'Instrument analytics summary',
  )
}

export function exportSummaryCsv(label, rows, columns) {
  finish(`fdr-sentinel-${label}-${stamp()}.csv`, rows, columns, label)
}

export function currentDeadlineActions() {
  return buildDeadlineActions(demoStore.getState())
}

export function aggregatedInstitutionExposure(state) {
  return state.institutions
    .map((institution) => {
      const instruments = state.instruments.filter(
        (instrument) => instrument.institutionId === institution.id,
      )
      return {
        institution: institution.shortName ?? institution.name,
        exposure: instruments.reduce((sum, instrument) => sum + Number(instrument.amount || 0), 0),
        valueLabel: formatCurrency(
          instruments.reduce((sum, instrument) => sum + Number(instrument.amount || 0), 0),
        ),
      }
    })
    .sort((a, b) => b.exposure - a.exposure)
}
