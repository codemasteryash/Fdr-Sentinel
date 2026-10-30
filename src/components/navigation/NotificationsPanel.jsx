import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, BellOff } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Dropdown } from '../shared/Dropdown'
import { Segmented } from '../shared/Tabs'
import { StatusBadge } from '../shared/StatusBadge'
import { useDemoState } from '../../hooks/useDemoState'
import { markAllNotificationsRead, markNotificationRead, sortedNotifications } from '../../services/notificationService'
import { NOTIFICATION_TONE } from '../../data/statuses'

const TONE_LABEL = {
  critical: 'Critical',
  warning: 'Attention',
  info: 'Info',
  success: 'Resolved',
}

export function NotificationsPanel() {
  const state = useDemoState()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const notifications = sortedNotifications(state)
  const unread = notifications.filter((item) => !item.read)
  const visible = filter === 'unread' ? unread : notifications

  return (
    <Dropdown
      label="Notifications"
      width="w-[360px] max-w-[calc(100vw-2rem)]"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
          className="relative flex h-8 w-8 items-center justify-center border border-transparent text-inkSoft transition-colors hover:border-line hover:bg-paper"
        >
          <Bell size={16} strokeWidth={1.8} />
          {unread.length > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-copper px-0.5 font-mono text-[8px] font-semibold text-white">
              {unread.length}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="border-b border-line px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="overline">In-app notifications</div>
                <div className="font-display text-base text-ink">
                  {unread.length} unread
                  <span className="ml-2 font-sans text-[10px] font-normal text-muted">
                    simulated only
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => markAllNotificationsRead()}
                disabled={unread.length === 0}
                className="btn-ghost btn-xs"
              >
                <CheckCheck size={12} /> Mark all
              </button>
            </div>
            <Segmented
              className="mt-2.5"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All ${notifications.length}` },
                { value: 'unread', label: `Unread ${unread.length}` },
              ]}
            />
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <BellOff size={18} className="mb-2 text-muted" />
                <div className="text-[12px] text-ink">Nothing unread</div>
                <p className="mt-1 text-[10.5px] text-muted">
                  Seeded and dynamic demo notifications will appear here.
                </p>
              </div>
            ) : (
              visible.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    markNotificationRead(notification.id)
                    if (notification.href) navigate(notification.href)
                    close()
                  }}
                  className={`block w-full border-b border-line/60 px-4 py-3 text-left transition-colors hover:bg-copper/[0.035] ${
                    notification.read ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        notification.read
                          ? 'bg-lineStrong'
                          : notification.severity === 'critical'
                            ? 'bg-critical'
                            : notification.severity === 'warning'
                              ? 'bg-warning'
                              : 'bg-forest'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11.5px] font-semibold leading-snug text-ink">
                          {notification.title}
                        </span>
                        <span className="shrink-0 font-mono text-[8.5px] text-muted">
                          {formatDistanceToNow(parseISO(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                        {notification.message}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge tone={NOTIFICATION_TONE[notification.severity] ?? 'info'}>
                          {TONE_LABEL[notification.severity] ?? 'Info'}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <span className="text-[9.5px] text-muted">No emails or SMS are sent.</span>
            <button
              type="button"
              className="text-[10px] font-medium text-forest hover:text-copper"
              onClick={() => {
                navigate('/app/lifecycle?view=deadlines')
                close()
              }}
            >
              Open deadline queue →
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  )
}
