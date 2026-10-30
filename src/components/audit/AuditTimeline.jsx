import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { auditActionLabel, auditActionTone } from '../../services/auditService'
import { formatDateTime } from '../../utils/format'
import { StatusBadge } from '../shared/StatusBadge'
import { TONE_DOT } from '../../data/tones'

const ROLE_LABELS = {
  admin: 'Administrator',
  officer: 'Institution Officer',
  reviewer: 'Verification Reviewer',
  approver: 'Approving Authority',
  auditor: 'Auditor',
  system: 'System engine',
}

function EventState({ previousState, newState }) {
  if (!previousState && !newState) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] text-muted">
      {previousState && <span className="border border-line bg-paper px-1 py-0.5">{previousState}</span>}
      {previousState && <span>→</span>}
      {newState && <span className="border border-line bg-paper px-1 py-0.5 text-inkSoft">{newState}</span>}
    </div>
  )
}

export function AuditTimeline({ events, compact = false, showEntity = false }) {
  const [copied, setCopied] = useState(null)

  const copyHash = async (event) => {
    try {
      await navigator.clipboard.writeText(event.hash)
      setCopied(event.id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied(null)
    }
  }

  if (!events.length) {
    return (
      <div className="border border-line bg-paper/40 px-4 py-8 text-center text-[11.5px] text-muted">
        No audit events recorded for this view.
      </div>
    )
  }

  return (
    <ol className="relative">
      {events.map((event, index) => {
        const tone = auditActionTone(event.action, event.outcome)
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < events.length - 1 && (
              <span className="absolute left-[5px] top-4 h-[calc(100%-0.5rem)] w-px bg-line" aria-hidden="true" />
            )}
            <span
              className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-raised ${
                TONE_DOT[tone] ?? TONE_DOT.neutral
              }`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11.5px] font-semibold text-ink">
                    {auditActionLabel(event.action)}
                  </span>
                  {event.outcome === 'blocked' && (
                    <StatusBadge tone="critical" dot={false} className="px-1 py-0 text-[8.5px]">
                      Blocked
                    </StatusBadge>
                  )}
                </div>
                <time className="shrink-0 font-mono text-[9.5px] text-muted" dateTime={event.timestamp}>
                  {formatDateTime(event.timestamp)}
                </time>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-inkSoft">{event.summary}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9.5px] text-muted">
                <span>{event.actorName}</span>
                <span>·</span>
                <span>{ROLE_LABELS[event.role] ?? event.role}</span>
                <span>·</span>
                <span className="font-mono">{event.id}</span>
                {showEntity && (
                  <>
                    <span>·</span>
                    {event.entityType === 'instrument' ? (
                      <Link
                        to={`/app/instruments/${event.entityId}`}
                        className="inline-flex items-center gap-0.5 font-mono text-forest hover:text-copper"
                      >
                        {event.entityId} <ExternalLink size={8} />
                      </Link>
                    ) : (
                      <span className="font-mono">{event.entityId}</span>
                    )}
                  </>
                )}
              </div>
              {event.reason && !compact && (
                <p className="mt-1.5 border-l-2 border-line pl-2 text-[10.5px] italic leading-relaxed text-muted">
                  {event.reason}
                </p>
              )}
              <EventState previousState={event.previousState} newState={event.newState} />
              {!compact && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[8.5px] text-muted/80">
                    hash {event.hash?.slice(0, 14)}…
                  </span>
                  <button
                    type="button"
                    onClick={() => copyHash(event)}
                    className="inline-flex items-center gap-0.5 text-[8.5px] text-muted transition-colors hover:text-forest"
                    aria-label={`Copy hash for ${event.id}`}
                  >
                    {copied === event.id ? <Check size={9} /> : <Copy size={9} />}
                    {copied === event.id ? 'Copied' : 'Copy'}
                  </button>
                  <span className="text-[8.5px] text-muted/60">prev {event.previousEventHash?.slice(0, 10)}…</span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
