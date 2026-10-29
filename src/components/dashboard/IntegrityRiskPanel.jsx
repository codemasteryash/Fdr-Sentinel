import { Link } from 'react-router-dom'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { FINDING_CATEGORY_LABELS } from '../../data/statuses'
import { SeverityBadge } from '../shared/StatusBadge'
import { Progress } from '../shared/ui'

export function IntegrityRiskPanel({ findings, stats }) {
  const active = findings.filter((finding) =>
    ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
  )
  const top = [...active]
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 }
      return rank[a.severity] - rank[b.severity]
    })
    .slice(0, 4)
  const max = Math.max(1, stats.critical + stats.high + stats.unreviewed + stats.resolved)
  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="overline">Integrity risk</div>
          <h2 className="font-display text-lg text-ink">Unresolved signals</h2>
        </div>
        <Link to="/integrity" className="btn-icon h-6 w-6" aria-label="Open integrity intelligence">
          <ArrowRight size={13} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-px bg-line">
        {[
          { label: 'Critical', value: stats.critical, tone: 'critical' },
          { label: 'High', value: stats.high, tone: 'warning' },
          { label: 'Unreviewed', value: stats.unreviewed, tone: 'copper' },
          { label: 'Resolved', value: stats.resolved, tone: 'success' },
        ].map((item) => (
          <div key={item.label} className="bg-raised px-3.5 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
              {item.label}
            </div>
            <div className="mt-1 font-display text-xl text-ink">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2.5 border-b border-line px-4 py-3">
        <Progress
          value={Math.round((stats.resolved / max) * 100)}
          label="Review completion (resolved vs all)"
          tone="forest"
        />
      </div>
      <ul className="divide-y divide-line/70">
        {top.map((finding) => (
          <li key={finding.id}>
            <Link
              to={`/integrity?finding=${finding.id}`}
              className="block px-4 py-2.5 transition-colors hover:bg-copper/[0.03]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-muted">{finding.id}</span>
                <SeverityBadge severity={finding.severity} />
              </div>
              <div className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-ink">
                {finding.title}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                {finding.instrumentId} · {FINDING_CATEGORY_LABELS[finding.category]}
              </div>
            </Link>
          </li>
        ))}
        {top.length === 0 && (
          <li className="flex items-center gap-2 px-4 py-6 text-[11px] text-muted">
            <ShieldAlert size={14} /> No unresolved findings.
          </li>
        )}
      </ul>
    </section>
  )
}
