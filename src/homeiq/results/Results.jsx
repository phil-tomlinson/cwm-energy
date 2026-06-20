'use client'
import { useState } from 'react'
import Link from 'next/link'
import Card from '../ui/Card'
import Button from '../ui/Button'
import HeatLossChart from './HeatLossChart'
import RecommendationsList from './RecommendationsList'
import { compareRecs, BUILDING_SCOPE_IDS } from '@/calculations/recommendations'
import EnergyPricePanel from '@/components/EnergyPricePanel'
import HouseDiagram from '@/homeiq/diagrams/HouseDiagram'
import DiveDeeper from '@/components/DiveDeeper'
import Disclaimer from '@/components/Disclaimer'

function StatCard({ value, unit, label, sub }) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 p-5 text-center">
      <p className="text-3xl font-black text-emerald-400 font-mono">
        {value}<span className="text-lg font-normal text-zinc-400 ml-1">{unit}</span>
      </p>
      <p className="text-sm font-medium text-zinc-300 mt-1">{label}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Results({ results, onReset }) {
  const { heatLoss, waterHeater, recommendations, inputs } = results
  const city     = inputs.city
  const province = inputs.province
  const isSimple = inputs.mode === 'simple'

  // High-density residential: split recommendations into what the occupant can
  // act on inside their unit vs. building-wide (strata / common-element) work.
  const isApartment   = inputs.houseType === 'apartment'
  const buildingRecs  = isApartment ? recommendations.filter(r =>  BUILDING_SCOPE_IDS.has(r.id)) : []
  const ownRecs       = isApartment ? recommendations.filter(r => !BUILDING_SCOPE_IDS.has(r.id)) : recommendations

  const totalAnnualCost = heatLoss.annualCost + waterHeater.annualCost
  const totalEnergyGJ   = heatLoss.annualFuelGJ + waterHeater.inputEnergyGJ

  // ── Priority toggle (bills vs carbon) ───────────────────────────────────
  const [priority, setPriority] = useState(() => {
    try { return localStorage.getItem('homeiq-priority') ?? 'bills' }
    catch { return 'bills' }
  })

  function changePriority(p) {
    setPriority(p)
    try { localStorage.setItem('homeiq-priority', p) } catch {}
  }

  // ── "Mark as done" state ─────────────────────────────────────────────────
  const [doneIds, setDoneIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('homeiq-completed') ?? '[]') }
    catch { return [] }
  })

  function toggleDone(id) {
    setDoneIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try { localStorage.setItem('homeiq-completed', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // ── Plan selection ────────────────────────────────────────────────────────
  // Mutually exclusive alternatives — selecting one removes the other from plan
  const EXCLUSIVE_ALTS = {
    furnaceUpgrade:     'heatPump',
    heatPump:           'furnaceUpgrade',
    waterHeaterUpgrade: 'hpwh',
    hpwh:               'waterHeaterUpgrade',
  }

  const [planSelected, setPlanSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cwm_plan_selected_recs') ?? '[]') }
    catch { return [] }
  })

  function addToPlan(recId) {
    const alt = EXCLUSIVE_ALTS[recId]
    setPlanSelected(prev => {
      let next = alt ? prev.filter(id => id !== alt) : [...prev]
      next = next.includes(recId) ? next.filter(id => id !== recId) : [...next, recId]
      try {
        localStorage.setItem('cwm_plan_selected_recs', JSON.stringify(next))
        localStorage.setItem('cwm_homeiq', JSON.stringify(results))
      } catch {}
      return next
    })
  }

  const activeRecs = ownRecs.filter(r => !doneIds.includes(r.id))
  const doneRecs   = ownRecs.filter(r =>  doneIds.includes(r.id))

  // Top rec respects the active priority
  const sortedActive = [...activeRecs].sort(compareRecs(priority))
  const topRec = sortedActive[0]

  const paybackText = topRec?.paybackYears < 1
    ? 'less than a year'
    : `about ${Math.round(topRec?.paybackYears)} year${Math.round(topRec?.paybackYears) === 1 ? '' : 's'}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono mb-0.5">Analysis complete</p>
          <h2 className="text-2xl font-black tracking-tight text-zinc-100">Your Results</h2>
          <p className="text-sm text-zinc-400">{city}, {province} · {inputs.floorArea} m² {inputs.houseType}</p>
        </div>
        <Button variant="outline" onClick={onReset}>← Start over</Button>
      </div>

      {/* Bottom line callout */}
      <div className="border border-emerald-400/30 bg-emerald-400/5 p-5 mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">Bottom line</p>
        <p className="text-sm font-semibold text-zinc-200 leading-snug mb-1">
          Your home spends roughly{' '}
          <span className="text-emerald-400">~${(Math.round(totalAnnualCost / 100) * 100).toLocaleString()}/year</span>{' '}
          on heating and hot water.
        </p>
        {topRec ? (
          <p className="text-sm text-zinc-400">
            Your best opportunity:{' '}
            <span className="text-zinc-200">{topRec.title}</span>
            {' '}— could save roughly{' '}
            <span className="text-zinc-200">~${(Math.round(topRec.annualSavingsCAD / 50) * 50).toLocaleString()}/year</span>{' '}
            and may pay for itself in {paybackText}.
          </p>
        ) : isSimple ? (
          <p className="text-sm text-zinc-400">
            You've got the obvious stuff covered.{' '}
            Simple mode uses era-typical defaults — switch to{' '}
            <span className="text-zinc-300 font-medium">Refined mode</span>{' '}
            for a personalised deep dive.
          </p>
        ) : (
          <p className="text-sm text-zinc-400">Your home is already well-optimised — no major upgrades identified.</p>
        )}
      </div>

      {/* Solar gain callout */}
      {heatLoss?.solarGainGJ > 0 && (
        <div className="border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 mb-4 text-sm text-emerald-300">
          South-facing windows offset an estimated {heatLoss.solarGainGJ.toFixed(1)} GJ/year of heating load.
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard
          value={`~${heatLoss.totalHeatLossGJ.toFixed(0)}`}
          unit="GJ"
          label="Annual heat loss"
          sub="through envelope"
        />
        <StatCard
          value={`~$${(Math.round(heatLoss.annualCost / 50) * 50).toLocaleString()}`}
          unit=""
          label="Heating cost / yr"
        />
        <StatCard
          value={`~$${(Math.round(waterHeater.annualCost / 50) * 50).toLocaleString()}`}
          unit=""
          label="Water heating / yr"
        />
        <StatCard
          value={`~$${(Math.round(totalAnnualCost / 100) * 100).toLocaleString()}`}
          unit=""
          label="Total energy / yr"
          sub={`~${totalEnergyGJ.toFixed(0)} GJ input`}
        />
      </div>

      {/* Energy prices used in the estimate */}
      <EnergyPricePanel inputs={inputs} className="mb-4" />

      {/* GJ explanation */}
      <DiveDeeper label="What does GJ mean?">
        <p className="text-xs text-zinc-400 leading-relaxed">
          GJ stands for gigajoule — a unit of energy. It's used here because it works for both gas and
          electricity, making it easy to compare them on the same scale.
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          <strong className="text-zinc-300">1 GJ is roughly equal to:</strong> 26 m³ of natural gas,
          or 278 kWh of electricity. A typical Canadian home uses 80–120 GJ per year just for space heating.
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The "heat loss" GJ shown here is energy leaking out through your walls, windows, roof, and floors
          each year — the less, the better. The "GJ input" in the total card is the actual fuel your
          equipment burns to replace that lost heat (which is higher, because no heating system is 100% efficient).
        </p>
      </DiveDeeper>

      {/* Peak load */}
      <DiveDeeper label="What is peak load?">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Peak load is how hard your heating system has to work on the coldest day of the year.
          Your home's peak load is{' '}
          <strong className="text-zinc-300">{heatLoss.peakHeatLossKW.toFixed(1)} kW</strong>
          , calculated at{' '}
          <strong className="text-zinc-300">{inputs.climate.designTemp}°C</strong>
          {' '}— {city}'s 2.5% design temperature (it only gets colder than this about 2% of the time).
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          This number matters for equipment sizing. When shopping for a heat pump or furnace, you want
          a model rated at or above this output. A heat pump sized to your peak load can handle your
          home without needing a backup resistance heater on most winter days.
        </p>
      </DiveDeeper>

      {/* Heat loss chart */}
      <Card className="mb-6 mt-6">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-1">Where is your heat going?</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Each bar shows how much heat escapes through that part of your home per year.
          Taller bars are bigger opportunities — fixing them saves the most money.
        </p>
        <HeatLossChart components={heatLoss.components} totalHeatLossGJ={heatLoss.totalHeatLossGJ} />
        <DiveDeeper label="What do these parts mean?">
          <HouseDiagram
            houseType={inputs.houseType}
            storeys={inputs.storeys}
            basementType={inputs.basementType}
            components={heatLoss.components}
            caption="Your home, with the arrows sized by how much heat actually escapes through each part — the same breakdown as the bars above. The envelope is everything separating heated space from the outdoors: ceiling/attic, walls, windows, rim joist, and basement walls." />
        </DiveDeeper>
        <DiveDeeper label="How is this calculated?">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Each component uses the steady-state heat loss formula:{' '}
            <span className="font-mono text-zinc-300">Q = A × U × HDD × 86 400</span>
          </p>
          <ul className="text-xs text-zinc-400 space-y-1.5 mt-2">
            <li><strong className="text-zinc-300">Q</strong> — heat lost per year (joules, then converted to GJ)</li>
            <li><strong className="text-zinc-300">A</strong> — area of the surface (m²)</li>
            <li><strong className="text-zinc-300">U</strong> — how easily heat flows through the material (lower = better insulated). U = 1 ÷ R-value.</li>
            <li>
              <strong className="text-zinc-300">HDD</strong> — Heating Degree Days for your city{' '}
              ({inputs.climate.hdd.toLocaleString()} for {city}). More HDD = colder climate = more heating needed.
            </li>
            <li><strong className="text-zinc-300">86 400</strong> — seconds per day, converting the daily degree-day unit into joule-compatible units.</li>
          </ul>
          <p className="text-xs text-zinc-400 leading-relaxed mt-2">
            This is a steady-state model — it assumes a constant temperature difference and doesn't account
            for solar gain, thermal mass, or moisture. An EnerGuide audit uses more detailed simulation
            software for higher accuracy.
          </p>
        </DiveDeeper>
      </Card>

      {/* Apartment / condo: reframe around what's in the occupant's control */}
      {isApartment && (
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-5 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">You're in high-density residential</p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            In a condo or apartment, the building envelope and any central heating, ventilation, or hot-water
            systems are usually shared, common-element responsibilities — not something you can change on your
            own. So we've split your results: <span className="text-zinc-100 font-medium">what you can act on inside
            your unit</span> below, and <span className="text-zinc-100 font-medium">building-wide opportunities</span> further down.
          </p>
        </div>
      )}

      {/* Priority toggle + Recommendations */}
      <div className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-0.5">
              {isApartment ? 'What you can do in your unit' : 'Recommended upgrades'}
            </h3>
            <p className="text-xs text-zinc-400">
              {priority === 'bills'
                ? 'Sorted by fastest payback — most cost-effective first.'
                : 'Sorted by lowest cost per tonne of CO₂ ($/t) — best value first.'}
              {' '}Mid-range Canadian cost estimates.
            </p>
          </div>
          <div className="flex border border-zinc-700 shrink-0">
            {([
              ['bills',  'Cut bills first'],
              ['carbon', 'Cut carbon first'],
            ]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => changePriority(id)}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-r last:border-r-0 border-zinc-700 ${
                  priority === id
                    ? 'bg-emerald-400 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <RecommendationsList
          recommendations={activeRecs}
          doneRecs={doneRecs}
          onToggleDone={toggleDone}
          mode={inputs.mode}
          priority={priority}
          planSelected={planSelected}
          onAddToPlan={addToPlan}
        />
      </div>

      {/* Apartment / condo: building-wide opportunities + outreach */}
      {isApartment && (
        <div className="border border-zinc-700 bg-zinc-900/40 p-5 mb-4">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-1">Beyond your unit — building-wide</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            These would cut energy use across the whole building, but they're common-element work — they need your
            condo board or strata, not an individual owner. They're shown for context, not as personal to-dos.
          </p>

          {buildingRecs.length > 0 && (
            <div className="space-y-2 mb-4">
              {buildingRecs.map(rec => (
                <div key={rec.id} className="flex items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 opacity-80">
                  <span className="text-xs text-zinc-300">{rec.title}</span>
                  {rec.annualSavingsCAD > 0 && (
                    <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                      ~${Math.round(rec.annualSavingsCAD).toLocaleString()}/yr building-wide
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-sm text-zinc-300 leading-relaxed mb-3">
              For savings on bills and carbon that go beyond the limits of your unit — coordinating a building
              retrofit, bulk heat-pump programs, or shared solar — reach out to learn more about your options.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest bg-emerald-400 text-zinc-950 font-bold px-4 py-2.5 hover:bg-emerald-300 transition-colors"
            >
              Explore building-wide options →
            </Link>
          </div>
        </div>
      )}

      {/* Simple-mode upgrade nudge */}
      {isSimple && (
        <div className="border border-zinc-700 bg-zinc-800/40 p-5 mt-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Want a deeper look?</p>
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">
            These results are based on era-typical insulation defaults for your home age.{' '}
            <span className="text-zinc-100">Refined mode</span> lets you enter your actual R-values, window specs, and air leakage — it often surfaces specific, high-value opportunities that era defaults miss.
          </p>
          <button
            onClick={onReset}
            className="text-xs font-mono uppercase tracking-widest border border-emerald-400/40 text-emerald-400 px-4 py-2 hover:bg-emerald-400/10 transition-colors"
          >
            ← Start over with Refined mode
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <Disclaimer context="homeiq" />

      {/* Methodology */}
      <div className="mt-8">
        <DiveDeeper label="Methodology and data sources">
          <p className="text-xs text-zinc-400 leading-relaxed font-mono">
            Steady-state heat loss (Q = A·U·HDD·86400). Climate data from NRCan/NBCC.
            Water heating per NRCan model (50 L/person/day). Fuel costs are approximate 2024 provincial
            averages. Results are estimates — an EnerGuide audit gives precise figures.
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            <a
              href="https://github.com/phil-tomlinson/cwm-energy"
              className="text-emerald-400 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Open source on GitHub
            </a>{' '}
            · Contributions welcome
          </p>
        </DiveDeeper>
      </div>
    </div>
  )
}
