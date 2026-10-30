import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  ExternalLink,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, InfoNote, SectionHeading } from '../components/shared/ui'
import { StatusBadge } from '../components/shared/StatusBadge'
import { SCENARIOS, DEMO_PATH } from '../data/scenarios'
import { runScenario } from '../services/scenarioService'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { can, PERMISSIONS } from '../data/users'
import { useDemoState } from '../hooks/useDemoState'

const ACCENT = {
  critical: 'border-critical/25 bg-critical/[0.04] text-critical',
  warning: 'border-warning/25 bg-warning/[0.04] text-warning',
  info: 'border-info/25 bg-info/[0.04] text-info',
  success: 'border-success/25 bg-success/[0.04] text-success',
}

const EXPECTED = {
  duplicate:
    'The engine finds a strong normalized match across two institutions. The output is a potential conflict that needs reviewer notes — not a fraud conclusion.',
  ocr: 'Submitted and extracted values remain distinct. Normalization explains a possible I/1 ambiguity; human review is still pending.',
  release:
    'The lifecycle service blocks the transition because sign-off is missing, preserves the record, and appends a blocked event to the audit trail.',
  renewal:
    'The derived maturity action is acknowledged, the queue changes, and an in-app notification/audit event is recorded. No external message is sent.',
  evidence:
    'A reviewer note is added to one field. Record-level verification does not silently improve, because confirmation remains pending.',
  correction:
    'The amount is corrected, the engine is re-run, and the original finding remains in history rather than being deleted.',
}

function ResultStep({ step }) {
  const icon =
    step.status === 'blocked' ? (
      <XCircle size={13} className="mt-0.5 shrink-0 text-critical" />
    ) : step.status === 'pending' ? (
      <Circle size={13} className="mt-0.5 shrink-0 text-warning" />
    ) : (
      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
    )
  return (
    <li className="flex gap-2.5 py-2">
      {icon}
      <div>
        <div className="text-[10.5px] font-medium text-ink">{step.label}</div>
        <div className="mt-0.5 text-[10px] leading-relaxed text-muted">{step.detail}</div>
      </div>
    </li>
  )
}

export default function DemoScenarios() {
  const user = useCurrentUser()
  const state = useDemoState()
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(null)
  const [activeId, setActiveId] = useState(SCENARIOS[0].id)
  const allowed = can(user.role, PERMISSIONS.SCENARIO_RUN)
  const scenario = SCENARIOS.find((item) => item.id === activeId) ?? SCENARIOS[0]
  const isActive = result?.scenario?.id === scenario.id

  const selectScenario = (id) => {
    setActiveId(id)
    setResult(null)
  }

  const handleRun = (target) => {
    if (!allowed) {
      toast.error('Scenario runner requires the administrator role')
      return
    }
    setRunning(target.id)
    const outcome = runScenario(target.id)
    setRunning(null)
    setResult(outcome)
    if (outcome.ok) {
      toast.success(`Scenario ${target.code} executed`, {
        description: outcome.blocked
          ? 'The expected policy block occurred and was recorded in the audit trail.'
          : 'Demo state changed. Follow the result links or reset data to run again.',
      })
    } else {
      toast.error(`Scenario ${target.code} could not run`, {
        description: outcome.summary,
      })
    }
  }

  return (
    <div>
      <PageHeader
        overline="Evaluation · Deterministic guided scenarios"
        title="Run the argument, not just the app."
        description="Six scenarios exercise the integrity engine, evidence provenance, lifecycle policy, deadlines, and correction retention. Each run uses the same service layer as the application and writes an audit event."
        meta={
          <>
            <span className="text-[10.5px] text-muted">{SCENARIOS.length} scenarios</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Default dataset: {state.instruments.length} FDRs</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Acting as {user.name}</span>
          </>
        }
        actions={
          <Link to="/app/settings" className="btn-secondary">
            <RotateCcw size={14} /> Reset demo data
          </Link>
        }
      />

      <InfoNote tone="warning" className="mb-5" title="Scenarios change local state">
        Run scenarios in order on a fresh dataset for the clearest demonstration. Every run is preserved
        in the audit trail. The release scenario intentionally triggers a blocked transition — that is a
        successful demonstration, not an error.
      </InfoNote>

      <div className="mb-5 border border-forest/20 bg-forest-deep px-5 py-4 text-paper">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-copper">
              Five-minute judging path
            </div>
            <h2 className="mt-0.5 font-display text-xl">
              The shortest route through the differentiators
            </h2>
          </div>
          <PlayCircle size={20} className="text-copper" />
        </div>
        <ol className="mt-3 grid gap-x-5 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PATH.map((item, index) => (
            <li key={item.route} className="flex gap-2">
              <span className="mt-0.5 font-mono text-[9px] text-copper">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Link
                to={item.route}
                className="flex items-center gap-1 text-[10.5px] leading-snug text-[#D4DED6] hover:text-white"
              >
                {item.label} <ExternalLink size={9} className="shrink-0 text-[#7E9385]" />
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {!allowed && (
        <InfoNote tone="warning" className="mb-5" title="Runner is administrator-only">
          You can inspect every scenario, but running the guided mutation requires the AICTE
          Administrator role. Switch role in the top navigation. This is a frontend demo control, not
          authentication.
        </InfoNote>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        <aside className="lg:col-span-4 xl:col-span-3">
          <section className="panel overflow-hidden lg:sticky lg:top-[76px]">
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Scenario index
                </span>
                <span className="font-mono text-[9px] text-muted">{SCENARIOS.length}</span>
              </div>
            </div>
            <div className="divide-y divide-line">
              {SCENARIOS.map((item) => {
                const selected = item.id === scenario.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectScenario(item.id)}
                    className={`group flex w-full items-start gap-2.5 border-l-2 px-3.5 py-3 text-left transition-colors ${
                      selected
                        ? 'border-copper bg-copper/[0.055]'
                        : 'border-transparent hover:border-lineStrong hover:bg-paper/60'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center border font-display text-sm ${
                        selected
                          ? 'border-copper/40 bg-copper/10 text-copper-dark'
                          : 'border-line bg-raised text-muted'
                      }`}
                    >
                      {item.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-medium leading-snug text-ink">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[8.5px] text-muted">
                        {item.subtitle}
                      </span>
                    </span>
                    {result?.scenario?.id === item.id ? (
                      <CheckCircle2 size={12} className="mt-1 shrink-0 text-success" />
                    ) : (
                      <ChevronRight
                        size={12}
                        className={`mt-1 shrink-0 transition-transform ${
                          selected ? 'text-copper' : 'text-lineStrong group-hover:translate-x-0.5'
                        }`}
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="border-t border-line bg-paper/30 px-3.5 py-2 text-[8.5px] leading-relaxed text-muted">
              Scenario letters are labels, not an execution order requirement.
            </div>
          </section>
        </aside>

        <div className="space-y-5 lg:col-span-8 xl:col-span-9">
          <article className="panel">
            <div className="border-b border-line px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center border font-display text-xl ${
                      ACCENT[scenario.accent]
                    }`}
                  >
                    {scenario.code}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                        Scenario {scenario.code}
                      </span>
                      <span className="text-lineStrong">·</span>
                      <span className="font-mono text-[9px] text-muted">
                        {scenario.instrumentId}
                        {scenario.findingId ? ` · ${scenario.findingId}` : ''}
                      </span>
                    </div>
                    <h2 className="mt-1 font-display text-[26px] leading-tight text-ink">
                      {scenario.title}
                    </h2>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-muted">
                      {scenario.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {scenario.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-line bg-paper px-1.5 py-0.5 font-mono text-[8px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-5 py-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <p className="text-[12px] leading-relaxed text-inkSoft">{scenario.description}</p>
                <div className="mt-4">
                  <div className="overline mb-2">What to observe</div>
                  <ol className="space-y-1.5">
                    {scenario.steps.map((step, index) => (
                      <li key={step} className="flex gap-2.5 text-[10.5px] leading-relaxed text-muted">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-line bg-paper font-mono text-[8px] text-muted">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="space-y-3 xl:col-span-5">
                <div className="border border-copper/25 bg-copper/[0.035] px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.07em] text-copper-dark">
                    <ShieldCheck size={11} /> Expected outcome
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
                    {EXPECTED[scenario.id]}
                  </p>
                </div>
                <div className="border border-line bg-paper/40 px-3.5 py-3">
                  <div className="overline mb-1">Runner effect</div>
                  <p className="text-[9.5px] leading-relaxed text-muted">
                    Invokes the same deterministic service layer as the workspace, then appends a
                    <span className="font-mono text-inkSoft"> demo.scenario_run </span>
                    audit event. It does not contact any external system.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-dark btn-sm"
                    onClick={() => handleRun(scenario)}
                    disabled={!allowed || running === scenario.id}
                  >
                    <PlayCircle size={12} />{' '}
                    {running === scenario.id ? 'Running…' : `Run scenario ${scenario.code}`}
                  </button>
                  <Link to={scenario.route} className="btn-secondary btn-sm">
                    {scenario.cta} <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>

            {isActive && result && (
              <div className="border-t border-copper/25 bg-copper/[0.025] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-copper-dark">
                    <CheckCircle2 size={12} /> Scenario result
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {result.blocked && (
                      <StatusBadge tone="critical" dot={false}>
                        Expected block recorded
                      </StatusBadge>
                    )}
                    {result.ok === false && (
                      <StatusBadge tone="warning" dot={false}>
                        Could not run
                      </StatusBadge>
                    )}
                  </div>
                </div>
                <p className="mt-2 max-w-4xl text-[11px] leading-relaxed text-inkSoft">
                  {result.summary}
                </p>
                <ul className="mt-2 divide-y divide-line/60">
                  {(result.steps ?? []).map((step, index) => (
                    <ResultStep key={`${step.label}-${index}`} step={step} />
                  ))}
                </ul>
                {result.links?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-line/70 pt-2.5">
                    {result.links.map((link) => (
                      <Link key={link.to} to={link.to} className="btn-secondary btn-xs">
                        {link.label} <ArrowRight size={10} />
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2.5">
                  <span className="text-[9px] text-muted">
                    Run {result.scenario?.code} on a fresh dataset to reproduce the same path.
                  </span>
                  <Link to="/app/governance?view=audit" className="btn-ghost btn-xs">
                    Inspect audit trail <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="panel">
              <div className="border-b border-line px-4 py-3">
                <SectionHeading overline="Scenario discipline" title="What is being proven" />
              </div>
              <ul className="divide-y divide-line">
                {[
                  ['Rules are explainable', 'Every integrity finding names a rule, fields, match level, and confidence.'],
                  ['Extraction is not trust', 'Submitted and OCR values remain separate; confirmation is visibly simulated.'],
                  ['Policy is enforced', 'Lifecycle transitions are blocked by permission, verification, approval, and findings.'],
                  ['History is preserved', 'Corrections resolve findings without deleting prior events.'],
                  ['Actions are auditable', 'Every scenario run, block, decision, and correction appends to the chain.'],
                ].map(([title, detail]) => (
                  <li key={title} className="px-4 py-2.5">
                    <div className="text-[10px] font-medium text-ink">{title}</div>
                    <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{detail}</div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="space-y-5">
              <section className="panel">
                <div className="border-b border-line px-4 py-3">
                  <SectionHeading overline="How to run a clean demo" title="Sequence" />
                </div>
                <ol className="divide-y divide-line text-[10px]">
                  {[
                    'Reset demo data from Settings if a scenario has already been run.',
                    'Use the Administrator role for the runner; switch roles to inspect other decisions.',
                    'Run A → F, opening each result link before moving on.',
                    'Finish in Governance → Audit trail to show the recorded evidence.',
                  ].map((step, index) => (
                    <li key={step} className="flex gap-2.5 px-4 py-2.5">
                      <span className="font-mono text-[8.5px] text-copper">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-relaxed text-inkSoft">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="border border-critical/25 bg-critical/[0.04] px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-critical">
                  <AlertTriangle size={12} /> No live systems
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
                  No AICTE, bank, payment, SMS, or email system is called. Scenarios mutate browser state
                  only.
                </p>
              </div>

              <div className="border border-line bg-paper/40 px-4 py-3">
                <div className="overline mb-1">Expected demo role</div>
                <StatusBadge tone="copper" dot={false}>
                  AICTE Administrator
                </StatusBadge>
                <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
                  The runner acts through named demo personas (reviewer, approver, admin) so each audit
                  event shows a plausible actor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
