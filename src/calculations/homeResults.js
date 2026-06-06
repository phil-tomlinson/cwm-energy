import { calculateHeatLoss, buildEnvelopeFromDefaults } from './heatLoss'
import { calculateWaterHeater } from './waterHeater'
import { generateRecommendations } from './recommendations'
import { getFuelCostPerGJ } from '../data/energyPrices'
import { getUserRatePerGJ } from '../data/energyRates'
import { eraDefaults } from '../data/houseDefaults'

/**
 * Run the full home heat-loss → water-heater → recommendations pipeline for a
 * given wizard `data` object and return the complete results bundle.
 *
 * Single source of truth for both the calculator wizard and the plan page's
 * "apply my actual energy cost" flow, so re-deriving with a new rate is identical
 * everywhere. Fuel prices resolve as: the user's own bill-derived rate (if any) →
 * the province's average → any value already stored on `data`.
 *
 * @returns {{ inputs, envelope, heatLoss, waterHeater, recommendations }}
 */
export function computeHomeResults(data) {
  const era = eraDefaults[data.era]
  const envelope = data.envelope ?? buildEnvelopeFromDefaults(
    data.houseType, data.floorArea, data.storeys, data.basementType, era, data.basementWallHeight ?? 2.1
  )

  const rateFor = (fuelType, stored) => {
    const userRate = getUserRatePerGJ(fuelType)
    const perGJ = userRate ?? getFuelCostPerGJ(data.province, fuelType) ?? stored
    return { perGJ, source: userRate != null ? 'user-bills' : 'provincial' }
  }

  const heatingRate = rateFor(data.heating.fuelType, data.heating.fuelCostPerGJ)
  const whRate      = rateFor(data.waterHeater.fuelType, data.waterHeater.fuelCostPerGJ)
  const elecRate    = rateFor('electricity', null)

  const fuelCostPerGJ        = heatingRate.perGJ
  const whFuelCostPerGJ      = whRate.perGJ
  const electricityCostPerGJ = elecRate.perGJ

  const heatLossResult = calculateHeatLoss({
    climate:             data.climate,
    envelope,
    floorArea:           data.floorArea,
    storeys:             data.storeys,
    basementType:        data.basementType,
    ceilingHeight:       data.ceilingHeight ?? 2.44,
    basementWallHeight:  data.basementWallHeight ?? 2.1,
    heating:             { efficiency: data.heating.efficiency, fuelCostPerGJ },
    hrv:                 data.hrv ?? { has: false, effectiveness: 0 },
    solarInputs:         data.solarInputs ?? { southFraction: 0 },
  })

  const waterHeaterResult = calculateWaterHeater(
    data.waterHeater.occupants,
    data.waterHeater.uef,
    data.waterHeater.fuelType,
    data.climate.coldWaterTemp,
    whFuelCostPerGJ,
  )

  const recommendations = generateRecommendations(
    heatLossResult, waterHeaterResult,
    {
      envelope,
      heating: { systemId: data.heating.systemId, fuelType: data.heating.fuelType, efficiency: data.heating.efficiency, fuelCostPerGJ },
      waterHeater:        data.waterHeater,
      climate:            data.climate,
      electricityCostPerGJ,
      airLeakageFactors:  data.airLeakageFactors,
      floorArea:          data.floorArea,
      storeys:            data.storeys,
      province:           data.province,
      houseType:          data.houseType,
    }
  )

  // Record the prices actually used (and their source) so the results and the
  // energy-price panel stay consistent with the calculation.
  const usedRates = []
  const seenFuels = new Set()
  for (const [fuelType, rate] of [
    [data.heating.fuelType, heatingRate],
    [data.waterHeater.fuelType, whRate],
    ['electricity', elecRate],
  ]) {
    if (rate.perGJ == null || seenFuels.has(fuelType)) continue
    seenFuels.add(fuelType)
    usedRates.push({ fuelType, perGJ: rate.perGJ, source: rate.source })
  }

  const inputs = {
    ...data,
    heating:     { ...data.heating,     fuelCostPerGJ },
    waterHeater: { ...data.waterHeater, fuelCostPerGJ: whFuelCostPerGJ },
    usedRates,
  }

  return { inputs, envelope, heatLoss: heatLossResult, waterHeater: waterHeaterResult, recommendations }
}
