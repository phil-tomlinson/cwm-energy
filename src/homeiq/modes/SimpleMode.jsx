'use client'
import { provinces, getCitiesForProvince, getClimateData } from '../../data/climateData'
import { houseTypes, storeyOptions, constructionEras } from '../../data/houseDefaults'
import { fuelTypes, heatingSystemTypes, getFuelCostPerGJ, provincialPrices } from '../../data/energyPrices'
import { SelectField, AreaField, NumberField } from '../ui/FormField'
import DiveDeeper from '@/components/DiveDeeper'

// Quick-select sizes: [label, m²]
const SIZE_PRESETS = [
  { label: 'Small', sub: '~100 m² / 1,100 ft²', m2: 100 },
  { label: 'Medium', sub: '~160 m² / 1,700 ft²', m2: 160 },
  { label: 'Large', sub: '~250 m² / 2,700 ft²', m2: 250 },
]

/** Plain-English description of how cold a city's climate is, based on HDD. */
function hddLabel(hdd) {
  if (hdd < 3000) return 'Mild Canadian climate'
  if (hdd < 4000) return 'Moderate climate'
  if (hdd < 5000) return 'Cold climate'
  if (hdd < 6500) return 'Very cold climate'
  return 'Extreme cold climate'
}

/** Plain-English description of design temperature severity. */
function designTempLabel(temp) {
  if (temp >= -5)  return 'Mild winters'
  if (temp >= -15) return 'Cold winters'
  if (temp >= -25) return 'Very cold winters'
  return 'Severe winters'
}

/** Plain-English description of cold water temperature impact. */
function coldWaterLabel(temp) {
  if (temp <= 6)  return 'Very cold — high water heating cost'
  if (temp <= 9)  return 'Cold tap water'
  if (temp <= 12) return 'Cool tap water'
  return 'Mild tap water'
}

export default function SimpleMode({ data, updateData }) {
  const units = data.units
  const citiesInProvince = getCitiesForProvince(data.province)
  const prices = provincialPrices[data.province] ?? {}
  const availFuels = fuelTypes.filter(f => prices[f.value] != null)

  function handleProvinceChange(provinceCode) {
    const firstCity = getCitiesForProvince(provinceCode)[0]
    const climate = getClimateData(provinceCode, firstCity?.city)
    updateData({ province: provinceCode, city: firstCity?.city ?? '', climate, envelope: null })
  }

  function handleCityChange(cityName) {
    updateData({ city: cityName, climate: getClimateData(data.province, cityName) })
  }

  function handleFuelChange(newFuel) {
    const systems = heatingSystemTypes[newFuel] ?? []
    const first = systems[0]
    updateData({
      envelope: null,
      heating: {
        fuelType: newFuel,
        systemType: first?.value ?? '',
        efficiency: first?.efficiency ?? 0.8,
        fuelCostPerGJ: getFuelCostPerGJ(data.province, newFuel) ?? 10,
      },
    })
  }

  return (
    <div className="space-y-6">

      {/* Row 1: Province + City */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono mb-3">Location</p>
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
            onChange={handleCityChange}
            options={citiesInProvince.map(c => ({ value: c.city, label: c.city }))}
          />
        </div>
      </div>

      {/* Row 2: House type + Storeys */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono mb-3">Your home</p>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="House type"
            value={data.houseType}
            onChange={v => updateData({ houseType: v, envelope: null })}
            options={houseTypes}
          />
          <SelectField
            label="Storeys"
            value={data.storeys}
            onChange={v => updateData({ storeys: Number(v), envelope: null })}
            options={storeyOptions}
          />
        </div>
      </div>

      {/* Row 3: Era */}
      <SelectField
        label="When was it built?"
        hint="Sets insulation defaults for your era. Fine-tune in Refined mode."
        value={data.era}
        onChange={v => updateData({ era: v, envelope: null })}
        options={constructionEras}
      />

      {/* Row 4: Floor area with quick-select */}
      <div>
        <p className="text-xs font-medium text-zinc-300 mb-2">Floor area</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {SIZE_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => updateData({ floorArea: p.m2, envelope: null })}
              className={`border px-3 py-2 text-left transition-colors ${
                Math.abs(data.floorArea - p.m2) < 10
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <div className="text-xs font-bold">{p.label}</div>
              <div className="text-[10px] text-zinc-400 font-mono">{p.sub}</div>
            </button>
          ))}
        </div>
        <AreaField
          label="Or enter exact area"
          value={data.floorArea}
          onChange={v => updateData({ floorArea: v, envelope: null })}
          units={units}
          hint="Heated/cooled living space. Exclude unheated garage."
        />
      </div>

      {/* Row 5: Heating fuel */}
      <SelectField
        label="Primary heating fuel"
        value={data.heating.fuelType}
        onChange={handleFuelChange}
        options={availFuels}
      />

      {/* Row 6: Occupants */}
      <NumberField
        label="People in the household"
        value={data.waterHeater.occupants}
        onChange={v => updateData({ waterHeater: { ...data.waterHeater, occupants: v } })}
        min={1} max={12} step={1}
        hint="Used to estimate hot water demand"
      />

      {/* Climate summary */}
      {data.climate && (
        <div className="border border-zinc-700 bg-zinc-800/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono mb-3">
            Climate — {data.city}, {data.province}
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-black text-emerald-400 font-mono">{data.climate.hdd.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-400 font-medium">{hddLabel(data.climate.hdd)}</p>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">HDD base 18°C</p>
            </div>
            <div>
              <p className="text-lg font-black text-emerald-400 font-mono">{data.climate.designTemp}°C</p>
              <p className="text-[10px] text-zinc-400 font-medium">{designTempLabel(data.climate.designTemp)}</p>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Design temp</p>
            </div>
            <div>
              <p className="text-lg font-black text-emerald-400 font-mono">{data.climate.coldWaterTemp}°C</p>
              <p className="text-[10px] text-zinc-400 font-medium leading-tight">{coldWaterLabel(data.climate.coldWaterTemp)}</p>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Cold water</p>
            </div>
          </div>

          <DiveDeeper label="What are heating degree days?">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Heating Degree Days (HDD) measure how cold a location is over a full year.
              Each day adds to the total based on how far the temperature falls below 18°C —
              the point where most homes need active heating.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-zinc-300">Example:</strong> If it's 3°C outside, that day contributes
              15 HDD (18 − 3 = 15). Add up all such days across a year and you get the annual HDD figure.
              Vancouver has ~2,900 HDD; Winnipeg has ~5,600 HDD — nearly twice as much heating demand.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The design temperature is the coldest it gets in your city about 97.5% of the time —
              used to size your heating equipment for a typical worst-case day.
              Cold water temperature affects how much energy your water heater needs:
              the colder the incoming water, the more it costs to heat.
            </p>
          </DiveDeeper>
        </div>
      )}

      <p className="text-xs text-zinc-400 font-mono">
        Results will use era-typical insulation values. Switch to Refined for better accuracy.
      </p>
    </div>
  )
}
