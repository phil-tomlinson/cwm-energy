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

// CO₂ emission factors (tonnes CO₂/GJ input energy) — NRCan national averages
const CO2_FACTORS = {
  naturalGas:  0.0503,
  electricity: 0.014,    // national average; QC/MB/BC much lower
  heatingOil:  0.0726,
  propane:     0.0614,
}

// Mid-range installed costs in Canada (2024 CAD)
const COSTS = {
  // Attic insulation cost is now scaled per m² of ceiling area — see section below
  wallInsulation:     12000,
  windowUpgrade:        700,   // per window
  // Air sealing cost is now scaled to floor area — see section below
  basementInsulation:  4000,
  furnaceUpgrade:      6000,
  heatPump:           14000,
  waterHeaterUpgrade:  1500,
  hpwh:                1800,
  chimneyMasonry:       800,   // chimney balloon + professional damper/cap
  chimneyGasVented:     400,   // damper kit + service call
}

function r_to_rsi(r) { return r / 5.678 }
function simplePayback(cost, savings) { return savings > 0 ? cost / savings : Infinity }

// Climate-adjusted attic R target
function atticTargetR(hdd) {
  if (hdd < 3500) return 50   // mild (coastal BC) — NRCan zone 4–5
  if (hdd < 5500) return 60   // cold (most of Canada) — zone 6–7
  return 80                    // very cold (SK, MB, northern ON/QC) — zone 7–8
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
  const { components, totalHeatLossGJ, annualFuelGJ, conditionedVolume } = heatLossResult
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
        ? ' Recessed pot lights will be sealed with airtight covers or replaced during this work — this step alone can eliminate 10–20% of attic air leakage.'
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
        description: `Blown-in cellulose or fibreglass is the most cost-effective attic upgrade in Canada. A reputable contractor will air-seal all top-plate penetrations, bathroom fan rough-ins, and chimney bypasses before adding insulation — this air sealing step accounts for much of the heat saving.${recessedNote} Eligible for Canada Greener Homes grants.`,
      })
    }
  }

  // ── 2. Air sealing ───────────────────────────────────────────────────────
  // Threshold raised to 0.45 ACH — below this the accessible leakage sites have likely been addressed.
  if (envelope.ach > 0.45) {
    const targetAch = Math.max(0.15, envelope.ach * 0.5)
    const oldGJ     = components.airLeakage
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
        description: 'A blower door test pinpoints your home\'s leakage sites, then a contractor seals them — all from the attic and basement. No drywall removal required. Primary targets: top-plate penetrations and pot light cans (attic side), basement rim joists (spray foam), and weatherstripping at doors. In older homes this reliably achieves a 30–50% ACH reduction. If tightening below 0.35 ACH, mechanical ventilation (HRV/ERV) is strongly recommended to maintain air quality.',
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
    // Cost: $40/m² spray foam installed, $50 minimum step, floor of $800
    const cost           = Math.max(800, Math.round(rimJoistArea * 40 / 50) * 50)
    if (savings > 25) {
      recs.push({
        id:               'rimJoists',
        category:         'envelope',
        title:            'Insulate and air-seal basement rim joists',
        currentValue:     'Uninsulated (U ≈ 1.5 W/m²·K)',
        targetValue:      'R-20 closed-cell spray foam (U ≈ 0.28 W/m²·K)',
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: cost,
        paybackYears:     simplePayback(cost, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description: 'Rim joists — the band of framing between your foundation wall and first floor — are one of the most cost-effective sealing targets in an older home. Two or three inches of closed-cell spray foam insulates, air-seals, and handles vapour control in one step. Most insulation contractors will add this as a short job when in the area. A confident DIYer can tackle it with rented equipment in a weekend.',
      })
    }
  }

  // ── 4. Chimney sealing ───────────────────────────────────────────────────
  if (chimney === 'masonry' || chimney === 'gas_vented') {
    // Model the chimney as an equivalent continuous infiltration source.
    // A masonry flue (~200 mm diameter) loses roughly 0.12 ACH-equivalent due to stack effect.
    // A vented gas fireplace with standing pilot loses roughly 0.06 ACH-equivalent.
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
        title:            'Upgrade to high-efficiency furnace (96% AFUE)',
        currentValue:     `${Math.round(efficiency * 100)}% AFUE`,
        targetValue:      '96% AFUE condensing furnace',
        annualSavingsCAD: savings,
        annualSavedGJ:    savedFuel,
        estimatedCostCAD: COSTS.furnaceUpgrade,
        paybackYears:     simplePayback(COSTS.furnaceUpgrade, savings),
        co2SavedTonnes:   savedFuel * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'Condensing furnaces extract additional heat from exhaust gases, reducing fuel use by 15–20% versus a standard furnace. Mandatory in replacement in many provinces. Eligible for utility rebates.',
      })
    }
  }

  // ── 8. Switch to heat pump ───────────────────────────────────────────────
  if (['naturalGas', 'heatingOil', 'propane'].includes(fuelType)
      && climate.designTemp >= -30
      && inputs.electricityCostPerGJ) {
    const cop         = climate.designTemp >= -20 ? 2.8 : 2.2
    const newCost     = totalHeatLossGJ / cop * inputs.electricityCostPerGJ
    const savings     = heatLossResult.annualCost - newCost
    const co2Current  = annualFuelGJ * (CO2_FACTORS[fuelType] ?? 0.05)
    const co2New      = totalHeatLossGJ / cop * (CO2_FACTORS.electricity ?? 0.014)
    if (savings > 0) {
      recs.push({
        id:               'heatPump',
        category:         'heating',
        title:            'Switch to cold-climate air-source heat pump',
        currentValue:     `${fuelType} at ${Math.round(efficiency * 100)}% efficiency`,
        targetValue:      `Heat pump (seasonal COP ${cop})`,
        annualSavingsCAD: savings,
        annualSavedGJ:    annualFuelGJ - totalHeatLossGJ / cop,
        estimatedCostCAD: COSTS.heatPump,
        paybackYears:     simplePayback(COSTS.heatPump, savings),
        co2SavedTonnes:   co2Current - co2New,
        description:      `Cold-climate heat pumps (e.g., Mitsubishi Zuba, Bosch IDS) operate efficiently down to −25°C or lower. They also provide cooling in summer. Eligible for Canada Greener Homes and provincial rebates.`,
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
        title:            'Upgrade to high-efficiency water heater',
        currentValue:     `UEF ${waterHeater.uef.toFixed(2)} (storage tank)`,
        targetValue:      'UEF 0.87+ (tankless on-demand)',
        annualSavingsCAD: savings,
        annualSavedGJ:    waterHeaterResult.inputEnergyGJ - waterHeaterResult.usefulEnergyGJ / newUef,
        estimatedCostCAD: COSTS.waterHeaterUpgrade,
        paybackYears:     simplePayback(COSTS.waterHeaterUpgrade, savings),
        co2SavedTonnes:   (waterHeaterResult.inputEnergyGJ - waterHeaterResult.usefulEnergyGJ / newUef)
                          * CO2_FACTORS.naturalGas,
        description:      'Tankless water heaters eliminate standby losses and typically last 20+ years versus 10–12 for storage tanks. Eligible for utility rebates in most provinces.',
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
        title:            'Install a heat pump water heater (HPWH)',
        currentValue:     `UEF ${waterHeater.uef.toFixed(2)}`,
        targetValue:      'UEF 3.5 (heat pump water heater)',
        annualSavingsCAD: savings,
        annualSavedGJ:    waterHeaterResult.inputEnergyGJ - waterHeaterResult.usefulEnergyGJ / hpwhUef,
        estimatedCostCAD: COSTS.hpwh,
        paybackYears:     simplePayback(COSTS.hpwh, savings),
        co2SavedTonnes:   0,
        description:      'Heat pump water heaters use 3–4× less electricity than standard electric tanks. They work best in unconditioned or semi-conditioned spaces ≥ 28 m². Eligible for Canada Greener Homes rebates.',
      })
    }
  }

  // Sort by shortest payback (most cost-effective first)
  return recs
    .filter(r => isFinite(r.paybackYears) && r.annualSavingsCAD > 0)
    .sort((a, b) => a.paybackYears - b.paybackYears)
}
