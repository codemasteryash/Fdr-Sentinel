import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  ClipboardX,
  FileSearch,
  Flag,
  RotateCcw,
  ShieldQuestion,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, EmptyState, Progress, SearchInput, SectionHeading } from '../components/shared/ui'
import {
  SeverityBadge,
  FindingStatusBadge,
  EvidenceStatusBadge,
  VerificationBadge,
  StatusTriad,
} from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { FindingDrawer } from '../components/integrity/FindingDrawer'
import {
  buildVerificationChecklist,
  completeInternalChecks,
  flagVerificationDiscrepancy,
  getVerificationQueue,
  recommendVerificationApproval,
  recordIndependentConfirmation,
  rejectVerification,
  requestAdditionalEvidence,
  returnInstrumentToInstitution,
} from '../services/verificationService'
import { computeCoverage, getEvidenceForInstrument } from '../services/evidenceService'
import { checkTransition } from '../services/lifecycleEngine'
import { can, PERMISSIONS, getUserById } from '../data/users'
import { formatCurrency, formatDate, formatDateTime, relativeDays } from '../utils/format'

const ACTIONS = [
  {
    id: 'internal',
    label: 'Complete internal checks',
    icon: ClipboardCheck,
    permission: PERMISSIONS.VERIFICATION_DECIDE,
    fn: completeInternalChecks,
  },
  {
    id: 'evidence',
    label: 'Request additional evidence',
    icon: FileSearch,
    permission: PERMISSIONS.VERIFICATION_DECIDE,
    fn: requestAdditionalEvidence,
  },
  {
    id: 'discrepancy',
    label: 'Flag discrepancy',
    icon: Flag,
    permission: PERMISSIONS.VERIFICATION_DECIDE,
    fn: flagVerificationDiscrepancy,
  },
  {
    id: 'confirm',
    label: 'Demo-confirm all evidence',
    icon: Sparkles,
    permission: PERMISSIONS.EVIDENCE_CONFIRM,
    fn: recordIndependentConfirmation,
    demo: true,
  },
  {
    id: 'approve',
    label: 'Recommend verification approval',
    icon: CheckCircle2,
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    fn: recommendVerificationApproval,
    policy: true,
  },
  {
    id: 'return',
    label: 'Return to institution',
    icon: RotateCcw,
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    fn: returnInstrumentToInstitution,
  },
  {
    id: 'reject',
    label: 'Reject verification',
    icon: XCircle,
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    fn: rejectVerification,
  },
]

const ACTIVE_FINDINGS = ['open', 'in_review', 'confirmed']

function materialFor(state, instrumentId) {
  return state.findings.filter(
    (finding) =>
      finding.instrumentId === instrumentId &&
      ACTIVE_FINDINGS.includes(finding.reviewStatus) &&
      ['critical', 'high'].includes(finding.severity),
  )
}

function QueueItem({ instrument, active, material, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group block w-full border-l-2 px-3.5 py-3 text-left transition-colors ${
        active
          ? 'border-copper bg-copper/[0.055]'
          : 'border-transparent hover:border-lineStrong hover:bg-paper/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[9.5px] text-forest">{instrument.id}</div>
          <div className="mt-0.5 truncate text-[10.5px] font-medium text-ink">
            {instrument.institutionName}
          </div>
        </div>
        <ChevronRight
          size={12}
          className={`mt-0.5 shrink-0 transition-transform ${
            active ? 'text-copper' : 'text-lineStrong group-hover:translate-x-0.5'
          }`}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <VerificationBadge status={instrument.verificationStatus} short />
        {material > 0 && (
          <span className="inline-flex items-center gap-0.5 font-mono text-[8px] uppercase text-critical">
            <AlertTriangle size={8} /> {material}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[8.5px] text-muted">
        <span className="truncate font-mono">{instrument.reference}</span>
        <span className="shrink-0">{relativeDays(instrument.maturityDate)}</span>
      </div>
    </button>
  )
}

export default function Verification() {
  const { id } = useParams()
  const state = useDemoState()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('attention')
  const [activeAction, setActiveAction] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const findingId = searchParams.get('finding')
  const findingSeverity = searchParams.get('severity') ?? ''
  const findingReview = searchParams.get('review') ?? ''
  const view = searchParams.get('view') === 'findings' ? 'findings' : 'cases'
  const focusedFinding = state.findings.find((finding) => finding.id === findingId) ?? null

  const queue = useMemo(() => {
    const rows = getVerificationQueue(state).filter(
      (instrument) =>
        user.role !== 'officer' || instrument.institutionId === user.institutionId,
    )
    const term = query.trim().toLowerCase()
    return rows.filter((instrument) => {
      if (statusFilter === 'discrepancy' && instrument.verificationStatus !== 'discrepancy') {
        return false
      }
      if (
        statusFilter === 'pending' &&
        !['confirmation_pending', 'partially_confirmed'].includes(instrument.verificationStatus)
      ) {
        return false
      }
      if (
        statusFilter === 'unverified' &&
        !['unverified', 'internal_passed'].includes(instrument.verificationStatus)
      ) {
        return false
      }
      if (term) {
        const haystack = [
          instrument.id,
          instrument.reference,
          instrument.institutionName,
          instrument.bank,
          instrument.branch,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(term)
      }
      return true
    })
  }, [state, user, query, statusFilter])

  const activeId = id || focusedFinding?.instrumentId || queue[0]?.id
  const instrument = state.instruments.find((item) => item.id === activeId) ?? null
  const findings = instrument
    ? state.findings.filter((finding) => finding.instrumentId === instrument.id)
    : []
  const activeFindings = findings.filter((finding) =>
    ACTIVE_FINDINGS.includes(finding.reviewStatus),
  )
  const material = instrument ? materialFor(state, instrument.id) : []
  const evidence = instrument ? getEvidenceForInstrument(state, instrument.id) : []
  const coverage = computeCoverage(evidence)
  const checklist = instrument ? buildVerificationChecklist(state, instrument) : []
  const checked = checklist.filter((item) => item.done).length
  const reviewer = instrument ? getUserById(instrument.reviewerId) : null
  const decisionActions = ACTIONS.filter((action) => can(user.role, action.permission))
  const transitions = instrument
    ? Object.fromEntries(
        ['verified', 'discrepancy', 'returned'].map((to) => [
          to,
          checkTransition({ instrument, to, user, findings: state.findings }),
        ]),
      )
    : {}
  const approvalCheck = transitions.verified

  const scopedFindings = useMemo(() => {
    const term = query.trim().toLowerCase()
    return state.findings
      .filter((finding) => ACTIVE_FINDINGS.includes(finding.reviewStatus))
      .filter(
        (finding) =>
          user.role !== 'officer' ||
          state.instruments.find((item) => item.id === finding.instrumentId)?.institutionId ===
            user.institutionId,
      )
      .filter((finding) => {
        if (findingSeverity && finding.severity !== findingSeverity) return false
        if (findingReview && finding.reviewStatus !== findingReview) return false
        if (!term) return true
        return [finding.id, finding.title, finding.instrumentId, finding.rule]
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
      .sort((a, b) => {
        const rank = { critical: 0, high: 1, medium: 2, low: 3 }
        return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
      })
  }, [state, user, query, findingSeverity, findingReview])

  const openCase = (instrumentId, finding = null) => {
    const params = new URLSearchParams()
    if (view === 'findings' || finding) params.set('view', 'findings')
    if (finding) params.set('finding', finding)
    navigate(`/app/verification/${instrumentId}${params.toString() ? `?${params}` : ''}`)
  }

  const setView = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'findings') params.set('view', 'findings')
    else params.delete('view')
    if (next === 'cases') params.delete('finding')
    setSearchParams(params, { replace: true })
  }

  const closeFinding = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('finding')
    setSearchParams(params, { replace: true })
  }

  const clearFindingFilters = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('severity')
    params.delete('review')
    setSearchParams(params, { replace: true })
  }

  const runAction = () => {
    if (!instrument) return
    if (!note.trim()) {
      setError('A reviewer note is required for every verification action.')
      return
    }
    const action = ACTIONS.find((item) => item.id === activeAction)
    if (!action) return
    setBusy(true)
    const result = action.fn(instrument.id, note, user)
    setBusy(false)
    if (!result.ok) {
      setError(result.reasons?.join(' ') ?? result.reason)
      return
    }
    toast.success('Verification action recorded', {
      description:
        action.id === 'confirm'
          ? result.message ?? 'Demo confirmation recorded. This is not a bank response.'
          : 'The decision, actor, and reason were appended to the audit trail.',
    })
    setActiveAction(null)
    setNote('')
    setError('')
  }

  return (
    <div>
      <PageHeader
        overline="Verification · Evidence-gated review"
        title="Investigate before you verify."
        description="Queue, evidence, findings, and permitted decisions in one workspace. Evidence confirmation, material findings, and lifecycle approval remain separate gates."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{queue.length} cases in view</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              {state.instruments.filter((item) => item.verificationStatus === 'confirmed').length}{' '}
              demo-confirmed records
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Acting as {user.name}</span>
          </>
        }
        actions={
          <Link to="/app/verification?view=findings" className="btn-secondary">
            <ShieldQuestion size={14} /> Open findings review
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-12">
        <aside className="min-w-0 xl:col-span-3">
          <section className="panel overflow-hidden xl:sticky xl:top-[76px]">
            <div className="border-b border-line px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Investigation queue
                </span>
                <span className="font-mono text-[9px] text-muted">{queue.length}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 border border-line">
                <button
                  type="button"
                  onClick={() => setView('cases')}
                  className={`px-2 py-1.5 text-[9.5px] font-medium transition-colors ${
                    view === 'cases' ? 'bg-forest text-paper' : 'bg-raised text-muted hover:text-ink'
                  }`}
                >
                  Cases
                </button>
                <button
                  type="button"
                  onClick={() => setView('findings')}
                  className={`border-l border-line px-2 py-1.5 text-[9.5px] font-medium transition-colors ${
                    view === 'findings' ? 'bg-forest text-paper' : 'bg-raised text-muted hover:text-ink'
                  }`}
                >
                  Findings
                </button>
              </div>
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={view === 'findings' ? 'Search findings…' : 'Search cases…'}
                className="mt-2"
              />
            </div>

            {view === 'cases' ? (
              <>
                <div className="flex flex-wrap gap-1 border-b border-line bg-paper/40 px-3 py-2">
                  {[
                    ['attention', 'All'],
                    ['discrepancy', 'Discrepancy'],
                    ['pending', 'Pending'],
                    ['unverified', 'Unverified'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value)}
                      className={`px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.04em] transition-colors ${
                        statusFilter === value
                          ? 'bg-forest text-paper'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="max-h-[650px] overflow-y-auto">
                  {queue.length === 0 ? (
                    <EmptyState
                      compact
                      icon={ClipboardCheck}
                      title="No cases match"
                      message="Switch the filter or clear the search."
                    />
                  ) : (
                    queue.map((row) => (
                      <QueueItem
                        key={row.id}
                        instrument={row}
                        active={row.id === activeId}
                        material={materialFor(state, row.id).length}
                        onClick={() => openCase(row.id)}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {(findingSeverity || findingReview) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-copper/[0.04] px-3 py-1.5">
                    <span className="text-[8.5px] text-muted">
                      {findingSeverity ? `Severity: ${findingSeverity}` : ''}
                      {findingSeverity && findingReview ? ' · ' : ''}
                      {findingReview ? `Review: ${findingReview}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={clearFindingFilters}
                      className="text-[8.5px] font-medium text-copper-dark hover:text-ink"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                <div className="max-h-[650px] divide-y divide-line overflow-y-auto">
                  {scopedFindings.length === 0 ? (
                  <EmptyState
                    compact
                    icon={ShieldQuestion}
                    title="No findings match"
                    message="Clear the search or return to the case queue."
                  />
                ) : (
                  scopedFindings.map((finding) => (
                    <button
                      key={finding.id}
                      type="button"
                      onClick={() => openCase(finding.instrumentId, finding.id)}
                      className="group block w-full px-3.5 py-3 text-left transition-colors hover:bg-copper/[0.035]"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[8.5px] text-muted">{finding.id}</span>
                        <SeverityBadge severity={finding.severity} />
                        <FindingStatusBadge status={finding.reviewStatus} />
                      </div>
                      <div className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-snug text-ink">
                        {finding.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[8.5px] text-muted">
                        <span className="font-mono">{finding.instrumentId}</span>
                        <span>{finding.confidence}% confidence</span>
                      </div>
                    </button>
                  ))
                )}
                </div>
              </>
            )}

            <div className="border-t border-line bg-paper/30 px-3.5 py-2 text-[8.5px] leading-relaxed text-muted">
              Priority reflects evidence state and gaps, not a fraud score.
            </div>
          </section>
        </aside>

        <div className="min-w-0 xl:col-span-6">
          {!instrument ? (
            <section className="panel">
              <EmptyState
                icon={ClipboardCheck}
                title="Select an investigation"
                message="Choose a case from the queue to inspect its checklist, evidence, findings, and permitted decisions."
              />
            </section>
          ) : (
            <div className="space-y-5">
              <section className="panel">
                <div className="border-b border-line px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9.5px] text-muted">{instrument.id}</span>
                        <span className="text-lineStrong">/</span>
                        <span className="font-mono text-[9.5px] text-muted">
                          {instrument.institutionId}
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-[24px] leading-tight text-ink">
                        {instrument.reference}
                      </h2>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                        {instrument.institutionName} · {instrument.bank}, {instrument.branch}
                      </p>
                    </div>
                    <Link
                      to={`/app/instruments/${instrument.id}`}
                      className="btn-secondary btn-xs"
                    >
                      Open record <ArrowRight size={10} />
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusTriad instrument={instrument} compact />
                    <span className="text-lineStrong">·</span>
                    <span className="font-mono text-[9.5px] text-muted">
                      {formatCurrency(instrument.amount)}
                    </span>
                    <span className="text-lineStrong">·</span>
                    <span className="text-[9.5px] text-muted">
                      Matures {formatDate(instrument.maturityDate)} ({relativeDays(instrument.maturityDate)})
                    </span>
                  </div>
                </div>

                <div className="grid gap-px bg-line sm:grid-cols-3">
                  {[
                    ['Checklist', `${checked}/${checklist.length}`, 'checks complete'],
                    ['Coverage', `${coverage.percent}%`, `${coverage.confirmed}/${coverage.total} demo-confirmed`],
                    ['Material findings', material.length, 'critical or high unresolved'],
                  ].map(([label, value, detail]) => (
                    <div key={label} className="bg-raised px-4 py-3">
                      <div className="overline mb-1">{label}</div>
                      <div className="font-display text-[21px] leading-none text-ink">{value}</div>
                      <div className="mt-1 text-[8.5px] text-muted">{detail}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <SectionHeading
                    overline="Readiness"
                    title="Verification checklist"
                    description="Evidence signals, not automatic approval."
                  />
                  <div className="text-right">
                    <div className="font-mono text-[15px] text-ink">
                      {checked}/{checklist.length}
                    </div>
                    <div className="text-[8.5px] text-muted">complete</div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <Progress
                    value={Math.round((checked / checklist.length) * 100)}
                    tone={checked === checklist.length ? 'success' : 'forest'}
                  />
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {checklist.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-start gap-2 border px-2.5 py-2 ${
                          item.done
                            ? 'border-success/20 bg-success/[0.025]'
                            : 'border-line bg-paper/30'
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-success" />
                        ) : (
                          <Circle size={11} className="mt-0.5 shrink-0 text-muted/50" />
                        )}
                        <div>
                          <div className="text-[9px] font-medium leading-snug text-ink">
                            {item.label}
                          </div>
                          <div className="mt-0.5 text-[8px] leading-relaxed text-muted">
                            {item.detail}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="panel overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <SectionHeading
                    overline="Field-level provenance"
                    title="Evidence coverage"
                    description={`${coverage.confirmed} of ${coverage.total} fields carry demo confirmation.`}
                  />
                  <Link
                    to={`/app/instruments/${instrument.id}?tab=evidence`}
                    className="btn-ghost btn-xs"
                  >
                    Full passport <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[520px]">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidence.map((record) => (
                        <tr key={record.id}>
                          <td className="text-[9.5px] font-medium">{record.fieldLabel}</td>
                          <td className="max-w-[130px] truncate font-mono text-[9px]">
                            {record.field === 'amount'
                              ? formatCurrency(record.submittedValue)
                              : String(record.submittedValue || '—')}
                          </td>
                          <td>
                            <EvidenceStatusBadge status={record.status} />
                          </td>
                          <td className="max-w-[120px] truncate text-[8.5px] text-muted">
                            {record.sourceRef}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <SectionHeading
                    overline="Blocking signals"
                    title={`${material.length} unresolved material finding(s)`}
                    description="Critical and high findings block the verified lifecycle transition."
                  />
                  <Link
                    to={`/app/verification/${instrument.id}?view=findings`}
                    className="btn-ghost btn-xs"
                  >
                    All findings <ArrowRight size={10} />
                  </Link>
                </div>
                {activeFindings.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-[10.5px] text-inkSoft">
                    <CheckCircle2 size={13} className="text-success" /> No active findings on this record.
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {activeFindings.map((finding) => (
                      <li key={finding.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[8.5px] text-muted">{finding.id}</span>
                            <SeverityBadge severity={finding.severity} />
                            <FindingStatusBadge status={finding.reviewStatus} />
                          </div>
                          <button
                            type="button"
                            onClick={() => openCase(instrument.id, finding.id)}
                            className="btn-secondary btn-xs"
                          >
                            Review <ArrowRight size={9} />
                          </button>
                        </div>
                        <div className="mt-1 text-[10.5px] font-medium text-ink">{finding.title}</div>
                        <div className="mt-0.5 font-mono text-[8.5px] text-muted">{finding.rule}</div>
                      </li>
                    ))}
                  </ul>
                )}
                {approvalCheck && !approvalCheck.allowed && (
                  <div className="border-t border-line bg-warning/[0.04] px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-warning">
                      <AlertTriangle size={10} /> Verification approval policy
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[9px] leading-relaxed text-inkSoft">
                      {approvalCheck.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-5 xl:col-span-3">
          {instrument && (
            <>
              <section className="panel">
                <div className="border-b border-line px-4 py-3">
                  <SectionHeading
                    overline="Reviewer decision"
                    title="Record action"
                    description="A note is required. The service re-checks role and policy."
                  />
                </div>
                <div className="px-4 py-4">
                  {decisionActions.length === 0 ? (
                    <p className="text-[10px] text-muted">
                      Your role has read-only access to verification decisions.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-1">
                        {decisionActions.map((action) => {
                          const Icon = action.icon
                          const blocked = action.id === 'approve' && !approvalCheck?.allowed
                          return (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => {
                                setActiveAction(action.id)
                                setNote('')
                                setError('')
                              }}
                              className={`flex items-center justify-between gap-2 border px-2.5 py-2 text-left text-[9.5px] transition-colors ${
                                activeAction === action.id
                                  ? 'border-forest/50 bg-forest/[0.03] font-medium text-ink'
                                  : 'border-line bg-raised text-inkSoft hover:border-lineStrong'
                              } ${action.demo ? 'border-copper/30' : ''}`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Icon size={11} className={action.demo ? 'text-copper' : ''} />
                                {action.label}
                              </span>
                              {action.demo ? (
                                <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-copper">
                                  demo
                                </span>
                              ) : blocked ? (
                                <span className="font-mono text-[7px] uppercase text-warning">
                                  policy
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>

                      {activeAction && (
                        <div className="mt-3 border border-line bg-paper/40 px-3 py-3">
                          <label className="label" htmlFor="verification-note">
                            Reviewer note <span className="text-copper">*</span>
                          </label>
                          <textarea
                            id="verification-note"
                            className="textarea min-h-[78px]"
                            value={note}
                            onChange={(event) => {
                              setNote(event.target.value)
                              setError('')
                            }}
                            placeholder="Evidence reviewed, rationale, and any follow-up…"
                          />
                          {activeAction === 'confirm' && (
                            <div className="mt-1.5 flex items-start gap-1.5 text-[8.5px] leading-relaxed text-warning">
                              <AlertTriangle size={9} className="mt-0.5 shrink-0" />
                              Records a simulated confirmation for every non-missing field. No bank is
                              contacted.
                            </div>
                          )}
                          {error && (
                            <p className="field-error" role="alert">
                              {error}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              className="btn-dark btn-xs"
                              onClick={runAction}
                              disabled={busy}
                            >
                              <Check size={10} /> {busy ? 'Recording…' : 'Record'}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost btn-xs"
                              onClick={() => setActiveAction(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="border-b border-line px-4 py-3">
                  <SectionHeading overline="Case context" title="Summary" />
                </div>
                <dl className="divide-y divide-line px-4">
                  {[
                    ['Reviewer', reviewer?.name ?? 'Unassigned'],
                    ['Coverage', `${coverage.percent}% internally consistent`],
                    ['Demo confirmations', `${coverage.confirmed}/${coverage.total}`],
                    ['Missing fields', String(coverage.missing)],
                    ['Last updated', formatDateTime(instrument.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3 py-2.5">
                      <dt className="text-[9px] text-muted">{label}</dt>
                      <dd className="text-right text-[9.5px] text-inkSoft">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t border-line px-4 py-2.5">
                  <Link
                    to={`/app/lifecycle/${instrument.id}`}
                    className="inline-flex items-center gap-1 text-[9.5px] font-medium text-forest hover:text-copper"
                  >
                    Open lifecycle case <ArrowRight size={9} />
                  </Link>
                </div>
              </section>

              <div className="border border-copper/25 bg-copper/[0.04] px-4 py-3">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.07em] text-copper-dark">
                  <ShieldQuestion size={11} /> Separation of duties
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-inkSoft">
                  Demo confirmation, finding review, and lifecycle approval are separate actions. Role
                  switching is a frontend simulation, not authentication.
                </p>
              </div>

              <div className="border border-line bg-paper/40 px-4 py-3">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.07em] text-inkSoft">
                  <ClipboardX size={11} className="text-copper" /> Evidence rule
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-muted">
                  A missing required field prevents full confirmation. Record a field-level discrepancy
                  or obtain the missing evidence instead of silently overriding it.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      {focusedFinding && (
        <FindingDrawer
          finding={focusedFinding}
          state={state}
          open={Boolean(focusedFinding)}
          onClose={closeFinding}
        />
      )}
    </div>
  )
}
