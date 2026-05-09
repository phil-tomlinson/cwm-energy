import { provinces, getCitiesForProvince, getClimateData } from '../../data/climateData'
import Card from '../ui/Card'
import { SelectField } from '../ui/FormField'

export default function Step1Location({ data, updateData }) {
  const citiesInProvince = getCitiesForProvince(data.province)

  function handleProvinceChange(provinceCode) {
    const firstCity = getCitiesForProvince(provinceCode)[0]
    const climate   = getClimateData(provinceCode, firstCity?.city)
    updateData({ province: provinceCode, city: firstCity?.city ?? '', climate })
  }

  function handleCityChange(cityName) {
    const climate = getClimateData(data.province, cityName)
    updateData({ city: cityName, climate })
  }

  const climate = data.climate

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Where is your home?</h2>
      <p className="text-gray-500 text-sm mb-6">
        Your location determines outdoor temperatures and heating degree days — the foundation of all energy calculations.
      </p>

      <Card>
        <SelectField
          label="Province / Territory"
          value={data.province}
          onChange={handleProvinceChange}
          options={provinces.map(p => ({ value: p.code, label: p.name }))}
        />

        <SelectField
          label="Nearest city"
          hint="Choose the city closest to you for the best climate match."
          value={data.city}
          onChange={handleCityChange}
          options={citiesInProvince.map(c => ({ value: c.city, label: c.city }))}
        />

        {climate && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-2">Climate data for {data.city}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-emerald-700">{climate.hdd.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Degree days<br />(HDD base 18°C)</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700">{climate.designTemp}°C</p>
                <p className="text-xs text-gray-500">Design outdoor<br />temperature</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700">{climate.coldWaterTemp}°C</p>
                <p className="text-xs text-gray-500">Cold water<br />inlet temp</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
