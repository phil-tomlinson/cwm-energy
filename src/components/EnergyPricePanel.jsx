import { provincialPrices, getFuelCostPerGJ, fuelTypes } from '@/data/energyPrices'

const FUEL_LABELS = Object.fromEntries(fuelTypes.map(f => [f.value, f.label]))

// Native retail rate as shown on a utility bill (before the $/GJ conversion).
// Natural gas is already sold in $/GJ, so there's no separate native rate to show.
function nativeRate(fuelType, rate) {
  if (rate == null) return null
  if (fuelType === 'electricity') return `${(rate * 100).toFixed(1)}¢/kWh`
  if (fuelType === 'heatingOil' || fuelType === 'propane') return `$${rate.toFixed(2)}/L`
  return null
}

// Build the rows to display. Prefer the rates actually used by the calculation
// (with their source); fall back to deriving from the heating/water-heater fuels
// for results produced before `usedRates` was recorded.
function deriveRows(inputs, province) {
  if (Array.isArray(inputs.usedRates) && inputs.usedRates.length) {
    return inputs.usedRates.map(({ fuelType, perGJ, source }) => ({
      fuelType,
      perGJ,
      source,
      native: source === 'user-bills' ? null : nativeRate(fuelType, provincialPrices[province]?.[fuelType]),
    }))
  }

  const heating = inputs.heating ?? {}
  const wh      = inputs.waterHeater ?? {}
  const fuels = [...new Set([heating.fuelType, wh.fuelType, 'electricity'])].filter(Boolean)
  return fuels
    .map(fuelType => {
      let perGJ = fuelType === heating.fuelType ? heating.fuelCostPerGJ
                : fuelType === wh.fuelType      ? wh.fuelCostPerGJ
                : null
      if (perGJ == null) perGJ = getFuelCostPerGJ(province, fuelType)
      return perGJ != null
        ? { fuelType, perGJ, source: 'provincial', native: nativeRate(fuelType, provincialPrices[province]?.[fuelType]) }
        : null
    })
    .filter(Boolean)
}

/**
 * Transparency panel showing the energy prices feeding a home's bill estimate.
 * Each row is tagged as a provincial average or the user's own bill-derived rate.
 */
export default function EnergyPricePanel({ inputs, className = '' }) {
  const province = inputs?.province
  if (!province) return null

  const rows = deriveRows(inputs, province)
  if (!rows.length) return null

  const anyUser = rows.some(r => r.source === 'user-bills')
  const anyProv = rows.some(r => r.source !== 'user-bills')

  return (
    <div className={`border border-zinc-700 bg-zinc-900/40 p-4 ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2.5">
        Energy prices we're using · {province}, 2024
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {rows.map(({ fuelType, perGJ, native, source }) => (
          <div key={fuelType} className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-1.5">
            <span className="text-sm text-zinc-300 flex items-center gap-1.5">
              {FUEL_LABELS[fuelType] ?? fuelType}
              {source === 'user-bills' && (
                <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-1 py-0.5">
                  your bills
                </span>
              )}
            </span>
            <span className="font-mono text-sm text-zinc-200">
              {native && <span className="text-zinc-400">{native} · </span>}
              ${perGJ.toFixed(2)}/GJ
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500 leading-relaxed mt-2.5">
        {anyUser && anyProv && 'Rates tagged “your bills” come from the bills you entered. The rest are '}
        {anyUser && !anyProv && 'Based on the bills you entered. '}
        {anyProv && (
          <>
            {!anyUser && ''}provincial mid-range residential averages (NRCan Energy Fact Book 2023–24 &amp; utility rate
            schedules). Your actual rate varies by consumption tier, time-of-use pricing, and distributor.
          </>
        )}
        {anyUser && !anyProv && 'These reflect your real marginal cost per GJ; upgrade savings are calculated from it.'}
      </p>
    </div>
  )
}
