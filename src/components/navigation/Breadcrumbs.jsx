import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useDemoState } from '../../hooks/useDemoState'
import { ROUTE_LABELS } from '../../app/navConfig'

export function Breadcrumbs() {
  const location = useLocation()
  const state = useDemoState()
  const parts = location.pathname.split('/').filter(Boolean)
  if (!parts.length) return null

  const root = parts[0]
  const crumbs = [{ label: ROUTE_LABELS[root] ?? root, to: `/${root}` }]

  if (parts[1]) {
    if (root === 'instruments' && parts[1] === 'new') {
      crumbs.push({ label: 'Register FDR', to: null })
    } else if (root === 'instruments') {
      const instrument = state.instruments.find((item) => item.id === parts[1])
      crumbs.push({ label: instrument?.reference ?? parts[1], to: null })
    } else if (root === 'institutions') {
      const institution = state.institutions.find((item) => item.id === parts[1])
      crumbs.push({ label: institution?.shortName ?? parts[1], to: null })
    } else if (['verification', 'lifecycle'].includes(root)) {
      crumbs.push({ label: parts[1], to: null })
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
      <Link
        to="/dashboard"
        className="hidden text-[10px] font-medium uppercase tracking-[0.1em] text-muted transition-colors hover:text-copper sm:block"
      >
        Sentinel
      </Link>
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight size={11} className="shrink-0 text-lineStrong" />
          {crumb.to && index < crumbs.length - 1 ? (
            <Link
              to={crumb.to}
              className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-muted transition-colors hover:text-copper"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-ink">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
