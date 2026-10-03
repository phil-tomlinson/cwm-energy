// ── Emission factor registry ──────────────────────────────────────────────────
// One place for every factor the timeline engine uses, indexed by province and
// year where that matters. Every entry carries its source so the UI can show it.
//
// Basis: these are DIRECT (combustion) factors. The spec's decision is to report
// on a lifecycle basis; the lifecycle uplift (upstream fuel + imports, calibrated
// against Electricity Maps) is a follow-up data task and is flagged in the UI.

export type Province =
  | 'BC' | 'AB' | 'SK' | 'MB' | 'ON' | 'QC' | 'NB'
  | 'NS' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU'

export interface Factor {
  value: number
  unit: string
  source: string
  /** true when this year has no published value and a neighbouring year is held */
  held?: boolean
  note?: string
}

// Grid consumption intensity, g CO2e/kWh, by DATA year.
// Source: ECCC, Federal GHG Offset System, "Emission factors and reference values",
// Tables 5.1–5.4, which reproduce the National Inventory Report consumption
// intensities (NIR 1990–2021 → data year 2021 … NIR 1990–2024 → data year 2024).
const NIR_SOURCE: Record<number, string> = {
  2021: 'ECCC, NIR 1990–2021, Part 3, Tables A13-2 to A13-14',
  2022: 'ECCC, NIR 1990–2022, Part 3, Tables A13-2 to A13-14',
  2023: 'ECCC, NIR 1990–2023, Part 3, Tables A13-2 to A13-14',
  2024: 'ECCC, NIR 1990–2024, Part 3, Tables A7-2 to A7-14',
}

export const GRID_G_PER_KWH: Record<Province, Record<number, number>> = {
  BC: { 2021: 15,  2022: 15,  2023: 18,  2024: 18 },
  AB: { 2021: 540, 2022: 490, 2023: 438, 2024: 346 },
  SK: { 2021: 730, 2022: 670, 2023: 631, 2024: 581 },
  MB: { 2021: 2.0, 2022: 1.4, 2023: 2.5, 2024: 3.0 },
  ON: { 2021: 30,  2022: 38,  2023: 59,  2024: 73 },
  QC: { 2021: 1.7, 2022: 1.7, 2023: 1.9, 2024: 2.6 },
  NB: { 2021: 300, 2022: 350, 2023: 234, 2024: 375 },
  NS: { 2021: 690, 2022: 700, 2023: 581, 2024: 628 },
  PE: { 2021: 300, 2022: 350, 2023: 234, 2024: 265 },
  NL: { 2021: 17,  2022: 18,  2023: 17,  2024: 17 },
  YT: { 2021: 80,  2022: 70,  2023: 74,  2024: 134 },
  NT: { 2021: 170, 2022: 190, 2023: 420, 2024: 490 },
  NU: { 2021: 840, 2022: 820, 2023: 800, 2024: 760 },
}

const FIRST_GRID_YEAR = 2021
const LAST_GRID_YEAR = 2024

/** Grid intensity for a province and calendar year, in kg CO2e per kWh. */
export function gridFactor(province: Province, year: number): Factor {
  const series = GRID_G_PER_KWH[province]
  const y = Math.min(Math.max(year, FIRST_GRID_YEAR), LAST_GRID_YEAR)
  const value = series[y] / 1000
  const held = y !== year
  return {
    value,
    unit: 'kg CO2e/kWh',
    source: NIR_SOURCE[y],
    held,
    note: held
      ? year < FIRST_GRID_YEAR
        ? `No year-specific value loaded for ${year} yet; using ${y}. Earlier years were usually higher on fossil-heavy grids, so this understates past impact.`
        : `No published value for ${year} yet; using ${y}.`
      : undefined,
  }
}

// Fuel combustion factors.
export const FUEL = {
  // kg CO2e per GJ of fuel input. Source: NRCan national averages (METHODOLOGY.md §12).
  naturalGas: { value: 50.3, unit: 'kg CO2e/GJ', source: 'NRCan national average (METHODOLOGY.md §12)' },
  heatingOil: { value: 72.6, unit: 'kg CO2e/GJ', source: 'NRCan national average (METHODOLOGY.md §12)' },
  propane:    { value: 61.4, unit: 'kg CO2e/GJ', source: 'NRCan national average (METHODOLOGY.md §12)' },
  // kg CO2e per litre. Source: ECCC Federal GHG Offset System, Table 4.1.
  gasoline:   { value: 2.307, unit: 'kg CO2e/L', source: 'ECCC, Emission factors and reference values, Table 4.1' },
  diesel:     { value: 2.681, unit: 'kg CO2e/L', source: 'ECCC, Emission factors and reference values, Table 4.1' },
} satisfies Record<string, Factor>

// Stated assumptions: good-enough defaults the user can replace with real data.
export const ASSUMPTIONS = {
  baseloadKWh: {
    value: 7000, unit: 'kWh/yr per home',
    source: 'Assumption: lighting, appliances and electronics in a typical home. Replace with your bills.',
  },
  gasolinePrice: {
    value: 1.5, unit: '$/L',
    source: 'Assumption, same default as the EV Benefit Calculator.',
  },
  elephantTonnes: {
    value: 5, unit: 't',
    source: 'Adult African elephants weigh roughly 4 to 7 tonnes; we use 5.',
  },
} satisfies Record<string, Factor>

/** Canada's 2030 goal is 40–45% below 2005. We apply 45% to the user's first timeline year. */
export const TARGET_CUT_2030 = 0.45

export const PROVINCES: { code: Province; name: string }[] = [
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'ON', name: 'Ontario' },
  { code: 'QC', name: 'Quebec' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
]
