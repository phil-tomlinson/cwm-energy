'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ROOF_TYPES,
  ORIENTATION_LABELS,
  orientationFactors,
  estimateRoofCapacity,
  getRoofGuidanceText,
} from '@/data/solarData'
import {
  calculateSolar,
  calculateSolarEvSynergy,
  solarSizePresets,
  DEFAULT_INSTALL_COST_PER_KW,
} from '@/calculations/solar'

// Orientations available in the UI (omit northward options that make no sense to default to)
const ORIENTATION_OPTIONS = ['south', 'se', 'sw', 'east', 'west', 'nw', 'ne']

const HOUSE_TYPE_LABELS = {
  detached:  'Detached',
  semi:      'Semi-detached',
  townhouse: 'Townhouse',
  apartment: 'Apartment / Condo',
}

// Province list for standalone use (when no HomeIQ data is present)
const PROVINCES = [
  ['BC', 'British Columbia'], ['AB', 'Alberta'],    ['SK', 'Saskatchewan'],
  ['MB', 'Manitoba'],         ['ON', 'Ontario'],    ['QC', 'Quebec'],
  ['NB', 'New Brunswick'],    ['NS', 'Nova Scotia'],['PE', 'PEI'],
  ['NL', 'Newfoundland'],     ['YT', 'Yukon'],      ['NT', 'Northwest Territories'],
  ['NU', 'Nunavut'],
]

// ── Display helpers ───────────────────────────────────────────────────────────
// Round aggressively so outputs don't imply false precision.
const snap  = (n, step) => Math.round(n / step) * step
const cadFmt = (n, step) => `~$${snap(n, step).toLocaleString('en-CA')}`

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCell({ label, value, unit, highlight }) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 p-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 mb-1 leading-tight">{label}</p>
      <p className={`font-mono text-lg font-bold leading-none ${highlight ? 'text-yellow-400' : 'text-zinc-100'}`}>
        {value}
        {unit && <span className="text-xs font-normal text-zinc-400 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SolarCard({ homeiqData, evData, detailHref }) {
  const inputs    = homeiqData?.inputs ?? {}
  const hasHomeIQ = !!inputs.province

  // Location / geometry — pre-fill from HomeIQ where available
  const [province,  setProvince]  = useState(inputs.province  ?? 'AB')
  const [houseType, setHouseType] = useState(inputs.houseType ?? 'detached')

  // Solar configuration
  const [roofType,     setRoofType]     = useState('ew')
  const [orientation,  setOrientation]  = useState('south')
  const [customKW,     setCustomKW]     = useState(null)   // null = follow preset selection
  const [selectedPresetKW, setSelectedPresetKW] = useState(null)  // which preset button is active
  const [costPerKW,    setCostPerKW]    = useState(DEFAULT_INSTALL_COST_PER_KW)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [incentives,   setIncentives]   = useState(0)

  const floorArea  = inputs.floorArea ?? 150
  const storeys    = inputs.storeys   ?? 2
  const hasEV      = evData != null

  // ── Derived values ────────────────────────────────────────────────────────
  const capacity   = estimateRoofCapacity({ houseType, floorArea, storeys, roofType })
  const presets    = solarSizePresets(capacity.maxKW)
  const isApartment = houseType === 'apartment' || capacity.maxKW <= 0

  // Resolve active system size: custom input > preset selection > medium preset > first preset
  const mediumPreset = presets.find(p => p.label === 'Medium') ?? presets[1] ?? presets[0]
  const defaultKW    = mediumPreset?.kw ?? Math.min(5, capacity.maxKW)
  const activeKW     = customKW ?? selectedPresetKW ?? defaultKW

  const guidanceText = getRoofGuidanceText({ houseType, roofType, maxKW: capacity.maxKW })

  // Run calculations (skip for apartments)
  const result  = isApartment ? null : calculateSolar({
    systemKW:        activeKW,
    province,
    orientation,
    hasEV:           false,
    installCostPerKW: costPerKW,
    incentives,
  })

  const synergy = (!isApartment && hasEV) ? calculateSolarEvSynergy({
    systemKW:        activeKW,
    province,
    orientation,
    installCostPerKW: costPerKW,
    incentives,
  }) : null

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleRoofTypeChange(id) {
    setRoofType(id)
    setCustomKW(null)
    setSelectedPresetKW(null)
    // Default orientation to the sensible choice for this roof type
    const defaults = { ew: 'south', ns: 'west', hip: 'sw', flat: 'south' }
    setOrientation(defaults[id] ?? 'south')
  }

  function handlePresetClick(kw) {
    setSelectedPresetKW(kw)
    setCustomKW(null)
  }

  function handleCustomKW(raw) {
    const v = parseFloat(raw)
    if (!isNaN(v) && v > 0) {
      setCustomKW(v)
      setSelectedPresetKW(null)
    }
  }

  // Is the active orientation meaningfully worse than optimal?
  const orientFactor     = orientationFactors[orientation] ?? 1
  const orientPenaltyPct = Math.round((1 - orientFactor) * 100)
  const showOrientNote   = orientPenaltyPct >= 15

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border border-yellow-500/25 bg-zinc-900">

      {/* Header */}
      <div className="border-b border-yellow-500/20 px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-yellow-400">Solar PV</p>
              <span className="font-mono text-[9px] border border-yellow-500/30 text-yellow-400/60 px-1.5 py-0.5 uppercase tracking-widest">
                Estimate
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100">Rooftop solar potential</h3>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              {hasHomeIQ
                ? `Pre-filled from HomeIQ · ${inputs.city ? inputs.city + ', ' : ''}${inputs.province} · ${HOUSE_TYPE_LABELS[houseType] ?? houseType}`
                : 'Estimate solar potential for any Canadian address'
              }
            </p>
          </div>
          {/* Sun icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5 text-yellow-400/40" aria-hidden="true">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l-1.41 1.41M6.34 17.66l-1.41 1.41"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Province + house type — only when no HomeIQ data */}
        {!hasHomeIQ && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-1.5">Province</p>
              <select
                value={province}
                onChange={e => setProvince(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                {PROVINCES.map(([code, name]) => (
                  <option key={code} value={code} className="bg-zinc-800">{name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-1.5">House type</p>
              <select
                value={houseType}
                onChange={e => { setHouseType(e.target.value); setCustomKW(null); setSelectedPresetKW(null) }}
                className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                {Object.entries(HOUSE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v} className="bg-zinc-800">{l}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Apartment / no-solar state */}
        {isApartment ? (
          <div className="border border-zinc-700 bg-zinc-800/40 p-4">
            <p className="text-sm font-medium text-zinc-300 mb-1.5">Solar not available for individual units</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Apartment roofs are shared and typically inaccessible to individual owners.
              Consider your utility's <span className="text-zinc-200">green electricity tariff</span> or a{' '}
              <span className="text-zinc-200">community solar subscription</span> as alternatives —
              both let you offset your carbon footprint without rooftop access.
            </p>
          </div>
        ) : (
          <>
            {/* ── Roof configuration ─────────────────────────────────── */}
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-2">Which part of your roof faces south?</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {ROOF_TYPES.map(rt => {
                  const active = roofType === rt.id
                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => handleRoofTypeChange(rt.id)}
                      className={`border text-left px-3 py-2.5 transition-colors ${
                        active
                          ? 'border-yellow-500/50 bg-yellow-400/10 text-yellow-400'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight">{rt.label}</p>
                      <p className="text-[10px] font-mono mt-0.5 opacity-75 leading-tight">{rt.sub}</p>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{guidanceText}</p>
            </div>

            {/* ── System size ─────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-2">System size</p>
              {presets.length > 0 && (
                <div className={`grid gap-2 mb-3 grid-cols-${Math.min(presets.length, 3)}`}
                  style={{ gridTemplateColumns: `repeat(${Math.min(presets.length, 3)}, minmax(0, 1fr))` }}
                >
                  {presets.map(p => {
                    const active = Math.abs(activeKW - p.kw) < 0.05
                    return (
                      <button
                        key={p.kw}
                        type="button"
                        onClick={() => handlePresetClick(p.kw)}
                        className={`border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-yellow-500/50 bg-yellow-400/10 text-yellow-400'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <p className="text-xs font-bold">{p.label}</p>
                        <p className="text-[10px] font-mono">{p.sub}</p>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={activeKW}
                    min={0.5}
                    max={capacity.maxKW + 5}
                    step={0.5}
                    onChange={e => handleCustomKW(e.target.value)}
                    className="w-20 bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-zinc-400 font-mono">kW</span>
                </div>
                {activeKW > capacity.maxKW + 0.05 ? (
                  <p className="text-[10px] font-mono text-amber-400">⚠ exceeds estimated roof capacity ({capacity.maxKW} kW)</p>
                ) : (
                  <p className="text-[10px] font-mono text-zinc-500">max ~{capacity.maxKW} kW on this roof</p>
                )}
              </div>
            </div>

            {/* ── Orientation ─────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-medium text-zinc-300 mb-1.5">Slope orientation</p>
              <select
                value={orientation}
                onChange={e => setOrientation(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                {ORIENTATION_OPTIONS.map(o => (
                  <option key={o} value={o} className="bg-zinc-800">{ORIENTATION_LABELS[o]}</option>
                ))}
              </select>
              {showOrientNote && (
                <p className="mt-1 text-[10px] font-mono text-zinc-500">
                  {orientPenaltyPct}% less annual generation than a south-facing roof
                </p>
              )}
            </div>

            {/* ── Results ─────────────────────────────────────────────── */}
            {result && (
              <div className="border border-zinc-700 bg-zinc-950/50 p-4 space-y-4">

                {/* Key metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <MetricCell
                    label="Annual generation"
                    value={`~${snap(result.annualGenKWh, 100).toLocaleString('en-CA')}`}
                    unit="kWh"
                  />
                  <MetricCell
                    label="Annual savings"
                    value={cadFmt(result.annualSavingsCAD, 100)}
                    unit="/yr"
                    highlight
                  />
                  <MetricCell
                    label="Payback"
                    value={isFinite(result.paybackYears) ? `~${Math.round(result.paybackYears)}` : '—'}
                    unit={isFinite(result.paybackYears) ? 'years' : ''}
                  />
                  <MetricCell
                    label="CO₂ offset"
                    value={result.co2AvoidedTonnes > 0 ? `~${result.co2AvoidedTonnes.toFixed(1)}` : '<0.1'}
                    unit="t/yr"
                  />
                </div>

                {/* Cost + lifetime */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-mono text-zinc-400">
                  <span>
                    {incentives > 0 ? (
                      <>
                        Cost:{' '}
                        <span className="line-through text-zinc-500">{cadFmt(result.grossCostCAD, 500)}</span>
                        {' → '}
                        <span className="text-zinc-300">{cadFmt(result.netCostCAD, 500)}</span>
                        <span className="text-emerald-400/70"> after incentives</span>
                      </>
                    ) : (
                      <>System cost: <span className="text-zinc-300">{cadFmt(result.grossCostCAD, 500)}</span></>
                    )}
                  </span>
                  <span>
                    25-yr net gain:{' '}
                    <span className={result.lifetimeNetGainCAD >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {result.lifetimeNetGainCAD >= 0 ? '+' : ''}{cadFmt(Math.abs(result.lifetimeNetGainCAD), 1000)}
                    </span>
                  </span>
                  <span>Self-consumed: ~{result.selfConsumptionPct}%</span>
                </div>

                {/* Net metering note */}
                <div className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                  {result.netMeteringType === 'retail' && (
                    <span>
                      ✓ {province} has full retail net metering — exported power credited at{' '}
                      {(result.electricityRate * 100).toFixed(1)}¢/kWh (same as consumption rate).
                    </span>
                  )}
                  {result.netMeteringType === 'variable' && (
                    <span>
                      ⚡ AB auto-switches each billing month: net-importer months credit exports at{' '}
                      <span className="text-zinc-300">{(result.exportCommodityRate * 100).toFixed(1)}¢/kWh</span>
                      {' '}(commodity only); net-exporter months credit at{' '}
                      <span className="text-zinc-300">{(result.exportPremiumRate * 100).toFixed(1)}¢/kWh</span>
                      {' '}(premium rate). Estimate blends to ~{(result.exportRate * 100).toFixed(1)}¢/kWh —
                      a larger system relative to your consumption means more net-exporter months.
                    </span>
                  )}
                  {result.netMeteringType === 'avoided' && (
                    <span className="text-amber-400/80">
                      ⚠ Ontario credits exported power at ~{(result.exportRate * 100).toFixed(0)}¢/kWh
                      (commodity rate only, not the full {(result.electricityRate * 100).toFixed(1)}¢/kWh retail rate).
                      Self-consumed kWh are worth full retail — an EV or battery improves this significantly.
                    </span>
                  )}
                  {result.netMeteringType === 'none' && (
                    <span className="text-amber-400/80">
                      ⚠ No net metering in {province} — exported power earns nothing.
                      Only self-consumed generation has financial value; size the system accordingly.
                    </span>
                  )}
                </div>

                {/* EV synergy */}
                {synergy && (
                  <div className="border-t border-zinc-700 pt-3">
                    {synergy.extraAnnualSavingsCAD > 0 ? (
                      <div className="text-[10px] font-mono leading-relaxed">
                        <span className="text-purple-400 font-bold">⚡ EV synergy</span>
                        <span className="text-zinc-300">
                          {' '}Daytime EV charging raises self-consumption from{' '}
                          {synergy.withoutEV.selfConsumptionPct}% → {synergy.withEV.selfConsumptionPct}%,
                          adding <span className="text-emerald-400">+${synergy.extraAnnualSavingsCAD.toLocaleString('en-CA')}/yr</span> in savings
                          and cutting payback by {synergy.paybackImprovement.toFixed(1)} years.
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                        <span className="text-purple-400/70">EV note:</span>{' '}
                        {province} has full retail net metering — all generated power is credited at retail
                        rate regardless of timing, so EV charging doesn't change the solar financial case here.
                      </p>
                    )}
                  </div>
                )}

                {/* CO2 context note for near-zero grids */}
                {result.gridEmFactor < 20 && result.co2AvoidedTonnes < 0.2 && (
                  <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                    Note: {province}'s grid is already nearly carbon-free ({result.gridEmFactor} g CO₂e/kWh).
                    Solar here is a financial decision, not a carbon one.
                  </p>
                )}
              </div>
            )}

            {/* ── Advanced: cost override ──────────────────────────── */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-400 hover:text-yellow-400 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                  className={`shrink-0 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} aria-hidden="true">
                  <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Adjust cost &amp; incentives
              </button>
              {showAdvanced && (
                <div className="mt-3 border-l-2 border-zinc-700 pl-4 space-y-4">

                  {/* Installed cost per kW */}
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">Installed cost</p>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="number"
                        value={costPerKW}
                        min={1000}
                        max={6000}
                        step={50}
                        onChange={e => setCostPerKW(Number(e.target.value))}
                        className="w-24 bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                      <span className="text-sm text-zinc-400 font-mono">$/kW</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Default $2,800/kW covers panels, inverter, racking, labour, permits, and interconnection.
                      Quotes vary from ~$2,400/kW (competitive urban markets) to ~$3,500/kW (rural / small systems).
                    </p>
                  </div>

                  {/* Rebates & incentives */}
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">Rebates &amp; incentives</p>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="number"
                        value={incentives}
                        min={0}
                        max={50000}
                        step={500}
                        onChange={e => setIncentives(Math.max(0, Number(e.target.value)))}
                        className="w-24 bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                      <span className="text-sm text-zinc-400 font-mono">$ upfront</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Canada Greener Homes Grant (up to $5,000), provincial utility rebates, and municipal
                      programs vary by province and year. Enter the total you expect to receive.
                    </p>
                  </div>

                </div>
              )}
            </div>

          </>
        )}

        {/* Footer note */}
        <div className="border-t border-zinc-800 pt-4 flex items-end justify-between gap-4">
          <p className="text-[10px] font-mono text-zinc-600 leading-relaxed">
            Estimates based on NRCan solar resource data and provincial utility rules. Actual output depends on
            site-specific shading, exact roof angle, and equipment choice.{' '}
            {!detailHref && 'A certified installer provides a free site assessment with precise projections.'}
          </p>
          {detailHref && (
            <Link
              href={detailHref}
              className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-yellow-400/60 hover:text-yellow-400 transition-colors whitespace-nowrap"
            >
              Full tool →
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
