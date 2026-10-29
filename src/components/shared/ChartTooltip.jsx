export function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-lineStrong bg-raised px-3 py-2 shadow-lift">
      <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      {payload.map((entry) => (
        <div key={`${entry.name}-${entry.value}`} className="flex items-center gap-2 text-[11px]">
          <span
            className="h-1.5 w-1.5 shrink-0"
            style={{ backgroundColor: entry.color ?? entry.payload?.color ?? '#1D3B2F' }}
          />
          <span className="text-muted">{entry.name}</span>
          <span className="ml-auto font-mono font-medium text-ink">
            {valueFormatter ? valueFormatter(entry.value, entry) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
