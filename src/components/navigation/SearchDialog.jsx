import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, FileText, Building2, Landmark, ShieldAlert, Fingerprint } from 'lucide-react'
import { Modal } from '../shared/Overlay'
import { useDemoState } from '../../hooks/useDemoState'
import { globalSearch } from '../../utils/selectors'

const GROUP_ICONS = {
  Instruments: FileText,
  Institutions: Building2,
  Banks: Landmark,
  'Integrity findings': ShieldAlert,
  'Evidence fields': Fingerprint,
}

export function SearchDialog({ open, onClose }) {
  const [query, setQuery] = useState('')
  const state = useDemoState()
  const navigate = useNavigate()
  const groups = globalSearch(state, query)
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)

  const go = (href) => {
    onClose()
    setQuery('')
    navigate(href)
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose()
        setQuery('')
      }}
      title="Search the registry"
      description="Instrument IDs, FDR references, institutions, banks, findings, and evidence fields."
      eyebrow="Global search"
      size="lg"
    >
      <div className="relative -mt-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-copper"
        />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && groups[0]?.items[0]) go(groups[0].items[0].href)
          }}
          placeholder="Try DNB-847291, Deccan, FND-2026-001…"
          className="input h-11 border-lineStrong pl-9 pr-3 text-sm"
          aria-label="Search query"
        />
      </div>

      <div className="mt-4 min-h-[220px]">
        {query.trim().length < 2 && (
          <div className="grid gap-3 border border-line bg-paper/40 p-4 sm:grid-cols-2">
            <div>
              <div className="overline mb-2">Suggested searches</div>
              <div className="flex flex-wrap gap-1.5">
                {['DNB-847291', 'FDR-2026-017', 'Deccan', 'FND-2026-001', 'SLB-54I902'].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="border border-line bg-raised px-2 py-1 font-mono text-[10.5px] text-inkSoft transition-colors hover:border-copper/50 hover:text-copper-dark"
                    >
                      {suggestion}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <div className="overline mb-2">Search covers</div>
              <ul className="space-y-1 text-[11px] text-muted">
                <li>Instrument IDs and FDR reference numbers</li>
                <li>Institutions, banks, and branches</li>
                <li>Finding IDs and evidence field values</li>
              </ul>
            </div>
          </div>
        )}
        {query.trim().length >= 2 && total === 0 && (
          <div className="flex h-[220px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center border border-line bg-paper text-muted">
              <Search size={17} />
            </div>
            <div className="font-display text-lg text-ink">No matches</div>
            <p className="mt-1 max-w-xs text-[11px] text-muted">
              Nothing in the synthetic dataset matches “{query}”. Try a reference number or
              institution name.
            </p>
          </div>
        )}
        {total > 0 && (
          <div className="space-y-4">
            {groups.map((group) => {
              const Icon = GROUP_ICONS[group.group] ?? Search
              return (
                <div key={group.group}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Icon size={12} className="text-muted" />
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {group.group}
                    </span>
                    <span className="h-px flex-1 bg-line" />
                    <span className="font-mono text-[9.5px] text-muted">{group.items.length}</span>
                  </div>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => go(item.href)}
                          className="flex w-full items-center justify-between gap-4 border-b border-line/60 px-1.5 py-2 text-left transition-colors hover:bg-copper/[0.04]"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-medium text-ink">
                              {item.title}
                            </div>
                            <div className="truncate text-[10.5px] text-muted">{item.subtitle}</div>
                          </div>
                          <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted">
                            {item.meta}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <CornerDownLeft size={11} /> Enter to open the first result
        </span>
        <span className="font-mono">Esc to close · Ctrl / ⌘ + K</span>
      </div>
    </Modal>
  )
}
