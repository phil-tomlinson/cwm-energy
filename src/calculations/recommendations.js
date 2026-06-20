// Upgrade Recommendations Engine
// Ranks improvements by simple payback period (installed cost ÷ annual savings).
//
// For each upgrade we calculate:
//   annualSavingsCAD  — reduction in annual energy bills
//   estimatedCostCAD  — mid-range Canadian installed cost (2024 CAD)
//   paybackYears      — simple payback (cost / savings)

import { calculateSolar, solarSizePresets, DEFAULT_INSTALL_COST_PER_KW } from './solar'
import { estimateRoofCapacity } from '../data/solarData'

const S_PER_DAY = 86400
const J_TO_GJ   = 1e-9
const AIR_HEAT_CAPACITY = 0.335

// CO₂ emission factors (tonnes CO₂e/GJ input energy).
// National average grid emission intensities from:
//   - NRCan, National Energy Use Database (NEUD) 2021
//   - Environment and Climate Change Canada, National Inventory Report 2022
// Natural gas: 0.0503 t/GJ. Electricity: 0.014 t/GJ (national avg; QC/MB/BC significantly lower).
// Heating oil: 0.0726 t/GJ. Propane: 0.0614 t/GJ.
const CO2_FACTORS = {
  naturalGas:  0.0503,
  electricity: 0.014,    // national average; QC/MB/BC much lower
  heatingOil:  0.0726,
  propane:     0.0614,
}

// Mid-range installed costs in Canada (2024 CAD). Regional variation ±30%.
// Primary source: NRCan Canada Greener Homes Grant eligible cost benchmarks
//   (nrcan.gc.ca/energy-efficiency/homes/canada-greener-homes-grant, archived 2024).
// Where the grant benchmark is the only verifiable source, that is noted.
// Figures marked [UNVERIFIED ESTIMATE] lack a publicly auditable source and
// should be replaced with real quotes before this tool is used for financial planning.
const COSTS = {
  // Attic blown-in insulation: $40–90/m² installed.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // $65/m² = mid-range comprehensive job including air-sealing of penetrations.
  // Cost is scaled per m² of ceiling area — see attic section below.
  wallInsulation:     12000,
  // Window upgrade (double → triple or high-performance double): $600–900 per opening installed.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // $700 = mid-range.
  windowUpgrade:        700,   // per window
  // Air sealing: base $1,200 mobilisation + $5/m² floor area.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // Cost is scaled to floor area — see air sealing section below.
  //
  // Basement wall insulation (batt + vapour barrier or rigid foam): $3,500–5,000 typical.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  basementInsulation:  4000,
  // High-efficiency gas furnace (96% AFUE), supply + install: $5,000–7,500.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // $6,000 = mid-range. HRAI publishes member pricing data but it is not publicly accessible;
  // the NRCan grant benchmark is the verifiable source used here.
  furnaceUpgrade:      6000,
  // Air-source heat pump (CCASHP, supply + install, single-zone): $12,000–18,000.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // $14,000 = mid-range single-zone; multi-zone or ground-source higher.
  heatPump:           14000,
  // Tankless gas water heater, supply + install: $1,200–2,000.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // $1,500 = mid-range. [Needs independent contractor quote verification]
  waterHeaterUpgrade:  1500,
  // Heat pump water heater, supply + install: $1,500–2,500.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  hpwh:                1800,
  // Chimney balloon + professional damper/cap (masonry flue): ~$800.
  // Source: NRCan, "Keeping the Heat In" (Cat. M92-30/2012E), Chapter 3.
  chimneyMasonry:       800,
  // Vented gas fireplace damper kit + service call: ~$400.
  // [UNVERIFIED ESTIMATE — no publicly auditable Canadian source; needs contractor quote]
  chimneyGasVented:     400,
  // Smart thermostat (e.g. Ecobee SmartThermostat Premium ~$280, Nest ~$180) + installation.
  // Source: Home Depot Canada / Best Buy Canada retail pricing (verifiable, 2024).
  // $350 = mid-range device + one-hour HVAC contractor call.
  smartThermostat:       350,
  // Above-grade wall insulation (exterior rigid foam or interior batt): $60–100/m² installed.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // $75/m² = mid-range. Scaled per wall area in the recommendation.
  wallInsulationPerM2:    75,
  // Drain water heat recovery unit, supply + plumber install: $900–1,800.
  // Source: NRCan Canada Greener Homes Grant eligible cost benchmarks (2022–2024).
  // $1,400 = mid-range. [Needs independent contractor quote verification]
  drainWaterHR:          1400,
  // Aeroseal duct sealing (contractor, typical 150–250 m² home).
  // Finished empty home: ~$3,000. Finished furnished home: ~$4,500 (default).
  // Furnished homes require more prep and take longer due to furniture/duct access.
  aeroSeal:              4500,
}

function r_to_rsi(r) { return r / 5.678 }
function simplePayback(cost, savings) { return savings > 0 ? cost / savings : Infinity }

// Climate-adjusted attic R target.
// Recommended attic insulation levels by climate zone:
//   R-50: NRCan Zone 4–5 (HDD < 3,500)
//   R-60: Zone 6–7 (HDD 3,500–5,500)
//   R-80: Zone 7–8 (HDD > 5,500)
// Per NRCan, HOT2000 Technical Manual Table 3-2 and National Energy Code for Buildings
// (NECB) 2020 prescriptive envelope requirements.
function atticTargetR(hdd) {
  if (hdd < 3500) return 50   // mild (coastal BC) — NRCan zone 4–5
  if (hdd < 5500) return 60   // cold (most of Canada) — zone 6–7
  return 80                    // very cold (SK, MB, northern ON/QC) — zone 7–8
}

/**
 * Seasonal average COP estimate by outdoor design temperature and heat pump type.
 * Sources:
 *   - Standard ASHP: NRCan CanmetENERGY field monitoring program (2019–2023);
 *     AHRI 210/240 certified ratings for Canadian climate zones
 *   - CCASHP: NRCan cold-climate heat pump specification (equipment rated to maintain
 *     capacity at ≥ −25°C); Mitsubishi Zuba-Central, Bosch IDS, Daikin Fit field data
 *     from NRCan CanmetENERGY (2022 report: "Cold Climate Heat Pump Performance in Canada")
 * Design temperature bins correspond to NBCC 2020 Appendix C 2.5% January values.
 * These are seasonal averages, not rated-point COPs.
 *
 * NOTE: This function replaces the prior two-bin COP approach (designTemp >= -20 ? 2.8 : 2.2)
 * with a multi-bin model for improved accuracy across Canada's wide climate range.
 */
function heatPumpCOP(designTemp, isColdClimate = false) {
  // [designTemp threshold, standardCOP, ccashpCOP]
  const bins = [
    [-10, 3.0, 3.4],
    [-15, 2.6, 3.0],
    [-20, 2.2, 2.6],
    [-25, 1.8, 2.1],
    [-Infinity, 1.5, 1.8],
  ]
  const [, std, cc] = bins.find(([threshold]) => designTemp >= threshold)
  return isColdClimate ? cc : std
}

/**
 * Carbon cost-effectiveness of a recommendation, expressed as marginal abatement
 * cost: dollars spent per tonne of CO2 saved ($/t — lower = better value).
 * Recs with no/negative carbon saving return Infinity so they rank last under a
 * carbon priority.
 */
export const carbonCostPerTonne = (r) =>
  r.co2SavedTonnes > 0 ? r.estimatedCostCAD / r.co2SavedTonnes : Infinity

/**
 * Upgrades that touch the building structure or central/common systems — in a
 * condo or apartment these are strata / common-element scope, not something an
 * individual unit owner can carry out alone. Used to reframe the analysis for
 * high-density residential into "what you can do in your unit" vs "building-wide".
 */
export const BUILDING_SCOPE_IDS = new Set([
  'atticInsulation', 'basementInsulation', 'wallInsulation', 'rimJoists',
  'chimneySealing', 'windows', 'solar', 'aeroSeal', 'drainWaterHR', 'furnaceUpgrade',
])

/**
 * Comparator for the active priority:
 *  - 'bills'  → lowest simple payback first
 *  - 'carbon' → lowest cost per tonne of CO2 abated ($/t) first
 */
export const compareRecs = (priority) => (a, b) => {
  if (priority === 'bills') return a.paybackYears - b.paybackYears
  const ca = carbonCostPerTonne(a)
  const cb = carbonCostPerTonne(b)
  return ca === cb ? 0 : ca - cb   // equal (incl. both Infinity) → keep stable
}

/**
 * Generate a prioritised list of upgrade recommendations.
 *
 * @param {Object} heatLossResult    - Output of calculateHeatLoss()
 * @param {Object} waterHeaterResult - Output of calculateWaterHeater()
 * @param {Object} inputs            - See destructuring below for full shape
 * @returns {Array} Sorted recommendations (shortest payback first)
 */
export function generateRecommendations(heatLossResult, waterHeaterResult, inputs) {
  const { components, grossAirLeakageGJ, totalHeatLossGJ, annualFuelGJ, conditionedVolume } = heatLossResult
  const { envelope, heating, waterHeater, climate } = inputs
  const { hdd } = climate
  const { fuelCostPerGJ, efficiency, fuelType } = heating

  // Air leakage factors from Refined/Technical mode inputs (optional — default to neutral)
  const {
    chimney        = 'none',   // 'none' | 'masonry' | 'wood_insert' | 'gas_vented' | 'gas_sealed'
    exposedRimJoists = false,  // boolean
    recessedLights   = false,  // boolean — recessed pot lights below unconditioned attic
  } = inputs.airLeakageFactors ?? {}

  // Home geometry — used for cost scaling
  const floorArea = inputs.floorArea ?? 150
  const storeys   = inputs.storeys   ?? 2

  const recs = []

  // Convenience: annual savings from reducing a heat loss component
  function heatSavings(oldGJ, newGJ) {
    return Math.max(0, (oldGJ - newGJ) / efficiency * fuelCostPerGJ)
  }

  // ── 1. Attic insulation ──────────────────────────────────────────────────
  const targetAtticR = atticTargetR(hdd)
  if (envelope.ceilingR < targetAtticR) {
    const oldGJ   = components.ceiling
    const newGJ   = envelope.ceilingArea / r_to_rsi(targetAtticR) * hdd * S_PER_DAY * J_TO_GJ
    const savings = heatSavings(oldGJ, newGJ)
    // Cost: $65/m² comprehensive job (includes removal if needed, air sealing penetrations, new insulation).
    // Floor of $3,000 for small homes. Rounded to nearest $100.
    const cost = Math.max(3000, Math.round(envelope.ceilingArea * 65 / 100) * 100)
    if (savings > 40) {
      const recessedNote = recessedLights
        ? ' Your recessed ceiling lights (pot lights) will be fitted with airtight covers or replaced during this work — each one is effectively a small hole in your ceiling, and sealing them can eliminate 10–20% of attic air leakage.'
        : ''
      recs.push({
        id:               'atticInsulation',
        category:         'envelope',
        title:            `Upgrade attic insulation to R-${targetAtticR}`,
        currentValue:     `R-${envelope.ceilingR} (current)`,
        targetValue:      `R-${targetAtticR}`,
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: cost,
        paybackYears:     simplePayback(cost, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description: `Blown-in cellulose or fibreglass is the most cost-effective attic upgrade in Canada. A good contractor will air-seal all the gaps where pipes, wires, and bathroom fans punch through the ceiling before adding insulation — this sealing step often accounts for as much saving as the insulation itself.${recessedNote} Check cwm.energy/rebates for current federal and provincial rebates — several programs cover attic insulation.`,
      })
    }
  }

  // ── 2. Air sealing ───────────────────────────────────────────────────────
  // Threshold raised to 0.45 ACH — below this the accessible leakage sites have likely been addressed.
  if (envelope.ach > 0.45) {
    const targetAch = Math.max(0.15, envelope.ach * 0.5)
    // Use gross (pre-HRV) air leakage as the baseline so HRV savings aren't double-counted.
    const oldGJ     = grossAirLeakageGJ ?? components.airLeakage
    const newGJ     = targetAch * conditionedVolume * AIR_HEAT_CAPACITY * hdd * S_PER_DAY * J_TO_GJ
    const savings   = heatSavings(oldGJ, newGJ)
    // Cost: $1,200 base + $5/m² of floor area, rounded to $50. Reflects blower door test + professional sealing.
    const cost      = Math.max(1500, Math.round((1200 + floorArea * 5) / 50) * 50)
    if (savings > 30) {
      recs.push({
        id:               'airSealing',
        category:         'envelope',
        title:            'Professional air sealing',
        currentValue:     `~${envelope.ach.toFixed(2)} ACH`,
        targetValue:      `~${targetAch.toFixed(2)} ACH (50% reduction)`,
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: cost,
        paybackYears:     simplePayback(cost, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description: 'A technician pressurises your home with a large fan (a "blower door test") to find where air is leaking, then seals the gaps — all from the attic and basement without opening walls. Main targets are gaps where pipes and wires pass through ceilings, the band of wood framing at the top of the basement walls, and door weatherstripping. In older homes this reliably cuts draughts by 30–50%. If the home becomes very tight (below 0.35 ACH), a heat recovery ventilator (HRV) is recommended to keep fresh air flowing.',
      })
    }
  }

  // ── 3. Rim joist insulation ──────────────────────────────────────────────
  // Only when user has confirmed rim joists are exposed and home has a basement.
  const hasBasement = (envelope.basementWallArea ?? 0) > 0 || (envelope.basementFloorArea ?? 0) > 0
  if (exposedRimJoists && hasBasement) {
    // Estimate rim joist area from floor footprint (treat as square)
    const footprintArea  = floorArea / storeys
    const rimPerimeter   = 4 * Math.sqrt(footprintArea)   // rough square perimeter
    const rimJoistArea   = rimPerimeter * 0.40              // typical floor joist depth ~400 mm
    const U_uninsulated  = 1.50                             // W/m²·K — wood framing + air gap
    const U_insulated    = 1 / r_to_rsi(20)                // W/m²·K — R-20 spray foam ≈ 0.28
    const oldGJ          = rimJoistArea * U_uninsulated * hdd * S_PER_DAY * J_TO_GJ
    const newGJ          = rimJoistArea * U_insulated   * hdd * S_PER_DAY * J_TO_GJ
    const savings        = heatSavings(oldGJ, newGJ)
    // Cost: $40/m² closed-cell spray foam installed ($35–50/m²).
    // Per NRCan Canada Greener Homes benchmark and Canadian spray foam contractor market (2024).
    const cost           = Math.max(800, Math.round(rimJoistArea * 40 / 50) * 50)
    if (savings > 25) {
      recs.push({
        id:               'rimJoists',
        category:         'envelope',
        title:            'Insulate the band of wood at the top of your basement walls',
        currentValue:     'Uninsulated rim joists',
        targetValue:      'R-20 spray foam',
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: cost,
        paybackYears:     simplePayback(cost, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description: 'The band of wood framing that sits on top of your foundation wall (called the rim joist) is one of the most cost-effective targets in an older home — it\'s exposed to outdoor temperatures and full of gaps. Two to three inches of spray foam insulates, seals the air gaps, and handles moisture control in one step. Most insulation contractors will add this as a short job when already in your basement. A confident DIYer can tackle it with rented equipment in a weekend.',
      })
    }
  }

  // ── 4. Chimney sealing ───────────────────────────────────────────────────
  if (chimney === 'masonry' || chimney === 'gas_vented') {
    // Model the chimney as an equivalent continuous infiltration source.
    // A masonry flue (~200 mm diameter) loses roughly 0.12 ACH-equivalent due to stack effect.
    // A vented gas fireplace with standing pilot loses roughly 0.06 ACH-equivalent.
    // Equivalent infiltration rates estimated from ASHRAE Handbook of Fundamentals 2021,
    // Chapter 16 (Air Leakage) and field measurements reported in NRCan,
    // Keeping the Heat In (2012 edition), Chapter 3.
    const chimAch      = chimney === 'masonry' ? 0.12 : 0.06
    const chimneyLossGJ = chimAch * conditionedVolume * AIR_HEAT_CAPACITY * hdd * S_PER_DAY * J_TO_GJ
    const savings       = chimneyLossGJ / efficiency * fuelCostPerGJ
    const cost          = chimney === 'masonry' ? COSTS.chimneyMasonry : COSTS.chimneyGasVented
    if (savings > 25) {
      const isMasonry = chimney === 'masonry'
      recs.push({
        id:               'chimneySealing',
        category:         'envelope',
        title:            isMasonry
                            ? 'Seal unused masonry fireplace / chimney'
                            : 'Seal or replace vented gas fireplace',
        currentValue:     isMasonry ? 'Open masonry flue' : 'Vented gas fireplace (pilot on)',
        targetValue:      isMasonry ? 'Sealed flue / chimney balloon' : 'Sealed combustion insert or pilot off',
        annualSavingsCAD: savings,
        annualSavedGJ:    chimneyLossGJ / efficiency,
        estimatedCostCAD: cost,
        paybackYears:     simplePayback(cost, savings),
        co2SavedTonnes:   chimneyLossGJ / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description: isMasonry
          ? 'An unused masonry chimney acts like a small open window year-round — warm air rises and escapes constantly through the flue. A chimney balloon ($50–100, DIY) stops this immediately and can be removed when you want to use the fireplace. For a permanent fix, a mason can cap the flue and install a tight-fitting throat damper. Either pays back in one to two heating seasons.'
          : 'Vented gas fireplaces with a standing pilot light maintain a permanently open flue path to exhaust combustion gases, continuously pulling conditioned air out of your home. Turning off the pilot light in spring (gas companies can help) and installing a tight-fitting glass door recovers most of this loss. Replacing with a sealed-combustion insert or electric unit eliminates it entirely.',
      })
    }
  }

  // ── 5. Window upgrade ────────────────────────────────────────────────────
  if (envelope.windowU > 1.8) {
    const targetU   = 1.6
    const oldGJ     = components.windows
    const newGJ     = envelope.windowArea * targetU * hdd * S_PER_DAY * J_TO_GJ
    const savings   = heatSavings(oldGJ, newGJ)
    const winCount  = Math.max(8, Math.round(envelope.windowArea / 1.4))
    const cost      = COSTS.windowUpgrade * winCount
    if (savings > 75) {
      recs.push({
        id:               'windows',
        category:         'envelope',
        title:            'Replace windows with high-performance glazing',
        currentValue:     `U=${envelope.windowU.toFixed(1)} W/m²·K`,
        targetValue:      `U=1.6 W/m²·K (triple-pane or high-performance double)`,
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: cost,
        paybackYears:     simplePayback(cost, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'Windows are the highest heat-loss surface per unit area. Modern triple-pane or low-e windows also significantly improve comfort near glazing in winter.',
      })
    }
  }

  // ── 6. Basement wall insulation ──────────────────────────────────────────
  if (envelope.basementWallArea > 0 && envelope.basementWallR < 18) {
    const targetR   = 20
    const oldGJ     = components.basementWalls
    const newGJ     = envelope.basementWallArea / r_to_rsi(targetR) * hdd * S_PER_DAY * J_TO_GJ
    const savings   = heatSavings(oldGJ, newGJ)
    if (savings > 30) {
      recs.push({
        id:               'basementInsulation',
        category:         'envelope',
        title:            `Insulate basement walls to R-${targetR}`,
        currentValue:     `R-${envelope.basementWallR} (current)`,
        targetValue:      `R-${targetR} (rigid foam or batt)`,
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: COSTS.basementInsulation,
        paybackYears:     simplePayback(COSTS.basementInsulation, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'Basement walls in contact with cold soil are a major heat pathway. Rigid foam on the interior requires no excavation and is a straightforward DIY-friendly upgrade.',
      })
    }
  }

  // ── 7. High-efficiency furnace ───────────────────────────────────────────
  if ((fuelType === 'naturalGas' || fuelType === 'propane') && efficiency < 0.90) {
    const newEff    = 0.96
    const savedFuel = totalHeatLossGJ * (1 / efficiency - 1 / newEff)
    const savings   = savedFuel * fuelCostPerGJ
    if (savings > 100) {
      recs.push({
        id:               'furnaceUpgrade',
        category:         'heating',
        title:            'Upgrade to a high-efficiency condensing furnace',
        currentValue:     `${Math.round(efficiency * 100)}% efficient (current)`,
        targetValue:      '96% efficient (condensing)',
        annualSavingsCAD: savings,
        annualSavedGJ:    savedFuel,
        estimatedCostCAD: COSTS.furnaceUpgrade,
        paybackYears:     simplePayback(COSTS.furnaceUpgrade, savings),
        co2SavedTonnes:   savedFuel * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'A condensing furnace extracts heat from the exhaust gases that an older furnace simply vents outside, cutting fuel use by 15–20%. Required for replacement in many Canadian provinces. Eligible for utility rebates.',
      })
    }
  }

  // ── 8. Switch to heat pump ───────────────────────────────────────────────
  if (['naturalGas', 'heatingOil', 'propane'].includes(fuelType)
      && climate.designTemp >= -30
      && inputs.electricityCostPerGJ) {
    // Use multi-bin COP model based on design temperature and heat pump type.
    // isCCASHP: true when user has selected a cold-climate heat pump system.
    const isCCASHP = inputs.heating?.systemId === 'ccashp' || inputs.coldClimateHeatPump === true
    const cop      = heatPumpCOP(climate.designTemp, isCCASHP)
    const newCost     = totalHeatLossGJ / cop * inputs.electricityCostPerGJ
    const savings     = heatLossResult.annualCost - newCost
    const co2Current  = annualFuelGJ * (CO2_FACTORS[fuelType] ?? 0.05)
    const co2New      = totalHeatLossGJ / cop * (CO2_FACTORS.electricity ?? 0.014)
    if (savings > 0) {
      recs.push({
        id:               'heatPump',
        category:         'heating',
        title:            'Switch to a cold-climate heat pump',
        currentValue:     `${fuelType} at ${Math.round(efficiency * 100)}% efficiency`,
        targetValue:      `Heat pump (delivers ${cop}× more heat per dollar of electricity)`,
        annualSavingsCAD: savings,
        annualSavedGJ:    annualFuelGJ - totalHeatLossGJ / cop,
        estimatedCostCAD: COSTS.heatPump,
        paybackYears:     simplePayback(COSTS.heatPump, savings),
        co2SavedTonnes:   co2Current - co2New,
        description:      `A heat pump moves heat from outside air into your home rather than burning fuel to create it — making it 2–3× more efficient than a furnace even in cold weather. Cold-climate models (e.g., Mitsubishi Zuba, Bosch IDS) work reliably down to −25°C or lower and also provide cooling in summer. See cwm.energy/rebates for current federal and Alberta rebate programs.`,
      })
    }
  }

  // ── 9. High-efficiency water heater ─────────────────────────────────────
  if (waterHeater.fuelType === 'naturalGas' && waterHeater.uef < 0.70) {
    const newUef    = 0.87
    const savings   = waterHeaterResult.annualCost
                      - (waterHeaterResult.usefulEnergyGJ / newUef * fuelCostPerGJ)
    if (savings > 40) {
      recs.push({
        id:               'waterHeaterUpgrade',
        category:         'water',
        title:            'Upgrade to a tankless (on-demand) water heater',
        currentValue:     `Storage tank — ${Math.round(waterHeater.uef * 100)}% efficient`,
        targetValue:      'Tankless — 87%+ efficient',
        annualSavingsCAD: savings,
        annualSavedGJ:    waterHeaterResult.inputEnergyGJ - waterHeaterResult.usefulEnergyGJ / newUef,
        estimatedCostCAD: COSTS.waterHeaterUpgrade,
        paybackYears:     simplePayback(COSTS.waterHeaterUpgrade, savings),
        co2SavedTonnes:   (waterHeaterResult.inputEnergyGJ - waterHeaterResult.usefulEnergyGJ / newUef)
                          * CO2_FACTORS.naturalGas,
        description:      'A tankless water heater heats water only when you turn on a tap — eliminating the energy wasted keeping a large tank hot all day. They typically last 20+ years versus 10–12 for a storage tank. Eligible for utility rebates in most provinces.',
      })
    }
  }

  // ── 10. Heat pump water heater ────────────────────────────────────────────
  if (waterHeater.uef < 3.0 && inputs.electricityCostPerGJ) {
    const hpwhUef   = 3.5
    const newCost   = waterHeaterResult.usefulEnergyGJ / hpwhUef * inputs.electricityCostPerGJ
    const savings   = waterHeaterResult.annualCost - newCost
    if (savings > 50) {
      recs.push({
        id:               'hpwh',
        category:         'water',
        title:            'Install a heat pump water heater',
        currentValue:     `Current unit — ${Math.round(waterHeater.uef * 100)}% efficient`,
        targetValue:      'Heat pump water heater — 350% efficient',
        annualSavingsCAD: savings,
        annualSavedGJ:    waterHeaterResult.inputEnergyGJ - waterHeaterResult.usefulEnergyGJ / hpwhUef,
        estimatedCostCAD: COSTS.hpwh,
        paybackYears:     simplePayback(COSTS.hpwh, savings),
        co2SavedTonnes:   0,
        description:      'A heat pump water heater pulls warmth from the surrounding air to heat water — using 3–4× less electricity than a standard electric tank. Works best in a utility room, basement, or garage with at least 28 m² of space around it. See cwm.energy/rebates for current Alberta rebate programs.',
      })
    }
  }

  // ── 11. Smart thermostat ─────────────────────────────────────────────────
  // Only meaningful for central forced-air systems (gas, propane, oil).
  if (['naturalGas', 'propane', 'heatingOil'].includes(fuelType)) {
    const savingsFraction = 0.08   // ENERGY STAR (US EPA, 2023): ~8% on heating+cooling combined
                                   // for programmable thermostats. Heating-only savings in Canada
                                   // may differ; 8% is the most defensible published figure.
    const savings         = heatLossResult.annualCost * savingsFraction
    const savedFuelGJ     = annualFuelGJ * savingsFraction
    if (savings > 50) {
      recs.push({
        id:               'smartThermostat',
        category:         'heating',
        title:            'Install a smart thermostat',
        currentValue:     'Manual or basic programmable thermostat',
        targetValue:      'Smart thermostat (learning schedule, remote control)',
        annualSavingsCAD: savings,
        annualSavedGJ:    savedFuelGJ,
        estimatedCostCAD: COSTS.smartThermostat,
        paybackYears:     simplePayback(COSTS.smartThermostat, savings),
        co2SavedTonnes:   savedFuelGJ * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'A smart thermostat learns your schedule and turns down the heat while you\'re away or asleep. ENERGY STAR estimates up to 8% savings on heating and cooling combined; actual heating-only savings vary with how consistently you use setback schedules. Installation is a 20-minute DIY job for most forced-air systems; the device typically pays for itself inside two or three heating seasons. Look for the ENERGY STAR certification and rebates from your utility (many Canadian utilities offer $50–75 rebates). Check cwm.energy/rebates for current Alberta programs.',
      })
    }
  }

  // ── 12. Above-grade wall insulation ──────────────────────────────────────
  // Derive wall area from the existing heat loss figure to avoid needing
  // envelope.netWallArea explicitly (it may not be exposed in all input modes).
  const wallHeatLoss = components.walls ?? 0
  const wallR        = envelope.wallR ?? 0
  if (wallR > 0 && wallR < 20 && wallHeatLoss > 0) {
    const targetWallR = 24
    const oldGJ       = wallHeatLoss
    // Heat loss ∝ 1/R; proportional scaling: newGJ = oldGJ × (R_old / R_new)
    const newGJ       = oldGJ * (wallR / targetWallR)
    const savings     = heatSavings(oldGJ, newGJ)
    // Back-calculate wall area from the heat loss formula: Q = A × U × HDD × s_per_day × j_to_gj
    const wallArea    = oldGJ / ((1 / r_to_rsi(wallR)) * hdd * S_PER_DAY * J_TO_GJ)
    const cost        = Math.max(5000, Math.round(wallArea * COSTS.wallInsulationPerM2 / 500) * 500)
    if (savings > 150) {
      recs.push({
        id:               'wallInsulation',
        category:         'envelope',
        title:            `Upgrade above-grade wall insulation to R-${targetWallR}`,
        currentValue:     `R-${wallR} (current above-grade walls)`,
        targetValue:      `R-${targetWallR} (added rigid foam or batt)`,
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: cost,
        paybackYears:     simplePayback(cost, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'Walls are typically the largest surface area on a home and a major source of heat loss in homes built before the 1990s. The two main approaches: exterior rigid foam (added outside the sheathing before re-siding — the better thermal option, no interior disruption) or interior batt insulation (cheaper but requires removing drywall and loses a few centimetres of floor space in each room). Exterior insulation also eliminates thermal bridging through studs, which accounts for 15–20% of wall heat loss that nominal R-values don\'t capture. Check cwm.energy/rebates for current federal and provincial programs.',
      })
    }
  }

  // ── 13. Drain water heat recovery ────────────────────────────────────────
  // Recovers heat from shower drain water to preheat cold water entering the
  // water heater. Applicable to any fuel type with a conventional tank or tankless.
  //
  // Shower fraction (37% of DHW): NRCan, Survey of Household Energy Use (SHEU) 2011,
  //   Table A5.2 — showers account for ~35–40% of residential DHW end-use.
  //   Also consistent with NRCan HOT2000 v11 default DHW disaggregation.
  //
  // Recovery efficiency (35%): NRCan, "Drain-Water Heat Recovery" product overview
  //   (nrcan.gc.ca/energy-efficiency/energy-star/drain-water-heat-recovery).
  //   Certified DWHR units range 25–55% efficiency; 35% is the mid-range for a
  //   single vertical unit on a main shower drain (EnerGuide rating protocol).
  {
    const showerFraction    = 0.37
    const recoveryEff       = 0.35
    const dhwSavingsFraction = showerFraction * recoveryEff   // ≈ 13%
    const savings            = waterHeaterResult.annualCost * dhwSavingsFraction
    const savedDhwGJ         = waterHeaterResult.inputEnergyGJ * dhwSavingsFraction
    if (savings > 50) {
      recs.push({
        id:               'drainWaterHR',
        category:         'water',
        title:            'Install drain water heat recovery',
        currentValue:     'Cold water feeds water heater directly',
        targetValue:      'DWHR unit on shower drain (35% heat recovery)',
        annualSavingsCAD: savings,
        annualSavedGJ:    savedDhwGJ,
        estimatedCostCAD: COSTS.drainWaterHR,
        paybackYears:     simplePayback(COSTS.drainWaterHR, savings),
        co2SavedTonnes:   savedDhwGJ * (CO2_FACTORS[waterHeater.fuelType ?? fuelType] ?? 0.05),
        description:      'A drain water heat recovery (DWHR) unit is a vertical copper coil fitted around your shower\'s drain pipe. As warm drain water flows down, it preheats the cold water entering your water heater — recovering 25–40% of the heat that would otherwise go down the drain. Installation is a plumbing job (2–3 hours), with no moving parts and a 30+ year lifespan. Works with any water heater fuel type and is compatible with tankless units. Eligible for Canada Greener Homes and some provincial utility rebates. Most effective for households with one or two heavy shower users.',
      })
    }
  }

  // ── 14. Aeroseal duct sealing ─────────────────────────────────────────────
  // Applicable to homes with forced-air heating (gas, propane, oil, heat pump).
  //
  // Duct leakage 15–25% in existing homes: US DOE / Lawrence Berkeley National Lab,
  //   "Residential Duct Systems" (lbl.gov, Walker et al. 2004); ASHRAE Standard 152-2004.
  //   Canadian-specific field data is sparse; US figures applied as a proxy.
  //   [UNVERIFIED for Canada specifically — Canadian field measurement data needed]
  //
  // Aeroseal ≤5% target: Aeroseal LLC certified performance specification
  //   (aeroseal.com/what-is-aeroseal/how-it-works). Before-and-after leakage
  //   is measured per ASHRAE 152 duct pressurisation test.
  //
  // Cost: $3,000 finished empty home; $4,500 finished furnished home (default used here).
  const hasForcedAir = ['naturalGas', 'propane', 'heatingOil'].includes(fuelType)
    || /ashp|ccashp|heatpump/i.test(inputs.heating?.systemId ?? '')
  if (hasForcedAir) {
    const leakageFraction = 0.15   // conservative end of 15–25% range (LBNL/ASHRAE 152)
    const targetFraction  = 0.03   // Aeroseal certified target ≤5%; use 3% as mid-range
    const savingsFraction = leakageFraction - targetFraction   // 12%
    const savings         = heatLossResult.annualCost * savingsFraction
    const savedFuelGJ     = annualFuelGJ * savingsFraction
    if (savings > 100) {
      recs.push({
        id:               'aeroSeal',
        category:         'heating',
        title:            'Aeroseal duct sealing',
        currentValue:     'Estimated ~15% of conditioned air lost through duct leaks',
        targetValue:      '≤5% duct leakage (Aeroseal certified)',
        annualSavingsCAD: savings,
        annualSavedGJ:    savedFuelGJ,
        estimatedCostCAD: COSTS.aeroSeal,
        paybackYears:     simplePayback(COSTS.aeroSeal, savings),
        co2SavedTonnes:   savedFuelGJ * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'Aeroseal is a contractor-applied process that pressurises your duct system and injects a mist of non-toxic adhesive particles. The particles are carried by air flow to wherever it\'s leaking — gaps at joints, disconnected runs, or holes in the plenum — and bond on contact, sealing from the inside without opening walls. A typical job takes 4–6 hours and reduces duct leakage to below 5%. The contractor measures before and after leakage so you get a certified result. Most effective for homes with ducts in unconditioned spaces (attic, garage, crawlspace) where leaks directly heat or cool the outdoors instead of your living space. Typical cost is $3,000 for a finished empty home or $4,500 for a finished furnished home.',
      })
    }
  }

  // ── 15. Solar PV ─────────────────────────────────────────────────────────
  // Only for homes with a roof (not apartments). Uses the existing solar
  // calculation engine with a medium-preset system size and default south-facing
  // roof assumption. Points to /solar for the full interactive tool.
  if (inputs.houseType !== 'apartment' && inputs.electricityCostPerGJ) {
    const capacity    = estimateRoofCapacity({
      houseType: inputs.houseType ?? 'detached',
      floorArea:  floorArea,
      storeys:    inputs.storeys ?? 2,
      roofType:   'ew',   // south-facing slope — optimistic default
    })

    if (capacity.maxKW > 0) {
      const presets   = solarSizePresets(capacity.maxKW)
      const medium    = presets.find(p => p.label === 'Medium') ?? presets[1] ?? presets[0]
      const systemKW  = medium?.kw ?? Math.min(6, capacity.maxKW)

      const solar = calculateSolar({
        systemKW,
        province:         inputs.province,
        orientation:      'south',
        hasEV:            false,
        installCostPerKW: DEFAULT_INSTALL_COST_PER_KW,
        incentives:       0,
      })

      if (solar.annualSavingsCAD > 50) {
        recs.push({
          id:               'solar',
          category:         'generation',
          title:            `Install rooftop solar (${systemKW} kW estimate)`,
          currentValue:     'Grid electricity only',
          targetValue:      `${systemKW} kW solar PV · ~${solar.annualGenKWh.toLocaleString()} kWh/yr`,
          annualSavingsCAD: solar.annualSavingsCAD,
          annualSavedGJ:    solar.annualGenKWh * 3.6e-3,   // kWh → GJ
          estimatedCostCAD: solar.grossCostCAD,
          paybackYears:     solar.paybackYears,
          co2SavedTonnes:   solar.co2AvoidedTonnes,
          description:      `A ${systemKW} kW system on a south-facing roof in ${inputs.province} would generate roughly ${solar.annualGenKWh.toLocaleString()} kWh per year — covering a significant share of your electricity use and effectively locking in that portion of your energy cost for 25+ years. This is a rough estimate assuming a standard south-facing slope. Use the full solar tool at cwm.energy/solar to configure your actual roof type, orientation, and system size, and to see the net-metering rules for ${inputs.province}. Check cwm.energy/rebates for current federal and provincial solar incentives.`,
        })
      }
    }
  }

  // Sort by shortest payback (most cost-effective first)
  return recs
    .filter(r => isFinite(r.paybackYears) && r.annualSavingsCAD > 0)
    .sort((a, b) => a.paybackYears - b.paybackYears)
}
