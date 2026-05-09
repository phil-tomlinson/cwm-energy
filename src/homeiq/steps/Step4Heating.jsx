import { fuelTypes, heatingSystemTypes, getFuelCostPerGJ, provincialPrices } from '../../data/energyPrices'
import Card, { CardSection } from '../ui/Card'
import { SelectField, NumberField } from '../ui/FormField'

export default function Step4Heating({ data, updateData }) {
  const province     = data.province
  const fuelType     = data.heating.fuelType
  const systemOptions = heatingSystemTypes[fuelType] ?? []

  function handleFuelChange(newFuel) {
    const systems    = heatingSystemTypes[newFuel] ?? []
    const firstSys   = systems[0]
    updateData({
      heating: {
        fuelType:   newFuel,
        systemType: firstSys?.value ?? '',
        efficiency: firstSys?.efficiency ?? 1.0,
        fuelCostPerGJ: getFuelCostPerGJ(province, newFuel) ?? 10,
      },
    })
  }

  function handleSystemChange(systemValue) {
    const sys = systemOptions.find(s => s.value === systemValue)
    updateData({ heating: { ...data.heating, systemType: systemValue, efficiency: sys?.efficiency ?? data.heating.efficiency } })
  }

  const prices    = provincialPrices[province] ?? {}
  const availFuels = fuelTypes.filter(f => prices[f.value] !== null && prices[f.value] !== undefined)
  const costPerGJ  = getFuelCostPerGJ(province, fuelType)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Heating system</h2>
      <p className="text-gray-500 text-sm mb-6">
        Your heating system efficiency determines how much fuel is needed to deliver the heat your home requires.
      </p>

      <Card>
        <CardSection title="Fuel and equipment">
          <SelectField
            label="Primary heating fuel"
            value={fuelType}
            onChange={handleFuelChange}
            options={availFuels}
          />

          {systemOptions.length > 0 && (
            <SelectField
              label="Heating system type"
              value={data.heating.systemType}
              onChange={handleSystemChange}
              options={systemOptions}
              hint="The efficiency shown is a typical value — adjust below if you know your equipment's actual rating."
            />
          )}

          <NumberField
            label={fuelType === 'electricity' ? 'System efficiency (COP)' : 'System efficiency (AFUE %)'}
            value={fuelType === 'electricity' ? data.heating.efficiency : Math.round(data.heating.efficiency * 100)}
            onChange={v => updateData({ heating: { ...data.heating, efficiency: fuelType === 'electricity' ? v : v / 100 } })}
            min={fuelType === 'electricity' ? 0.9 : 50}
            max={fuelType === 'electricity' ? 6.0 : 100}
            step={fuelType === 'electricity' ? 0.1 : 1}
            unit={fuelType === 'electricity' ? 'COP' : '%'}
            hint={fuelType === 'electricity'
              ? 'Baseboard = 1.0 | Standard ASHP = 2.5 | Cold-climate ASHP = 3.0 | GSHP = 3.5'
              : 'Standard furnace = 80% | Mid-efficiency = 90% | High-efficiency condensing = 96–98%'}
          />
        </CardSection>

        <CardSection title="Energy cost" hint="We've pre-filled an approximate rate for your province. Update with your actual rate from your utility bill for best accuracy.">
          <NumberField
            label="Fuel cost"
            value={data.heating.fuelCostPerGJ ?? costPerGJ ?? 10}
            onChange={v => updateData({ heating: { ...data.heating, fuelCostPerGJ: v } })}
            min={0.1} max={500} step={0.5}
            unit="$/GJ"
            hint={fuelType === 'electricity' ? 'e.g. $0.12/kWh ≈ $33/GJ  |  $0.17/kWh ≈ $47/GJ' : ''}
          />
        </CardSection>
      </Card>
    </div>
  )
}
