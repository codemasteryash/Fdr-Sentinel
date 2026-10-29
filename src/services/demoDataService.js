import { INSTITUTIONS } from '../data/institutions'
import { INSTRUMENTS } from '../data/instruments'
import { FINDINGS } from '../data/findings'
import { SEED_NOTIFICATIONS } from '../data/notifications'
import { buildSeedEvidence } from '../data/evidence'
import { buildSeedAuditEvents } from '../data/auditEvents'
import { getDemoUserForRole, getUserById } from '../data/users'
import { todayISO } from '../utils/format'

const STORAGE_KEY = 'fdr-sentinel:demo:v1'
const SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS = {
  currentUserId: 'u-admin',
  role: 'admin',
  sidebarCollapsed: false,
  density: 'comfortable',
  leadTimes: { criticalDays: 30, dueSoonDays: 60, upcomingDays: 90 },
  thresholds: {
    fuzzySimilarity: 82,
    amountVariancePercent: 1,
    amountVarianceAbsolute: 1000,
  },
  notifications: {
    integrity: true,
    maturity: true,
    releases: true,
    verification: true,
    inAppOnly: true,
  },
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

export function createSeedState() {
  const now = todayISO()
  const instruments = clone(INSTRUMENTS)
  return {
    version: SCHEMA_VERSION,
    seededAt: now,
    institutions: clone(INSTITUTIONS),
    instruments,
    findings: clone(FINDINGS),
    evidence: buildSeedEvidence(instruments),
    auditEvents: buildSeedAuditEvents(instruments, FINDINGS),
    notifications: clone(SEED_NOTIFICATIONS),
    deadlineState: {
      acknowledged: {
        'maturity:FDR-2026-001': {
          at: now,
          by: 'u-rev1',
          note: 'Institution contacted for renewal instruction (seeded acknowledgement).',
        },
      },
      completed: {},
      assignments: {},
      escalations: {
        'renewal:FDR-2025-024': {
          at: now,
          by: 'u-admin',
          note: 'Escalated after configured grace period.',
        },
      },
      notificationHistory: [
        {
          id: 'DLN-001',
          type: 'escalation',
          message:
            'Overdue renewal for FDR-2025-024 escalated to Brahmputra Institute of Technology (simulated in-app).',
          at: now,
          read: true,
        },
      ],
    },
    settings: clone(DEFAULT_SETTINGS),
    meta: { updatedAt: now, resetCount: 0 },
  }
}

function validShape(state) {
  return (
    state &&
    state.version === SCHEMA_VERSION &&
    Array.isArray(state.institutions) &&
    Array.isArray(state.instruments) &&
    Array.isArray(state.findings) &&
    Array.isArray(state.evidence) &&
    Array.isArray(state.auditEvents) &&
    Array.isArray(state.notifications)
  )
}

function mergeSettings(loaded) {
  const base = createSeedState()
  return {
    ...base,
    ...loaded,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(loaded.settings ?? {}),
      leadTimes: { ...DEFAULT_SETTINGS.leadTimes, ...(loaded.settings?.leadTimes ?? {}) },
      thresholds: {
        ...DEFAULT_SETTINGS.thresholds,
        ...(loaded.settings?.thresholds ?? {}),
      },
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(loaded.settings?.notifications ?? {}),
      },
    },
    deadlineState: {
      ...base.deadlineState,
      ...(loaded.deadlineState ?? {}),
      acknowledged: loaded.deadlineState?.acknowledged ?? {},
      completed: loaded.deadlineState?.completed ?? {},
      assignments: loaded.deadlineState?.assignments ?? {},
      escalations: loaded.deadlineState?.escalations ?? {},
      notificationHistory: loaded.deadlineState?.notificationHistory ?? [],
    },
  }
}

function readStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!validShape(parsed)) return null
    return mergeSettings(parsed)
  } catch {
    return null
  }
}

let state = readStorage() ?? createSeedState()
let storageWarning = null
const listeners = new Set()

function persist() {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    storageWarning = null
  } catch {
    storageWarning =
      'Local browser storage is unavailable or full. Changes will last only for this session.'
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

export const demoStore = {
  getState() {
    return state
  },
  getStorageWarning() {
    return storageWarning
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  update(mutator) {
    const next = clone(state)
    mutator(next)
    next.meta = { ...next.meta, updatedAt: todayISO() }
    state = next
    persist()
    emit()
    return state
  },
  replaceState(next) {
    state = next
    persist()
    emit()
  },
  reset({ keepRole = true } = {}) {
    const seed = createSeedState()
    if (keepRole) {
      seed.settings.role = state.settings.role
      seed.settings.currentUserId = state.settings.currentUserId
      seed.settings.sidebarCollapsed = state.settings.sidebarCollapsed
    }
    seed.meta.resetCount = (state.meta?.resetCount ?? 0) + 1
    state = seed
    persist()
    emit()
    return state
  },
  clearStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  },
}

export function getCurrentUser() {
  const current = state.settings
  return getUserById(current.currentUserId) ?? getDemoUserForRole(current.role)
}

export function setRole(roleKey) {
  const user = getDemoUserForRole(roleKey)
  demoStore.update((draft) => {
    draft.settings.role = roleKey
    draft.settings.currentUserId = user.id
  })
  return user
}

export function updateSettings(patch) {
  demoStore.update((draft) => {
    draft.settings = {
      ...draft.settings,
      ...patch,
      leadTimes: { ...draft.settings.leadTimes, ...(patch.leadTimes ?? {}) },
      thresholds: { ...draft.settings.thresholds, ...(patch.thresholds ?? {}) },
      notifications: { ...draft.settings.notifications, ...(patch.notifications ?? {}) },
    }
  })
}

export function toggleSidebar() {
  demoStore.update((draft) => {
    draft.settings.sidebarCollapsed = !draft.settings.sidebarCollapsed
  })
}

export function nextId(prefix, items, key = 'id') {
  const numbers = items
    .map((item) => {
      const match = String(item[key] ?? '').match(/(\d+)$/)
      return match ? Number(match[1]) : 0
    })
    .filter((n) => Number.isFinite(n))
  const max = numbers.length ? Math.max(...numbers) : 0
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export { STORAGE_KEY, SCHEMA_VERSION }
