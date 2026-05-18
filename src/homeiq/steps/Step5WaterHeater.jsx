import { waterHeaterTypes } from '../../calculations/waterHeater'
import { getFuelCostPerGJ } from '../../data/energyPrices'
import Card, { CardSection } from '../ui/Card'
import { SelectField, NumberField } from '../ui/FormField'

export default function Step5WaterHeater({ data, updateData }) {
  const wh = data.waterHeater

  function handleTypeChange(typeValue) {
    const preset = waterHeaterTypes.find(t => t.value === typeValue)
    updateData({
      waterHeater: {
        ...wh,
        type:    typeValue,
        uef:     preset?.defaultUef ?? wh.uef,
        fuelType: preset?.fuel ?? wh.fuelType,
        fuelCostPerGJ: getFuelCostPerGJ(data.province, preset?.fuel ?? wh.fuelType) ?? wh.fuelCostPerGJ,
      },
    })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Water heater</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Water heating is typically the second-largest energy use in a Canadian home after space heating.
      </p>

      <Card>
        <CardSection title="Occupants">
          <NumberField
            label="Number of people in the household"
            value={wh.occupants}
            onChange={v => updateData({ waterHeater: { ...wh, occupants: v } })}
            min={1} max={12} step={1}
            hint="Used to estimate hot water demand (NRCan average: 50 L/person/day)"
          />
        </CardSection>

        <CardSection title="Water heater equipment">
          <SelectField
            label="Water heater type"
            value={wh.type}
            onChange={handleTypeChange}
            options={waterHeaterTypes}
          />

          <NumberField
            label="UEF (Uniform Energy Factor)"
            value={wh.uef}
            onChange={v => updateData({ waterHeater: { ...wh, uef: v } })}
            min={0.4} max={5.0} step={0.01}
            hint="Found on the EnerGuide label. Higher = more efficient. Storage gas ≈ 0.60 | Tankless gas ≈ 0.87 | Heat pump ≈ 3.5"
          />

          <NumberField
            label="Water heater fuel cost"
            value={wh.fuelCostPerGJ ?? 10}
            onChange={v => updateData({ waterHeater: { ...wh, fuelCostPerGJ: v } })}
            min={0.1} max={500} step={0.5}
            unit="$/GJ"
            hint="Pre-filled for your province. Update from your utility bill for best accuracy."
          />
        </CardSection>
      </Card>

      <div className="mt-4 p-4 bg-blue-400/5 border border-blue-400/20">
        <p className="text-sm text-blue-300 font-medium">Ready to calculate</p>
        <p className="text-xs text-blue-400 mt-1">
          Click <strong>Calculate Results</strong> to see your home's heat loss breakdown, annual energy costs, and a prioritised list of cost-effective upgrades.
        </p>
      </div>
    </div>
  )
}
