'use client'
import { useState, useRef, useCallback } from 'react'
import { WEATHER_PROXY, CARBON_PROXY, maintTotal, fmt } from './evData'
import DiveDeeper from '@/components/DiveDeeper'

// Human-readable label for grid carbon intensity
function gridLabel(gCO2kWh) {
  if (gCO2kWh <  80) return { text: 'Very clean grid',        hint: 'mostly hydro or nuclear' }
  if (gCO2kWh < 200) return { text: 'Clean grid',             hint: 'significant renewables' }
  if (gCO2kWh < 350) return { text: 'Average grid',           hint: 'mixed fossil + clean sources' }
  if (gCO2kWh < 500) return { text: 'Carbon-heavy grid',      hint: 'substantial fossil fuel' }
  return                    { text: 'Very carbon-heavy grid',  hint: 'mostly fossil fuel' }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CO2_PER_FUEL_L = 2.31           // kg CO₂e/L gasoline (IPCC AR5)
const COLOR_A        = '#818cf8'      // indigo-400
const COLOR_B        = '#fb923c'      // orange-400

// ── Vehicle lifespan defaults (km) ────────────────────────────────────────────
// ICE / Hybrid: S&P Global Mobility 2025 reports avg U.S. scrappage age of 12.8 yrs at
//   ~24k km/yr ≈ 306k km. DesRosiers data suggests similar for Canada. CAA: modern
//   vehicles regularly exceed 300k km with proper maintenance.
// PHEV: limited by the ICE powertrain; treated the same as conventional ICE.
// EV (NMC default): Geotab real-world battery study of 22,700+ EVs finds ~80% capacity
//   at ~200–250k km. Degradation is logarithmic — fast in the first ~50k km, then
//   plateaus. Hyundai/Kia warrant 70% at 10 yrs/200k km (warranty FLOOR, not end of life).
//   Practical "end of life" (70% capacity) for NMC batteries is ~300–400k km.
//   LFP-equipped vehicles (Tesla SR, BYD, CATL): Battery Performance Index 2025 shows
//   85%+ capacity retention at 8–9 years; conservative practical estimate 500k+ km.
//   NRCan data doesn't specify battery chemistry — default is NMC-conservative; users
//   with known-LFP vehicles should raise this to 500k–800k km.
export const LIFESPAN_KM = {
  ice:  300000,
  phev: 300000,
  ev:   350000,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Manufacturing CO₂ estimates — GREET 2023 (Argonne National Lab)
// NMC811 ≈ 84 kg CO₂e/kWh · LFP ≈ 52 kg CO₂e/kWh; we use ~75 kg/kWh as blended default
// since NRCan data doesn't specify chemistry.
function estimateMfg(type, batteryKwh) {
  const glider = 8000  // kg CO₂e, generic vehicle glider
  if (type === 'ev') {
    const b = (parseFloat(batteryKwh) || 60) * 75
    return { total: Math.round(glider + b), battery: Math.round(b) }
  }
  if (type === 'phev') {
    const b = (parseFloat(batteryKwh) || 15) * 75
    return { total: Math.round(glider + 500 + b), battery: Math.round(b) }
  }
  return { total: 8500, battery: 0 }  // ice
}

// Proxy service-schedule vehicle ID for each powertrain type
function maintVid(type) {
  return type === 'ev' ? 'ioniq5' : type === 'phev' ? 'rav4h' : 'rav4'
}

function calcAnnualCost(v, annKm, effElec, gasPrice) {
  if (!v) return 0
  if (v.type === 'ev')   return annKm * (v.effKwh100km / 100) * effElec
  if (v.type === 'phev') return annKm * 0.7 * (v.effKwh100km / 100) * effElec
                               + annKm * 0.3 * (v.fuelL100km  / 100) * gasPrice
  return annKm * (v.fuelL100km / 100) * gasPrice
}

function calcCO2PerKm(v, effGrid) {
  if (!v) return 0
  if (v.type === 'ev' || v.type === 'phev')
    return (effGrid * (v.effKwh100km ?? 0)) / 100000
  return ((v.fuelL100km ?? 0) * CO2_PER_FUEL_L) / 100
}

function defaultFed(type) {
  return type === 'ev' ? 5000 : type === 'phev' ? 2500 : 0
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ num, title }) {
  return (
    <div className="flex items-center gap-3 pt-8 pb-4 border-b border-zinc-800">
      <span className="font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-400/30 px-2 py-0.5 whitespace-nowrap">
        {num}
      </span>
      <h2 className="text-base font-bold text-zinc-100 tracking-tight">{title}</h2>
    </div>
  )
}

// ── NRCan cascading vehicle picker ─────────────────────────────────────────────
// Defined outside EVCompare so React doesn't remount on parent re-renders.
function VehiclePicker({ slot, accentColor, onSelect }) {
  const curY = new Date().getFullYear()
  const yrs  = Array.from({ length: curY - 2011 }, (_, i) => curY - i)

  const [year,  setYear]  = useState('')
  const [makes, setMakes] = useState([])
  const [make,  setMake]  = useState('')
  const [mods,  setMods]  = useState([])
  const [mod,   setMod]   = useState('')
  const [vars,  setVars]  = useState([])
  const [sel,   setSel]   = useState(null)
  const [load,  setLoad]  = useState('')
  const [err,   setErr]   = useState('')

  const sc = 'w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors disabled:opacity-40'
  const TYPE_LABEL = { ev: 'Battery Electric (BEV)', phev: 'Plug-in Hybrid (PHEV)', ice: 'Gas / Hybrid' }

  async function onYr(y) {
    setYear(y); setMake(''); setMod(''); setVars([]); setSel(null); setMakes([]); setMods([])
    if (!y) return
    setLoad('m'); setErr('')
    try {
      const d = await fetch(`/api/nrcan?action=makes&year=${y}`).then(r => r.json())
      setMakes(Array.isArray(d) ? d : [])
    } catch { setErr('Could not load makes. Try again.') }
    setLoad('')
  }

  async function onMk(m) {
    setMake(m); setMod(''); setVars([]); setSel(null); setMods([])
    if (!m) return
    setLoad('mo'); setErr('')
    try {
      const d = await fetch(`/api/nrcan?action=models&year=${year}&make=${encodeURIComponent(m)}`).then(r => r.json())
      setMods(Array.isArray(d) ? d : [])
    } catch { setErr('Could not load models. Try again.') }
    setLoad('')
  }

  async function onMo(mo) {
    setMod(mo); setVars([]); setSel(null)
    if (!mo) return
    setLoad('v'); setErr('')
    try {
      const d = await fetch(`/api/nrcan?action=vehicles&year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(mo)}`).then(r => r.json())
      const vs = Array.isArray(d) ? d : []
      setVars(vs)
      if (vs.length === 1) { setSel(vs[0]); onSelect(vs[0]) }
    } catch { setErr('Could not load variants. Try again.') }
    setLoad('')
  }

  return (
    <div>
      {err && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2 mb-3">{err}</p>
      )}

      {/* Year / Make / Model */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Year</label>
          <select value={year} onChange={e => onYr(e.target.value)} className={sc}>
            <option value="">Select</option>
            {yrs.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Make</label>
          <select value={make} onChange={e => onMk(e.target.value)} className={sc} disabled={!year || load === 'm'}>
            <option value="">{load === 'm' ? 'Loading…' : 'Select'}</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Model</label>
          <select value={mod} onChange={e => onMo(e.target.value)} className={sc} disabled={!make || load === 'mo'}>
            <option value="">{load === 'mo' ? 'Loading…' : 'Select'}</option>
            {mods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {load === 'v' && <p className="text-xs text-zinc-500 font-mono mb-2">Loading variants…</p>}

      {/* Variant radio list */}
      {vars.length > 1 && (
        <div className="space-y-1 mb-3">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Variant</label>
          {vars.map((v, i) => {
            const lbl = [
              TYPE_LABEL[v.type] ?? v.type,
              v.transmission,
              v.effKwh100km != null ? `${fmt(v.effKwh100km, 1)} kWh/100km` : null,
              v.fuelL100km   != null ? `${fmt(v.fuelL100km,  1)} L/100km`   : null,
            ].filter(Boolean).join(' · ')
            return (
              <label key={i} className={`flex items-start gap-2 border p-2.5 cursor-pointer transition-colors ${sel === v ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 hover:border-zinc-500'}`}>
                <input type="radio" name={`var-${slot}`} checked={sel === v}
                  onChange={() => { setSel(v); onSelect(v) }}
                  className="mt-0.5 accent-emerald-400" />
                <span className="text-xs text-zinc-300 leading-relaxed">{lbl}</span>
              </label>
            )
          })}
        </div>
      )}

      {/* Selection badge */}
      {sel && (
        <div className="border rounded-sm p-3"
          style={{ borderColor: `${accentColor}55`, background: `${accentColor}08` }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: accentColor }}>
            Selected — NRCan data
          </p>
          <p className="text-sm font-bold text-zinc-100">{year} {make} {mod}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {TYPE_LABEL[sel.type] ?? sel.type}
            {sel.effKwh100km != null ? ` · ${fmt(sel.effKwh100km, 1)} kWh/100km` : ''}
            {sel.fuelL100km   != null ? ` · ${fmt(sel.fuelL100km,  1)} L/100km`   : ''}
            {sel.evRangeKm    != null ? ` · ${sel.evRangeKm} km range`            : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Vehicle input panel (picker + price / mileage / lifespan inputs) ───────────
function VehicleInputPanel({
  label, accentColor,
  vehicle, onSel,
  price, setPrice,
  startKm, setStartKm,
  lifespan, setLifespan,
  batt, setBatt,
  fed, setFed,
  prov, setProv,
  annualKm, applyRebates,
}) {
  const ic = 'w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors'
  const remainingKm  = Math.max(0, lifespan - startKm)
  const remainingYrs = annualKm > 0 ? remainingKm / annualKm : 0

  return (
    <div className="flex-1 border border-zinc-700 bg-zinc-900/40 p-5 min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: accentColor }}>
        {label}
      </p>

      <VehiclePicker slot={label} accentColor={accentColor} onSelect={onSel} />

      {vehicle && (
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          {/* Price + starting mileage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                Purchase price ($CAD)
              </label>
              <input type="number" value={price} step={500} min={5000} max={300000}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                className={ic} />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                Starting mileage (km)
              </label>
              <input type="number" value={startKm} step={1000} min={0}
                max={Math.max(0, lifespan - 1000)}
                onChange={e => setStartKm(Math.max(0, parseFloat(e.target.value) || 0))}
                className={ic} />
            </div>
          </div>

          {/* Lifespan */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
              Est. lifespan (km)
              <span className="normal-case opacity-60 ml-1">
                {vehicle.type === 'ev'
                  ? '— NMC default; LFP vehicles (BYD, Tesla SR) consider 500k–800k km'
                  : '— S&P Global Mobility / CAA Canada'}
              </span>
            </label>
            <input type="number" value={lifespan} step={25000} min={50000} max={1500000}
              onChange={e => setLifespan(parseFloat(e.target.value) || 300000)}
              className={ic} />
          </div>

          {/* Battery size (EVs / PHEVs) */}
          {(vehicle.type === 'ev' || vehicle.type === 'phev') && (
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                Battery size (kWh)
                <span className="normal-case opacity-60 ml-1">— for manufacturing CO₂ estimate</span>
              </label>
              <input type="number" value={batt} step={0.1} min={5} max={200}
                placeholder="e.g. 77.4 — leave blank for class average"
                onChange={e => setBatt(e.target.value)}
                className={ic} />
            </div>
          )}

          {/* Rebate inputs (shown when toggle is on) */}
          {applyRebates && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                  Federal rebate ($)
                </label>
                {vehicle.type === 'ice' ? (
                  <span className="text-zinc-600 font-mono text-sm">—</span>
                ) : (
                  <input type="number" value={fed} step={500} min={0} max={10000}
                    onChange={e => setFed(parseFloat(e.target.value) || 0)}
                    className={ic} />
                )}
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                  Provincial rebate ($)
                </label>
                <input type="number" value={prov} step={500} min={0} max={15000}
                  onChange={e => setProv(parseFloat(e.target.value) || 0)}
                  className={ic} />
              </div>
            </div>
          )}

          {/* Remaining life summary */}
          <div className="bg-zinc-950 border border-zinc-800 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              Remaining life estimate
            </p>
            <p className="font-mono text-lg font-semibold" style={{ color: accentColor }}>
              {fmt(remainingKm, 0)} km
            </p>
            <p className="font-mono text-[11px] text-zinc-500 mt-0.5">
              ≈ {fmt(remainingYrs, 1)} years at {fmt(annualKm, 0)} km/yr
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main compare component ─────────────────────────────────────────────────────
export default function EVCompare() {
  // ── Shared inputs ────────────────────────────────────────────────────────
  const [city,      setCity]      = useState('Calgary, CA')
  const [annualKm,  setAnnualKm]  = useState(20000)
  const [elecPrice, setElecPrice] = useState(0.134)
  const [gasPrice,  setGasPrice]  = useState(1.50)
  const [solarPct,  setSolarPct]  = useState(0)
  const [applyRebates, setApplyRebates] = useState(false)

  // ── Vehicle A ────────────────────────────────────────────────────────────
  const [vA,        setVA]        = useState(null)
  const [priceA,    setPriceA]    = useState(35000)
  const [startKmA,  setStartKmA]  = useState(0)
  const [lifespanA, setLifespanA] = useState(300000)
  const [battA,     setBattA]     = useState('')
  const [fedA,      setFedA]      = useState(0)
  const [provA,     setProvA]     = useState(0)

  // ── Vehicle B ────────────────────────────────────────────────────────────
  const [vB,        setVB]        = useState(null)
  const [priceB,    setPriceB]    = useState(35000)
  const [startKmB,  setStartKmB]  = useState(0)
  const [lifespanB, setLifespanB] = useState(300000)
  const [battB,     setBattB]     = useState('')
  const [fedB,      setFedB]      = useState(0)
  const [provB,     setProvB]     = useState(0)

  // ── Results ──────────────────────────────────────────────────────────────
  const [status,   setStatus]   = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [results,  setResults]  = useState(null)

  const tcoRef      = useRef(null)
  const co2Ref      = useRef(null)
  const chartIs     = useRef({})

  function destroyCharts() {
    Object.values(chartIs.current).forEach(c => c?.destroy())
    chartIs.current = {}
  }

  function handleSelectA(v) {
    setVA(v)
    setLifespanA(LIFESPAN_KM[v.type] ?? 300000)
    setFedA(defaultFed(v.type))
  }
  function handleSelectB(v) {
    setVB(v)
    setLifespanB(LIFESPAN_KM[v.type] ?? 300000)
    setFedB(defaultFed(v.type))
  }

  // ── Draw charts ───────────────────────────────────────────────────────────
  async function drawCharts(data) {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    destroyCharts()

    const {
      vehicleA, vehicleB,
      effPA, effPB,
      costA, costB,
      co2kmA, co2kmB,
      mfgA, mfgB,
      annKm,
      remKmA, remKmB,
    } = data

    const TICK = '#71717a', GRID = '#27272a', FONT = 'ui-monospace, monospace'
    const tip = {
      backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1,
      titleColor: '#e4e4e7', bodyColor: '#a1a1aa',
      titleFont: { family: FONT, weight: '600', size: 12 },
      bodyFont:  { family: FONT, size: 11 }, padding: 10,
    }

    const MAX   = 10
    const years = Array.from({ length: MAX + 1 }, (_, i) => i === 0 ? '0' : `Yr ${i}`)

    const annMaintA = maintTotal(maintVid(vehicleA.type), annKm)
    const annMaintB = maintTotal(maintVid(vehicleB.type), annKm)
    const nameA = `${vehicleA.make} ${vehicleA.model}`
    const nameB = `${vehicleB.make} ${vehicleB.model}`

    // null = vehicle reached end of life; line stops
    const cumCostA = years.map((_, i) =>
      i * annKm > remKmA ? null : effPA + i * (costA + annMaintA))
    const cumCostB = years.map((_, i) =>
      i * annKm > remKmB ? null : effPB + i * (costB + annMaintB))
    const cumCO2A  = years.map((_, i) =>
      i * annKm > remKmA ? null : (mfgA.total + co2kmA * i * annKm) / 1000)
    const cumCO2B  = years.map((_, i) =>
      i * annKm > remKmB ? null : (mfgB.total + co2kmB * i * annKm) / 1000)

    const baseX = { grid: { color: GRID }, ticks: { color: TICK, font: { family: FONT, size: 11 } } }
    const baseY = { grid: { color: GRID }, ticks: { color: TICK, font: { family: FONT, size: 11 } } }
    const legend = { labels: { color: TICK, font: { family: FONT, size: 11 }, boxWidth: 12, padding: 12 } }
    const titleStyle = (text) => ({ display: true, text, color: TICK, font: { family: FONT, size: 11 } })
    const titleCb = items => {
      const yr = parseInt(items[0].label.replace('Yr ', ''))
      return isNaN(yr) ? 'Purchase' : `Year ${yr} · ${fmt(yr * annKm, 0)} km driven`
    }

    if (tcoRef.current) {
      chartIs.current.tco = new Chart(tcoRef.current, {
        type: 'line',
        data: {
          labels: years,
          datasets: [
            { label: nameA, data: cumCostA, borderColor: COLOR_A, borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.1, spanGaps: false },
            { label: nameB, data: cumCostB, borderColor: COLOR_B, borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.1, spanGaps: false },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend,
            tooltip: {
              ...tip,
              callbacks: {
                title: titleCb,
                label: ctx => ctx.parsed.y == null
                  ? ` ${ctx.dataset.label}: reached end of life`
                  : ` ${ctx.dataset.label}: $${fmt(ctx.parsed.y, 0)}`,
              },
            },
          },
          scales: {
            x: baseX,
            y: { ...baseY, ticks: { ...baseY.ticks, callback: v => `$${(v / 1000).toFixed(0)}k` }, title: titleStyle('cumulative cost ($)') },
          },
        },
      })
    }

    if (co2Ref.current) {
      chartIs.current.co2 = new Chart(co2Ref.current, {
        type: 'line',
        data: {
          labels: years,
          datasets: [
            { label: nameA, data: cumCO2A, borderColor: COLOR_A, borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.1, spanGaps: false },
            { label: nameB, data: cumCO2B, borderColor: COLOR_B, borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.1, spanGaps: false },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend,
            tooltip: {
              ...tip,
              callbacks: {
                title: titleCb,
                label: ctx => ctx.parsed.y == null
                  ? ` ${ctx.dataset.label}: reached end of life`
                  : ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} t CO₂e`,
              },
            },
          },
          scales: {
            x: baseX,
            y: { ...baseY, ticks: { ...baseY.ticks, callback: v => `${v.toFixed(0)} t` }, title: titleStyle('cumulative CO₂e (tonnes)') },
          },
        },
      })
    }
  }

  // ── Run comparison ─────────────────────────────────────────────────────────
  const runComparison = useCallback(async () => {
    if (!vA || !vB || !city.trim()) return
    setStatus('loading'); setResults(null); destroyCharts()

    try {
      const wRes = await fetch(`${WEATHER_PROXY}/?q=${encodeURIComponent(city)}`)
      if (!wRes.ok) throw new Error(`City not found: "${city}". Try adding a country code — e.g. "Calgary, CA".`)
      const w = await wRes.json()

      const cRes = await fetch(`${CARBON_PROXY}/?lat=${w.coord.lat}&lon=${w.coord.lon}`)
      const c    = await cRes.json()
      const grid = c.carbonIntensity

      const effGrid = grid * (1 - solarPct / 100)
      const effElec = elecPrice * (1 - solarPct / 100)

      const costA  = calcAnnualCost(vA, annualKm, effElec, gasPrice)
      const costB  = calcAnnualCost(vB, annualKm, effElec, gasPrice)
      const co2kmA = calcCO2PerKm(vA, effGrid)
      const co2kmB = calcCO2PerKm(vB, effGrid)
      const mfgA   = estimateMfg(vA.type, battA)
      const mfgB   = estimateMfg(vB.type, battB)

      const remKmA = Math.max(0, lifespanA - startKmA)
      const remKmB = Math.max(0, lifespanB - startKmB)
      const effPA  = applyRebates ? Math.max(0, priceA - fedA - provA) : priceA
      const effPB  = applyRebates ? Math.max(0, priceB - fedB - provB) : priceB

      // Carbon breakeven — only meaningful when vehicle types differ in kind
      const isElecA = vA.type === 'ev' || vA.type === 'phev'
      const isElecB = vB.type === 'ev' || vB.type === 'phev'
      let breakevenKm = null
      if (isElecA !== isElecB) {
        const [evMfg, gasMfg] = isElecA ? [mfgA, mfgB] : [mfgB, mfgA]
        const [evC2, gasC2]   = isElecA ? [co2kmA, co2kmB] : [co2kmB, co2kmA]
        const diff = evMfg.total - gasMfg.total
        const gain = gasC2 - evC2
        breakevenKm = gain > 0 ? diff / gain : Infinity
      }

      const r = {
        source: 'compare',
        grid, effGrid, effElec, cityName: w.name, country: w.sys.country,
        vehicleA: vA, vehicleB: vB,
        costA, costB, co2kmA, co2kmB, mfgA, mfgB,
        remKmA, remKmB, effPA, effPB,
        breakevenKm, annualKm, solarPct,
      }
      setResults(r)
      setStatus('done')
      try { localStorage.setItem('cwm_ev', JSON.stringify(r)) } catch {}

      setTimeout(() => drawCharts({
        vehicleA: vA, vehicleB: vB,
        effPA, effPB, costA, costB, co2kmA, co2kmB, mfgA, mfgB,
        annKm: annualKm, remKmA, remKmB,
      }), 50)

    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }, [vA, vB, city, annualKm, elecPrice, gasPrice, solarPct,
      startKmA, startKmB, lifespanA, lifespanB, battA, battB,
      priceA, priceB, fedA, fedB, provA, provB, applyRebates])

  // ── Render ─────────────────────────────────────────────────────────────────
  const r = results

  return (
    <div className="space-y-0">
      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
        Choose any two vehicles from the NRCan fuel consumption database and compare their true cost of
        ownership, carbon footprint, and lifetime economics. Works for new or used vehicles — enter a
        starting mileage to see how much life is left in each.
      </p>

      {/* ── Inputs ────────────────────────────────────────────────────── */}
      <div className="border border-zinc-700 bg-zinc-800/40 p-5 space-y-5">

        {/* City + run */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
            Your city
          </label>
          <div className="flex gap-2">
            <input
              type="text" value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runComparison()}
              className="flex-1 bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors"
              placeholder="Calgary, CA"
            />
            <button
              onClick={runComparison}
              disabled={!vA || !vB || status === 'loading'}
              className="bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-widest px-5 py-2 hover:bg-emerald-300 transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {status === 'loading' ? 'Loading…' : 'Compare →'}
            </button>
          </div>
          {(!vA || !vB) && (
            <p className="text-[11px] text-zinc-600 mt-1.5">
              Select both vehicles below to enable the comparison.
            </p>
          )}
        </div>

        {/* Driving + rates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Annual driving', unit: 'km/year', val: annualKm,  set: setAnnualKm,  step: 1000,  min: 1000,  max: 100000 },
            { label: 'Electricity',    unit: '$/kWh',   val: elecPrice, set: setElecPrice, step: 0.005, min: 0.05,  max: 0.50   },
            { label: 'Gas price',      unit: '$/L',     val: gasPrice,  set: setGasPrice,  step: 0.05,  min: 0.80,  max: 3.00   },
          ].map(({ label, unit, val, set, step, min, max }) => (
            <div key={label}>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                {label} <span className="normal-case opacity-70">({unit})</span>
              </label>
              <input
                type="number" value={val} step={step} min={min} max={max}
                onChange={e => set(parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Solar slider */}
        <div className="border-t border-zinc-700 pt-4">
          <div className="flex items-center gap-4">
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 whitespace-nowrap min-w-[200px]">
              Home solar <span className="normal-case opacity-70">(% from panels)</span>
            </label>
            <input type="range" min={0} max={100} step={5} value={solarPct}
              onChange={e => setSolarPct(Number(e.target.value))}
              className="flex-1 accent-emerald-400" />
            <span className="font-mono text-emerald-400 text-sm font-semibold min-w-[36px] text-right">
              {solarPct}%
            </span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">
            Solar charging is treated as 0 gCO₂e/kWh and $0/kWh.
          </p>
        </div>

        {/* Rebates toggle */}
        <div className="border-t border-zinc-700 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setApplyRebates(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${applyRebates ? 'bg-emerald-400' : 'bg-zinc-600'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${applyRebates ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 select-none">
              Apply government rebates (EVAP + provincial)
            </span>
          </label>
          {applyRebates && (
            <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
              Federal amounts pre-filled per EVAP (BEV: $5,000 · PHEV: $2,500 · ICE: $0). Edit per your vehicle's eligibility.
              Verify at <a href="https://tc.gc.ca/ev" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">tc.gc.ca/ev</a>.
            </p>
          )}
        </div>

        {/* Vehicle A / B panels */}
        <div className="border-t border-zinc-700 pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <VehicleInputPanel
              label="Vehicle A"  accentColor={COLOR_A}
              vehicle={vA}       onSel={handleSelectA}
              price={priceA}     setPrice={setPriceA}
              startKm={startKmA} setStartKm={setStartKmA}
              lifespan={lifespanA} setLifespan={setLifespanA}
              batt={battA}       setBatt={setBattA}
              fed={fedA}         setFed={setFedA}
              prov={provA}       setProv={setProvA}
              annualKm={annualKm} applyRebates={applyRebates}
            />
            <VehicleInputPanel
              label="Vehicle B"  accentColor={COLOR_B}
              vehicle={vB}       onSel={handleSelectB}
              price={priceB}     setPrice={setPriceB}
              startKm={startKmB} setStartKm={setStartKmB}
              lifespan={lifespanB} setLifespan={setLifespanB}
              batt={battB}       setBatt={setBattB}
              fed={fedB}         setFed={setFedB}
              prov={provB}       setProv={setProvB}
              annualKm={annualKm} applyRebates={applyRebates}
            />
          </div>
        </div>
      </div>

      {/* Status */}
      {status === 'loading' && (
        <div className="flex items-center gap-3 py-10 justify-center text-zinc-500 text-sm font-mono">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
          Fetching grid data for {city}…
        </div>
      )}
      {status === 'error' && (
        <div className="border border-red-400/30 bg-red-400/5 text-red-400 text-sm p-4 mt-4 font-mono">
          {errorMsg}
        </div>
      )}

      {/* Results */}
      {status === 'done' && r && (() => {
        const { vehicleA, vehicleB, costA, costB, co2kmA, co2kmB, mfgA, mfgB, remKmA, remKmB, effPA, effPB, breakevenKm, annualKm: annKm } = r
        const annMaintA = maintTotal(maintVid(vehicleA.type), annKm)
        const annMaintB = maintTotal(maintVid(vehicleB.type), annKm)
        const run10A    = costA * 10 + maintTotal(maintVid(vehicleA.type), annKm * 10)
        const run10B    = costB * 10 + maintTotal(maintVid(vehicleB.type), annKm * 10)

        const pairs = [
          { v: vehicleA, color: COLOR_A, label: 'Vehicle A', cost: costA, maint: annMaintA, run10: run10A, co2km: co2kmA, mfg: mfgA, remKm: remKmA, effP: effPA },
          { v: vehicleB, color: COLOR_B, label: 'Vehicle B', cost: costB, maint: annMaintB, run10: run10B, co2km: co2kmB, mfg: mfgB, remKm: remKmB, effP: effPB },
        ]
        const minCost = Math.min(costA, costB)
        const minCO2  = Math.min(co2kmA, co2kmB)

        return (
          <>
            {/* Grid banner */}
            {(() => {
              const gl = gridLabel(r.grid)
              return (
                <div className="bg-emerald-400/5 border border-emerald-400/20 px-4 py-3 mt-4 mb-2">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-zinc-400 mb-1">
                    <span><span className="text-emerald-400 font-semibold">{r.cityName}, {r.country}</span></span>
                    <span><span className="text-emerald-400 font-semibold">{gl.text}</span> — {gl.hint}</span>
                    {r.solarPct > 0 && <span className="text-emerald-400">↗ {r.solarPct}% solar applied</span>}
                    {applyRebates && <span className="text-emerald-400">↗ Rebates applied</span>}
                  </div>
                  <p className="text-[11px] text-zinc-600 font-mono">
                    Grid intensity: {Math.round(r.grid)} gCO₂e/kWh
                    {r.solarPct > 0 && ` · EV effective: ${Math.round(r.effGrid)} gCO₂e/kWh`}
                    {' '}— <span className="italic">grams of CO₂ equivalent per kilowatt-hour of electricity used</span>
                  </p>
                </div>
              )
            })()}

            {/* ══ 01 — ECONOMICS ══ */}
            <SectionHeader num="01 — Economics" title="What does it cost to own and run each vehicle?" />

            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-5 mb-2">
              Annual fuel &amp; energy costs
            </p>
            <div className="grid grid-cols-2 gap-4">
              {pairs.map(({ v, color, label, cost, maint, run10, remKm, effP }) => {
                const isLowest = cost === minCost
                return (
                  <div key={label} className={`relative border p-4 ${isLowest ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
                    {isLowest && (
                      <span className="absolute top-0 right-0 bg-emerald-400 text-zinc-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                        Lower cost
                      </span>
                    )}
                    <div className="h-0.5 w-full mb-3" style={{ background: color }} />
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                    <p className="text-sm font-bold text-zinc-100 mb-3 leading-snug">{v.make} {v.model}</p>
                    <div className="space-y-2 text-xs">
                      {[
                        { k: 'Annual fuel / energy',  val: `$${fmt(cost, 0)}/yr`,  hi: isLowest },
                        { k: 'Annual maintenance',    val: `$${fmt(maint, 0)}/yr`, hi: false },
                        { k: '10-yr fuel + maint.',   val: `$${fmt(run10, 0)}`,    hi: false, sep: true },
                        { k: `Purchase price${applyRebates ? ' (after rebates)' : ''}`, val: `$${fmt(effP, 0)}`, hi: false },
                        { k: 'Remaining life',        val: `${fmt(remKm, 0)} km`,  hi: false, sep: true },
                        { k: '≈ years remaining',     val: `${fmt(remKm / annKm, 1)} yrs`, hi: false },
                      ].map(({ k, val, hi, sep }) => (
                        <div key={k} className={`flex justify-between items-baseline ${sep ? 'border-t border-zinc-800 pt-2 mt-2' : ''}`}>
                          <span className="text-zinc-500">{k}</span>
                          <span className={`font-mono font-semibold ${hi ? 'text-emerald-400' : 'text-zinc-200'}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Annual savings callout (if types differ meaningfully) */}
            {(costA !== costB) && (
              <div className="border border-zinc-700 bg-zinc-800/40 p-4 mt-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Annual fuel difference</p>
                <p className="font-mono text-2xl font-semibold text-emerald-400">
                  ${fmt(Math.abs(costA - costB), 0)}/yr
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {costA < costB
                    ? `${vehicleA.make} ${vehicleA.model} saves $${fmt(costB - costA, 0)} per year in fuel and energy costs.`
                    : `${vehicleB.make} ${vehicleB.model} saves $${fmt(costA - costB, 0)} per year in fuel and energy costs.`}
                </p>
              </div>
            )}

            {/* TCO chart */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1 mt-8">
              Total cost of ownership
            </p>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">Cumulative cost over 10 years</h3>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Purchase price + annual fuel + annual maintenance compound over time. Lines end when a vehicle reaches its
              estimated end-of-life.{applyRebates && ' Rebates applied to purchase price.'}
            </p>
            <div className="bg-zinc-900 border border-zinc-700 p-4 mb-8" style={{ height: 340 }}>
              <canvas ref={tcoRef} />
            </div>

            {/* ══ 02 — EMISSIONS ══ */}
            <SectionHeader num="02 — Emissions" title="What's the carbon story?" />

            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-5 mb-2">
              Driving emissions on your grid
            </p>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Live carbon intensity for {r.cityName} ({Math.round(r.grid)} gCO₂e/kWh).
              EV emissions are entirely a function of your grid — Quebec and Alberta get very different answers.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {pairs.map(({ v, color, label, co2km, mfg, remKm }) => {
                const isLowest = co2km === minCO2
                return (
                  <div key={label} className={`border p-4 ${isLowest ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
                    <div className="h-0.5 w-full mb-3" style={{ background: color }} />
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
                    <p className="text-sm font-bold text-zinc-100 mb-3 leading-snug">{v.make} {v.model}</p>

                    {/* Emissions bar */}
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                      Driving emissions
                    </p>
                    <p className="font-mono text-3xl font-semibold leading-none mb-0.5"
                      style={{ color: isLowest ? '#34d399' : '#e4e4e7' }}>
                      {fmt(co2km * 1000, 1)}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500 mb-3">gCO₂e / km</p>

                    <div className="space-y-2 text-xs border-t border-zinc-800 pt-3">
                      {[
                        { k: 'Annual driving CO₂',   val: `${fmt(co2km * annKm / 1000, 2)} t/yr` },
                        { k: 'Manufacturing CO₂',    val: `${fmt(mfg.total / 1000, 1)} t` },
                        ...(mfg.battery > 0 ? [{ k: '↳ of which battery', val: `${fmt(mfg.battery / 1000, 1)} t` }] : []),
                      ].map(({ k, val }) => (
                        <div key={k} className="flex justify-between items-baseline">
                          <span className="text-zinc-500">{k}</span>
                          <span className="font-mono text-zinc-300">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Carbon breakeven */}
            {breakevenKm !== null && (
              <div className="mt-5 border border-zinc-700 bg-zinc-800/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  When does the EV become better for the planet?
                </p>
                <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                  Building a battery takes energy, so an EV starts with a higher carbon footprint than a gas car.
                  Every kilometre driven on cleaner electricity chips away at that gap.
                  The distance below is when the EV comes out ahead, lifetime total.
                </p>
                {!isFinite(breakevenKm) || breakevenKm <= 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 p-3 leading-relaxed">
                    On your current grid, the EV produces more CO₂ per km than the gas vehicle — no carbon breakeven point exists at this grid intensity.
                  </p>
                ) : breakevenKm > 500000 ? (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-3">
                    Breakeven at {fmt(Math.round(breakevenKm / 1000), 0)}k km — beyond a typical vehicle lifespan at current grid intensity.
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-2xl font-semibold text-emerald-400">
                      {fmt(Math.round(breakevenKm / 1000) * 1000, 0)}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500 mb-2">km to carbon breakeven</p>
                    <div className="bg-emerald-400/10 border border-emerald-400/20 p-3 text-xs text-zinc-400 leading-relaxed">
                      At <span className="text-emerald-400 font-semibold">{fmt(annKm, 0)} km/yr</span> →{' '}
                      <span className="text-emerald-400 font-semibold">{fmt(breakevenKm / annKm, 1)} years</span>{' '}
                      to recover the EV's higher manufacturing carbon debt through cleaner driving.
                    </div>
                  </>
                )}
                <DiveDeeper label="How is this calculated?">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    The breakeven point compares the manufacturing CO₂ gap between the two vehicles against the per-kilometre emissions savings during driving.
                  </p>
                  <p className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-2 leading-relaxed">
                    Breakeven km = (EV mfg CO₂ − Gas car mfg CO₂) ÷ (Gas car g/km − EV g/km)
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    If the EV emits more per km than the gas car (possible on a very carbon-heavy grid), no breakeven exists — the grid is too dirty for an emissions advantage at that moment.
                    Manufacturing CO₂ estimates use GREET 2023 (Argonne National Lab): ~75 kg CO₂e/kWh blended battery average, plus ~8,000 kg for the vehicle glider.
                  </p>
                </DiveDeeper>
              </div>
            )}

            {/* Lifetime CO₂ chart */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1 mt-8">
              Lifetime emissions
            </p>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">Cumulative CO₂e over 10 years</h3>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Manufacturing carbon (at purchase) + driving emissions accumulate year by year.
              Where a lower-emission vehicle's line crosses below the other is the carbon breakeven point.
            </p>
            <div className="bg-zinc-900 border border-zinc-700 p-4 mb-6" style={{ height: 340 }}>
              <canvas ref={co2Ref} />
            </div>

            {/* Lifespan data sources */}
            <DiveDeeper label="Where do the lifespan defaults come from?">
              <ul className="text-[11px] text-zinc-500 space-y-2 leading-relaxed">
                <li>
                  <span className="text-zinc-300 font-semibold">Gas / Hybrid ({fmt(LIFESPAN_KM.ice, 0)} km):</span>{' '}
                  S&P Global Mobility 2025 reports an average U.S. scrappage age of 12.8 years; at ~24,000 km/yr that's ~306,000 km.
                  CAA Canada confirms modern, well-maintained vehicles regularly exceed 300,000 km.
                </li>
                <li>
                  <span className="text-zinc-300 font-semibold">PHEV ({fmt(LIFESPAN_KM.phev, 0)} km):</span>{' '}
                  Limited by the ICE powertrain; treated the same as conventional gas.
                </li>
                <li>
                  <span className="text-zinc-300 font-semibold">EV — NMC default ({fmt(LIFESPAN_KM.ev, 0)} km):</span>{' '}
                  Geotab's real-world battery study (22,700+ EVs) shows ~80% capacity remaining at 200–250k km.
                  Hyundai/Kia warrant 70% at 10 yrs/200k km — a warranty floor, not end of life.
                  Practical end of life (~70% capacity) for NMC batteries is ~300–400k km.
                </li>
                <li>
                  <span className="text-zinc-300 font-semibold">LFP batteries (Tesla SR, BYD, some GM):</span>{' '}
                  Battery Performance Index 2025 shows 85%+ capacity at 8–9 years; conservative practical estimate 500k+ km.
                  If you know your EV uses LFP, raise the lifespan slider to 500k–800k km.
                </li>
              </ul>
              <p className="text-[10px] text-zinc-600 mt-2 pt-2 border-t border-zinc-800">
                All lifespan values are editable in the inputs above.
                EV motors and inverters typically outlast the battery; a battery swap can extend the effective lifespan significantly.
              </p>
            </DiveDeeper>
          </>
        )
      })()}
    </div>
  )
}
