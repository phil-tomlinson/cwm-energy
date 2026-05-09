import { useState } from 'react'
import { displayLength, inputLength, lengthUnit } from '../../utils/units'

export default function FootprintEstimator({ calculate, onApply, buttonLabel = 'Estimate from dimensions', units = 'metric' }) {
  const [open, setOpen]     = useState(false)
  const [length, setLength] = useState('')
  const [width, setWidth]   = useState('')

  const lDisplay = parseFloat(length) || 0
  const wDisplay = parseFloat(width)  || 0
  const l = inputLength(lDisplay, units)
  const w = inputLength(wDisplay, units)
  const result = (l > 0 && w > 0) ? calculate(l, w) : null
  const lUnit = lengthUnit(units)
  const placeholder = units === 'imperial' ? 'e.g. 40' : 'e.g. 12'

  function handleApply() {
    if (result) {
      onApply(Math.round(result.value * 10) / 10)
      setOpen(false)
    }
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-emerald-400 hover:text-emerald-300 underline decoration-dashed underline-offset-2 font-mono"
      >
        {open ? '▲ Hide estimator' : `▼ ${buttonLabel}`}
      </button>

      {open && (
        <div className="mt-3 border border-zinc-600 bg-zinc-800 p-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Length <span className="text-zinc-600 font-mono">({lUnit})</span>
              </label>
              <input
                type="number" min="1" max="700" step={units === 'imperial' ? 1 : 0.5}
                value={length}
                onChange={e => setLength(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Width <span className="text-zinc-600 font-mono">({lUnit})</span>
              </label>
              <input
                type="number" min="1" max="700" step={units === 'imperial' ? 1 : 0.5}
                value={width}
                onChange={e => setWidth(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-zinc-600"
              />
            </div>
          </div>
          <p className="text-xs text-zinc-600 mb-3 font-mono">
            {units === 'imperial'
              ? "No tape measure? Pace it out — one big stride ≈ 3 ft."
              : "No tape measure? Pace it out — one big step ≈ 1 m."}
          </p>

          {result && (
            <>
              {result.rows?.length > 0 && (
                <div className="mb-3 divide-y divide-zinc-700">
                  {result.rows.map((row, i) => (
                    <div key={i} className="flex justify-between py-1 text-xs">
                      <span className="text-zinc-500">{row.label}</span>
                      <span className={`font-mono font-medium ${row.highlight ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  Estimated: {result.value.toFixed(1)} m²
                </span>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-400 text-zinc-950 hover:bg-emerald-300 transition-colors"
                >
                  Use this estimate
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
