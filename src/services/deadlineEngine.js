import { addDays, differenceInCalendarDays, formatISO, parseISO } from 'date-fns'
import { demoStore } from './demoDataService'
import { appendAuditEvent } from './auditService'
import { addNotification } from './notificationService'
import { can, PERMISSIONS, getUserById } from '../data/users'
import { DEADLINE_TYPE_LABELS } from '../data/statuses'
import { daysUntil, formatCurrency, formatDate, todayISO } from '../utils/format'

const PRIORITY_RANK = {
  overdue: 0,
  critical: 1,
  due_soon: 2,
  upcoming: 3,
  completed: 4,
}

const ACTION_STATUS_LABELS = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  completed: 'Completed',
  escalated: 'Escalated',
}

export function priorityForDays(days, leadTimes) {
  if (days === null) return 'upcoming'
  if (days < 0) return 'overdue'
  if (days <= leadTimes.criticalDays) return 'critical'
  if (days <= leadTimes.dueSoonDays) return 'due_soon'
  return 'upcoming'
}

function addDaysIso(value, days) {
  return formatISO(addDays(parseISO(value), days))
}

export function buildDeadlineActions(state) {
  const { leadTimes } = state.settings
  const actions = []
  const findingsByInstrument = new Map()
  state.findings.forEach((finding) => {
    if (!['open', 'in_review', 'confirmed'].includes(finding.reviewStatus)) return
    if (!['critical', 'high', 'medium'].includes(finding.severity)) return
    const list = findingsByInstrument.get(finding.instrumentId) ?? []
    list.push(finding)
    findingsByInstrument.set(finding.instrumentId, list)
  })

  const evidenceFollowUps = new Map()
  state.evidence.forEach((record) => {
    if (!record.followUp) return
    const list = evidenceFollowUps.get(record.instrumentId) ?? []
    list.push(record)
    evidenceFollowUps.set(record.instrumentId, list)
  })

  state.instruments.forEach((instrument) => {
    const deadlineState = state.deadlineState
    const maturityDays = daysUntil(instrument.maturityDate)
    const closed = ['released', 'rejected', 'replaced'].includes(instrument.lifecycleStatus)
    const inRelease = ['release_requested', 'release_review'].includes(instrument.lifecycleStatus)
    const institution = state.institutions.find((item) => item.id === instrument.institutionId)

    if (!closed && !inRelease && maturityDays !== null && maturityDays <= leadTimes.upcomingDays) {
      const renewalState = ['renewal_due', 'renewal_pending'].includes(instrument.lifecycleStatus)
      const type = renewalState ? 'renewal' : 'maturity'
      const id = `${type}:${instrument.id}`
      const completed = Boolean(deadlineState.completed[id])
      const acknowledged = Boolean(deadlineState.acknowledged[id])
      const escalated = Boolean(deadlineState.escalations[id])
      actions.push({
        id,
        type,
        instrumentId: instrument.id,
        institutionId: instrument.institutionId,
        institutionName: institution?.name ?? instrument.institutionName,
        reference: instrument.reference,
        title:
          type === 'renewal'
            ? `Renewal required for ${instrument.id}`
            : `Maturity approaching for ${instrument.id}`,
        dueDate:
          type === 'renewal' && maturityDays < 0
            ? instrument.maturityDate
            : instrument.maturityDate,
        daysRemaining: maturityDays,
        priority: completed ? 'completed' : escalated ? 'critical' : priorityForDays(maturityDays, leadTimes),
        status: completed ? 'completed' : escalated ? 'escalated' : acknowledged ? 'acknowledged' : 'open',
        statusLabel: completed
          ? ACTION_STATUS_LABELS.completed
          : escalated
            ? ACTION_STATUS_LABELS.escalated
            : acknowledged
              ? ACTION_STATUS_LABELS.acknowledged
              : ACTION_STATUS_LABELS.open,
        assignedTo:
          deadlineState.assignments[id]?.userId ?? instrument.reviewerId ?? 'u-rev1',
        reason:
          maturityDays < 0
            ? `Instrument matured ${Math.abs(maturityDays)} days ago and remains in ${instrument.lifecycleStatus.replaceAll('_', ' ')}.`
            : `Maturity falls within the ${leadTimes.upcomingDays}-day outlook (${maturityDays} days remaining).`,
        recommendedAction:
          type === 'renewal'
            ? 'Obtain renewal instructions and supporting certificate from the institution.'
            : 'Issue the renewal instruction and prepare evidence for the maturity action.',
        amount: instrument.amount,
        acknowledgedAt: deadlineState.acknowledged[id]?.at ?? null,
        completedAt: deadlineState.completed[id]?.at ?? null,
      })
    }

    if (inRelease) {
      const id = `release:${instrument.id}`
      const due = addDaysIso(instrument.updatedAt, 3)
      const dueIn = differenceInCalendarDays(parseISO(due), new Date())
      const completed = Boolean(deadlineState.completed[id])
      const acknowledged = Boolean(deadlineState.acknowledged[id])
      const escalated = Boolean(deadlineState.escalations[id])
      const approved = Boolean(instrument.approval?.approved)
      actions.push({
        id,
        type: 'release',
        instrumentId: instrument.id,
        institutionId: instrument.institutionId,
        institutionName: institution?.name ?? instrument.institutionName,
        reference: instrument.reference,
        title: approved
          ? `Complete release for ${instrument.id}`
          : `Approval required before release of ${instrument.id}`,
        dueDate: due,
        daysRemaining: dueIn,
        priority: completed ? 'completed' : escalated ? 'critical' : priorityForDays(dueIn, leadTimes),
        status: completed ? 'completed' : escalated ? 'escalated' : acknowledged ? 'acknowledged' : 'open',
        statusLabel: completed
          ? ACTION_STATUS_LABELS.completed
          : escalated
            ? ACTION_STATUS_LABELS.escalated
            : acknowledged
              ? ACTION_STATUS_LABELS.acknowledged
              : ACTION_STATUS_LABELS.open,
        assignedTo: deadlineState.assignments[id]?.userId ?? 'u-approver',
        reason: approved
          ? 'Approval is recorded. The release transition must still pass policy checks.'
          : 'Release is under review without a recorded approving-authority sign-off (REL-03).',
        recommendedAction: approved
          ? 'Complete the release through the lifecycle workspace.'
          : 'Record a demo approval or return the request with a reason.',
        amount: instrument.amount,
        acknowledgedAt: deadlineState.acknowledged[id]?.at ?? null,
        completedAt: deadlineState.completed[id]?.at ?? null,
      })
    }

    if (instrument.lifecycleStatus === 'verification_pending') {
      const id = `verification:${instrument.id}`
      const due = addDaysIso(instrument.updatedAt, 5)
      const dueIn = differenceInCalendarDays(parseISO(due), new Date())
      const completed = Boolean(deadlineState.completed[id])
      const acknowledged = Boolean(deadlineState.acknowledged[id])
      const escalated = Boolean(deadlineState.escalations[id])
      actions.push({
        id,
        type: 'verification',
        instrumentId: instrument.id,
        institutionId: instrument.institutionId,
        institutionName: institution?.name ?? instrument.institutionName,
        reference: instrument.reference,
        title: `Verification action pending for ${instrument.id}`,
        dueDate: due,
        daysRemaining: dueIn,
        priority: completed ? 'completed' : escalated ? 'critical' : priorityForDays(dueIn, leadTimes),
        status: completed ? 'completed' : escalated ? 'escalated' : acknowledged ? 'acknowledged' : 'open',
        statusLabel: completed
          ? ACTION_STATUS_LABELS.completed
          : escalated
            ? ACTION_STATUS_LABELS.escalated
            : acknowledged
              ? ACTION_STATUS_LABELS.acknowledged
              : ACTION_STATUS_LABELS.open,
        assignedTo:
          deadlineState.assignments[id]?.userId ?? instrument.reviewerId ?? 'u-rev1',
        reason: 'Internal checks or independent confirmation are still outstanding.',
        recommendedAction: 'Open the verification case and complete the checklist.',
        amount: instrument.amount,
        acknowledgedAt: deadlineState.acknowledged[id]?.at ?? null,
        completedAt: deadlineState.completed[id]?.at ?? null,
      })
    }

    const instrumentFindings = findingsByInstrument.get(instrument.id) ?? []
    instrumentFindings.slice(0, 2).forEach((finding) => {
      const id = `finding:${instrument.id}:${finding.id}`
      const due = addDaysIso(finding.createdAt, 7)
      const dueIn = differenceInCalendarDays(parseISO(due), new Date())
      const completed =
        Boolean(deadlineState.completed[id]) ||
        !['open', 'in_review', 'confirmed'].includes(finding.reviewStatus)
      const acknowledged = Boolean(deadlineState.acknowledged[id])
      const escalated = Boolean(deadlineState.escalations[id])
      actions.push({
        id,
        type: 'finding',
        instrumentId: instrument.id,
        institutionId: instrument.institutionId,
        institutionName: institution?.name ?? instrument.institutionName,
        reference: instrument.reference,
        title: `Review ${finding.id} on ${instrument.id}`,
        dueDate: due,
        daysRemaining: dueIn,
        priority: completed ? 'completed' : escalated ? 'critical' : priorityForDays(dueIn, leadTimes),
        status: completed ? 'completed' : escalated ? 'escalated' : acknowledged ? 'acknowledged' : 'open',
        statusLabel: completed
          ? ACTION_STATUS_LABELS.completed
          : escalated
            ? ACTION_STATUS_LABELS.escalated
            : acknowledged
              ? ACTION_STATUS_LABELS.acknowledged
              : ACTION_STATUS_LABELS.open,
        assignedTo:
          deadlineState.assignments[id]?.userId ?? instrument.reviewerId ?? 'u-rev1',
        reason: finding.title,
        recommendedAction: 'Open Integrity Intelligence and record a reviewer decision.',
        amount: instrument.amount,
        findingId: finding.id,
        acknowledgedAt: deadlineState.acknowledged[id]?.at ?? null,
        completedAt: deadlineState.completed[id]?.at ?? null,
      })
    })

    if (!closed && !inRelease && instrumentFindings.length === 0) {
      const followUps = evidenceFollowUps.get(instrument.id) ?? []
      if (followUps.length) {
        const id = `evidence:${instrument.id}`
        const due = addDaysIso(instrument.updatedAt, 6)
        const dueIn = differenceInCalendarDays(parseISO(due), new Date())
        const completed = Boolean(deadlineState.completed[id])
        const acknowledged = Boolean(deadlineState.acknowledged[id])
        const escalated = Boolean(deadlineState.escalations[id])
        actions.push({
          id,
          type: 'evidence',
          instrumentId: instrument.id,
          institutionId: instrument.institutionId,
          institutionName: institution?.name ?? instrument.institutionName,
          reference: instrument.reference,
          title: `Evidence follow-up required for ${instrument.id}`,
          dueDate: due,
          daysRemaining: dueIn,
          priority: completed ? 'completed' : escalated ? 'critical' : priorityForDays(dueIn, leadTimes),
          status: completed
            ? 'completed'
            : escalated
              ? 'escalated'
              : acknowledged
                ? 'acknowledged'
                : 'open',
          statusLabel: completed
            ? ACTION_STATUS_LABELS.completed
            : escalated
              ? ACTION_STATUS_LABELS.escalated
              : acknowledged
                ? ACTION_STATUS_LABELS.acknowledged
                : ACTION_STATUS_LABELS.open,
          assignedTo:
            deadlineState.assignments[id]?.userId ?? instrument.reviewerId ?? 'u-rev1',
          reason: `${followUps.length} field(s) require independent confirmation or correction.`,
          recommendedAction: 'Open the Evidence Passport and record the required review action.',
          amount: instrument.amount,
          acknowledgedAt: deadlineState.acknowledged[id]?.at ?? null,
          completedAt: deadlineState.completed[id]?.at ?? null,
        })
      }
    }
  })

  return actions.sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (rank !== 0) return rank
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
}

export function getDeadlineStats(actions) {
  return {
    total: actions.length,
    overdue: actions.filter((action) => action.priority === 'overdue' && action.status !== 'completed').length,
    critical: actions.filter((action) => action.priority === 'critical' && action.status !== 'completed').length,
    dueSoon: actions.filter((action) => action.priority === 'due_soon' && action.status !== 'completed').length,
    completed: actions.filter((action) => action.status === 'completed').length,
    acknowledged: actions.filter((action) => action.status === 'acknowledged').length,
    escalated: actions.filter((action) => action.status === 'escalated').length,
  }
}

function canManageDeadline(user, action) {
  if (can(user.role, PERMISSIONS.DEADLINE_MANAGE)) return { ok: true }
  if (user.role === 'officer' && user.institutionId === action.institutionId) return { ok: true }
  return {
    ok: false,
    reason: `Role "${user.role}" cannot manage this deadline action.`,
  }
}

function findAction(id, state = demoStore.getState()) {
  return buildDeadlineActions(state).find((action) => action.id === id) ?? null
}

function recordDeadlineAudit(action, suffix, note, user) {
  demoStore.update((draft) => {
    appendAuditEvent(draft, {
      action: `deadline.${suffix}`,
      entityType: 'deadline',
      entityId: action.id,
      summary: `${action.title} — ${suffix.replaceAll('_', ' ')}.`,
      previousState: action.status,
      newState: suffix === 'escalated' ? 'escalated' : suffix === 'assigned' ? 'assigned' : suffix,
      reason: note || 'Deadline action updated.',
      outcome: 'success',
      role: user.role,
      actor: user,
    })
  })
}

export function acknowledgeDeadline(id, note = '', user) {
  const state = demoStore.getState()
  const action = findAction(id, state)
  if (!action) return { ok: false, reason: 'Deadline action not found.' }
  const permission = canManageDeadline(user, action)
  if (!permission.ok) return permission
  if (action.status === 'completed') return { ok: false, reason: 'This action is already completed.' }
  demoStore.update((draft) => {
    draft.deadlineState.acknowledged[id] = {
      at: todayISO(),
      by: user.id,
      note: note || 'Acknowledged in the demo workspace.',
    }
  })
  recordDeadlineAudit(action, 'acknowledged', note, user)
  return { ok: true }
}

export function completeDeadline(id, note = '', user) {
  const state = demoStore.getState()
  const action = findAction(id, state)
  if (!action) return { ok: false, reason: 'Deadline action not found.' }
  const permission = canManageDeadline(user, action)
  if (!permission.ok) return permission
  if (action.type === 'finding') {
    return {
      ok: false,
      reason:
        'Finding actions cannot be closed from the deadline queue. Record a reviewer decision in Integrity Intelligence so the finding history is preserved.',
    }
  }
  if (action.type === 'release') {
    return {
      ok: false,
      reason:
        'Release actions close through the lifecycle engine. Record approval and complete the release transition first.',
    }
  }
  if (!note.trim()) return { ok: false, reason: 'A completion note is required.' }
  demoStore.update((draft) => {
    draft.deadlineState.completed[id] = {
      at: todayISO(),
      by: user.id,
      note,
    }
  })
  recordDeadlineAudit(action, 'completed', note, user)
  return { ok: true }
}

export function assignDeadline(id, userId, note = '', user) {
  const state = demoStore.getState()
  const action = findAction(id, state)
  if (!action) return { ok: false, reason: 'Deadline action not found.' }
  const permission = canManageDeadline(user, action)
  if (!permission.ok) return permission
  const assignee = getUserById(userId)
  if (!assignee) return { ok: false, reason: 'Select a valid assignee.' }
  demoStore.update((draft) => {
    draft.deadlineState.assignments[id] = {
      at: todayISO(),
      by: user.id,
      userId,
      note: note || `Assigned to ${assignee.name}.`,
    }
  })
  recordDeadlineAudit(action, 'assigned', note || `Assigned to ${assignee.name}.`, user)
  return { ok: true }
}

export function escalateDeadline(id, note = '', user) {
  const state = demoStore.getState()
  const action = findAction(id, state)
  if (!action) return { ok: false, reason: 'Deadline action not found.' }
  if (!can(user.role, PERMISSIONS.DEADLINE_MANAGE)) {
    return {
      ok: false,
      reason: `Role "${user.role}" cannot escalate deadline actions.`,
    }
  }
  const message = `${action.title} escalated. ${note || 'Review required by the operations lead.'}`
  demoStore.update((draft) => {
    draft.deadlineState.escalations[id] = {
      at: todayISO(),
      by: user.id,
      note: note || 'Escalated in the demo workspace.',
    }
    draft.deadlineState.notificationHistory.unshift({
      id: `DLN-${draft.deadlineState.notificationHistory.length + 1}`,
      type: 'escalation',
      message: `${message} (simulated in-app notification)`,
      at: todayISO(),
      read: false,
    })
  })
  recordDeadlineAudit(action, 'escalated', note, user)
  addNotification({
    type: 'deadline',
    severity: 'warning',
    title: `Escalated: ${action.title}`,
    message,
    instrumentId: action.instrumentId,
    href: `/deadlines?focus=${encodeURIComponent(id)}`,
    actionLabel: 'Open deadline',
  })
  return { ok: true }
}

export function deadlineTypeLabel(type) {
  return DEADLINE_TYPE_LABELS[type] ?? type
}

export function focusDeadlineFromQuery(actions, focus) {
  if (!focus) return null
  return actions.find((action) => action.id === focus) ?? null
}

export function formatDeadlineAmount(amount) {
  return `${formatCurrency(amount)}`
}

export function formatDeadlineDue(action) {
  return formatDate(action.dueDate)
}
