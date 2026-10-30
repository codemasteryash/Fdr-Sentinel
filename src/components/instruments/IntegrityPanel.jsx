import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Play,
  Scale,
  ScanSearch,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { can, PERMISSIONS } from '../../data/users'
import { runIntegrityAnalysis } from '../../services/integrityEngine'
import { referenceMatch } from '../../utils/normalization'
import { formatDateTime } from '../../utils/format'
import {
  SeverityBadge,
  FindingStatusBadge,
  IntegrityBadge,
  StatusBadge,
} from '../shared/StatusBadge'
import { EmptyState, SectionHeading } from '../shared/ui'
import { FINDING_CATEGORY_LABELS } from '../../data/statuses'

function FindingCard({ finding, instrument }) {
  const active = ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus)
  return (
    <article className={`border ${active ? 'border-line' : 'border-line/70 opacity-80'} bg-raised`}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-muted">{finding.id}</span>
          <SeverityBadge severity={finding.severity} />
          <FindingStatusBadge status={finding.reviewStatus} />
        </div>
        <span className="font-mono text-[9px] text-muted">
          {finding.confidence}% confidence · {finding.matchType?.replaceAll('_', ' ')}
        </span>
      </div>
      <div className="px-4 py-3.5">
        <h3 className="text-[12.5px] font-semibold leading-snug text-ink">{finding.title}</h3>
        <p className="mt-1.5 text-[11px] leading-relaxed text-inkSoft">{finding.explanation}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="overline mb-1">Rule</div>
            <div className="font-mono text-[10px] text-inkSoft">{finding.rule}</div>
          </div>
          <div>
            <div className="overline mb-1">Category</div>
            <div className="text-[10px] text-inkSoft">
              {FINDING_CATEGORY_LABELS[finding.category] ?? finding.category}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(finding.matchedFields ?? []).map((field) => (
            <span key={`m-${field}`} className="border border-success/20 bg-success/[0.04] px-1.5 py-0.5 font-mono text-[8.5px] text-success">
              match · {field}
            </span>
          ))}
          {(finding.differingFields ?? []).map((field) => (
            <span key={`d-${field}`} className="border border-critical/20 bg-critical/[0.04] px-1.5 py-0.5 font-mono text-[8.5px] text-critical">
              differs · {field}
            </span>
          ))}
        </div>

        <div className="mt-3 border border-line bg-paper/40 px-3 py-2.5">
          <div className="overline mb-1">Recommended reviewer action</div>
          <p className="text-[10.5px] leading-relaxed text-inkSoft">{finding.recommendedAction}</p>
        </div>

        {finding.relatedInstrumentId && finding.relatedInstrumentId !== instrument.id && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted">
            <Scale size={11} />
            Linked record:
            <Link
              to={`/app/instruments/${finding.relatedInstrumentId}`}
              className="font-mono text-forest hover:text-copper"
            >
              {finding.relatedInstrumentId}
            </Link>
          </div>
        )}

        {finding.reviewerNotes && (
          <div className="mt-2 border-l-2 border-copper/40 pl-2 text-[10px] italic leading-relaxed text-muted">
            {finding.reviewerNotes}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/30 px-4 py-2.5">
        <span className="font-mono text-[8.5px] text-muted">
          {finding.reviewedAt ? `Reviewed ${formatDateTime(finding.reviewedAt)}` : `Created ${formatDateTime(finding.createdAt)}`}
        </span>
        <Link to={`/app/verification?view=findings&finding=${finding.id}`} className="btn-secondary btn-xs">
          Open in integrity workspace <ArrowRight size={10} />
        </Link>
      </div>
    </article>
  )
}

export function IntegrityPanel({ instrument, findings, state }) {
  const user = useCurrentUser()
  const runs = state.auditEvents.filter(
    (event) => event.entityId === instrument.id && event.action === 'integrity.analysis_run',
  )
  const activeFindings = findings.filter((finding) =>
    ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
  )
  const related = state.instruments.filter(
    (candidate) => candidate.id !== instrument.id && referenceMatch(instrument.reference, candidate.reference).score >= 82,
  )
  const allowed = can(user.role, PERMISSIONS.INTEGRITY_RUN)

  const handleRun = () => {
    const result = runIntegrityAnalysis(instrument.id)
    if (!result.ok) {
      toast.error('Analysis could not run', { description: result.reason })
      return
    }
    toast.success('Integrity analysis completed', {
      description: `${result.candidates.length} rule match(es) evaluated; ${result.created.length} new finding(s) created. Existing findings are never overwritten.`,
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <SectionHeading
            overline="Deterministic rule evaluation"
            title={`${findings.length} finding${findings.length === 1 ? '' : 's'} on this record`}
            description="These are review prompts, not conclusions of fraud. Similarity never establishes duplication on its own."
          />
          {allowed ? (
            <button type="button" className="btn-dark btn-sm" onClick={handleRun}>
              <Play size={12} /> Run analysis
            </button>
          ) : (
            <StatusBadge tone="neutral">Read-only role</StatusBadge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border border-line bg-paper/40 px-4 py-2.5 text-[10.5px]">
          <span className="text-muted">Current integrity status</span>
          <IntegrityBadge status={instrument.integrityStatus} />
          <span className="text-lineStrong">·</span>
          <span className="text-muted">
            {activeFindings.length} active / {findings.length} total
          </span>
          {runs.length > 0 && (
            <>
              <span className="text-lineStrong">·</span>
              <span className="text-muted">Last analysis {formatDateTime(runs[runs.length - 1].timestamp)}</span>
            </>
          )}
        </div>

        {findings.length === 0 ? (
          <div className="panel">
            <EmptyState
              compact
              icon={ScanSearch}
              title="No integrity findings recorded"
              message="Run the deterministic analysis to evaluate duplicate references, OCR variants, field inconsistencies, and lifecycle policy checks. A clear result does not replace verification."
              action={
                allowed ? (
                  <button type="button" className="btn-secondary btn-sm" onClick={handleRun}>
                    <Play size={12} /> Run analysis
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {[...findings]
              .sort((a, b) => {
                const rank = { critical: 0, high: 1, medium: 2, low: 3 }
                const activeDelta =
                  Number(['resolved', 'false_positive'].includes(a.reviewStatus)) -
                  Number(['resolved', 'false_positive'].includes(b.reviewStatus))
                return activeDelta || (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
              })
              .map((finding) => (
                <FindingCard key={finding.id} finding={finding} instrument={instrument} />
              ))}
          </div>
        )}
      </div>

      <aside className="space-y-5 xl:col-span-4">
        <section className="panel">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Reference fingerprint" title="Normalization levels" />
          </div>
          <div className="px-4 py-4">
            <div className="flex items-start gap-2.5">
              <Fingerprint size={18} className="mt-0.5 text-forest" />
              <div className="min-w-0">
                <div className="font-mono text-[13px] font-medium text-ink">{instrument.reference}</div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  The engine compares references at exact, strong-normalized, OCR-normalized, and fuzzy
                  levels. Each finding states which level matched.
                </p>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {[
                ['Exact', referenceMatch(instrument.reference, instrument.reference).left.exact],
                ['Strong normalized', referenceMatch(instrument.reference, instrument.reference).left.strong],
                ['OCR normalized', referenceMatch(instrument.reference, instrument.reference).left.ocr],
              ].map(([level, value]) => (
                <div key={level} className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-[10px] text-muted">{level}</dt>
                  <dd className="font-mono text-[10px] text-inkSoft">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="panel">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Peer scan" title="Reference neighbours" />
          </div>
          {related.length === 0 ? (
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 text-[10.5px] text-inkSoft">
                <CheckCircle2 size={13} className="text-success" /> No other record crosses the review
                threshold.
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                Threshold: 82% normalized similarity or a stronger match level.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {related.map((candidate) => {
                const match = referenceMatch(instrument.reference, candidate.reference)
                return (
                  <li key={candidate.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/app/instruments/${candidate.id}`}
                        className="font-mono text-[10px] text-forest hover:text-copper"
                      >
                        {candidate.id}
                      </Link>
                      <span className="font-mono text-[9px] text-muted">{match.score}%</span>
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-inkSoft">
                      {candidate.reference} · {candidate.institutionName}
                    </div>
                    <div className="mt-1 text-[9.5px] text-muted">{match.label}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="border border-warning/25 bg-warning/[0.04] px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-warning">
            <AlertTriangle size={12} /> Interpretation limit
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-inkSoft">
            A duplicate reference may be a legitimate bank-issued series, a transcription error, or a
            conflicting record. The system raises the question; an authorized human resolves it.
          </p>
        </div>
      </aside>
    </div>
  )
}
