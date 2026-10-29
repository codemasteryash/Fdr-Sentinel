import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  ShieldCheck,
  Stamp,
} from 'lucide-react'
import { formatDate, formatDateTime, relativeDays } from '../../utils/format'
import { LIFECYCLE_LABELS } from '../../data/statuses'
import { getAvailableTransitions } from '../../services/lifecycleEngine'
import { buildDeadlineActions } from '../../services/deadlineEngine'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { can, PERMISSIONS, getUserById, ROLES } from '../../data/users'
import { LifecycleBadge, StatusBadge } from '../shared/StatusBadge'
import { SectionHeading } from '../shared/ui'
import { AuditTimeline } from '../audit/AuditTimeline'
import { LifecycleActionDialog, ReleaseApprovalDialog } from './LifecycleActionDialog'

const MAIN_FLOW = ['submitted', 'scrutiny', 'verification_pending', 'verified', 'renewal_due', 'released']
const SIDE_STATES = ['discrepancy', 'returned', 'rejected', 'replaced', 'renewed']

const STEP_LABELS = {
  submitted: 'Submitted',
  scrutiny: 'Scrutiny',
  verification_pending: 'Verification',
  verified: 'Verified',
  renewal_due: 'Renewal / release',
  released: 'Released',
}

function FlowStep({ state, current, index, total }) {
  const currentIndex = MAIN_FLOW.indexOf(current)
  const done = currentIndex > index || current === 'released'
  const active = current === state
  return (
    <li className="relative flex flex-1 flex-col items-center text-center">
      {index < total - 1 && (
        <span
          className={`absolute left-[50%] top-2.5 h-px w-full ${done ? 'bg-success/40' : 'bg-line'}`}
          aria-hidden="true"
        />
      )}
      <span
        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border text-[8px] ${
          active
            ? 'border-forest bg-forest text-paper'
            : done
              ? 'border-success/40 bg-success/[0.12] text-success'
              : 'border-lineStrong bg-raised text-muted'
        }`}
      >
        {done && !active ? <Check size={9} /> : index + 1}
      </span>
      <span className={`mt-2 text-[9px] leading-tight ${active ? 'font-semibold text-ink' : 'text-muted'}`}>
        {STEP_LABELS[state]}
      </span>
    </li>
  )
}

export function LifecyclePanel({ instrument, findings, state }) {
  const user = useCurrentUser()
  const [actionOpen, setActionOpen] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const transitions = useMemo(
    () => getAvailableTransitions(instrument, user, findings),
    [instrument, user, findings],
  )
  const lifecycleEvents = state.auditEvents
    .filter((event) => event.entityId === instrument.id && event.action.startsWith('lifecycle.'))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const deadlines = buildDeadlineActions(state).filter(
    (action) => action.instrumentId === instrument.id && action.status !== 'completed',
  )
  const canApprove = can(user.role, PERMISSIONS.LIFECYCLE_APPROVE)
  const releaseStage = ['release_requested', 'release_review'].includes(instrument.lifecycleStatus)
  const available = transitions.filter((transition) => transition.check.allowed)
  const closed = ['released', 'rejected'].includes(instrument.lifecycleStatus)
  const currentIndex = MAIN_FLOW.indexOf(instrument.lifecycleStatus)
  const isSide = SIDE_STATES.includes(instrument.lifecycleStatus)

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <SectionHeading
                overline="Lifecycle policy"
                title="Current state and available transitions"
                description="State changes are policy-checked. A blocked attempt is recorded without changing the record."
              />
              <div className="flex flex-wrap items-center gap-2">
                <LifecycleBadge status={instrument.lifecycleStatus} />
                {!closed && (
                  <button type="button" className="btn-dark btn-sm" onClick={() => setActionOpen(true)}>
                    <Play size={12} /> Lifecycle action
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 py-5">
              <ol className="flex items-start">
                {MAIN_FLOW.map((step, index) => (
                  <FlowStep
                    key={step}
                    state={step}
                    current={isSide ? '' : instrument.lifecycleStatus}
                    index={index}
                    total={MAIN_FLOW.length}
                  />
                ))}
              </ol>
              {isSide && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border border-critical/20 bg-critical/[0.03] px-3 py-2">
                  <span className="text-[10px] text-muted">Current branch state:</span>
                  <LifecycleBadge status={instrument.lifecycleStatus} />
                  <span className="text-[10px] text-muted">
                    The main path is not linear for this record. See the transition audit below.
                  </span>
                </div>
              )}
              {!isSide && currentIndex === -1 && (
                <p className="mt-3 text-[10px] text-muted">
                  This state is outside the simplified flow visualization; policy below remains authoritative.
                </p>
              )}
            </div>

            <dl className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
              <div>
                <dt className="overline mb-1">Verification basis</dt>
                <dd className="flex flex-wrap items-center gap-2 text-[11px] text-inkSoft">
                  <ShieldCheck size={13} className={instrument.verificationStatus === 'confirmed' ? 'text-success' : 'text-warning'} />
                  {instrument.verificationStatus.replaceAll('_', ' ')}
                  <span className="text-muted">·</span>
                  <Link to={`/verification/${instrument.id}`} className="text-forest hover:text-copper">
                    Open verification
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="overline mb-1">Required approval</dt>
                <dd className="text-[11px] text-inkSoft">
                  {instrument.approval?.required
                    ? instrument.approval.approved
                      ? `Recorded (demo) · ${formatDate(instrument.approval.approvedAt)}`
                      : 'Required but not recorded'
                    : 'Not required at this stage'}
                </dd>
              </div>
              <div>
                <dt className="overline mb-1">Record owner</dt>
                <dd className="text-[11px] text-inkSoft">{instrument.institutionName}</dd>
              </div>
              <div>
                <dt className="overline mb-1">Last updated</dt>
                <dd className="text-[11px] text-inkSoft">{formatDateTime(instrument.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading
                overline="Policy checks"
                title={`${available.length} eligible transition${available.length === 1 ? '' : 's'}`}
                description="Eligibility considers role, current state, verification confirmation, approval, and unresolved material findings."
              />
            </div>
            {transitions.length === 0 ? (
              <p className="px-4 py-5 text-[11px] text-muted">
                No transitions are defined from this closed or terminal state. History remains available.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {transitions.map((transition) => (
                  <li key={transition.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-ink">
                          {transition.label}
                          <ArrowRight size={11} className="text-muted" />
                          <span className="font-normal text-inkSoft">{LIFECYCLE_LABELS[transition.to]}</span>
                          <span className="ml-1 font-mono text-[8.5px] text-muted">{transition.id}</span>
                        </div>
                        <div className="mt-0.5 text-[9.5px] text-muted">
                          Required: {transition.allowedRoles.map((role) => ROLES[role]?.shortLabel ?? role).join(' / ')}
                          {transition.requiresReason ? ' · reason required' : ''}
                        </div>
                      </div>
                      <StatusBadge
                        tone={transition.check.allowed ? 'success' : 'warning'}
                        dot={false}
                        className="text-[8.5px]"
                      >
                        {transition.check.allowed ? 'Eligible' : 'Blocked'}
                      </StatusBadge>
                    </div>
                    {!transition.check.allowed && (
                      <ul className="mt-2 space-y-1 border-l-2 border-warning/30 pl-2.5">
                        {transition.check.reasons.map((reason) => (
                          <li key={reason} className="flex gap-1.5 text-[10px] leading-relaxed text-muted">
                            <Lock size={9} className="mt-0.5 shrink-0 text-warning" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!closed && transitions.length > 0 && (
              <div className="border-t border-line bg-paper/40 px-4 py-2.5">
                <button type="button" className="btn-secondary btn-xs" onClick={() => setActionOpen(true)}>
                  Open action panel <ArrowRight size={10} />
                </button>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="History" title="Lifecycle audit" description="Only lifecycle and blocked-transition events are shown here." />
            </div>
            <div className="px-4 py-4">
              <AuditTimeline events={lifecycleEvents} compact />
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:col-span-4">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Release decision" title="Approval status" />
            </div>
            <div className="px-4 py-4">
              {instrument.approval?.required ? (
                instrument.approval.approved ? (
                  <>
                    <StatusBadge tone="success">Sign-off recorded (demo)</StatusBadge>
                    <dl className="mt-3 space-y-2 text-[10.5px]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">Approved by</dt>
                        <dd className="text-inkSoft">{getUserById(instrument.approval.approvedBy)?.name ?? '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">Recorded</dt>
                        <dd className="text-inkSoft">{formatDate(instrument.approval.approvedAt)}</dd>
                      </div>
                    </dl>
                    {instrument.approval.note && (
                      <p className="mt-2 border-l-2 border-line pl-2 text-[10px] italic leading-relaxed text-muted">
                        {instrument.approval.note}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <StatusBadge tone="warning">Sign-off missing</StatusBadge>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                      Release remains blocked under policy REL-03 until a permitted approving authority
                      records sign-off.
                    </p>
                    {canApprove && (
                      <button type="button" className="btn-dark btn-xs mt-3 w-full" onClick={() => setApprovalOpen(true)}>
                        <Stamp size={11} /> Record demo sign-off
                      </button>
                    )}
                  </>
                )
              ) : (
                <>
                  <StatusBadge tone={releaseStage ? 'warning' : 'neutral'}>
                    {releaseStage ? 'Release stage' : 'No approval requested'}
                  </StatusBadge>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                    Approval becomes mandatory when the record reaches the release review stage. The
                    approval is a local demo action, not an AICTE authorization.
                  </p>
                  {releaseStage && canApprove && (
                    <button type="button" className="btn-dark btn-xs mt-3 w-full" onClick={() => setApprovalOpen(true)}>
                      <Stamp size={11} /> Record demo sign-off
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {deadlines.length > 0 && (
            <section className="panel">
              <div className="border-b border-line px-4 py-3">
                <SectionHeading overline="Deadline link" title="Actions for this record" />
              </div>
              <ul className="divide-y divide-line">
                {deadlines.map((deadline) => (
                  <li key={deadline.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10.5px] font-medium text-ink">{deadline.title}</span>
                      <StatusBadge
                        tone={deadline.priority === 'overdue' || deadline.priority === 'critical' ? 'critical' : 'warning'}
                        dot={false}
                        className="text-[8px]"
                      >
                        {deadline.statusLabel}
                      </StatusBadge>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[9.5px] text-muted">
                      <Clock size={9} /> {relativeDays(deadline.dueDate)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-4 py-2.5">
                <Link to="/deadlines" className="btn-ghost btn-xs w-full">
                  Manage in deadline queue <ArrowRight size={10} />
                </Link>
              </div>
            </section>
          )}

          <div className="border border-line bg-paper/40 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-inkSoft">
              <AlertTriangle size={12} className="text-copper" /> Demo control
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Lifecycle actions change local browser state only. The prototype does not move money,
              contact banks, or authorize a legal release.
            </p>
          </div>

          <div className="border border-success/25 bg-success/[0.03] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-success">
              <CheckCircle2 size={12} /> Guardrails active
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              The service layer re-checks permissions and policy on every attempt. UI hiding is not the
              only control.
            </p>
          </div>
        </aside>
      </div>

      <LifecycleActionDialog
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        instrument={instrument}
        findings={findings}
      />
      <ReleaseApprovalDialog
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        instrument={instrument}
      />
    </div>
  )
}
