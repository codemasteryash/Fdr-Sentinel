import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  FileText,
  Link2,
  ShieldCheck,
  Stamp,
} from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { formatCurrency, formatDate, formatDateTime, daysUntil, relativeDays } from '../../utils/format'
import { formatFileSize } from '../../utils/validation'
import { SeverityBadge, FindingStatusBadge, StatusBadge } from '../shared/StatusBadge'
import { Progress, SectionHeading, LinkArrow } from '../shared/ui'
import {  } from '../../services/findingService'
import { buildVerificationChecklist } from '../../services/verificationService'
import { computeCoverage } from '../../services/evidenceService'
import { buildDeadlineActions } from '../../services/deadlineEngine'
import { getUserById } from '../../data/users'
import { FINDING_CATEGORY_LABELS, DEADLINE_TYPE_LABELS, PRIORITY_LABELS } from '../../data/statuses'

function Fact({ label, children, mono = false }) {
  return (
    <div>
      <dt className="overline mb-0.5">{label}</dt>
      <dd className={`text-[11.5px] font-medium text-ink ${mono ? 'font-mono text-[11px]' : ''}`}>
        {children}
      </dd>
    </div>
  )
}

export function InstrumentOverview({ instrument, state, findings, evidence, onTabChange }) {
  const checklist = buildVerificationChecklist(state, instrument)
  const checklistDone = checklist.filter((item) => item.done).length
  const coverage = computeCoverage(evidence)
  const activeFindings = findings.filter((finding) =>
    ['open', 'in_review', 'confirmed'].includes(finding.reviewStatus),
  )
  const deadlines = buildDeadlineActions(state).filter(
    (action) => action.instrumentId === instrument.id && action.status !== 'completed',
  )
  const reviewer = getUserById(instrument.reviewerId)
  const termDays =
    instrument.issueDate && instrument.maturityDate
      ? differenceInCalendarDays(parseISO(instrument.maturityDate), parseISO(instrument.issueDate))
      : null
  const maturityDays = daysUntil(instrument.maturityDate)

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="space-y-5 xl:col-span-8">
        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <SectionHeading overline="Record" title="Instrument facts" />
            <span className="font-mono text-[9px] text-muted">Updated {formatDateTime(instrument.updatedAt)}</span>
          </div>
          <dl className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Institution">
              <Link to={`/institutions/${instrument.institutionId}`} className="hover:text-copper">
                {instrument.institutionName}
              </Link>
            </Fact>
            <Fact label="Institution ID" mono>
              {instrument.institutionId}
            </Fact>
            <Fact label="Issuing bank / branch">
              {instrument.bank}
              <span className="block text-[10px] font-normal text-muted">{instrument.branch}</span>
            </Fact>
            <Fact label="FDR reference" mono>
              {instrument.reference}
            </Fact>
            <Fact label="Principal amount">{formatCurrency(instrument.amount)}</Fact>
            <Fact label="Purpose">
              <span className="font-normal text-inkSoft">{instrument.purpose}</span>
            </Fact>
            <Fact label="Issue date">{formatDate(instrument.issueDate)}</Fact>
            <Fact label="Maturity date">
              {formatDate(instrument.maturityDate)}
              <span className="ml-1.5 text-[10px] font-normal text-muted">({relativeDays(instrument.maturityDate)})</span>
            </Fact>
            <Fact label="Term">{termDays ? `${termDays} days` : '—'}</Fact>
            <Fact label="Beneficiary">
              <span className="font-normal text-inkSoft">{instrument.beneficiary || 'Not stated'}</span>
            </Fact>
            <Fact label="Holder">
              <span className="font-normal text-inkSoft">{instrument.holder}</span>
            </Fact>
            <Fact label="Assigned reviewer">{reviewer?.name ?? 'Unassigned'}</Fact>
            <Fact label="Submitted by">
              {instrument.submittedBy}
              <span className="block font-mono text-[9px] font-normal text-muted">{formatDate(instrument.createdAt)}</span>
            </Fact>
            <Fact label="Extraction">
              <StatusBadge tone={instrument.extractionStatus === 'extracted' ? 'info' : 'neutral'} dot={false}>
                {instrument.extractionStatus === 'extracted' ? 'Simulated OCR complete' : 'Extraction pending'}
              </StatusBadge>
            </Fact>
            <Fact label="Record tags">
              {instrument.tags?.length ? (
                <span className="flex flex-wrap gap-1">
                  {instrument.tags.map((tag) => (
                    <span key={tag} className="border border-line bg-paper px-1.5 py-0.5 font-mono text-[8.5px] text-muted">
                      {tag}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="font-normal text-muted">None</span>
              )}
            </Fact>
          </dl>
          {instrument.notes && (
            <div className="border-t border-line bg-paper/40 px-4 py-3">
              <div className="overline mb-1">Record note</div>
              <p className="text-[11px] leading-relaxed text-inkSoft">{instrument.notes}</p>
            </div>
          )}
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="panel flex flex-col">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHeading overline="Source" title="Supporting document" />
              <FileText size={15} className="text-muted" />
            </div>
            <div className="flex flex-1 flex-col px-4 py-4">
              {instrument.document ? (
                <>
                  <div className="text-[12px] font-medium text-ink">{instrument.document.name}</div>
                  <div className="mt-0.5 font-mono text-[9.5px] text-muted">
                    {formatFileSize(instrument.document.size)} · {instrument.document.type}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <StatusBadge tone={instrument.document.source === 'seeded' ? 'neutral' : 'info'}>
                      {instrument.document.source === 'seeded' ? 'Synthetic seed' : 'Locally uploaded'}
                    </StatusBadge>
                    <StatusBadge
                      tone={instrument.extractionStatus === 'extracted' ? 'info' : 'neutral'}
                      dot={false}
                    >
                      {instrument.extractionStatus === 'extracted' ? 'OCR simulated' : 'OCR not run'}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
                    The preview is a local copy. Extraction values are simulated and visibly separated
                    from institution-submitted values.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-muted">No supporting document is attached to this record.</p>
              )}
              <div className="mt-auto pt-4">
                <button type="button" className="btn-secondary btn-sm w-full" onClick={() => onTabChange('document')}>
                  Open document workspace <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </section>

          <section className="panel flex flex-col">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionHeading overline="Integrity" title="Linked findings" />
              <Link2 size={15} className="text-muted" />
            </div>
            <div className="flex flex-1 flex-col">
              {activeFindings.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
                  <CheckCircle2 size={19} className="mb-2 text-success" />
                  <p className="text-[11px] font-medium text-ink">No active findings</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    This does not by itself confirm the instrument.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {activeFindings.slice(0, 3).map((finding) => (
                    <li key={finding.id}>
                      <Link
                        to={`/integrity?finding=${finding.id}`}
                        className="block px-4 py-3 transition-colors hover:bg-paper/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[9.5px] text-muted">{finding.id}</span>
                          <SeverityBadge severity={finding.severity} />
                        </div>
                        <div className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-ink">
                          {finding.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[9.5px] text-muted">
                          <span>{FINDING_CATEGORY_LABELS[finding.category] ?? finding.category}</span>
                          <FindingStatusBadge status={finding.reviewStatus} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto border-t border-line px-4 py-3">
                <button type="button" className="btn-ghost btn-xs w-full" onClick={() => onTabChange('integrity')}>
                  View integrity analysis <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHeading overline="Lifecycle" title="How this record reached its current state" />
            <Stamp size={15} className="text-muted" />
          </div>
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <div>
              <div className="overline mb-2">Current position</div>
              <p className="text-[11.5px] leading-relaxed text-inkSoft">
                This instrument is <span className="font-medium text-ink">{instrument.lifecycleStatus.replaceAll('_', ' ')}</span>.
                Lifecycle state does not imply that the document was independently verified. Use the
                separate status dimensions above to judge evidence quality.
              </p>
            </div>
            <div>
              <div className="overline mb-2">Next policy step</div>
              <p className="text-[11.5px] leading-relaxed text-inkSoft">
                {['released', 'rejected'].includes(instrument.lifecycleStatus)
                  ? 'This record is closed under the demo policy. No further transitions are available.'
                  : 'Open the lifecycle workspace to see every configured transition, its required role, and any blocking policy checks before acting.'}
              </p>
              <Link to={`/lifecycle/${instrument.id}`} className="mt-2 inline-block">
                <LinkArrow>Open lifecycle workspace</LinkArrow>
              </Link>
            </div>
          </div>
          {maturityDays !== null && maturityDays <= 90 && instrument.lifecycleStatus !== 'released' && (
            <div className="flex items-center justify-between gap-3 border-t border-line bg-copper/[0.03] px-4 py-2.5">
              <div className="flex items-center gap-2 text-[10.5px] text-inkSoft">
                <CalendarClock size={13} className="text-copper" />
                Maturity {relativeDays(instrument.maturityDate)}.
              </div>
              <Link to="/deadlines" className="btn-ghost btn-xs">
                Deadline queue <ArrowRight size={10} />
              </Link>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5 xl:col-span-4">
        <section className="panel">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Verification" title="Checklist readiness" />
          </div>
          <div className="px-4 py-4">
            <Progress
              value={Math.round((checklistDone / checklist.length) * 100)}
              label={`${checklistDone} of ${checklist.length} checks complete`}
              tone={checklistDone === checklist.length ? 'success' : 'forest'}
            />
            <ul className="mt-3 space-y-2">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  {item.done ? (
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                  ) : (
                    <Circle size={13} className="mt-0.5 shrink-0 text-muted/50" />
                  )}
                  <div>
                    <div className={`text-[10.5px] ${item.done ? 'text-inkSoft' : 'text-ink'}`}>{item.label}</div>
                    {!item.done && <div className="text-[9.5px] leading-relaxed text-muted">{item.detail}</div>}
                  </div>
                </li>
              ))}
            </ul>
            <Link to={`/verification/${instrument.id}`} className="mt-3 block">
              <span className="btn-secondary btn-sm w-full">
                Open verification workspace <ArrowRight size={12} />
              </span>
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Evidence" title="Passport coverage" />
          </div>
          <div className="px-4 py-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-3xl text-ink">{coverage.percent}%</div>
                <div className="text-[10px] text-muted">internally consistent fields</div>
              </div>
              <ShieldCheck size={24} strokeWidth={1.3} className="text-forest/60" />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
              <div>
                <dt className="overline mb-0.5">Fields</dt>
                <dd className="font-mono text-[12px] text-ink">{coverage.total}</dd>
              </div>
              <div>
                <dt className="overline mb-0.5">Confirmed</dt>
                <dd className="font-mono text-[12px] text-success">{coverage.confirmed}</dd>
              </div>
              <div>
                <dt className="overline mb-0.5">Missing</dt>
                <dd className={`font-mono text-[12px] ${coverage.missing ? 'text-critical' : 'text-ink'}`}>
                  {coverage.missing}
                </dd>
              </div>
            </dl>
            <button type="button" className="btn-ghost btn-xs mt-3 w-full" onClick={() => onTabChange('evidence')}>
              Inspect field provenance <ArrowRight size={11} />
            </button>
          </div>
        </section>

        {instrument.approval?.required && (
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Release" title="Approval record" />
            </div>
            <div className="px-4 py-4">
              {instrument.approval.approved ? (
                <>
                  <StatusBadge tone="success">Approved (demo)</StatusBadge>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                    Signed off by {getUserById(instrument.approval.approvedBy)?.name ?? 'approving authority'} on{' '}
                    {formatDate(instrument.approval.approvedAt)}. This is a simulated sign-off.
                  </p>
                  {instrument.approval.note && (
                    <p className="mt-2 border-l-2 border-line pl-2 text-[10.5px] italic text-inkSoft">
                      {instrument.approval.note}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <StatusBadge tone="warning">Sign-off missing</StatusBadge>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                    Release policy REL-03 blocks release until a permitted approving authority records
                    sign-off.
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        <section className="panel">
          <div className="border-b border-line px-4 py-3">
            <SectionHeading overline="Actions" title="Upcoming deadlines" />
          </div>
          {deadlines.length === 0 ? (
            <p className="px-4 py-4 text-[10.5px] text-muted">
              No generated deadline action for this record under the current lead times.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {deadlines.slice(0, 3).map((action) => (
                <li key={action.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10.5px] font-medium text-ink">
                      {DEADLINE_TYPE_LABELS[action.type] ?? action.type}
                    </span>
                    <StatusBadge
                      tone={action.priority === 'overdue' || action.priority === 'critical' ? 'critical' : action.priority === 'due_soon' ? 'warning' : 'info'}
                    >
                      {PRIORITY_LABELS[action.priority] ?? action.priority}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[9.5px] text-muted">
                    Due {formatDate(action.dueDate)} · {relativeDays(action.dueDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line px-4 py-2.5">
            <Link to="/deadlines" className="btn-ghost btn-xs w-full">
              Open deadline queue <ArrowRight size={11} />
            </Link>
          </div>
        </section>
      </aside>
    </div>
  )
}
