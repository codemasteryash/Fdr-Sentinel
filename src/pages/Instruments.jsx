import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  FileText,
} from 'lucide-react'
import { PageHeader, EmptyState, Pagination, InfoNote, SearchInput } from '../components/shared/ui'
import {
  LifecycleBadge,
  VerificationBadge,
  IntegrityBadge,
} from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { filterInstruments, sortInstruments } from '../utils/selectors'
import { BANKS } from '../data/institutions'
import { LIFECYCLE_LABELS, VERIFICATION_LABELS, INTEGRITY_LABELS } from '../data/statuses'
import { formatCompactCurrency, formatCurrency, formatDate } from '../utils/format'
import { ROLES } from '../data/users'
import { exportInstruments } from '../services/exportService'
import { toast } from 'sonner'

const EMPTY_FILTERS = {
  query: '',
  lifecycle: '',
  verification: '',
  integrity: '',
  institution: '',
  bank: '',
  minAmount: '',
  maxAmount: '',
  maturity: '',
}

const SORTABLE = new Set([
  'id',
  'reference',
  'institutionName',
  'bank',
  'amount',
  'issueDate',
  'maturityDate',
  'lifecycleStatus',
  'verificationStatus',
  'integrityStatus',
])

function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.08em] transition-colors hover:text-ink ${
          active ? 'text-ink' : ''
        }`}
      >
        {label}
        {active ? (
          sort.direction === 'asc' ? (
            <ArrowUp size={10} className="text-copper" />
          ) : (
            <ArrowDown size={10} className="text-copper" />
          )
        ) : (
          <ArrowUpDown size={10} className="opacity-40" />
        )}
      </button>
    </th>
  )
}

export default function Instruments() {
  const state = useDemoState()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sort, setSort] = useState({ key: 'maturityDate', direction: 'asc' })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(true)
  const pageSize = 10

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      query: searchParams.get('query') ?? '',
      bank: searchParams.get('bank') ?? '',
      lifecycle: searchParams.get('lifecycle') ?? '',
      verification: searchParams.get('verification') ?? '',
      integrity: searchParams.get('integrity') ?? '',
      institution: searchParams.get('institution') ?? '',
      maturity: searchParams.get('maturity') ?? '',
    }))
    setPage(1)
  }, [searchParams])

  const scopedFilters = useMemo(() => {
    if (user.role !== 'officer') return filters
    return { ...filters, institution: user.institutionId ?? filters.institution }
  }, [filters, user])

  const filtered = useMemo(
    () => filterInstruments(state, scopedFilters),
    [state, scopedFilters],
  )
  const sorted = useMemo(() => sortInstruments(filtered, sort), [filtered, sort])
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)
  const totalExposure = filtered.reduce((sum, instrument) => sum + Number(instrument.amount || 0), 0)
  const activeFilterCount = Object.entries(filters).filter(([, value]) => value).length

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const changeSort = (key) => {
    if (!SORTABLE.has(key)) return
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const handleExport = () => {
    exportInstruments(sorted, 'FDR Registry (filtered)')
    toast.success(`Exported ${sorted.length} records`, {
      description: 'CSV generated locally. The export event was added to the audit trail.',
    })
  }

  const institutions = user.role === 'officer'
    ? state.institutions.filter((institution) => institution.id === user.institutionId)
    : state.institutions

  return (
    <div>
      <PageHeader
        overline="Registry · 25 synthetic instruments"
        title="FDR Registry"
        description="Search, inspect, and register fixed deposit receipts. Lifecycle, verification, and integrity are tracked as separate dimensions and are never collapsed into a single status."
        meta={
          <>
            <span className="text-[10.5px] text-muted">
              {filtered.length} of {state.instruments.length} records
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              {formatCompactCurrency(totalExposure)} filtered exposure
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">
              Role scope: <span className="text-inkSoft">{ROLES[user.role]?.shortLabel}</span>
            </span>
          </>
        }
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={handleExport}>
              <Download size={14} /> Export CSV
            </button>
            <Link to="/app/instruments/new" className="btn-dark">
              <Plus size={14} /> Register FDR
            </Link>
          </>
        }
      />

      {user.role === 'officer' && (
        <InfoNote tone="copper" className="mb-4" title="Institution-scoped view">
          You are previewing the Institution Officer role. The registry is limited to{' '}
          {state.institutions.find((institution) => institution.id === user.institutionId)?.name ??
            'your institution'}
          . This is a frontend permission simulation, not authentication.
        </InfoNote>
      )}

      <section className="panel mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-muted" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-inkSoft">
              Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="border border-copper/30 bg-copper/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-copper-dark">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost btn-xs"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
            >
              <RotateCcw size={11} /> Reset filters
            </button>
            <button
              type="button"
              className="btn-secondary btn-xs lg:hidden"
              onClick={() => setShowFilters((value) => !value)}
            >
              {showFilters ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div
          className={`grid gap-3 px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 ${
            showFilters ? '' : 'hidden lg:grid'
          }`}
        >
          <SearchInput
            className="sm:col-span-2 xl:col-span-2"
            value={filters.query}
            onChange={(value) => updateFilter('query', value)}
            placeholder="Search ID, reference, bank, branch…"
          />
          <div>
            <label className="label" htmlFor="filter-institution">
              Institution
            </label>
            <select
              id="filter-institution"
              className="select"
              value={scopedFilters.institution}
              onChange={(event) => updateFilter('institution', event.target.value)}
              disabled={user.role === 'officer'}
            >
              <option value="">All institutions</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.shortName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-bank">
              Bank
            </label>
            <select
              id="filter-bank"
              className="select"
              value={filters.bank}
              onChange={(event) => updateFilter('bank', event.target.value)}
            >
              <option value="">All banks</option>
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-lifecycle">
              Lifecycle
            </label>
            <select
              id="filter-lifecycle"
              className="select"
              value={filters.lifecycle}
              onChange={(event) => updateFilter('lifecycle', event.target.value)}
            >
              <option value="">All lifecycle states</option>
              {Object.entries(LIFECYCLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-verification">
              Verification
            </label>
            <select
              id="filter-verification"
              className="select"
              value={filters.verification}
              onChange={(event) => updateFilter('verification', event.target.value)}
            >
              <option value="">All verification states</option>
              {Object.entries(VERIFICATION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-integrity">
              Integrity
            </label>
            <select
              id="filter-integrity"
              className="select"
              value={filters.integrity}
              onChange={(event) => updateFilter('integrity', event.target.value)}
            >
              <option value="">All integrity states</option>
              {Object.entries(INTEGRITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-maturity">
              Maturity window
            </label>
            <select
              id="filter-maturity"
              className="select"
              value={filters.maturity}
              onChange={(event) => updateFilter('maturity', event.target.value)}
            >
              <option value="">Any maturity</option>
              <option value="overdue">Matured / overdue</option>
              <option value="30">Within 30 days</option>
              <option value="60">31–60 days</option>
              <option value="90">61–90 days</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-min">
              Min amount (₹)
            </label>
            <input
              id="filter-min"
              className="input font-mono"
              inputMode="numeric"
              value={filters.minAmount}
              onChange={(event) => updateFilter('minAmount', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label" htmlFor="filter-max">
              Max amount (₹)
            </label>
            <input
              id="filter-max"
              className="input font-mono"
              inputMode="numeric"
              value={filters.maxAmount}
              onChange={(event) => updateFilter('maxAmount', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="No limit"
            />
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No instruments match these filters"
            message="Adjust the filters or reset them to see the full synthetic registry."
            action={
              <button type="button" className="btn-secondary btn-sm" onClick={resetFilters}>
                <RotateCcw size={12} /> Reset filters
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1050px]">
                <thead>
                  <tr>
                    <SortHeader label="FDR reference" sortKey="reference" sort={sort} onSort={changeSort} />
                    <SortHeader label="Institution" sortKey="institutionName" sort={sort} onSort={changeSort} className="w-[150px]" />
                    <SortHeader label="Bank" sortKey="bank" sort={sort} onSort={changeSort} className="w-[130px]" />
                    <SortHeader label="Principal" sortKey="amount" sort={sort} onSort={changeSort} className="text-right" />
                    <SortHeader label="Issue" sortKey="issueDate" sort={sort} onSort={changeSort} />
                    <SortHeader label="Maturity" sortKey="maturityDate" sort={sort} onSort={changeSort} />
                    <SortHeader label="Lifecycle" sortKey="lifecycleStatus" sort={sort} onSort={changeSort} />
                    <SortHeader label="Verification" sortKey="verificationStatus" sort={sort} onSort={changeSort} />
                    <SortHeader label="Integrity" sortKey="integrityStatus" sort={sort} onSort={changeSort} />
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((instrument) => {
                    return (
                      <tr key={instrument.id} className="group">
                        <td>
                          <Link
                            to={`/app/instruments/${instrument.id}`}
                            className="font-mono text-[11.5px] font-medium text-forest hover:text-copper"
                          >
                            {instrument.id}
                          </Link>
                          <div className="mt-0.5 font-mono text-[10px] text-muted">
                            {instrument.reference}
                          </div>
                        </td>
                        <td className="max-w-[150px]">
                          <div className="truncate text-[11.5px] font-medium text-ink">
                            {instrument.institutionName}
                          </div>
                          <div className="text-[10px] text-muted">{instrument.institutionId}</div>
                        </td>
                        <td className="max-w-[130px]">
                          <div className="truncate text-[11px] text-inkSoft">{instrument.bank}</div>
                          <div className="truncate text-[10px] text-muted">{instrument.branch}</div>
                        </td>
                        <td className="whitespace-nowrap text-right font-mono text-[11px] text-ink">
                          {formatCurrency(instrument.amount)}
                        </td>
                        <td className="whitespace-nowrap text-[10.5px]">
                          {formatDate(instrument.issueDate)}
                        </td>
                        <td className="whitespace-nowrap text-[10.5px]">
                          {formatDate(instrument.maturityDate)}
                        </td>
                        <td className="max-w-[150px]">
                          <LifecycleBadge status={instrument.lifecycleStatus} short />
                        </td>
                        <td className="max-w-[140px]">
                          <VerificationBadge status={instrument.verificationStatus} short />
                        </td>
                        <td>
                          <IntegrityBadge status={instrument.integrityStatus} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-icon h-7 w-7"
                            onClick={() => navigate(`/app/instruments/${instrument.id}`)}
                            aria-label={`Open ${instrument.id}`}
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={sorted.length}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
        <span>
          Lifecycle, verification, and integrity are independent dimensions. A record may be verified
          while an integrity conflict remains open.
        </span>
        <span className="font-mono">SYNTHETIC DATA · {new Date().getFullYear()}</span>
      </div>
    </div>
  )
}
