import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  StickyNote,
  Flag,
  CheckCircle2,
  XCircle,
  Link2,
  AlertTriangle,
  FileSearch,
} from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '../shared/Overlay'
import { Progress, SectionHeading, EmptyState } from '../shared/ui'
import { StatusBadge, EvidenceStatusBadge } from '../shared/StatusBadge'
import { computeCoverage, updateEvidenceField } from '../../services/evidenceService'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { can, PERMISSIONS } from '../../data/users'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'

function displayValue(record) {
  if (record.submittedValue === null || record.submittedValue === undefined || record.submittedValue === '') {
    return '—'
  }
  if (record.field === 'amount') return formatCurrency(record.submittedValue)
  if (record.field === 'issueDate' || record.field === 'maturityDate') {
    return formatDate(record.submittedValue)
  }
  return String(record.submittedValue)
}

function displayExtracted(record) {
  if (record.extractedValue === null || record.extractedValue === undefined || record.extractedValue === '') {
    return '—'
  }
  if (record.field === 'amount') return formatCurrency(record.extractedValue)
  if (record.field === 'issueDate' || record.field === 'maturityDate') {
    return formatDate(record.extractedValue)
  }
  return String(record.extractedValue)
}

const TABS = [
  { id: 'all', label: 'All fields' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'confirmed', label: 'Confirmed' },
]

export function EvidencePanel({ instrument, evidence, state, highlightField = '' }) {
  const user = useCurrentUser()
  const [tab, setTab] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [action, setAction] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const coverage = computeCoverage(evidence)

  useEffect(() => {
    if (!highlightField) return
    const match = evidence.find((record) => record.field === highlightField)
    if (match) setSelectedId(match.id)
  }, [highlightField, evidence])

  const selected = evidence.find((record) => record.id === selectedId) ?? null
  const reviewer = selected?.reviewerNotes ? selected : null

  const filtered = useMemo(() => {
    if (tab === 'attention') {
      return evidence.filter(
        (record) =>
          record.followUp || ['confirmation_pending', 'discrepancy', 'missing', 'ocr_extracted', 'institution_submitted'].includes(record.status),
      )
    }
    if (tab === 'confirmed') {
      return evidence.filter((record) =>
        ['independently_confirmed', 'internally_consistent', 'reviewed'].includes(record.status),
      )
    }
    return evidence
  }, [evidence, tab])

  const canConfirm = can(user.role, PERMISSIONS.EVIDENCE_CONFIRM)
  const canReview = can(user.role, PERMISSIONS.EVIDENCE_REVIEW)

  const close = () => {
    setSelectedId(null)
    setAction('')
    setNote('')
    setError('')
  }

  const submitAction = (nextAction) => {
    if (!selected) return
    if (['note', 'demo_confirm', 'record_discrepancy'].includes(nextAction) && !note.trim()) {
      setError('A reviewer note is required for this action.')
      return
    }
    const result = updateEvidenceField({
      instrumentId: instrument.id,
      field: selected.field,
      action: nextAction,
      note,
      user,
    })
    if (!result.ok) {
      setError(result.reason)
      return
    }
    toast.success('Evidence updated', {
      description:
        nextAction === 'demo_confirm'
          ? 'A simulated confirmation was recorded. This is not a bank response or legal confirmation.'
          : 'The field-level change and actor were appended to the audit trail.',
    })
    setAction('')
    setNote('')
    setError('')
  }

  const linkedFindings = selected
    ? state.findings.filter((finding) => finding.id === selected.findingId)
    : []

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Fields tracked', `${coverage.total}`, 'Required evidence fields'],
          ['Internally consistent', `${coverage.complete}/${coverage.total}`, `${coverage.percent}% coverage`],
          ['Demo confirmed', `${coverage.confirmed}`, 'Simulated independent confirmation'],
          ['Needs attention', `${coverage.pending + coverage.missing}`, `${coverage.missing} missing`],
        ].map(([label, value, detail]) => (
          <div key={label} className="panel px-4 py-3">
            <div className="overline mb-1">{label}</div>
            <div className="font-display text-2xl leading-none text-ink">{value}</div>
            <div className="mt-1 text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <SectionHeading
            overline="Field-level provenance"
            title="Evidence Passport"
            description="Submitted, extracted, normalized, and confirmed values remain distinct. OCR output is never silently promoted over a submitted value."
          />
          <div className="flex items-center gap-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.05em] transition-colors ${
                  tab === item.id
                    ? 'border border-lineStrong bg-forest text-paper'
                    : 'border border-transparent text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Field</th>
                <th>Submitted value</th>
                <th>Extracted value</th>
                <th>Evidence status</th>
                <th>Source / method</th>
                <th>Updated</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => setSelectedId(record.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedId(record.id)
                  }}
                  tabIndex={0}
                  className={`cursor-pointer ${
                    highlightField === record.field ? 'bg-copper/[0.04]' : ''
                  } ${selectedId === record.id ? 'bg-forest/[0.03]' : ''}`}
                >
                  <td>
                    <div className="text-[11px] font-medium text-ink">{record.fieldLabel}</div>
                    <div className="font-mono text-[9px] text-muted">{record.field}</div>
                    {record.followUp && (
                      <span className="mt-1 inline-flex items-center gap-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-warning">
                        <Flag size={8} /> follow-up
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-[10.5px] text-ink">{displayValue(record)}</td>
                  <td className="font-mono text-[10.5px] text-muted">
                    {displayExtracted(record)}
                    {record.field === 'reference' && record.normalizedValue?.ocr && (
                      <div className="mt-0.5 text-[8.5px] text-muted/80">
                        norm {record.normalizedValue.ocr}
                      </div>
                    )}
                  </td>
                  <td>
                    <EvidenceStatusBadge status={record.status} />
                  </td>
                  <td>
                    <div className="text-[9.5px] text-muted">{record.sourceRef}</div>
                    <div className="mt-0.5 text-[9px] text-muted/80">{record.validationMethod}</div>
                  </td>
                  <td className="whitespace-nowrap text-[9.5px] text-muted">
                    {formatDate(record.lastUpdated)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon h-6 w-6"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedId(record.id)
                      }}
                      aria-label={`Open ${record.fieldLabel} evidence`}
                    >
                      <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState compact icon={FileSearch} title="No evidence fields in this view" message="Switch tabs to see all tracked fields." />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/30 px-4 py-2.5">
          <span className="text-[9.5px] text-muted">
            Showing {filtered.length} of {evidence.length} fields · Open a row to inspect provenance and
            act.
          </span>
          <Link to={`/app/verification/${instrument.id}`} className="btn-ghost btn-xs">
            Verification workspace <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={close}
        eyebrow={`${instrument.id} · Evidence field`}
        title={selected?.fieldLabel ?? 'Evidence'}
        subtitle={selected ? `${selected.sourceRef} · ${selected.id}` : undefined}
        footer={
          selected && (canReview || canConfirm) ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[9px] text-muted">Actions are recorded in the local audit trail.</span>
              <div className="flex flex-wrap gap-1.5">
                {canReview && (
                  <>
                    <button type="button" className="btn-secondary btn-xs" onClick={() => setAction('note')}>
                      <StickyNote size={11} /> Add note
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-xs"
                      onClick={() => submitAction(selected.followUp ? 'clear_follow_up' : 'follow_up')}
                    >
                      <Flag size={11} /> {selected.followUp ? 'Clear follow-up' : 'Follow up'}
                    </button>
                    <button type="button" className="btn-secondary btn-xs" onClick={() => setAction('record_discrepancy')}>
                      <XCircle size={11} /> Discrepancy
                    </button>
                  </>
                )}
                {canConfirm && (
                  <button
                    type="button"
                    className="btn-dark btn-xs"
                    onClick={() => setAction('demo_confirm')}
                    disabled={selected.status === 'missing'}
                  >
                    <CheckCircle2 size={11} /> Demo-confirm field
                  </button>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[9.5px] text-muted">
              {selected ? 'Your role has read-only access to evidence actions.' : ''}
            </span>
          )
        }
      >
        {selected && (
          <div className="px-5 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <EvidenceStatusBadge status={selected.status} />
              <span className="font-mono text-[9px] text-muted">
                {selected.confirmationMode ? 'DEMO CONFIRMATION' : selected.sourceType?.replaceAll('_', ' ')}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div className="border border-line bg-paper/40 px-3 py-2.5">
                <dt className="overline mb-1">Institution submitted</dt>
                <dd className="break-words font-mono text-[11px] text-ink">{displayValue(selected)}</dd>
              </div>
              <div className="border border-line bg-paper/40 px-3 py-2.5">
                <dt className="overline mb-1">Extracted (simulated OCR)</dt>
                <dd className="break-words font-mono text-[11px] text-inkSoft">{displayExtracted(selected)}</dd>
              </div>
              {selected.normalizedValue && (
                <div className="col-span-2 border border-line bg-paper/40 px-3 py-2.5">
                  <dt className="overline mb-1">Normalized reference</dt>
                  <dd className="grid gap-1 font-mono text-[10px] text-inkSoft sm:grid-cols-3">
                    <span>exact · {selected.normalizedValue.exact}</span>
                    <span>strong · {selected.normalizedValue.strong}</span>
                    <span>ocr · {selected.normalizedValue.ocr}</span>
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-5 space-y-3">
              {[
                ['Source location', selected.sourceRef],
                ['Validation method', selected.validationMethod],
                ['Last updated', formatDateTime(selected.lastUpdated)],
                ['Follow-up required', selected.followUp ? 'Yes' : 'No'],
                ['Field evidence ID', selected.id],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-line pb-2">
                  <span className="text-[10px] text-muted">{label}</span>
                  <span className="max-w-[65%] text-right text-[10.5px] text-inkSoft">{value}</span>
                </div>
              ))}
            </div>

            {linkedFindings.length > 0 && (
              <div className="mt-4">
                <div className="overline mb-2">Linked integrity finding</div>
                {linkedFindings.map((finding) => (
                  <Link
                    key={finding.id}
                    to={`/app/verification?view=findings&finding=${finding.id}`}
                    className="flex items-center justify-between gap-2 border border-line px-3 py-2.5 hover:border-lineStrong"
                  >
                    <div>
                      <div className="font-mono text-[9.5px] text-muted">{finding.id}</div>
                      <div className="text-[10.5px] font-medium text-ink">{finding.title}</div>
                    </div>
                    <Link2 size={12} className="text-muted" />
                  </Link>
                ))}
              </div>
            )}

            {selected.reviewerNotes && (
              <div className="mt-4 border border-line bg-paper/40 px-3 py-2.5">
                <div className="overline mb-1">Reviewer notes</div>
                <p className="text-[10.5px] leading-relaxed text-inkSoft">{selected.reviewerNotes}</p>
              </div>
            )}

            {action && (
              <div className="mt-5 border border-copper/30 bg-copper/[0.03] px-3.5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-copper-dark">
                    {action === 'demo_confirm'
                      ? 'Record demo confirmation'
                      : action === 'record_discrepancy'
                        ? 'Record field discrepancy'
                        : 'Add reviewer note'}
                  </div>
                  <button type="button" className="btn-ghost btn-xs" onClick={() => setAction('')}>
                    Cancel
                  </button>
                </div>
                <label className="label mt-2" htmlFor="evidence-note">
                  Reviewer note <span className="text-copper">*</span>
                </label>
                <textarea
                  id="evidence-note"
                  className="textarea min-h-[80px]"
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value)
                    setError('')
                  }}
                  placeholder={
                    action === 'demo_confirm'
                      ? 'Describe the basis for this simulated confirmation. It is not a bank response.'
                      : 'Record the evidence or discrepancy detail…'
                  }
                />
                {action === 'demo_confirm' && (
                  <div className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-warning">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                    This marks the field as independently confirmed in the demo. It does not contact a
                    bank and must remain visibly labelled.
                  </div>
                )}
                {error && (
                  <p className="field-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  className="btn-dark btn-xs mt-2"
                  onClick={() => submitAction(action)}
                >
                  <ShieldCheck size={11} /> Save action
                </button>
              </div>
            )}

            {selected.confirmationMode === 'demo' && !action && (
              <div className="mt-4 flex items-start gap-2 border border-success/25 bg-success/[0.04] px-3 py-2.5">
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-success" />
                <p className="text-[9.5px] leading-relaxed text-inkSoft">
                  This field carries a demo confirmation recorded by an authorized reviewer. It is a
                  simulated workflow state, not a bank or legal confirmation.
                </p>
              </div>
            )}

            {reviewer && (
              <p className="mt-3 text-[9px] text-muted">
                Field status labels are defined in the demo status model; “independently confirmed” is
                explicitly marked as demo.
              </p>
            )}
          </div>
        )}
      </Drawer>

      <div className="mt-4 border border-line bg-paper/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10.5px] text-inkSoft">
            <ShieldCheck size={14} className="text-forest" />
            Evidence completeness is {coverage.percent}%.{' '}
            {coverage.confirmed > 0
              ? `${coverage.confirmed} field(s) are demo-confirmed; `
              : ''}
            missing fields: {coverage.missing}.
          </div>
          <Link to={`/app/verification/${instrument.id}`} className="btn-secondary btn-xs">
            Verification checklist <ArrowRight size={10} />
          </Link>
        </div>
        <Progress value={coverage.percent} className="mt-2" tone={coverage.missing ? 'warning' : 'success'} />
      </div>
    </div>
  )
}
