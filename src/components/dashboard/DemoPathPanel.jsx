import { Link } from 'react-router-dom'
import { ArrowUpRight, PlayCircle } from 'lucide-react'
import { DEMO_PATH } from '../../data/scenarios'

export function DemoPathPanel() {
  return (
    <section className="border border-forest/20 bg-forest-deep text-paper">
      <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-copper">
            Five-minute judging path
          </div>
          <h2 className="mt-0.5 font-display text-lg">See the differentiators first</h2>
        </div>
        <PlayCircle size={17} className="mt-0.5 text-copper" />
      </div>
      <ol className="px-4 py-3">
        {DEMO_PATH.map((item, index) => (
          <li key={item.route} className="flex gap-2.5 border-b border-white/[0.06] py-1.5 last:border-0">
            <span className="mt-0.5 font-mono text-[9px] text-copper">
              {String(index + 1).padStart(2, '0')}
            </span>
            <Link
              to={item.route}
              className="group flex flex-1 items-center justify-between gap-2 text-[10.5px] leading-snug text-[#D4DED6] transition-colors hover:text-white"
            >
              {item.label}
              <ArrowUpRight
                size={11}
                className="shrink-0 text-[#7E9385] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-copper"
              />
            </Link>
          </li>
        ))}
      </ol>
      <div className="border-t border-white/10 px-4 py-2.5">
        <Link
          to="/app/demo"
          className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-copper transition-colors hover:text-[#E6B99A]"
        >
          Run guided scenarios <ArrowUpRight size={11} />
        </Link>
      </div>
    </section>
  )
}
