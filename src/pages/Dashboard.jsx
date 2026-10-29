import { Link } from 'react-router-dom'
import { Plus, PlayCircle, ArrowUpRight, ShieldCheck, TrendingUp } from 'lucide-react'
import { PageHeader } from '../components/shared/ui'
import { MetricGrid } from '../components/dashboard/MetricGrid'
import { PriorityQueue } from '../components/dashboard/PriorityQueue'
import { IntegrityRiskPanel } from '../components/dashboard/IntegrityRiskPanel'
import { StatusDonut } from '../components/dashboard/StatusDonut'
import { MaturityTimeline } from '../components/dashboard/MaturityTimeline'
import { AttentionInstitutions } from '../components/dashboard/AttentionInstitutions'
import { RecentAudit } from '../components/dashboard/RecentAudit'
import { DemoPathPanel } from '../components/dashboard/DemoPathPanel'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import {
  dashboardMetrics,
  statusDistributionChart,
  upcomingMaturityTimeline,
} from '../utils/selectors'
import { getFindingStats } from '../services/findingService'
import { buildDeadlineActions } from '../services/deadlineEngine'
import { ROLES } from '../data/users'
import { formatCompactCurrency, formatDateTime, formatNumber } from '../utils/format'

export default function Dashboard() {
  const state = useDemoState()
  const user = useCurrentUser()
  const metrics = dashboardMetrics(state)
  const findingStats = getFindingStats(state)
  const actions = buildDeadlineActions(state)
  const statusData = statusDistributionChart(state)
  const buckets = upcomingMaturityTimeline(state, 8)
  const totalExposure = metrics.totalExposure

  return (
    <div>
      <PageHeader
        overline="AICTE · FDR operations"
        title="Instrument integrity at a glance"
        description="A single operational view of institutional security deposits, evidence confidence, and policy-enforced lifecycle actions. Every figure on this page is derived from the local synthetic dataset."
        meta={
          <>
            <span className="flex items-center gap-1.5 text-[10.5px] text-muted">
              <span className="h-1 w-1 rounded-full bg-success" />
              Seeded demo loaded
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              {metrics.instruments} instruments · {formatCompactCurrency(totalExposure)} exposure
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              Previewing as{' '}
              <span className="font-medium text-inkSoft">{ROLES[user.role]?.shortLabel}</span>
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              Updated {formatDateTime(state.meta.updatedAt)}
            </span>
          </>
        }
        actions={
          <>
            <Link to="/demo-scenarios" className="btn-secondary">
              <PlayCircle size={14} /> Explore demo
            </Link>
            <Link to="/instruments/new" className="btn-dark">
              <Plus size={14} /> Register FDR
            </Link>
          </>
        }
      />

      <MetricGrid metrics={metrics} />

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <PriorityQueue actions={actions} limit={7} />
        </div>
        <div className="flex flex-col gap-5 xl:col-span-4">
          <DemoPathPanel />
          <IntegrityRiskPanel findings={state.findings} stats={findingStats} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <StatusDonut data={statusData} total={state.instruments.length} />
        </div>
        <div className="xl:col-span-7">
          <MaturityTimeline buckets={buckets} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <AttentionInstitutions state={state} />
        </div>
        <div className="xl:col-span-5">
          <RecentAudit events={state.auditEvents} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={11} className="text-success" />
            Integrity checks are deterministic browser rules, not AI or bank verification.
          </span>
          <span className="text-lineStrong">/</span>
          <span className="flex items-center gap-1.5">
            <TrendingUp size={11} className="text-copper" />
            {formatNumber(findingStats.resolved)} findings resolved with history retained
          </span>
        </div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1 font-medium text-forest hover:text-copper"
        >
          Open analytics <ArrowUpRight size={11} />
        </Link>
      </div>
    </div>
  )
}
