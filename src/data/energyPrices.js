// Approximate Canadian retail energy prices (2024).
// Natural gas: $/GJ   |   Electricity: $/kWh   |   Oil & Propane: $/L
// Sources: provincial utility websites, NRCan Energy Prices report.
// Note: actual rates vary by utility and usage tier. Users should verify with their bill.

export const fuelTypes = [
  { value: 'naturalGas',   label: 'Natural gas' },
  { value: 'electricity',  label: 'Electricity' },
  { value: 'heatingOil',   label: 'Heating oil (furnace oil)' },
  { value: 'propane',      label: 'Propane' },
]

// Heating system options per fuel type, with default efficiency
export const heatingSystemTypes = {
  naturalGas: [
    { value: 'furnace_80',  label: 'Gas furnace – standard (80% AFUE)',        efficiency: 0.80 },
    { value: 'furnace_90',  label: 'Gas furnace – mid-efficiency (90% AFUE)',   efficiency: 0.90 },
    { value: 'furnace_96',  label: 'Gas furnace – high-efficiency (96% AFUE)',  efficiency: 0.96 },
    { value: 'boiler_gas',  label: 'Gas boiler (hydronic)',                     efficiency: 0.85 },
  ],
  electricity: [
    { value: 'baseboard',   label: 'Electric baseboard / in-floor',             efficiency: 1.00 },
    { value: 'ashp',        label: 'Air-source heat pump (avg. COP 2.5)',        efficiency: 2.50 },
    { value: 'gshp',        label: 'Ground-source heat pump (avg. COP 3.5)',     efficiency: 3.50 },
  ],
  heatingOil: [
    { value: 'oil_75',      label: 'Oil furnace – older (75% AFUE)',             efficiency: 0.75 },
    { value: 'oil_86',      label: 'Oil furnace – high-efficiency (86% AFUE)',   efficiency: 0.86 },
  ],
  propane: [
    { value: 'propane_80',  label: 'Propane furnace – standard (80% AFUE)',      efficiency: 0.80 },
    { value: 'propane_96',  label: 'Propane furnace – high-efficiency (96% AFUE)', efficiency: 0.96 },
  ],
}

// Approximate 2024 retail prices by province
export const provincialPrices = {
  BC: { naturalGas: 11.0, electricity: 0.128, heatingOil: 1.35, propane: 0.95 },
  AB: { naturalGas:  5.0, electricity: 0.165, heatingOil: 1.30, propane: 0.75 },
  SK: { naturalGas:  9.0, electricity: 0.158, heatingOil: 1.40, propane: 0.85 },
  MB: { naturalGas:  8.0, electricity: 0.097, heatingOil: 1.38, propane: 0.82 },
  ON: { naturalGas: 12.0, electricity: 0.165, heatingOil: 1.42, propane: 0.90 },
  QC: { naturalGas: 10.5, electricity: 0.073, heatingOil: 1.40, propane: 0.88 },
  NB: { naturalGas: null, electricity: 0.155, heatingOil: 1.45, propane: 0.92 },
  NS: { naturalGas: null, electricity: 0.175, heatingOil: 1.48, propane: 0.94 },
  PE: { naturalGas: null, electricity: 0.173, heatingOil: 1.46, propane: 0.93 },
  NL: { naturalGas: null, electricity: 0.134, heatingOil: 1.44, propane: 0.91 },
  YT: { naturalGas: null, electricity: 0.158, heatingOil: 1.60, propane: 1.10 },
  NT: { naturalGas: null, electricity: 0.280, heatingOil: 1.70, propane: 1.20 },
  NU: { naturalGas: null, electricity: 0.380, heatingOil: 1.90, propane: 1.40 },
}

// Convert raw fuel price to $/GJ for uniform cost calculations:
//   Natural gas price is already in $/GJ
//   Electricity: 1 kWh = 0.0036 GJ  →  multiplier = 1/0.0036 = 277.78
//   Heating oil: ~38.2 MJ/L          →  multiplier = 1000/38.2  = 26.18
//   Propane:     ~25.3 MJ/L          →  multiplier = 1000/25.3  = 39.53
const priceMultipliers = {
  naturalGas:  1,
  electricity: 277.78,
  heatingOil:  26.18,
  propane:     39.53,
}

export function getFuelCostPerGJ(province, fuelType) {
  const prices = provincialPrices[province]
  if (!prices) return null
  const pricePerUnit = prices[fuelType]
  if (!pricePerUnit) return null
  return pricePerUnit * priceMultipliers[fuelType]
}
