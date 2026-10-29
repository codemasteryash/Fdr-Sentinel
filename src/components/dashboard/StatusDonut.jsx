import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from '../shared/ChartTooltip'

export function StatusDonut({ data, total }) {
  const visible = [...data].sort((a, b) => b.value - a.value)
  return (
    <section className="panel flex h-full flex-col">
      <div className="border-b border-line px-4 py-3">
        <div className="overline">Lifecycle distribution</div>
        <h2 className="font-display text-lg text-ink">Where instruments stand</h2>
      </div>
      <div className="flex flex-1 flex-col items-center gap-2 px-4 py-4 sm:flex-row">
        <div className="relative h-[190px] w-full max-w-[220px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visible}
                dataKey="value"
                nameKey="name"
                innerRadius={56}
                outerRadius={82}
                paddingAngle={1.2}
                stroke="#FAF8F3"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
              >
                {visible.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} FDRs`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[30px] leading-none text-ink">{total}</span>
            <span className="mt-1 text-[8.5px] uppercase tracking-[0.16em] text-muted">Records</span>
          </div>
        </div>
        <div className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1 lg:grid-cols-2">
          {visible.map((entry) => (
            <div key={entry.key} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: entry.color }} />
              <span className="min-w-0 flex-1 truncate text-[10px] text-muted">{entry.name}</span>
              <span className="font-mono text-[10px] text-inkSoft">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
