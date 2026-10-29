import { NavLink } from 'react-router-dom'
import {
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  CircleDot,
} from 'lucide-react'
import { NAV_GROUPS } from '../../app/navConfig'
import { useDemoState } from '../../hooks/useDemoState'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { toggleSidebar } from '../../services/demoDataService'
import { buildDeadlineActions } from '../../services/deadlineEngine'
import { ROLES } from '../../data/users'
import { Avatar } from '../shared/ui'

function badgeFor(path, state, counts) {
  if (path === '/integrity') return counts.unreviewedFindings
  if (path === '/deadlines') return counts.overdueDeadlines
  if (path === '/verification') return counts.verificationQueue
  if (path === '/lifecycle') return counts.releasePending
  return 0
}

function SidebarBody({ collapsed, mobile = false, onNavigate }) {
  const state = useDemoState()
  const user = useCurrentUser()
  const deadlines = buildDeadlineActions(state)
  const counts = {
    unreviewedFindings: state.findings.filter((finding) => finding.reviewStatus === 'open').length,
    overdueDeadlines: deadlines.filter(
      (action) => action.priority === 'overdue' && action.status !== 'completed',
    ).length,
    verificationQueue: state.instruments.filter(
      (instrument) =>
        !['released', 'rejected'].includes(instrument.lifecycleStatus) &&
        instrument.verificationStatus !== 'confirmed',
    ).length,
    releasePending: state.instruments.filter((instrument) =>
      ['release_requested', 'release_review'].includes(instrument.lifecycleStatus),
    ).length,
  }

  return (
    <div className="grain flex h-full flex-col overflow-hidden bg-forest-deep text-paper">
      <div
        className={`flex h-[62px] shrink-0 items-center border-b border-white/10 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <NavLink to="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={onNavigate}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-copper/50 bg-copper/10 text-copper">
            <ShieldCheck size={17} strokeWidth={1.7} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-[19px] font-medium leading-none tracking-[-0.01em]">
                FDR Sentinel
              </span>
              <span className="mt-1 block text-[8px] font-medium uppercase tracking-[0.18em] text-[#93A79A]">
                Instrument Integrity
              </span>
            </span>
          )}
        </NavLink>
        {mobile && (
          <button
            type="button"
            onClick={onNavigate}
            className="text-[#B7C4BA] hover:text-paper"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <div className="mb-1.5 flex items-center gap-2 px-4">
                <span className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#7E9385]">
                  {group.label}
                </span>
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>
            )}
            <ul>
              {group.items.map((item) => {
                const Icon = item.icon
                const badge = badgeFor(item.to, state, counts)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-2.5 border-l-2 py-[7px] text-[12.5px] transition-colors duration-150 ${
                          collapsed ? 'justify-center px-2' : 'px-4'
                        } ${
                          isActive
                            ? 'border-copper bg-white/[0.055] text-paper'
                            : 'border-transparent text-[#AEBEB2] hover:bg-white/[0.035] hover:text-paper'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={15}
                            strokeWidth={1.7}
                            className={isActive ? 'text-copper' : 'text-[#8FA396] group-hover:text-[#C4D0C6]'}
                          />
                          {!collapsed && (
                            <>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {badge > 0 ? (
                                <span
                                  className={`min-w-[18px] border px-1 py-0.5 text-center font-mono text-[9px] leading-none ${
                                    isActive
                                      ? 'border-copper/40 bg-copper/15 text-[#E6B99A]'
                                      : 'border-white/10 bg-white/[0.04] text-[#C0CEC3]'
                                  }`}
                                >
                                  {badge}
                                </span>
                              ) : (
                                <span className="font-mono text-[8.5px] text-white/20">
                                  {item.index}
                                </span>
                              )}
                            </>
                          )}
                          {collapsed && badge > 0 && (
                            <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-copper" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10">
        {!collapsed ? (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-copper opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-copper" />
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#C9A184]">
                Interactive prototype
              </span>
            </div>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#7E9385]">
              Synthetic data. State stored in this browser only. No live bank connection.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={user.name} size="sm" className="bg-white/10 text-paper" />
                <div className="min-w-0">
                  <div className="truncate text-[10.5px] font-medium text-paper">{user.name}</div>
                  <div className="truncate text-[8.5px] uppercase tracking-[0.1em] text-[#7E9385]">
                    {ROLES[user.role]?.shortLabel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSidebar()}
                className="flex h-6 w-6 items-center justify-center text-[#7E9385] transition-colors hover:text-paper"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <button
              type="button"
              onClick={() => toggleSidebar()}
              className="flex h-7 w-7 items-center justify-center text-[#7E9385] transition-colors hover:text-paper"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
            <CircleDot size={12} className="text-copper" />
          </div>
        )}
      </div>
    </div>
  )
}

export function Sidebar({ mobileOpen, onCloseMobile }) {
  const state = useDemoState()
  const collapsed = state.settings.sidebarCollapsed

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden shrink-0 border-r border-black/20 transition-[width] duration-200 ease-precise lg:block ${
          collapsed ? 'w-[76px]' : 'w-[266px]'
        }`}
        aria-label="Application navigation"
      >
        <SidebarBody collapsed={collapsed} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-forest-deep/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-[280px] max-w-[84vw] animate-slide-in border-r border-black/20">
            <SidebarBody collapsed={false} mobile onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  )
}
