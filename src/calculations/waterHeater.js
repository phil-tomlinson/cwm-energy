// Water Heater Energy Calculation
// Methodology: NRCan hot water energy use model
//
// UEF (Uniform Energy Factor) captures all losses — standby, cycling, distribution.
// Useful heat = mass × specific heat × temperature rise
// Input energy = Useful heat / UEF

const J_TO_GJ = 1e-9

// Specific heat capacity of water at service temperature (~50°C): 4,182–4,186 J/(kg·K).
// Per ASHRAE Handbook of Fundamentals 2021, Chapter 2, Table 2
// (thermophysical properties of liquid water).
const WATER_CP = 4186    // J/(kg·°C)

// Water density at service temperature (~50°C): 0.988 kg/L; rounded to 1.0 kg/L for simplicity.
// Per ASHRAE Fundamentals 2021, Chapter 2, Table 2.
const WATER_DENSITY = 1.0     // kg/L

// NRCan average hot water consumption: 50 L/person/day at 55°C.
// Per NRCan, HOT2000 Technical Manual, Section 4.2; consistent with NRCan,
// Survey of Household Energy Use (SHEU) 2011.
const LITRES_PER_PERSON = 50  // L/person/day

// UEF (Uniform Energy Factor) defaults per NRCan EnerGuide rating system and
// US DOE 10 CFR Part 430 test procedure (2017). Representative mid-range values
// for currently-available equipment.
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
 * @param {number} setpointTemp    - Hot water delivery temperature (°C), default 55°C.
 *   55°C is recommended by Health Canada to prevent Legionella growth
 *   (Health Canada, Guidelines for Canadian Drinking Water Quality — Legionella).
 *   Also consistent with NRCan HOT2000 default (HOT2000 Technical Manual, Section 4.2).
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
