import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSearch,
  GitBranch,
  Plus,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  TimerOff,
} from 'lucide-react'
import { PageHeader, Progress, SectionHeading } from '../components/shared/ui'
import { PriorityBadge, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import {
  buildDeadlineActions,
} from '../services/deadlineEngine'
import { computeCoverage } from '../services/evidenceService'
import { getFindingStats } from '../services/findingService'
import {
  dashboardMetrics,
  institutionAttentionRank,
  institutionMetrics,
} from '../utils/selectors'
import { ROLES, getUserById } from '../data/users'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  relativeDays,
} from '../utils/format'

function actionRoute(action) {
  if (action.type === 'finding') {
    return `/app/verification?view=findings&finding=${action.findingId}`
  }
  if (action.type === 'release') return `/app/lifecycle/${action.instrumentId}`
  if (action.type === 'verification') return `/app/verification/${action.instrumentId}`
  if (action.type === 'evidence') return `/app/instruments/${action.instrumentId}?tab=evidence`
  return `/app/lifecycle?view=deadlines&focus=${encodeURIComponent(action.id)}`
}

function BriefItem({ icon: Icon, value, label, detail, to, tone = 'forest' }) {
  const tones = {
    forest: 'text-forest border-forest/20 bg-forest/[0.025]',
    warning: 'text-warning border-warning/25 bg-warning/[0.035]',
    critical: 'text-critical border-critical/25 bg-critical/[0.035]',
  }
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-copper/[0.025]"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center border ${tones[tone]}`}>
        <Icon size={15} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[24px] leading-none text-ink">{value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-inkSoft">
            {label}
          </span>
        </span>
        <span className="mt-1 block truncate text-[9.5px] text-muted">{detail}</span>
      </span>
      <ArrowRight
        size={12}
        className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-copper"
      />
    </Link>
  )
}

export default function Dashboard() {
  const state = useDemoState()
  const user = useCurrentUser()
  const metrics = dashboardMetrics(state)
  const findingStats = getFindingStats(state)
  const materialFindings = findingStats.critical + findingStats.high
  const actions = useMemo(
    () =>
      buildDeadlineActions(state)
        .filter((action) => action.status !== 'completed')
        .slice(0, 7),
    [state],
  )
  const coverage = useMemo(() => computeCoverage(state.evidence), [state.evidence])

  const institutions = useMemo(
    () =>
      [...state.institutions]
        .map((institution) => ({
          institution,
          metrics: institutionMetrics(state, institution),
          rank: institutionAttentionRank(state, institution),
        }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 4),
    [state],
  )

  const lowCoverage = useMemo(
    () =>
      state.instruments
        .map((instrument) => ({
          instrument,
          coverage: computeCoverage(
            state.evidence.filter((record) => record.instrumentId === instrument.id),
          ),
        }))
        .filter((row) => row.coverage.total > 0)
        .sort((a, b) => a.coverage.percent - b.coverage.percent)
        .slice(0, 4),
    [state],
  )

  const recentAudit = useMemo(
    () =>
      [...state.auditEvents]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5),
    [state.auditEvents],
  )

  const lifecycleCounts = useMemo(() => {
    const counts = {
      intake: 0,
      evidence: 0,
      verified: 0,
      release: 0,
      closed: 0,
    }
    state.instruments.forEach((instrument) => {
      const stage = instrument.lifecycleStatus
      if (['submitted', 'scrutiny'].includes(stage)) counts.intake += 1
      else if (['verification_pending', 'discrepancy', 'returned'].includes(stage)) counts.evidence += 1
      else if (['verified', 'renewal_due', 'renewal_pending'].includes(stage)) counts.verified += 1
      else if (['release_requested', 'release_review', 'replacement_pending'].includes(stage)) counts.release += 1
      else counts.closed += 1
    })
    return counts
  }, [state.instruments])

  const urgency = metrics.deadlineOverdue + findingStats.critical

  return (
    <div>
      <PageHeader
        overline={`${formatDate(new Date(), 'EEEE, dd MMMM yyyy')} · Operations brief`}
        title="What needs attention today?"
        description={
          <>
            A live view of exceptions, verification gaps, and blocked lifecycle decisions across the
            synthetic FDR portfolio. Start with the work queue; every row links to the record and its
            decision context.
          </>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${urgency ? 'bg-critical' : 'bg-success'}`} />
              {urgency ? `${urgency} urgent exception${urgency === 1 ? '' : 's'}` : 'No urgent exception'}
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              {metrics.instruments} instruments · {formatCompactCurrency(metrics.totalExposure)} exposure
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              {ROLES[user.role]?.label ?? user.role}
            </span>
          </>
        }
        actions={
          <>
            <Link to="/app/demo" className="btn-secondary">
              <PlayCircle size={14} /> Guided demo
            </Link>
            <Link to="/app/instruments/new" className="btn-dark">
              <Plus size={14} /> Register FDR
            </Link>
          </>
        }
      />

      <section className="grid gap-px border border-line bg-line sm:grid-cols-3">
        <BriefItem
          icon={TimerOff}
          value={metrics.deadlineOverdue}
          label="overdue actions"
          detail="Maturity, renewal, and release work past its due date"
          to="/app/lifecycle?view=deadlines&priority=overdue"
          tone={metrics.deadlineOverdue ? 'critical' : 'forest'}
        />
        <BriefItem
          icon={ClipboardCheck}
          value={metrics.awaitingVerification}
          label="awaiting verification"
          detail={`${metrics.verifiedPercent}% of active records demo-confirmed`}
          to="/app/verification"
          tone={metrics.awaitingVerification ? 'warning' : 'forest'}
        />
        <BriefItem
          icon={ShieldAlert}
          value={findingStats.active}
          label="active findings"
          detail={`${materialFindings} material · ${findingStats.unreviewed} unreviewed`}
          to="/app/verification?view=findings"
          tone={materialFindings ? 'critical' : 'forest'}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
              <SectionHeading
                overline="Derived from record dates and policy"
                title="Attention queue"
                description="Ordered by urgency. The queue is recomputed from current state; it is not a stale task list."
              />
              <Link
                to="/app/lifecycle?view=deadlines"
                className="group inline-flex items-center gap-1 text-[10.5px] font-medium text-forest hover:text-copper"
              >
                All deadline work
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {actions.length === 0 ? (
              <div className="flex items-center gap-2 px-5 py-8 text-[11px] text-inkSoft">
                <CheckCircle2 size={15} className="text-success" /> No active deadline actions.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {actions.map((action, index) => (
                  <li key={action.id}>
                    <Link
                      to={actionRoute(action)}
                      className="group grid gap-3 px-5 py-3.5 transition-colors hover:bg-copper/[0.025] sm:grid-cols-[24px_126px_1fr_120px_78px_18px] sm:items-center"
                    >
                      <span className="hidden font-mono text-[9px] text-muted sm:block">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <PriorityBadge priority={action.priority} />
                      <span className="min-w-0">
                        <span className="block truncate text-[11.5px] font-medium text-ink group-hover:text-copper">
                          {action.title}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] text-muted">
                          <span className="font-mono text-forest">{action.instrumentId}</span>
                          <span className="text-lineStrong">/</span>
                          <span className="truncate">{action.institutionName}</span>
                        </span>
                      </span>
                      <span className="hidden text-[9.5px] text-muted sm:block">
                        {getUserById(action.assignedTo)?.name?.split(' ')[0] ?? 'Unassigned'}
                      </span>
                      <span className="flex items-center gap-1.5 sm:block">
                        <Clock3 size={10} className="text-muted sm:hidden" />
                        <span className="block font-mono text-[9.5px] text-inkSoft">
                          {formatDate(action.dueDate, 'dd MMM')}
                        </span>
                        <span
                          className={`block text-[8.5px] ${
                            action.daysRemaining < 0 ? 'text-critical' : 'text-muted'
                          }`}
                        >
                          {relativeDays(action.dueDate)}
                        </span>
                      </span>
                      <ArrowRight
                        size={12}
                        className="hidden text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-copper sm:block"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/30 px-5 py-2.5 text-[9px] text-muted">
              <span>Priority reflects time and policy, not a fraud score.</span>
              <span className="font-mono">{actions.length} active action(s)</span>
            </div>
          </section>

          <section className="panel">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
              <SectionHeading
                overline="Portfolio progression"
                title="Where records sit"
                description="Lifecycle state distribution across all synthetic instruments."
              />
              <Link
                to="/app/instruments"
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-forest hover:text-copper"
              >
                Open registry <ArrowRight size={11} />
              </Link>
            </div>
            <div className="px-5 py-5">
              <div className="flex h-2 w-full overflow-hidden bg-line/70">
                {[
                  ['intake', lifecycleCounts.intake, 'bg-[#8A948D]'],
                  ['evidence', lifecycleCounts.evidence, 'bg-warning'],
                  ['verified', lifecycleCounts.verified, 'bg-success'],
                  ['release', lifecycleCounts.release, 'bg-copper'],
                  ['closed', lifecycleCounts.closed, 'bg-forest'],
                ].map(([key, count, color]) => (
                  <span
                    key={key}
                    className={`h-full ${color}`}
                    style={{ width: `${(count / state.instruments.length) * 100}%` }}
                    title={`${key}: ${count}`}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
                {[
                  ['Intake', lifecycleCounts.intake, 'Registered or in scrutiny'],
                  ['Review', lifecycleCounts.evidence, 'Verification or discrepancy'],
                  ['Verified', lifecycleCounts.verified, 'Eligible for next action'],
                  ['Release', lifecycleCounts.release, 'Renewal or release stage'],
                  ['Closed', lifecycleCounts.closed, 'Released, renewed, rejected'],
                ].map(([label, count, detail]) => (
                  <div key={label}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-[19px] leading-none text-ink">{count}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-inkSoft">
                        {label}
                      </span>
                    </div>
                    <div className="mt-1 text-[8.5px] leading-snug text-muted">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid border-t border-line sm:grid-cols-3">
              {[
                ['Release review', metrics.pendingRelease, '/app/lifecycle', GitBranch],
                ['Maturity · 90 days', metrics.upcomingMaturity, '/app/lifecycle?view=deadlines', Clock3],
                ['Open findings', metrics.openFindings, '/app/verification?view=findings', ShieldAlert],
              ].map(([label, value, to, Icon]) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center gap-2.5 border-b border-line px-5 py-3 transition-colors last:border-b-0 hover:bg-copper/[0.025] sm:border-b-0 sm:border-r sm:last:border-r-0"
                >
                  <Icon size={13} className="text-copper" />
                  <span className="text-[10px] text-muted">{label}</span>
                  <span className="ml-auto font-mono text-[12px] text-ink">{value}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
              <SectionHeading
                overline="Institution view"
                title="Where exceptions concentrate"
                description="Material findings, verification gaps, and near-term maturity, ranked for attention."
              />
              <Link
                to="/app/governance?view=institutions"
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-forest hover:text-copper"
              >
                Institution register <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-line">
              {institutions.map(({ institution, metrics: institutionMetric }) => (
                <Link
                  key={institution.id}
                  to={`/app/institutions/${institution.id}`}
                  className="grid gap-2 px-5 py-3.5 transition-colors hover:bg-copper/[0.025] sm:grid-cols-[1fr_90px_90px_90px_16px] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-medium text-ink">
                      {institution.shortName}
                    </div>
                    <div className="mt-0.5 truncate text-[9.5px] text-muted">
                      {institution.city}, {institution.state}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:block">
                    <span className="text-[8.5px] uppercase tracking-[0.06em] text-muted sm:hidden">
                      Exposure
                    </span>
                    <span className="font-mono text-[10px] text-inkSoft">
                      {formatCompactCurrency(institutionMetric.exposure)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:block">
                    <span className="text-[8.5px] uppercase tracking-[0.06em] text-muted sm:hidden">
                      Verification
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        institutionMetric.pendingVerification ? 'text-warning' : 'text-inkSoft'
                      }`}
                    >
                      {institutionMetric.pendingVerification} pending
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:block">
                    <span className="text-[8.5px] uppercase tracking-[0.06em] text-muted sm:hidden">
                      Findings
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                        institutionMetric.materialFindings ? 'text-critical' : 'text-inkSoft'
                      }`}
                    >
                      {institutionMetric.materialFindings ? <AlertTriangle size={9} /> : null}
                      {institutionMetric.findings} open
                    </span>
                  </div>
                  <ArrowRight size={12} className="hidden text-muted sm:block" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:col-span-4">
          <section className="panel">
            <div className="border-b border-line px-4 py-3.5">
              <SectionHeading overline="Decision readiness" title="Gates still open" />
            </div>
            <div className="divide-y divide-line">
              {[
                {
                  label: 'Verification confirmation',
                  value: metrics.awaitingVerification,
                  detail: 'No independent demo confirmation yet',
                  to: '/app/verification',
                  icon: ClipboardCheck,
                  tone: 'warning',
                },
                {
                  label: 'Unresolved material findings',
                  value: materialFindings,
                  detail: 'Critical or high — can block release',
                  to: '/app/verification?view=findings&severity=critical',
                  icon: ShieldAlert,
                  tone: 'critical',
                },
                {
                  label: 'Release sign-off pending',
                  value: metrics.pendingRelease,
                  detail: 'At release stage without approval',
                  to: '/app/lifecycle',
                  icon: GitBranch,
                  tone: 'warning',
                },
              ].map((gate) => {
                const Icon = gate.icon
                return (
                  <Link
                    key={gate.label}
                    to={gate.to}
                    className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-copper/[0.025]"
                  >
                    <Icon
                      size={14}
                      className={`mt-0.5 shrink-0 ${
                        gate.tone === 'critical' ? 'text-critical' : 'text-warning'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[10.5px] font-medium text-ink">{gate.label}</span>
                        <span className="font-mono text-[14px] text-ink">{gate.value}</span>
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-relaxed text-muted">
                        {gate.detail}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
            <div className="border-t border-line bg-copper/[0.025] px-4 py-2.5 text-[9px] leading-relaxed text-muted">
              These are separate gates. Clearing one does not clear the others.
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3.5">
              <SectionHeading overline="Evidence coverage" title="Fields with support" />
            </div>
            <div className="px-4 py-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="font-display text-[30px] leading-none text-ink">{coverage.percent}%</div>
                  <div className="mt-1 text-[9.5px] text-muted">
                    {coverage.complete} of {coverage.total} fields internally consistent
                  </div>
                </div>
                <StatusBadge tone={coverage.missing ? 'warning' : 'success'} dot={false}>
                  {coverage.missing ? `${coverage.missing} missing` : 'Complete'}
                </StatusBadge>
              </div>
              <Progress value={coverage.percent} className="mt-3" tone={coverage.missing ? 'warning' : 'success'} />
              <div className="mt-3 flex items-center justify-between text-[9px] text-muted">
                <span>{coverage.confirmed} demo confirmations</span>
                <span>{formatNumber(coverage.total)} tracked fields</span>
              </div>
            </div>
            <div className="border-t border-line">
              <div className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Lowest coverage records
              </div>
              {lowCoverage.map(({ instrument, coverage: row }) => (
                <Link
                  key={instrument.id}
                  to={`/app/instruments/${instrument.id}?tab=evidence`}
                  className="flex items-center justify-between gap-3 border-t border-line/60 px-4 py-2.5 transition-colors hover:bg-copper/[0.025]"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[9.5px] text-forest">{instrument.id}</span>
                    <span className="block truncate text-[9px] text-muted">{instrument.institutionName}</span>
                  </span>
                  <span
                    className={`font-mono text-[10px] ${
                      row.percent < 50 ? 'text-critical' : row.percent < 80 ? 'text-warning' : 'text-success'
                    }`}
                  >
                    {row.percent}%
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3.5">
              <SectionHeading overline="Retained history" title="Recent decisions" />
            </div>
            <ol className="divide-y divide-line">
              {recentAudit.map((event) => (
                <li key={event.id} className="flex items-start gap-2.5 px-4 py-3">
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      event.outcome === 'blocked'
                        ? 'bg-critical'
                        : event.outcome === 'success'
                          ? 'bg-success'
                          : 'bg-warning'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[10px] leading-relaxed text-inkSoft">{event.summary}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8.5px] text-muted">
                      <span>{event.actorName}</span>
                      <span className="text-lineStrong">/</span>
                      <span className="font-mono">{formatDate(event.timestamp, 'dd MMM · HH:mm')}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="border-t border-line px-4 py-2.5">
              <Link
                to="/app/governance?view=audit"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-forest hover:text-copper"
              >
                Inspect audit chain <ArrowRight size={10} />
              </Link>
            </div>
          </section>

          <div className="border border-warning/25 bg-warning/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-warning">
              <FileSearch size={12} /> Interpretation limit
            </div>
            <p className="mt-1 text-[9.5px] leading-relaxed text-inkSoft">
              Integrity findings are explainable review prompts, not fraud conclusions. Evidence
              confirmations are simulated and never imply a bank response.
            </p>
          </div>

          <div className="flex items-center gap-2 border border-success/25 bg-success/[0.03] px-4 py-3 text-[9.5px] leading-relaxed text-inkSoft">
            <ShieldCheck size={13} className="shrink-0 text-success" />
            {formatCurrency(metrics.activeExposure)} active exposure across {metrics.activeInstruments}{' '}
            active records.
          </div>
        </aside>
      </div>
    </div>
  )
}
