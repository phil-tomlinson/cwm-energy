import { provinces, getCitiesForProvince, getClimateData } from '../../data/climateData'
import { houseTypes, storeyOptions, basementTypes, constructionEras } from '../../data/houseDefaults'
import { fuelTypes, heatingSystemTypes, waterHeaterTypes as whTypesFallback, getFuelCostPerGJ, provincialPrices } from '../../data/energyPrices'
import { waterHeaterTypes } from '../../calculations/waterHeater'
import { SelectField, NumberField, AreaField, LengthField } from '../ui/FormField'

function SectionHeader({ label }) {
  return (
    <div className="flex items-center gap-4 pt-4 pb-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  )
}

export default function TechnicalMode({ data, updateData }) {
  const units = data.units
  const env = data.envelope ?? {}
  const prices = provincialPrices[data.province] ?? {}
  const availFuels = fuelTypes.filter(f => prices[f.value] != null)
  const systemOptions = heatingSystemTypes[data.heating.fuelType] ?? []

  function updateEnv(fields) {
    updateData({ envelope: { ...env, ...fields } })
  }

  function handleProvinceChange(provinceCode) {
    const firstCity = getCitiesForProvince(provinceCode)[0]
    const climate = getClimateData(provinceCode, firstCity?.city)
    updateData({ province: provinceCode, city: firstCity?.city ?? '', climate, envelope: null })
  }

  function handleFuelChange(newFuel) {
    const systems = heatingSystemTypes[newFuel] ?? []
    const first = systems[0]
    updateData({
      heating: {
        fuelType: newFuel,
        systemType: first?.value ?? '',
        efficiency: first?.efficiency ?? 0.8,
        fuelCostPerGJ: getFuelCostPerGJ(data.province, newFuel) ?? 10,
      },
    })
  }

  function handleSystemChange(systemValue) {
    const sys = systemOptions.find(s => s.value === systemValue)
    updateData({ heating: { ...data.heating, systemType: systemValue, efficiency: sys?.efficiency ?? data.heating.efficiency } })
  }

  function handleWHTypeChange(typeValue) {
    const preset = waterHeaterTypes.find(t => t.value === typeValue)
    updateData({
      waterHeater: {
        ...data.waterHeater,
        type: typeValue,
        uef: preset?.defaultUef ?? data.waterHeater.uef,
        fuelType: preset?.fuel ?? data.waterHeater.fuelType,
        fuelCostPerGJ: getFuelCostPerGJ(data.province, preset?.fuel ?? data.waterHeater.fuelType),
      },
    })
  }

  return (
    <div className="space-y-2">

      {/* ── Location ─────────────────────────────────────────── */}
      <SectionHeader label="Location" />
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Province"
          value={data.province}
          onChange={handleProvinceChange}
          options={provinces.map(p => ({ value: p.code, label: p.name }))}
        />
        <SelectField
          label="Nearest city"
          value={data.city}
          onChange={city => updateData({ city, climate: getClimateData(data.province, city) })}
          options={getCitiesForProvince(data.province).map(c => ({ value: c.city, label: c.city }))}
        />
      </div>

      {/* ── Building ─────────────────────────────────────────── */}
      <SectionHeader label="Building" />
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="House type" value={data.houseType}
          onChange={v => updateData({ houseType: v, envelope: null })} options={houseTypes} />
        <SelectField label="Storeys" value={data.storeys}
          onChange={v => updateData({ storeys: Number(v), envelope: null })} options={storeyOptions} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Basement / foundation" value={data.basementType}
          onChange={v => updateData({ basementType: v, envelope: null })} options={basementTypes} />
        <SelectField label="Construction era" value={data.era}
          onChange={v => updateData({ era: v, envelope: null })} options={constructionEras} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AreaField label="Conditioned floor area" value={data.floorArea}
          onChange={v => updateData({ floorArea: v, envelope: null })} units={units} />
        <LengthField label="Ceiling height" value={data.ceilingHeight}
          onChange={v => updateData({ ceilingHeight: v })} units={units} />
      </div>

      {/* ── Envelope — Insulation ─────────────────────────────── */}
      <SectionHeader label="Envelope — Insulation & Air Sealing" />
      <p className="text-xs text-zinc-600 font-mono">R-values are nominal imperial (as labelled on insulation). Window/door values are U (W/m²·K).</p>

      <div className="grid grid-cols-2 gap-4">
        <NumberField label="Wall insulation" unit="R" value={env.wallR ?? 0}
          onChange={v => updateEnv({ wallR: v })} min={0} max={80} step={1}
          hint="e.g. R-20 for 2×6 fiberglass batt" />
        <NumberField label="Ceiling / attic" unit="R" value={env.ceilingR ?? 0}
          onChange={v => updateEnv({ ceilingR: v })} min={0} max={120} step={1}
          hint="e.g. R-40 blown cellulose" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumberField label="Basement walls" unit="R" value={env.basementWallR ?? 0}
          onChange={v => updateEnv({ basementWallR: v })} min={0} max={40} step={1}
          hint="Below-grade wall insulation" />
        <NumberField label="Basement floor" unit="R" value={env.basementFloorR ?? 0}
          onChange={v => updateEnv({ basementFloorR: v })} min={0} max={30} step={1}
          hint="Insulation under slab, if any" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <NumberField label="Window U-value" unit="W/m²K" value={env.windowU ?? 0}
          onChange={v => updateEnv({ windowU: v })} min={0.5} max={6.0} step={0.1}
          hint="From NFRC label. Lower = better." />
        <NumberField label="Door U-value" unit="W/m²K" value={env.doorU ?? 0}
          onChange={v => updateEnv({ doorU: v })} min={0.5} max={5.0} step={0.1}
          hint="Typical steel door ≈ 1.8" />
        <NumberField label="Air leakage" unit="ACH" value={env.ach ?? 0}
          onChange={v => updateEnv({ ach: v })} min={0.02} max={3.0} step={0.05}
          hint="Blower door @ natural pressure. Tight = 0.1 · Leaky = 1.0+" />
      </div>

      {/* ── Envelope — Air Leakage Factors ───────────────────── */}
      <SectionHeader label="Envelope — Air Leakage Factors" />
      <p className="text-xs text-zinc-600 font-mono">Unlocks targeted recommendations for chimney and rim joist losses.</p>

      <div className="grid grid-cols-1 gap-4">
        {/* Chimney */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Chimney / fireplace type</label>
          <select
            value={data.airLeakageFactors?.chimney ?? 'none'}
            onChange={e => updateData({ airLeakageFactors: { ...data.airLeakageFactors, chimney: e.target.value } })}
            className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="none">None</option>
            <option value="masonry">Masonry fireplace — leaky or rarely used</option>
            <option value="wood_insert">Wood stove / sealed insert (minimal leakage)</option>
            <option value="gas_vented">Gas fireplace — vented (pilot light or non-sealed)</option>
            <option value="gas_sealed">Gas fireplace — sealed combustion</option>
          </select>
        </div>

        {/* Rim joists + pot lights */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">Exposed rim joists?</p>
            <div className="flex gap-2">
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => updateData({ airLeakageFactors: { ...data.airLeakageFactors, exposedRimJoists: opt.value } })}
                  className={`border px-3 py-2 text-xs transition-colors flex-1 ${
                    (data.airLeakageFactors?.exposedRimJoists ?? false) === opt.value
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-zinc-600 font-mono">Uninsulated rim joists in basement</p>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300 mb-2">Recessed pot lights?</p>
            <div className="flex gap-2">
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => updateData({ airLeakageFactors: { ...data.airLeakageFactors, recessedLights: opt.value } })}
                  className={`border px-3 py-2 text-xs transition-colors flex-1 ${
                    (data.airLeakageFactors?.recessedLights ?? false) === opt.value
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-zinc-600 font-mono">In ceiling below unconditioned attic</p>
          </div>
        </div>
      </div>

      {/* ── Envelope — Areas ─────────────────────────────────── */}
      <SectionHeader label="Envelope — Areas" />
      <p className="text-xs text-zinc-600 font-mono">Pre-filled from floor area geometry. Override with measured values if available.</p>

      <div className="grid grid-cols-2 gap-4">
        <AreaField label="Net wall area" value={env.netWallArea ?? 0}
          onChange={v => updateEnv({ netWallArea: v })} units={units}
          hint="Above-grade walls minus windows and doors" />
        <AreaField label="Window area" value={env.windowArea ?? 0}
          onChange={v => updateEnv({ windowArea: v })} units={units}
          hint="Total glazing area including frames" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AreaField label="Ceiling area" value={env.ceilingArea ?? 0}
          onChange={v => updateEnv({ ceilingArea: v })} units={units}
          hint="Top floor ceiling below unconditioned attic" />
        <NumberField label="Exterior doors" unit="doors" value={env.doorCount ?? 2}
          onChange={v => updateEnv({ doorCount: v, doorArea: v * 1.98 })} min={0} max={10} step={1} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AreaField label="Basement wall area" value={env.basementWallArea ?? 0}
          onChange={v => updateEnv({ basementWallArea: v })} units={units}
          hint="Below-grade wall area only" />
        <AreaField label="Basement floor area" value={env.basementFloorArea ?? 0}
          onChange={v => updateEnv({ basementFloorArea: v })} units={units} />
      </div>

      {/* ── Heating ──────────────────────────────────────────── */}
      <SectionHeader label="Heating System" />
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Primary fuel" value={data.heating.fuelType}
          onChange={handleFuelChange} options={availFuels} />
        {systemOptions.length > 0 && (
          <SelectField label="System type" value={data.heating.systemType}
            onChange={handleSystemChange} options={systemOptions} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label={data.heating.fuelType === 'electricity' ? 'Efficiency (COP)' : 'Efficiency (AFUE %)'}
          value={data.heating.fuelType === 'electricity' ? data.heating.efficiency : Math.round(data.heating.efficiency * 100)}
          onChange={v => updateData({ heating: { ...data.heating, efficiency: data.heating.fuelType === 'electricity' ? v : v / 100 } })}
          min={data.heating.fuelType === 'electricity' ? 0.9 : 50}
          max={data.heating.fuelType === 'electricity' ? 6.0 : 100}
          step={data.heating.fuelType === 'electricity' ? 0.1 : 1}
          unit={data.heating.fuelType === 'electricity' ? 'COP' : '%'}
        />
        <NumberField label="Fuel cost" unit="$/GJ"
          value={data.heating.fuelCostPerGJ ?? 10}
          onChange={v => updateData({ heating: { ...data.heating, fuelCostPerGJ: v } })}
          min={0.1} max={500} step={0.5} />
      </div>

      {/* ── Water Heating ─────────────────────────────────────── */}
      <SectionHeader label="Water Heating" />
      <div className="grid grid-cols-2 gap-4">
        <NumberField label="Occupants" value={data.waterHeater.occupants}
          onChange={v => updateData({ waterHeater: { ...data.waterHeater, occupants: v } })}
          min={1} max={12} step={1} unit="people" />
        <SelectField label="Water heater type" value={data.waterHeater.type}
          onChange={handleWHTypeChange} options={waterHeaterTypes} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumberField label="UEF" value={data.waterHeater.uef}
          onChange={v => updateData({ waterHeater: { ...data.waterHeater, uef: v } })}
          min={0.4} max={5.0} step={0.01}
          hint="From EnerGuide label. Gas ≈ 0.60 · Tankless ≈ 0.87 · Heat pump ≈ 3.5" />
        <NumberField label="WH fuel cost" unit="$/GJ"
          value={data.waterHeater.fuelCostPerGJ ?? 10}
          onChange={v => updateData({ waterHeater: { ...data.waterHeater, fuelCostPerGJ: v } })}
          min={0.1} max={500} step={0.5} />
      </div>

    </div>
  )
}
