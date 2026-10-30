import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, ScrollText, ShieldCheck, ShieldAlert } from 'lucide-react'
import { PageHeader, InfoNote } from '../components/shared/ui'
import { AuditPanel } from '../components/audit/AuditPanel'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { getAuditEvents } from '../services/auditService'
import { verifyAuditChain } from '../utils/hash'
import { buildDeadlineActions } from '../services/deadlineEngine'
import { getUserById } from '../data/users'

export default function Audit() {
  const state = useDemoState()
  const user = useCurrentUser()
  const [searchParams] = useSearchParams()
  const allEvents = getAuditEvents(state)
  const chain = verifyAuditChain(state.auditEvents)
  const entity = searchParams.get('entity')

  const scoped = useMemo(() => {
    if (user.role !== 'officer') return allEvents
    const institutions = state.institutions.filter((institution) => institution.id === user.institutionId)
    const ownInstruments = state.instruments.filter((instrument) => instrument.institutionId === user.institutionId)
    const instrumentIds = new Set(ownInstruments.map((instrument) => instrument.id))
    const evidenceIds = new Set(
      state.evidence.filter((record) => instrumentIds.has(record.instrumentId)).map((record) => record.id),
    )
    const findingIds = new Set(
      state.findings
        .filter((finding) => instrumentIds.has(finding.instrumentId))
        .map((finding) => finding.id),
    )
    const deadlineIds = new Set(
      buildDeadlineActions(state)
        .filter((action) => action.institutionId === user.institutionId)
        .map((action) => action.id),
    )
    const institutionIds = new Set(institutions.map((institution) => institution.id))
    return allEvents.filter((event) => {
      if (instrumentIds.has(event.entityId)) return true
      if (evidenceIds.has(event.entityId)) return true
      if (findingIds.has(event.entityId)) return true
      if (deadlineIds.has(event.entityId)) return true
      if (event.entityType === 'institution' && institutionIds.has(event.entityId)) return true
      return [...instrumentIds].some((id) => event.summary?.includes(id))
    })
  }, [allEvents, state, user])

  const visible = useMemo(() => {
    if (!entity) return scoped
    const term = entity.toLowerCase()
    return scoped.filter(
      (event) =>
        event.entityId?.toLowerCase() === term ||
        event.summary?.toLowerCase().includes(term),
    )
  }, [scoped, entity])

  const blocked = visible.filter((event) => event.outcome === 'blocked').length
  const actors = new Set(visible.map((event) => event.actorId)).size

  return (
    <div>
      <PageHeader
        overline="Governance · Append-only local history"
        title="Audit Trail"
        description="Inspect who did what, when, from which prior state, with what reason. Every consequential demo action is recorded, including blocked transitions. The chain detects local tampering but is not production cryptography."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{visible.length} event(s) visible</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{actors} distinct actor(s)</span>
            <span className="text-lineStrong">·</span>
            <span className={`text-[10.5px] ${chain.valid ? 'text-success' : 'text-critical'}`}>
              {chain.valid ? 'Chain verified' : 'Chain broken'}
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{blocked} blocked attempt(s)</span>
          </>
        }
      />

      {entity && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border border-copper/30 bg-copper/[0.035] px-3.5 py-2">
          <span className="text-[10px] text-inkSoft">
            Showing events linked to <span className="font-mono text-ink">{entity}</span>. Matches use
            the entity ID or a summary reference.
          </span>
          <Link
            to="/app/governance?view=audit"
            className="text-[9.5px] font-medium text-copper-dark hover:text-ink"
          >
            Clear entity filter
          </Link>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total events', allEvents.length, 'All local demo events', ScrollText, 'text-forest'],
          ['Chain status', chain.valid ? 'Valid' : 'Broken', `${chain.checked} event hashes checked`, chain.valid ? ShieldCheck : ShieldAlert, chain.valid ? 'text-success' : 'text-critical'],
          ['Blocked attempts', blocked, 'Policy or permission denied', Lock, 'text-critical'],
          ['Visible scope', visible.length, entity ? 'Filtered to selected entity' : user.role === 'officer' ? 'Limited to your institution' : 'Organisation-wide', ShieldCheck, 'text-forest'],
        ].map(([label, value, detail, Icon, tone]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="flex items-start justify-between">
              <div className="overline mb-1">{label}</div>
              <Icon size={14} className={tone} />
            </div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <InfoNote tone="copper" className="mb-5" title="Integrity versus authenticity">
        The hash chain is a deterministic FNV-1a checksum over local events. It can show that stored
        events are internally consistent, but it is not a digital signature, trusted timestamp, or
        substitute for an append-only server audit store. Actors are selected in the demo; no
        authentication is performed.
      </InfoNote>

      <AuditPanel
        events={visible}
        entityId={entity || (user.role === 'officer' ? user.institutionId : null)}
        showEntity
        title={entity ? 'Entity history' : 'All audit events'}
        chain={chain}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[9.5px] text-muted">
        <span>
          Actors: {[...new Set(visible.map((event) => event.actorName))].slice(0, 6).join(' · ')}
          {new Set(visible.map((event) => event.actorName)).size > 6 ? ' · …' : ''}
        </span>
        <span className="font-mono">
          Current role {user.role} · {user.name}
          {getUserById(state.settings.currentUserId) ? '' : ' · demo persona'}
        </span>
      </div>
    </div>
  )
}
