import { useNavigate } from 'react-router-dom'
import { ChevronDown, Check, ShieldCheck, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dropdown } from '../shared/Dropdown'
import { Avatar } from '../shared/ui'
import { useDemoState } from '../../hooks/useDemoState'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { ROLES, ROLE_ORDER } from '../../data/users'
import { setRole } from '../../services/demoDataService'
import { recordAudit } from '../../services/auditService'

export function RoleMenu() {
  const state = useDemoState()
  const user = useCurrentUser()
  const navigate = useNavigate()

  const changeRole = (roleKey, close) => {
    if (roleKey === state.settings.role) {
      close()
      return
    }
    const previous = ROLES[state.settings.role]?.label
    const nextUser = setRole(roleKey)
    recordAudit({
      action: 'role.changed',
      entityType: 'system',
      entityId: nextUser.id,
      summary: `Demo role switched from ${previous} to ${ROLES[roleKey].label}. Permissions are simulated in the browser.`,
      previousState: state.settings.role,
      newState: roleKey,
      reason: 'Role preview changed from the top navigation.',
      outcome: 'success',
      actor: nextUser,
      role: roleKey,
    })
    toast.success(`Previewing as ${ROLES[roleKey].label}`, {
      description: 'Available actions and lifecycle permissions have changed.',
    })
    close()
  }

  return (
    <Dropdown
      label="Demo role selector"
      width="w-[310px]"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-2 border border-transparent px-1.5 py-1 transition-colors hover:border-line hover:bg-paper"
        >
          <Avatar name={user.name} size="md" />
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-[130px] truncate text-[11px] font-semibold leading-tight text-ink">
              {user.name}
            </span>
            <span className="block max-w-[130px] truncate text-[9px] uppercase tracking-[0.09em] text-muted">
              {ROLES[user.role]?.shortLabel}
            </span>
          </span>
          <ChevronDown size={13} className="text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="border-b border-line px-4 py-3">
            <div className="overline flex items-center gap-1.5">
              <ShieldCheck size={11} /> Preview as role
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Frontend-only simulation. This selector is not authentication or security.
            </p>
          </div>
          <ul className="max-h-[330px] overflow-y-auto py-1">
            {ROLE_ORDER.map((key) => {
              const role = ROLES[key]
              const active = state.settings.role === key
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => changeRole(key, close)}
                    className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-copper/[0.035] ${
                      active ? 'bg-forest-soft/40' : ''
                    }`}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {active ? (
                        <Check size={13} className="text-copper" />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-lineStrong" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11.5px] font-semibold text-ink">
                        {role.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
                        {role.description}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-line px-4 py-2.5">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-[10.5px] font-medium text-forest hover:text-copper"
              onClick={() => {
                navigate('/settings')
                close()
              }}
            >
              <Settings2 size={12} /> Role and demo settings
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  )
}
