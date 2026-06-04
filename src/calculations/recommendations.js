// Upgrade Recommendations Engine
// Ranks improvements by simple payback period (installed cost ÷ annual savings).
//
// For each upgrade we calculate:
//   annualSavingsCAD  — reduction in annual energy bills
//   estimatedCostCAD  — mid-range Canadian installed cost (2024 CAD)
//   paybackYears      — simple payback (cost / savings)

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

// Mid-range installed costs in Canada (2024 CAD).
// Sources:
//   - NRCan Canada Greener Homes Grant cost benchmarks
//   - RSMeans Canadian Construction Cost Data 2023
//   - HRAI (Heating, Refrigeration and Air Conditioning Institute of Canada) 2023 member survey
//   - Canadian contractor quotes (2024); regional variation ±30%
const COSTS = {
  // Attic blown-in insulation: $40–90/m² installed (NRCan Canada Greener Homes benchmark;
  // RSMeans 2023). $65/m² = mid-range comprehensive job including air-sealing of penetrations.
  // Attic insulation cost is now scaled per m² of ceiling area — see section below.
  wallInsulation:     12000,
  // Mid-range double-to-triple upgrade per window opening: $600–900 installed.
  // Per NRCan Canada Greener Homes grant benchmark data and CMHC renovation cost guides (2023).
  // $700 = mid-range.
  windowUpgrade:        700,   // per window
  // Air sealing cost is now scaled to floor area — see section below.
  // Base mobilisation $1,200 + $5/m² floor area. Per NRCan Canada Greener Homes contractor
  // cost data and Efficiency Canada retrofit cost database (2023).
  //
  // Interior basement wall insulation (batt + vapour barrier or rigid foam): $3,500–5,000
  // typical Canadian home. Per NRCan Canada Greener Homes benchmark. Flat estimate;
  // scales with perimeter.
  basementInsulation:  4000,
  // High-efficiency gas furnace (96% AFUE) supply + install: $5,000–7,500.
  // Per NRCan Canada Greener Homes and HRAI 2023 member survey. $6,000 = mid-range.
  furnaceUpgrade:      6000,
  // Air-source heat pump system (CCASHP, supply + install, single-zone): $12,000–18,000.
  // Per NRCan Canada Greener Homes grant data and HRAI 2023. $14,000 = mid-range;
  // multi-zone or ground-source higher.
  heatPump:           14000,
  // Tankless gas water heater, supply + install: $1,200–2,000.
  // Per NRCan Canada Greener Homes and Canadian plumbing contractor market (2024).
  waterHeaterUpgrade:  1500,
  // Heat pump water heater, supply + install: $1,500–2,500.
  // Per NRCan Canada Greener Homes grant data (2024).
  hpwh:                1800,
  // Chimney balloon + professional damper/cap: ~$800 (masonry flue).
  // Per NRCan, Keeping the Heat In (2012).
  chimneyMasonry:       800,
  // Vented gas damper kit + service call: ~$400.
  // Per industry average, 2024.
  chimneyGasVented:     400,
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
        description: `Blown-in cellulose or fibreglass is the most cost-effective attic upgrade in Canada. A good contractor will air-seal all the gaps where pipes, wires, and bathroom fans punch through the ceiling before adding insulation — this sealing step often accounts for as much saving as the insulation itself.${recessedNote} Eligible for Canada Greener Homes grants.`,
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
        description:      `A heat pump moves heat from outside air into your home rather than burning fuel to create it — making it 2–3× more efficient than a furnace even in cold weather. Cold-climate models (e.g., Mitsubishi Zuba, Bosch IDS) work reliably down to −25°C or lower and also provide cooling in summer. Eligible for Canada Greener Homes and provincial rebates.`,
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
        description:      'A heat pump water heater pulls warmth from the surrounding air to heat water — using 3–4× less electricity than a standard electric tank. Works best in a utility room, basement, or garage with at least 28 m² of space around it. Eligible for Canada Greener Homes rebates.',
      })
    }
  }

  // Sort by shortest payback (most cost-effective first)
  return recs
    .filter(r => isFinite(r.paybackYears) && r.annualSavingsCAD > 0)
    .sort((a, b) => a.paybackYears - b.paybackYears)
}
