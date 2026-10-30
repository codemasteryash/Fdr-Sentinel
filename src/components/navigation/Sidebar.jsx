import { NavLink } from 'react-router-dom'
import {
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  PlayCircle,
  CircleDot,
} from 'lucide-react'
import { NAV_ITEMS } from '../../app/navConfig'
import { useDemoState } from '../../hooks/useDemoState'
import { toggleSidebar } from '../../services/demoDataService'
import { buildDeadlineActions } from '../../services/deadlineEngine'
import { useMemo } from 'react'

function useWorkspaceCounts() {
  const state = useDemoState()
  return useMemo(() => {
    const deadlines = buildDeadlineActions(state)
    const overdue = deadlines.filter(
      (action) => action.priority === 'overdue' && action.status !== 'completed',
    ).length
    const verification = state.instruments.filter(
      (instrument) =>
        !['released', 'rejected'].includes(instrument.lifecycleStatus) &&
        instrument.verificationStatus !== 'confirmed',
    ).length
    const releasePending = state.instruments.filter((instrument) =>
      ['release_requested', 'release_review'].includes(instrument.lifecycleStatus),
    ).length
    const openFindings = state.findings.filter((finding) =>
      ['open', 'in_review'].includes(finding.reviewStatus),
    ).length
    return {
      overview: overdue + releasePending,
      verification,
      lifecycle: overdue + releasePending,
      governance: openFindings,
    }
  }, [state])
}

function badgeFor(path, counts) {
  if (path === '/app/overview') return counts.overview
  if (path === '/app/verification') return counts.verification
  if (path === '/app/lifecycle') return counts.lifecycle
  if (path === '/app/governance') return counts.governance
  return 0
}

function SidebarBody({ collapsed, mobile = false, onNavigate }) {
  const state = useDemoState()
  const counts = useWorkspaceCounts()

  return (
    <div className="grain flex h-full flex-col overflow-hidden bg-forest-deep text-paper">
      <div
        className={`flex h-[66px] shrink-0 items-center border-b border-white/10 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <NavLink to="/app/overview" className="flex min-w-0 items-center gap-2.5" onClick={onNavigate}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-copper/50 bg-copper/10 text-copper">
            <ShieldCheck size={17} strokeWidth={1.7} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-[19px] font-medium leading-none tracking-[-0.01em]">
                FDR Sentinel
              </span>
              <span className="mt-1 block text-[8px] font-medium uppercase tracking-[0.18em] text-[#93A79A]">
                Instrument integrity
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

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-4" aria-label="Primary">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#7E9385]">
              Workspaces
            </span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>
        )}
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const badge = badgeFor(item.to, counts)
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-start gap-2.5 border-l-2 py-2.5 transition-colors duration-150 ${
                      collapsed ? 'justify-center px-2' : 'px-3'
                    } ${
                      isActive
                        ? 'border-copper bg-white/[0.06] text-paper'
                        : 'border-transparent text-[#AEBEB2] hover:bg-white/[0.035] hover:text-paper'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={15}
                        strokeWidth={1.7}
                        className={`mt-0.5 shrink-0 ${
                          isActive ? 'text-copper' : 'text-[#8FA396] group-hover:text-[#C4D0C6]'
                        }`}
                      />
                      {!collapsed ? (
                        <>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[12px] font-medium leading-tight">
                                {item.label}
                              </span>
                              {badge > 0 && (
                                <span
                                  className={`min-w-[17px] border px-1 py-0.5 text-center font-mono text-[8.5px] leading-none ${
                                    isActive
                                      ? 'border-copper/40 bg-copper/15 text-[#E6B99A]'
                                      : 'border-white/10 bg-white/[0.04] text-[#C0CEC3]'
                                  }`}
                                >
                                  {badge}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-[9px] leading-tight text-[#7E9385]">
                              {item.description}
                            </span>
                          </span>
                          <span className="mt-0.5 font-mono text-[8px] text-white/20">{item.index}</span>
                        </>
                      ) : (
                        badge > 0 && (
                          <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-copper" />
                        )
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>

        {!collapsed && (
          <div className="mt-5 border border-white/10 bg-white/[0.025] px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#93A79A]">
                Evaluation mode
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-copper" />
            </div>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#7E9385]">
              {state.instruments.length} seeded instruments. Six guided paths through the same service
              layer as the workspace.
            </p>
            <NavLink
              to="/app/demo"
              onClick={onNavigate}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-medium text-[#D9B89F] transition-colors hover:text-white"
            >
              <PlayCircle size={12} /> Open guided demo
            </NavLink>
          </div>
        )}
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
                Synthetic environment
              </span>
            </div>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#7E9385]">
              Browser-only state. No live bank or AICTE system is connected.
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#7E9385]">
                SIH26265 · AICTE
              </span>
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
          collapsed ? 'w-[76px]' : 'w-[252px]'
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
