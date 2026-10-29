import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  PencilLine,
  GitBranch,
  FileText,
  ScanSearch,
  ShieldCheck,
  History,
  AlertTriangle,
  FileWarning,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, InfoNote } from '../components/shared/ui'
import { Tabs } from '../components/shared/Tabs'
import { StatusTriad, StatusBadge } from '../components/shared/StatusBadge'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { getInstrument, getInstrumentFindings, getInstrumentEvidence } from '../utils/selectors'
import { formatCurrency, formatDate, formatDateTime, relativeDays, daysUntil } from '../utils/format'
import { can, PERMISSIONS, getUserById } from '../data/users'
import { exportInstruments } from '../services/exportService'
import { getEntityAudit } from '../services/auditService'
import { InstrumentOverview } from '../components/instruments/InstrumentOverview'
import { DocumentPanel } from '../components/instruments/DocumentPanel'
import { IntegrityPanel } from '../components/instruments/IntegrityPanel'
import { EvidencePanel } from '../components/instruments/EvidencePanel'
import { LifecyclePanel } from '../components/lifecycle/LifecyclePanel'
import { AuditPanel } from '../components/audit/AuditPanel'
import { EditMetadataDialog } from '../components/instruments/EditMetadataDialog'

const TAB_IDS = ['overview', 'document', 'integrity', 'evidence', 'lifecycle', 'audit']

function AccessRestricted({ instrument, user }) {
  return (
    <div>
      <PageHeader
        overline="Registry · Institution scope"
        title="Record outside your institution"
        description={`The Institution Officer role is scoped to its assigned institution. This record belongs to ${instrument.institutionName}.`}
      />
      <InfoNote tone="warning" title="Frontend permission simulation">
        This page is blocked by a route-level scope check for the demo. It is not a secure
        authorization boundary. Switch role or return to the registry.
      </InfoNote>
      <div className="mt-4 flex gap-2">
        <Link to="/instruments" className="btn-secondary">
          <ArrowLeft size={14} /> Registry
        </Link>
      </div>
      <p className="mt-3 font-mono text-[9px] text-muted">Acting as {user.name} · {user.institutionId}</p>
    </div>
  )
}

function NotFoundInstrument() {
  return (
    <div>
      <PageHeader
        overline="Registry · Not found"
        title="Instrument not found"
        description="No synthetic record with this identifier exists in the current browser state. It may have been removed by a demo reset or the URL may be incorrect."
      />
      <Link to="/instruments" className="btn-dark">
        <ArrowLeft size={14} /> Return to registry
      </Link>
    </div>
  )
}

function ExtractionWorkspace({ instrument }) {
  const extracted = instrument.extracted
  const rows = extracted
    ? [
        ['reference', 'FDR reference', instrument.reference, extracted.reference],
        ['amount', 'Principal amount', instrument.amount, extracted.amount],
        ['issueDate', 'Issue date', instrument.issueDate, extracted.issueDate],
        ['maturityDate', 'Maturity date', instrument.maturityDate, extracted.maturityDate],
        ['beneficiary', 'Beneficiary', instrument.beneficiary, extracted.beneficiary],
      ]
    : []
  const same = (field, left, right) => {
    if (field === 'amount') return Number(left) === Number(right)
    return String(left ?? '') === String(right ?? '')
  }
  const value = (field, raw) => {
    if (raw === null || raw === undefined || raw === '') return '—'
    if (field === 'amount') return formatCurrency(raw)
    if (field === 'issueDate' || field === 'maturityDate') return formatDate(raw)
    return String(raw)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <DocumentPanel instrument={instrument} heightClass="h-[680px]" />
      </div>
      <aside className="space-y-5 xl:col-span-4">
        <section className="panel">
          <div className="border-b border-line px-4 py-3">
            <div className="overline mb-1">Document record</div>
            <h2 className="font-display text-lg text-ink">Source metadata</h2>
          </div>
          <dl className="divide-y divide-line px-4">
            {[
              ['File name', instrument.document?.name ?? '—'],
              ['File type', instrument.document?.type ?? '—'],
              ['File source', instrument.document?.source === 'seeded' ? 'Synthetic seed' : 'Local upload'],
              ['Document ID', instrument.document?.id ?? '—'],
              ['Extraction state', instrument.extractionStatus],
              ['Extraction confidence', extracted ? `${Math.round((extracted.confidence ?? 0) * 100)}%` : '—'],
            ].map(([label, content]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-[10px] text-muted">{label}</dt>
                <dd className="max-w-[62%] break-words text-right font-mono text-[9.5px] text-inkSoft">{content}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel">
          <div className="border-b border-line px-4 py-3">
            <div className="overline mb-1">Simulated extraction</div>
            <h2 className="font-display text-lg text-ink">Submitted vs extracted</h2>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              OCR output is shown separately and is never silently promoted over the institution value.
            </p>
          </div>
          {!extracted ? (
            <div className="px-4 py-5 text-[10.5px] leading-relaxed text-muted">
              No extraction has been simulated for this record. The submitted values remain the only
              recorded evidence.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[420px]">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Submitted</th>
                    <th>Extracted</th>
                    <th>Align</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([field, label, submitted, extractedValue]) => {
                    const aligned = same(field, submitted, extractedValue)
                    return (
                      <tr key={field}>
                        <td className="text-[10px]">{label}</td>
                        <td className="font-mono text-[9.5px] text-ink">{value(field, submitted)}</td>
                        <td className="font-mono text-[9.5px] text-muted">{value(field, extractedValue)}</td>
                        <td>
                          <StatusBadge tone={aligned ? 'success' : 'warning'} dot={false} className="text-[8px]">
                            {aligned ? 'Aligned' : 'Variance'}
                          </StatusBadge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-line bg-warning/[0.03] px-4 py-2.5 text-[9.5px] leading-relaxed text-inkSoft">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-warning">Demo limitation · </span>
            Extraction is seeded or absent. The prototype does not run a real OCR model. Aligned values
            are not independent confirmation.
          </div>
        </section>

        <section className="border border-line bg-paper/40 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-inkSoft">
            <FileWarning size={12} className="text-copper" /> File handling
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            Uploaded bytes live in IndexedDB in this browser. Clearing site data will remove the
            preview while the metadata remains in localStorage. Seed documents are generated SVG
            placeholders, not scanned bank instruments.
          </p>
        </section>
      </aside>
    </div>
  )
}

export default function InstrumentDetail() {
  const { id } = useParams()
  const state = useDemoState()
  const user = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editOpen, setEditOpen] = useState(false)
  const instrument = getInstrument(state, id)
  const tab = TAB_IDS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const field = searchParams.get('field') ?? ''

  const findings = useMemo(
    () => (instrument ? getInstrumentFindings(state, instrument.id) : []),
    [state, instrument],
  )
  const evidence = useMemo(
    () => (instrument ? getInstrumentEvidence(state, instrument.id) : []),
    [state, instrument],
  )
  const entityEvents = useMemo(
    () => (instrument ? getEntityAudit(state, instrument.id) : []),
    [state, instrument],
  )

  if (!instrument) return <NotFoundInstrument />
  if (user.role === 'officer' && instrument.institutionId !== user.institutionId) {
    return <AccessRestricted instrument={instrument} user={user} />
  }

  const changeTab = (next) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    if (next !== 'evidence') params.delete('field')
    setSearchParams(params, { replace: true })
  }

  const reviewer = getUserById(instrument.reviewerId)
  const maturityDays = daysUntil(instrument.maturityDate)
  const canEdit =
    can(user.role, PERMISSIONS.FINDING_REVIEW) ||
    (user.role === 'officer' &&
      user.institutionId === instrument.institutionId &&
      ['submitted', 'returned', 'renewal_due'].includes(instrument.lifecycleStatus))
  const canExport = can(user.role, PERMISSIONS.EXPORT)

  const handleExport = () => {
    exportInstruments([instrument], `Instrument ${instrument.id}`)
    toast.success('Record exported', { description: `${instrument.id} CSV generated locally.` })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <Link to="/instruments" className="hover:text-forest">
          Registry
        </Link>
        <ChevronRight size={10} />
        <span className="font-mono text-inkSoft">{instrument.id}</span>
        <ChevronRight size={10} />
        <span>{instrument.reference}</span>
      </div>

      <PageHeader
        overline={`Registry · ${instrument.institutionId}`}
        title={instrument.reference}
        description={
          <>
            {instrument.bank} · {instrument.branch}. Held by{' '}
            <Link to={`/institutions/${instrument.institutionId}`} className="text-forest hover:text-copper">
              {instrument.institutionName}
            </Link>
            . Principal {formatCurrency(instrument.amount)}; matures {formatDate(instrument.maturityDate)}{' '}
            ({relativeDays(instrument.maturityDate)}).
          </>
        }
        meta={
          <>
            <span className="font-mono text-[10px] text-inkSoft">{instrument.id}</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Reviewer {reviewer?.name ?? 'Unassigned'}</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Updated {formatDateTime(instrument.updatedAt)}</span>
            {maturityDays !== null && maturityDays <= 30 && (
              <>
                <span className="text-lineStrong">·</span>
                <StatusBadge tone={maturityDays < 0 ? 'critical' : 'warning'}>
                  {maturityDays < 0 ? 'Matured' : 'Maturity window'}
                </StatusBadge>
              </>
            )}
          </>
        }
        actions={
          <>
            {canEdit && (
              <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
                <PencilLine size={14} /> Correct metadata
              </button>
            )}
            {canExport && (
              <button type="button" className="btn-secondary" onClick={handleExport}>
                <Download size={14} /> Export
              </button>
            )}
            {!['released', 'rejected'].includes(instrument.lifecycleStatus) && (
              <Link to={`/lifecycle/${instrument.id}`} className="btn-dark">
                <GitBranch size={14} /> Lifecycle action
              </Link>
            )}
          </>
        }
      >
        <div className="mt-5 grid gap-4 border border-line bg-raised px-4 py-3.5 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <StatusTriad instrument={instrument} />
          <div className="border-t border-line pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <p className="text-[10px] leading-relaxed text-muted">
              These dimensions are deliberately independent. A record can have verified lifecycle
              progress while integrity remains in conflict or evidence confirmation is incomplete. No
              single badge is treated as proof of authenticity.
            </p>
          </div>
        </div>
      </PageHeader>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'document', label: 'Document' },
          { id: 'integrity', label: 'Integrity', count: findings.length },
          { id: 'evidence', label: 'Evidence', count: evidence.length },
          { id: 'lifecycle', label: 'Lifecycle' },
          { id: 'audit', label: 'Audit', count: entityEvents.length },
        ]}
        active={tab}
        onChange={changeTab}
        className="mb-5"
      />

      {tab === 'overview' && (
        <InstrumentOverview
          instrument={instrument}
          state={state}
          findings={findings}
          evidence={evidence}
          onTabChange={changeTab}
        />
      )}
      {tab === 'document' && <ExtractionWorkspace instrument={instrument} />}
      {tab === 'integrity' && (
        <IntegrityPanel instrument={instrument} findings={findings} state={state} />
      )}
      {tab === 'evidence' && (
        <EvidencePanel
          instrument={instrument}
          evidence={evidence}
          state={state}
          highlightField={field}
        />
      )}
      {tab === 'lifecycle' && (
        <LifecyclePanel instrument={instrument} findings={findings} state={state} />
      )}
      {tab === 'audit' && (
        <AuditPanel
          events={entityEvents}
          entityId={instrument.id}
          showEntity
          title={`Audit trail · ${instrument.id}`}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[9.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={11} /> Synthetic record · local-only state · no bank connection
        </span>
        <div className="flex items-center gap-3">
          <button type="button" className="inline-flex items-center gap-1 hover:text-forest" onClick={() => changeTab('integrity')}>
            <ScanSearch size={10} /> Integrity
          </button>
          <button type="button" className="inline-flex items-center gap-1 hover:text-forest" onClick={() => changeTab('document')}>
            <FileText size={10} /> Document
          </button>
          <button type="button" className="inline-flex items-center gap-1 hover:text-forest" onClick={() => changeTab('audit')}>
            <History size={10} /> History
          </button>
        </div>
      </div>

      <EditMetadataDialog open={editOpen} onClose={() => setEditOpen(false)} instrument={instrument} />
    </div>
  )
}
