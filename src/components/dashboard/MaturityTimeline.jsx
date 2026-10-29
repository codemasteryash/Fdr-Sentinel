import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCompactCurrency } from '../../utils/format'
import { ChartTooltip } from '../shared/ChartTooltip'

export function MaturityTimeline({ buckets }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0)
  const exposure = buckets.reduce((sum, bucket) => sum + bucket.amount, 0)
  return (
    <section className="panel flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <div className="overline">Maturity outlook · next 8 weeks</div>
          <h2 className="font-display text-lg text-ink">Upcoming maturity events</h2>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl leading-none text-ink">{total}</div>
          <div className="text-[9.5px] text-muted">{formatCompactCurrency(exposure)} exposure</div>
        </div>
      </div>
      <div className="h-[220px] flex-1 px-2 pb-2 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="#E6E1D6" vertical={false} strokeDasharray="2 3" />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: '#DAD4C7' }}
              tickLine={false}
              interval={0}
              tick={{ fontSize: 9.5 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9.5 }}
              width={38}
            />
            <Tooltip
              cursor={{ fill: 'rgba(168,92,54,0.06)' }}
              content={
                <ChartTooltip
                  valueFormatter={(value) => `${value} FDR${value === 1 ? '' : 's'}`}
                  labelFormatter={(label) => `Week bucket · ${label}`}
                />
              }
            />
            <Bar dataKey="count" name="Maturities" fill="#A85C36" maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[9.5px] text-muted">
        <span>Derived from maturity dates and current date</span>
        <span className="font-mono">90/60/30-day windows</span>
      </div>
    </section>
  )
}
