import { useEffect, useState } from 'react'
import { Save, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../shared/Overlay'
import { Field } from '../shared/ui'
import { BANKS, PURPOSE_CATEGORIES } from '../../data/institutions'
import { updateInstrumentMetadata } from '../../services/instrumentService'

const FIELDS = [
  'reference',
  'bank',
  'branch',
  'amount',
  'issueDate',
  'maturityDate',
  'beneficiary',
  'holder',
  'purpose',
]

export function EditMetadataDialog({ open, onClose, instrument }) {
  const [form, setForm] = useState({})
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !instrument) return
    setForm({
      reference: instrument.reference,
      bank: instrument.bank,
      branch: instrument.branch,
      amount: String(instrument.amount),
      issueDate: instrument.issueDate,
      maturityDate: instrument.maturityDate,
      beneficiary: instrument.beneficiary,
      holder: instrument.holder,
      purpose: instrument.purpose,
    })
    setReason('')
    setError('')
  }, [open, instrument])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const changedFields = FIELDS.filter((field) => {
    if (!instrument) return false
    const current = field === 'amount' ? Number(instrument[field]) : String(instrument[field] ?? '')
    const next = field === 'amount' ? Number(form[field]) : String(form[field] ?? '')
    return current !== next
  })

  const handleSave = () => {
    if (!changedFields.length) {
      setError('Change at least one field before saving.')
      return
    }
    if (!reason.trim()) {
      setError('Record the correction reason. It is written to the audit trail.')
      return
    }
    setSaving(true)
    const result = updateInstrumentMetadata(instrument.id, form, reason)
    setSaving(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    toast.success('Correction recorded', {
      description: result.resolvedFindings.length
        ? `${result.changedFields.join(', ')} updated. Prior finding(s) ${result.resolvedFindings.join(', ')} were preserved and marked resolved after correction.`
        : `${result.changedFields.join(', ')} updated. Field evidence now requires re-verification.`,
    })
    onClose()
  }

  if (!instrument) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="Controlled correction"
      title={`Correct ${instrument.id}`}
      description="Corrections never overwrite history. The prior value, reason, linked finding, and evidence status change are all retained in the audit trail."
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-dark btn-sm" onClick={handleSave} disabled={saving}>
            <Save size={13} /> {saving ? 'Saving…' : 'Save correction'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="FDR reference" htmlFor="edit-reference">
          <input
            id="edit-reference"
            className="input font-mono uppercase"
            value={form.reference ?? ''}
            onChange={(event) => update('reference', event.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Principal amount (₹)" htmlFor="edit-amount">
          <input
            id="edit-amount"
            className="input font-mono"
            inputMode="numeric"
            value={form.amount ?? ''}
            onChange={(event) => update('amount', event.target.value.replace(/[^\d]/g, ''))}
          />
        </Field>
        <Field label="Bank" htmlFor="edit-bank">
          <select
            id="edit-bank"
            className="select"
            value={form.bank ?? ''}
            onChange={(event) => update('bank', event.target.value)}
          >
            {!BANKS.includes(form.bank) && <option value={form.bank}>{form.bank}</option>}
            {BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Branch" htmlFor="edit-branch">
          <input
            id="edit-branch"
            className="input"
            value={form.branch ?? ''}
            onChange={(event) => update('branch', event.target.value)}
          />
        </Field>
        <Field label="Issue date" htmlFor="edit-issue">
          <input
            id="edit-issue"
            type="date"
            className="input"
            value={form.issueDate ?? ''}
            onChange={(event) => update('issueDate', event.target.value)}
          />
        </Field>
        <Field label="Maturity date" htmlFor="edit-maturity">
          <input
            id="edit-maturity"
            type="date"
            className="input"
            value={form.maturityDate ?? ''}
            onChange={(event) => update('maturityDate', event.target.value)}
          />
        </Field>
        <Field label="Beneficiary" htmlFor="edit-beneficiary">
          <input
            id="edit-beneficiary"
            className="input"
            value={form.beneficiary ?? ''}
            onChange={(event) => update('beneficiary', event.target.value)}
          />
        </Field>
        <Field label="Holder" htmlFor="edit-holder">
          <input
            id="edit-holder"
            className="input"
            value={form.holder ?? ''}
            onChange={(event) => update('holder', event.target.value)}
          />
        </Field>
        <Field label="Purpose" htmlFor="edit-purpose" className="sm:col-span-2">
          <select
            id="edit-purpose"
            className="select"
            value={form.purpose ?? ''}
            onChange={(event) => update('purpose', event.target.value)}
          >
            {PURPOSE_CATEGORIES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4 border border-line bg-paper/40 px-3.5 py-3">
        <div className="overline mb-2">Change summary</div>
        {changedFields.length ? (
          <ul className="space-y-1 text-[11px] text-inkSoft">
            {changedFields.map((field) => (
              <li key={field} className="flex flex-wrap gap-1">
                <span className="font-mono text-[10px] text-muted">{field}</span>
                <span className="text-muted line-through">
                  {field === 'amount'
                    ? Number(instrument[field]).toLocaleString('en-IN')
                    : String(instrument[field])}
                </span>
                <span className="text-muted">→</span>
                <span className="font-medium">
                  {field === 'amount'
                    ? Number(form[field] || 0).toLocaleString('en-IN')
                    : String(form[field])}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted">No fields changed yet.</p>
        )}
      </div>

      <div className="mt-4">
        <Field label="Correction reason" htmlFor="edit-reason" required>
          <textarea
            id="edit-reason"
            className="textarea min-h-[76px]"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError('')
            }}
            placeholder="e.g. Institution supplied corrected bank advice; principal transcribed incorrectly from the FDR."
          />
        </Field>
      </div>

      <div className="mt-3 flex items-start gap-2 border border-warning/25 bg-warning/[0.04] px-3 py-2.5 text-[10.5px] leading-relaxed text-inkSoft">
        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
        Changing a field returns that evidence value to institution-submitted status and requires
        re-verification. Linked findings are not deleted; eligible findings are marked resolved after
        correction. A bank confirmation is never implied.
      </div>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
