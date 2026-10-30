import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Plus, MapPin, UserRound, AlertTriangle } from 'lucide-react'
import { PageHeader, SearchInput, EmptyState, SectionHeading } from '../components/shared/ui'
import { InstitutionStatusBadge, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { institutionMetrics, institutionAttentionRank } from '../utils/selectors'
import { can, PERMISSIONS } from '../data/users'
import { formatCompactCurrency, formatNumber } from '../utils/format'
import { InstitutionFormDialog } from '../components/institutions/InstitutionFormDialog'

const CATEGORIES = ['Engineering', 'Management', 'University', 'Applied Arts', 'Design', 'Sciences', 'Pharmacy', 'Architecture']

export default function Institutions() {
  const state = useDemoState()
  const user = useCurrentUser()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const canManage = can(user.role, PERMISSIONS.INSTITUTION_MANAGE)

  const scoped = useMemo(
    () =>
      user.role === 'officer'
        ? state.institutions.filter((institution) => institution.id === user.institutionId)
        : state.institutions,
    [state.institutions, user],
  )

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return scoped
      .filter((institution) => {
        if (category && institution.category !== category) return false
        if (status && institution.status !== status) return false
        if (
          value &&
          [institution.id, institution.name, institution.shortName, institution.city, institution.state, institution.officer]
            .join(' ')
            .toLowerCase()
            .includes(value)
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => institutionAttentionRank(state, b) - institutionAttentionRank(state, a))
  }, [scoped, query, category, status, state])

  const totals = scoped.reduce(
    (acc, institution) => {
      const metrics = institutionMetrics(state, institution)
      acc.exposure += metrics.exposure
      acc.instruments += metrics.instruments
      acc.pendingVerification += metrics.pendingVerification
      acc.materialFindings += metrics.materialFindings
      return acc
    },
    { exposure: 0, instruments: 0, pendingVerification: 0, materialFindings: 0 },
  )

  return (
    <div>
      <PageHeader
        overline="Oversight · Institution register"
        title="Institutions"
        description="Synthetic institutions participating in the FDR custody demo. Exposure and attention indicators are derived from local instrument and finding state — they are not regulatory ratings."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{scoped.length} institutions</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{formatCompactCurrency(totals.exposure)} aggregate exposure</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{formatNumber(totals.materialFindings)} material finding(s)</span>
          </>
        }
        actions={
          canManage ? (
            <button type="button" className="btn-dark" onClick={() => setFormOpen(true)}>
              <Plus size={14} /> Register institution
            </button>
          ) : (
            <StatusBadge tone="neutral">Read-only institution register</StatusBadge>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Institutions', scoped.length, `${scoped.filter((item) => item.status === 'active').length} active`],
          ['Instruments', totals.instruments, 'Synthetic FDR records'],
          ['Pending verification', totals.pendingVerification, 'Not demo-confirmed'],
          ['Aggregate exposure', formatCompactCurrency(totals.exposure), 'Principal across all instruments'],
        ].map(([label, value, detail]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="overline mb-1">{label}</div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 border border-line bg-raised px-4 py-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search institution, city, officer…" className="min-w-[240px] flex-1" />
        <select className="select w-auto" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter category">
          <option value="">All categories</option>
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <select className="select w-auto" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter relationship status">
          <option value="">All relationship states</option>
          <option value="active">Active</option>
          <option value="attention">Attention</option>
          <option value="under_review">Under review</option>
          <option value="probation">Probation</option>
        </select>
        <span className="ml-auto font-mono text-[9px] text-muted">
          Ordered by derived attention indicator
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Building2}
            title="No institutions match"
            message="Clear the filters or register a synthetic institution."
            action={canManage ? (
              <button type="button" className="btn-secondary btn-sm" onClick={() => setFormOpen(true)}>
                <Plus size={12} /> Register institution
              </button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((institution) => {
            const metrics = institutionMetrics(state, institution)
            const attention = institutionAttentionRank(state, institution)
            return (
              <article key={institution.id} className="panel flex flex-col transition-shadow hover:shadow-panel">
                <div className="border-b border-line px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[9px] text-muted">{institution.id} · {institution.code}</div>
                      <h2 className="mt-1 font-display text-[18px] leading-tight text-ink">
                        <Link to={`/app/institutions/${institution.id}`} className="hover:text-forest">
                          {institution.shortName}
                        </Link>
                      </h2>
                      <div className="mt-0.5 truncate text-[10px] text-muted">{institution.name}</div>
                    </div>
                    <InstitutionStatusBadge status={institution.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-muted">
                    <span className="inline-flex items-center gap-1"><MapPin size={9} /> {institution.city}, {institution.state}</span>
                    <span className="inline-flex items-center gap-1"><UserRound size={9} /> {institution.officer}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5">
                  <div>
                    <div className="overline mb-0.5">Exposure</div>
                    <div className="font-display text-lg text-ink">{formatCompactCurrency(metrics.exposure)}</div>
                  </div>
                  <div>
                    <div className="overline mb-0.5">Instruments</div>
                    <div className="font-mono text-[13px] text-ink">{metrics.instruments}</div>
                  </div>
                  <div>
                    <div className="overline mb-0.5">Pending verification</div>
                    <div className={`font-mono text-[13px] ${metrics.pendingVerification ? 'text-warning' : 'text-ink'}`}>
                      {metrics.pendingVerification}
                    </div>
                  </div>
                  <div>
                    <div className="overline mb-0.5">Material findings</div>
                    <div className={`inline-flex items-center gap-1 font-mono text-[13px] ${metrics.materialFindings ? 'text-critical' : 'text-ink'}`}>
                      {metrics.materialFindings ? <AlertTriangle size={11} /> : null}
                      {metrics.materialFindings}
                    </div>
                  </div>
                </div>

                <div className="mt-auto border-t border-line px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted">
                      Attention index
                      <span className={`${attention >= 12 ? 'text-critical' : attention >= 6 ? 'text-warning' : 'text-muted'}`}>
                        {Math.round(attention)}
                      </span>
                    </span>
                    <Link to={`/app/institutions/${institution.id}`} className="inline-flex items-center gap-1 text-[10px] font-medium text-forest hover:text-copper">
                      Open profile <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[9px] text-muted">
        <span>
          The attention indicator combines material findings, pending verification, upcoming maturity,
          and relationship status. It is an operational sort key, not a fraud score.
        </span>
        <span className="font-mono">SYNTHETIC · {state.institutions.length} institutions</span>
      </div>

      <InstitutionFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  )
}
