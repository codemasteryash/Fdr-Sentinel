import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  MapPin,
  PencilLine,
  UserRound,
  CalendarDays,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { PageHeader, SectionHeading, EmptyState, InfoNote } from '../components/shared/ui'
import { InstitutionStatusBadge, LifecycleBadge, VerificationBadge, SeverityBadge, FindingStatusBadge, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { getInstitution, getInstitutionInstruments, institutionMetrics } from '../utils/selectors'
import { can, PERMISSIONS } from '../data/users'
import { formatCompactCurrency, formatCurrency, formatDate, formatDateTime } from '../utils/format'
import { InstitutionFormDialog } from '../components/institutions/InstitutionFormDialog'

export default function InstitutionDetail() {
  const { id } = useParams()
  const state = useDemoState()
  const user = useCurrentUser()
  const [editOpen, setEditOpen] = useState(false)
  const institution = getInstitution(state, id)
  const canManage = can(user.role, PERMISSIONS.INSTITUTION_MANAGE)

  const metrics = useMemo(
    () => (institution ? institutionMetrics(state, institution) : null),
    [state, institution],
  )
  const instruments = useMemo(
    () => (institution ? getInstitutionInstruments(state, institution.id) : []),
    [state, institution],
  )
  const findings = useMemo(() => {
    if (!institution) return []
    const ids = new Set(instruments.map((instrument) => instrument.id))
    return state.findings.filter(
      (finding) => ids.has(finding.instrumentId) || ids.has(finding.relatedInstrumentId),
    )
  }, [state.findings, instruments, institution])

  if (!institution) {
    return (
      <div>
        <PageHeader overline="Institutions · Not found" title="Institution not found" description="This synthetic institution does not exist in current browser state." />
        <Link to="/app/governance?view=institutions" className="btn-secondary"><ArrowLeft size={14} /> Institutions</Link>
      </div>
    )
  }

  if (user.role === 'officer' && institution.id !== user.institutionId) {
    return (
      <div>
        <PageHeader overline="Institutions · Access scope" title="Institution outside your scope" description="The Institution Officer role is limited to its assigned institution." />
        <Link to="/app/governance?view=institutions" className="btn-secondary"><ArrowLeft size={14} /> Institutions</Link>
      </div>
    )
  }

  const activeFindings = findings.filter((finding) =>
    ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
  )
  const bankBreakdown = Object.entries(
    instruments.reduce((acc, instrument) => {
      acc[instrument.bank] = (acc[instrument.bank] ?? 0) + Number(instrument.amount || 0)
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <Link to="/app/governance?view=institutions" className="hover:text-forest">Institutions</Link>
        <span>›</span>
        <span className="font-mono text-inkSoft">{institution.id}</span>
        <span>›</span>
        <span>{institution.shortName}</span>
      </div>

      <PageHeader
        overline={`Institution · ${institution.code}`}
        title={institution.name}
        description={`${institution.category} institution established in ${institution.established}, located in ${institution.city}, ${institution.state}. All records and relationships are synthetic.`}
        meta={
          <>
            <InstitutionStatusBadge status={institution.status} />
            <span className="text-lineStrong">·</span>
            <span className="font-mono text-[10px] text-muted">{institution.id}</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">{instruments.length} instrument(s)</span>
          </>
        }
        actions={
          <>
            <Link to={`/app/instruments?institution=${institution.id}`} className="btn-secondary">
              <FileText size={14} /> View in registry
            </Link>
            {canManage && (
              <button type="button" className="btn-dark" onClick={() => setEditOpen(true)}>
                <PencilLine size={14} /> Edit institution
              </button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total exposure', formatCompactCurrency(metrics.exposure), `${instruments.length} instruments`],
          ['Active instruments', metrics.active, `${metrics.instruments - metrics.active} closed / renewed`],
          ['Pending verification', metrics.pendingVerification, 'Not demo-confirmed'],
          ['Material findings', metrics.materialFindings, `${activeFindings.length} active findings`],
        ].map(([label, value, detail]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="overline mb-1">{label}</div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <section className="panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHeading overline="Profile" title="Institution record" />
              <Building2 size={15} className="text-muted" />
            </div>
            <dl className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Institution ID', institution.id, true],
                ['Institution code', institution.code, true],
                ['Category', institution.category],
                ['Established', institution.established],
                ['Relationship status', institution.status.replaceAll('_', ' ')],
                ['Short name', institution.shortName],
              ].map(([label, value, mono]) => (
                <div key={label}>
                  <dt className="overline mb-0.5">{label}</dt>
                  <dd className={`text-[11.5px] font-medium text-ink ${mono ? 'font-mono text-[10.5px]' : ''}`}>{value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="overline mb-1">Addressable location</dt>
                <dd className="flex items-center gap-1.5 text-[11.5px] text-inkSoft">
                  <MapPin size={12} className="text-muted" /> {institution.city}, {institution.state}
                </dd>
              </div>
              <div>
                <dt className="overline mb-1">Responsible officer</dt>
                <dd className="flex items-center gap-1.5 text-[11.5px] text-inkSoft">
                  <UserRound size={12} className="text-muted" /> {institution.officer}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="overline mb-1">Contact</dt>
                <dd className="flex items-center gap-1.5 text-[11.5px] text-inkSoft">
                  <Mail size={12} className="text-muted" /> {institution.contact}
                </dd>
              </div>
            </dl>
            <div className="border-t border-line bg-paper/40 px-4 py-2.5 text-[9.5px] text-muted">
              <CalendarDays size={10} className="mr-1 inline" />
              Latest linked record update: {metrics.lastUpdated ? formatDateTime(metrics.lastUpdated) : 'No linked records'}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <SectionHeading overline="Portfolio" title="Linked instruments" description={`${instruments.length} synthetic FDR record(s).`} />
              <Link to={`/app/instruments?institution=${institution.id}`} className="btn-ghost btn-xs">
                Open filtered registry <ArrowRight size={10} />
              </Link>
            </div>
            {instruments.length === 0 ? (
              <EmptyState
                compact
                icon={FileText}
                title="No instruments linked"
                message="Register an FDR for this institution to create the first record."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[760px]">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Bank</th>
                      <th>Principal</th>
                      <th>Maturity</th>
                      <th>Lifecycle</th>
                      <th>Verification</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {instruments.map((instrument) => (
                      <tr key={instrument.id}>
                        <td>
                          <Link to={`/app/instruments/${instrument.id}`} className="font-mono text-[10px] text-forest hover:text-copper">
                            {instrument.id}
                          </Link>
                          <div className="font-mono text-[9px] text-muted">{instrument.reference}</div>
                        </td>
                        <td className="max-w-[150px] truncate text-[9.5px]">{instrument.bank}</td>
                        <td className="whitespace-nowrap font-mono text-[9.5px]">{formatCurrency(instrument.amount)}</td>
                        <td className="whitespace-nowrap text-[9.5px] text-muted">{formatDate(instrument.maturityDate)}</td>
                        <td><LifecycleBadge status={instrument.lifecycleStatus} /></td>
                        <td><VerificationBadge status={instrument.verificationStatus} /></td>
                        <td>
                          <Link to={`/app/instruments/${instrument.id}`} className="btn-icon h-6 w-6" aria-label={`Open ${instrument.id}`}>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHeading overline="Integrity" title="Active findings across portfolio" description={`${activeFindings.length} open, in-review, or confirmed finding(s).`} />
              <Link to={`/app/verification?view=findings`} className="btn-ghost btn-xs">Integrity Center <ArrowRight size={10} /></Link>
            </div>
            {activeFindings.length === 0 ? (
              <div className="px-4 py-4 text-[11px] text-inkSoft">
                No active findings associated with this institution's records.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {activeFindings.slice(0, 5).map((finding) => (
                  <li key={finding.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[9px] text-muted">{finding.id}</span>
                      <SeverityBadge severity={finding.severity} />
                      <FindingStatusBadge status={finding.reviewStatus} />
                    </div>
                    <Link to={`/app/verification?view=findings&finding=${finding.id}`} className="mt-1 block text-[10.5px] font-medium text-ink hover:text-forest">
                      {finding.title}
                    </Link>
                    <div className="mt-0.5 text-[9px] text-muted">
                      {finding.instrumentId} · {finding.rule}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:col-span-4">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Exposure" title="Concentration by bank" />
            </div>
            {bankBreakdown.length === 0 ? (
              <p className="px-4 py-4 text-[10.5px] text-muted">No exposure recorded.</p>
            ) : (
              <ul className="divide-y divide-line">
                {bankBreakdown.map(([bank, amount]) => (
                  <li key={bank} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-inkSoft">{bank}</span>
                      <span className="font-mono text-[9.5px] text-ink">{formatCompactCurrency(amount)}</span>
                    </div>
                    <div className="mt-1 h-0.5 w-full bg-line">
                      <div className="h-full bg-forest/60" style={{ width: `${(amount / metrics.exposure) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Attention" title="Operational indicators" />
            </div>
            <div className="px-4 py-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="overline mb-1">Attention index</div>
                  <div className="font-display text-3xl text-ink">
                    {Math.round(
                      metrics.materialFindings * 3 +
                        metrics.pendingVerification * 1.5 +
                        metrics.upcoming * 0.5 +
                        (institution.status === 'probation' ? 6 : institution.status === 'attention' ? 4 : 0),
                    )}
                  </div>
                </div>
                <AlertTriangle size={22} strokeWidth={1.3} className="text-copper/60" />
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
                Sorts operational attention. It is not a fraud score, credit rating, or regulatory
                determination.
              </p>
            </div>
          </section>

          <div className="border border-line bg-paper/40 px-4 py-3">
            <div className="overline mb-1">Data scope</div>
            <p className="text-[9.5px] leading-relaxed text-muted">
              This institution and all links are generated demo data. Edits are stored in this browser
              only and do not affect any external registry.
            </p>
          </div>
        </aside>
      </div>

      <InfoNote tone="copper" className="mt-5" title="Synthetic institution">
        No real institution, officer, bank, or depositor is represented. This prototype is intended to
        demonstrate custody-control workflows, not to evaluate any organisation.
      </InfoNote>

      <InstitutionFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        institution={institution}
      />
    </div>
  )
}
