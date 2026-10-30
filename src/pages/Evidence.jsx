import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download, FileSearch, ShieldCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, InfoNote, SearchInput, EmptyState } from '../components/shared/ui'
import { EvidenceStatusBadge, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { computeCoverage } from '../services/evidenceService'
import { exportEvidence } from '../services/exportService'
import { formatCurrency, formatDate, formatNumber } from '../utils/format'
import { EVIDENCE_STATUS_LABELS } from '../data/statuses'

const NEEDS_ATTENTION = ['confirmation_pending', 'discrepancy', 'missing', 'ocr_extracted', 'institution_submitted']

function display(record) {
  const raw = record.submittedValue
  if (raw === null || raw === undefined || raw === '') return '—'
  if (record.field === 'amount') return formatCurrency(raw)
  if (record.field === 'issueDate' || record.field === 'maturityDate') return formatDate(raw)
  return String(raw)
}

export default function Evidence() {
  const state = useDemoState()
  const [query, setQuery] = useState('')
  const [institution, setInstitution] = useState('')
  const [status, setStatus] = useState('')
  const [followUpOnly, setFollowUpOnly] = useState(false)
  const coverage = computeCoverage(state.evidence)
  const withInstruments = useMemo(
    () =>
      state.evidence.map((record) => ({
        ...record,
        instrument: state.instruments.find((instrument) => instrument.id === record.instrumentId),
      })),
    [state.evidence, state.instruments],
  )

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return withInstruments.filter((record) => {
      if (institution && record.instrument?.institutionId !== institution) return false
      if (status && record.status !== status) return false
      if (followUpOnly && !record.followUp) return false
      if (
        value &&
        [record.id, record.instrumentId, record.fieldLabel, record.submittedValue, record.instrument?.institutionName, record.instrument?.reference]
          .join(' ')
          .toLowerCase()
          .includes(value)
      ) {
        return false
      }
      return true
    })
  }, [withInstruments, query, institution, status, followUpOnly])

  const byInstrument = useMemo(() => {
    const map = new Map()
    state.evidence.forEach((record) => {
      const list = map.get(record.instrumentId) ?? []
      list.push(record)
      map.set(record.instrumentId, list)
    })
    return [...map.entries()]
      .map(([instrumentId, records]) => ({
        instrumentId,
        instrument: state.instruments.find((item) => item.id === instrumentId),
        coverage: computeCoverage(records),
      }))
      .sort((a, b) => a.coverage.percent - b.coverage.percent)
      .slice(0, 5)
  }, [state.evidence, state.instruments])

  const handleExport = () => {
    exportEvidence(filtered)
    toast.success('Evidence CSV exported', {
      description: `${filtered.length} field records exported from this browser.`,
    })
  }

  return (
    <div>
      <PageHeader
        overline="Evidence · Field-level provenance"
        title="Evidence Passport"
        description="Every field carries its submitted value, simulated extraction, source location, validation method, and status. This view is organisation-wide; open a field on its instrument to act."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{formatNumber(state.evidence.length)} field records</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{coverage.percent}% internally consistent</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{coverage.confirmed} demo confirmations</span>
          </>
        }
        actions={
          <button type="button" className="btn-secondary" onClick={handleExport}>
            <Download size={14} /> Export evidence
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Tracked fields', formatNumber(coverage.total), 'Across all synthetic instruments', 'neutral'],
          ['Internally consistent', `${coverage.percent}%`, `${coverage.complete} of ${coverage.total} fields`, 'success'],
          ['Demo-confirmed', formatNumber(coverage.confirmed), 'Simulated, not bank-confirmed', 'copper'],
          ['Needs attention', formatNumber(state.evidence.filter((record) => NEEDS_ATTENTION.includes(record.status) || record.followUp).length), `${coverage.missing} missing required field(s)`, 'warning'],
        ].map(([label, value, detail, tone]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="overline mb-1">{label}</div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="mt-0.5 text-[9.5px] text-muted">{detail}</div>
            <div className="mt-2">
              <StatusBadge tone={tone} dot={false} className="text-[8px]">
                {label}
              </StatusBadge>
            </div>
          </div>
        ))}
      </div>

      <InfoNote tone="copper" className="mb-5" title="Simulated confirmation is explicit">
        “Independently confirmed” means a demo confirmation was recorded by an authorized reviewer in
        this browser. No bank API, digital signature, or AICTE system is contacted. Submitted and
        extracted values remain separately visible.
      </InfoNote>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-9">
          <section className="panel overflow-hidden">
            <div className="grid gap-3 border-b border-line px-4 py-3 sm:grid-cols-4">
              <SearchInput value={query} onChange={setQuery} placeholder="Search field, value, record…" />
              <select className="select" value={institution} onChange={(event) => setInstitution(event.target.value)} aria-label="Filter institution">
                <option value="">All institutions</option>
                {state.institutions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.shortName}
                  </option>
                ))}
              </select>
              <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter evidence status">
                <option value="">All evidence states</option>
                {Object.entries(EVIDENCE_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center gap-2 border border-line bg-raised px-3 text-[10.5px] text-inkSoft">
                <input
                  type="checkbox"
                  checked={followUpOnly}
                  onChange={(event) => setFollowUpOnly(event.target.checked)}
                  className="h-3.5 w-3.5 accent-copper"
                />
                Follow-up only
              </label>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={FileSearch}
                title="No evidence fields match"
                message="Clear the filters to inspect all tracked fields."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[920px]">
                  <thead>
                    <tr>
                      <th>Instrument / institution</th>
                      <th>Field</th>
                      <th>Submitted value</th>
                      <th>Status</th>
                      <th>Follow-up</th>
                      <th>Updated</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 80).map((record) => (
                      <tr key={record.id}>
                        <td>
                          <Link
                            to={`/app/instruments/${record.instrumentId}?tab=evidence&field=${record.field}`}
                            className="font-mono text-[10px] text-forest hover:text-copper"
                          >
                            {record.instrumentId}
                          </Link>
                          <div className="mt-0.5 max-w-[190px] truncate text-[9.5px] text-muted">
                            {record.instrument?.institutionName}
                          </div>
                        </td>
                        <td>
                          <div className="text-[10.5px] font-medium text-ink">{record.fieldLabel}</div>
                          <div className="font-mono text-[8.5px] text-muted">{record.id}</div>
                        </td>
                        <td className="max-w-[200px] truncate font-mono text-[10px] text-inkSoft">
                          {display(record)}
                        </td>
                        <td>
                          <EvidenceStatusBadge status={record.status} />
                        </td>
                        <td>
                          {record.followUp ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase text-warning">
                              <TriangleAlert size={9} /> required
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-[9.5px] text-muted">{formatDate(record.lastUpdated)}</td>
                        <td>
                          <Link
                            to={`/app/instruments/${record.instrumentId}?tab=evidence&field=${record.field}`}
                            className="btn-icon h-6 w-6"
                            aria-label={`Open ${record.fieldLabel} evidence`}
                          >
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-line bg-paper/30 px-4 py-2 text-[9.5px] text-muted">
              Showing {Math.min(filtered.length, 80)} of {filtered.length} filtered field records. Use a
              record's Evidence tab for field-level reviewer actions.
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:col-span-3">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <div className="overline mb-1">Weakest records</div>
              <h2 className="font-display text-lg text-ink">Coverage by instrument</h2>
            </div>
            <ul className="divide-y divide-line">
              {byInstrument.map((row) => (
                <li key={row.instrumentId} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/app/instruments/${row.instrumentId}?tab=evidence`}
                      className="font-mono text-[9.5px] text-forest hover:text-copper"
                    >
                      {row.instrumentId}
                    </Link>
                    <span className={`font-mono text-[10px] ${row.coverage.percent < 50 ? 'text-critical' : row.coverage.percent < 80 ? 'text-warning' : 'text-success'}`}>
                      {row.coverage.percent}%
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[9px] text-muted">
                    {row.instrument?.institutionName}
                  </div>
                  <div className="mt-1 h-0.5 w-full bg-line">
                    <div
                      className={`h-full ${row.coverage.percent < 50 ? 'bg-critical' : row.coverage.percent < 80 ? 'bg-warning' : 'bg-success'}`}
                      style={{ width: `${row.coverage.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="border border-success/25 bg-success/[0.03] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-success">
              <ShieldCheck size={12} /> Provenance first
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              Confirmed values are never shown without their field-level source locator and validation
              method. Missing evidence cannot be silently confirmed.
            </p>
          </div>

          <div className="border border-line bg-paper/40 px-4 py-3">
            <div className="overline mb-1">Storage note</div>
            <p className="text-[9.5px] leading-relaxed text-muted">
              Evidence metadata lives in localStorage. Uploaded document bytes live in IndexedDB. Clear
              site data removes both local stores.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
