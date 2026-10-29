import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getUserById } from '../../data/users'
import { formatDate, relativeDays } from '../../utils/format'
import { PriorityBadge, StatusBadge } from '../shared/StatusBadge'

function targetRoute(action) {
  if (action.type === 'finding') return `/integrity?finding=${action.findingId}`
  if (action.type === 'release') return `/lifecycle/${action.instrumentId}`
  if (action.type === 'verification') return `/verification/${action.instrumentId}`
  if (action.type === 'evidence') return `/instruments/${action.instrumentId}?tab=evidence`
  return `/deadlines?focus=${encodeURIComponent(action.id)}`
}

const STATUS_TONE = {
  open: 'neutral',
  acknowledged: 'info',
  escalated: 'critical',
  completed: 'success',
}

export function PriorityQueue({ actions, limit = 6 }) {
  const rows = actions.slice(0, limit)
  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="overline">Action queue · computed from record dates</div>
          <h2 className="font-display text-lg text-ink">Priority actions</h2>
        </div>
        <Link
          to="/deadlines"
          className="group inline-flex items-center gap-1 text-[10.5px] font-medium text-forest hover:text-copper"
        >
          Full deadline queue
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[680px]">
          <thead>
            <tr>
              <th className="w-[84px]">Priority</th>
              <th>Action &amp; institution</th>
              <th className="w-[132px]">Reason</th>
              <th className="w-[74px]">Due</th>
              <th className="w-[78px]">Reviewer</th>
              <th>Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((action) => {
              const reviewer = getUserById(action.assignedTo)
              return (
                <tr key={action.id}>
                  <td>
                    <PriorityBadge priority={action.priority} />
                  </td>
                  <td>
                    <Link
                      to={targetRoute(action)}
                      className="font-medium text-ink hover:text-copper"
                    >
                      {action.instrumentId}
                    </Link>
                    <div className="mt-0.5 max-w-[250px] truncate text-[10.5px] text-muted">
                      {action.title}
                    </div>
                    <div className="mt-0.5 max-w-[250px] truncate text-[10px] text-muted/80">
                      {action.institutionName}
                    </div>
                  </td>
                  <td>
                    <span className="line-clamp-2 max-w-[170px] text-[10.5px] leading-relaxed text-muted">
                      {action.reason}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="font-mono text-[10.5px] text-inkSoft">
                      {formatDate(action.dueDate, 'dd MMM')}
                    </div>
                    <div
                      className={`text-[10px] ${
                        action.daysRemaining < 0 ? 'font-medium text-critical' : 'text-muted'
                      }`}
                    >
                      {relativeDays(action.dueDate)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-[10.5px]">
                    {reviewer?.name?.split(' ')[0] ?? '—'}
                  </td>
                  <td>
                    <StatusBadge tone={STATUS_TONE[action.status] ?? 'neutral'}>
                      {action.statusLabel}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link
                      to={targetRoute(action)}
                      className="btn-icon h-6 w-6"
                      aria-label={`Open ${action.instrumentId}`}
                    >
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
