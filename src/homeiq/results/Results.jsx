import Card from '../ui/Card'
import Button from '../ui/Button'
import HeatLossChart from './HeatLossChart'
import RecommendationsList from './RecommendationsList'

function StatCard({ value, unit, label, sub }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 text-center">
      <p className="text-3xl font-bold text-emerald-700">{value}<span className="text-lg font-normal text-gray-500 ml-1">{unit}</span></p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Results({ results, onReset }) {
  const { heatLoss, waterHeater, recommendations, inputs, envelope } = results
  const city     = inputs.city
  const province = inputs.province

  const totalAnnualCost  = heatLoss.annualCost + waterHeater.annualCost
  const totalEnergyGJ    = heatLoss.annualFuelGJ + waterHeater.inputEnergyGJ

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Your Results</h2>
          <p className="text-sm text-gray-500">{city}, {province} · {inputs.floorArea} m² {inputs.houseType}</p>
        </div>
        <Button variant="outline" onClick={onReset}>← Start over</Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          value={heatLoss.totalHeatLossGJ.toFixed(1)}
          unit="GJ"
          label="Annual heat loss"
          sub="through building envelope"
        />
        <StatCard
          value={`$${Math.round(heatLoss.annualCost).toLocaleString()}`}
          unit=""
          label="Heating cost / year"
        />
        <StatCard
          value={`$${Math.round(waterHeater.annualCost).toLocaleString()}`}
          unit=""
          label="Water heating / year"
        />
        <StatCard
          value={`$${Math.round(totalAnnualCost).toLocaleString()}`}
          unit=""
          label="Total energy cost / year"
          sub={`${totalEnergyGJ.toFixed(0)} GJ fuel input`}
        />
      </div>

      {/* Peak load reference */}
      <div className="text-xs text-gray-400 text-right mb-6">
        Peak heat loss: <strong className="text-gray-600">{heatLoss.peakHeatLossKW.toFixed(1)} kW</strong> at {inputs.climate.designTemp}°C design temp — useful for sizing equipment
      </div>

      {/* Heat loss breakdown chart */}
      <Card className="mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Where is your heat going?</h3>
        <HeatLossChart components={heatLoss.components} totalHeatLossGJ={heatLoss.totalHeatLossGJ} />
        <p className="text-xs text-gray-400 mt-3">
          Annual heat loss through each envelope component (GJ/year). Based on {inputs.climate.hdd.toLocaleString()} HDD and steady-state transfer calculations.
        </p>
      </Card>

      {/* Recommendations */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800 mb-1">Recommended upgrades</h3>
        <p className="text-sm text-gray-500 mb-4">
          Ranked by simple payback period (most cost-effective first). Costs are mid-range Canadian estimates — get quotes for your situation.
        </p>
        <RecommendationsList recommendations={recommendations} />
      </div>

      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
        <strong>Methodology:</strong> Steady-state heat loss (Q = A·U·HDD·86400). Climate data from NRCan/NBCC.
        Water heating per NRCan hot water model (50 L/person/day). Fuel costs are approximate 2024 provincial averages.
        Results are estimates — an EnerGuide audit will give precise figures.
        <br /><br />
        <a href="https://github.com/phil-tomlinson/homeiq" className="text-emerald-600 underline" target="_blank" rel="noreferrer">
          Open source on GitHub
        </a> · Contributions welcome
      </div>
    </div>
  )
}
