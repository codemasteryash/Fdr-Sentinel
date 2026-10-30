import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { institutionAttentionRank, institutionMetrics } from '../../utils/selectors'
import { formatCompactCurrency } from '../../utils/format'
import { InstitutionStatusBadge } from '../shared/StatusBadge'

export function AttentionInstitutions({ state }) {
  const institutions = [...state.institutions]
    .map((institution) => ({
      institution,
      metrics: institutionMetrics(state, institution),
      rank: institutionAttentionRank(state, institution),
    }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 5)

  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="overline">Institution exposure &amp; exceptions</div>
          <h2 className="font-display text-lg text-ink">Institutions requiring attention</h2>
        </div>
        <Link
          to="/app/governance?view=institutions"
          className="group inline-flex items-center gap-1 text-[10.5px] font-medium text-forest hover:text-copper"
        >
          All institutions
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[620px]">
          <thead>
            <tr>
              <th>Institution</th>
              <th>Exposure</th>
              <th>Verification pending</th>
              <th>Open findings</th>
              <th>Maturity · 90d</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map(({ institution, metrics }) => (
              <tr key={institution.id}>
                <td>
                  <Link
                    to={`/app/institutions/${institution.id}`}
                    className="font-medium text-ink hover:text-copper"
                  >
                    {institution.shortName}
                  </Link>
                  <div className="text-[10px] text-muted">
                    {institution.city}, {institution.state}
                  </div>
                </td>
                <td className="whitespace-nowrap font-mono text-[11px]">
                  {formatCompactCurrency(metrics.exposure)}
                </td>
                <td>
                  <span
                    className={
                      metrics.pendingVerification > 2
                        ? 'font-medium text-warning'
                        : 'text-inkSoft'
                    }
                  >
                    {metrics.pendingVerification}
                  </span>
                  <span className="ml-1 text-[10px] text-muted">of {metrics.active}</span>
                </td>
                <td>
                  <span
                    className={
                      metrics.materialFindings > 0 ? 'font-medium text-critical' : 'text-inkSoft'
                    }
                  >
                    {metrics.findings}
                  </span>
                  {metrics.materialFindings > 0 && (
                    <span className="ml-1 text-[10px] text-muted">
                      ({metrics.materialFindings} material)
                    </span>
                  )}
                </td>
                <td className="text-inkSoft">{metrics.upcoming}</td>
                <td>
                  <InstitutionStatusBadge status={institution.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
