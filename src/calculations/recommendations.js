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
  atticInsulation:     3000,
  wallInsulation:     12000,
  windowUpgrade:        700,   // per window
  airSealing:          1500,
  basementInsulation:  4000,
  furnaceUpgrade:      6000,
  heatPump:           14000,
  waterHeaterUpgrade:  1500,
  hpwh:                1800,
}

function r_to_rsi(r) { return r / 5.678 }
function simplePayback(cost, savings) { return savings > 0 ? cost / savings : Infinity }

/**
 * Generate a prioritised list of upgrade recommendations.
 *
 * @param {Object} heatLossResult    - Output of calculateHeatLoss()
 * @param {Object} waterHeaterResult - Output of calculateWaterHeater()
 * @param {Object} inputs            - { envelope, heating, waterHeater, climate, province, electricityCostPerGJ }
 * @returns {Array} Sorted recommendations (shortest payback first)
 */
export function generateRecommendations(heatLossResult, waterHeaterResult, inputs) {
  const { components, totalHeatLossGJ, annualFuelGJ, conditionedVolume } = heatLossResult
  const { envelope, heating, waterHeater, climate } = inputs
  const { hdd } = climate
  const { fuelCostPerGJ, efficiency, fuelType } = heating
  const recs = []

  // Convenience: annual savings from reducing a heat loss component
  function heatSavings(oldGJ, newGJ) {
    return Math.max(0, (oldGJ - newGJ) / efficiency * fuelCostPerGJ)
  }

  // ── 1. Attic insulation ──────────────────────────────────────────────────
  if (envelope.ceilingR < 50) {
    const targetR   = 60
    const oldGJ     = components.ceiling
    const newGJ     = envelope.ceilingArea / r_to_rsi(targetR) * hdd * S_PER_DAY * J_TO_GJ
    const savings   = heatSavings(oldGJ, newGJ)
    if (savings > 40) {
      recs.push({
        id:               'atticInsulation',
        category:         'envelope',
        title:            `Upgrade attic insulation to R-${targetR}`,
        currentValue:     `R-${envelope.ceilingR} (current)`,
        targetValue:      `R-${targetR}`,
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: COSTS.atticInsulation,
        paybackYears:     simplePayback(COSTS.atticInsulation, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'Blown-in cellulose or fibreglass into the attic is typically the highest-return upgrade in a Canadian home. It is non-disruptive and eligible for Canada Greener Homes grants.',
      })
    }
  }

  // ── 2. Air sealing ───────────────────────────────────────────────────────
  if (envelope.ach > 0.3) {
    const targetAch = Math.max(0.15, envelope.ach * 0.5)
    const oldGJ     = components.airLeakage
    const newGJ     = targetAch * conditionedVolume * AIR_HEAT_CAPACITY * hdd * S_PER_DAY * J_TO_GJ
    const savings   = heatSavings(oldGJ, newGJ)
    if (savings > 30) {
      recs.push({
        id:               'airSealing',
        category:         'envelope',
        title:            'Professional air sealing',
        currentValue:     `~${envelope.ach.toFixed(2)} ACH`,
        targetValue:      `~${targetAch.toFixed(2)} ACH (50% reduction)`,
        annualSavingsCAD: savings,
        annualSavedGJ:    (oldGJ - newGJ) / efficiency,
        estimatedCostCAD: COSTS.airSealing,
        paybackYears:     simplePayback(COSTS.airSealing, savings),
        co2SavedTonnes:   (oldGJ - newGJ) / efficiency * (CO2_FACTORS[fuelType] ?? 0.05),
        description:      'An energy auditor identifies and seals gaps around windows, doors, electrical boxes, and the attic hatch. Often paired with an HRV to maintain fresh air while saving energy.',
      })
    }
  }

  // ── 3. Window upgrade ────────────────────────────────────────────────────
  if (envelope.windowU > 1.8) {
    const targetU   = 1.6
    const oldGJ     = components.windows
    const newGJ     = envelope.windowArea * targetU * hdd * S_PER_DAY * J_TO_GJ
    const savings   = heatSavings(oldGJ, newGJ)
    const winCount  = Math.max(8, Math.round(envelope.windowArea / 1.4))
    const cost      = COSTS.windowUpgrade * winCount
    if (savings > 40) {
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

  // ── 4. Basement wall insulation ──────────────────────────────────────────
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

  // ── 5. High-efficiency furnace ───────────────────────────────────────────
  if (fuelType === 'naturalGas' && efficiency < 0.90) {
    const newEff    = 0.96
    const savedFuel = totalHeatLossGJ * (1 / efficiency - 1 / newEff)
    const savings   = savedFuel * fuelCostPerGJ
    if (savings > 100) {
      recs.push({
        id:               'furnaceUpgrade',
        category:         'heating',
        title:            'Upgrade to high-efficiency gas furnace (96% AFUE)',
        currentValue:     `${Math.round(efficiency * 100)}% AFUE`,
        targetValue:      '96% AFUE condensing furnace',
        annualSavingsCAD: savings,
        annualSavedGJ:    savedFuel,
        estimatedCostCAD: COSTS.furnaceUpgrade,
        paybackYears:     simplePayback(COSTS.furnaceUpgrade, savings),
        co2SavedTonnes:   savedFuel * CO2_FACTORS.naturalGas,
        description:      'Condensing furnaces extract additional heat from exhaust gases, reducing fuel use by 15–20% versus a standard furnace. Mandatory in replacement in many provinces. Eligible for utility rebates.',
      })
    }
  }

  // ── 6. Switch to heat pump ───────────────────────────────────────────────
  // Only suggest if design temperature isn't too extreme and electricity price is known
  if (['naturalGas', 'heatingOil', 'propane'].includes(fuelType)
      && climate.designTemp >= -30
      && inputs.electricityCostPerGJ) {
    const cop         = climate.designTemp >= -20 ? 2.8 : 2.2   // seasonal average COP
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

  // ── 7. High-efficiency water heater ─────────────────────────────────────
  if (waterHeater.fuelType === 'naturalGas' && waterHeater.uef < 0.70) {
    const newUef    = 0.87   // tankless
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

  // ── 8. Heat pump water heater ────────────────────────────────────────────
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
        co2SavedTonnes:   0,   // depends heavily on provincial electricity grid
        description:      'Heat pump water heaters use 3–4× less electricity than standard electric tanks. They work best in unconditioned or semi-conditioned spaces ≥ 28 m². Eligible for Canada Greener Homes rebates.',
      })
    }
  }

  // Sort by shortest payback (most cost-effective first)
  return recs
    .filter(r => isFinite(r.paybackYears) && r.annualSavingsCAD > 0)
    .sort((a, b) => a.paybackYears - b.paybackYears)
}
