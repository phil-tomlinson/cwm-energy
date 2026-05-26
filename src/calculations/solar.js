// ── Solar PV calculation ──────────────────────────────────────────────────────
// Pure function — no UI dependencies. Takes system inputs, returns annual
// generation, savings, payback, and emissions numbers.

import {
  provincialIrradiance,
  gridEmissionFactors,
  netMeteringTypes,
  orientationFactors,
} from '../data/solarData'

import { provincialPrices } from '../data/energyPrices'

// ── Constants ─────────────────────────────────────────────────────────────────

// System performance ratio: accounts for inverter efficiency, wiring losses,
// soiling, and temperature de-rating. 0.80 is standard industry assumption.
const PERFORMANCE_RATIO = 0.80

// Annual panel output degradation: ~0.5%/year is typical for modern modules.
const DEGRADATION_RATE = 0.005

// Standard panel warranty / useful lifetime.
const PANEL_LIFETIME_YEARS = 25

// Fraction of annual generation consumed on-site (not exported to the grid).
// Higher self-consumption = higher savings (retail rate vs. export rate).
// Base:  typical home without EV — most generation happens while occupants are out.
// EV:    home with daytime EV charging shifts load to coincide with solar peak.
export const SELF_CONSUMPTION_BASE = 0.35
export const SELF_CONSUMPTION_EV   = 0.55

// For provinces with avoided-cost net metering (e.g. Ontario), exported kWh
// are credited at this fraction of the retail rate.
const AVOIDED_COST_FRACTION = 0.40

// Alberta 'variable' net metering: production is highly seasonal.
// Roughly 58% of annual generation falls in May–Sep, the months when a
// typical residential system tips into net-exporter status and earns the
// premium commodity rate. Used to blend net-importer and net-exporter
// export credit rates into a single annual average.
const AB_SUMMER_EXPORT_FRACTION = 0.58

// Default 2024 installed cost per kW (CAD, all-in: panels, inverter, racking,
// installation, permits, interconnection). Mid-range Canadian market.
export const DEFAULT_INSTALL_COST_PER_KW = 2800

// ── Primary calculation ───────────────────────────────────────────────────────

/**
 * Calculate annual solar PV generation, savings, payback, and CO₂ offset.
 *
 * @param {object}  p
 * @param {number}   p.systemKW            - Installed capacity (kW DC)
 * @param {string}   p.province            - Province code, e.g. 'AB'
 * @param {string}   [p.orientation]       - Roof orientation key (default 'south')
 * @param {boolean}  [p.hasEV]             - Boost self-consumption if home has/will have an EV
 * @param {number}   [p.installCostPerKW]  - Override installed $/kW
 * @param {number}   [p.incentives]        - Upfront rebate/incentive amount (CAD)
 *
 * @returns {SolarResult}
 */
export function calculateSolar({
  systemKW,
  province,
  orientation      = 'south',
  hasEV            = false,
  installCostPerKW = DEFAULT_INSTALL_COST_PER_KW,
  incentives       = 0,
}) {
  // ── Resource / rate lookups ─────────────────────────────────────────────────
  const irradiance       = provincialIrradiance[province]   ?? 1150   // kWh/kWp/yr
  const orientFactor     = orientationFactors[orientation]  ?? 1.00
  const gridEmFactor     = gridEmissionFactors[province]    ?? 200    // g CO₂e/kWh
  const netMeteringType  = netMeteringTypes[province]       ?? 'retail'
  const electricityRate  = provincialPrices[province]?.electricity  ?? 0.15  // $/kWh (all-in import rate)

  // Per-province export rates (commodity-only, where D&T is not credited back).
  // Null means use electricityRate (i.e. the province has true retail net metering).
  const exportCommodityRate = provincialPrices[province]?.electricityExport       ?? null
  const exportPremiumRate   = provincialPrices[province]?.electricityExportPremium ?? null

  // ── Annual generation ───────────────────────────────────────────────────────
  // DC output × orientation factor × performance ratio = usable AC energy
  const annualGenKWh = systemKW * irradiance * orientFactor * PERFORMANCE_RATIO

  // ── Self-consumption split ──────────────────────────────────────────────────
  const selfRate        = hasEV ? SELF_CONSUMPTION_EV : SELF_CONSUMPTION_BASE
  const selfConsumedKWh = annualGenKWh * selfRate
  const exportedKWh     = annualGenKWh - selfConsumedKWh

  // ── Export credit rate ──────────────────────────────────────────────────────
  // 'variable' (AB): auto-switches between commodity-only and premium rates each
  // billing month based on net import/export position. Blend by seasonal production
  // fraction — ~58% of AB annual generation falls in net-exporter months (May–Sep).
  const exportRate =
    netMeteringType === 'retail'
      ? electricityRate
    : netMeteringType === 'avoided'
      ? electricityRate * AVOIDED_COST_FRACTION
    : netMeteringType === 'variable'
      ? (exportCommodityRate ?? electricityRate) * (1 - AB_SUMMER_EXPORT_FRACTION)
        + (exportPremiumRate  ?? electricityRate) * AB_SUMMER_EXPORT_FRACTION
    : 0  // 'none' — no credit for exported energy

  // ── Annual savings ──────────────────────────────────────────────────────────
  // Self-consumed kWh are worth full retail (avoided purchase).
  // Exported kWh are worth the net-metering rate.
  const annualSavingsCAD = (selfConsumedKWh * electricityRate) + (exportedKWh * exportRate)

  // ── System cost and payback ─────────────────────────────────────────────────
  const grossCostCAD = systemKW * installCostPerKW
  const netCostCAD   = Math.max(0, grossCostCAD - incentives)
  const paybackYears = annualSavingsCAD > 0 ? netCostCAD / annualSavingsCAD : Infinity

  // ── 25-year lifetime economics ──────────────────────────────────────────────
  // Accounts for panel degradation only — no electricity price inflation.
  // A modest 2%/year electricity price increase would improve these numbers.
  const lifetimeSavingsCAD = Array.from({ length: PANEL_LIFETIME_YEARS }, (_, i) =>
    annualSavingsCAD * Math.pow(1 - DEGRADATION_RATE, i)
  ).reduce((a, b) => a + b, 0)

  const lifetimeNetGainCAD = lifetimeSavingsCAD - netCostCAD

  // ── Carbon offset ───────────────────────────────────────────────────────────
  // Note: in near-zero-emission grids (QC, MB, BC), this figure is very small.
  // In fossil-heavy grids (AB, SK, NU), it's substantial.
  const co2AvoidedTonnes = (annualGenKWh * gridEmFactor) / 1_000_000  // g → tonnes

  // ── Equivalent metrics (for display) ───────────────────────────────────────
  // kWh per average Canadian home ≈ 11,000 kWh/yr (StatsCan 2021)
  const homesEquivalent = annualGenKWh / 11000

  return {
    // Generation
    annualGenKWh:       Math.round(annualGenKWh),
    selfConsumedKWh:    Math.round(selfConsumedKWh),
    exportedKWh:        Math.round(exportedKWh),
    selfConsumptionPct: Math.round(selfRate * 100),

    // Financials
    annualSavingsCAD:   Math.round(annualSavingsCAD),
    grossCostCAD:       Math.round(grossCostCAD),
    netCostCAD:         Math.round(netCostCAD),
    paybackYears:       Math.round(paybackYears * 10) / 10,
    lifetimeSavingsCAD: Math.round(lifetimeSavingsCAD),
    lifetimeNetGainCAD: Math.round(lifetimeNetGainCAD),

    // Carbon
    co2AvoidedTonnes:   Math.round(co2AvoidedTonnes * 10) / 10,
    gridEmFactor,                         // exposed for display context (g CO₂e/kWh)

    // Net-metering context (used by UI to explain the export rate)
    netMeteringType,
    electricityRate,
    exportRate:         Math.round(exportRate * 1000) / 1000,
    // Exposed for 'variable' provinces (AB) — null for others
    exportCommodityRate: exportCommodityRate != null ? Math.round(exportCommodityRate * 1000) / 1000 : null,
    exportPremiumRate:   exportPremiumRate   != null ? Math.round(exportPremiumRate   * 1000) / 1000 : null,

    // Display helpers
    homesEquivalent:    Math.round(homesEquivalent * 10) / 10,
  }
}

// ── EV synergy ────────────────────────────────────────────────────────────────

/**
 * Calculate the incremental benefit of pairing solar with an EV —
 * i.e., how much the solar economics improve when daytime EV charging
 * shifts the self-consumption rate from SELF_CONSUMPTION_BASE to SELF_CONSUMPTION_EV.
 *
 * Returns the *difference* between the with-EV and without-EV solar result,
 * not the EV savings themselves.
 *
 * @param {object} params - Same params as calculateSolar()
 * @returns {{ extraAnnualSavings, paybackImprovement, selfConsumptionBoost }}
 */
export function calculateSolarEvSynergy(params) {
  const withoutEV = calculateSolar({ ...params, hasEV: false })
  const withEV    = calculateSolar({ ...params, hasEV: true  })

  return {
    extraAnnualSavingsCAD:  withEV.annualSavingsCAD  - withoutEV.annualSavingsCAD,
    paybackImprovement:     withoutEV.paybackYears   - withEV.paybackYears,   // years sooner
    selfConsumptionBoost:   withEV.selfConsumptionPct - withoutEV.selfConsumptionPct,
    withEV,
    withoutEV,
  }
}

// ── Size presets ──────────────────────────────────────────────────────────────

/**
 * Generate 2–3 system-size presets capped at the roof's maximum kW.
 * Designed for the quick-pick UI (like the floor-area size buttons in SimpleMode).
 *
 * @param {number} maxKW - Maximum installable capacity from estimateRoofCapacity()
 * @returns {Array<{ label: string, kw: number, sub: string }>}
 */
export function solarSizePresets(maxKW) {
  if (!maxKW || maxKW <= 0) return []

  const round = v => Math.round(v * 10) / 10

  // Small: ~3 kW or 40% of max (whichever is less)
  const small = round(Math.min(3, maxKW * 0.40, maxKW))

  // Medium: ~60% of max, at least 1.5 kW above small
  const medRaw = Math.min(maxKW * 0.60, maxKW)
  const medium = round(Math.max(small + 1.5, medRaw))

  const presets = []

  if (small > 0) {
    presets.push({
      label: 'Small',
      kw:    small,
      sub:   `${small} kW`,
    })
  }

  if (medium > small + 0.9 && medium < maxKW - 0.9) {
    presets.push({
      label: 'Medium',
      kw:    medium,
      sub:   `${medium} kW`,
    })
  }

  presets.push({
    label: maxKW <= 4 ? 'Maximum' : 'Large',
    kw:    round(maxKW),
    sub:   `${round(maxKW)} kW · roof limit`,
  })

  return presets
}

// ── Type definition (JSDoc) ───────────────────────────────────────────────────
/**
 * @typedef {object} SolarResult
 * @property {number} annualGenKWh
 * @property {number} selfConsumedKWh
 * @property {number} exportedKWh
 * @property {number} selfConsumptionPct
 * @property {number} annualSavingsCAD
 * @property {number} grossCostCAD
 * @property {number} netCostCAD
 * @property {number} paybackYears
 * @property {number} lifetimeSavingsCAD
 * @property {number} lifetimeNetGainCAD
 * @property {number} co2AvoidedTonnes
 * @property {number} gridEmFactor
 * @property {string} netMeteringType
 * @property {number} electricityRate
 * @property {number} exportRate
 * @property {number} homesEquivalent
 */
