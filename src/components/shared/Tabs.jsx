export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex overflow-x-auto border-b border-line ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`tab ${active === tab.id ? 'tab-active' : ''}`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`ml-2 inline-flex min-w-5 items-center justify-center border px-1 py-0.5 font-mono text-[9.5px] ${
                active === tab.id
                  ? 'border-copper/30 bg-copper/[0.07] text-copper-dark'
                  : 'border-line bg-paper text-muted'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex border border-line bg-paper/60 p-0.5 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
            value === option.value
              ? 'bg-raised text-ink shadow-panel'
              : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
