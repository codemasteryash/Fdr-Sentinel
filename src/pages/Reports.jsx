import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, FileBarChart2, TrendingUp, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, SectionHeading, InfoNote } from '../components/shared/ui'
import { StatusBadge } from '../components/shared/StatusBadge'
import { ChartTooltip } from '../components/shared/ChartTooltip'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { lifecycleDistribution, verificationDistribution, dashboardMetrics } from '../utils/selectors'
import { formatCompactCurrency, formatCurrency, formatNumber, daysUntil } from '../utils/format'
import { LIFECYCLE_LABELS, VERIFICATION_LABELS } from '../data/statuses'
import { exportSummaryCsv } from '../services/exportService'

const LIFECYCLE_COLORS = {
  submitted: '#8A948D',
  scrutiny: '#3D5C6B',
  verification_pending: '#B9873C',
  verified: '#2E6B4E',
  discrepancy: '#9E3B33',
  renewal_due: '#A85C36',
  renewal_pending: '#C08A3E',
  renewed: '#4F7B62',
  replacement_pending: '#7C9483',
  replaced: '#5C7A68',
  release_requested: '#6C7F8A',
  release_review: '#B06A45',
  released: '#2F5C46',
  rejected: '#7C4A44',
  returned: '#A06A5A',
}

const VERIFICATION_COLORS = {
  unverified: '#8A948D',
  internal_passed: '#3D5C6B',
  confirmation_pending: '#B9873C',
  partially_confirmed: '#A85C36',
  confirmed: '#2E6B4E',
  discrepancy: '#9E3B33',
}

export default function Reports() {
  const state = useDemoState()
  const user = useCurrentUser()
  const [institution, setInstitution] = useState('')
  const [period, setPeriod] = useState('365')

  const scopedInstruments = useMemo(() => {
    let instruments = state.instruments
    if (user.role === 'officer') {
      instruments = instruments.filter((instrument) => instrument.institutionId === user.institutionId)
    }
    if (institution) instruments = instruments.filter((instrument) => instrument.institutionId === institution)
    if (period !== 'all') {
      const limit = Number(period)
      instruments = instruments.filter((instrument) => {
        const days = daysUntil(instrument.issueDate)
        return days !== null && days >= -limit && days <= 0
      })
    }
    return instruments
  }, [state.instruments, user, institution, period])

  const filteredState = useMemo(
    () => ({ ...state, instruments: scopedInstruments }),
    [state, scopedInstruments],
  )
  const metrics = dashboardMetrics(filteredState)
  const lifecycle = [...lifecycleDistribution(filteredState).entries()].map(([key, value]) => ({
    key,
    name: LIFECYCLE_LABELS[key] ?? key,
    value,
    color: LIFECYCLE_COLORS[key] ?? '#8A948D',
  }))
  const verification = [...verificationDistribution(filteredState).entries()].map(([key, value]) => ({
    key,
    name: VERIFICATION_LABELS[key] ?? key,
    value,
    color: VERIFICATION_COLORS[key] ?? '#8A948D',
  }))

  const findingsBySeverity = ['critical', 'high', 'medium', 'low'].map((severity) => ({
    name: severity[0].toUpperCase() + severity.slice(1),
    count: state.findings.filter(
      (finding) =>
        finding.severity === severity &&
        ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus) &&
        scopedInstruments.some((instrument) => instrument.id === finding.instrumentId),
    ).length,
    color: severity === 'critical' || severity === 'high' ? '#9E3B33' : severity === 'medium' ? '#B9873C' : '#8A948D',
  }))

  const exposureByInstitution = useMemo(() => {
    const map = new Map()
    scopedInstruments.forEach((instrument) => {
      map.set(instrument.institutionName, (map.get(instrument.institutionName) ?? 0) + Number(instrument.amount || 0))
    })
    return [...map.entries()]
      .map(([name, exposure]) => ({
        name: name.length > 22 ? `${name.slice(0, 20)}…` : name,
        fullName: name,
        exposure,
      }))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 8)
  }, [scopedInstruments])

  const institutionRows = useMemo(() => {
    const map = new Map()
    scopedInstruments.forEach((instrument) => {
      const row = map.get(instrument.institutionId) ?? {
        institutionId: instrument.institutionId,
        institutionName: instrument.institutionName,
        instruments: 0,
        exposure: 0,
        confirmed: 0,
        findings: 0,
      }
      row.instruments += 1
      row.exposure += Number(instrument.amount || 0)
      if (instrument.verificationStatus === 'confirmed') row.confirmed += 1
      map.set(instrument.institutionId, row)
    })
    state.findings.forEach((finding) => {
      if (!['open', 'in_review', 'confirmed'].includes(finding.reviewStatus)) return
      const row = map.get(
        state.instruments.find((instrument) => instrument.id === finding.instrumentId)?.institutionId,
      )
      if (row) row.findings += 1
    })
    return [...map.values()].sort((a, b) => b.exposure - a.exposure)
  }, [scopedInstruments, state.findings, state.instruments])

  const handleExport = () => {
    exportSummaryCsv(
      `Portfolio report · ${period === 'all' ? 'all time' : `last ${period} days`}`,
      institutionRows.map((row) => ({
        institution: row.institutionName,
        instruments: row.instruments,
        exposure: row.exposure,
        confirmed: row.confirmed,
        active_findings: row.findings,
      })),
      [
        ['institution', 'Institution'],
        ['instruments', 'Instruments'],
        ['exposure', 'Exposure (INR)'],
        ['confirmed', 'Demo-confirmed'],
        ['active_findings', 'Active findings'],
      ],
    )
    toast.success('Portfolio report exported', {
      description: `${institutionRows.length} institution row(s) generated as CSV.`,
    })
  }

  const totalActiveFindings = findingsBySeverity.reduce((sum, row) => sum + row.count, 0)

  return (
    <div>
      <PageHeader
        overline="Governance · Operational analytics"
        title="Reports & Analytics"
        description="Read-only portfolio analytics for the synthetic FDR dataset. Filters apply to issued records; findings are restricted to those instruments. Figures are operational metrics, not an audit opinion."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{scopedInstruments.length} instruments in view</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{formatCompactCurrency(metrics.totalExposure)} exposure</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{metrics.verifiedPercent}% demo-confirmed</span>
          </>
        }
        actions={
          <button type="button" className="btn-dark" onClick={handleExport}>
            <Download size={14} /> Export portfolio CSV
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 border border-line bg-raised px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="overline">Issued in</span>
          <select className="select w-auto" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Reporting period">
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
            <option value="365">Last 365 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="overline">Institution</span>
          <select className="select w-auto" value={institution} onChange={(event) => setInstitution(event.target.value)} aria-label="Institution filter" disabled={user.role === 'officer'}>
            <option value="">All institutions</option>
            {(user.role === 'officer' ? state.institutions.filter((item) => item.id === user.institutionId) : state.institutions).map((item) => (
              <option key={item.id} value={item.id}>{item.shortName}</option>
            ))}
          </select>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[9px] text-muted">
          <FileBarChart2 size={11} /> {scopedInstruments.length} records · {totalActiveFindings} active findings
        </span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Aggregate exposure', formatCurrency(metrics.totalExposure), 'Principal in filtered records'],
          ['Active instruments', formatNumber(metrics.activeInstruments), `${metrics.instruments} records total`],
          ['Demo-confirmed', `${metrics.verifiedPercent}%`, `${metrics.verified} of ${metrics.activeInstruments} active`],
          ['Unresolved findings', formatNumber(totalActiveFindings), `${metrics.criticalFindings} critical portfolio-wide`],
        ].map(([label, value, detail]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="overline mb-1">{label}</div>
            <div className="font-display text-[24px] leading-tight text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-12">
        <section className="panel min-w-0 lg:col-span-7">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Exposure concentration" title="Principal by institution" description="Top 8 institutions in the selected reporting view." />
          </div>
          <div className="h-[300px] px-2 pb-2 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposureByInstitution} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#E6E1D6" horizontal={false} strokeDasharray="2 3" />
                <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="name" width={132} axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(29,59,47,0.04)' }}
                  content={<ChartTooltip valueFormatter={(value) => formatCurrency(value)} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label} />}
                />
                <Bar dataKey="exposure" name="Exposure" fill="#1D3B2F" maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel min-w-0 lg:col-span-5">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Assurance" title="Verification distribution" description="Demo confirmation state; not bank verification." />
          </div>
          <div className="flex h-[300px] flex-col items-center gap-2 px-4 py-4 sm:flex-row">
            <div className="relative h-[190px] w-full max-w-[210px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={verification} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={1.2} stroke="#FAF8F3" strokeWidth={2} isAnimationActive={false}>
                    {verification.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} record(s)`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[28px] leading-none text-ink">{metrics.verifiedPercent}%</span>
                <span className="mt-1 text-[8px] uppercase tracking-[0.14em] text-muted">confirmed</span>
              </div>
            </div>
            <div className="w-full flex-1 space-y-1.5">
              {verification.map((entry) => (
                <div key={entry.key} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                  <span className="min-w-0 flex-1 truncate text-[9.5px] text-muted">{entry.name}</span>
                  <span className="font-mono text-[9.5px] text-inkSoft">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-12">
        <section className="panel min-w-0 lg:col-span-7">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Portfolio table" title="Institution summary" description="Exposure, verification, and active findings in the filtered view." />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[700px]">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Instruments</th>
                  <th>Exposure</th>
                  <th>Demo-confirmed</th>
                  <th>Active findings</th>
                </tr>
              </thead>
              <tbody>
                {institutionRows.map((row) => (
                  <tr key={row.institutionId}>
                    <td>
                      <div className="max-w-[200px] truncate text-[10px] font-medium text-ink">{row.institutionName}</div>
                      <div className="font-mono text-[8.5px] text-muted">{row.institutionId}</div>
                    </td>
                    <td className="font-mono text-[10px]">{row.instruments}</td>
                    <td className="whitespace-nowrap font-mono text-[10px]">{formatCompactCurrency(row.exposure)}</td>
                    <td className="font-mono text-[10px]">{row.confirmed}/{row.instruments}</td>
                    <td>
                      {row.findings ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-critical">
                          {row.findings}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-muted">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel min-w-0 lg:col-span-5">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Lifecycle" title="State distribution" />
          </div>
          <div className="h-[290px] px-2 pb-2 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lifecycle} margin={{ top: 4, right: 8, left: -22, bottom: 38 }}>
                <CartesianGrid stroke="#E6E1D6" vertical={false} strokeDasharray="2 3" />
                <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={50} tick={{ fontSize: 8 }} axisLine={{ stroke: '#DAD4C7' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip cursor={{ fill: 'rgba(168,92,54,0.06)' }} content={<ChartTooltip valueFormatter={(value) => `${value} FDR(s)`} />} />
                <Bar dataKey="value" name="Records" fill="#A85C36" maxBarSize={22} isAnimationActive={false}>
                  {lifecycle.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="panel min-w-0 lg:col-span-7">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Integrity" title="Active findings by severity" description="Restricted to instruments in the filtered view." />
          </div>
          <div className="px-4 py-4">
            {findingsBySeverity.map((row) => {
              const max = Math.max(...findingsBySeverity.map((item) => item.count), 1)
              return (
                <div key={row.name} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-inkSoft">{row.name}</span>
                    <span className="font-mono text-ink">{row.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-line/60">
                    <div className="h-full" style={{ width: `${(row.count / max) * 100}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              )
            })}
            <p className="mt-3 text-[9px] leading-relaxed text-muted">
              Severity reflects the potential impact of the review prompt, not the probability of
              misconduct.
            </p>
          </div>
        </section>

        <section className="panel min-w-0 lg:col-span-5">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Assurance notes" title="How to read this report" />
          </div>
          <div className="space-y-3 px-4 py-4 text-[10.5px] leading-relaxed text-inkSoft">
            <div className="flex items-start gap-2">
              <TrendingUp size={13} className="mt-0.5 shrink-0 text-copper" />
              Exposure is the sum of principal amounts in local synthetic records. It is not reconciled
              cash or financial statement data.
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-forest" />
              “Demo-confirmed” is a simulated workflow state. It is not bank verification, a digital
              signature, or an audit certification.
            </div>
            <div className="flex items-start gap-2">
              <FileBarChart2 size={13} className="mt-0.5 shrink-0 text-info" />
              All exports are generated locally from browser state. Refreshing does not regenerate data
              unless the demo is reset.
            </div>
          </div>
        </section>
      </div>

      <InfoNote tone="copper" className="mt-5" title="Synthetic analytics">
        This report is a demonstration of traceable metrics, not official AICTE reporting. The export
        includes synthetic institution names and values only.
      </InfoNote>
    </div>
  )
}
