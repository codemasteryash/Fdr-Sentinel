import { useEffect, useState } from 'react'
import { Building2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../shared/Overlay'
import { Field } from '../shared/ui'
import {
  createInstitution,
  updateInstitution,
  validateInstitutionForm,
} from '../../services/institutionService'
import { useDemoState } from '../../hooks/useDemoState'
import { useCurrentUser } from '../../hooks/useCurrentUser'

const CATEGORIES = [
  'Engineering',
  'Management',
  'University',
  'Applied Arts',
  'Design',
  'Sciences',
  'Pharmacy',
  'Architecture',
]

const EMPTY = {
  name: '',
  shortName: '',
  city: '',
  state: '',
  category: 'Engineering',
  established: '',
  officer: '',
  contact: '',
  code: '',
  status: 'active',
  reason: '',
}

export function InstitutionFormDialog({ open, onClose, institution = null, onCreated }) {
  const state = useDemoState()
  const user = useCurrentUser()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const editing = Boolean(institution)

  useEffect(() => {
    if (!open) return
    setForm(
      institution
        ? {
            ...EMPTY,
            ...institution,
            established: String(institution.established ?? ''),
            reason: '',
          }
        : EMPTY,
    )
    setErrors({})
  }, [open, institution])

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const submit = () => {
    const nextErrors = validateInstitutionForm(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    if (editing && !form.reason.trim()) {
      setErrors({ reason: 'A reason is required for an institution change.' })
      return
    }
    setSaving(true)
    const result = editing
      ? updateInstitution(institution.id, form, user)
      : createInstitution(form, user)
    setSaving(false)
    if (!result.ok) {
      if (result.errors) setErrors(result.errors)
      else toast.error('Could not save institution', { description: result.reason })
      return
    }
    toast.success(editing ? 'Institution updated' : 'Institution registered', {
      description: editing
        ? `${institution.name} updated. Linked instrument names are synchronised where applicable.`
        : `${form.name} created for this local demo. No AICTE record was changed.`,
    })
    onClose()
    if (!editing && onCreated) onCreated(result.id)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={editing ? 'Institution management' : 'New institution'}
      title={editing ? `Edit ${institution.name}` : 'Register institution'}
      description="Synthetic demo records only. Fields feed directly into instrument ownership and reporting."
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-dark btn-sm" onClick={submit} disabled={saving}>
            {editing ? <Save size={13} /> : <Building2 size={13} />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Register institution'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Institution name" htmlFor="inst-name" required error={errors.name} className="sm:col-span-2">
          <input
            id="inst-name"
            className="input"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="e.g. Deccan Institute of Applied Sciences"
          />
        </Field>
        <Field label="Short name" htmlFor="inst-short">
          <input
            id="inst-short"
            className="input"
            value={form.shortName}
            onChange={(event) => update('shortName', event.target.value)}
            placeholder="Used in dense tables"
          />
        </Field>
        <Field label="Institution code" htmlFor="inst-code">
          <input
            id="inst-code"
            className="input font-mono uppercase"
            value={form.code}
            onChange={(event) => update('code', event.target.value.toUpperCase())}
            placeholder="Auto-generated if blank"
          />
        </Field>
        <Field label="City" htmlFor="inst-city" required error={errors.city}>
          <input
            id="inst-city"
            className="input"
            value={form.city}
            onChange={(event) => update('city', event.target.value)}
          />
        </Field>
        <Field label="State" htmlFor="inst-state" required error={errors.state}>
          <input
            id="inst-state"
            className="input"
            value={form.state}
            onChange={(event) => update('state', event.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="inst-category" required error={errors.category}>
          <select
            id="inst-category"
            className="select"
            value={form.category}
            onChange={(event) => update('category', event.target.value)}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Established" htmlFor="inst-established">
          <input
            id="inst-established"
            className="input font-mono"
            inputMode="numeric"
            value={form.established}
            onChange={(event) => update('established', event.target.value.replace(/[^\d]/g, ''))}
            placeholder={`e.g. ${new Date().getFullYear() - 20}`}
          />
        </Field>
        <Field label="Responsible officer" htmlFor="inst-officer" required error={errors.officer}>
          <input
            id="inst-officer"
            className="input"
            value={form.officer}
            onChange={(event) => update('officer', event.target.value)}
          />
        </Field>
        <Field label="Contact email" htmlFor="inst-contact" required error={errors.contact}>
          <input
            id="inst-contact"
            type="email"
            className="input"
            value={form.contact}
            onChange={(event) => update('contact', event.target.value)}
            placeholder="finance@institution.demo"
          />
        </Field>
        {editing && (
          <>
            <Field label="Relationship status" htmlFor="inst-status">
              <select
                id="inst-status"
                className="select"
                value={form.status}
                onChange={(event) => update('status', event.target.value)}
              >
                <option value="active">Active</option>
                <option value="attention">Attention</option>
                <option value="under_review">Under review</option>
                <option value="probation">Probation</option>
              </select>
            </Field>
            <Field label="Change reason" htmlFor="inst-reason" required error={errors.reason} className="sm:col-span-2">
              <textarea
                id="inst-reason"
                className="textarea min-h-[68px]"
                value={form.reason}
                onChange={(event) => update('reason', event.target.value)}
                placeholder="Record why this institution record is changing…"
              />
            </Field>
          </>
        )}
      </div>

      <div className="mt-4 border border-copper/25 bg-copper/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-inkSoft">
        New institutions have no instruments until an officer registers one. The calculated queue and
        reports will include the new institution immediately.
      </div>
      <div className="mt-2 font-mono text-[9px] text-muted">
        {editing ? `Editing ${institution.id}` : `Next ID will be assigned locally · ${state.institutions.length} existing`}
      </div>
    </Modal>
  )
}
