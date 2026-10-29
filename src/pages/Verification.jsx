import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ClipboardX,
  FileSearch,
  Flag,
  RotateCcw,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, InfoNote, EmptyState, Progress, SectionHeading } from '../components/shared/ui'
import { StatusTriad, SeverityBadge, FindingStatusBadge, EvidenceStatusBadge, VerificationBadge, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { buildVerificationChecklist, getVerificationQueue } from '../services/verificationService'
import {
  completeInternalChecks,
  flagVerificationDiscrepancy,
  recommendVerificationApproval,
  recordIndependentConfirmation,
  rejectVerification,
  requestAdditionalEvidence,
  returnInstrumentToInstitution,
} from '../services/verificationService'
import { getEvidenceForInstrument, computeCoverage } from '../services/evidenceService'
import { checkTransition } from '../services/lifecycleEngine'
import { can, PERMISSIONS, getUserById } from '../data/users'
import { formatCurrency, formatDate, formatDateTime, relativeDays } from '../utils/format'
import { EVIDENCE_STATUS_LABELS } from '../data/statuses'

const ACTIONS = [
  {
    id: 'internal',
    label: 'Complete internal checks',
    icon: ClipboardCheck,
    permission: PERMISSIONS.VERIFICATION_DECIDE,
    fn: completeInternalChecks,
    tone: 'secondary',
  },
  {
    id: 'evidence',
    label: 'Request additional evidence',
    icon: FileSearch,
    permission: PERMISSIONS.VERIFICATION_DECIDE,
    fn: requestAdditionalEvidence,
    tone: 'secondary',
  },
  {
    id: 'discrepancy',
    label: 'Flag discrepancy',
    icon: Flag,
    permission: PERMISSIONS.VERIFICATION_DECIDE,
    fn: flagVerificationDiscrepancy,
    tone: 'secondary',
  },
  {
    id: 'confirm',
    label: 'Demo-confirm all evidence',
    icon: Sparkles,
    permission: PERMISSIONS.EVIDENCE_CONFIRM,
    fn: recordIndependentConfirmation,
    tone: 'dark',
    demo: true,
  },
  {
    id: 'approve',
    label: 'Recommend verification approval',
    icon: CheckCircle2,
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    fn: recommendVerificationApproval,
    tone: 'dark',
    policy: true,
  },
  {
    id: 'return',
    label: 'Return to institution',
    icon: RotateCcw,
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    fn: returnInstrumentToInstitution,
    tone: 'secondary',
  },
  {
    id: 'reject',
    label: 'Reject verification',
    icon: XCircle,
    permission: PERMISSIONS.LIFECYCLE_REVIEW,
    fn: rejectVerification,
    tone: 'secondary',
  },
]

function VerificationCase({ instrumentId }) {
  const state = useDemoState()
  const user = useCurrentUser()
  const [activeAction, setActiveAction] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const instrument = state.instruments.find((item) => item.id === instrumentId)

  const findings = instrument
    ? state.findings.filter(
        (finding) =>
          finding.instrumentId === instrument.id &&
          ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
      )
    : []
  const evidence = instrument ? getEvidenceForInstrument(state, instrument.id) : []
  const coverage = computeCoverage(evidence)
  const checklist = instrument ? buildVerificationChecklist(state, instrument) : []
  const checked = checklist.filter((item) => item.done).length
  const transitions = instrument
    ? Object.fromEntries(
        ['verified', 'discrepancy', 'returned'].map((to) => [
          to,
          checkTransition({ instrument, to, user, findings: state.findings }),
        ]),
      )
    : {}
  const material = findings.filter((finding) => ['critical', 'high'].includes(finding.severity))
  const reviewer = instrument ? getUserById(instrument.reviewerId) : null
  const decisionActions = ACTIONS.filter((action) => can(user.role, action.permission))

  if (!instrument) {
    return (
      <div>
        <PageHeader overline="Verification · Not found" title="Verification case not found" description="The selected synthetic instrument does not exist in this browser state." />
        <Link to="/verification" className="btn-secondary">
          <ArrowLeft size={14} /> Verification queue
        </Link>
      </div>
    )
  }

  if (user.role === 'officer' && instrument.institutionId !== user.institutionId) {
    return (
      <div>
        <PageHeader overline="Verification · Access scope" title="Case outside your institution" description="The Institution Officer role is limited to its assigned institution in this prototype." />
        <Link to="/verification" className="btn-secondary">
          <ArrowLeft size={14} /> Verification queue
        </Link>
      </div>
    )
  }

  const runAction = () => {
    if (!note.trim()) {
      setError('A reviewer note is required for every verification action.')
      return
    }
    const action = ACTIONS.find((item) => item.id === activeAction)
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

  const verificationApproval = transitions.verified

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <Link to="/verification" className="hover:text-forest">Verification Center</Link>
        <span>›</span>
        <span className="font-mono text-inkSoft">{instrument.id}</span>
      </div>

      <PageHeader
        overline={`Verification case · ${instrument.institutionId}`}
        title={instrument.reference}
        description={`${instrument.institutionName} · ${instrument.bank}, ${instrument.branch}. Principal ${formatCurrency(instrument.amount)}; maturity ${formatDate(instrument.maturityDate)}.`}
        meta={<StatusTriad instrument={instrument} compact />}
        actions={
          <Link to="/verification" className="btn-secondary">
            <ArrowLeft size={14} /> Back to queue
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <SectionHeading
                overline="Readiness"
                title="Verification checklist"
                description="Checks are evidence signals, not automatic approval. Policy separately blocks verification approval where material findings remain."
              />
              <div className="text-right">
                <div className="font-mono text-[18px] text-ink">{checked}/{checklist.length}</div>
                <div className="text-[9px] text-muted">checks complete</div>
              </div>
            </div>
            <div className="px-4 py-4">
              <Progress value={Math.round((checked / checklist.length) * 100)} tone={checked === checklist.length ? 'success' : 'forest'} />
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {checklist.map((item) => (
                  <li key={item.id} className={`flex items-start gap-2 border px-3 py-2.5 ${item.done ? 'border-success/20 bg-success/[0.025]' : 'border-line bg-paper/30'}`}>
                    {item.done ? (
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                    ) : (
                      <Circle size={13} className="mt-0.5 shrink-0 text-muted/50" />
                    )}
                    <div>
                      <div className="text-[10.5px] font-medium text-ink">{item.label}</div>
                      <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{item.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <SectionHeading overline="Evidence" title="Field-level coverage" description={`${coverage.confirmed} of ${coverage.total} fields carry demo confirmation.`} />
              <Link to={`/instruments/${instrument.id}?tab=evidence`} className="btn-secondary btn-xs">
                Open evidence passport <ArrowRight size={10} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Submitted value</th>
                    <th>Evidence status</th>
                    <th>Source location</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map((record) => (
                    <tr key={record.id}>
                      <td className="text-[10.5px] font-medium">{record.fieldLabel}</td>
                      <td className="max-w-[190px] truncate font-mono text-[10px]">
                        {record.field === 'amount' ? formatCurrency(record.submittedValue) : String(record.submittedValue || '—')}
                      </td>
                      <td><EvidenceStatusBadge status={record.status} /></td>
                      <td className="text-[9px] text-muted">{record.sourceRef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Blocking signals" title={`${material.length} unresolved material finding(s)`} description="Critical and high findings prevent the verified lifecycle transition until a reviewer resolves them." />
            </div>
            {material.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-4 text-[11px] text-inkSoft">
                <CheckCircle2 size={14} className="text-success" /> No unresolved critical or high finding on this record.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {material.map((finding) => (
                  <li key={finding.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] text-muted">{finding.id}</span>
                      <SeverityBadge severity={finding.severity} />
                      <FindingStatusBadge status={finding.reviewStatus} />
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-ink">{finding.title}</div>
                    <div className="mt-1 text-[9.5px] text-muted">{finding.rule}</div>
                    <Link to={`/integrity?finding=${finding.id}`} className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] text-forest hover:text-copper">
                      Review in Integrity Center <ArrowRight size={9} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!verificationApproval.allowed && (
              <div className="border-t border-line bg-warning/[0.04] px-4 py-3">
                <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-warning">
                  <AlertTriangle size={11} /> Verification approval policy
                </div>
                <ul className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-inkSoft">
                  {verificationApproval.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:col-span-4">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Case" title="Verification summary" />
            </div>
            <dl className="divide-y divide-line px-4">
              {[
                ['Assigned reviewer', reviewer?.name ?? 'Unassigned'],
                ['Verification state', instrument.verificationStatus.replaceAll('_', ' ')],
                ['Coverage', `${coverage.percent}% internally consistent`],
                ['Demo confirmations', `${coverage.confirmed}/${coverage.total}`],
                ['Missing fields', String(coverage.missing)],
                ['Last updated', formatDateTime(instrument.updatedAt)],
                ['Maturity', `${formatDate(instrument.maturityDate)} (${relativeDays(instrument.maturityDate)})`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 py-2.5">
                  <dt className="text-[9.5px] text-muted">{label}</dt>
                  <dd className="text-right text-[10px] text-inkSoft">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Reviewer decision" title="Record action" description="A note is required. The service re-checks role and policy." />
            </div>
            <div className="px-4 py-4">
              {decisionActions.length === 0 ? (
                <p className="text-[10.5px] text-muted">
                  Your role has read-only access to verification decisions.
                </p>
              ) : (
                <>
                  <div className="grid gap-1.5">
                    {decisionActions.map((action) => {
                      const Icon = action.icon
                      const disabled =
                        action.id === 'approve' &&
                        !verificationApproval.allowed &&
                        !user.can(PERMISSIONS.LIFECYCLE_APPROVE)
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => {
                            setActiveAction(action.id)
                            setNote('')
                            setError('')
                          }}
                          className={`flex items-center justify-between gap-2 border px-2.5 py-2 text-left text-[10px] transition-colors ${
                            activeAction === action.id
                              ? 'border-forest/50 bg-forest/[0.03] font-medium text-ink'
                              : 'border-line bg-raised text-inkSoft hover:border-lineStrong'
                          } ${action.demo ? 'border-copper/30' : ''}`}
                          disabled={disabled}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Icon size={12} className={action.demo ? 'text-copper' : ''} />
                            {action.label}
                          </span>
                          {action.demo && <span className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-copper">demo</span>}
                          {action.id === 'approve' && !verificationApproval.allowed && (
                            <span className="font-mono text-[7.5px] uppercase text-warning">blocked</span>
                          )}
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
                        className="textarea min-h-[84px]"
                        value={note}
                        onChange={(event) => {
                          setNote(event.target.value)
                          setError('')
                        }}
                        placeholder="Evidence reviewed, rationale, and any follow-up…"
                      />
                      {activeAction === 'confirm' && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-[9px] leading-relaxed text-warning">
                          <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                          This records a simulated independent confirmation for every non-missing field.
                          No bank is contacted.
                        </div>
                      )}
                      {error && <p className="field-error" role="alert">{error}</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" className="btn-dark btn-xs" onClick={runAction} disabled={busy}>
                          <Check size={11} /> {busy ? 'Recording…' : 'Record action'}
                        </button>
                        <button type="button" className="btn-ghost btn-xs" onClick={() => setActiveAction(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <div className="border border-copper/25 bg-copper/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-copper-dark">
              <ShieldQuestion size={12} /> Separation of duties
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              Demo confirmations and lifecycle approvals are separate actions. The prototype assigns
              different default users to each role, but no authentication is implied.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function VerificationQueue() {
  const state = useDemoState()
  const user = useCurrentUser()
  const [statusFilter, setStatusFilter] = useState('all')
  const queue = getVerificationQueue(state).filter((instrument) => {
    if (user.role === 'officer' && instrument.institutionId !== user.institutionId) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'discrepancy') return instrument.verificationStatus === 'discrepancy'
    if (statusFilter === 'pending') return ['confirmation_pending', 'partially_confirmed'].includes(instrument.verificationStatus)
    if (statusFilter === 'unverified') return ['unverified', 'internal_passed'].includes(instrument.verificationStatus)
    return true
  })

  return (
    <div>
      <PageHeader
        overline="Verification · Evidence-gated review"
        title="Verification Center"
        description="Work the verification queue in priority order. Evidence confirmation, material findings, and lifecycle approval are separate gates — no single click verifies an instrument."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{queue.length} cases in this view</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{state.instruments.filter((item) => item.verificationStatus === 'confirmed').length} demo-confirmed records</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Acting as {user.name}</span>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Discrepancies first', state.instruments.filter((item) => item.verificationStatus === 'discrepancy').length, 'Evidence conflict recorded'],
          ['Confirmation pending', state.instruments.filter((item) => ['confirmation_pending', 'partially_confirmed'].includes(item.verificationStatus)).length, 'Awaiting demo confirmation'],
          ['Unverified / internal', state.instruments.filter((item) => ['unverified', 'internal_passed'].includes(item.verificationStatus)).length, 'No independent confirmation'],
        ].map(([label, value, detail]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="overline mb-1">{label}</div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <InfoNote tone="info" className="mb-5" title="Priority is not risk scoring">
        The queue orders by verification status and evidence gaps. It does not compute a fraud score or
        rank institutions by suspicion.
      </InfoNote>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <SectionHeading overline="Work queue" title="Cases awaiting verification attention" />
          <div className="flex flex-wrap gap-1">
            {[
              ['all', 'All'],
              ['discrepancy', 'Discrepancy'],
              ['pending', 'Confirmation pending'],
              ['unverified', 'Unverified'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-2 py-1 font-mono text-[9px] uppercase tracking-[0.04em] transition-colors ${
                  statusFilter === value
                    ? 'border border-lineStrong bg-forest text-paper'
                    : 'border border-transparent text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {queue.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No cases in this queue view"
            message="Switch the filter or inspect the full registry."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Instrument</th>
                  <th>Institution</th>
                  <th>Principal</th>
                  <th>Verification</th>
                  <th>Material findings</th>
                  <th>Maturity</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {queue.map((instrument, index) => {
                  const findings = state.findings.filter(
                    (finding) =>
                      finding.instrumentId === instrument.id &&
                      ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus) &&
                      ['critical', 'high'].includes(finding.severity),
                  )
                  return (
                    <tr key={instrument.id}>
                      <td>
                        <span className="font-mono text-[10px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                      </td>
                      <td>
                        <Link to={`/verification/${instrument.id}`} className="font-mono text-[10px] text-forest hover:text-copper">
                          {instrument.id}
                        </Link>
                        <div className="font-mono text-[9px] text-muted">{instrument.reference}</div>
                      </td>
                      <td className="max-w-[170px] truncate text-[10px]">{instrument.institutionName}</td>
                      <td className="whitespace-nowrap font-mono text-[10px]">{formatCurrency(instrument.amount)}</td>
                      <td><VerificationBadge status={instrument.verificationStatus} /></td>
                      <td>
                        {findings.length ? (
                          <span className="inline-flex items-center gap-1 text-[9.5px] text-critical">
                            <AlertTriangle size={10} /> {findings.length} unresolved
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted">None</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-[9.5px] text-muted">
                        {formatDate(instrument.maturityDate)}
                        <div className="text-[8.5px]">{relativeDays(instrument.maturityDate)}</div>
                      </td>
                      <td>
                        <Link to={`/verification/${instrument.id}`} className="btn-icon h-6 w-6" aria-label={`Open ${instrument.id}`}>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-line bg-paper/30 px-4 py-2 text-[9.5px] text-muted">
          {queue.length} case(s). Open a case to inspect checklist, evidence coverage, blocking findings,
          and permitted decisions.
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="border border-line bg-paper/40 px-4 py-3 text-[10px] leading-relaxed text-muted">
          <ShieldCheck size={13} className="mb-1 text-forest" />
          Evidence confirmation is recorded field by field and labelled as simulated.
        </div>
        <div className="border border-line bg-paper/40 px-4 py-3 text-[10px] leading-relaxed text-muted">
          <ClipboardX size={13} className="mb-1 text-copper" />
          A returned instrument retains the reviewer's reason and prior audit history.
        </div>
        <div className="border border-line bg-paper/40 px-4 py-3 text-[10px] leading-relaxed text-muted">
          <ShieldQuestion size={13} className="mb-1 text-forest" />
          Unresolved critical/high findings block verification approval in lifecycle policy.
        </div>
      </div>
    </div>
  )
}

export default function Verification() {
  const { id } = useParams()
  return id ? <VerificationCase instrumentId={id} /> : <VerificationQueue />
}
