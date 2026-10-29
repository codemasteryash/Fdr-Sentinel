import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  GitBranch,
  ShieldCheck,
  Stamp,
} from 'lucide-react'
import { PageHeader, InfoNote, EmptyState, SectionHeading } from '../components/shared/ui'
import { LifecycleBadge, VerificationBadge, StatusTriad, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { LIFECYCLE_LABELS } from '../data/statuses'
import { can, PERMISSIONS } from '../data/users'
import { formatCurrency, formatDate } from '../utils/format'
import { AuditTimeline } from '../components/audit/AuditTimeline'
import { LifecyclePanel } from '../components/lifecycle/LifecyclePanel'
import { ReleaseApprovalDialog } from '../components/lifecycle/LifecycleActionDialog'

function LifecycleCase({ instrumentId }) {
  const state = useDemoState()
  const user = useCurrentUser()
  const instrument = state.instruments.find((item) => item.id === instrumentId)
  const findings = instrument
    ? state.findings.filter((finding) => finding.instrumentId === instrument.id)
    : []

  if (!instrument) {
    return (
      <div>
        <PageHeader overline="Lifecycle · Not found" title="Record not found" description="This instrument does not exist in the current demo state." />
        <Link to="/lifecycle" className="btn-secondary"><ArrowLeft size={14} /> Lifecycle queue</Link>
      </div>
    )
  }

  if (user.role === 'officer' && instrument.institutionId !== user.institutionId) {
    return (
      <div>
        <PageHeader overline="Lifecycle · Access scope" title="Record outside your institution" description="The Institution Officer role is limited to its assigned institution." />
        <Link to="/lifecycle" className="btn-secondary"><ArrowLeft size={14} /> Lifecycle queue</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <Link to="/lifecycle" className="hover:text-forest">Lifecycle & Approvals</Link>
        <span>›</span>
        <span className="font-mono text-inkSoft">{instrument.id}</span>
      </div>
      <PageHeader
        overline="Lifecycle · Policy workspace"
        title={instrument.reference}
        description={`${instrument.institutionName}. ${instrument.bank}, ${instrument.branch}. Principal ${formatCurrency(instrument.amount)}; maturity ${formatDate(instrument.maturityDate)}.`}
        meta={<StatusTriad instrument={instrument} compact />}
        actions={
          <Link to={`/instruments/${instrument.id}`} className="btn-secondary">
            Back to instrument <ArrowRight size={13} />
          </Link>
        }
      />
      <LifecyclePanel instrument={instrument} findings={findings} state={state} />
    </div>
  )
}

function LifecycleOverview() {
  const state = useDemoState()
  const user = useCurrentUser()
  const [approvalTarget, setApprovalTarget] = useState(null)
  const releaseQueue = state.instruments.filter((instrument) =>
    ['release_requested', 'release_review'].includes(instrument.lifecycleStatus),
  )
  const canApprove = can(user.role, PERMISSIONS.LIFECYCLE_APPROVE)
  const distribution = state.instruments.reduce((acc, instrument) => {
    acc[instrument.lifecycleStatus] = (acc[instrument.lifecycleStatus] ?? 0) + 1
    return acc
  }, {})
  const recentLifecycle = useMemo(
    () =>
      state.auditEvents
        .filter((event) => event.action.startsWith('lifecycle.'))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 7),
    [state.auditEvents],
  )
  const verificationGated = state.instruments.filter(
    (instrument) =>
      !['released', 'rejected'].includes(instrument.lifecycleStatus) &&
      instrument.verificationStatus !== 'confirmed',
  ).length

  return (
    <div>
      <PageHeader
        overline="Operations · Controlled state changes"
        title="Lifecycle & Approvals"
        description="Move instruments through policy-defined states with separation of duties. Release requires confirming verification, no unresolved material findings, and a recorded approving-authority sign-off."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{releaseQueue.length} release stage case(s)</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{verificationGated} record(s) not yet demo-confirmed</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Acting as {user.name}</span>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Release requested', distribution.release_requested ?? 0, 'Awaiting review or sign-off', 'info'],
          ['Release under review', distribution.release_review ?? 0, 'Sign-off and policy checks', 'warning'],
          ['Verified records', distribution.verified ?? 0, 'Eligible for renewal or release', 'success'],
          ['Blocked / returned', (distribution.returned ?? 0) + (distribution.rejected ?? 0), 'Retained with reasons', 'critical'],
        ].map(([label, value, detail, tone]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="flex items-start justify-between">
              <div className="overline mb-1">{label}</div>
              <span className={`dot ${tone === 'critical' ? 'bg-critical' : tone === 'warning' ? 'bg-warning' : tone === 'success' ? 'bg-success' : 'bg-info'}`} />
            </div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <InfoNote tone="copper" className="mb-5" title="Demo approvals are not authorization">
        Release sign-off is a locally recorded demonstration action. It does not approve a financial
        transaction, satisfy AICTE policy, or contact a bank. Every attempt — including blocked attempts —
        is appended to the audit chain.
      </InfoNote>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <SectionHeading
                overline="Approval queue"
                title="Release decisions"
                description="Open a case to review policy checks, or record sign-off when permitted."
              />
              <ShieldCheck size={16} className="text-muted" />
            </div>
            {releaseQueue.length === 0 ? (
              <EmptyState
                compact
                icon={GitBranch}
                title="No records at the release stage"
                message="A record must first request release before approval actions appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[880px]">
                  <thead>
                    <tr>
                      <th>Record</th>
                      <th>Institution</th>
                      <th>Principal</th>
                      <th>Verification</th>
                      <th>Sign-off</th>
                      <th>Material findings</th>
                      <th>Updated</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {releaseQueue.map((instrument) => {
                      const material = state.findings.filter(
                        (finding) =>
                          finding.instrumentId === instrument.id &&
                          ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus) &&
                          ['critical', 'high'].includes(finding.severity),
                      )
                      return (
                        <tr key={instrument.id}>
                          <td>
                            <Link to={`/lifecycle/${instrument.id}`} className="font-mono text-[10px] text-forest hover:text-copper">
                              {instrument.id}
                            </Link>
                            <div className="mt-0.5 text-[9px] text-muted">{instrument.reference}</div>
                          </td>
                          <td className="max-w-[170px] truncate text-[10px]">{instrument.institutionName}</td>
                          <td className="whitespace-nowrap font-mono text-[10px]">{formatCurrency(instrument.amount)}</td>
                          <td><VerificationBadge status={instrument.verificationStatus} /></td>
                          <td>
                            <StatusBadge tone={instrument.approval?.approved ? 'success' : 'warning'} dot={false}>
                              {instrument.approval?.approved ? 'Recorded (demo)' : 'Missing'}
                            </StatusBadge>
                          </td>
                          <td>
                            {material.length ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] text-critical">
                                <AlertTriangle size={10} /> {material.length}
                              </span>
                            ) : (
                              <span className="text-[9px] text-muted">None</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-[9px] text-muted">{formatDate(instrument.updatedAt)}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              {canApprove && !instrument.approval?.approved && (
                                <button
                                  type="button"
                                  className="btn-icon h-6 w-6"
                                  onClick={() => setApprovalTarget(instrument)}
                                  aria-label={`Record release approval for ${instrument.id}`}
                                  title="Record demo sign-off"
                                >
                                  <Stamp size={12} />
                                </button>
                              )}
                              <Link to={`/lifecycle/${instrument.id}`} className="btn-icon h-6 w-6" aria-label={`Open ${instrument.id}`}>
                                <ArrowRight size={12} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Recent policy activity" title="Lifecycle audit highlights" description="Full history is available in the Audit Trail." />
            </div>
            <div className="px-4 py-4">
              <AuditTimeline events={recentLifecycle} compact />
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <Link to="/audit" className="btn-ghost btn-xs">
                Open full audit trail <ArrowRight size={10} />
              </Link>
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:col-span-4">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="State distribution" title="Where records sit" />
            </div>
            <ul className="divide-y divide-line">
              {Object.entries(distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <li key={status} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <LifecycleBadge status={status} />
                      <span className="font-mono text-[10px] text-muted">{count}</span>
                    </div>
                    <div className="mt-1.5 h-0.5 w-full bg-line">
                      <div
                        className="h-full bg-forest/60"
                        style={{ width: `${(count / state.instruments.length) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Separation of duties" title="Who can do what" />
            </div>
            <ul className="divide-y divide-line text-[10px]">
              {[
                ['Institution Officer', 'Requests lifecycle actions for own institution'],
                ['Verification Reviewer', 'Reviews evidence and recommends verification'],
                ['Approving Authority', 'Records release sign-off and approves/rejects'],
                ['Auditor', 'Read-only history and exports'],
              ].map(([role, detail]) => (
                <li key={role} className="px-4 py-2.5">
                  <div className="font-medium text-ink">{role}</div>
                  <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{detail}</div>
                </li>
              ))}
            </ul>
          </section>

          <div className="border border-warning/25 bg-warning/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-warning">
              <Clock size={12} /> Release SLA
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              Release-stage cases generate a deadline action. Escalate or complete it from Deadline
              Intelligence.
            </p>
          </div>

          <div className="border border-success/25 bg-success/[0.03] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-success">
              <CheckCircle2 size={12} /> Enforced server-side (demo service)
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              UI controls are not the only guardrail: the lifecycle service re-checks every transition
              and records blocked attempts.
            </p>
          </div>
        </aside>
      </div>

      <ReleaseApprovalDialog
        open={Boolean(approvalTarget)}
        onClose={() => setApprovalTarget(null)}
        instrument={approvalTarget}
      />
    </div>
  )
}

export default function Lifecycle() {
  const { id } = useParams()
  return id ? <LifecycleCase instrumentId={id} /> : <LifecycleOverview />
}
