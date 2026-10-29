import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  PlayCircle,
  RotateCcw,
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

const TONE_BAR = {
  critical: 'bg-critical',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
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
  const allowed = can(user.role, PERMISSIONS.SCENARIO_RUN)

  const handleRun = (scenario) => {
    if (!allowed) {
      toast.error('Scenario runner requires the administrator role')
      return
    }
    setRunning(scenario.id)
    const outcome = runScenario(scenario.id)
    setRunning(null)
    setResult(outcome)
    toast.success(`Scenario ${scenario.code} executed`, {
      description: outcome.blocked
        ? 'The expected policy block occurred and was recorded in the audit trail.'
        : 'Demo state changed. Follow the result links or reset data to run again.',
    })
  }

  return (
    <div>
      <PageHeader
        overline="Prototype · Guided evaluation"
        title="Demo Scenarios"
        description="Six deterministic scenarios exercise the integrity engine, evidence provenance, lifecycle policy, deadlines, and correction retention. Each run uses the same service layer as the application and writes audit events."
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
          <Link to="/settings" className="btn-secondary">
            <RotateCcw size={14} /> Reset demo
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
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-copper">Five-minute judging path</div>
            <h2 className="mt-0.5 font-display text-xl">The shortest route through the differentiators</h2>
          </div>
          <PlayCircle size={20} className="text-copper" />
        </div>
        <ol className="mt-3 grid gap-x-5 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PATH.map((item, index) => (
            <li key={item.route} className="flex gap-2">
              <span className="mt-0.5 font-mono text-[9px] text-copper">{String(index + 1).padStart(2, '0')}</span>
              <Link to={item.route} className="flex items-center gap-1 text-[10.5px] leading-snug text-[#D4DED6] hover:text-white">
                {item.label} <ExternalLink size={9} className="shrink-0 text-[#7E9385]" />
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {!allowed && (
        <InfoNote tone="warning" className="mb-5" title="Runner is administrator-only">
          You can open every scenario workspace, but running the guided mutation requires the AICTE
          Administrator role. Switch role in the top navigation. This is a frontend demo control, not
          authentication.
        </InfoNote>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {SCENARIOS.map((scenario) => {
            const isActive = result?.scenario?.id === scenario.id
            return (
              <article key={scenario.id} className={`panel border-l-2 ${isActive ? 'border-l-copper' : 'border-l-transparent'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center border font-display text-base ${ACCENT[scenario.accent]}`}>
                      {scenario.code}
                    </span>
                    <div>
                      <h2 className="font-display text-[17px] leading-tight text-ink">{scenario.title}</h2>
                      <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.06em] text-muted">{scenario.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {scenario.tags.map((tag) => (
                      <span key={tag} className="border border-line bg-paper px-1.5 py-0.5 font-mono text-[8px] text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-[11px] leading-relaxed text-inkSoft">{scenario.description}</p>
                  <div className="mt-3 space-y-1">
                    {scenario.steps.map((step, index) => (
                      <div key={step} className="flex gap-2 text-[10px] leading-relaxed text-muted">
                        <span className="font-mono text-[8.5px] text-muted/70">{String(index + 1).padStart(2, '0')}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-dark btn-sm"
                      onClick={() => handleRun(scenario)}
                      disabled={!allowed || running === scenario.id}
                    >
                      <PlayCircle size={12} /> {running === scenario.id ? 'Running…' : 'Run scenario'}
                    </button>
                    <Link to={scenario.route} className="btn-secondary btn-sm">
                      {scenario.cta} <ArrowRight size={11} />
                    </Link>
                    <span className="ml-auto font-mono text-[8.5px] text-muted">
                      {scenario.instrumentId}
                      {scenario.findingId ? ` · ${scenario.findingId}` : ''}
                    </span>
                  </div>
                </div>

                {isActive && result && (
                  <div className="border-t border-copper/25 bg-copper/[0.025] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-copper-dark">
                        <CheckCircle2 size={12} /> Scenario result
                      </div>
                      {result.blocked && (
                        <StatusBadge tone="critical" dot={false}>Expected block recorded</StatusBadge>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-inkSoft">{result.summary}</p>
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
                  </div>
                )}
              </article>
            )
          })}
        </div>

        <aside className="space-y-5 lg:col-span-4">
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

          {result && (
            <section className="panel">
              <div className="border-b border-line px-4 py-3">
                <SectionHeading overline="Latest run" title={`Scenario ${result.scenario?.code}`} />
              </div>
              <div className="px-4 py-3.5">
                <div className="text-[10.5px] font-medium text-ink">{result.scenario?.title}</div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  State was changed by the shared service layer. Open the audit trail to verify the
                  recorded event.
                </p>
                <Link to="/audit" className="btn-secondary btn-xs mt-3 w-full">
                  Inspect audit trail <ArrowRight size={10} />
                </Link>
              </div>
            </section>
          )}

          <div className="border border-critical/25 bg-critical/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-critical">
              <AlertTriangle size={12} /> No live systems
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              No AICTE, bank, payment, SMS, or email system is called. Scenarios mutate browser state only.
            </p>
          </div>

          <div className="border border-line bg-paper/40 px-4 py-3">
            <div className="overline mb-1">Expected demo role</div>
            <StatusBadge tone="copper" dot={false}>AICTE Administrator</StatusBadge>
            <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
              The runner acts through named demo personas (reviewer, approver, admin) so each audit event
              shows a plausible actor.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
