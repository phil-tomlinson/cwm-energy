/**
 * Provincial residential energy prices (approximate, 2024).
 * Sources:
 *   - Natural gas: NRCan, Energy Fact Book 2023-24; provincial utility rate schedules
 *     (BC Hydro, ATCO, SaskEnergy, Enbridge, etc.)
 *   - Electricity: NRCan, Electricity Facts 2023; Hydro-Québec Comparison of Electricity Prices
 *     in Major North American Cities (2024 edition)
 *   - Heating oil: NRCan, Weekly Retail Petroleum Product Prices (2024 average)
 *   - Propane: NRCan Energy Prices Report 2023; provincial distributor averages
 * Prices are approximate mid-range residential rates. Actual bills vary by consumption tier,
 * time-of-use pricing, and distributor. Update annually.
 */

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
  // AB: deregulated market — electricity is the true all-in import cost (commodity + D&T + admin,
  // empirically derived from bill analysis). Export credits are commodity-only and rate-tier-dependent;
  // see electricityExport / electricityExportPremium. Propane/oil rates are rough — not well-validated.
  AB: {
    naturalGas:              5.0,
    electricity:             0.215,  // all-in import rate (commodity ~$0.084 + D&T ~$0.131)
    electricityExport:       0.084,  // net-importer months — commodity rate only, no D&T credit
    electricityExportPremium: 0.350, // net-exporter months — premium commodity rate (auto-applied)
    heatingOil:              1.30,
    propane:                 0.75,
  },
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
//   Natural gas price is already in $/GJ (sold in GJ in Canada)
//   Electricity: 1 kWh = 0.0036 GJ → $/kWh × 277.78 = $/GJ
//     (ASHRAE / SI unit conversion: 1 kWh = 3600 J = 3.6×10⁻³ GJ → 1/0.0036 = 277.78)
//   Heating oil: ~38.2 MJ/L net calorific value (NRCan, Energy Density Reference Table)
//     → 1/0.0382 GJ/L = 26.18 $/GJ multiplier; converts $/L to $/GJ
//   Propane: ~25.3 MJ/L net calorific value (NRCan, Energy Density Reference Table)
//     → 1/0.0253 = 39.53; multiplier converts $/L to $/GJ
const priceMultipliers = {
  naturalGas:  1,
  electricity: 277.78,   // 1 kWh = 0.0036 GJ → ASHRAE / SI unit conversion
  heatingOil:  26.18,    // Heating oil: ~38.2 MJ/L net calorific value (NRCan)
  propane:     39.53,    // Propane: ~25.3 MJ/L net calorific value (NRCan)
}

export function getFuelCostPerGJ(province, fuelType) {
  const prices = provincialPrices[province]
  if (!prices) return null
  const pricePerUnit = prices[fuelType]
  if (!pricePerUnit) return null
  return pricePerUnit * priceMultipliers[fuelType]
}

// ── Flat heating-system list ─────────────────────────────────────────────────
// Single list users can pick from directly — no two-step fuel→system flow.
// effUnit: 'cop' (heat pumps / electric) | 'afue' (fossil-fuel furnaces)
// Ordered: gas furnaces first (most common in Canada), heat pumps,
// electric baseboard, oil, propane.
export const HEATING_SYSTEMS = [
  // Gas furnaces ──────────────────────────────────────────────────────────────
  {
    id: 'furnace_96',
    label: 'High-efficiency gas furnace (96%+ AFUE)',
    fuelType: 'naturalGas',
    efficiency: 0.96,
    effUnit: 'afue',
    hint: 'Condensing with PVC flue — most common new installation',
  },
  {
    id: 'furnace_90',
    label: 'Mid-efficiency gas furnace (90% AFUE)',
    fuelType: 'naturalGas',
    efficiency: 0.90,
    effUnit: 'afue',
    hint: 'Common 2000s–2010s installation',
  },
  {
    id: 'furnace_80',
    label: 'Standard gas furnace (~80% AFUE)',
    fuelType: 'naturalGas',
    efficiency: 0.80,
    effUnit: 'afue',
    hint: 'Typical older or builder-grade unit',
  },
  {
    id: 'boiler_gas',
    label: 'Gas boiler — radiators / in-floor (85%)',
    fuelType: 'naturalGas',
    efficiency: 0.85,
    effUnit: 'afue',
    hint: 'Hydronic system — common in older homes',
  },
  // Heat pumps ────────────────────────────────────────────────────────────────
  {
    id: 'ccashp',
    label: 'Cold-climate heat pump (ASHP)',
    fuelType: 'electricity',
    efficiency: 3.0,
    effUnit: 'cop',
    hint: 'e.g. Mitsubishi Hyper-Heat — rated to −25 °C (COP ~3.0)',
  },
  {
    id: 'ashp',
    label: 'Standard heat pump (ASHP)',
    fuelType: 'electricity',
    efficiency: 2.5,
    effUnit: 'cop',
    hint: 'Best in mild climates; efficiency drops below −10 °C (COP ~2.5)',
  },
  {
    id: 'gshp',
    label: 'Ground-source heat pump (GSHP)',
    fuelType: 'electricity',
    efficiency: 3.5,
    effUnit: 'cop',
    hint: 'Highest efficiency; high upfront cost (COP ~3.5)',
  },
  // Electric ──────────────────────────────────────────────────────────────────
  {
    id: 'baseboard',
    label: 'Electric baseboard heaters',
    fuelType: 'electricity',
    efficiency: 1.0,
    effUnit: 'cop',
    hint: '100% efficient — but electricity is expensive per GJ vs. gas',
  },
  // Oil ───────────────────────────────────────────────────────────────────────
  {
    id: 'oil_86',
    label: 'High-efficiency oil furnace (86% AFUE)',
    fuelType: 'heatingOil',
    efficiency: 0.86,
    effUnit: 'afue',
    hint: 'Common in Atlantic Canada',
  },
  {
    id: 'oil_75',
    label: 'Standard oil furnace (75% AFUE)',
    fuelType: 'heatingOil',
    efficiency: 0.75,
    effUnit: 'afue',
    hint: 'Older oil furnace',
  },
  // Propane ───────────────────────────────────────────────────────────────────
  {
    id: 'propane_96',
    label: 'High-efficiency propane furnace (96%)',
    fuelType: 'propane',
    efficiency: 0.96,
    effUnit: 'afue',
    hint: 'Rural areas without natural gas — new installation',
  },
  {
    id: 'propane_80',
    label: 'Standard propane furnace (80% AFUE)',
    fuelType: 'propane',
    efficiency: 0.80,
    effUnit: 'afue',
    hint: 'Older propane installation',
  },
]
