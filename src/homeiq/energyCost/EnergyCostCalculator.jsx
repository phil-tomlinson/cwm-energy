'use client'
import { useMemo, useState } from 'react'
import { fuelTypes } from '@/data/energyPrices'
import { BILL_UNITS, toGJ, computeEffectiveRate } from '@/calculations/energyCost'

const inputClass = 'w-full bg-snowfield border border-hairline text-basalt px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-glacier focus:border-transparent placeholder-scree'

const FUEL_OPTIONS = fuelTypes.filter(f => BILL_UNITS[f.value])

function emptyBill() { return { consumption: '', totalCost: '' } }

export default function EnergyCostCalculator({ onApply, defaultFuel = 'naturalGas', className = '' }) {
  const [fuelType, setFuelType] = useState(defaultFuel)
  const [unit, setUnit]         = useState(BILL_UNITS[defaultFuel][0].value)
  const [bills, setBills]       = useState([emptyBill(), emptyBill()])

  const units = BILL_UNITS[fuelType]

  function changeFuel(next) {
    setFuelType(next)
    setUnit(BILL_UNITS[next][0].value)
  }

  function updateBill(i, key, val) {
    setBills(prev => prev.map((b, j) => (j === i ? { ...b, [key]: val } : b)))
  }
  function addBill()      { setBills(prev => [...prev, emptyBill()]) }
  function removeBill(i)  { setBills(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : prev) }

  const result = useMemo(() => {
    const points = bills
      .map(b => ({ consumptionGJ: toGJ(parseFloat(b.consumption), unit), totalCost: parseFloat(b.totalCost) }))
      .filter(p => Number.isFinite(p.consumptionGJ) && p.consumptionGJ > 0 && Number.isFinite(p.totalCost))
    return points.length ? computeEffectiveRate(points) : null
  }, [bills, unit])

  const hasResult = result && result.ratePerGJ != null
  const confidence = result?.method === 'regression'
    ? (result.rSquared > 0.97 ? 'High' : result.rSquared > 0.85 ? 'Moderate' : 'Low')
    : null

  return (
    <div className={className}>
      {/* Fuel + unit */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[13px] font-medium text-scree mb-1">Fuel</label>
          <select value={fuelType} onChange={e => changeFuel(e.target.value)} className={inputClass}>
            {FUEL_OPTIONS.map(f => <option key={f.value} value={f.value} className="bg-snowfield">{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-scree mb-1">Consumption unit</label>
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            disabled={units.length === 1}
            className={`${inputClass} ${units.length === 1 ? 'opacity-60' : ''}`}
          >
            {units.map(u => <option key={u.value} value={u.value} className="bg-snowfield">{u.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bill rows */}
      <p className="text-[13px] text-scree mb-2">
        Enter the <strong className="text-basalt">total amount</strong> and{' '}
        <strong className="text-basalt">{units.find(u => u.value === unit)?.label} used</strong> from
        2–3 recent bills (more spread between low and high months gives a better split).
      </p>
      <div className="space-y-2 mb-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
          <span className="text-[13px] tabular-nums text-scree">Usage ({units.find(u => u.value === unit)?.label})</span>
          <span className="text-[13px] tabular-nums text-scree">Total bill ($)</span>
          <span className="w-7" />
        </div>
        {bills.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input type="number" min="0" inputMode="decimal" value={b.consumption}
              onChange={e => updateBill(i, 'consumption', e.target.value)} placeholder="0" className={inputClass} />
            <input type="number" min="0" inputMode="decimal" value={b.totalCost}
              onChange={e => updateBill(i, 'totalCost', e.target.value)} placeholder="0.00" className={inputClass} />
            <button type="button" onClick={() => removeBill(i)} disabled={bills.length <= 1}
              className="w-7 h-9 flex items-center justify-center text-scree hover:text-fireweed disabled:opacity-30 disabled:hover:text-scree"
              title="Remove bill">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addBill}
        className="tabular-nums text-[13px] text-scree hover:text-glacier transition-colors mb-5">
        + Add another bill
      </button>

      {/* Result */}
      {hasResult ? (
        <div className="border border-glacier bg-glacier/5 p-4 rounded-[10px]">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="tabular-nums text-[13px] text-scree mb-1">Your effective rate</p>
              <p className="tabular-nums text-2xl font-black text-glacier">${result.ratePerGJ.toFixed(2)}<span className="text-sm font-normal text-scree">/GJ</span></p>
              <p className="text-[13px] text-scree mt-0.5">marginal — what upgrade savings use</p>
            </div>
            <div>
              <p className="tabular-nums text-[13px] text-scree mb-1">Fixed service</p>
              <p className="tabular-nums text-2xl font-black text-basalt">${result.fixedMonthly.toFixed(0)}<span className="text-sm font-normal text-scree">/mo</span></p>
              <p className="text-[13px] text-scree mt-0.5">you pay this regardless of usage</p>
            </div>
          </div>

          {result.method === 'regression' ? (
            <p className="text-[13px] text-scree leading-relaxed border-t border-glacier pt-2.5">
              Split from {result.n} bills (confidence: <strong className="text-basalt">{confidence}</strong>). Your
              all-in average is ${result.allInAvgPerGJ.toFixed(2)}/GJ — but only the{' '}
              <strong className="text-basalt">${result.ratePerGJ.toFixed(2)}/GJ marginal rate</strong> is saved by
              using less, since the ${result.fixedMonthly.toFixed(0)}/mo service charge stays on every bill.
            </p>
          ) : (
            <p className="text-[13px] text-scree leading-relaxed border-t border-glacier pt-2.5">
              From one bill we can only show the <strong className="text-basalt">all-in average</strong> (${result.ratePerGJ.toFixed(2)}/GJ).
              Add a second bill with different usage to separate your true per-GJ rate from the fixed service charge.
            </p>
          )}

          {onApply && (
            <button type="button"
              onClick={() => onApply({ fuelType, ratePerGJ: result.ratePerGJ, fixedMonthly: result.fixedMonthly })}
              className="mt-3 w-full bg-glacier text-on-glacier font-black text-[13px] px-4 py-2.5 hover:opacity-90 transition-colors rounded-full">
              Use these rates in my estimate
            </button>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-scree tabular-nums border border-hairline bg-snowfield-raised p-4 text-center rounded-[10px]">
          Enter at least one bill to see your effective cost.
        </p>
      )}
    </div>
  )
}
