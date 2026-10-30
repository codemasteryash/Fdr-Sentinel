import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldQuestion,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Drawer } from '../shared/Overlay'
import { SeverityBadge, FindingStatusBadge, StatusBadge } from '../shared/StatusBadge'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { can, PERMISSIONS } from '../../data/users'
import { reviewFinding } from '../../services/findingService'
import { FINDING_DECISIONS, FINDING_CATEGORY_LABELS } from '../../data/statuses'
import { formatCurrency, formatDateTime } from '../../utils/format'

export function FindingDrawer({ finding, state, open, onClose }) {
  const user = useCurrentUser()
  const [decision, setDecision] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setDecision('')
    setNotes('')
    setError('')
  }, [open, finding?.id])

  if (!finding) return null

  const instrument = state.instruments.find((item) => item.id === finding.instrumentId)
  const related = finding.relatedInstrumentId
    ? state.instruments.find((item) => item.id === finding.relatedInstrumentId)
    : null
  const closed = ['resolved', 'false_positive'].includes(finding.reviewStatus)
  const canReview = can(user.role, PERMISSIONS.FINDING_REVIEW)

  const submit = () => {
    if (!decision) {
      setError('Select a reviewer decision.')
      return
    }
    if (notes.trim().length < 5) {
      setError('Reviewer notes of at least 5 characters are required.')
      return
    }
    setBusy(true)
    const result = reviewFinding({ findingId: finding.id, decision, notes, user })
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    toast.success(`Decision recorded for ${finding.id}`, {
      description: `${FINDING_DECISIONS[decision]}. The prior finding is retained; the decision and actor are in the audit trail.`,
    })
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-[660px]"
      eyebrow={`Integrity case · ${FINDING_CATEGORY_LABELS[finding.category] ?? finding.category}`}
      title={finding.title}
      subtitle={`${finding.id} · ${finding.rule}`}
      footer={
        canReview && !closed ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[9.5px] text-muted">Decision is written to the audit trail.</span>
            <button type="button" className="btn-dark btn-sm" onClick={submit} disabled={busy}>
              <CheckCircle2 size={13} /> {busy ? 'Recording…' : 'Record decision'}
            </button>
          </div>
        ) : (
          <span className="text-[9.5px] text-muted">
            {closed ? 'This finding is closed and retained for audit.' : 'Your role has read-only access.'}
          </span>
        )
      }
    >
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <FindingStatusBadge status={finding.reviewStatus} />
          <span className="font-mono text-[9px] text-muted">
            {finding.confidence}% match confidence
          </span>
          <span className="text-lineStrong">·</span>
          <span className="font-mono text-[9px] text-muted">{finding.matchType?.replaceAll('_', ' ')}</span>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-inkSoft">{finding.explanation}</p>

        <div className="mt-4 border border-warning/25 bg-warning/[0.04] px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-warning">
            <AlertTriangle size={11} /> Interpretation
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-inkSoft">
            This is a potential issue raised by deterministic rules or simulated extraction. It is not a
            finding of fraud, and no bank has been contacted. Similarity does not establish duplication.
          </p>
        </div>

        <div className="mt-5">
          <div className="overline mb-2">Affected records</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[instrument, related].filter(Boolean).map((record, index) => (
              <div key={record.id} className="border border-line bg-paper/40 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/app/instruments/${record.id}`} className="inline-flex items-center gap-1 font-mono text-[10px] text-forest hover:text-copper">
                    {record.id} <ExternalLink size={9} />
                  </Link>
                  <StatusBadge tone={index === 0 ? 'copper' : 'neutral'} dot={false} className="text-[8px]">
                    {index === 0 ? 'Primary' : 'Linked'}
                  </StatusBadge>
                </div>
                <div className="mt-1 text-[10.5px] font-medium text-ink">{record.institutionName}</div>
                <div className="mt-0.5 font-mono text-[9.5px] text-muted">{record.reference}</div>
                <div className="mt-1 text-[11px] text-inkSoft">{formatCurrency(record.amount)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="overline mb-1.5">Matching fields</div>
            <div className="flex flex-wrap gap-1">
              {(finding.matchedFields ?? []).length ? (
                finding.matchedFields.map((field) => (
                  <span key={field} className="border border-success/25 bg-success/[0.05] px-1.5 py-0.5 font-mono text-[8.5px] text-success">
                    {field}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted">None</span>
              )}
            </div>
          </div>
          <div>
            <div className="overline mb-1.5">Differing fields</div>
            <div className="flex flex-wrap gap-1">
              {(finding.differingFields ?? []).length ? (
                finding.differingFields.map((field) => (
                  <span key={field} className="border border-critical/25 bg-critical/[0.05] px-1.5 py-0.5 font-mono text-[8.5px] text-critical">
                    {field}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-muted">None</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 border border-line px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-inkSoft">
            <Scale size={11} /> Recommended action
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-inkSoft">{finding.recommendedAction}</p>
          {finding.evidenceMissing?.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-[10px] text-muted">
              {finding.evidenceMissing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        {finding.reviewerNotes && (
          <div className="mt-4 border-l-2 border-copper/40 pl-3">
            <div className="overline mb-1">Existing reviewer notes</div>
            <p className="text-[10.5px] leading-relaxed text-inkSoft">{finding.reviewerNotes}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[9px] text-muted">
          <span>Created {formatDateTime(finding.createdAt)}</span>
          {finding.reviewedAt && <span>Reviewed {formatDateTime(finding.reviewedAt)}</span>}
          <span className="font-mono">{finding.id}</span>
        </div>

        {canReview && !closed && (
          <div className="mt-5 border border-line bg-paper/30 px-4 py-4">
            <div className="flex items-center gap-2">
              <ShieldQuestion size={14} className="text-forest" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink">
                Record reviewer decision
              </h3>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(FINDING_DECISIONS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setDecision(value)
                    setError('')
                  }}
                  className={`border px-3 py-2 text-left text-[10.5px] transition-colors ${
                    decision === value
                      ? 'border-forest/50 bg-forest/[0.04] font-medium text-ink'
                      : 'border-line bg-raised text-inkSoft hover:border-lineStrong'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="label mt-3" htmlFor="finding-notes">
              Reviewer notes <span className="text-copper">*</span>
            </label>
            <textarea
              id="finding-notes"
              className="textarea min-h-[90px]"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value)
                setError('')
              }}
              placeholder="State the evidence reviewed, why this decision is justified, and any follow-up required…"
            />
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <p className="mt-2 text-[9px] leading-relaxed text-muted">
              Closed findings cannot be reopened in this demo. Resolutions are preserved, not deleted;
              downstream correction workflows retain the original finding.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
