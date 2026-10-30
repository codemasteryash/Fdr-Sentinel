import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download,
  Info,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, InfoNote, Field, SectionHeading } from '../components/shared/ui'
import { StatusBadge } from '../components/shared/StatusBadge'
import { ConfirmDialog } from '../components/shared/Overlay'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { can, PERMISSIONS, ROLES, USERS } from '../data/users'
import { SCHEMA_VERSION } from '../services/demoDataService'
import { auditActionTone, recordAudit } from '../services/auditService'
import { resetDemoSystem, saveSettings, snapshotPayload } from '../services/settingsService'
import { formatDate, formatDateTime } from '../utils/format'

function formFromSettings(settings) {
  return {
    leadTimes: { ...settings.leadTimes },
    thresholds: { ...settings.thresholds },
    notifications: { ...settings.notifications },
  }
}

function Toggle({ checked, onChange, disabled, label, description }) {
  return (
    <label className={`flex items-start gap-3 py-2.5 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-forest"
      />
      <span>
        <span className="block text-[11px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{description}</span>
      </span>
    </label>
  )
}

export default function Settings() {
  const state = useDemoState()
  const user = useCurrentUser()
  const allowed = can(user.role, PERMISSIONS.SETTINGS_MANAGE)
  const canReset = can(user.role, PERMISSIONS.RESET_DEMO)
  const canExport = can(user.role, PERMISSIONS.EXPORT)

  const [form, setForm] = useState(() => formFromSettings(state.settings))
  const [error, setError] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const settingsVersion = `${state.seededAt}:${state.meta?.resetCount ?? 0}:${state.meta?.updatedAt ?? ''}`

  useEffect(() => {
    setForm(formFromSettings(state.settings))
    setError('')
  }, [settingsVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const baseline = useMemo(() => formFromSettings(state.settings), [state.settings])
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)

  const patchLeadTime = (key, value) => {
    setForm((current) => ({
      ...current,
      leadTimes: { ...current.leadTimes, [key]: value },
    }))
  }

  const patchThreshold = (key, value) => {
    setForm((current) => ({
      ...current,
      thresholds: { ...current.thresholds, [key]: value },
    }))
  }

  const patchNotification = (key, value) => {
    setForm((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    }))
  }

  const handleSave = () => {
    setError('')
    const result = saveSettings({
      leadTimes: {
        criticalDays: Number(form.leadTimes.criticalDays),
        dueSoonDays: Number(form.leadTimes.dueSoonDays),
        upcomingDays: Number(form.leadTimes.upcomingDays),
      },
      thresholds: {
        fuzzySimilarity: Number(form.thresholds.fuzzySimilarity),
        amountVariancePercent: Number(form.thresholds.amountVariancePercent),
        amountVarianceAbsolute: Number(form.thresholds.amountVarianceAbsolute),
      },
      notifications: form.notifications,
    })
    if (!result.ok) {
      setError(result.reason)
      toast.error('Settings were not saved', { description: result.reason })
      return
    }
    toast.success('Configuration saved', {
      description: 'Audit event appended. New thresholds apply to subsequent analyses.',
    })
  }

  const handleReset = (note) => {
    const result = resetDemoSystem(note)
    setResetOpen(false)
    if (!result.ok) {
      toast.error('Reset blocked', { description: result.reason })
      return
    }
    setForm(formFromSettings(result.settings ?? state.settings))
    toast.success('Demo data restored', {
      description: 'Seeded institutions, FDRs, findings, evidence, and audit chain reloaded.',
    })
  }

  const handleSnapshot = () => {
    if (!canExport) {
      toast.error('Your demo role cannot export data')
      return
    }
    const payload = snapshotPayload()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `fdr-sentinel-snapshot-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    recordAudit({
      action: 'export.performed',
      entityType: 'system',
      entityId: 'local-snapshot',
      summary: 'Full local demo snapshot exported as JSON. No data left the browser.',
      reason: 'Administrator-initiated local backup.',
      outcome: 'success',
    })
    toast.success('Snapshot downloaded', {
      description: 'The JSON file contains the current browser-only demo state.',
    })
  }

  const latestAudit = [...state.auditEvents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
  const notificationKeys = [
    ['integrity', 'Integrity findings', 'In-app alerts when deterministic rules create a material finding.'],
    ['maturity', 'Maturity and renewal', 'Deadline actions generated from configured lead times.'],
    ['releases', 'Release decisions', 'Approval requests, recorded sign-offs, and blocked releases.'],
    ['verification', 'Verification decisions', 'Cases returned, rejected, or ready for independent confirmation.'],
    ['inAppOnly', 'Simulate in-app only', 'No email or SMS is sent. External delivery is out of scope.'],
  ]

  return (
    <div>
      <PageHeader
        overline="Prototype configuration"
        title="Settings"
        description="Deterministic rules, deadline lead times, and notification preferences for the local demo. Changes apply to subsequent analyses and are written to the audit chain."
        meta={
          <>
            <StatusBadge tone={allowed ? 'success' : 'warning'} dot={false}>
              {allowed ? 'Configuration access' : 'Read-only for this role'}
            </StatusBadge>
            <span className="text-[10.5px] text-muted">Schema v{SCHEMA_VERSION}</span>
            <span className="text-lineStrong">·</span>
            <span className="text-[10.5px] text-muted">Updated {formatDate(state.meta?.updatedAt ?? state.seededAt)}</span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setForm(baseline)
                setError('')
              }}
              disabled={!allowed || !dirty}
            >
              <Undo2 size={14} /> Revert
            </button>
            <button type="button" className="btn-dark" onClick={handleSave} disabled={!allowed || !dirty}>
              <Save size={14} /> Save configuration
            </button>
          </>
        }
      />

      {!allowed && (
        <InfoNote tone="warning" className="mb-5" title="Read-only settings for this persona">
          Only the AICTE Administrator can change thresholds, lead times, notification preferences, or
          reset data. Switch role from the top navigation to demonstrate configuration control.
        </InfoNote>
      )}

      {error && (
        <div className="mb-5 border border-critical/30 bg-critical/[0.05] px-4 py-3 text-[11px] text-critical">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading
                overline="Deadline intelligence"
                title="Renewal lead times"
                description="Actions are derived from maturity date and these thresholds. Urgency is recomputed on every state read."
              />
            </div>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-3">
              <Field label="Critical window" htmlFor="critical-days" hint="Highest urgency bucket.">
                <div className="relative">
                  <input
                    id="critical-days"
                    type="number"
                    min="1"
                    max="365"
                    className="input pr-12 font-mono"
                    value={form.leadTimes.criticalDays}
                    onChange={(event) => patchLeadTime('criticalDays', event.target.value)}
                    disabled={!allowed}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted">
                    days
                  </span>
                </div>
              </Field>
              <Field label="Due soon" htmlFor="due-soon-days" hint="Must be greater than critical.">
                <div className="relative">
                  <input
                    id="due-soon-days"
                    type="number"
                    min="1"
                    max="365"
                    className="input pr-12 font-mono"
                    value={form.leadTimes.dueSoonDays}
                    onChange={(event) => patchLeadTime('dueSoonDays', event.target.value)}
                    disabled={!allowed}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted">
                    days
                  </span>
                </div>
              </Field>
              <Field label="Upcoming horizon" htmlFor="upcoming-days" hint="Must be greater than due soon.">
                <div className="relative">
                  <input
                    id="upcoming-days"
                    type="number"
                    min="1"
                    max="365"
                    className="input pr-12 font-mono"
                    value={form.leadTimes.upcomingDays}
                    onChange={(event) => patchLeadTime('upcomingDays', event.target.value)}
                    disabled={!allowed}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted">
                    days
                  </span>
                </div>
              </Field>
            </div>
            <div className="border-t border-line bg-paper/40 px-4 py-2.5 font-mono text-[9.5px] text-muted">
              Preview: critical ≤ {form.leadTimes.criticalDays}d · due soon ≤ {form.leadTimes.dueSoonDays}d · upcoming ≤{' '}
              {form.leadTimes.upcomingDays}d
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading
                overline="Integrity engine"
                title="Deterministic match thresholds"
                description="These values change rule sensitivity for new analysis runs. Existing findings are not silently recalculated."
              />
            </div>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-3">
              <Field label="Fuzzy similarity" htmlFor="fuzzy-threshold" hint="50–100. Used for near-reference matching.">
                <input
                  id="fuzzy-threshold"
                  type="number"
                  min="50"
                  max="100"
                  className="input font-mono"
                  value={form.thresholds.fuzzySimilarity}
                  onChange={(event) => patchThreshold('fuzzySimilarity', event.target.value)}
                  disabled={!allowed}
                />
              </Field>
              <Field label="Amount variance %" htmlFor="variance-percent" hint="Relative tolerance before a variance finding.">
                <input
                  id="variance-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="input font-mono"
                  value={form.thresholds.amountVariancePercent}
                  onChange={(event) => patchThreshold('amountVariancePercent', event.target.value)}
                  disabled={!allowed}
                />
              </Field>
              <Field label="Absolute tolerance" htmlFor="variance-absolute" hint="Rupee floor. A variance must exceed this.">
                <input
                  id="variance-absolute"
                  type="number"
                  min="0"
                  step="100"
                  className="input font-mono"
                  value={form.thresholds.amountVarianceAbsolute}
                  onChange={(event) => patchThreshold('amountVarianceAbsolute', event.target.value)}
                  disabled={!allowed}
                />
              </Field>
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="flex items-start gap-2 text-[10px] leading-relaxed text-muted">
                <SlidersHorizontal size={12} className="mt-0.5 shrink-0 text-copper" />
                Thresholds are local configuration for the prototype, not a regulatory scoring model.
                Every change requires an explanatory audit summary.
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading
                overline="Notifications"
                title="Simulated in-app preferences"
                description="All notifications are generated locally and displayed in the notification panel."
              />
            </div>
            <div className="divide-y divide-line px-4">
              {notificationKeys.map(([key, label, description]) => (
                <Toggle
                  key={key}
                  checked={Boolean(form.notifications[key])}
                  onChange={(value) => patchNotification(key, value)}
                  disabled={!allowed}
                  label={label}
                  description={description}
                />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading
                overline="Data controls"
                title="Local dataset"
                description="The prototype has no server. Seed data, uploaded files, findings, and audit events live in this browser profile."
              />
            </div>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div className="border border-line bg-paper/40 px-3.5 py-3">
                <div className="flex items-center gap-2 text-[10.5px] font-medium text-ink">
                  <Download size={13} className="text-copper" /> Export local snapshot
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Download a JSON backup of the current state, including the audit chain. No data is transmitted.
                </p>
                <button type="button" className="btn-secondary btn-sm mt-3" onClick={handleSnapshot} disabled={!canExport}>
                  <Download size={12} /> Download JSON
                </button>
              </div>
              <div className="border border-critical/25 bg-critical/[0.04] px-3.5 py-3">
                <div className="flex items-center gap-2 text-[10.5px] font-medium text-critical">
                  <RotateCcw size={13} /> Reset demonstration
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Restore the deterministic dataset. Your current demo role is preserved. Prior local changes
                  cannot be recovered unless you exported a snapshot.
                </p>
                <button
                  type="button"
                  className="btn-secondary btn-sm mt-3 border-critical/40 text-critical hover:bg-critical/[0.06]"
                  onClick={() => setResetOpen(true)}
                  disabled={!canReset}
                >
                  <RotateCcw size={12} /> Reset demo data
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Acting persona" title="Demo identity" />
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[13px] font-medium text-ink">{user.name}</div>
              <div className="mt-0.5 text-[10px] text-muted">{user.title}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <StatusBadge tone="copper" dot={false}>
                  {ROLES[user.role]?.label ?? user.role}
                </StatusBadge>
                {user.can(PERMISSIONS.SETTINGS_MANAGE) && (
                  <StatusBadge tone="success" dot={false}>Configuration rights</StatusBadge>
                )}
              </div>
              <p className="mt-3 text-[9.5px] leading-relaxed text-muted">
                Role switching is a frontend-only demonstration control, not authentication or access
                control. {USERS.length} seeded personas are available.
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Footprint" title="Local state" />
            </div>
            <dl className="divide-y divide-line">
              {[
                ['Institutions', state.institutions.length],
                ['FDR instruments', state.instruments.length],
                ['Findings', state.findings.length],
                ['Evidence records', state.evidence.length],
                ['Audit events', state.auditEvents.length],
                ['Notifications', state.notifications.length],
                ['Demo resets', state.meta?.resetCount ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2">
                  <dt className="text-[10.5px] text-muted">{label}</dt>
                  <dd className="font-mono text-[11px] font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel">
            <div className="border-b border-line px-4 py-3">
              <SectionHeading overline="Audit" title="Last recorded event" />
            </div>
            {latestAudit ? (
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] text-muted">{latestAudit.id}</span>
                  <StatusBadge tone={auditActionTone(latestAudit.action, latestAudit.outcome)} dot={false}>
                    {latestAudit.outcome}
                  </StatusBadge>
                </div>
                <div className="mt-1.5 text-[10.5px] leading-relaxed text-inkSoft">{latestAudit.summary}</div>
                <div className="mt-1.5 text-[9px] text-muted">
                  {formatDateTime(latestAudit.timestamp)} · {latestAudit.actorName}
                </div>
                <Link to="/app/governance?view=audit" className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-forest hover:text-copper">
                  Open audit trail
                </Link>
              </div>
            ) : (
              <div className="px-4 py-4 text-[10.5px] text-muted">No audit events recorded.</div>
            )}
          </section>

          <div className="border border-line bg-paper/40 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-forest">
              <ShieldCheck size={12} /> Prototype boundary
            </div>
            <p className="mt-1 text-[9.5px] leading-relaxed text-muted">
              No files are sent to AICTE or banks. “Confirmation” and “approval” are simulated workflow
              states. Production would require authentication, server-side authorization, encryption,
              retention policy, and independent source integration.
            </p>
          </div>

          <div className="border border-info/20 bg-info/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-info">
              <Info size={12} /> Deterministic preview
            </div>
            <p className="mt-1 text-[9.5px] leading-relaxed text-muted">
              Rule and deadline changes do not rewrite historical findings. Run Integrity Analysis again
              from an instrument to evaluate current values.
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Reset demonstration data?"
        message="This replaces the current local records with the seeded dataset. The action itself is recorded on the new audit chain."
        confirmLabel="Reset demo data"
        requirePhrase="RESET"
        noteLabel="Reason for reset (optional)"
      />
    </div>
  )
}
