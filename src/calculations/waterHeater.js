// Water Heater Energy Calculation
// Methodology: NRCan hot water energy use model
//
// UEF (Uniform Energy Factor) captures all losses — standby, cycling, distribution.
// Useful heat = mass × specific heat × temperature rise
// Input energy = Useful heat / UEF

const J_TO_GJ          = 1e-9
const WATER_CP         = 4186    // J/(kg·°C)
const WATER_DENSITY    = 1.0     // kg/L
const LITRES_PER_PERSON = 50     // L/person/day  (NRCan residential average)

export const waterHeaterTypes = [
  { value: 'storage_gas',       label: 'Storage tank – natural gas (standard)',       defaultUef: 0.60, fuel: 'naturalGas'  },
  { value: 'storage_gas_high',  label: 'Storage tank – natural gas (power vent)',      defaultUef: 0.67, fuel: 'naturalGas'  },
  { value: 'storage_electric',  label: 'Storage tank – electric',                      defaultUef: 0.90, fuel: 'electricity' },
  { value: 'tankless_gas',      label: 'Tankless (on-demand) – natural gas',           defaultUef: 0.87, fuel: 'naturalGas'  },
  { value: 'tankless_electric', label: 'Tankless – electric',                          defaultUef: 0.98, fuel: 'electricity' },
  { value: 'hpwh',              label: 'Heat pump water heater (HPWH)',                defaultUef: 3.50, fuel: 'electricity' },
]

/**
 * Calculate annual water heater energy use and cost.
 *
 * @param {number} occupants       - Number of people in household
 * @param {number} uef             - Uniform Energy Factor (dimensionless)
 * @param {string} fuelType        - 'naturalGas' | 'electricity' | etc.
 * @param {number} coldWaterTemp   - Inlet cold water temperature (°C)
 * @param {number} fuelCostPerGJ   - $/GJ for the selected fuel
 * @param {number} setpointTemp    - Hot water delivery temperature (°C), default 55°C
 * @returns {Object}
 */
export function calculateWaterHeater(occupants, uef, fuelType, coldWaterTemp, fuelCostPerGJ, setpointTemp = 55) {
  const deltaT       = setpointTemp - coldWaterTemp        // °C rise
  const dailyVolume  = occupants * LITRES_PER_PERSON       // L/day

  // Useful heat delivered to water per year (GJ)
  const usefulEnergyGJ = dailyVolume * WATER_DENSITY * WATER_CP * deltaT * 365 * J_TO_GJ

  // Fuel input required per year (accounts for all losses via UEF)
  const inputEnergyGJ = usefulEnergyGJ / uef

  const annualCost = inputEnergyGJ * fuelCostPerGJ

  return {
    usefulEnergyGJ,
    inputEnergyGJ,
    annualCost,
    dailyVolume,
    deltaT,
    occupants,
  }
}
