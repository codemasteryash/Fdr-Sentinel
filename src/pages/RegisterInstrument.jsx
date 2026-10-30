import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  Check,
  AlertTriangle,
  ShieldCheck,
  Landmark,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, InfoNote, Field, Spinner } from '../components/shared/ui'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { BANKS, PURPOSE_CATEGORIES } from '../data/institutions'
import { createInstrument, validateInstrumentForm } from '../services/instrumentService'
import { can, PERMISSIONS } from '../data/users'
import { formatCurrency, formatDate } from '../utils/format'
import { formatFileSize, validateFile } from '../utils/validation'
import { nextMaturityFromIssue } from '../services/instrumentService'
import { differenceInCalendarDays, parseISO } from 'date-fns'

const SECTION_IDS = ['institution', 'instrument', 'document', 'review']

function Section({ number, title, description, children, id }) {
  return (
    <section id={id} className="border-b border-line px-5 py-5 last:border-b-0 sm:px-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-lineStrong bg-paper font-mono text-[10px] text-inkSoft">
          {number}
        </span>
        <div>
          <h2 className="font-display text-lg leading-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function RegisterInstrument() {
  const state = useDemoState()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [acknowledged, setAcknowledged] = useState(false)
  const [ackError, setAckError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [form, setForm] = useState({
    institutionId: user.role === 'officer' ? user.institutionId ?? '' : '',
    bank: '',
    branch: '',
    reference: '',
    amount: '',
    issueDate: '',
    maturityDate: '',
    beneficiary: 'All India Council for Technical Education',
    holder: '',
    purpose: PURPOSE_CATEGORIES[0],
    file: null,
  })

  const allowed = can(user.role, PERMISSIONS.INSTRUMENT_CREATE)
  const institutions = useMemo(
    () =>
      user.role === 'officer'
        ? state.institutions.filter((institution) => institution.id === user.institutionId)
        : state.institutions,
    [state.institutions, user],
  )
  const selectedInstitution = state.institutions.find(
    (institution) => institution.id === form.institutionId,
  )
  const amountNumber = Number(String(form.amount).replace(/[^\d]/g, ''))
  const termDays =
    form.issueDate && form.maturityDate
      ? differenceInCalendarDays(parseISO(form.maturityDate), parseISO(form.issueDate))
      : null

  useEffect(() => {
    if (!form.file) {
      setPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(form.file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [form.file])

  const update = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'institutionId') {
        const institution = state.institutions.find((item) => item.id === value)
        next.holder = institution?.name ?? ''
      }
      if (key === 'issueDate' && value && !current.maturityDate) {
        next.maturityDate = nextMaturityFromIssue(value, 3)
      }
      return next
    })
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleFile = (file) => {
    if (!file) return
    const error = validateFile(file)
    if (error) {
      setErrors((current) => ({ ...current, file: error }))
      setForm((current) => ({ ...current, file: null }))
      return
    }
    setErrors((current) => ({ ...current, file: undefined }))
    setForm((current) => ({ ...current, file }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validateInstrumentForm(form)
    if (!form.file) nextErrors.file = 'Attach the FDR supporting document.'
    if (!acknowledged) setAckError('Confirm that the entered values are institution-supplied.')
    else setAckError('')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || !acknowledged) {
      toast.error('Submission needs attention', {
        description: 'Review the highlighted fields and confirm the declaration.',
      })
      document.getElementById('submission-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    try {
      const result = await createInstrument(form)
      if (!result.ok) {
        if (result.errors) setErrors(result.errors)
        toast.error('Could not register the instrument', { description: result.reason })
        return
      }
      toast.success(`Instrument ${result.id} registered`, {
        description: result.storageWarning
          ? result.storageWarning
          : 'Metadata, field provenance, and audit events were written to this browser.',
      })
      navigate(`/app/instruments/${result.id}`)
    } catch {
      toast.error('Unexpected error while saving the instrument.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!allowed) {
    return (
      <div>
        <PageHeader
          overline="Registry · Access control"
          title="Registration is restricted"
          description={`The ${user.role} role cannot register instruments in this prototype.`}
        />
        <InfoNote tone="warning" title="Simulated permission enforcement">
          Role permissions are checked in the instrument service, not only by hiding buttons. Switch
          to Institution Officer or AICTE Administrator from the top navigation to register a record.
        </InfoNote>
        <Link to="/app/instruments" className="btn-secondary mt-4">
          <ArrowLeft size={14} /> Back to registry
        </Link>
      </div>
    )
  }

  const errorList = Object.entries(errors).filter(([, value]) => value)

  return (
    <div>
      <PageHeader
        overline="Registry · New submission"
        title="Register an FDR"
        description="Create a synthetic instrument record with institution-supplied values and a protected local document copy. Extraction and verification remain separate steps."
        meta={
          <>
            <span className="text-[10.5px] text-muted">
              Submitting as <span className="text-inkSoft">{user.name}</span> · {user.title}
            </span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">No account registration or backend required</span>
          </>
        }
        actions={
          <Link to="/app/instruments" className="btn-secondary">
            <ArrowLeft size={14} /> Back to registry
          </Link>
        }
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            {errorList.length > 0 && (
              <div id="submission-errors" className="border border-critical/30 bg-critical/[0.04] px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-critical">
                  <AlertTriangle size={13} /> {errorList.length} field(s) need attention
                </div>
                <ul className="mt-1.5 grid gap-1 text-[11px] text-inkSoft sm:grid-cols-2">
                  {errorList.map(([key, message]) => (
                    <li key={key}>
                      <span className="font-mono text-[10px] text-critical">{key}</span> — {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="panel">
              <Section
                id="section-institution"
                number="01"
                title="Institution details"
                description="The institution owns the submission. Officers are scoped to their assigned institution."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Institution" htmlFor="institutionId" required error={errors.institutionId}>
                    <select
                      id="institutionId"
                      className="select"
                      value={form.institutionId}
                      onChange={(event) => update('institutionId', event.target.value)}
                      disabled={user.role === 'officer'}
                    >
                      <option value="">Select an institution…</option>
                      {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                          {institution.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Institution ID" htmlFor="institutionCode">
                    <input
                      id="institutionCode"
                      className="input font-mono"
                      value={selectedInstitution?.id ?? ''}
                      placeholder="Auto-filled"
                      readOnly
                    />
                  </Field>
                  <Field label="Responsible officer" htmlFor="officer">
                    <input
                      id="officer"
                      className="input"
                      value={selectedInstitution?.officer ?? user.name}
                      readOnly
                    />
                  </Field>
                  <Field label="Contact" htmlFor="contact">
                    <input
                      id="contact"
                      className="input"
                      value={selectedInstitution?.contact ?? user.email}
                      readOnly
                    />
                  </Field>
                </div>
              </Section>

              <Section
                id="section-instrument"
                number="02"
                title="Instrument details"
                description="Enter the values exactly as they appear on the instrument. The amount is parsed as Indian rupees."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Issuing bank" htmlFor="bank" required error={errors.bank}>
                    <select
                      id="bank"
                      className="select"
                      value={form.bank}
                      onChange={(event) => update('bank', event.target.value)}
                    >
                      <option value="">Select a bank…</option>
                      {BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Branch" htmlFor="branch" required error={errors.branch}>
                    <input
                      id="branch"
                      className="input"
                      value={form.branch}
                      onChange={(event) => update('branch', event.target.value)}
                      placeholder="e.g. Pune Camp"
                    />
                  </Field>
                  <Field
                    label="FDR / reference number"
                    htmlFor="reference"
                    required
                    error={errors.reference}
                    hint="2–5 letters, optional separator, 5–12 alphanumeric characters."
                  >
                    <input
                      id="reference"
                      className="input font-mono uppercase"
                      value={form.reference}
                      onChange={(event) => update('reference', event.target.value.toUpperCase())}
                      placeholder="e.g. DNB-847291"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Principal amount (₹)" htmlFor="amount" required error={errors.amount}>
                    <input
                      id="amount"
                      className="input font-mono"
                      inputMode="numeric"
                      value={form.amount}
                      onChange={(event) => update('amount', event.target.value.replace(/[^\d]/g, ''))}
                      placeholder="2500000"
                    />
                  </Field>
                  <Field label="Issue date" htmlFor="issueDate" required error={errors.issueDate}>
                    <input
                      id="issueDate"
                      type="date"
                      className="input"
                      value={form.issueDate}
                      onChange={(event) => update('issueDate', event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Maturity date"
                    htmlFor="maturityDate"
                    required
                    error={errors.maturityDate}
                    hint={termDays && termDays > 0 ? `Term: ${termDays} days` : undefined}
                  >
                    <input
                      id="maturityDate"
                      type="date"
                      className="input"
                      value={form.maturityDate}
                      onChange={(event) => update('maturityDate', event.target.value)}
                    />
                  </Field>
                  <Field label="Beneficiary" htmlFor="beneficiary" required error={errors.beneficiary}>
                    <input
                      id="beneficiary"
                      className="input"
                      value={form.beneficiary}
                      onChange={(event) => update('beneficiary', event.target.value)}
                    />
                  </Field>
                  <Field label="Instrument holder" htmlFor="holder" required error={errors.holder}>
                    <input
                      id="holder"
                      className="input"
                      value={form.holder}
                      onChange={(event) => update('holder', event.target.value)}
                      placeholder="Auto-filled from institution"
                    />
                  </Field>
                  <Field
                    label="Purpose / security-deposit category"
                    htmlFor="purpose"
                    required
                    error={errors.purpose}
                    className="sm:col-span-2"
                  >
                    <select
                      id="purpose"
                      className="select"
                      value={form.purpose}
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
              </Section>

              <Section
                id="section-document"
                number="03"
                title="Supporting document"
                description="PDF, JPG, or PNG up to 10 MB. The file is stored in IndexedDB in this browser only — never in localStorage and never uploaded."
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                  aria-label="Upload supporting document"
                />
                {!form.file ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex w-full flex-col items-center justify-center border border-dashed px-5 py-8 text-center transition-colors ${
                      errors.file
                        ? 'border-critical/50 bg-critical/[0.03]'
                        : 'border-lineStrong bg-paper/40 hover:border-copper/60 hover:bg-copper/[0.02]'
                    }`}
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center border border-lineStrong bg-raised text-muted">
                      <Upload size={16} strokeWidth={1.7} />
                    </span>
                    <span className="text-[12px] font-medium text-ink">
                      Choose a document from this device
                    </span>
                    <span className="mt-1 text-[10.5px] text-muted">
                      Simulated protected storage · PDF / JPG / PNG · max 10 MB
                    </span>
                  </button>
                ) : (
                  <div className="border border-line">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 items-center justify-center border border-line bg-paper text-forest">
                        <FileText size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium text-ink">
                          {form.file.name}
                        </div>
                        <div className="font-mono text-[10px] text-muted">
                          {formatFileSize(form.file.size)} · {form.file.type || 'document'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, file: null }))
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="btn-icon"
                        aria-label="Remove attached file"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    {previewUrl && form.file.type.startsWith('image/') && (
                      <div className="border-t border-line bg-paper/50 p-3">
                        <img
                          src={previewUrl}
                          alt="Document preview"
                          className="mx-auto max-h-[280px] border border-line bg-white object-contain"
                        />
                      </div>
                    )}
                    {previewUrl && form.file.type === 'application/pdf' && (
                      <div className="border-t border-line bg-paper/50 p-3">
                        <iframe
                          src={previewUrl}
                          title="PDF document preview"
                          className="h-[320px] w-full border border-line bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}
                {errors.file && (
                  <p className="field-error" role="alert">
                    {errors.file}
                  </p>
                )}
                <div className="mt-3 grid gap-2 border border-line bg-paper/40 px-3 py-2.5 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <ShieldCheck size={12} className="text-forest" />
                    Document bytes are not written to localStorage.
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <FileText size={12} className="text-forest" />
                    Seeded records use generated placeholder previews.
                  </div>
                </div>
              </Section>

              <Section
                id="section-review"
                number="04"
                title="Review and submit"
                description="Confirm the recorded values. Submission creates evidence provenance entries and an audit event."
              >
                <dl className="grid gap-x-6 gap-y-4 border border-line bg-paper/30 px-4 py-4 sm:grid-cols-2">
                  {[
                    ['Institution', selectedInstitution?.name ?? '—'],
                    ['Institution ID', selectedInstitution?.id ?? '—'],
                    ['Bank / branch', [form.bank, form.branch].filter(Boolean).join(' · ') || '—'],
                    ['FDR reference', form.reference || '—'],
                    ['Principal', amountNumber ? formatCurrency(amountNumber) : '—'],
                    ['Issue date', form.issueDate ? formatDate(form.issueDate) : '—'],
                    ['Maturity date', form.maturityDate ? formatDate(form.maturityDate) : '—'],
                    ['Term', termDays && termDays > 0 ? `${termDays} days` : '—'],
                    ['Beneficiary', form.beneficiary || '—'],
                    ['Holder', form.holder || '—'],
                    ['Purpose', form.purpose || '—'],
                    ['Document', form.file?.name ?? 'Not attached'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="overline mb-0.5">{label}</dt>
                      <dd className="text-[11.5px] font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
                <label className="mt-4 flex cursor-pointer items-start gap-2.5 border border-line px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => {
                      setAcknowledged(event.target.checked)
                      if (event.target.checked) setAckError('')
                    }}
                    className="mt-0.5 h-3.5 w-3.5 accent-copper"
                  />
                  <span className="text-[11px] leading-relaxed text-inkSoft">
                    I confirm these values are entered by the institution for a synthetic demo record.
                    They have not been independently verified. OCR extraction and bank confirmation are
                    simulated and separately labelled.
                  </span>
                </label>
                {ackError && (
                  <p className="field-error" role="alert">
                    {ackError}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <Link to="/app/instruments" className="btn-ghost btn-sm">
                    Cancel
                  </Link>
                  <button type="submit" className="btn-dark" disabled={submitting}>
                    {submitting ? <Spinner size={14} /> : <Check size={14} />}
                    {submitting ? 'Registering…' : 'Submit instrument'}
                  </button>
                </div>
              </Section>
            </div>
          </div>

          <aside className="space-y-5 xl:col-span-4">
            <div className="panel sticky top-[76px]">
              <div className="border-b border-line px-4 py-3">
                <div className="overline">Submission preview</div>
                <div className="mt-1 font-display text-xl text-ink">
                  {form.reference || 'New instrument'}
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted">
                  {selectedInstitution?.shortName ?? 'Institution not selected'}
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-baseline justify-between border-b border-line pb-3">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-muted">Principal</span>
                  <span className="font-display text-xl text-ink">
                    {amountNumber ? formatCurrency(amountNumber) : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 border-b border-line py-3">
                  <div>
                    <div className="overline mb-1">Issue</div>
                    <div className="text-[11px] text-inkSoft">
                      {form.issueDate ? formatDate(form.issueDate) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="overline mb-1">Maturity</div>
                    <div className="text-[11px] text-inkSoft">
                      {form.maturityDate ? formatDate(form.maturityDate) : '—'}
                    </div>
                  </div>
                </div>
                <div className="py-3">
                  <div className="overline mb-2">Initial record state</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge badge-neutral">
                      <span className="dot bg-muted/70" /> Submitted
                    </span>
                    <span className="badge badge-neutral">
                      <span className="dot bg-muted/70" /> Unverified
                    </span>
                    <span className="badge badge-neutral">
                      <span className="dot bg-muted/70" /> Not analyzed
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 border-t border-line bg-paper/40 px-4 py-3">
                <div className="flex items-start gap-2 text-[10px] leading-relaxed text-muted">
                  <Landmark size={12} className="mt-0.5 shrink-0 text-forest" />
                  No bank API is called. Verification is simulated and must be explicitly labelled.
                </div>
                <div className="flex items-start gap-2 text-[10px] leading-relaxed text-muted">
                  <CalendarDays size={12} className="mt-0.5 shrink-0 text-forest" />
                  Deadline actions are computed later from the maturity date and configured lead times.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </form>
      <p className="mt-4 text-[10px] text-muted">
        Demo data only. Institution, bank, and instrument values are fictional and are not AICTE
        records.
      </p>
    </div>
  )
}
