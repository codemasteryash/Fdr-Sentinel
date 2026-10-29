import {
  LIFECYCLE_LABELS,
  LIFECYCLE_SHORT_LABELS,
  LIFECYCLE_TONE,
  VERIFICATION_LABELS,
  VERIFICATION_SHORT_LABELS,
  VERIFICATION_TONE,
  INTEGRITY_LABELS,
  INTEGRITY_TONE,
  SEVERITY_LABELS,
  SEVERITY_TONE,
  FINDING_STATUS_LABELS,
  FINDING_STATUS_TONE,
  EVIDENCE_STATUS_LABELS,
  EVIDENCE_STATUS_TONE,
  PRIORITY_LABELS,
  PRIORITY_TONE,
  INSTITUTION_STATUS_TONE,
} from '../../data/statuses'
import { INSTITUTION_STATUS_LABELS } from '../../data/institutions'
import { TONE_CLASSES, TONE_DOT } from '../../data/tones'

export function StatusBadge({ tone = 'neutral', children, dot = true, className = '' }) {
  return (
    <span className={`badge ${TONE_CLASSES[tone] ?? TONE_CLASSES.neutral} ${className}`}>
      {dot && <span className={`dot ${TONE_DOT[tone] ?? TONE_DOT.neutral}`} />}
      {children}
    </span>
  )
}

export function LifecycleBadge({ status, dot = true, className = '', short = false }) {
  const labels = short ? LIFECYCLE_SHORT_LABELS : LIFECYCLE_LABELS
  return (
    <StatusBadge
      tone={LIFECYCLE_TONE[status] ?? 'neutral'}
      dot={dot}
      className={className}
    >
      {labels[status] ?? status}
    </StatusBadge>
  )
}

export function VerificationBadge({ status, dot = true, className = '', short = false }) {
  const labels = short ? VERIFICATION_SHORT_LABELS : VERIFICATION_LABELS
  return (
    <StatusBadge
      tone={VERIFICATION_TONE[status] ?? 'neutral'}
      dot={dot}
      className={className}
    >
      {labels[status] ?? status}
    </StatusBadge>
  )
}

export function IntegrityBadge({ status, dot = true }) {
  return (
    <StatusBadge tone={INTEGRITY_TONE[status] ?? 'neutral'} dot={dot}>
      {INTEGRITY_LABELS[status] ?? status}
    </StatusBadge>
  )
}

export function SeverityBadge({ severity }) {
  return (
    <StatusBadge tone={SEVERITY_TONE[severity] ?? 'neutral'}>
      {SEVERITY_LABELS[severity] ?? severity}
    </StatusBadge>
  )
}

export function FindingStatusBadge({ status }) {
  return (
    <StatusBadge tone={FINDING_STATUS_TONE[status] ?? 'neutral'}>
      {FINDING_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  )
}

export function EvidenceStatusBadge({ status }) {
  return (
    <StatusBadge tone={EVIDENCE_STATUS_TONE[status] ?? 'neutral'}>
      {EVIDENCE_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  )
}

export function PriorityBadge({ priority }) {
  return (
    <StatusBadge tone={PRIORITY_TONE[priority] ?? 'neutral'}>
      {PRIORITY_LABELS[priority] ?? priority}
    </StatusBadge>
  )
}

export function InstitutionStatusBadge({ status }) {
  return (
    <StatusBadge tone={INSTITUTION_STATUS_TONE[status] ?? 'neutral'}>
      {INSTITUTION_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  )
}

export function StatusTriad({ instrument, compact = false }) {
  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'grid gap-3 sm:grid-cols-3'}>
      <div>
        {!compact && <div className="overline mb-1.5">Lifecycle</div>}
        <LifecycleBadge status={instrument.lifecycleStatus} />
      </div>
      <div>
        {!compact && <div className="overline mb-1.5">Verification</div>}
        <VerificationBadge status={instrument.verificationStatus} />
      </div>
      <div>
        {!compact && <div className="overline mb-1.5">Integrity</div>}
        <IntegrityBadge status={instrument.integrityStatus} />
      </div>
    </div>
  )
}
