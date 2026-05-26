import { HEATING_SYSTEMS, getFuelCostPerGJ, provincialPrices } from '../../data/energyPrices'
import Card, { CardSection } from '../ui/Card'
import { SelectField, NumberField } from '../ui/FormField'

export default function Step4Heating({ data, updateData }) {
  const province = data.province
  const prices   = provincialPrices[province] ?? {}

  // Only show systems whose fuel is available in this province
  const availSystems = HEATING_SYSTEMS.filter(s => prices[s.fuelType] != null)

  // Resolve the active system — fall back to first available if systemId unset
  const systemId     = data.heating.systemId ?? availSystems[0]?.id ?? ''
  const currentSystem = HEATING_SYSTEMS.find(s => s.id === systemId) ?? availSystems[0]
  const isCOP        = currentSystem?.effUnit === 'cop'

  function handleSystemChange(newId) {
    const sys = HEATING_SYSTEMS.find(s => s.id === newId)
    if (!sys) return
    updateData({
      heating: {
        ...data.heating,
        systemId:     newId,
        systemType:   newId,           // kept for backwards compatibility
        fuelType:     sys.fuelType,
        efficiency:   sys.efficiency,
        fuelCostPerGJ: getFuelCostPerGJ(province, sys.fuelType) ?? data.heating.fuelCostPerGJ ?? 10,
      },
    })
  }

  const costPerGJ = getFuelCostPerGJ(province, data.heating.fuelType)

  return (
    <div>
      <h2 className="text-xl font-bold text-zinc-100 mb-1">Heating system</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Your heating system efficiency determines how much fuel is needed to deliver the heat your home requires.
      </p>

      <Card>
        <CardSection title="Heating system">
          <SelectField
            label="What type of heating system do you have?"
            value={systemId}
            onChange={handleSystemChange}
            options={availSystems.map(s => ({ value: s.id, label: s.label }))}
            hint={currentSystem?.hint}
          />
        </CardSection>

        <CardSection title="Efficiency (optional fine-tune)">
          <NumberField
            label={isCOP ? 'System efficiency (COP)' : 'System efficiency (AFUE %)'}
            value={isCOP ? data.heating.efficiency : Math.round(data.heating.efficiency * 100)}
            onChange={v => updateData({ heating: { ...data.heating, efficiency: isCOP ? v : v / 100 } })}
            min={isCOP ? 0.9 : 50}
            max={isCOP ? 6.0 : 100}
            step={isCOP ? 0.1 : 1}
            unit={isCOP ? 'COP' : '%'}
            hint={isCOP
              ? 'Baseboard = 1.0 · Standard ASHP ≈ 2.5 · Cold-climate ASHP ≈ 3.0 · GSHP ≈ 3.5'
              : 'Standard furnace = 80% · Mid-efficiency = 90% · High-efficiency condensing = 96–98%'}
          />
        </CardSection>

        <CardSection
          title="Energy cost"
          hint="We've pre-filled an approximate rate for your province. Update with your actual rate from your utility bill for best accuracy."
        >
          <NumberField
            label="Fuel cost"
            value={data.heating.fuelCostPerGJ ?? costPerGJ ?? 10}
            onChange={v => updateData({ heating: { ...data.heating, fuelCostPerGJ: v } })}
            min={0.1} max={500} step={0.5}
            unit="$/GJ"
            hint={data.heating.fuelType === 'electricity' ? 'e.g. $0.12/kWh ≈ $33/GJ  |  $0.17/kWh ≈ $47/GJ' : ''}
          />
        </CardSection>
      </Card>
    </div>
  )
}
