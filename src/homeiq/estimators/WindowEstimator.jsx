import { useState } from 'react'

const WINDOW_TYPES = [
  { key: 'small',  label: 'Small',      desc: 'Bathroom, utility, basement', area: 0.5 },
  { key: 'medium', label: 'Medium',     desc: 'Bedroom, office',              area: 1.0 },
  { key: 'large',  label: 'Large',      desc: 'Living room, dining',          area: 1.8 },
  { key: 'patio',  label: 'Patio door', desc: 'Sliding or French door',       area: 3.5 },
]

function floorLabels(storeys, basementType) {
  const floors = []
  if (['full_heated', 'full_unheated', 'partial', 'crawlspace'].includes(basementType)) {
    floors.push('Basement')
  }
  floors.push('Main floor')
  if (storeys === 1.5) floors.push('Upper loft')
  if (storeys >= 2)    floors.push('2nd floor')
  if (storeys === 2.5) floors.push('Attic / loft')
  if (storeys >= 3)    floors.push('3rd floor')
  return floors
}

function emptyFloorCounts(floors) {
  return Object.fromEntries(floors.map(f => [f, { small: 0, medium: 0, large: 0, patio: 0 }]))
}

function totalArea(counts) {
  return Object.values(counts).reduce((sum, floor) => {
    return sum + WINDOW_TYPES.reduce((s, t) => s + (floor[t.key] ?? 0) * t.area, 0)
  }, 0)
}

export default function WindowEstimator({ storeys, basementType, onApply }) {
  const [open, setOpen] = useState(false)
  const floors = floorLabels(storeys, basementType)
  const [counts, setCounts] = useState(() => emptyFloorCounts(floors))

  const estimated = totalArea(counts)

  function setCount(floor, type, value) {
    const n = Math.max(0, parseInt(value) || 0)
    setCounts(prev => ({ ...prev, [floor]: { ...prev[floor], [type]: n } }))
  }

  function handleApply() {
    onApply(Math.round(estimated * 10) / 10)
    setOpen(false)
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-emerald-400 hover:text-emerald-300 underline decoration-dashed underline-offset-2 font-mono"
      >
        {open ? '▲ Hide estimator' : '▼ Estimate from window counts'}
      </button>

      {open && (
        <div className="mt-3 border border-zinc-600 bg-zinc-800 p-4">
          <p className="text-xs text-zinc-500 mb-3 font-mono">
            Count each window by approximate size. Areas include the frame.
          </p>

          {/* Size legend */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {WINDOW_TYPES.map(t => (
              <div key={t.key} className="text-center">
                <div className="text-xs font-bold text-zinc-300">{t.label}</div>
                <div className="text-xs text-zinc-500 font-mono">{t.area} m²</div>
                <div className="text-xs text-zinc-600 italic hidden sm:block">{t.desc}</div>
              </div>
            ))}
          </div>

          {/* Per-floor counts */}
          <div className="space-y-3">
            {floors.map(floor => (
              <div key={floor}>
                <div className="text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wide">{floor}</div>
                <div className="grid grid-cols-4 gap-2">
                  {WINDOW_TYPES.map(t => (
                    <input
                      key={t.key}
                      type="number"
                      min="0"
                      max="30"
                      value={counts[floor][t.key]}
                      onChange={e => setCount(floor, t.key, e.target.value)}
                      className="w-full bg-zinc-700 border border-zinc-600 text-zinc-100 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      aria-label={`${floor} ${t.label} windows`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Total + apply */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                Total: {estimated.toFixed(1)} m²
              </span>
              {estimated === 0 && (
                <span className="text-xs text-zinc-600 ml-2">(enter counts above)</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleApply}
              disabled={estimated === 0}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
            >
              Use this estimate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
