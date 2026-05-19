'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  VEHICLES, VEHICLE_ORDER, SERVICE_ITEMS,
  WEATHER_PROXY, CARBON_PROXY,
  co2PerKm, maintTotal, fmt,
} from './evData'
import DiveDeeper from '@/components/DiveDeeper'
import SaveToPlanBanner from '@/components/SaveToPlanBanner'

// Human-readable label for grid carbon intensity
function gridLabel(gCO2kWh) {
  if (gCO2kWh <  80) return { text: 'Very clean grid',        hint: 'mostly hydro or nuclear' }
  if (gCO2kWh < 200) return { text: 'Clean grid',             hint: 'significant renewables' }
  if (gCO2kWh < 350) return { text: 'Average grid',           hint: 'mixed fossil + clean sources' }
  if (gCO2kWh < 500) return { text: 'Carbon-heavy grid',      hint: 'substantial fossil fuel' }
  return                    { text: 'Very carbon-heavy grid',  hint: 'mostly fossil fuel' }
}

// ── Constants ─────────────────────────────────────────────────────────────
const CUSTOM_COLOR       = '#a78bfa'  // violet-400
const CUSTOM_COLOR_MUTED = 'rgba(167,139,250,0.15)'
const CO2_PER_FUEL_L     = 2.31      // kg CO₂e/L gasoline (IPCC AR5)

// Canada EV Affordability Program (EVAP, effective Feb 2026)
// Replaces iZEV. Non-Canadian-made vehicles: $50k transaction value cap.
const FEDERAL_REBATE_DEFAULT = { ioniq5: 5000, macheelfp: 5000, crv: 0, rav4h: 0, custom: 0 }

// Estimate manufacturing CO₂ for a custom vehicle
function estimateMfgCO2(type, batteryKwh) {
  const glider = 8000 // kg CO₂e — generic ICE glider (GREET 2023)
  if (type === 'ev') {
    const kWh  = parseFloat(batteryKwh) || 60
    return { total: Math.round(glider + kWh * 75), battery: Math.round(kWh * 75) }
  }
  if (type === 'phev') {
    const kWh  = parseFloat(batteryKwh) || 15
    return { total: Math.round(glider + 500 + kWh * 75), battery: Math.round(kWh * 75) }
  }
  if (type === 'hybrid') return { total: 9200, battery: 700 }
  return { total: 8500, battery: 0 }
}

// ── Section header ────────────────────────────────────────────────────────
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

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, accent, color, sub }) {
  return (
    <div className={`border p-4 ${accent ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/60'}`}>
      <p className="text-[10px] uppercase tracking-widest font-mono text-zinc-400 mb-2">{label}</p>
      <p className="font-mono text-2xl font-semibold leading-none mb-1"
        style={{ color: color || (accent ? '#34d399' : '#e4e4e7') }}>
        {value}
      </p>
      {unit && <p className="font-mono text-[11px] text-zinc-400">{unit}</p>}
      {sub  && <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">{sub}</p>}
    </div>
  )
}

// ── Vehicle emission card (right-now grid) ────────────────────────────────
function VehicleEmissionCard({ v, co2km, isWinner, maxCO2, rebateAmount }) {
  const barW   = ((co2km / maxCO2) * 100).toFixed(1)
  const detail = v.type === 'ev' || v.type === 'phev'
    ? `${fmt(v.effKwh100km, 1)} kWh/100km`
    : `${fmt(v.fuelL100km, 1)} L/100km`

  return (
    <div className={`relative border p-4 transition-colors ${isWinner ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: v.color }} />
      {isWinner && (
        <span className="absolute top-3 right-0 bg-emerald-400 text-zinc-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
          Lowest now
        </span>
      )}
      <p className="font-mono text-[9px] uppercase tracking-widest mt-1 mb-1" style={{ color: v.color }}>{v.sub}</p>
      <p className="text-sm font-bold text-zinc-200 mb-3 leading-tight">{v.name}</p>
      <p className="text-[10px] uppercase tracking-widest font-mono text-zinc-400 mb-1">Emissions per km</p>
      <p className="font-mono text-3xl font-semibold leading-none mb-0.5"
        style={{ color: isWinner ? '#34d399' : '#e4e4e7' }}>
        {fmt(co2km * 1000, 1)}
      </p>
      <p className="font-mono text-[11px] text-zinc-400 mb-3">gCO₂e / km</p>
      <div className="h-1 bg-zinc-700 mb-3">
        <div className="h-full transition-all duration-500" style={{ width: `${barW}%`, background: v.color }} />
      </div>
      <p className="text-[11px] text-zinc-400 font-mono">{detail}</p>
      {rebateAmount > 0 && (
        <p className="text-[10px] font-mono text-emerald-400 mt-2">↗ ${fmt(rebateAmount)} rebate applied</p>
      )}
    </div>
  )
}

// ── Annual cost card ──────────────────────────────────────────────────────
function CostCard({ v, annualCost, isLowest, detail, rebateAmount }) {
  return (
    <div className={`border p-4 ${isLowest ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-0.5 h-4" style={{ background: v.color }} />
        <p className="text-xs font-semibold text-zinc-300 leading-tight">{v.name}</p>
      </div>
      <p className="font-mono text-2xl font-semibold mb-0.5"
        style={{ color: isLowest ? '#34d399' : '#e4e4e7' }}>
        ${fmt(annualCost, 0)}
      </p>
      <p className="font-mono text-[11px] text-zinc-400 mb-3">/ year in fuel & energy</p>
      <p className="text-[11px] text-zinc-400 leading-relaxed">{detail}</p>
    </div>
  )
}

// ── Breakeven card ────────────────────────────────────────────────────────
function BreakevenCard({ evV, compV, breakKm, annualKm }) {
  const impossible = !isFinite(breakKm) || breakKm <= 0
  const tooLong    = breakKm > 400000

  return (
    <div className="border border-zinc-700 bg-zinc-800/40 p-4 border-l-2" style={{ borderLeftColor: evV.color }}>
      <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: evV.color }}>{evV.name}</p>
      <p className="text-xs font-semibold text-zinc-300 mb-3 leading-snug">vs {compV.name}</p>
      {impossible ? (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2 leading-relaxed">
          No breakeven — grid may be too carbon-intensive for a driving-emissions advantage.
        </p>
      ) : tooLong ? (
        <>
          <p className="font-mono text-2xl font-semibold text-zinc-300">{fmt(Math.round(breakKm / 1000), 0)}k</p>
          <p className="font-mono text-[11px] text-zinc-400 mb-2">km</p>
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2">Exceeds typical vehicle lifespan.</p>
        </>
      ) : (
        <>
          <p className="font-mono text-2xl font-semibold text-emerald-400">{fmt(Math.round(breakKm / 1000) * 1000, 0)}</p>
          <p className="font-mono text-[11px] text-zinc-400 mb-2">km to breakeven</p>
          <div className="bg-emerald-400/10 border border-emerald-400/20 p-2 text-xs text-zinc-400 leading-relaxed">
            At <span className="text-emerald-400 font-semibold">{fmt(annualKm, 0)} km/yr</span> →{' '}
            <span className="text-emerald-400 font-semibold">{fmt(breakKm / annualKm, 1)} years</span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Maintenance table ─────────────────────────────────────────────────────
function MaintTable({ activeVids, allVehicles, annualKm }) {
  const totalKm  = annualKm * 10
  const vnames   = activeVids.map(vid => allVehicles[vid]?.name ?? vid)
  // For custom vehicle, proxy to closest default for maintenance estimates
  const maintProxy = vid => {
    if (vid !== 'custom') return vid
    const t = allVehicles.custom?.type
    return t === 'ev' ? 'ioniq5' : t === 'hybrid' ? 'rav4h' : 'crv'
  }

  return (
    <div className="overflow-x-auto border border-zinc-700">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-900">
            <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400 min-w-[140px]">Service item</th>
            <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400 min-w-[160px]">Notes</th>
            {activeVids.map((vid, i) => (
              <th key={vid}
                className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-400 min-w-[100px]"
                style={{ borderBottom: `2px solid ${allVehicles[vid]?.color ?? CUSTOM_COLOR}` }}>
                {vnames[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERVICE_ITEMS.map((item, idx) => (
            <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors">
              <td className="p-3 font-semibold text-zinc-300">{item.name}</td>
              <td className="p-3 text-zinc-400">{item.note}</td>
              {activeVids.map(vid => {
                const proxyVid = maintProxy(vid)
                const s        = item.vehicles[proxyVid]
                const isProxy  = vid === 'custom'
                if (!s) return <td key={vid} className="p-3 text-center text-zinc-400 font-mono">—</td>
                const tenYr = (totalKm / s.intervalKm) * s.cost
                return (
                  <td key={vid} className="p-3">
                    <span className="block font-mono text-zinc-200">${fmt(s.cost, 0)}</span>
                    <span className="block font-mono text-[10px] text-zinc-400">every {fmt(s.intervalKm / 1000, 0)}k km</span>
                    <span className="block font-mono text-[10px] text-emerald-400">${fmt(tenYr, 0)} / 10yr</span>
                    {isProxy && <span className="block font-mono text-[9px] text-zinc-400">est.</span>}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-zinc-700 bg-zinc-900">
            <td colSpan={2} className="p-3 font-bold text-zinc-300 text-xs">
              10-year total at {fmt(annualKm, 0)} km/yr
            </td>
            {activeVids.map(vid => (
              <td key={vid} className="p-3 font-mono font-semibold text-zinc-200">
                ${fmt(maintTotal(maintProxy(vid), totalKm), 0)}
                {vid === 'custom' && <span className="block font-mono text-[9px] text-zinc-400">estimated</span>}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="text-[11px] text-zinc-400 p-3 leading-relaxed border-t border-zinc-800">
        Service intervals and costs: CAA 2023 Driving Costs &amp; Consumer Reports Annual Auto Surveys. Canadian market averages.
        EV brake interval reflects ~70% reduction from regenerative braking.
        {activeVids.includes('custom') && ' Custom vehicle maintenance estimated from closest vehicle class.'}
      </p>
    </div>
  )
}

// ── NRCan vehicle search panel ────────────────────────────────────────────
function NrcanSearchPanel({ onAdd, onClose }) {
  const currentYear = new Date().getFullYear()
  // 2012 is when NRCan BEV data starts; conventional data starts at 2015
  const yearOptions = Array.from({ length: currentYear - 2011 }, (_, i) => currentYear - i)

  const [year,     setYear]     = useState('')
  const [makes,    setMakes]    = useState([])
  const [make,     setMake]     = useState('')
  const [models,   setModels]   = useState([])
  const [model,    setModel]    = useState('')
  const [variants, setVariants] = useState([])  // NrcanVehicle[]
  const [selected, setSelected] = useState(null)

  const [batteryKwh, setBatteryKwh] = useState('')
  const [price,      setPrice]      = useState(35000)
  const [loading,    setLoading]    = useState('')
  const [error,      setError]      = useState('')

  async function onYearChange(y) {
    setYear(y); setMake(''); setModel(''); setVariants([]); setSelected(null)
    setMakes([]); setModels([])
    if (!y) return
    setLoading('makes'); setError('')
    try {
      const r    = await fetch(`/api/nrcan?action=makes&year=${y}`)
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      setMakes(Array.isArray(data) ? data : [])
    } catch (e) { setError('Could not load makes. Try again.') }
    setLoading('')
  }

  async function onMakeChange(m) {
    setMake(m); setModel(''); setVariants([]); setSelected(null); setModels([])
    if (!m) return
    setLoading('models'); setError('')
    try {
      const r    = await fetch(`/api/nrcan?action=models&year=${year}&make=${encodeURIComponent(m)}`)
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      setModels(Array.isArray(data) ? data : [])
    } catch (e) { setError('Could not load models. Try again.') }
    setLoading('')
  }

  async function onModelChange(mo) {
    setModel(mo); setVariants([]); setSelected(null)
    if (!mo) return
    setLoading('variants'); setError('')
    try {
      const r    = await fetch(`/api/nrcan?action=vehicles&year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(mo)}`)
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      const vs = Array.isArray(data) ? data : []
      setVariants(vs)
      if (vs.length === 1) setSelected(vs[0])
    } catch (e) { setError('Could not load vehicle data. Try again.') }
    setLoading('')
  }

  function handleAdd() {
    if (!selected) return
    const mfg = estimateMfgCO2(selected.type, batteryKwh)
    const v = {
      id:               'custom',
      name:             `${selected.make} ${selected.model}`,
      sub:              `${selected.year} · ${selected.transmission ?? ''} · NRCan`,
      type:             selected.type,
      batteryKwh:       parseFloat(batteryKwh) || null,
      effKwh100km:      selected.effKwh100km,
      fuelL100km:       selected.fuelL100km,
      co2PerFuelL:      CO2_PER_FUEL_L,
      mfgKgCO2e:        mfg.total,
      batteryMfgKgCO2e: mfg.battery,
      color:            CUSTOM_COLOR,
      colorMuted:       CUSTOM_COLOR_MUTED,
      evRangeKm:        selected.evRangeKm,
    }
    onAdd(v, price)
  }

  const selClass = 'w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors disabled:opacity-40'
  const typeLabel = { ev: 'Battery Electric (BEV)', phev: 'Plug-in Hybrid (PHEV)', ice: 'Gas / Hybrid' }

  return (
    <div className="border border-zinc-700 bg-zinc-900 p-5 mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
          Custom vehicle — NRCan fuel consumption data
        </p>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-lg leading-none">×</button>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Select a vehicle and we'll pull official NRCan combined fuel consumption ratings — already in Canadian units
        (L/100km or kWh/100km), tested on the Canadian 5-cycle test. Covers model years 2012–{currentYear}.
      </p>

      {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-3">{error}</p>}

      {/* Cascading selects: Year → Make → Model */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Year</label>
          <select value={year} onChange={e => onYearChange(e.target.value)} className={selClass}>
            <option value="">Select year</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Make</label>
          <select value={make} onChange={e => onMakeChange(e.target.value)} className={selClass}
            disabled={!year || (loading === 'makes')}>
            <option value="">{loading === 'makes' ? 'Loading…' : 'Select make'}</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Model</label>
          <select value={model} onChange={e => onModelChange(e.target.value)} className={selClass}
            disabled={!make || (loading === 'models')}>
            <option value="">{loading === 'models' ? 'Loading…' : 'Select model'}</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Variant picker — shown when model selected and multiple variants exist */}
      {loading === 'variants' && (
        <p className="text-xs text-zinc-400 font-mono">Loading NRCan data…</p>
      )}
      {variants.length > 1 && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">
            Variant / transmission
          </label>
          <div className="space-y-1.5">
            {variants.map((v, i) => {
              const label = [
                typeLabel[v.type] ?? v.type,
                v.transmission,
                v.effKwh100km != null ? `${fmt(v.effKwh100km, 1)} kWh/100km` : null,
                v.fuelL100km   != null ? `${fmt(v.fuelL100km, 1)} L/100km`   : null,
                v.evRangeKm    != null ? `${v.evRangeKm} km range`            : null,
              ].filter(Boolean).join(' · ')
              return (
                <label key={i} className={`flex items-start gap-3 border p-3 cursor-pointer transition-colors ${
                  selected === v ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 hover:border-zinc-500'
                }`}>
                  <input type="radio" name="variant" checked={selected === v} onChange={() => setSelected(v)}
                    className="mt-0.5 accent-emerald-400" />
                  <span className="text-xs text-zinc-300 leading-relaxed">{label}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Specs summary */}
      {selected && (
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-4 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">NRCan specs</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-zinc-400 font-mono">Type</p>
              <p className="text-zinc-200 font-semibold">{typeLabel[selected.type] ?? selected.type}</p>
            </div>
            {selected.effKwh100km != null && (
              <div>
                <p className="text-zinc-400 font-mono">Efficiency</p>
                <p className="text-zinc-200 font-semibold">{fmt(selected.effKwh100km, 1)} kWh/100km</p>
                <p className="text-zinc-400 text-[10px]">NRCan combined</p>
              </div>
            )}
            {selected.fuelL100km != null && (
              <div>
                <p className="text-zinc-400 font-mono">{selected.type === 'phev' ? 'Gas mode' : 'Fuel'}</p>
                <p className="text-zinc-200 font-semibold">{fmt(selected.fuelL100km, 1)} L/100km</p>
                <p className="text-zinc-400 text-[10px]">NRCan combined</p>
              </div>
            )}
            {selected.evRangeKm != null && (
              <div>
                <p className="text-zinc-400 font-mono">EV range</p>
                <p className="text-zinc-200 font-semibold">{selected.evRangeKm} km</p>
              </div>
            )}
          </div>

          {/* Battery size (EVs/PHEVs — for manufacturing CO₂ estimate) */}
          {(selected.type === 'ev' || selected.type === 'phev') && (
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">
                Battery size (kWh) <span className="normal-case opacity-70">— for manufacturing CO₂ estimate</span>
              </label>
              <input type="number" value={batteryKwh} step={0.1} min={5} max={200}
                onChange={e => setBatteryKwh(e.target.value)}
                placeholder="e.g. 77.4"
                className="w-40 bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors" />
              <p className="text-[11px] text-zinc-400 mt-1">
                Check the manufacturer spec sheet. Defaults to a class average if left blank.
              </p>
            </div>
          )}

          {/* Purchase price */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">
              Purchase price <span className="normal-case opacity-70">($CAD, pre-incentive)</span>
            </label>
            <input type="number" value={price} step={500} min={5000} max={300000}
              onChange={e => setPrice(parseFloat(e.target.value))}
              className="w-40 bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors" />
          </div>

          <button onClick={handleAdd}
            className="bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-widest px-5 py-2 hover:bg-emerald-300 transition-colors">
            Add to comparison →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Rebates panel ─────────────────────────────────────────────────────────
function RebatesPanel({ activeVids, allVehicles, federal, provincial, onFederalChange, onProvincialChange }) {
  const rows = activeVids.map(vid => {
    const v   = allVehicles[vid]
    const fed = federal[vid] ?? 0
    const pro = provincial[vid] ?? 0
    return { vid, v, fed, pro, total: fed + pro }
  })

  return (
    <div className="border border-zinc-700 bg-zinc-900/50 p-4 mt-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Government rebates</p>
      <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">
        <span className="text-zinc-300 font-semibold">Federal:</span> Canada EV Affordability Program (EVAP) — $5,000 for BEVs, $2,500 for PHEVs; non-Canadian-made vehicles require transaction price ≤ $50,000.
        Regular hybrids are not eligible. <span className="text-zinc-300 font-semibold">Provincial:</span> Enter your province's rebate amount manually.
        Federal amounts are pre-filled — edit if your vehicle's eligibility differs.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="text-left pb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-4">Vehicle</th>
              <th className="text-left pb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-4">Federal</th>
              <th className="text-left pb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400 pr-4">Provincial</th>
              <th className="text-left pb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">Net rebate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ vid, v, fed, pro, total }) => (
              <tr key={vid} className="border-b border-zinc-800 last:border-0">
                <td className="py-2 pr-4">
                  <span className="font-semibold" style={{ color: v?.color ?? CUSTOM_COLOR }}>{v?.name ?? 'Custom'}</span>
                </td>
                <td className="py-2 pr-4">
                  {v?.type === 'ice' || v?.type === 'hybrid' ? (
                    <span className="text-zinc-400 font-mono">—</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">$</span>
                      <input type="number" value={fed} min={0} max={15000} step={500}
                        onChange={e => onFederalChange(vid, parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-800 border border-zinc-600 text-zinc-100 px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-400" />
                    </div>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {v?.type === 'ice' ? (
                    <span className="text-zinc-400 font-mono">—</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">$</span>
                      <input type="number" value={pro} min={0} max={15000} step={500}
                        onChange={e => onProvincialChange(vid, parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-800 border border-zinc-600 text-zinc-100 px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-400" />
                    </div>
                  )}
                </td>
                <td className="py-2">
                  <span className={`font-mono font-semibold ${total > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {total > 0 ? `$${fmt(total)}` : '$0'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
        Verify eligibility at <a href="https://tc.gc.ca/ev" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">tc.gc.ca/ev</a>.
        Provincial rebates: BC CleanBC up to $4,000 · Quebec up to $7,000 · Ontario $0 · Alberta $0 — amounts and eligibility change frequently.
      </p>
    </div>
  )
}

// ── Main calculator ───────────────────────────────────────────────────────
export default function EVCalculator() {
  // ── Core inputs ─────────────────────────────────────────────────────────
  const [city,       setCity]       = useState('Calgary, CA')
  const [annualKm,   setAnnualKm]   = useState(20000)
  const [elecPrice,  setElecPrice]  = useState(0.134)
  const [gasPrice,   setGasPrice]   = useState(1.50)
  const [solarPct,   setSolarPct]   = useState(0)
  const [prices,     setPrices]     = useState({ ioniq5: 59000, macheelfp: 52000, crv: 43375, rav4h: 47525 })

  // ── Rebates ─────────────────────────────────────────────────────────────
  const [applyRebates,     setApplyRebates]     = useState(false)
  const [federalRebates,   setFederalRebates]   = useState({ ...FEDERAL_REBATE_DEFAULT })
  const [provincialRebates, setProvincialRebates] = useState({ ioniq5: 0, macheelfp: 0, crv: 0, rav4h: 0, custom: 0 })

  // ── Custom vehicle ───────────────────────────────────────────────────────
  const [customVehicle,  setCustomVehicle]  = useState(null)
  const [customPrice,    setCustomPrice]    = useState(35000)
  const [showNrcanPanel, setShowNrcanPanel] = useState(false)

  // ── Results ──────────────────────────────────────────────────────────────
  const [status,    setStatus]    = useState('idle')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [results,   setResults]   = useState(null)

  // ── Chart refs ───────────────────────────────────────────────────────────
  const chartLifetimeRef  = useRef(null)
  const chartTCORef       = useRef(null)
  const chartLifecycleRef = useRef(null)
  const chartInstances    = useRef({})

  // ── Derived vehicle state ────────────────────────────────────────────────
  const activeVids   = useMemo(() => customVehicle ? [...VEHICLE_ORDER, 'custom'] : [...VEHICLE_ORDER], [customVehicle])
  const allVehicles  = useMemo(() => customVehicle ? { ...VEHICLES, custom: customVehicle } : VEHICLES, [customVehicle])

  const effectivePrices = useMemo(() => {
    const base = { ...prices }
    if (customVehicle) base.custom = customPrice
    if (!applyRebates) return base
    return Object.fromEntries(
      Object.keys(base).map(vid => [
        vid,
        Math.max(0, base[vid] - (federalRebates[vid] ?? 0) - (provincialRebates[vid] ?? 0)),
      ])
    )
  }, [prices, customPrice, customVehicle, applyRebates, federalRebates, provincialRebates])

  // Proxy vid for custom vehicle maintenance estimates
  const maintProxy = vid => {
    if (vid !== 'custom') return vid
    const t = customVehicle?.type
    return t === 'ev' ? 'ioniq5' : t === 'hybrid' ? 'rav4h' : 'crv'
  }

  // ── Destroy charts ────────────────────────────────────────────────────────
  function destroyCharts() {
    Object.values(chartInstances.current).forEach(c => c?.destroy())
    chartInstances.current = {}
  }

  // ── Draw charts ───────────────────────────────────────────────────────────
  async function drawCharts({ allVeh, vids, grid, effectiveGrid, annKm, annualCosts, effPrices }) {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    destroyCharts()

    const TICK_COLOR = '#71717a'
    const GRID_COLOR = '#27272a'
    const FONT       = 'ui-monospace, monospace'
    const baseScales = {
      x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } } },
      y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } } },
    }
    const baseTooltip = {
      backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1,
      titleColor: '#e4e4e7', bodyColor: '#a1a1aa',
      titleFont: { family: FONT, weight: '600', size: 12 },
      bodyFont: { family: FONT, size: 11 }, padding: 10,
    }

    const maxYears = 10
    const years    = Array.from({ length: maxYears + 1 }, (_, i) => i === 0 ? '0' : `Yr ${i}`)

    // Per-km CO₂ for each active vehicle
    const c2km = {}
    for (const vid of vids) {
      const v = allVeh[vid]
      c2km[vid] = v.type === 'ev' || v.type === 'phev'
        ? (effectiveGrid * v.effKwh100km) / 100000
        : (v.fuelL100km * CO2_PER_FUEL_L) / 100
    }

    // crv is always the baseline for emissions comparisons
    const crvC2km = (grid * VEHICLES.crv.fuelL100km * CO2_PER_FUEL_L) / 100 / 100000  // slightly different form
    const getC2km = (vid) => {
      const v = allVeh[vid]
      if (v.type === 'ev' || v.type === 'phev') return (effectiveGrid * v.effKwh100km) / 100000
      return (v.fuelL100km * CO2_PER_FUEL_L) / 100
    }
    const crvCO2km = getC2km('crv')

    const zonePlugin = (aboveLabel, belowLabel, refColor) => ({
      id: 'zonePlugin',
      afterDraw(chart) {
        const { ctx, scales: { x, y } } = chart
        const y100 = y.getPixelForValue(100)
        ctx.save()
        ctx.fillStyle = 'rgba(52,211,153,0.04)'
        ctx.fillRect(x.left, y100, x.right - x.left, y.bottom - y100)
        ctx.fillStyle = 'rgba(251,146,60,0.04)'
        ctx.fillRect(x.left, y.top, x.right - x.left, y100 - y.top)
        ctx.font = `600 10px ${FONT}`; ctx.fillStyle = refColor
        ctx.textAlign = 'left'
        ctx.fillText('100% — crv Gas baseline', x.left + 6, y100 - 6)
        ctx.font = `500 9px ${FONT}`
        ctx.fillStyle = 'rgba(251,146,60,0.6)'; ctx.textAlign = 'right'
        ctx.fillText(aboveLabel, x.right - 6, y.top + 14)
        ctx.fillStyle = 'rgba(52,211,153,0.7)'
        ctx.fillText(belowLabel, x.right - 6, y.bottom - 6)
        ctx.restore()
      },
    })

    // ── 1. Lifetime emissions chart ─────────────────────────────────────
    const crvTonnes = Array.from({ length: maxYears + 1 }, (_, yr) =>
      (VEHICLES.crv.mfgKgCO2e + crvCO2km * yr * annKm) / 1000
    )
    const lifetimePct = (vid) => {
      const co2 = getC2km(vid)
      return Array.from({ length: maxYears + 1 }, (_, yr) => {
        const km   = yr * annKm
        const base = VEHICLES.crv.mfgKgCO2e + crvCO2km * km
        return ((allVeh[vid].mfgKgCO2e + co2 * km) / Math.max(base, 1)) * 100
      })
    }

    if (chartLifetimeRef.current) {
      chartInstances.current.lifetime = new Chart(chartLifetimeRef.current, {
        type: 'line',
        plugins: [zonePlugin('above baseline (more CO₂ than gas car so far)', 'below baseline (less CO₂ than gas car so far)', VEHICLES.crv.color)],
        data: {
          labels: years,
          datasets: vids.map(vid => ({
            label:       allVeh[vid].name + (vid === 'crv' ? ' (100% baseline)' : ''),
            data:        vid === 'crv' ? years.map(() => 100) : lifetimePct(vid),
            borderColor: allVeh[vid].color,
            borderWidth: vid === 'crv' ? 3 : 2.5,
            borderDash:  vid === 'rav4h' ? [5, 3] : [],
            pointRadius: 0, fill: false, tension: 0.08,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: TICK_COLOR, font: { family: FONT, size: 11 }, boxWidth: 12, padding: 12 } },
            tooltip: {
              ...baseTooltip,
              callbacks: {
                title: items => {
                  const yr = parseInt(items[0].label.replace('Yr ', ''))
                  return isNaN(yr) ? 'Year 0' : `Year ${yr} · ${fmt(yr * annKm, 0)} km driven`
                },
                label: ctx => {
                  const yr    = ctx.dataIndex
                  const gasT  = crvTonnes[yr]
                  const evT   = (ctx.parsed.y / 100) * gasT
                  if (ctx.dataset.label?.includes('baseline')) return ` crv Gas: ${fmt(gasT, 1)} t CO₂e (baseline)`
                  const saving = gasT - evT
                  return ` ${ctx.dataset.label}: ${fmt(evT, 1)} t — ${saving >= 0 ? 'saves' : 'owes'} ${fmt(Math.abs(saving), 1)} t vs gas`
                },
              },
            },
          },
          scales: {
            x: { ...baseScales.x, title: { display: true, text: 'years of ownership', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
            y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: v => `${v.toFixed(0)}%` }, title: { display: true, text: '% of crv Gas cumulative CO₂e', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
          },
        },
      })
    }

    // ── 2. TCO chart ──────────────────────────────────────────────────────
    const annMaint = {}
    for (const vid of vids) annMaint[vid] = maintTotal(maintProxy(vid), annKm)

    const cumCostData = (vid) => {
      const cost = annualCosts[vid] ?? 0
      return Array.from({ length: maxYears + 1 }, (_, yr) =>
        (effPrices[vid] ?? 0) + yr * (cost + annMaint[vid])
      )
    }

    const crvRaw  = cumCostData('crv')
    const allRaw   = Object.fromEntries(vids.map(vid => [vid, cumCostData(vid)]))
    const toPct    = raw => raw.map((v, i) => (v / Math.max(crvRaw[i], 1)) * 100)

    if (chartTCORef.current) {
      chartInstances.current.tco = new Chart(chartTCORef.current, {
        type: 'line',
        plugins: [zonePlugin('above baseline (higher total cost than gas car so far)', 'below baseline (lower total cost than gas car so far)', VEHICLES.crv.color)],
        data: {
          labels: years,
          datasets: vids.map(vid => ({
            label:       allVeh[vid].name + (vid === 'crv' ? ' (100% baseline)' : ''),
            data:        vid === 'crv' ? years.map(() => 100) : toPct(allRaw[vid]),
            borderColor: allVeh[vid].color,
            borderWidth: vid === 'crv' ? 3 : 2.5,
            borderDash:  vid === 'rav4h' ? [5, 3] : [],
            pointRadius: 0, fill: false, tension: 0.08,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: TICK_COLOR, font: { family: FONT, size: 11 }, boxWidth: 12, padding: 12 } },
            tooltip: {
              ...baseTooltip,
              callbacks: {
                title: items => {
                  const yr = parseInt(items[0].label.replace('Yr ', ''))
                  return isNaN(yr) ? 'Purchase (Year 0)' : `Year ${yr} · ${fmt(yr * annKm, 0)} km driven`
                },
                label: ctx => {
                  const yr    = ctx.dataIndex
                  const gasAmt = crvRaw[yr]
                  const amt    = (ctx.parsed.y / 100) * gasAmt
                  if (ctx.dataset.label?.includes('baseline')) return ` crv Gas: $${fmt(gasAmt, 0)} total (baseline)`
                  const saving = gasAmt - amt
                  return saving > 0
                    ? ` ${ctx.dataset.label}: $${fmt(amt, 0)} — saves $${fmt(saving, 0)} vs gas`
                    : ` ${ctx.dataset.label}: $${fmt(amt, 0)} — costs $${fmt(-saving, 0)} more than gas`
                },
              },
            },
          },
          scales: {
            x: { ...baseScales.x, title: { display: true, text: 'years of ownership', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
            y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: v => `${v.toFixed(0)}%` }, title: { display: true, text: '% of crv Gas cumulative cost', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
          },
        },
      })
    }

    // ── 3. Lifecycle bar chart ────────────────────────────────────────────
    const yrs      = 10
    const totalKm  = annKm * yrs
    const fuelTots = vids.map(vid => (annualCosts[vid] ?? 0) * yrs)
    const mntTots  = vids.map(vid => maintTotal(maintProxy(vid), totalKm))
    const labels   = vids.map(vid => allVeh[vid].name)
    const barColors     = vids.map(vid => allVeh[vid].color)
    const barColorsMuted= vids.map(vid => allVeh[vid].colorMuted)

    if (chartLifecycleRef.current) {
      chartInstances.current.lifecycle = new Chart(chartLifecycleRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Fuel / energy', data: fuelTots, backgroundColor: barColors, borderWidth: 0, borderRadius: 0 },
            { label: 'Maintenance',   data: mntTots,  backgroundColor: barColorsMuted, borderColor: barColors, borderWidth: 1.5, borderRadius: { topLeft: 2, topRight: 2 } },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: TICK_COLOR, font: { family: FONT, size: 11 }, boxWidth: 12, padding: 12 } },
            tooltip: {
              ...baseTooltip,
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: $${fmt(ctx.parsed.y, 0)}`,
                footer: items => `Total: $${fmt(items.reduce((s, i) => s + i.parsed.y, 0), 0)}`,
              },
            },
          },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } } },
            y: { stacked: true, ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: v => `$${(v / 1000).toFixed(0)}k` }, title: { display: true, text: '10-year total ($)', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
          },
        },
      })
    }
  }

  // ── Run comparison ────────────────────────────────────────────────────────
  const runComparison = useCallback(async () => {
    if (!city.trim()) return
    setStatus('loading')
    setResults(null)
    destroyCharts()

    try {
      const wRes = await fetch(`${WEATHER_PROXY}/?q=${encodeURIComponent(city)}`)
      if (!wRes.ok) throw new Error(`City not found: "${city}". Try adding a country code — e.g. "Calgary, CA".`)
      const w = await wRes.json()

      const cRes = await fetch(`${CARBON_PROXY}/?lat=${w.coord.lat}&lon=${w.coord.lon}`)
      const c    = await cRes.json()
      const grid = c.carbonIntensity

      const solarFrac      = solarPct / 100
      const effectiveGrid  = grid * (1 - solarFrac)
      const effectiveEPrice = elecPrice * (1 - solarFrac)

      // Compute annual fuel/energy costs for all active vehicles
      const annualCosts = {}
      for (const vid of activeVids) {
        const v = allVehicles[vid]
        if (!v) continue
        if (v.type === 'ev') {
          annualCosts[vid] = annualKm * (v.effKwh100km / 100) * effectiveEPrice
        } else if (v.type === 'phev') {
          // Simplified: assume 70% electric / 30% gas for PHEV
          annualCosts[vid] = annualKm * 0.7 * (v.effKwh100km / 100) * effectiveEPrice
            + annualKm * 0.3 * (v.fuelL100km / 100) * gasPrice
        } else {
          annualCosts[vid] = annualKm * (v.fuelL100km / 100) * gasPrice
        }
      }

      // Per-km CO₂ for each vehicle
      const c2km = {}
      for (const vid of activeVids) {
        const v = allVehicles[vid]
        if (!v) continue
        c2km[vid] = (v.type === 'ev' || v.type === 'phev')
          ? (effectiveGrid * v.effKwh100km) / 100000
          : (v.fuelL100km * CO2_PER_FUEL_L) / 100
      }

      // Carbon breakeven (EV vs comparator)
      function breakeven(evId, compId) {
        const diff = allVehicles[evId]?.mfgKgCO2e - allVehicles[compId]?.mfgKgCO2e
        const gain = c2km[compId] - c2km[evId]
        return gain > 0 ? diff / gain : Infinity
      }

      // 10-year lifecycle (fuel + maintenance)
      const totalKm10 = annualKm * 10
      const lc = {}
      for (const vid of activeVids) {
        lc[vid] = (annualCosts[vid] ?? 0) * 10 + maintTotal(maintProxy(vid), totalKm10)
      }

      const resultData = {
        grid, effectiveGrid, effectiveEPrice,
        cityName: w.name, country: w.sys.country,
        c2km, annualCosts, lc,
        breakeven: {
          ioniqVscrv:   breakeven('ioniq5',    'crv'),
          ioniqVsrav4h:  breakeven('ioniq5',    'rav4h'),
          macheVscrv:   breakeven('macheelfp', 'crv'),
          macheVsrav4h:  breakeven('macheelfp', 'rav4h'),
          customVscrv:  customVehicle ? breakeven('custom', 'crv')  : null,
          customVsrav4h: customVehicle ? breakeven('custom', 'rav4h') : null,
        },
        solarPct,
        prices, customPrice, effectivePrices,
        annualKm,
      }

      setResults(resultData)
      setStatus('done')
      try { localStorage.setItem('cwm_ev', JSON.stringify(resultData)) } catch {}

      setTimeout(() => drawCharts({
        allVeh: allVehicles,
        vids: activeVids,
        grid,
        effectiveGrid,
        annKm: annualKm,
        annualCosts,
        effPrices: effectivePrices,
      }), 50)

    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }, [city, annualKm, elecPrice, gasPrice, solarPct, prices, customPrice, customVehicle, activeVids, allVehicles, effectivePrices])

  // Re-draw charts when inputs change
  useEffect(() => {
    if (status !== 'done' || !results) return
    const { grid, effectiveGrid, annualCosts } = results
    destroyCharts()
    setTimeout(() => drawCharts({
      allVeh: allVehicles, vids: activeVids, grid, effectiveGrid,
      annKm: annualKm, annualCosts, effPrices: effectivePrices,
    }), 50)
  }, [annualKm, elecPrice, gasPrice, solarPct, prices, customPrice, effectivePrices])

  useEffect(() => () => destroyCharts(), [])

  // ── Render ────────────────────────────────────────────────────────────────
  const r   = results
  const gridColsVehicles = activeVids.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'

  return (
    <div className="space-y-0">

      {/* Intro */}
      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
        Should you buy an EV? The answer depends on where you live and how much you drive.
        Enter your city and we'll show you the full picture: what you'd spend each year, what you'd emit, and at what point an EV
        starts winning — both financially and for the environment.
      </p>

      {/* ── Form ── */}
      <div className="border border-zinc-700 bg-zinc-800/40 p-5 space-y-5">

        {/* City + run button */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Your city</label>
          <div className="flex gap-2">
            <input type="text" value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runComparison()}
              className="flex-1 bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors"
              placeholder="Calgary, CA" />
            <button onClick={runComparison} disabled={status === 'loading'}
              className="bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-widest px-5 py-2 hover:bg-emerald-300 transition-colors disabled:opacity-40 whitespace-nowrap">
              {status === 'loading' ? 'Loading…' : 'Run comparison →'}
            </button>
          </div>
        </div>

        {/* Driving + rates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Annual driving', unit: 'km/year', value: annualKm,  set: v => setAnnualKm(v),  step: 1000, min: 1000,  max: 100000 },
            { label: 'Electricity',    unit: '$/kWh',   value: elecPrice, set: v => setElecPrice(v), step: 0.005, min: 0.05,  max: 0.50   },
            { label: 'Gas price',      unit: '$/L',     value: gasPrice,  set: v => setGasPrice(v),  step: 0.05,  min: 0.80,  max: 3.00   },
          ].map(({ label, unit, value, set, step, min, max }) => (
            <div key={label}>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">
                {label} <span className="normal-case opacity-70">({unit})</span>
              </label>
              <input type="number" value={value} step={step} min={min} max={max}
                onChange={e => set(parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors" />
            </div>
          ))}
        </div>

        {/* Solar slider */}
        <div className="border-t border-zinc-700 pt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">
            Home solar charging <span className="normal-case opacity-70">(% from panels)</span>
          </label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} step={5} value={solarPct}
              onChange={e => setSolarPct(Number(e.target.value))}
              className="flex-1 min-w-0 accent-emerald-400" />
            <span className="font-mono text-emerald-400 text-sm font-semibold w-9 text-right flex-shrink-0">{solarPct}%</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
            Solar charging is treated as 0 gCO₂e/kWh and $0/kWh — reduces both emissions and fuel cost proportionally.
          </p>
        </div>

        {/* Vehicle prices */}
        <div className="border-t border-zinc-700 pt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-3">
            Purchase prices <span className="normal-case opacity-70">(pre-incentive MSRP, $CAD)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'ioniq5',    label: 'Ioniq 5 AWD LR' },
              { key: 'macheelfp', label: 'Mach-E SR RWD'  },
              { key: 'crv',      label: 'CR-V Sport AWD'       },
              { key: 'rav4h',     label: 'RAV4 Hybrid Limited'   },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block font-mono text-[10px] text-zinc-400 mb-1">{label}</label>
                <input type="number" value={prices[key]} step={500} min={20000} max={150000}
                  onChange={e => setPrices(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                  className="w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Rebates toggle ── */}
        <div className="border-t border-zinc-700 pt-4">
          <label className="flex items-center gap-3 cursor-pointer group">
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
            <RebatesPanel
              activeVids={activeVids}
              allVehicles={allVehicles}
              federal={federalRebates}
              provincial={provincialRebates}
              onFederalChange={(vid, val) => setFederalRebates(r => ({ ...r, [vid]: val }))}
              onProvincialChange={(vid, val) => setProvincialRebates(r => ({ ...r, [vid]: val }))}
            />
          )}
        </div>

        {/* ── Custom vehicle ── */}
        <div className="border-t border-zinc-700 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Custom vehicle</p>
              {customVehicle ? (
                <p className="text-xs text-zinc-300 mt-0.5">
                  <span style={{ color: CUSTOM_COLOR }}>{customVehicle.name}</span>
                  {' · '}
                  {customVehicle.effKwh100km != null ? `${fmt(customVehicle.effKwh100km, 1)} kWh/100km` : `${fmt(customVehicle.fuelL100km, 1)} L/100km`}
                </p>
              ) : (
                <p className="text-[11px] text-zinc-400 mt-0.5">Compare any vehicle using official NRCan fuel consumption ratings</p>
              )}
            </div>
            <div className="flex gap-2">
              {customVehicle && (
                <button onClick={() => setCustomVehicle(null)}
                  className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-red-400 transition-colors">
                  Remove
                </button>
              )}
              <button onClick={() => setShowNrcanPanel(v => !v)}
                className="text-[10px] font-mono uppercase tracking-widest border border-zinc-600 text-zinc-400 hover:border-emerald-400 hover:text-emerald-400 px-3 py-1.5 transition-colors">
                {showNrcanPanel ? 'Close' : customVehicle ? 'Change vehicle' : '+ Add vehicle'}
              </button>
            </div>
          </div>
          {showNrcanPanel && (
            <NrcanSearchPanel
              onAdd={(v, p) => {
                setCustomVehicle(v)
                setCustomPrice(p)
                setFederalRebates(prev => ({ ...prev, custom: v.type === 'ev' ? 5000 : v.type === 'phev' ? 2500 : 0 }))
                setShowNrcanPanel(false)
              }}
              onClose={() => setShowNrcanPanel(false)}
            />
          )}
        </div>
      </div>

      {/* ── Status ── */}
      {status === 'loading' && (
        <div className="flex items-center gap-3 py-10 justify-center text-zinc-400 text-sm font-mono">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
          Fetching grid data for {city}…
        </div>
      )}
      {status === 'error' && (
        <div className="border border-red-400/30 bg-red-400/5 text-red-400 text-sm p-4 mt-4 font-mono">{errorMsg}</div>
      )}

      {/* ── Results ── */}
      {status === 'done' && r && (() => {
        const vids       = activeVids
        const allVeh     = allVehicles
        const co2vals    = vids.map(vid => r.c2km[vid] ?? 0)
        const minCO2     = Math.min(...co2vals)
        const maxCO2     = Math.max(...co2vals)
        const costVals   = vids.map(vid => r.annualCosts[vid] ?? 0)
        const minCost    = Math.min(...costVals)
        const lcVals     = vids.map(vid => r.lc[vid] ?? 0)
        const minLC      = Math.min(...lcVals)

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
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Grid intensity: {Math.round(r.grid)} gCO₂e/kWh
                    {r.solarPct > 0 && ` · EV effective: ${Math.round(r.effectiveGrid)} gCO₂e/kWh`}
                    {' '}— <span className="italic">grams of CO₂ equivalent per kilowatt-hour of electricity used</span>
                  </p>
                </div>
              )
            })()}

            <SaveToPlanBanner storageKey="cwm_ev" data={r} />

            {/* ════ 01 — ECONOMICS ════════════════════════════════════════ */}
            <SectionHeader num="01 — Economics" title="What does it cost to own and run each vehicle?" />

            {/* Annual fuel costs */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-5 mb-2">Annual fuel & energy costs</p>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">What you pay every year just to move — fuel and electricity only.</p>
            <div className={`grid ${gridColsVehicles} gap-3 mb-2`}>
              {vids.map(vid => {
                const v    = allVeh[vid]
                const cost = r.annualCosts[vid] ?? 0
                const detail = (v.type === 'ev' || v.type === 'phev')
                  ? `${fmt(v.effKwh100km, 1)} kWh/100km × $${r.effectiveEPrice?.toFixed(3) ?? elecPrice}/kWh${solarPct > 0 ? ' (solar adj.)' : ''}`
                  : `${fmt(v.fuelL100km, 1)} L/100km × $${gasPrice.toFixed(2)}/L`
                return <CostCard key={vid} v={v} annualCost={cost} isLowest={cost === minCost} detail={`${detail} · ${fmt(annualKm, 0)} km/yr`} />
              })}
            </div>
            <p className="text-[11px] text-zinc-400 mb-6 leading-relaxed">
              Fuel and electricity only — maintenance savings shown below.
              {solarPct > 0 && ` Solar: ${solarPct}% of EV charging at $0/kWh.`}
            </p>

            {/* Annual savings vs crv */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Annual savings vs crv Gas</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard label="Ioniq 5 — fuel saved"   value={`$${fmt(r.annualCosts.crv - r.annualCosts.ioniq5, 0)}`}    unit="/ year"  accent color={VEHICLES.ioniq5.color} />
              <StatCard label="Mach-E — fuel saved"    value={`$${fmt(r.annualCosts.crv - r.annualCosts.macheelfp, 0)}`} unit="/ year"  accent color={VEHICLES.macheelfp.color} />
              <StatCard label="Ioniq 5 — CO₂ saved"    value={fmt((r.c2km.crv - r.c2km.ioniq5) * annualKm / 1000, 2)}   unit="tonnes / year" color={VEHICLES.ioniq5.color} />
              <StatCard label="Mach-E — CO₂ saved"     value={fmt((r.c2km.crv - r.c2km.macheelfp) * annualKm / 1000, 2)} unit="tonnes / year" color={VEHICLES.macheelfp.color} />
            </div>

            {/* TCO chart */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Total cost of ownership</p>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">Cumulative cost over 10 years — % of crv Gas cost</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              crv Gas is 100%. EVs start above it (higher purchase price) but their lower running costs compound over time.
              When a line crosses below 100%, it has become cheaper in total. Hover any year to see actual dollars.
              {applyRebates && ' Rebates applied to purchase price.'}
            </p>
            <div className="bg-zinc-900 border border-zinc-700 p-4 mb-8" style={{ height: 380 }}>
              <canvas ref={chartTCORef} />
            </div>

            {/* 10-year lifecycle */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">10-year running costs — fuel + maintenance</p>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              What it costs to keep each vehicle on the road for a decade, including scheduled servicing.
              Purchase price, insurance, and unscheduled repairs excluded.
            </p>
            <div className={`grid ${gridColsVehicles} gap-3 mb-4`}>
              {vids.map(vid => {
                const lcVal   = r.lc[vid] ?? 0
                const fuelVal = (r.annualCosts[vid] ?? 0) * 10
                const mntVal  = maintTotal(maintProxy(vid), annualKm * 10)
                return (
                  <div key={vid} className={`border p-4 ${lcVal === minLC ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-0.5 h-3" style={{ background: allVeh[vid].color }} />
                      <p className="text-[10px] font-mono text-zinc-400">{allVeh[vid].name}</p>
                    </div>
                    <p className="font-mono text-xl font-semibold mb-0.5" style={{ color: lcVal === minLC ? '#34d399' : '#e4e4e7' }}>
                      ${fmt(lcVal, 0)}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400 mb-3">10-yr fuel + maintenance</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Fuel: ${fmt(fuelVal, 0)}<br />Maintenance: ${fmt(mntVal, 0)}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-2 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Cost breakdown</p>
              <h3 className="text-sm font-bold text-zinc-200 mb-1">10-year fuel + maintenance by vehicle</h3>
              <p className="text-xs text-zinc-400 mb-4">Fuel and energy on the bottom, scheduled maintenance on top.</p>
              <div className="bg-zinc-900 border border-zinc-700 p-4 mb-4" style={{ height: 280 }}>
                <canvas ref={chartLifecycleRef} />
              </div>
            </div>

            {/* Maintenance table */}
            <MaintTable activeVids={vids} allVehicles={allVeh} annualKm={annualKm} />

            {/* ════ 02 — EMISSIONS ═════════════════════════════════════════ */}
            <SectionHeader num="02 — Emissions" title="What's the carbon story — today and over a lifetime?" />

            {/* Per-km emissions cards */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mt-5 mb-2">Emissions per km on your grid right now</p>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Live carbon intensity for {r.cityName}, {r.country} ({Math.round(r.grid)} gCO₂e/kWh today).
              Your EV's driving emissions are entirely a function of how clean your electricity is — which is why Quebec and Alberta get very different answers.
            </p>
            <div className={`grid ${gridColsVehicles} gap-3 mb-8`}>
              {vids.map(vid => (
                <VehicleEmissionCard key={vid}
                  v={allVeh[vid]}
                  co2km={r.c2km[vid] ?? 0}
                  isWinner={(r.c2km[vid] ?? Infinity) === minCO2}
                  maxCO2={maxCO2}
                  rebateAmount={applyRebates ? ((federalRebates[vid] ?? 0) + (provincialRebates[vid] ?? 0)) : 0}
                />
              ))}
            </div>

            {/* Manufacturing debt */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Manufacturing carbon — the debt that comes with every new vehicle</p>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Every new vehicle arrives with CO₂ already emitted during manufacturing.
              EVs carry a bigger debt — largely from the battery — but their cleaner driving progressively pays it off.
            </p>
            <div className="border border-zinc-700 bg-zinc-800/40 p-5 mb-6">
              {vids.map(vid => {
                const v   = allVeh[vid]
                const pct = (v.mfgKgCO2e / Math.max(...vids.map(x => allVeh[x].mfgKgCO2e)) * 100).toFixed(1)
                return (
                  <div key={vid} className="mb-4 last:mb-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: v.color }}>{v.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{v.sub}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono text-sm text-zinc-200">{fmt(v.mfgKgCO2e / 1000, 1)} t</p>
                        <p className="font-mono text-[10px] text-zinc-400">
                          {v.batteryMfgKgCO2e > 0 ? `batt: ${fmt(v.batteryMfgKgCO2e / 1000, 1)} t` : 'no traction battery'}
                          {vid === 'custom' && <span className="block text-zinc-400">est.</span>}
                        </p>
                      </div>
                    </div>
                    <div className="h-3 bg-zinc-700">
                      <div className="h-full" style={{ width: `${pct}%`, background: v.color }} />
                    </div>
                  </div>
                )
              })}
              <p className="text-[11px] text-zinc-400 mt-4 pt-4 border-t border-zinc-700 leading-relaxed">
                Source: GREET 2023 (Argonne National Lab).
                {vids.includes('custom') && ' Custom vehicle: estimated from class average.'}
              </p>
            </div>
            <DiveDeeper label="Why do EVs have a higher manufacturing footprint?">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Building a battery pack is energy-intensive — mining lithium, cobalt, and nickel; refining them; manufacturing cells; assembling the pack. That process produces significant CO₂ before the car moves a single kilometre.
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                <span className="text-zinc-300 font-semibold">Battery chemistry makes a big difference.</span> The Ioniq 5 uses NMC811 cells — energy-dense but cobalt-intensive, at ~84 kg CO₂e per kWh of battery capacity. The Mach-E Standard Range uses LFP (lithium iron phosphate) — no cobalt or nickel, at ~52 kg CO₂e/kWh. On a 72 kWh pack that's roughly 2,300 kg CO₂e less, which can shave one to two years off the emissions breakeven time on a typical grid.
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                These figures are GREET 2023 industry averages from Argonne National Lab — the standard used by governments and researchers worldwide. Real numbers vary by factory and energy source.
              </p>
            </DiveDeeper>

            {/* Breakeven */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">When does an EV become better for the planet?</p>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Building a battery takes energy — so an EV starts life with a higher carbon footprint than a gas car.
              But every kilometre driven on cleaner electricity chips away at that deficit.
              The number below is how far you need to drive before the EV comes out ahead, lifetime total.
            </p>
            <div className={`grid grid-cols-2 ${vids.includes('custom') ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} gap-3 mb-4`}>
              <BreakevenCard evV={allVeh.ioniq5}    compV={allVeh.crv}  breakKm={r.breakeven.ioniqVscrv}  annualKm={annualKm} />
              <BreakevenCard evV={allVeh.ioniq5}    compV={allVeh.rav4h} breakKm={r.breakeven.ioniqVsrav4h} annualKm={annualKm} />
              <BreakevenCard evV={allVeh.macheelfp} compV={allVeh.crv}  breakKm={r.breakeven.macheVscrv}  annualKm={annualKm} />
              <BreakevenCard evV={allVeh.macheelfp} compV={allVeh.rav4h} breakKm={r.breakeven.macheVsrav4h} annualKm={annualKm} />
              {vids.includes('custom') && (customVehicle?.type === 'ev' || customVehicle?.type === 'phev') && r.breakeven.customVscrv != null && (
                <BreakevenCard evV={allVeh.custom} compV={allVeh.crv}  breakKm={r.breakeven.customVscrv}  annualKm={annualKm} />
              )}
              {vids.includes('custom') && (customVehicle?.type === 'ev' || customVehicle?.type === 'phev') && r.breakeven.customVsrav4h != null && (
                <BreakevenCard evV={allVeh.custom} compV={allVeh.rav4h} breakKm={r.breakeven.customVsrav4h} annualKm={annualKm} />
              )}
            </div>
            <DiveDeeper label="How is this calculated?">
              <p className="text-xs text-zinc-400 leading-relaxed">
                The breakeven distance is calculated by dividing the manufacturing CO₂ gap between the two vehicles by the emissions savings per kilometre during driving.
              </p>
              <p className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-2 leading-relaxed">
                Breakeven km = (EV mfg CO₂ − Gas car mfg CO₂) ÷ (Gas car g/km − EV g/km)
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                If the EV's driving emissions are higher than the gas car's — which happens on a very carbon-heavy grid — the denominator goes negative and no breakeven exists. That's not a broken calculation; it means the grid is too dirty for EVs to win on emissions at the moment.
              </p>
            </DiveDeeper>

            {/* Lifetime emissions chart */}
            <div className="mt-6 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Lifetime emissions</p>
              <h3 className="text-sm font-bold text-zinc-200 mb-1">Cumulative lifecycle CO₂e — % of crv Gas emissions</h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                crv Gas is pegged at 100%. EVs start above it (manufacturing debt), then arc down as cleaner driving accumulates.
                When a line crosses below 100%, that vehicle has emitted less CO₂ than the gas car over its lifetime.
                Hover any year to see actual tonnes.
              </p>
              <div className="bg-zinc-900 border border-zinc-700 p-4" style={{ height: 380 }}>
                <canvas ref={chartLifetimeRef} />
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Explainer + Sources — collapsed by default ── */}
      <div className="border-t border-zinc-800 mt-12 pt-8">
        <DiveDeeper label="Behind the numbers — what this tool is actually measuring">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {[
              { title: "Yes, EVs start with a higher footprint. Here's why.",
                body: "Building a battery is energy-intensive — mining lithium, cobalt, and nickel; refining them; assembling cells. The Ioniq 5's 77.4 kWh NMC pack accounts for roughly 6,500 kg CO₂e before the car moves an inch. Add the rest of the vehicle and you're at ~14,500 kg, versus ~8,500 kg for a CR-V. The question isn't whether EVs have a manufacturing penalty — it's how long it takes to pay it back through cleaner driving." },
              { title: "Why Quebec and Alberta get very different answers",
                body: "An EV's driving emissions are entirely a function of the electricity it uses. In Quebec (~28 gCO₂e/kWh hydro grid), an Ioniq 5 emits roughly 5 g CO₂e/km. In Alberta (~385 gCO₂e/kWh gas-heavy grid), the same car emits around 68 g/km — still better than a CR-V's ~194 g/km, but the advantage is thinner and the breakeven takes longer. This tool fetches live grid data for your specific city." },
              { title: "LFP vs NMC — not all batteries are equal",
                body: "The Ioniq 5 uses NMC811 chemistry — energy-dense but cobalt-intensive, at ~84 kg CO₂e/kWh of battery. The Mach-E Standard Range uses LFP (lithium iron phosphate) cells — no cobalt or nickel, at ~52 kg CO₂e/kWh. On a 72 kWh pack that's roughly 2,300 kg CO₂e less manufacturing, which shortens the emissions breakeven by years on a dirtier grid." },
              { title: "Why we use NRCan numbers",
                body: "NRCan's 5-cycle Canadian test reflects cold starts, air conditioning, and real-world highway speeds. The resulting L/100km and kWh/100km ratings are more realistic for Canadian drivers than EPA figures. All vehicle efficiency numbers in this tool — including custom vehicles you add — come directly from NRCan's official ratings database." },
              { title: "What we're not capturing",
                body: "Manufacturing CO₂ figures are GREET 2023 industry averages. The real number depends on the specific factory and its energy source. We've also not modelled battery degradation, end-of-life recycling credits, upstream methane from gas extraction, or marginal vs. average grid emissions." },
              { title: "Spotted something wrong?",
                body: "Lifecycle analysis is genuinely tricky, battery manufacturing data improves every year, and model specs change. If a number looks off or a key variable is missing, we want to hear it.",
                cta: true },
            ].map(({ title, body, cta }) => (
              <div key={title} className="border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="text-sm font-bold text-zinc-200 mb-3 leading-snug">{title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{body}</p>
                {cta && (
                  <a href="mailto:info@cwmenergy.ca" className="inline-block mt-4 text-xs font-bold text-emerald-400 border border-emerald-400/30 px-4 py-2 hover:bg-emerald-400 hover:text-zinc-950 transition-colors">
                    Send feedback →
                  </a>
                )}
              </div>
            ))}
          </div>
        </DiveDeeper>

        <DiveDeeper label="Data sources">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
            {[
              'CAA 2023 Driving Costs — maintenance estimates by vehicle type',
              'Consumer Reports Annual Auto Surveys — EV vs ICE reliability & service costs',
              'GREET 2023 — Argonne National Lab, vehicle lifecycle & battery manufacturing CO₂',
              'GREET 2023 — NMC811: ~84 kg CO₂e/kWh · LFP: ~52 kg CO₂e/kWh',
              'Natural Resources Canada (NRCan) — official fuel consumption ratings, 2012–present',
              'NRCan 5-cycle test — Canadian combined L/100km and kWh/100km ratings',
              'Electricity Maps — live grid carbon intensity by location',
              'OpenWeatherMap — city location lookup',
              'IPCC AR5 — lifecycle CO₂e emission factor for gasoline (2.31 kg/L)',
              'Canada EV Affordability Program (EVAP) — federal incentive amounts',
            ].map(s => (
              <li key={s} className="text-[11px] text-zinc-400 leading-relaxed pl-4 relative before:absolute before:left-0 before:text-emerald-400 before:content-['—']">
                {s}
              </li>
            ))}
          </ul>
        </DiveDeeper>
      </div>

      {/* ── Transparency ── */}
      <div className="border-t border-zinc-800 pt-8 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-3">We're not here to sell you an EV</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            CWM Energy does clean energy consulting. We think EVs are a meaningful part of decarbonizing transportation —
            but the case is strong enough that it doesn't need exaggerating.
            Showing the inconvenient truths (manufacturing debt, grid dependency, longer breakevens in Alberta) builds more trust than hiding them.
            Every number links to a published source.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-3">A few things worth noting</h3>
          <ul className="text-xs text-zinc-400 leading-relaxed space-y-2">
            <li><span className="text-zinc-300 font-semibold">Averages, not actuals:</span> Manufacturing CO₂ is based on industry-average lifecycle models. The actual figure depends on the specific factory and its energy source.</li>
            <li><span className="text-zinc-300 font-semibold">Live data is a snapshot:</span> Grid carbon intensity changes hour by hour. Annual averages tell a more complete story.</li>
            <li><span className="text-zinc-300 font-semibold">Not financial advice:</span> Buying a car involves financing, resale value, insurance, and a dozen other variables this tool doesn't model.</li>
          </ul>
        </div>
      </div>

    </div>
  )
}
