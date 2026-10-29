import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Search, Command } from 'lucide-react'
import { Breadcrumbs } from '../navigation/Breadcrumbs'
import { NotificationsPanel } from '../navigation/NotificationsPanel'
import { RoleMenu } from '../navigation/RoleMenu'
import { SearchDialog } from '../navigation/SearchDialog'

export function Topbar({ onOpenMobile }) {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-raised/95 px-3 backdrop-blur-sm sm:px-5">
        <button
          type="button"
          className="btn-icon lg:hidden"
          onClick={onOpenMobile}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/demo-scenarios"
            className="hidden items-center gap-1.5 border border-copper/25 bg-copper/[0.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-copper-dark transition-colors hover:border-copper/50 xl:flex"
          >
            <span className="h-1 w-1 rounded-full bg-copper" />
            Interactive prototype · Demo data
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-8 w-[210px] items-center gap-2 border border-line bg-paper/60 px-2.5 text-left text-[11px] text-muted transition-colors hover:border-lineStrong hover:bg-paper md:flex xl:w-[260px]"
          >
            <Search size={13} />
            <span className="flex-1">Search registry…</span>
            <span className="inline-flex items-center gap-0.5 border border-line bg-raised px-1 py-0.5 font-mono text-[8.5px]">
              <Command size={8} />K
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="btn-icon md:hidden"
            aria-label="Search"
          >
            <Search size={17} />
          </button>

          <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
          <NotificationsPanel />
          <RoleMenu />
        </div>
      </header>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
