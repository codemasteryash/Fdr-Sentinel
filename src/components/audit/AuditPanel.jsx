import { useMemo, useState } from 'react'
import { Download, ShieldCheck, ShieldAlert, Link2, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { AuditTimeline } from './AuditTimeline'
import { exportAudit } from '../../services/exportService'
import { verifyAuditChain } from '../../utils/hash'
import { SectionHeading, SearchInput } from '../shared/ui'
import { StatusBadge } from '../shared/StatusBadge'
import { auditActionLabel } from '../../services/auditService'

export function AuditPanel({ events, entityId, showEntity = false, title = 'Audit trail' }) {
  const [query, setQuery] = useState('')
  const chain = useMemo(() => verifyAuditChain(events), [events])
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return events
    return events.filter((event) =>
      [
        event.id,
        event.actorName,
        event.action,
        auditActionLabel(event.action),
        event.summary,
        event.reason,
        event.entityId,
      ]
        .join(' ')
        .toLowerCase()
        .includes(value),
    )
  }, [events, query])

  const handleExport = () => {
    exportAudit(filtered)
    toast.success('Audit CSV exported', { description: `${filtered.length} event(s), generated locally.` })
  }

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="panel px-4 py-3">
          <div className="overline mb-1">Events</div>
          <div className="font-display text-2xl text-ink">{events.length}</div>
          <div className="text-[9.5px] text-muted">{entityId ? `Scoped to ${entityId}` : 'All demo events'}</div>
        </div>
        <div className="panel px-4 py-3">
          <div className="overline mb-1">Chain verification</div>
          <div className="mt-1">
            <StatusBadge tone={chain.valid ? 'success' : 'critical'}>
              {chain.valid ? 'Chain valid' : `${chain.broken.length} broken`}
            </StatusBadge>
          </div>
          <div className="mt-1 text-[9.5px] text-muted">{chain.checked} hashes checked locally</div>
        </div>
        <div className="panel px-4 py-3">
          <div className="overline mb-1">Assurance limit</div>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-inkSoft">
            <ShieldAlert size={13} className="text-copper" /> FNV-1a demo checksum
          </div>
          <div className="mt-1 text-[9.5px] leading-relaxed text-muted">
            Detects local tampering; not production cryptography.
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <SectionHeading
            overline="Append-only history"
            title={title}
            description={
              entityId
                ? 'Events for this entity and events whose summary references it, newest first.'
                : 'Newest first. Each event stores the previous hash and its own chained checksum.'
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Filter actor, action, summary…"
              className="w-56"
            />
            <button type="button" className="btn-secondary btn-xs" onClick={handleExport}>
              <Download size={11} /> Export
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-paper/40 px-4 py-2 text-[9.5px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Link2 size={10} /> previous hash stored per event
          </span>
          <span className="inline-flex items-center gap-1">
            <Hash size={10} /> deterministic FNV-1a
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={10} /> {chain.valid ? 'all stored hashes match' : 'chain verification failed'}
          </span>
        </div>
        <div className="px-4 py-5">
          <AuditTimeline events={filtered} showEntity={showEntity} />
        </div>
      </div>
    </div>
  )
}
