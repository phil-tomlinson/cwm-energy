'use client'
import { useMemo, useState } from 'react'
import { fuelTypes } from '@/data/energyPrices'
import { BILL_UNITS, toGJ, computeEffectiveRate } from '@/calculations/energyCost'

const inputClass = 'w-full bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder-zinc-600'

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
          <label className="block text-xs font-medium text-zinc-400 mb-1">Fuel</label>
          <select value={fuelType} onChange={e => changeFuel(e.target.value)} className={inputClass}>
            {FUEL_OPTIONS.map(f => <option key={f.value} value={f.value} className="bg-zinc-800">{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Consumption unit</label>
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            disabled={units.length === 1}
            className={`${inputClass} ${units.length === 1 ? 'opacity-60' : ''}`}
          >
            {units.map(u => <option key={u.value} value={u.value} className="bg-zinc-800">{u.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bill rows */}
      <p className="text-xs text-zinc-400 mb-2">
        Enter the <strong className="text-zinc-300">total amount</strong> and{' '}
        <strong className="text-zinc-300">{units.find(u => u.value === unit)?.label} used</strong> from
        2–3 recent bills (more spread between low and high months gives a better split).
      </p>
      <div className="space-y-2 mb-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Usage ({units.find(u => u.value === unit)?.label})</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total bill ($)</span>
          <span className="w-7" />
        </div>
        {bills.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input type="number" min="0" inputMode="decimal" value={b.consumption}
              onChange={e => updateBill(i, 'consumption', e.target.value)} placeholder="0" className={inputClass} />
            <input type="number" min="0" inputMode="decimal" value={b.totalCost}
              onChange={e => updateBill(i, 'totalCost', e.target.value)} placeholder="0.00" className={inputClass} />
            <button type="button" onClick={() => removeBill(i)} disabled={bills.length <= 1}
              className="w-7 h-9 flex items-center justify-center text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-500"
              title="Remove bill">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addBill}
        className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition-colors mb-5">
        + Add another bill
      </button>

      {/* Result */}
      {hasResult ? (
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Your effective rate</p>
              <p className="font-mono text-2xl font-black text-emerald-400">${result.ratePerGJ.toFixed(2)}<span className="text-sm font-normal text-zinc-400">/GJ</span></p>
              <p className="text-[10px] text-zinc-500 mt-0.5">marginal — what upgrade savings use</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-1">Fixed service</p>
              <p className="font-mono text-2xl font-black text-zinc-200">${result.fixedMonthly.toFixed(0)}<span className="text-sm font-normal text-zinc-400">/mo</span></p>
              <p className="text-[10px] text-zinc-500 mt-0.5">you pay this regardless of usage</p>
            </div>
          </div>

          {result.method === 'regression' ? (
            <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-emerald-400/20 pt-2.5">
              Split from {result.n} bills (confidence: <strong className="text-zinc-300">{confidence}</strong>). Your
              all-in average is ${result.allInAvgPerGJ.toFixed(2)}/GJ — but only the{' '}
              <strong className="text-zinc-300">${result.ratePerGJ.toFixed(2)}/GJ marginal rate</strong> is saved by
              using less, since the ${result.fixedMonthly.toFixed(0)}/mo service charge stays on every bill.
            </p>
          ) : (
            <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-emerald-400/20 pt-2.5">
              From one bill we can only show the <strong className="text-zinc-300">all-in average</strong> (${result.ratePerGJ.toFixed(2)}/GJ).
              Add a second bill with different usage to separate your true per-GJ rate from the fixed service charge.
            </p>
          )}

          {onApply && (
            <button type="button"
              onClick={() => onApply({ fuelType, ratePerGJ: result.ratePerGJ, fixedMonthly: result.fixedMonthly })}
              className="mt-3 w-full bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-widest px-4 py-2.5 hover:bg-emerald-300 transition-colors">
              Use these rates in my estimate →
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 font-mono border border-zinc-800 bg-zinc-900/40 p-4 text-center">
          Enter at least one bill to see your effective cost.
        </p>
      )}
    </div>
  )
}
