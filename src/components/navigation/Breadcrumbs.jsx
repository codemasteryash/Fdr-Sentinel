import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useDemoState } from '../../hooks/useDemoState'
import { ROUTE_LABELS } from '../../app/navConfig'

export function Breadcrumbs() {
  const location = useLocation()
  const state = useDemoState()
  const parts = location.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'app' || !parts[1]) return null

  const workspace = parts[1]
  const crumbs = [
    {
      label: ROUTE_LABELS[workspace] ?? workspace,
      to:
        workspace === 'institutions'
          ? '/app/governance?view=institutions'
          : `/app/${workspace}`,
    },
  ]

  if (parts[2]) {
    if (workspace === 'instruments' && parts[2] === 'new') {
      crumbs.push({ label: 'Register FDR', to: null })
    } else if (workspace === 'instruments') {
      const instrument = state.instruments.find((item) => item.id === parts[2])
      crumbs.push({ label: instrument?.reference ?? parts[2], to: null })
    } else if (workspace === 'institutions') {
      const institution = state.institutions.find((item) => item.id === parts[2])
      crumbs.push({ label: institution?.shortName ?? parts[2], to: null })
    } else if (workspace === 'lifecycle') {
      const instrument = state.instruments.find((item) => item.id === parts[2])
      crumbs.push({ label: instrument?.reference ?? parts[2], to: null })
    } else if (workspace === 'verification') {
      const instrument = state.instruments.find((item) => item.id === parts[2])
      crumbs.push({ label: instrument?.reference ?? parts[2], to: null })
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
      <Link
        to="/app/overview"
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
