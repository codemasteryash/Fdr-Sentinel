import { Link } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { auditActionLabel, auditActionTone } from '../../services/auditService'
import { TONE_DOT } from '../../data/tones'

export function RecentAudit({ events }) {
  const recent = [...events]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6)

  return (
    <section className="panel flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="overline">Decision history</div>
          <h2 className="font-display text-lg text-ink">Recent audit events</h2>
        </div>
        <Link to="/app/governance?view=audit" className="btn-icon h-6 w-6" aria-label="Open audit trail">
          <ArrowRight size={13} />
        </Link>
      </div>
      <ol className="flex-1 px-4 py-3">
        {recent.map((event) => {
          const tone = auditActionTone(event.action, event.outcome)
          return (
            <li key={event.id} className="relative flex gap-3 pb-3.5 last:pb-0">
              <span className="absolute left-[3px] top-3 h-full w-px bg-line last:hidden" />
              <span className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${TONE_DOT[tone]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10.5px] font-semibold text-ink">
                    {auditActionLabel(event.action)}
                  </span>
                  <span className="shrink-0 text-[9px] text-muted">
                    {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                  {event.summary}
                </p>
                <div className="mt-0.5 font-mono text-[9px] text-muted/80">
                  {event.actorName} · {event.role}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="border-t border-line px-4 py-2 text-[9.5px] text-muted">
        Each event carries a local checksum chain link.
      </div>
    </section>
  )
}
