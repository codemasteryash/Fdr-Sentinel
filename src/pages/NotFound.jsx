import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Compass, Search } from 'lucide-react'

const LINKS = [
  { label: 'Dashboard', to: '/dashboard', detail: 'Institutional scale and urgent actions' },
  { label: 'FDR Registry', to: '/instruments', detail: 'Search and filter all seeded instruments' },
  { label: 'Integrity Intelligence', to: '/integrity', detail: 'Explainable cross-record findings' },
  { label: 'Demo Scenarios', to: '/demo-scenarios', detail: 'Six guided judging paths' },
]

export default function NotFound() {
  const location = useLocation()
  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="grid border border-line bg-raised lg:grid-cols-12">
        <div className="border-b border-line p-6 lg:col-span-7 lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-6 bg-copper" />
            <span className="overline text-copper-dark">Route not found</span>
          </div>
          <div className="mt-5 font-display text-[72px] font-medium leading-none tracking-[-0.03em] text-forest/20">
            404
          </div>
          <h1 className="mt-3 font-display text-[30px] leading-tight text-ink">This register entry does not exist.</h1>
          <p className="mt-3 max-w-md text-[12px] leading-relaxed text-muted">
            The route <span className="break-all font-mono text-[11px] text-inkSoft">{location.pathname}</span> is
            not part of the prototype. It may be a mistyped instrument identifier or a page that was not included
            in this demonstration build.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/dashboard" className="btn-dark btn-sm">
              <ArrowLeft size={12} /> Return to dashboard
            </Link>
            <Link to="/instruments" className="btn-secondary btn-sm">
              <Search size={12} /> Search the registry
            </Link>
          </div>
          <div className="mt-8 flex items-start gap-2 border-t border-line pt-4 text-[10px] leading-relaxed text-muted">
            <Compass size={13} className="mt-0.5 shrink-0 text-copper" />
            No external system was contacted. This is a local, deterministic prototype route.
          </div>
        </div>
        <div className="p-6 lg:col-span-5 lg:p-8">
          <div className="overline mb-3">Suggested destinations</div>
          <ul className="divide-y divide-line border-y border-line">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="group flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block text-[11.5px] font-medium text-ink group-hover:text-forest">{link.label}</span>
                    <span className="mt-0.5 block text-[9.5px] text-muted">{link.detail}</span>
                  </span>
                  <ArrowUpRight
                    size={13}
                    className="shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-copper"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 border border-line bg-paper/40 px-3.5 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">Tip</div>
            <p className="mt-1 text-[10px] leading-relaxed text-inkSoft">
              Instrument URLs follow <span className="font-mono">/instruments/FDR-YYYY-NNN</span>. Use global search
              from the top bar to locate a record by reference, institution, bank, or finding.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
