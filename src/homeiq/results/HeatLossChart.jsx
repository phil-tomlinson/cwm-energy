import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COMPONENT_LABELS = {
  ceiling:       'Ceiling / Attic',
  walls:         'Walls',
  windows:       'Windows',
  doors:         'Doors',
  basementWalls: 'Basement walls',
  basementFloor: 'Basement floor',
  airLeakage:    'Air leakage',
}

// One hue: the bars are already ranked, so length carries the message.
const COLORS = ['var(--glacier)']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-snowfield border border-hairline px-3 py-2 text-[13px] tabular-nums">
      <p className="text-basalt">{d.name}</p>
      <p className="text-glacier font-bold">{d.gjPerYear} GJ/yr ({d.pct}%)</p>
    </div>
  )
}

export default function HeatLossChart({ components, totalHeatLossGJ }) {
  const data = Object.entries(components)
    .filter(([, v]) => v > 0.1)
    .map(([key, value]) => ({
      name:      COMPONENT_LABELS[key] ?? key,
      gjPerYear: Number(value.toFixed(1)),
      pct:       Math.round((value / totalHeatLossGJ) * 100),
    }))
    .sort((a, b) => b.gjPerYear - a.gjPerYear)

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
        <XAxis
          type="number"
          unit=" GJ"
          tick={{ fontSize: 12, fill: 'var(--scree)' }}
          axisLine={{ stroke: 'var(--hairline)' }}
          tickLine={{ stroke: 'var(--hairline)' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          interval={0}
          tick={{ fontSize: 13, fill: 'var(--basalt)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--hairline)', fillOpacity: 0.4 }} />
        <Bar dataKey="gjPerYear" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
