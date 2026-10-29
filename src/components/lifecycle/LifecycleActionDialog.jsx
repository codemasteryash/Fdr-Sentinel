import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, AlertTriangle, Check, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../shared/Overlay'
import { LIFECYCLE_LABELS } from '../../data/statuses'
import {
  getAvailableTransitions,
  performTransition,
  recordReleaseApproval,
} from '../../services/lifecycleEngine'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { ROLES } from '../../data/users'

export function LifecycleActionDialog({ open, onClose, instrument, findings = [] }) {
  const user = useCurrentUser()
  const [selectedId, setSelectedId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const options = useMemo(
    () => (instrument ? getAvailableTransitions(instrument, user, findings) : []),
    [instrument, user, findings],
  )

  useEffect(() => {
    if (!open) return
    const firstAllowed = options.find((option) => option.check.allowed)
    setSelectedId(firstAllowed?.id ?? options[0]?.id ?? '')
    setReason('')
    setError('')
  }, [open, options])

  const selected = options.find((option) => option.id === selectedId)

  const handleSubmit = () => {
    if (!selected) {
      setError('Select a lifecycle action.')
      return
    }
    if (!reason.trim()) {
      setError('A written reason is required for lifecycle decisions.')
      return
    }
    setBusy(true)
    const result = performTransition({
      instrumentId: instrument.id,
      to: selected.to,
      reason,
      user,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.reasons.join(' '))
      toast.error('Transition blocked and recorded', {
        description: 'The blocked attempt is preserved in the audit trail. Resolve the policy requirements first.',
      })
      return
    }
    toast.success(`Lifecycle updated to ${LIFECYCLE_LABELS[selected.to]}`, {
      description: `${instrument.id} transition recorded. The change is visible in the instrument audit tab.`,
    })
    onClose()
  }

  if (!instrument) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="Controlled lifecycle action"
      title={`Advance ${instrument.id}`}
      description="Every transition is policy-checked against the current state, your role, verification status, and unresolved findings. Blocked attempts are also audited."
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={selected?.check.allowed ? 'btn-dark btn-sm' : 'btn-secondary btn-sm'}
            onClick={handleSubmit}
            disabled={busy || !selected}
          >
            {selected?.check.allowed ? <Check size={13} /> : <Lock size={13} />}
            {busy ? 'Recording…' : selected?.check.allowed ? 'Record transition' : 'Record blocked attempt'}
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 border border-line bg-paper/50 px-3 py-2.5">
        <span className="overline">Current state</span>
        <span className="badge badge-neutral">{LIFECYCLE_LABELS[instrument.lifecycleStatus]}</span>
        <span className="text-[10px] text-muted">Actor: {user.name}</span>
      </div>

      {options.length === 0 ? (
        <div className="border border-line px-4 py-6 text-center text-[12px] text-muted">
          No lifecycle transitions are defined from this terminal or closed state.
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((option) => {
            const active = selectedId === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedId(option.id)
                  setError('')
                }}
                className={`w-full border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? 'border-forest/50 bg-forest/[0.03]'
                    : 'border-line bg-raised hover:border-lineStrong'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        active ? 'border-forest bg-forest text-paper' : 'border-lineStrong'
                      }`}
                    >
                      {active && <Check size={9} />}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-ink">
                        {option.label}
                        <ArrowRight size={11} className="text-muted" />
                        <span className="font-normal text-inkSoft">{LIFECYCLE_LABELS[option.to]}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted">
                        {option.id} · Required role: {option.allowedRoles.map((role) => ROLES[role]?.shortLabel ?? role).join(' / ')}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      option.check.allowed
                        ? 'border-success/25 bg-success/[0.07] text-success'
                        : 'border-warning/30 bg-warning/[0.07] text-warning'
                    }`}
                  >
                    {option.check.allowed ? 'Eligible' : 'Policy blocked'}
                  </span>
                </div>
                {!option.check.allowed && (
                  <ul className="mt-2 space-y-1 border-t border-line/70 pt-2 text-[10.5px] leading-relaxed text-inkSoft">
                    {option.check.reasons.map((reasonText) => (
                      <li key={reasonText} className="flex gap-1.5">
                        <AlertTriangle size={11} className="mt-0.5 shrink-0 text-warning" />
                        {reasonText}
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            )
          })}
        </div>
      )}

      {options.length > 0 && (
        <div className="mt-4">
          <label className="label" htmlFor="transition-reason">
            Decision reason <span className="text-copper">*</span>
          </label>
          <textarea
            id="transition-reason"
            className="textarea min-h-[76px]"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError('')
            }}
            placeholder="Record the evidence or approval basis for this decision…"
          />
          <p className="hint">
            The reason, actor, prior state, and new state are appended to the hash-chained audit trail.
          </p>
        </div>
      )}

      {selected && !selected.check.allowed && (
        <div className="mt-3 border border-warning/30 bg-warning/[0.05] px-3 py-2.5 text-[10.5px] leading-relaxed text-inkSoft">
          This transition is currently blocked. Submitting records a blocked attempt for audit
          purposes; it does not change the instrument status.
        </div>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}

export function ReleaseApprovalDialog({ open, onClose, instrument }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setNote('')
      setError('')
    }
  }, [open])

  if (!instrument) return null

  const submit = async () => {
    if (!note.trim()) {
      setError('Record the basis for the approving-authority sign-off.')
      return
    }
    setBusy(true)
    const result = recordReleaseApproval(instrument.id, note)
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    toast.success('Release sign-off recorded (demo)', {
      description: 'This is a simulated approving-authority action. The instrument still requires a permitted lifecycle transition to be released.',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Approving-authority sign-off"
      title={`Record release approval`}
      description={`Demo sign-off for ${instrument.id}. This is not a legally valid approval and does not call AICTE systems.`}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-dark btn-sm" onClick={submit} disabled={busy}>
            <Check size={13} /> {busy ? 'Recording…' : 'Record sign-off'}
          </button>
        </>
      }
    >
      <label className="label" htmlFor="approval-note">
        Approval basis <span className="text-copper">*</span>
      </label>
      <textarea
        id="approval-note"
        className="textarea min-h-[100px]"
        value={note}
        onChange={(event) => {
          setNote(event.target.value)
          setError('')
        }}
        placeholder="e.g. FDR verification confirmed, no unresolved material findings, release memo dated today."
      />
      <div className="mt-3 border border-copper/25 bg-copper/[0.04] px-3 py-2.5 text-[10.5px] leading-relaxed text-inkSoft">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-copper-dark">Demo action · </span>
        The approval is stored locally with a visible demo marker. Release policy still re-checks
        verification and unresolved findings during the lifecycle transition.
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
