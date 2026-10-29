import { demoStore } from './demoDataService'
import { todayISO } from '../utils/format'

function nextNotificationId(notifications) {
  let max = 0
  notifications.forEach((notification) => {
    const match = String(notification.id).match(/NTF-(\d+)/)
    if (match) max = Math.max(max, Number(match[1]))
  })
  return `NTF-${String(max + 1).padStart(3, '0')}`
}

export function addNotification(payload) {
  let created = null
  demoStore.update((draft) => {
    created = {
      id: nextNotificationId(draft.notifications),
      type: payload.type ?? 'system',
      severity: payload.severity ?? 'info',
      title: payload.title,
      message: payload.message,
      instrumentId: payload.instrumentId ?? null,
      href: payload.href ?? '/dashboard',
      actionLabel: payload.actionLabel ?? 'View',
      createdAt: todayISO(),
      read: false,
      simulated: true,
    }
    draft.notifications.unshift(created)
  })
  return created
}

export function markNotificationRead(id) {
  demoStore.update((draft) => {
    const notification = draft.notifications.find((item) => item.id === id)
    if (notification) notification.read = true
  })
}

export function markAllNotificationsRead() {
  demoStore.update((draft) => {
    draft.notifications.forEach((notification) => {
      notification.read = true
    })
  })
}

export function unreadNotifications(state) {
  return state.notifications.filter((notification) => !notification.read)
}

export function sortedNotifications(state) {
  return [...state.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
