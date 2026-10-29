import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../navigation/Sidebar'
import { Topbar } from '../layout/Topbar'
import { useDemoState } from '../../hooks/useDemoState'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const state = useDemoState()
  const collapsed = state.settings.sidebarCollapsed

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-paper">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div
        className={`min-h-screen transition-[padding] duration-200 ease-precise ${
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[266px]'
        }`}
      >
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
        <footer className="mx-auto w-full max-w-[1480px] border-t border-line px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 text-[10px] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-display text-[13px] text-ink">FDR Sentinel</span>
              <span className="text-lineStrong">/</span>
              <span>SIH26265 · AICTE · Smart Automation</span>
              <span className="text-lineStrong">/</span>
              <span>Interactive prototype</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Synthetic demo data — not government records</span>
              <span className="text-lineStrong">/</span>
              <span>State is stored in this browser only</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
