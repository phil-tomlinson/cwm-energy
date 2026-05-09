import { useState } from 'react'
import { displayLength, inputLength, lengthUnit } from '../../utils/units'

/**
 * Generic area estimator based on building footprint (length × width).
 *
 * Props:
 *   calculate(l, w) → { value: number, rows?: [{ label, value, highlight? }] }
 *   onApply(value)  — called when user clicks "Use this estimate"
 *   buttonLabel     — toggle button text (default: "Estimate from dimensions")
 */
export default function FootprintEstimator({ calculate, onApply, buttonLabel = 'Estimate from dimensions', units = 'metric' }) {
  const [open, setOpen]     = useState(false)
  const [length, setLength] = useState('')
  const [width, setWidth]   = useState('')

  // Convert user input (in display units) back to metres for the formula
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
        className="text-xs text-emerald-700 hover:text-emerald-900 underline decoration-dashed underline-offset-2"
      >
        {open ? '▲ Hide estimator' : `▼ ${buttonLabel}`}
      </button>

      {open && (
        <div className="mt-3 border border-emerald-200 rounded-lg bg-emerald-50 p-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Length <span className="text-gray-400">({lUnit})</span>
              </label>
              <input
                type="number" min="1" max="700" step={units === 'imperial' ? 1 : 0.5}
                value={length}
                onChange={e => setLength(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Width <span className="text-gray-400">({lUnit})</span>
              </label>
              <input
                type="number" min="1" max="700" step={units === 'imperial' ? 1 : 0.5}
                value={width}
                onChange={e => setWidth(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {units === 'imperial'
              ? "Don't have a tape measure? Pace it out — one big stride ≈ 3 ft."
              : "Don't have a tape measure? Pace it out — one big step ≈ 1 metre."}
          </p>

          {result && (
            <>
              {result.rows?.length > 0 && (
                <div className="mb-3 divide-y divide-emerald-100">
                  {result.rows.map((row, i) => (
                    <div key={i} className="flex justify-between py-1 text-xs">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={`font-medium ${row.highlight ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-emerald-800">
                  Estimated: {result.value.toFixed(1)} m²
                </span>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
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
