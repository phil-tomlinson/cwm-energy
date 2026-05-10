'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  VEHICLES, VEHICLE_ORDER, SERVICE_ITEMS,
  WEATHER_PROXY, CARBON_PROXY,
  co2PerKm, maintTotal, fmt,
} from './evData'

// ── Section header (matches HomeIQ style) ────────────────────────────────
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

// ── Stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, accent, color, sub }) {
  return (
    <div className={`border p-4 ${accent ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/60'}`}>
      <p className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 mb-2">{label}</p>
      <p className="font-mono text-2xl font-semibold leading-none mb-1" style={{ color: color || (accent ? '#34d399' : '#e4e4e7') }}>
        {value}
      </p>
      {unit && <p className="font-mono text-[11px] text-zinc-500">{unit}</p>}
      {sub  && <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">{sub}</p>}
    </div>
  )
}

// ── Vehicle card ─────────────────────────────────────────────────────────
function VehicleCard({ vehicle, co2km, isWinner, maxCO2 }) {
  const v = VEHICLES[vehicle]
  const barW = ((co2km / maxCO2) * 100).toFixed(1)
  const detail = v.type === 'ev'
    ? `${fmt(v.effKwh100km, 1)} kWh/100km`
    : `${fmt(v.fuelL100km, 1)} L/100km · 2.31 kg CO₂e/L`

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
      <p className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 mb-1">Emissions per km</p>
      <p className="font-mono text-3xl font-semibold leading-none mb-0.5" style={{ color: isWinner ? '#34d399' : '#e4e4e7' }}>
        {fmt(co2km * 1000, 1)}
      </p>
      <p className="font-mono text-[11px] text-zinc-500 mb-3">gCO₂e / km</p>
      <div className="h-1 bg-zinc-700 mb-3">
        <div className="h-full transition-all duration-500" style={{ width: `${barW}%`, background: v.color }} />
      </div>
      <p className="text-[11px] text-zinc-500 font-mono">{detail}</p>
    </div>
  )
}

// ── Breakeven card ────────────────────────────────────────────────────────
function BreakevenCard({ ev, comp, breakKm, annualKm }) {
  const evV   = VEHICLES[ev]
  const compV = VEHICLES[comp]
  const impossible = !isFinite(breakKm) || breakKm <= 0
  const tooLong    = breakKm > 400000

  return (
    <div className="border border-zinc-700 bg-zinc-800/40 p-4 border-l-2" style={{ borderLeftColor: evV.color }}>
      <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: evV.color }}>{evV.name}</p>
      <p className="text-xs font-semibold text-zinc-300 mb-3 leading-snug">vs {compV.name}</p>
      {impossible ? (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2 leading-relaxed">
          No breakeven at current grid intensity.
        </p>
      ) : tooLong ? (
        <>
          <p className="font-mono text-2xl font-semibold text-zinc-300">{fmt(Math.round(breakKm / 1000), 0)}k</p>
          <p className="font-mono text-[11px] text-zinc-500 mb-2">km</p>
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 p-2">Exceeds typical vehicle lifespan.</p>
        </>
      ) : (
        <>
          <p className="font-mono text-2xl font-semibold text-emerald-400">{fmt(Math.round(breakKm / 1000) * 1000, 0)}</p>
          <p className="font-mono text-[11px] text-zinc-500 mb-2">km to breakeven</p>
          <div className="bg-emerald-400/10 border border-emerald-400/20 p-2 text-xs text-zinc-400 leading-relaxed">
            At <span className="text-emerald-400 font-semibold">{fmt(annualKm, 0)} km/yr</span> →{' '}
            <span className="text-emerald-400 font-semibold">{fmt(breakKm / annualKm, 1)} years</span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Maintenance table ────────────────────────────────────────────────────
function MaintTable({ annualKm }) {
  const totalKm = annualKm * 10
  const vids    = VEHICLE_ORDER
  const vnames  = ['Ioniq 5', 'Mach-E LFP', 'RAV4 Gas', 'RAV4 Hybrid']

  return (
    <div className="overflow-x-auto border border-zinc-700">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-900">
            <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-500 min-w-[160px]">Service item</th>
            <th className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-500 min-w-[180px]">Notes</th>
            {vids.map((vid, i) => (
              <th key={vid} className="text-left p-3 font-mono text-[10px] uppercase tracking-widest text-zinc-500 min-w-[110px]"
                style={{ borderBottom: `2px solid ${VEHICLES[vid].color}` }}>
                {vnames[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERVICE_ITEMS.map((item, idx) => (
            <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors">
              <td className="p-3 font-semibold text-zinc-300">{item.name}</td>
              <td className="p-3 text-zinc-500">{item.note}</td>
              {vids.map(vid => {
                const s = item.vehicles[vid]
                if (!s) return <td key={vid} className="p-3 text-center text-zinc-700 font-mono">—</td>
                const tenYr = (totalKm / s.intervalKm) * s.cost
                return (
                  <td key={vid} className="p-3">
                    <span className="block font-mono text-zinc-200">${fmt(s.cost, 0)}</span>
                    <span className="block font-mono text-[10px] text-zinc-500">every {fmt(s.intervalKm / 1000, 0)}k km</span>
                    <span className="block font-mono text-[10px] text-emerald-400">${fmt(tenYr, 0)} / 10yr</span>
                  </td>
                )
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-zinc-700 bg-zinc-900">
            <td colSpan={2} className="p-3 font-bold text-zinc-300 text-xs">
              10-year total at {fmt(annualKm, 0)} km/yr
            </td>
            {vids.map(vid => (
              <td key={vid} className="p-3 font-mono font-semibold text-zinc-200">
                ${fmt(maintTotal(vid, totalKm), 0)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="text-[11px] text-zinc-600 p-3 leading-relaxed border-t border-zinc-800">
        Service intervals and costs: CAA 2023 Driving Costs &amp; Consumer Reports Annual Auto Surveys. Canadian market averages (labour + parts).
        EV brake interval reflects ~70% reduction in pad wear from regenerative braking.
        Home charger installation ($800–$2,000 one-time) and unscheduled repairs excluded.
      </p>
    </div>
  )
}

// ── Chart: Lifetime emissions ─────────────────────────────────────────────
function LifetimeChart({ grid, annualKm, chartRef }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Lifetime emissions</p>
      <h3 className="text-sm font-bold text-zinc-200 mb-1">Cumulative lifecycle CO₂e — % of gas car emissions</h3>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
        RAV4 Gas is pegged at 100% — everything else shown relative to it. EVs start above 100% (battery manufacturing debt),
        then arc down. The moment a line crosses below 100%, that vehicle has emitted less CO₂ over its life than the gas RAV4.
        Hover any year to see actual tonnes.
      </p>
      <div className="bg-zinc-900 border border-zinc-700 p-4" style={{ height: 380 }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  )
}

// ── Chart: TCO ────────────────────────────────────────────────────────────
function TCOChart({ chartRef }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Total cost of ownership</p>
      <h3 className="text-sm font-bold text-zinc-200 mb-1">Cumulative cost over 10 years — % of gas car cost</h3>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
        RAV4 Gas is 100%. EVs start above it (higher purchase price) but fuel and maintenance savings compound.
        When a line crosses below 100%, the EV has become cheaper in total. Hover to see actual dollars.
      </p>
      <div className="bg-zinc-900 border border-zinc-700 p-4" style={{ height: 380 }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  )
}

// ── Chart: Lifecycle bar ──────────────────────────────────────────────────
function LifecycleChart({ chartRef }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Cost breakdown</p>
      <h3 className="text-sm font-bold text-zinc-200 mb-1">10-year fuel + maintenance by vehicle</h3>
      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
        Fuel and energy cost on the bottom, scheduled maintenance on top.
        Full service schedule in the table below.
      </p>
      <div className="bg-zinc-900 border border-zinc-700 p-4" style={{ height: 280 }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  )
}

// ── Main calculator ───────────────────────────────────────────────────────
export default function EVCalculator() {
  const [city,       setCity]       = useState('Calgary, CA')
  const [annualKm,   setAnnualKm]   = useState(20000)
  const [elecPrice,  setElecPrice]  = useState(0.134)
  const [gasPrice,   setGasPrice]   = useState(1.50)
  const [solarPct,   setSolarPct]   = useState(0)
  const [prices,     setPrices]     = useState({ ioniq5: 59000, macheelfp: 52000, rav4: 37000, rav4h: 43000 })

  const [status,     setStatus]     = useState('idle')   // idle | loading | done | error
  const [errorMsg,   setErrorMsg]   = useState('')
  const [results,    setResults]    = useState(null)

  const chartLifetimeRef  = useRef(null)
  const chartTCORef       = useRef(null)
  const chartLifecycleRef = useRef(null)
  const chartInstances    = useRef({})

  // ── Destroy old charts before re-drawing ──────────────────────────────
  function destroyCharts() {
    Object.values(chartInstances.current).forEach(c => c?.destroy())
    chartInstances.current = {}
  }

  // ── Draw charts with Chart.js ──────────────────────────────────────────
  async function drawCharts(grid, effectiveGrid, annKm, annualCosts, vehiclePrices) {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    destroyCharts()

    const TICK_COLOR  = '#71717a'
    const GRID_COLOR  = '#27272a'
    const FONT        = 'ui-monospace, monospace'

    const baseScales = {
      x: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } } },
      y: { grid: { color: GRID_COLOR }, ticks: { color: TICK_COLOR, font: { family: FONT, size: 11 } } },
    }

    const baseTooltip = {
      backgroundColor: '#18181b',
      borderColor:     '#3f3f46',
      borderWidth:     1,
      titleColor:      '#e4e4e7',
      bodyColor:       '#a1a1aa',
      titleFont:       { family: FONT, weight: '600', size: 12 },
      bodyFont:        { family: FONT, size: 11 },
      padding:         10,
    }

    // ── 1. Lifetime emissions (% of RAV4 Gas) ──
    const maxYears = 10
    const years    = Array.from({ length: maxYears + 1 }, (_, i) => i === 0 ? '0' : `Yr ${i}`)

    const c2km = {
      ioniq5:    co2PerKm(VEHICLES.ioniq5,    effectiveGrid),
      macheelfp: co2PerKm(VEHICLES.macheelfp, effectiveGrid),
      rav4:      co2PerKm(VEHICLES.rav4,      grid),
      rav4h:     co2PerKm(VEHICLES.rav4h,     grid),
    }

    const lifetimePct = vid => Array.from({ length: maxYears + 1 }, (_, yr) => {
      const km    = yr * annKm
      const base  = VEHICLES.rav4.mfgKgCO2e + c2km.rav4 * km
      const safe  = base > 0 ? base : VEHICLES.rav4.mfgKgCO2e + c2km.rav4 * annKm * 0.001
      return ((VEHICLES[vid].mfgKgCO2e + c2km[vid] * km) / safe) * 100
    })

    const rav4Tonnes = Array.from({ length: maxYears + 1 }, (_, yr) =>
      (VEHICLES.rav4.mfgKgCO2e + c2km.rav4 * yr * annKm) / 1000
    )

    const lineDs = (vid, label, dash = []) => ({
      label,
      data:        vid === 'rav4' ? years.map(() => 100) : lifetimePct(vid),
      borderColor: VEHICLES[vid].color,
      borderWidth: vid === 'rav4' ? 3 : 2.5,
      borderDash:  dash,
      pointRadius: 0,
      fill:        false,
      tension:     0.08,
    })

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
        ctx.font = `600 10px ${FONT}`
        ctx.fillStyle = refColor
        ctx.textAlign = 'left'
        ctx.fillText('100% — RAV4 Gas baseline', x.left + 6, y100 - 6)
        ctx.font = `500 9px ${FONT}`
        ctx.fillStyle = 'rgba(251,146,60,0.6)'
        ctx.textAlign = 'right'
        ctx.fillText(aboveLabel, x.right - 6, y.top + 14)
        ctx.fillStyle = 'rgba(52,211,153,0.7)'
        ctx.fillText(belowLabel, x.right - 6, y.bottom - 6)
        ctx.restore()
      },
    })

    if (chartLifetimeRef.current) {
      chartInstances.current.lifetime = new Chart(chartLifetimeRef.current, {
        type: 'line',
        plugins: [zonePlugin('above baseline (more CO₂ than gas car so far)', 'below baseline (less CO₂ than gas car so far)', VEHICLES.rav4.color)],
        data: {
          labels: years,
          datasets: [
            lineDs('rav4',      'RAV4 Gas (100% baseline)'),
            lineDs('rav4h',     'RAV4 Hybrid', [5, 3]),
            lineDs('ioniq5',    'Ioniq 5 (NMC)'),
            lineDs('macheelfp', 'Mach-E (LFP)'),
          ],
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
                  const yr   = ctx.dataIndex
                  const gasT = rav4Tonnes[yr]
                  const evT  = (ctx.parsed.y / 100) * gasT
                  if (ctx.datasetIndex === 0) return ` RAV4 Gas: ${fmt(gasT, 1)} t CO₂e (baseline)`
                  const saving = gasT - evT
                  return ` ${ctx.dataset.label}: ${fmt(evT, 1)} t — ${saving >= 0 ? 'saves' : 'owes'} ${fmt(Math.abs(saving), 1)} t vs gas`
                },
              },
            },
          },
          scales: {
            x: { ...baseScales.x, title: { display: true, text: 'years of ownership', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
            y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: v => `${v.toFixed(0)}%` }, title: { display: true, text: '% of RAV4 Gas cumulative CO₂e', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
          },
        },
      })
    }

    // ── 2. TCO chart ──
    const annMaint = {
      ioniq5:    maintTotal('ioniq5',    annKm),
      macheelfp: maintTotal('macheelfp', annKm),
      rav4:      maintTotal('rav4',      annKm),
      rav4h:     maintTotal('rav4h',     annKm),
    }

    const cumCost = (vid, fuelAnnual, price) =>
      Array.from({ length: maxYears + 1 }, (_, yr) => price + yr * (fuelAnnual + annMaint[vid]))

    const rav4Raw   = cumCost('rav4',      annualCosts.rav4,  vehiclePrices.rav4)
    const rav4hRaw  = cumCost('rav4h',     annualCosts.rav4h, vehiclePrices.rav4h)
    const ioniqRaw  = cumCost('ioniq5',    annualCosts.ioniq, vehiclePrices.ioniq5)
    const macheRaw  = cumCost('macheelfp', annualCosts.mache, vehiclePrices.macheelfp)

    const toPct = raw => raw.map((v, i) => (v / rav4Raw[i]) * 100)

    if (chartTCORef.current) {
      chartInstances.current.tco = new Chart(chartTCORef.current, {
        type: 'line',
        plugins: [zonePlugin('above baseline (higher total cost than gas car so far)', 'below baseline (lower total cost than gas car so far)', VEHICLES.rav4.color)],
        data: {
          labels: years,
          datasets: [
            { label: 'RAV4 Gas (100% baseline)', data: years.map(() => 100), borderColor: VEHICLES.rav4.color, borderWidth: 3, pointRadius: 0, fill: false, tension: 0 },
            { label: 'RAV4 Hybrid',  data: toPct(rav4hRaw), borderColor: VEHICLES.rav4h.color, borderWidth: 2, borderDash: [5,3], pointRadius: 0, fill: false, tension: 0.08 },
            { label: 'Ioniq 5 (NMC)', data: toPct(ioniqRaw), borderColor: VEHICLES.ioniq5.color,    borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.08 },
            { label: 'Mach-E (LFP)', data: toPct(macheRaw), borderColor: VEHICLES.macheelfp.color, borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.08 },
          ],
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
                  const gasAmt = rav4Raw[yr]
                  const amt    = (ctx.parsed.y / 100) * gasAmt
                  if (ctx.datasetIndex === 0) return ` RAV4 Gas: $${fmt(gasAmt, 0)} total (baseline)`
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
            y: { ...baseScales.y, ticks: { ...baseScales.y.ticks, callback: v => `${v.toFixed(0)}%` }, title: { display: true, text: '% of RAV4 Gas cumulative cost', color: TICK_COLOR, font: { family: FONT, size: 11 } } },
          },
        },
      })
    }

    // ── 3. Lifecycle bar chart ──
    const yrs      = 10
    const totalKm  = annKm * yrs
    const fuelTots = [annualCosts.ioniq * yrs, annualCosts.mache * yrs, annualCosts.rav4 * yrs, annualCosts.rav4h * yrs]
    const maintTots= VEHICLE_ORDER.map(vid => maintTotal(vid, totalKm))
    const barColors     = VEHICLE_ORDER.map(vid => VEHICLES[vid].color)
    const barColorsMuted= VEHICLE_ORDER.map(vid => VEHICLES[vid].colorMuted)

    if (chartLifecycleRef.current) {
      chartInstances.current.lifecycle = new Chart(chartLifecycleRef.current, {
        type: 'bar',
        data: {
          labels: ['Ioniq 5', 'Mach-E LFP', 'RAV4 Gas', 'RAV4 Hybrid'],
          datasets: [
            { label: 'Fuel / energy', data: fuelTots,  backgroundColor: barColors,      borderWidth: 0, borderRadius: 0 },
            { label: 'Maintenance',   data: maintTots,  backgroundColor: barColorsMuted, borderColor: barColors, borderWidth: 1.5, borderRadius: { topLeft: 2, topRight: 2 } },
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

  // ── Run comparison ────────────────────────────────────────────────────
  const runComparison = useCallback(async () => {
    if (!city.trim()) return
    setStatus('loading')
    setResults(null)
    destroyCharts()

    try {
      const wRes = await fetch(`${WEATHER_PROXY}/?q=${encodeURIComponent(city)}`)
      if (!wRes.ok) throw new Error(`City not found: "${city}". Try adding a country code, e.g. "Calgary, CA".`)
      const w = await wRes.json()

      const cRes = await fetch(`${CARBON_PROXY}/?lat=${w.coord.lat}&lon=${w.coord.lon}`)
      const c    = await cRes.json()
      const grid = c.carbonIntensity

      const solarFrac      = solarPct / 100
      const effectiveGrid  = grid * (1 - solarFrac)
      const effectivePrice = elecPrice * (1 - solarFrac)

      const annualCosts = {
        ioniq: annualKm * (VEHICLES.ioniq5.effKwh100km    / 100) * effectivePrice,
        mache: annualKm * (VEHICLES.macheelfp.effKwh100km / 100) * effectivePrice,
        rav4:  annualKm * (VEHICLES.rav4.fuelL100km       / 100) * gasPrice,
        rav4h: annualKm * (VEHICLES.rav4h.fuelL100km      / 100) * gasPrice,
      }

      const c2km = {
        ioniq5:    co2PerKm(VEHICLES.ioniq5,    effectiveGrid),
        macheelfp: co2PerKm(VEHICLES.macheelfp, effectiveGrid),
        rav4:      co2PerKm(VEHICLES.rav4,      grid),
        rav4h:     co2PerKm(VEHICLES.rav4h,     grid),
      }

      function breakeven(evId, compId) {
        const diff = VEHICLES[evId].mfgKgCO2e - VEHICLES[compId].mfgKgCO2e
        const gain = c2km[compId] - c2km[evId]
        return gain > 0 ? diff / gain : Infinity
      }

      const totalKm10 = annualKm * 10
      const lc = id => annualCosts[id === 'ioniq5' ? 'ioniq' : id === 'macheelfp' ? 'mache' : id] * 10 + maintTotal(id, totalKm10)

      setResults({
        grid, effectiveGrid, effectivePrice,
        cityName: w.name, country: w.sys.country,
        c2km, annualCosts,
        lc: { ioniq5: lc('ioniq5'), macheelfp: lc('macheelfp'), rav4: lc('rav4'), rav4h: lc('rav4h') },
        breakeven: {
          ioniqVsRav4:  breakeven('ioniq5',    'rav4'),
          ioniqVsRav4h: breakeven('ioniq5',    'rav4h'),
          macheVsRav4:  breakeven('macheelfp', 'rav4'),
          macheVsRav4h: breakeven('macheelfp', 'rav4h'),
        },
        solarPct,
      })
      setStatus('done')

      // Draw charts after state + DOM update
      setTimeout(() => drawCharts(grid, effectiveGrid, annualKm, annualCosts, prices), 50)
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }, [city, annualKm, elecPrice, gasPrice, solarPct, prices])

  // Re-render charts when inputs change (if results already loaded)
  useEffect(() => {
    if (status !== 'done' || !results) return
    const { grid, effectiveGrid, annualCosts } = results
    destroyCharts()
    setTimeout(() => drawCharts(grid, effectiveGrid, annualKm, annualCosts, prices), 50)
  }, [annualKm, elecPrice, gasPrice, solarPct, prices])

  useEffect(() => () => destroyCharts(), [])

  // ── Render ────────────────────────────────────────────────────────────
  const r = results

  return (
    <div className="space-y-0">

      {/* Intro */}
      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
        EVs cost more to manufacture than gas cars — the battery is responsible for most of that gap, and we don't hide it.
        But lower running emissions and a fraction of the fuel cost mean that debt gets paid back.
        How quickly depends on where you live, how much you drive, and how clean your grid is.
      </p>

      {/* ── Form ── */}
      <div className="border border-zinc-700 bg-zinc-800/40 p-5 space-y-5">

        {/* City + button */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Your city</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runComparison()}
              className="flex-1 bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors"
              placeholder="Calgary, CA"
            />
            <button
              onClick={runComparison}
              disabled={status === 'loading'}
              className="bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-widest px-5 py-2 hover:bg-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'loading' ? 'Loading…' : 'Run comparison →'}
            </button>
          </div>
        </div>

        {/* Row 2: km / elec / gas */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Annual driving', unit: 'km/year', id: 'km',   value: annualKm,  set: v => setAnnualKm(v),  step: 1000, min: 1000, max: 100000 },
            { label: 'Electricity rate', unit: '$/kWh',  id: 'elec', value: elecPrice, set: v => setElecPrice(v), step: 0.005, min: 0.05, max: 0.50 },
            { label: 'Gas price',       unit: '$/L',     id: 'gas',  value: gasPrice,  set: v => setGasPrice(v),  step: 0.05, min: 0.80, max: 3.00 },
          ].map(({ label, unit, id, value, set, step, min, max }) => (
            <div key={id}>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                {label} <span className="normal-case opacity-70">({unit})</span>
              </label>
              <input
                type="number"
                value={value}
                step={step}
                min={min}
                max={max}
                onChange={e => set(parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Solar slider */}
        <div className="border-t border-zinc-700 pt-4">
          <div className="flex items-center gap-4">
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 whitespace-nowrap min-w-[240px]">
              Home solar charging <span className="normal-case opacity-70">(% from panels)</span>
            </label>
            <input
              type="range"
              min={0} max={100} step={5}
              value={solarPct}
              onChange={e => setSolarPct(Number(e.target.value))}
              className="flex-1 accent-emerald-400"
            />
            <span className="font-mono text-emerald-400 text-sm font-semibold min-w-[36px] text-right">{solarPct}%</span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
            Solar charging is treated as 0 gCO₂e/kWh and $0/kWh — reduces both operational emissions and fuel cost proportionally.
          </p>
        </div>

        {/* Vehicle prices */}
        <div className="border-t border-zinc-700 pt-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
            Purchase prices <span className="normal-case opacity-70">(pre-incentive MSRP, $CAD)</span>
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'ioniq5',    label: 'Ioniq 5 AWD LR' },
              { key: 'macheelfp', label: 'Mach-E SR RWD' },
              { key: 'rav4',      label: 'RAV4 AWD' },
              { key: 'rav4h',     label: 'RAV4 Hybrid AWD' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block font-mono text-[10px] text-zinc-500 mb-1">{label}</label>
                <input
                  type="number"
                  value={prices[key]}
                  step={500}
                  min={20000}
                  max={150000}
                  onChange={e => setPrices(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                  className="w-full bg-zinc-900 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status ── */}
      {status === 'loading' && (
        <div className="flex items-center gap-3 py-10 justify-center text-zinc-500 text-sm font-mono">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
          Fetching grid data…
        </div>
      )}
      {status === 'error' && (
        <div className="border border-red-400/30 bg-red-400/5 text-red-400 text-sm p-4 mt-4 font-mono">{errorMsg}</div>
      )}

      {/* ── Results ── */}
      {status === 'done' && r && (() => {
        const co2vals   = VEHICLE_ORDER.map(vid => r.c2km[vid])
        const minCO2    = Math.min(...co2vals)
        const maxCO2    = Math.max(...co2vals)
        const minCost   = Math.min(r.annualCosts.ioniq, r.annualCosts.mache, r.annualCosts.rav4, r.annualCosts.rav4h)
        const minLC     = Math.min(...Object.values(r.lc))
        const bestEVlc  = Math.min(r.lc.ioniq5, r.lc.macheelfp)
        const annMaintMap = { ioniq5: r.annualCosts.ioniq, macheelfp: r.annualCosts.mache, rav4: r.annualCosts.rav4, rav4h: r.annualCosts.rav4h }

        return (
          <>
            {/* 01 — Right now */}
            <SectionHeader num="01 — Right now" title="How do these vehicles compare on your grid today?" />
            <div className="bg-emerald-400/5 border border-emerald-400/20 px-4 py-2 flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-zinc-400 mt-4 mb-4">
              <span><span className="text-emerald-400 font-semibold">{r.cityName}, {r.country}</span></span>
              <span>Grid: <span className="text-emerald-400 font-semibold">{Math.round(r.grid)} gCO₂e/kWh</span></span>
              {r.solarPct > 0 && <span>EV effective: <span className="text-emerald-400 font-semibold">{Math.round(r.effectiveGrid)} gCO₂e/kWh</span> ({r.solarPct}% solar)</span>}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {VEHICLE_ORDER.map(vid => (
                <VehicleCard key={vid} vehicle={vid} co2km={r.c2km[vid]} isWinner={r.c2km[vid] === minCO2} maxCO2={maxCO2} />
              ))}
            </div>

            {/* 02 — Carbon debt */}
            <SectionHeader num="02 — Carbon" title="The manufacturing debt — and when it gets paid off" />
            <p className="text-xs text-zinc-500 mt-4 mb-5 leading-relaxed">
              Every EV arrives with a CO₂ bill already run up. The Ioniq 5's NMC pack starts life owing about 14.5 tonnes.
              The Mach-E's LFP battery skips the cobalt and nickel and comes in around 11.7 tonnes. Both are more than a gas RAV4, but the gap closes kilometre by kilometre.
            </p>

            {/* Manufacturing bar */}
            <div className="border border-zinc-700 bg-zinc-800/40 p-5 mb-4">
              {VEHICLE_ORDER.map(vid => {
                const v   = VEHICLES[vid]
                const pct = (v.mfgKgCO2e / 14500 * 100).toFixed(1)
                return (
                  <div key={vid} className="grid grid-cols-[200px_1fr_60px_100px] items-center gap-3 mb-4 last:mb-1">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: v.color }}>{v.name}</p>
                      <p className="text-[11px] text-zinc-500">{v.sub}</p>
                    </div>
                    <div className="h-3 bg-zinc-700">
                      <div className="h-full" style={{ width: `${pct}%`, background: v.color }} />
                    </div>
                    <p className="font-mono text-sm text-zinc-200 text-right">{fmt(v.mfgKgCO2e / 1000, 1)}t</p>
                    <p className="font-mono text-[10px] text-zinc-500 text-right">
                      {v.batteryMfgKgCO2e > 0 ? `battery: ${fmt(v.batteryMfgKgCO2e / 1000, 1)}t` : 'no traction battery'}
                    </p>
                  </div>
                )
              })}
              <p className="text-[11px] text-zinc-600 mt-4 pt-4 border-t border-zinc-700 leading-relaxed">
                Manufacturing CO₂e from GREET 2023 (Argonne National Lab). NMC811 ~84 kg CO₂e/kWh · LFP ~52 kg CO₂e/kWh. Lifecycle averages; actual values vary by production location.
              </p>
            </div>

            {/* Debt cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { ev: 'ioniq5', comp: 'rav4' }, { ev: 'ioniq5', comp: 'rav4h' },
                { ev: 'macheelfp', comp: 'rav4' }, { ev: 'macheelfp', comp: 'rav4h' },
              ].map(({ ev, comp }) => {
                const debt = VEHICLES[ev].mfgKgCO2e - VEHICLES[comp].mfgKgCO2e
                return (
                  <div key={`${ev}-${comp}`} className="border border-zinc-700 border-l-2 p-4 bg-zinc-800/40" style={{ borderLeftColor: '#c9a84c' }}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-amber-400 mb-1">Carbon debt</p>
                    <p className="text-xs font-semibold text-zinc-300 mb-3 leading-snug min-h-[2.4em]">
                      {VEHICLES[ev].name} vs {VEHICLES[comp].name}
                    </p>
                    <p className="font-mono text-2xl font-semibold mb-0.5" style={{ color: debt > 3000 ? '#c9a84c' : '#34d399' }}>
                      {debt > 0 ? '+' : ''}{fmt(debt / 1000, 1)}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500 mb-3">tonnes CO₂e at manufacture</p>
                    <div className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-700 pt-3">
                      {VEHICLES[ev].name}: <span className="text-zinc-300 font-mono">{fmt(VEHICLES[ev].mfgKgCO2e / 1000, 1)}t</span><br />
                      {VEHICLES[comp].name}: <span className="text-zinc-300 font-mono">{fmt(VEHICLES[comp].mfgKgCO2e / 1000, 1)}t</span><br />
                      Battery: <span className="text-zinc-300">{ev === 'macheelfp' ? 'LFP — no Co/Ni' : 'NMC811'}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Breakeven */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Breakeven — when the debt is paid off</p>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              The point at which the EV's lower driving emissions have fully offset the manufacturing premium.
              Everything beyond this is ahead of the gas car on a lifetime basis.
            </p>
            <div className="grid grid-cols-4 gap-3 mb-2">
              <BreakevenCard ev="ioniq5"    comp="rav4"  breakKm={r.breakeven.ioniqVsRav4}  annualKm={annualKm} />
              <BreakevenCard ev="ioniq5"    comp="rav4h" breakKm={r.breakeven.ioniqVsRav4h} annualKm={annualKm} />
              <BreakevenCard ev="macheelfp" comp="rav4"  breakKm={r.breakeven.macheVsRav4}  annualKm={annualKm} />
              <BreakevenCard ev="macheelfp" comp="rav4h" breakKm={r.breakeven.macheVsRav4h} annualKm={annualKm} />
            </div>

            {/* Lifetime emissions chart */}
            <div className="mt-8 mb-2">
              <LifetimeChart grid={r.grid} annualKm={annualKm} chartRef={chartLifetimeRef} />
            </div>

            {/* 03 — Economics */}
            <SectionHeader num="03 — Economics" title="What does it actually cost to own and run each vehicle?" />

            {/* Annual savings */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-5 mb-2">
              Annual savings at {fmt(annualKm, 0)} km/year
            </p>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Year-on-year CO₂ and fuel cost savings vs the gas RAV4.
            </p>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <StatCard label="Ioniq 5 — CO₂ saved vs RAV4" value={fmt((r.c2km.rav4 - r.c2km.ioniq5) * annualKm / 1000, 2)} unit="tonnes / year" accent color={VEHICLES.ioniq5.color} />
              <StatCard label="Mach-E — CO₂ saved vs RAV4"  value={fmt((r.c2km.rav4 - r.c2km.macheelfp) * annualKm / 1000, 2)} unit="tonnes / year" accent color={VEHICLES.macheelfp.color} />
              <StatCard label="Ioniq 5 — fuel saved vs RAV4" value={`$${fmt(r.annualCosts.rav4 - r.annualCosts.ioniq, 0)}`} unit="/ year in fuel" color={VEHICLES.ioniq5.color} />
              <StatCard label="Mach-E — fuel saved vs RAV4"  value={`$${fmt(r.annualCosts.rav4 - r.annualCosts.mache, 0)}`} unit="/ year in fuel" color={VEHICLES.macheelfp.color} />
            </div>

            {/* Annual fuel cost */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Annual fuel &amp; energy costs</p>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">What you're paying every year just to move.</p>
            <div className="grid grid-cols-4 gap-3 mb-2">
              {[
                { vid: 'ioniq5',    cost: r.annualCosts.ioniq,  detail: `${fmt(VEHICLES.ioniq5.effKwh100km, 1)} kWh/100km × $${r.effectivePrice.toFixed(3)}/kWh${solarPct > 0 ? ' (solar adj.)' : ''}` },
                { vid: 'macheelfp', cost: r.annualCosts.mache,  detail: `${fmt(VEHICLES.macheelfp.effKwh100km, 1)} kWh/100km × $${r.effectivePrice.toFixed(3)}/kWh${solarPct > 0 ? ' (solar adj.)' : ''}` },
                { vid: 'rav4',      cost: r.annualCosts.rav4,   detail: `${fmt(VEHICLES.rav4.fuelL100km, 1)} L/100km × $${gasPrice.toFixed(2)}/L` },
                { vid: 'rav4h',     cost: r.annualCosts.rav4h,  detail: `${fmt(VEHICLES.rav4h.fuelL100km, 1)} L/100km × $${gasPrice.toFixed(2)}/L` },
              ].map(({ vid, cost, detail }) => (
                <div key={vid} className={`border p-4 ${cost === minCost ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-0.5 h-4 self-stretch" style={{ background: VEHICLES[vid].color }} />
                    <p className="text-xs font-semibold text-zinc-300">{VEHICLES[vid].name}</p>
                  </div>
                  <p className="font-mono text-2xl font-semibold mb-0.5" style={{ color: cost === minCost ? '#34d399' : '#e4e4e7' }}>
                    ${fmt(cost, 0)}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500 mb-3">per year in fuel / energy</p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">{detail}<br />{fmt(annualKm, 0)} km/year</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 mb-6 leading-relaxed">
              Fuel and electricity costs only. See lifecycle analysis below for maintenance savings.
              {solarPct > 0 && ` Solar charging applied: ${solarPct}% of EV electricity at $0/kWh.`}
            </p>

            {/* TCO chart */}
            <div className="mt-6 mb-8">
              <TCOChart chartRef={chartTCORef} />
            </div>

            {/* 10-year lifecycle */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-6 mb-2">10-year running costs — fuel + maintenance</p>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              What it actually costs to keep each vehicle on the road for a decade.
              Service intervals from manufacturer manuals, parts at Canadian shop averages.
              Purchase price, insurance, financing, and surprise repairs excluded.
            </p>
            <div className="grid grid-cols-[repeat(4,1fr)_repeat(2,1fr)] gap-3 mb-4">
              {VEHICLE_ORDER.map(vid => {
                const lcVal = r.lc[vid]
                const fuelVal = annMaintMap[vid] * 10
                const maintVal = maintTotal(vid, annualKm * 10)
                return (
                  <div key={vid} className={`border p-4 ${lcVal === minLC ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 bg-zinc-800/40'}`}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-0.5 h-3" style={{ background: VEHICLES[vid].color }} />
                      <p className="text-[10px] font-mono text-zinc-400">{VEHICLES[vid].name}</p>
                    </div>
                    <p className="font-mono text-xl font-semibold mb-0.5" style={{ color: lcVal === minLC ? '#34d399' : '#e4e4e7' }}>
                      ${fmt(lcVal, 0)}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500 mb-3">10-yr fuel + maintenance</p>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Fuel: ${fmt(fuelVal, 0)}<br />Maintenance: ${fmt(maintVal, 0)}
                    </p>
                  </div>
                )
              })}
              <div className="border border-emerald-400/30 bg-emerald-400/5 p-4">
                <p className="font-mono text-[10px] text-zinc-500 mb-2">Best EV saves vs RAV4 Gas (10 yr)</p>
                <p className="font-mono text-xl font-semibold text-emerald-400 mb-0.5">${fmt(r.lc.rav4 - bestEVlc, 0)}</p>
                <p className="font-mono text-[10px] text-zinc-500">fuel + maintenance savings</p>
                <p className="text-[11px] text-zinc-600 mt-2">~${fmt((r.lc.rav4 - bestEVlc) / 10, 0)}/year avg</p>
              </div>
              <div className="border border-emerald-400/30 bg-emerald-400/5 p-4">
                <p className="font-mono text-[10px] text-zinc-500 mb-2">Best EV saves vs RAV4 Hybrid (10 yr)</p>
                <p className="font-mono text-xl font-semibold text-emerald-400 mb-0.5">${fmt(r.lc.rav4h - bestEVlc, 0)}</p>
                <p className="font-mono text-[10px] text-zinc-500">fuel + maintenance savings</p>
                <p className="text-[11px] text-zinc-600 mt-2">~${fmt((r.lc.rav4h - bestEVlc) / 10, 0)}/year avg</p>
              </div>
            </div>

            <LifecycleChart chartRef={chartLifecycleRef} />
            <div className="mt-6">
              <MaintTable annualKm={annualKm} />
            </div>
          </>
        )
      })()}

      {/* ── Explainer ── */}
      <div className="border-t border-zinc-800 mt-12 pt-10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">Behind the numbers</p>
        <h2 className="text-lg font-black text-zinc-100 tracking-tight mb-6">What this tool is actually measuring — and why it matters</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: "Yes, EVs start with a carbon debt. Here's why.",
              body: "Building a battery is energy-intensive work. Mining lithium, cobalt, and nickel; refining them; assembling cells; shipping everything from Korea or Georgia — it all adds up. The Ioniq 5's 77.4 kWh NMC pack alone is responsible for roughly 6,500 kg CO₂e before the car turns a wheel. Add the rest of the vehicle, and you're looking at about 14,500 kg CO₂e total, versus ~8,500 kg for a gas RAV4. The interesting question isn't whether EVs have a manufacturing penalty — it's how long it takes to pay it off." },
            { title: "Why Quebec and Alberta get very different answers",
              body: "An EV's driving emissions are entirely a function of the electricity it consumes. In Quebec (grid ~28 gCO₂e/kWh), an Ioniq 5 emits roughly 5 g CO₂e/km — bicycle territory. In Alberta (~385 gCO₂e/kWh on a typical day), the same car emits around 68 g/km. Both are still below a gas RAV4's ~243 g/km, but the EV's advantage is a lot thinner on a gas-heavy grid. This tool fetches live data, so you're looking at today's grid mix." },
            { title: "LFP vs NMC — not all batteries are created equal",
              body: "The Ioniq 5 uses NMC811 chemistry — energy-dense but expensive to produce in CO₂ terms because cobalt and nickel are resource-intensive. GREET 2023 puts NMC811 at roughly 84 kg CO₂e per kWh. The Mach-E Standard Range uses LFP cells from CATL — no cobalt, no nickel. GREET puts LFP at roughly 52 kg CO₂e/kWh. On a 72 kWh pack that's about 2,760 kg CO₂e less — enough to shorten the emissions breakeven by years in Alberta." },
            { title: "The hybrid sits in an interesting middle ground",
              body: "Hybrids cost only slightly more to manufacture than a pure ICE vehicle — the small NiMH battery adds maybe 700 kg CO₂e vs. the Ioniq 5's 6,000 kg premium. But their fuel economy, while impressive, still involves burning petrol. On a very dirty grid, the RAV4 Hybrid can be the lowest-emissions option. When the EV's per-km emissions get close to the hybrid's, the manufacturing debt may never fully pay off within the vehicle's lifetime. We show that rather than paper over it." },
            { title: "What we're not capturing — and why you should still care",
              body: "Manufacturing emissions here are GREET 2023 averages. The actual number depends on which factory built the car and what energy mix that grid runs on. We also haven't modelled battery degradation, end-of-life recycling credits, upstream methane from gas extraction, or the difference between average and marginal grid emissions. For a well-grounded real-world estimate, this tool is the right level of detail. For a definitive answer specific to your situation, you'd want a full lifecycle assessment." },
            { title: "Spotted something wrong? Tell us.",
              body: "Lifecycle analysis is genuinely tricky, battery manufacturing data improves every year, and new model specs come out constantly. If you think a number is off, a key variable is missing, or a comparison vehicle would serve this better — we want to hear it.",
              cta: true },
          ].map(({ title, body, cta }) => (
            <div key={title} className="border border-zinc-800 bg-zinc-900/60 p-5">
              <h3 className="text-sm font-bold text-zinc-200 mb-3 leading-snug">{title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
              {cta && (
                <a href="mailto:info@cwmenergy.ca" className="inline-block mt-4 text-xs font-bold text-emerald-400 border border-emerald-400/30 px-4 py-2 hover:bg-emerald-400 hover:text-zinc-950 transition-colors">
                  Send feedback →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Sources ── */}
      <div className="border-t border-zinc-800 pt-8 mt-8">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-4">Where the numbers come from</h3>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
          {[
            'CAA 2023 Driving Costs — maintenance estimates by vehicle type',
            'Consumer Reports Annual Auto Surveys — EV vs ICE reliability & service costs',
            'GREET 2023 — Argonne National Lab, vehicle cycle emissions & battery manufacturing',
            'GREET 2023 — NMC811: ~84 kg CO₂e/kWh · LFP: ~52 kg CO₂e/kWh',
            'EPA fuel economy ratings — Ioniq 5 AWD LR, Mach-E SR RWD LFP, RAV4, RAV4 Hybrid',
            'Natural Resources Canada — fuel consumption guide & CO₂ factors',
            'Electricity Maps — live grid carbon intensity by location',
            'OpenWeatherMap — city location lookup',
            'IPCC AR5 — lifecycle CO₂e emission factors for gasoline (2.31 kg/L)',
            'ICCT (2021) — Lifecycle emissions comparison, North America',
          ].map(s => (
            <li key={s} className="text-[11px] text-zinc-500 leading-relaxed pl-4 relative before:absolute before:left-0 before:text-emerald-400 before:content-['—']">
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Transparency ── */}
      <div className="border-t border-zinc-800 pt-8 mt-8 grid grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-3">We're not here to sell you an EV</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            CWM Energy does clean energy consulting. We think EVs are a meaningful part of decarbonizing transportation.
            We also think the case for them is strong enough that it doesn't need exaggerating — and that showing inconvenient truths
            (manufacturing debt, grid dependency, longer breakevens in Alberta) builds more trust than hiding them.
            Every number is derived from a published source or manufacturer data.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-3">A few things worth noting</h3>
          <ul className="text-xs text-zinc-500 leading-relaxed space-y-2 list-none">
            <li><span className="text-zinc-300 font-semibold">Averages, not actuals:</span> Manufacturing emissions are industry-average figures from lifecycle models. Your specific vehicle, built in a specific factory on a specific day, will vary.</li>
            <li><span className="text-zinc-300 font-semibold">Live data is a snapshot:</span> Grid carbon intensity changes hour by hour. Annual averages tell a more complete story.</li>
            <li><span className="text-zinc-300 font-semibold">Not financial advice:</span> Buying a car involves financing, resale value, insurance, and a dozen other things this tool doesn't model.</li>
          </ul>
        </div>
      </div>

    </div>
  )
}
