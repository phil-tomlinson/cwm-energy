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

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46']

export default function HeatLossChart({ components, totalHeatLossGJ }) {
  const data = Object.entries(components)
    .filter(([, v]) => v > 0.1)
    .map(([key, value]) => ({
      name:    COMPONENT_LABELS[key] ?? key,
      gjPerYear: Number(value.toFixed(1)),
      pct:     Math.round((value / totalHeatLossGJ) * 100),
    }))
    .sort((a, b) => b.gjPerYear - a.gjPerYear)

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
          <XAxis type="number" unit=" GJ" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name, props) => [
              `${value} GJ/yr (${props.payload.pct}%)`,
              'Heat loss',
            ]}
          />
          <Bar dataKey="gjPerYear" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
