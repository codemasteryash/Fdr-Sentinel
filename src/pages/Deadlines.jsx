import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  Flag,
  RefreshCw,
  UserRoundCheck,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, InfoNote, SearchInput, EmptyState, SectionHeading } from '../components/shared/ui'
import { PriorityBadge, StatusBadge } from '../components/shared/StatusBadge'
import { Drawer } from '../components/shared/Overlay'
import { useDemoState } from '../hooks/useDemoState'
import { useCurrentUser } from '../hooks/useCurrentUser'
import {
  acknowledgeDeadline,
  assignDeadline,
  buildDeadlineActions,
  completeDeadline,
  escalateDeadline,
  getDeadlineStats,
} from '../services/deadlineEngine'
import { exportDeadlines } from '../services/exportService'
import { can, PERMISSIONS, USERS, getUserById } from '../data/users'
import { DEADLINE_TYPE_LABELS, PRIORITY_LABELS } from '../data/statuses'
import { formatCurrency, formatDate, formatDateTime, relativeDays } from '../utils/format'

const PRIORITIES = ['overdue', 'critical', 'due_soon', 'upcoming', 'completed']
const TYPES = Object.keys(DEADLINE_TYPE_LABELS)

function DeadlineDrawer({ action, open, onClose }) {
  const user = useCurrentUser()
  const [note, setNote] = useState('')
  const [assignee, setAssignee] = useState('u-rev1')
  const [error, setError] = useState('')

  if (!action) return null
  const canManage =
    can(user.role, PERMISSIONS.DEADLINE_MANAGE) ||
    (user.role === 'officer' && user.institutionId === action.institutionId)
  const canEscalate = can(user.role, PERMISSIONS.DEADLINE_MANAGE)
  const completed = action.status === 'completed'

  const run = (type) => {
    const result =
      type === 'acknowledge'
        ? acknowledgeDeadline(action.id, note, user)
        : type === 'complete'
          ? completeDeadline(action.id, note, user)
          : type === 'assign'
            ? assignDeadline(action.id, assignee, note, user)
            : escalateDeadline(action.id, note, user)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    toast.success(
      type === 'acknowledge'
        ? 'Deadline acknowledged'
        : type === 'complete'
          ? 'Deadline completed'
          : type === 'assign'
            ? 'Deadline reassigned'
            : 'Deadline escalated',
      { description: 'The action and note were appended to the audit trail.' },
    )
    setNote('')
    setError('')
    onClose()
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={`Deadline · ${DEADLINE_TYPE_LABELS[action.type] ?? action.type}`}
      title={action.title}
      subtitle={`${action.id} · ${action.instrumentId}`}
      footer={
        canManage && !completed ? (
          <span className="text-[9.5px] text-muted">Actions update local state and the append-only audit trail.</span>
        ) : (
          <span className="text-[9.5px] text-muted">
            {completed ? 'This action is complete and retained for audit.' : 'Your role has read-only access.'}
          </span>
        )
      }
    >
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={action.priority} />
          <StatusBadge tone={action.status === 'completed' ? 'success' : action.status === 'escalated' ? 'critical' : action.status === 'acknowledged' ? 'info' : 'neutral'} dot={false}>
            {action.statusLabel}
          </StatusBadge>
          <span className="font-mono text-[9px] text-muted">{DEADLINE_TYPE_LABELS[action.type] ?? action.type}</span>
        </div>

        <dl className="mt-4 divide-y divide-line border-y border-line">
          {[
            ['Institution', action.institutionName],
            ['FDR reference', action.reference],
            ['Principal', formatCurrency(action.amount)],
            ['Due', `${formatDate(action.dueDate)} (${relativeDays(action.dueDate)})`],
            ['Assigned to', getUserById(action.assignedTo)?.name ?? 'Unassigned'],
            ['Acknowledged', action.acknowledgedAt ? formatDateTime(action.acknowledgedAt) : 'Not yet'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-[10px] text-muted">{label}</dt>
              <dd className="text-right text-[10.5px] text-inkSoft">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          <div className="overline mb-1.5">Why this action exists</div>
          <p className="text-[10.5px] leading-relaxed text-inkSoft">{action.reason}</p>
        </div>
        <div className="mt-3 border border-line bg-paper/40 px-3 py-2.5">
          <div className="overline mb-1">Recommended action</div>
          <p className="text-[10.5px] leading-relaxed text-inkSoft">{action.recommendedAction}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/app/instruments/${action.instrumentId}`} className="btn-secondary btn-xs">
            Open instrument <ArrowRight size={10} />
          </Link>
          {action.type === 'finding' && action.findingId && (
            <Link to={`/app/verification?view=findings&finding=${action.findingId}`} className="btn-secondary btn-xs">
              Open finding <ArrowRight size={10} />
            </Link>
          )}
          {action.type === 'release' && (
            <Link to={`/app/lifecycle/${action.instrumentId}`} className="btn-secondary btn-xs">
              Open lifecycle <ArrowRight size={10} />
            </Link>
          )}
          {action.type === 'verification' && (
            <Link to={`/app/verification/${action.instrumentId}`} className="btn-secondary btn-xs">
              Open verification <ArrowRight size={10} />
            </Link>
          )}
        </div>

        {canManage && !completed && (
          <div className="mt-5 border border-line bg-paper/30 px-4 py-4">
            <div className="flex items-center gap-2">
              <RefreshCw size={13} className="text-forest" />
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink">Manage action</h3>
            </div>
            <label className="label mt-3" htmlFor="deadline-note">
              Note {action.type === 'finding' || action.type === 'release' ? '(completion is policy-gated)' : ''}
            </label>
            <textarea
              id="deadline-note"
              className="textarea min-h-[70px]"
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setError('')
              }}
              placeholder="Record context for the acknowledgement, assignment, completion, or escalation…"
            />
            {canManage && (
              <div className="mt-2">
                <label className="label" htmlFor="assignee">Assign to</label>
                <select id="assignee" className="select" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                  {USERS.filter((candidate) => candidate.role !== 'system').map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {candidate.role}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" className="btn-secondary btn-xs" onClick={() => run('acknowledge')}>
                <CheckCircle2 size={10} /> Acknowledge
              </button>
              <button type="button" className="btn-secondary btn-xs" onClick={() => run('assign')}>
                <UserRoundCheck size={10} /> Assign
              </button>
              <button
                type="button"
                className="btn-secondary btn-xs"
                onClick={() => run('complete')}
                disabled={['finding', 'release'].includes(action.type)}
                title={['finding', 'release'].includes(action.type) ? 'Close this through the finding or lifecycle workflow.' : undefined}
              >
                <Flag size={10} /> Complete
              </button>
              {canEscalate && (
                <button type="button" className="btn-dark btn-xs" onClick={() => run('escalate')}>
                  <Zap size={10} /> Escalate
                </button>
              )}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-muted">
              Finding deadlines close through a reviewer decision. Release deadlines close through the
              lifecycle engine. Completion cannot bypass those workflows.
            </p>
          </div>
        )}
      </div>
    </Drawer>
  )
}

export default function Deadlines({ embedded = false }) {
  const state = useDemoState()
  const user = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState(() => searchParams.get('priority') || 'active')
  const [type, setType] = useState(() => searchParams.get('type') || '')
  const [institution, setInstitution] = useState('')
  const [assignee, setAssignee] = useState('')

  const actions = useMemo(() => buildDeadlineActions(state), [state])
  const stats = getDeadlineStats(actions)
  const focusId = searchParams.get('focus')
  const focused = actions.find((action) => action.id === focusId) ?? null

  const scoped = user.role === 'officer'
    ? actions.filter((action) => action.institutionId === user.institutionId)
    : actions

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return scoped.filter((action) => {
      if (priority === 'active' && action.status === 'completed') return false
      if (priority && priority !== 'active' && action.priority !== priority) return false
      if (type && action.type !== type) return false
      if (institution && action.institutionId !== institution) return false
      if (assignee && action.assignedTo !== assignee) return false
      if (
        value &&
        [action.id, action.title, action.instrumentId, action.institutionName, action.reference]
          .join(' ')
          .toLowerCase()
          .includes(value)
      ) {
        return false
      }
      return true
    })
  }, [scoped, query, priority, type, institution, assignee])

  const buckets = useMemo(() => {
    const active = scoped.filter((action) => action.status !== 'completed')
    return [
      { label: 'Overdue', items: active.filter((action) => action.priority === 'overdue'), tone: 'critical' },
      { label: 'Next 7 days', items: active.filter((action) => action.priority === 'critical'), tone: 'critical' },
      { label: '8–30 days', items: active.filter((action) => action.priority === 'due_soon'), tone: 'warning' },
      { label: '31–90 days', items: active.filter((action) => action.priority === 'upcoming'), tone: 'info' },
    ]
  }, [scoped])

  const setFocus = (id) => {
    const params = new URLSearchParams(searchParams)
    if (id) params.set('focus', id)
    else params.delete('focus')
    setSearchParams(params, { replace: true })
  }

  const handleExport = () => {
    exportDeadlines(state, filtered)
    toast.success('Deadline queue exported', { description: `${filtered.length} action(s) exported locally.` })
  }

  return (
    <div>
      {embedded ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-line bg-raised px-4 py-3">
          <div>
            <div className="overline mb-0.5">Derived action queue</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
              <span>{filtered.length} action(s) in view</span>
              <span className="text-lineStrong">·</span>
              <span className="text-critical">{stats.overdue} overdue</span>
              <span className="text-lineStrong">·</span>
              <span className="text-warning">{stats.critical} critical</span>
              <span className="text-lineStrong">·</span>
              <span>Dates are synthetic</span>
            </div>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={handleExport}>
            <Download size={13} /> Export queue
          </button>
        </div>
      ) : (
        <PageHeader
          overline="Operations · Unified action queue"
          title="Deadline Intelligence"
          description="One queue for maturity, renewal, verification, evidence, integrity, and release actions. Priorities derive from configurable lead times and are not a risk score."
          meta={
            <>
              <span className="text-[10.5px] text-muted">{filtered.length} action(s) in view</span>
              <span className="text-lineStrong">·</span>
              <span className="text-[10.5px] text-critical">{stats.overdue} overdue</span>
              <span className="text-lineStrong">·</span>
              <span className="text-[10.5px] text-warning">{stats.critical} critical</span>
              <span className="text-lineStrong">·</span>
              <span className="text-[10.5px] text-muted">Acting as {user.name}</span>
            </>
          }
          actions={
            <button type="button" className="btn-secondary" onClick={handleExport}>
              <Download size={14} /> Export queue
            </button>
          }
        />
      )}

      {stats.overdue > 0 && (
        <InfoNote tone="warning" className="mb-5" title={`${stats.overdue} overdue action(s)`}>
          Overdue items should be acknowledged or escalated. Maturity and renewal dates are generated
          relative to today for the synthetic dataset; they are not real depositor obligations.
        </InfoNote>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Overdue', stats.overdue, 'Past the configured due date', 'critical'],
          ['Critical window', stats.critical, 'Within the critical lead time', 'warning'],
          ['Due soon', stats.dueSoon, 'Approaching the due-soon threshold', 'info'],
          ['Completed', stats.completed, 'Closed or resolved upstream', 'success'],
        ].map(([label, value, detail, tone]) => (
          <div key={label} className="panel px-4 py-3.5">
            <div className="flex items-start justify-between">
              <div className="overline mb-1">{label}</div>
              <span className={`dot ${tone === 'critical' ? 'bg-critical' : tone === 'warning' ? 'bg-warning' : tone === 'info' ? 'bg-info' : 'bg-success'}`} />
            </div>
            <div className="font-display text-2xl text-ink">{value}</div>
            <div className="text-[9.5px] text-muted">{detail}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="panel px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="overline">{bucket.label}</span>
              <Clock size={12} className={bucket.tone === 'critical' ? 'text-critical' : bucket.tone === 'warning' ? 'text-warning' : 'text-info'} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-xl text-ink">{bucket.items.length}</span>
              <span className="font-mono text-[9px] text-muted">
                {formatCurrency(bucket.items.reduce((sum, item) => sum + Number(item.amount || 0), 0))}
              </span>
            </div>
            <div className="mt-2 flex h-1 gap-0.5">
              {bucket.items.slice(0, 12).map((item) => (
                <span
                  key={item.id}
                  className={`h-full flex-1 ${item.priority === 'overdue' || item.priority === 'critical' ? 'bg-critical/70' : item.priority === 'due_soon' ? 'bg-warning/80' : 'bg-info/60'}`}
                  title={`${item.instrumentId} · ${relativeDays(item.dueDate)}`}
                />
              ))}
              {bucket.items.length === 0 && <span className="h-full w-full bg-line" />}
            </div>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-line px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search action, record, institution…" className="lg:col-span-2" />
          <select className="select" value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter priority">
            <option value="active">Active actions</option>
            <option value="">All priorities</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>{PRIORITY_LABELS[value] ?? value}</option>
            ))}
          </select>
          <select className="select" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter type">
            <option value="">All action types</option>
            {TYPES.map((value) => (
              <option key={value} value={value}>{DEADLINE_TYPE_LABELS[value]}</option>
            ))}
          </select>
          <select className="select" value={institution} onChange={(event) => setInstitution(event.target.value)} aria-label="Filter institution">
            <option value="">All institutions</option>
            {state.institutions.map((item) => (
              <option key={item.id} value={item.id}>{item.shortName}</option>
            ))}
          </select>
          <select className="select lg:col-span-2" value={assignee} onChange={(event) => setAssignee(event.target.value)} aria-label="Filter assignee">
            <option value="">All assignees</option>
            {USERS.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No deadline actions match" message="Clear filters or switch to all priorities to inspect completed history." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1100px]">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Action</th>
                  <th>Record / institution</th>
                  <th>Type</th>
                  <th>Due</th>
                  <th>Amount</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((action) => (
                  <tr key={action.id} className="cursor-pointer" onClick={() => setFocus(action.id)}>
                    <td><PriorityBadge priority={action.priority} /></td>
                    <td>
                      <div className="max-w-[260px] truncate text-[10.5px] font-medium text-ink">{action.title}</div>
                      <div className="font-mono text-[8.5px] text-muted">{action.id}</div>
                    </td>
                    <td>
                      <Link to={`/app/instruments/${action.instrumentId}`} onClick={(event) => event.stopPropagation()} className="font-mono text-[9.5px] text-forest hover:text-copper">
                        {action.instrumentId}
                      </Link>
                      <div className="max-w-[170px] truncate text-[9px] text-muted">{action.institutionName}</div>
                    </td>
                    <td className="text-[9.5px] text-inkSoft">{DEADLINE_TYPE_LABELS[action.type] ?? action.type}</td>
                    <td className="whitespace-nowrap">
                      <div className="text-[9.5px] text-inkSoft">{formatDate(action.dueDate)}</div>
                      <div className={`text-[8.5px] ${action.daysRemaining < 0 ? 'text-critical' : 'text-muted'}`}>{relativeDays(action.dueDate)}</div>
                    </td>
                    <td className="whitespace-nowrap font-mono text-[9.5px]">{formatCurrency(action.amount)}</td>
                    <td className="text-[9.5px] text-muted">{getUserById(action.assignedTo)?.name ?? 'Unassigned'}</td>
                    <td>
                      <StatusBadge
                        tone={action.status === 'completed' ? 'success' : action.status === 'escalated' ? 'critical' : action.status === 'acknowledged' ? 'info' : 'neutral'}
                        dot={false}
                      >
                        {action.statusLabel}
                      </StatusBadge>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon h-6 w-6"
                        onClick={(event) => {
                          event.stopPropagation()
                          setFocus(action.id)
                        }}
                        aria-label={`Open ${action.title}`}
                      >
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/30 px-4 py-2">
          <span className="text-[9.5px] text-muted">
            {filtered.length} of {scoped.length} generated actions. The queue is derived on every state
            change; it is not a separate stale task list.
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] text-muted">
            <AlertTriangle size={9} /> Dates are synthetic and relative to today
          </span>
        </div>
      </section>

      <DeadlineDrawer action={focused} open={Boolean(focused)} onClose={() => setFocus(null)} />
    </div>
  )
}
