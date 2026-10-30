import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ShieldCheck, ScanSearch, Scale } from 'lucide-react'
import { PageHeader, InfoNote, SearchInput, EmptyState } from '../components/shared/ui'
import { SeverityBadge, FindingStatusBadge, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { getFindingStats } from '../services/findingService'
import { FINDING_CATEGORY_LABELS, FINDING_STATUS_LABELS } from '../data/statuses'
import { formatCurrency } from '../utils/format'
import { FindingDrawer } from '../components/integrity/FindingDrawer'

const ACTIVE = ['open', 'in_review', 'confirmed']

export default function Integrity() {
  const state = useDemoState()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('active')
  const [category, setCategory] = useState('')

  const stats = getFindingStats(state)
  const openFindingId = searchParams.get('finding')
  const openFinding = state.findings.find((finding) => finding.id === openFindingId) ?? null

  const forms = useMemo(() => {
    const value = query.trim().toLowerCase()
    return state.findings.filter((finding) => {
      if (severity && finding.severity !== severity) return false
      if (status === 'active' && !ACTIVE.includes(finding.reviewStatus)) return false
      if (status && status !== 'active' && finding.reviewStatus !== status) return false
      if (category && finding.category !== category) return false
      if (
        value &&
        ![finding.id, finding.title, finding.instrumentId, finding.relatedInstrumentId, finding.category, finding.rule]
          .join(' ')
          .toLowerCase()
          .includes(value)
      ) {
        return false
      }
      return true
    })
  }, [state.findings, query, severity, status, category])

  const setOpen = (findingId) => {
    const params = new URLSearchParams(searchParams)
    if (findingId) params.set('finding', findingId)
    else params.delete('finding')
    setSearchParams(params, { replace: true })
  }

  const categories = [...new Set(state.findings.map((finding) => finding.category))]

  return (
    <div>
      <PageHeader
        overline="Integrity · Explainable risk signals"
        title="Integrity Review"
        description="Investigate duplicate references, OCR variants, amount and date inconsistencies, and lifecycle policy signals. Findings are prompts for human review — never automated conclusions of fraud."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{stats.active} active findings</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-critical">{stats.critical} critical</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{stats.resolved} closed and retained</span>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Open / unreviewed', stats.unreviewed, 'Requires a reviewer decision', 'critical'],
          ['In review', stats.inReview, 'Assigned or evidence requested', 'warning'],
          ['Confirmed discrepancy', stats.confirmed, 'Human-confirmed; blockers remain', 'critical'],
          ['Resolved / false positive', stats.resolved, 'Retained in audit history', 'success'],
        ].map(([label, value, detail, tone]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="flex items-start justify-between">
              <div className="overline mb-1">{label}</div>
              <span className={`dot ${tone === 'critical' ? 'bg-critical' : tone === 'warning' ? 'bg-warning' : 'bg-success'}`} />
            </div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <InfoNote tone="copper" className="mb-5" title="Human decision required">
        A reference match is evidence of an identifier relationship, not proof that a duplication
        occurred. Confirm the original bank advice and record a reasoned decision before any record
        proceeds to release.
      </InfoNote>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-9">
          <section className="panel overflow-hidden">
            <div className="grid gap-3 border-b border-line px-4 py-3 sm:grid-cols-4">
              <SearchInput value={query} onChange={setQuery} placeholder="Search finding, record, rule…" />
              <select className="select" value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter severity">
                <option value="">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status">
                <option value="active">Active cases</option>
                <option value="">All statuses</option>
                {Object.entries(FINDING_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select className="select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter category">
                <option value="">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {FINDING_CATEGORY_LABELS[value] ?? value}
                  </option>
                ))}
              </select>
            </div>

            {forms.length === 0 ? (
              <EmptyState
                icon={ScanSearch}
                title="No findings match this view"
                message="Try clearing filters. Closed findings remain available in the all-statuses view."
              />
            ) : (
              <ul className="divide-y divide-line">
                {forms.map((finding) => {
                  const instrument = state.instruments.find((item) => item.id === finding.instrumentId)
                  return (
                    <li key={finding.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(finding.id)}
                        className="group block w-full px-4 py-4 text-left transition-colors hover:bg-paper/50"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[9.5px] text-muted">{finding.id}</span>
                            <SeverityBadge severity={finding.severity} />
                            <FindingStatusBadge status={finding.reviewStatus} />
                            <span className="border border-line bg-paper px-1.5 py-0.5 font-mono text-[8px] text-muted">
                              {finding.confidence}%
                            </span>
                          </div>
                          <ArrowRight size={13} className="mt-0.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-forest" />
                        </div>
                        <h3 className="mt-2 text-[12.5px] font-semibold leading-snug text-ink">
                          {finding.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                          {finding.explanation}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-muted">
                          <span className="font-mono">{finding.instrumentId}</span>
                          {instrument && <span>{instrument.institutionName}</span>}
                          {instrument && <span>{formatCurrency(instrument.amount)}</span>}
                          {finding.relatedInstrumentId && (
                            <span className="inline-flex items-center gap-1">
                              <Scale size={9} /> linked {finding.relatedInstrumentId}
                            </span>
                          )}
                          <span className="ml-auto font-mono text-[8.5px] text-muted/70">{finding.rule}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="border-t border-line bg-paper/30 px-4 py-2 text-[9.5px] text-muted">
              Showing {forms.length} of {state.findings.length} findings. Select a case to review the
              explanation, affected records, and recommended action.
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:col-span-3">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <div className="overline mb-1">Rule coverage</div>
              <h2 className="font-display text-lg text-ink">Detected categories</h2>
            </div>
            <ul className="divide-y divide-line">
              {Object.entries(
                state.findings.reduce((acc, finding) => {
                  acc[finding.category] = (acc[finding.category] ?? 0) + 1
                  return acc
                }, {}),
              ).map(([key, count]) => (
                <li key={key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-[10px] text-inkSoft">
                    {FINDING_CATEGORY_LABELS[key] ?? key}
                  </span>
                  <span className="font-mono text-[10px] text-muted">{count}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="border border-success/25 bg-success/[0.03] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-success">
              <ShieldCheck size={12} /> Deterministic engine
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              Rules are explicit and reproducible. No opaque model decides a duplicate. Thresholds are
              visible in Settings and every run produces audit evidence.
            </p>
          </div>

          <div className="border border-warning/25 bg-warning/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-warning">
              <AlertTriangle size={12} /> Residual risk
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              A different branch, a reissued instrument, or a typo can produce a false positive. Review
              source evidence before confirming.
            </p>
          </div>

          <div className="border border-line bg-paper/40 px-4 py-3">
            <div className="overline mb-1">Demo status</div>
            <StatusBadge tone="copper" dot={false}>Synthetic findings</StatusBadge>
            <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
              No AICTE, bank, or law-enforcement data is used. Findings exist to demonstrate the
              workflow.
            </p>
          </div>
        </aside>
      </div>

      <FindingDrawer
        finding={openFinding}
        state={state}
        open={Boolean(openFinding)}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}
