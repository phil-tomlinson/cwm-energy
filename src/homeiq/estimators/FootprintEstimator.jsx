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
        className="text-[13px] text-glacier hover:text-glacier underline decoration-dashed underline-offset-2 tabular-nums"
      >
        {open ? '▲ Hide estimator' : `▼ ${buttonLabel}`}
      </button>

      {open && (
        <div className="mt-3 border border-hairline bg-snowfield p-4 rounded-[10px]">
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-[13px] font-medium text-scree mb-1">
                Length <span className="text-scree tabular-nums">({lUnit})</span>
              </label>
              <input
                type="number" min="1" max="700" step={units === 'imperial' ? 1 : 0.5}
                value={length}
                onChange={e => setLength(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-hairline border border-hairline text-basalt px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-glacier placeholder-scree"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-scree mb-1">
                Width <span className="text-scree tabular-nums">({lUnit})</span>
              </label>
              <input
                type="number" min="1" max="700" step={units === 'imperial' ? 1 : 0.5}
                value={width}
                onChange={e => setWidth(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-hairline border border-hairline text-basalt px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-glacier placeholder-scree"
              />
            </div>
          </div>
          <p className="text-[13px] text-scree mb-3 tabular-nums">
            {units === 'imperial'
              ? "No tape measure? Pace it out — one big stride ≈ 3 ft."
              : "No tape measure? Pace it out — one big step ≈ 1 m."}
          </p>

          {result && (
            <>
              {result.rows?.length > 0 && (
                <div className="mb-3 divide-y divide-hairline">
                  {result.rows.map((row, i) => (
                    <div key={i} className="flex justify-between py-1 text-[13px]">
                      <span className="text-scree">{row.label}</span>
                      <span className={`tabular-nums font-medium ${row.highlight ? 'text-glacier' : 'text-scree'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-glacier tabular-nums">
                  Estimated: {result.value.toFixed(1)} m²
                </span>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 text-[13px] font-bold bg-glacier text-on-glacier hover:opacity-90 transition-colors rounded-full"
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
