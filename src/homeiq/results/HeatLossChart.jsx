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

const COLORS = ['#34d399', '#10b981', '#059669', '#6ee7b7', '#a7f3d0', '#047857', '#065f46']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs font-mono">
      <p className="text-zinc-300">{d.name}</p>
      <p className="text-emerald-400 font-bold">{d.gjPerYear} GJ/yr ({d.pct}%)</p>
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
          tick={{ fontSize: 11, fill: '#71717a' }}
          axisLine={{ stroke: '#3f3f46' }}
          tickLine={{ stroke: '#3f3f46' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          interval={0}
          tick={{ fontSize: 12, fill: '#a1a1aa' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="gjPerYear" radius={[0, 2, 2, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
