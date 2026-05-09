import Card from '../ui/Card'
import Button from '../ui/Button'
import HeatLossChart from './HeatLossChart'
import RecommendationsList from './RecommendationsList'

function StatCard({ value, unit, label, sub }) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 p-5 text-center">
      <p className="text-3xl font-black text-emerald-400 font-mono">
        {value}<span className="text-lg font-normal text-zinc-500 ml-1">{unit}</span>
      </p>
      <p className="text-sm font-medium text-zinc-300 mt-1">{label}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Results({ results, onReset }) {
  const { heatLoss, waterHeater, recommendations, inputs } = results
  const city     = inputs.city
  const province = inputs.province

  const totalAnnualCost = heatLoss.annualCost + waterHeater.annualCost
  const totalEnergyGJ   = heatLoss.annualFuelGJ + waterHeater.inputEnergyGJ

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-0.5">Analysis complete</p>
          <h2 className="text-2xl font-black tracking-tight text-zinc-100">Your Results</h2>
          <p className="text-sm text-zinc-500">{city}, {province} · {inputs.floorArea} m² {inputs.houseType}</p>
        </div>
        <Button variant="outline" onClick={onReset}>← Start over</Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <StatCard
          value={heatLoss.totalHeatLossGJ.toFixed(1)}
          unit="GJ"
          label="Annual heat loss"
          sub="through envelope"
        />
        <StatCard
          value={`$${Math.round(heatLoss.annualCost).toLocaleString()}`}
          unit=""
          label="Heating cost / yr"
        />
        <StatCard
          value={`$${Math.round(waterHeater.annualCost).toLocaleString()}`}
          unit=""
          label="Water heating / yr"
        />
        <StatCard
          value={`$${Math.round(totalAnnualCost).toLocaleString()}`}
          unit=""
          label="Total energy / yr"
          sub={`${totalEnergyGJ.toFixed(0)} GJ input`}
        />
      </div>

      {/* Peak load */}
      <div className="text-xs text-zinc-600 text-right mb-6 font-mono">
        Peak load: <strong className="text-zinc-400">{heatLoss.peakHeatLossKW.toFixed(1)} kW</strong> at {inputs.climate.designTemp}°C design temp
      </div>

      {/* Heat loss chart */}
      <Card className="mb-6">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-4">Where is your heat going?</h3>
        <HeatLossChart components={heatLoss.components} totalHeatLossGJ={heatLoss.totalHeatLossGJ} />
        <p className="text-xs text-zinc-600 mt-3 font-mono">
          GJ/year per envelope component · {inputs.climate.hdd.toLocaleString()} HDD · steady-state transfer
        </p>
      </Card>

      {/* Recommendations */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-1">Recommended upgrades</h3>
        <p className="text-sm text-zinc-500 mb-4">
          Ranked by payback period — most cost-effective first. Mid-range Canadian cost estimates.
        </p>
        <RecommendationsList recommendations={recommendations} />
      </div>

      <div className="mt-8 p-4 bg-zinc-800 border border-zinc-700 text-xs text-zinc-500 font-mono">
        <strong className="text-zinc-400">Methodology:</strong> Steady-state heat loss (Q = A·U·HDD·86400).
        Climate data from NRCan/NBCC. Water heating per NRCan model (50 L/person/day).
        Fuel costs are approximate 2024 provincial averages. Results are estimates — an EnerGuide audit gives precise figures.
        <br /><br />
        <a href="https://github.com/phil-tomlinson/cwm-energy" className="text-emerald-400 hover:underline" target="_blank" rel="noreferrer">
          Open source on GitHub
        </a> · Contributions welcome
      </div>
    </div>
  )
}
