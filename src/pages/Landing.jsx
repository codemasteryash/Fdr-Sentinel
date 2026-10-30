import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Fingerprint,
  GitBranch,
  Landmark,
  LockKeyhole,
  PlayCircle,
  ScanSearch,
  ScrollText,
  ShieldCheck,
} from 'lucide-react'

const PROCESS = [
  {
    number: '01',
    title: 'Register',
    icon: FileText,
    description:
      'Capture the FDR reference, holder, bank, branch, principal, dates, and supporting document.',
  },
  {
    number: '02',
    title: 'Inspect evidence',
    icon: Fingerprint,
    description:
      'Keep submitted, extracted, and normalized values separate. Every field carries a source locator.',
  },
  {
    number: '03',
    title: 'Verify',
    icon: ClipboardCheck,
    description:
      'Work the verification queue. Confirm evidence, record discrepancies, and document every human decision.',
  },
  {
    number: '04',
    title: 'Govern the lifecycle',
    icon: GitBranch,
    description:
      'Move records through policy-checked states. Missing approval or unresolved findings block release.',
  },
  {
    number: '05',
    title: 'Retain the trail',
    icon: ScrollText,
    description:
      'Every action, block, correction, and sign-off remains visible in an append-only local audit chain.',
  },
]

const DIFFERENTIATORS = [
  {
    title: 'Explainable integrity',
    icon: ScanSearch,
    description:
      'Duplicate references, OCR variants, amount variance, and missing fields raise review prompts — never automated accusations.',
    detail: 'Rule · matched fields · confidence · recommended action',
  },
  {
    title: 'Evidence provenance',
    icon: Fingerprint,
    description:
      'A confirmation is only as good as the field behind it. Source location and validation method travel with the value.',
    detail: 'Submitted ≠ extracted ≠ normalized ≠ confirmed',
  },
  {
    title: 'Policy-enforced lifecycle',
    icon: LockKeyhole,
    description:
      'Role permissions, verification state, material findings, and approving-authority sign-off are checked by the service layer.',
    detail: 'Blocked attempts are recorded, not hidden',
  },
  {
    title: 'Audit that survives correction',
    icon: ScrollText,
    description:
      'Fixing data never erases history. The original finding, reviewer reason, prior state, and corrected state remain linked.',
    detail: 'Append-only local hash chain',
  },
]

const SIGNALS = [
  {
    label: 'Cross-institution reference conflict',
    value: 'FND-2026-001',
    detail: 'Same normalized reference · different principal',
    tone: 'critical',
  },
  {
    label: 'OCR ambiguity',
    value: 'SLB-54I902',
    detail: 'I / 1 confusion requires human review',
    tone: 'warning',
  },
  {
    label: 'Release policy block',
    value: 'REL-03',
    detail: 'Approval missing · transition refused and logged',
    tone: 'info',
  },
]

const TONE = {
  critical: 'border-critical/30 bg-critical/[0.045] text-critical',
  warning: 'border-warning/30 bg-warning/[0.045] text-warning',
  info: 'border-info/30 bg-info/[0.045] text-info',
}

function BrandMark({ dark = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 items-center justify-center border ${
          dark ? 'border-copper/50 bg-copper/10 text-copper' : 'border-forest/20 bg-forest text-paper'
        }`}
      >
        <ShieldCheck size={17} strokeWidth={1.7} />
      </span>
      <span>
        <span
          className={`block font-display text-[19px] font-medium leading-none tracking-[-0.01em] ${
            dark ? 'text-paper' : 'text-ink'
          }`}
        >
          FDR Sentinel
        </span>
        <span
          className={`mt-1 block text-[8px] font-medium uppercase tracking-[0.18em] ${
            dark ? 'text-[#93A79A]' : 'text-muted'
          }`}
        >
          Instrument integrity
        </span>
      </span>
    </span>
  )
}

function DossierVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px] animate-fade-up lg:mx-0">
      <div className="absolute -left-3 top-7 hidden h-[calc(100%-2rem)] w-full border border-line/70 bg-paper/60 sm:block" />
      <div className="relative border border-lineStrong bg-raised shadow-lift">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <div className="overline text-copper-dark">Instrument dossier</div>
            <div className="mt-0.5 font-display text-[19px] leading-none text-ink">FDR-2026-004</div>
          </div>
          <span className="border border-copper/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-copper-dark">
            Synthetic
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px bg-line">
          <div className="bg-raised px-4 py-3">
            <div className="overline mb-1">Institution</div>
            <div className="text-[11px] font-medium text-ink">Deccan Institute of Applied Sciences</div>
            <div className="mt-0.5 text-[9px] text-muted">Maharashtra · Deccan</div>
          </div>
          <div className="bg-raised px-4 py-3">
            <div className="overline mb-1">Principal</div>
            <div className="font-mono text-[16px] text-ink">₹25,00,000</div>
            <div className="mt-0.5 text-[9px] text-muted">Matures 14 May 2027</div>
          </div>
        </div>

        <div className="border-t border-line px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="badge border-warning/30 bg-warning/[0.07] text-warning">
              <span className="dot bg-warning" /> Scrutiny
            </span>
            <span className="badge border-copper/30 bg-copper/[0.07] text-copper-dark">
              <span className="dot bg-copper" /> Partially confirmed
            </span>
            <span className="badge border-critical/30 bg-critical/[0.07] text-critical">
              <span className="dot bg-critical" /> Conflict
            </span>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="flex items-center justify-between border-b border-line/70 px-4 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
              Evidence passport
            </span>
            <span className="font-mono text-[8px] text-muted">3 / 7 confirmed</span>
          </div>
          {[
            ['FDR reference', 'DNB-847291', 'Normalized match'],
            ['Principal', '₹25,00,000', 'Submitted value'],
            ['Beneficiary', 'Deccan Institute', 'Missing source'],
          ].map(([field, value, state]) => (
            <div
              key={field}
              className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-2.5 last:border-0"
            >
              <span className="text-[10px] text-muted">{field}</span>
              <span className="font-mono text-[9.5px] text-inkSoft">{value}</span>
              <span className="text-[8px] uppercase tracking-[0.06em] text-muted">{state}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-line bg-warning/[0.035] px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <div className="text-[10px] font-semibold text-ink">
                FND-2026-001 · Potential duplicate reference
              </div>
              <div className="mt-0.5 text-[9px] leading-relaxed text-muted">
                Review prompt raised by XREF-01. A human decision is still required.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 -left-4 hidden w-[270px] border border-copper/30 bg-forest-deep px-4 py-3 text-paper shadow-drawer sm:block">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-copper">
            Decision trace
          </span>
          <span className="font-mono text-[8px] text-[#93A79A]">#AUD-0142</span>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-[#D4DED6]">
          Reviewer decision recorded with prior state, reason, actor, and policy outcome.
        </p>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="FDR Sentinel home">
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Landing">
            {[
              ['The problem', '#problem'],
              ['How it works', '#workflow'],
              ['Why Sentinel', '#why'],
              ['Trust boundary', '#trust'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[11px] font-medium text-muted transition-colors hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/app/demo" className="btn-ghost btn-sm hidden sm:inline-flex">
              <PlayCircle size={13} /> Guided demo
            </Link>
            <Link to="/app/overview" className="btn-dark btn-sm">
              Enter workspace <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <div className="mx-auto h-full max-w-[1280px] px-8">
              <div className="ml-[62%] h-full border-l border-line/60" />
            </div>
          </div>
          <div className="relative mx-auto grid max-w-[1280px] gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-px w-7 bg-copper" />
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-copper-dark">
                  SIH26265 · AICTE · Smart Automation
                </span>
              </div>
              <h1 className="max-w-[680px] font-display text-[48px] font-medium leading-[0.98] tracking-[-0.035em] text-ink sm:text-[62px] xl:text-[74px]">
                Financial instruments.
                <span className="block text-forest">Verified at every step.</span>
              </h1>
              <p className="mt-6 max-w-[580px] text-[14px] leading-relaxed text-inkSoft sm:text-[15px]">
                FDR Sentinel gives institutions and oversight teams one traceable workspace for fixed
                deposit receipts — from evidence capture and explainable integrity checks to policy-enforced
                lifecycle decisions and retained audit history.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/app/overview" className="btn-primary">
                  Explore the platform <ArrowRight size={14} />
                </Link>
                <a href="#workflow" className="btn-secondary">
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[10px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={11} className="text-success" /> Deterministic rules
                </span>
                <span className="text-lineStrong">/</span>
                <span className="inline-flex items-center gap-1.5">
                  <Fingerprint size={11} className="text-copper" /> Field-level provenance
                </span>
                <span className="text-lineStrong">/</span>
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole size={11} className="text-forest" /> Policy-checked actions
                </span>
              </div>
            </div>
            <DossierVisual />
          </div>
        </section>

        <section aria-label="Prototype scope" className="border-b border-line bg-raised">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-px bg-line px-0 sm:grid-cols-4">
            {[
              ['25', 'seeded instruments', 'Across ten institutions'],
              ['5', 'governed workspaces', 'One operating model'],
              ['6', 'guided scenarios', 'Same service layer as the app'],
              ['100%', 'local state', 'No live bank connection'],
            ].map(([value, label, detail]) => (
              <div key={label} className="bg-raised px-5 py-5 sm:px-7">
                <div className="font-display text-[28px] leading-none text-ink">{value}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-inkSoft">
                  {label}
                </div>
                <div className="mt-1 text-[9.5px] leading-snug text-muted">{detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="problem" className="border-b border-line">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-8 lg:py-28">
            <div>
              <div className="overline text-copper-dark">The operating gap</div>
              <h2 className="mt-3 max-w-[420px] font-display text-[36px] leading-[1.04] tracking-[-0.025em] text-ink sm:text-[44px]">
                A record can look complete and still be unverified.
              </h2>
              <p className="mt-5 max-w-[430px] text-[13px] leading-relaxed text-muted">
                Spreadsheets preserve values. They do not preserve the chain between a submitted field,
                its source, the reviewer who accepted it, and the policy that allowed a release.
              </p>
              <div className="mt-7 border-l-2 border-copper pl-4">
                <p className="font-display text-[19px] italic leading-snug text-forest">
                  “The difficult question is not whether the PDF exists. It is whether the decision around
                  it can be reconstructed.”
                </p>
              </div>
            </div>

            <div className="divide-y divide-line border-y border-line">
              {SIGNALS.map((signal) => (
                <div
                  key={signal.label}
                  className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${TONE[signal.tone]}`}
                    >
                      {signal.tone === 'critical' ? (
                        <Landmark size={14} />
                      ) : signal.tone === 'warning' ? (
                        <FileSearch size={14} />
                      ) : (
                        <LockKeyhole size={14} />
                      )}
                    </span>
                    <div>
                      <div className="text-[12px] font-semibold text-ink">{signal.label}</div>
                      <div className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                        {signal.detail}
                      </div>
                    </div>
                  </div>
                  <span className="ml-11 font-mono text-[10px] uppercase tracking-[0.08em] text-muted sm:ml-0">
                    {signal.value}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 py-4">
                <span className="text-[10px] leading-relaxed text-muted">
                  Every signal is a prompt for review, not a conclusion of fraud.
                </span>
                <Link
                  to="/app/verification"
                  className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-forest hover:text-copper"
                >
                  Investigation model <ArrowUpRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-b border-line bg-raised">
          <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="overline text-copper-dark">One controlled flow</div>
                <h2 className="mt-3 font-display text-[36px] leading-[1.04] tracking-[-0.025em] text-ink sm:text-[44px]">
                  From submission to sign-off,
                  <span className="block">without collapsing the evidence.</span>
                </h2>
              </div>
              <p className="max-w-[410px] text-[12px] leading-relaxed text-muted">
                Five workspaces follow the same record. Each stage adds evidence, decisions, and audit
                context rather than overwriting the last.
              </p>
            </div>

            <ol className="mt-12 grid gap-px bg-line lg:grid-cols-5">
              {PROCESS.map((step) => {
                const Icon = step.icon
                return (
                  <li key={step.number} className="relative bg-raised px-5 py-6 lg:min-h-[230px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-copper">{step.number}</span>
                      <Icon size={16} strokeWidth={1.7} className="text-forest" />
                    </div>
                    <h3 className="mt-7 font-display text-[21px] leading-none text-ink">{step.title}</h3>
                    <p className="mt-3 text-[10.5px] leading-relaxed text-muted">{step.description}</p>
                  </li>
                )
              })}
            </ol>

            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-success" /> Human decisions remain explicit at every
                gate.
              </span>
              <span className="font-mono">REGISTER → EVIDENCE → VERIFY → GOVERN → RETAIN</span>
            </div>
          </div>
        </section>

        <section id="why" className="border-b border-line">
          <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
              <div>
                <div className="overline text-copper-dark">What makes it different</div>
                <h2 className="mt-3 font-display text-[36px] leading-[1.04] tracking-[-0.025em] text-ink sm:text-[44px]">
                  Trust is assembled from smaller proofs.
                </h2>
                <p className="mt-5 text-[12.5px] leading-relaxed text-muted">
                  Not a single score, not a black-box verdict. Four visible mechanisms make every claim
                  inspectable and every action reversible only in the audit record — never in history.
                </p>
              </div>

              <div className="grid border border-line sm:grid-cols-2">
                {DIFFERENTIATORS.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <article
                      key={item.title}
                      className={`px-5 py-6 ${index % 2 === 0 ? 'sm:border-r' : ''} ${
                        index < 2 ? 'border-b' : ''
                      } border-line`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="text-copper" />
                        <h3 className="text-[12px] font-semibold text-ink">{item.title}</h3>
                      </div>
                      <p className="mt-2.5 text-[10.5px] leading-relaxed text-muted">
                        {item.description}
                      </p>
                      <div className="mt-4 border-t border-line pt-2 font-mono text-[8.5px] uppercase tracking-[0.06em] text-inkSoft/80">
                        {item.detail}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="bg-forest-deep text-paper">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:px-8 lg:py-24">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-px w-7 bg-copper" />
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-copper">
                  Trust boundary
                </span>
              </div>
              <h2 className="mt-4 max-w-[560px] font-display text-[34px] leading-[1.04] tracking-[-0.025em] sm:text-[42px]">
                A system that knows what it does not know.
              </h2>
              <p className="mt-5 max-w-[520px] text-[12.5px] leading-relaxed text-[#B7C4BA]">
                The prototype records simulated confirmations and approvals. It never claims a bank
                response, a legal release, or an AICTE authorization. Those boundaries are visible in the
                interface, not buried in a disclaimer.
              </p>
              <div className="mt-8 border-l-2 border-copper pl-4">
                <p className="max-w-[500px] font-display text-[22px] italic leading-snug text-[#E4EAE2]">
                  “The system raises the question. A human records the decision.”
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              <div className="bg-forest-deep px-5 py-6">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#93A79A]">
                  <CheckCircle2 size={12} className="text-copper" /> What it does
                </div>
                <ul className="mt-3 space-y-2 text-[10px] leading-relaxed text-[#D4DED6]">
                  <li>Explains every integrity rule and match</li>
                  <li>Keeps field provenance visible</li>
                  <li>Enforces lifecycle policy in services</li>
                  <li>Preserves corrections in audit history</li>
                </ul>
              </div>
              <div className="bg-forest-deep px-5 py-6">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#93A79A]">
                  <AlertTriangle size={12} className="text-copper" /> What it does not
                </div>
                <ul className="mt-3 space-y-2 text-[10px] leading-relaxed text-[#D4DED6]">
                  <li>Call a bank or AICTE system</li>
                  <li>Prove an instrument is genuine</li>
                  <li>Replace reviewer judgment</li>
                  <li>Provide production authentication</li>
                </ul>
              </div>
              <div className="bg-forest-deep px-5 py-6 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold text-paper">Synthetic demo data</div>
                    <p className="mt-1 text-[9.5px] leading-relaxed text-[#93A79A]">
                      25 instruments · 6 institutions · seeded findings and deadlines. State lives in this
                      browser.
                    </p>
                  </div>
                  <span className="border border-copper/40 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-copper">
                    Not government records
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-raised">
          <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:px-8">
            <div>
              <div className="overline text-copper-dark">Evaluation path</div>
              <h2 className="mt-3 font-display text-[30px] leading-tight text-ink">
                See the difficult cases, not the happy path.
              </h2>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Six deterministic scenarios exercise duplicate references, OCR ambiguity, blocked release,
                deadline escalation, evidence gaps, and correction retention.
              </p>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {[
                ['A', 'Potential duplicate across institutions', 'FDR-2026-004 · FND-2026-001'],
                ['C', 'Release without required approval', 'FDR-2026-017 · REL-03'],
                ['F', 'Correction without history deletion', 'FDR-2026-009 · FND-2026-004'],
              ].map(([code, title, detail]) => (
                <Link
                  key={code}
                  to="/app/demo"
                  className="group flex items-center gap-4 py-3.5 transition-colors hover:text-copper"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-lineStrong font-display text-[12px] text-ink">
                    {code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium text-ink group-hover:text-copper">
                      {title}
                    </span>
                    <span className="mt-0.5 block font-mono text-[8.5px] text-muted">{detail}</span>
                  </span>
                  <ArrowRight
                    size={13}
                    className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-copper"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-paper">
          <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="h-px w-7 bg-copper" />
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-copper-dark">
                    Enter the operating view
                  </span>
                </div>
                <h2 className="mt-4 max-w-[760px] font-display text-[42px] leading-[0.98] tracking-[-0.035em] text-ink sm:text-[58px]">
                  Bring every instrument into view.
                </h2>
                <p className="mt-5 max-w-[560px] text-[13px] leading-relaxed text-muted">
                  Start with the attention queue, open a live investigation, or follow a guided scenario.
                  The dataset is already loaded.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link to="/app/overview" className="btn-primary w-full justify-between px-5 py-3.5 text-sm sm:w-auto">
                  Enter FDR Sentinel <ArrowRight size={15} />
                </Link>
                <Link to="/app/demo" className="btn-secondary w-full justify-between px-5 py-3.5 text-sm sm:w-auto">
                  Follow the guided demo <PlayCircle size={15} />
                </Link>
                <span className="mt-1 max-w-[290px] text-[9.5px] leading-relaxed text-muted lg:text-right">
                  Synthetic demonstration only. No bank, payment, email, SMS, or government system is
                  contacted.
                </span>
              </div>
            </div>

            <div className="mt-14 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
              {[
                [Building2, 'Institution scoped', 'Officer views stay within the assigned institution.'],
                [BadgeCheck, 'Evidence gated', 'Verification requires field-level support and human review.'],
                [Landmark, 'Policy controlled', 'Release cannot bypass sign-off or unresolved material findings.'],
              ].map(([Icon, title, detail]) => (
                <div key={title} className="flex items-start gap-2.5">
                  <Icon size={14} className="mt-0.5 shrink-0 text-copper" />
                  <div>
                    <div className="text-[10.5px] font-semibold text-ink">{title}</div>
                    <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-raised">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] leading-relaxed text-muted">
            <span>SIH26265 · AICTE · Smart Automation</span>
            <span className="text-lineStrong">/</span>
            <span>Interactive prototype</span>
            <span className="text-lineStrong">/</span>
            <span>Synthetic data — not government records</span>
          </div>
          <Link
            to="/app/overview"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-forest hover:text-copper"
          >
            Open workspace <ArrowRight size={11} />
          </Link>
        </div>
      </footer>
    </div>
  )
}
