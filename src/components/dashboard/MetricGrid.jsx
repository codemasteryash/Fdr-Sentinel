import { Link } from 'react-router-dom'
import {
  Building2,
  FileText,
  ClipboardCheck,
  ShieldAlert,
  CalendarClock,
  TimerOff,
  LogOut,
  AlertTriangle,
} from 'lucide-react'
import { formatCompactCurrency } from '../../utils/format'

const CELLS = (metrics) => [
  {
    label: 'Institutions',
    value: metrics.institutions,
    detail: `${metrics.activeInstitutions} active · ${metrics.institutions - metrics.activeInstitutions} under review`,
    icon: Building2,
    to: '/app/governance?view=institutions',
  },
  {
    label: 'Registered FDRs',
    value: metrics.instruments,
    detail: `${formatCompactCurrency(metrics.totalExposure)} total exposure`,
    icon: FileText,
    to: '/app/instruments',
  },
  {
    label: 'Awaiting verification',
    value: metrics.awaitingVerification,
    detail: `${metrics.verifiedPercent}% of active instruments confirmed`,
    icon: ClipboardCheck,
    to: '/app/verification',
    tone: metrics.awaitingVerification > 10 ? 'copper' : null,
  },
  {
    label: 'Potential conflicts',
    value: metrics.duplicateConflicts,
    detail: `${metrics.criticalFindings} critical findings to review`,
    icon: ShieldAlert,
    to: '/app/verification?view=findings&severity=critical',
    tone: metrics.duplicateConflicts > 0 ? 'copper' : null,
  },
  {
    label: 'Maturities · 90 days',
    value: metrics.upcomingMaturity,
    detail: 'Action window configured at 90 / 60 / 30 days',
    icon: CalendarClock,
    to: '/app/lifecycle?view=deadlines&type=maturity',
  },
  {
    label: 'Overdue renewals',
    value: metrics.overdueRenewal,
    detail: `${metrics.deadlineOverdue} deadline actions overdue`,
    icon: TimerOff,
    to: '/app/lifecycle?view=deadlines&priority=overdue',
    tone: metrics.overdueRenewal > 0 ? 'critical' : null,
  },
  {
    label: 'Pending releases',
    value: metrics.pendingRelease,
    detail: 'Release requests and approvals in progress',
    icon: LogOut,
    to: '/app/lifecycle',
  },
  {
    label: 'Open findings',
    value: metrics.openFindings,
    detail: `${metrics.instrumentsWithDiscrepancies} instruments with data discrepancies`,
    icon: AlertTriangle,
    to: '/app/verification?view=findings&review=open',
  },
]

export function MetricGrid({ metrics }) {
  return (
    <section aria-label="Key metrics" className="border border-line bg-line">
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
        {CELLS(metrics).map((cell) => {
          const Icon = cell.icon
          return (
            <Link
              key={cell.label}
              to={cell.to}
              className="group relative bg-raised px-4 py-4 transition-colors duration-150 hover:bg-copper/[0.025]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {cell.label}
                </span>
                <Icon
                  size={13}
                  strokeWidth={1.7}
                  className={
                    cell.tone === 'critical'
                      ? 'text-critical/70'
                      : cell.tone === 'copper'
                        ? 'text-copper/80'
                        : 'text-lineStrong group-hover:text-muted'
                  }
                />
              </div>
              <div
                className={`mt-2 font-display text-[30px] font-medium leading-none tracking-[-0.03em] ${
                  cell.tone === 'critical' ? 'text-critical' : 'text-ink'
                }`}
              >
                {cell.value}
              </div>
              <div className="mt-1.5 text-[10px] leading-snug text-muted">{cell.detail}</div>
              {cell.tone && (
                <span
                  className={`absolute bottom-0 left-0 h-[2px] w-8 ${
                    cell.tone === 'critical' ? 'bg-critical/70' : 'bg-copper/70'
                  }`}
                />
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
