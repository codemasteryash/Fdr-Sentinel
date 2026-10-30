import { Link, useSearchParams } from 'react-router-dom'
import { Building2, FileBarChart2, ScrollText } from 'lucide-react'
import { getFindingStats } from '../services/findingService'
import { useDemoState } from '../hooks/useDemoState'
import Audit from './Audit'
import Institutions from './Institutions'
import Reports from './Reports'

const VIEWS = [
  {
    id: 'audit',
    label: 'Audit trail',
    description: 'Append-only local history',
    icon: ScrollText,
  },
  {
    id: 'institutions',
    label: 'Institutions',
    description: 'Relationships and oversight',
    icon: Building2,
  },
  {
    id: 'reports',
    label: 'Reports & analytics',
    description: 'Read-only portfolio view',
    icon: FileBarChart2,
  },
]

const VIEW_COMPONENTS = {
  audit: Audit,
  institutions: Institutions,
  reports: Reports,
}

export default function Governance() {
  const state = useDemoState()
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('view')
  const active = VIEW_COMPONENTS[requested] ? requested : 'audit'
  const ActiveView = VIEW_COMPONENTS[active]
  const findingStats = getFindingStats(state)

  return (
    <div>
      <div className="mb-5 border-y border-line bg-raised">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <div className="min-w-[150px]">
            <div className="overline mb-0.5">Oversight workspace</div>
            <div className="font-display text-[17px] leading-tight text-ink">
              Governance &amp; Reports
            </div>
          </div>
          <nav aria-label="Governance sections" className="flex flex-1 flex-wrap gap-1">
            {VIEWS.map((view) => {
              const Icon = view.icon
              const selected = view.id === active
              return (
                <Link
                  key={view.id}
                  to={
                    view.id === 'audit'
                      ? '/app/governance'
                      : `/app/governance?view=${view.id}`
                  }
                  aria-current={selected ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[9.5px] font-medium transition-colors ${
                    selected
                      ? 'border-forest bg-forest text-paper'
                      : 'border-line bg-paper text-inkSoft hover:border-lineStrong hover:text-ink'
                  }`}
                >
                  <Icon size={11} />
                  {view.label}
                </Link>
              )
            })}
          </nav>
          <div className="inline-flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-muted">
            <span className={findingStats.unreviewed ? 'text-warning' : 'text-success'}>
              {findingStats.unreviewed}
            </span>
            findings awaiting review
          </div>
        </div>
        <div className="border-t border-line px-4 py-1.5 text-[8.5px] text-muted">
          {VIEWS.find((view) => view.id === active)?.description} · Synthetic data only · Actions are
          simulated and appended to local state.
        </div>
      </div>

      <ActiveView />
    </div>
  )
}
