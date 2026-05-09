// Heat Loss Calculation Engine
// Methodology: steady-state conduction + infiltration (NRCan / HOT2000 approach)
//
// Core equation for each envelope component:
//   Q = A × U × ΔT         (watts, instantaneous)
//   E = A × U × HDD × 86400  (joules/year)
//
// Where:
//   A    = area (m²)
//   U    = thermal transmittance = 1/RSI  (W/m²·K)
//   RSI  = metric R-value (m²·K/W)  =  R-imperial / 5.678
//   HDD  = Heating Degree Days base 18°C (K·days)
//   86400 = seconds per day

const R_TO_RSI = 1 / 5.678      // Convert imperial R to RSI
const J_TO_GJ  = 1e-9            // Joules to Gigajoules
const S_PER_DAY = 86400          // Seconds per day

// Air infiltration: volumetric heat capacity of air (W·day / m³·K)
// Derived from: ρ_air × c_p / 3600 s/h = 1.2 × 1005 / 3600 ≈ 0.335
const AIR_HEAT_CAPACITY = 0.335

// Default storey height — overridden by ceilingHeight passed to calculateHeatLoss
const DEFAULT_WALL_HEIGHT = 2.44  // metres (= 8 ft)

export function rToRsi(rImperial) {
  return rImperial * R_TO_RSI
}

/**
 * Estimate building geometry from floor area and building type.
 * Assumes a roughly square floor plan.
 *
 * @param {number} floorArea   - Total conditioned floor area (m²)
 * @param {number} storeys     - Number of above-grade storeys
 * @param {string} houseType   - 'detached' | 'semi' | 'townhouse' | 'apartment'
 * @param {string} basementType
 * @returns {Object} Estimated areas (m²)
 */
export function estimateGeometry(floorArea, storeys, houseType, basementType) {
  const footprint   = floorArea / storeys
  const sideLength  = Math.sqrt(footprint)
  const perimeter   = 4 * sideLength

  // Reduce exposed wall area for attached dwellings (party walls don't lose heat)
  const exposedFactors = { detached: 1.0, semi: 0.6, townhouse: 0.45, apartment: 0.35 }
  const ef = exposedFactors[houseType] ?? 1.0

  const grossWallArea = perimeter * DEFAULT_WALL_HEIGHT * storeys * ef
  const ceilingArea   = footprint   // area of the top floor ceiling (below unconditioned attic)

  let basementWallArea = 0
  let basementFloorArea = 0

  if (['full_heated', 'full_unheated', 'partial'].includes(basementType)) {
    // Only the below-grade portion of the basement wall loses heat to soil
    const bgFraction = 0.55   // ~55% of typical 2.1m basement wall is below grade
    basementWallArea  = perimeter * 2.1 * bgFraction * ef
    basementFloorArea = footprint
  } else if (basementType === 'crawlspace') {
    basementWallArea  = perimeter * 0.9 * ef   // short crawl space walls
    basementFloorArea = footprint
  } else if (basementType === 'slab') {
    basementFloorArea = footprint
  }

  return {
    grossWallArea:    Math.round(grossWallArea),
    ceilingArea:      Math.round(ceilingArea),
    basementWallArea: Math.round(basementWallArea),
    basementFloorArea: Math.round(basementFloorArea),
    footprint:        Math.round(footprint),
    perimeter:        Math.round(perimeter),
  }
}

/**
 * Split gross wall area into window area, door area, and net wall area.
 *
 * @param {number} grossWallArea   - m²
 * @param {number} windowFraction  - fraction of gross wall that is window
 * @param {number} doorCount       - number of exterior doors
 * @returns {Object}
 */
export function estimateWindowsAndDoors(grossWallArea, windowFraction, doorCount) {
  const doorArea    = doorCount * 1.98   // standard 0.91 m × 2.18 m door ≈ 1.98 m²
  const windowArea  = grossWallArea * windowFraction
  const netWallArea = Math.max(0, grossWallArea - windowArea - doorArea)

  return {
    windowArea:  Math.round(windowArea),
    doorArea:    Math.round(doorArea * 10) / 10,
    netWallArea: Math.round(netWallArea),
  }
}

/**
 * Build a complete envelope object from era defaults + geometry.
 * Used when the user hasn't manually customized Step 3.
 */
export function buildEnvelopeFromDefaults(houseType, floorArea, storeys, basementType, eraDefaults) {
  const geom = estimateGeometry(floorArea, storeys, houseType, basementType)
  const { windowArea, doorArea, netWallArea } = estimateWindowsAndDoors(
    geom.grossWallArea,
    eraDefaults.windowFraction,
    2   // default 2 exterior doors
  )

  return {
    ceilingArea:      geom.ceilingArea,
    ceilingR:         eraDefaults.ceilingR,
    grossWallArea:    geom.grossWallArea,
    netWallArea,
    wallR:            eraDefaults.wallR,
    windowArea,
    windowU:          eraDefaults.windowU,
    doorArea,
    doorCount:        2,
    doorU:            eraDefaults.doorU,
    basementWallArea: geom.basementWallArea,
    basementWallR:    eraDefaults.basementWallR,
    basementFloorArea: geom.basementFloorArea,
    basementFloorR:   eraDefaults.basementFloorR,
    ach:              eraDefaults.ach,
  }
}

/**
 * Calculate annual heat loss for every building component.
 *
 * @param {Object} params
 * @param {Object} params.climate    - { hdd, designTemp }
 * @param {Object} params.envelope   - Full envelope object (from buildEnvelopeFromDefaults or user input)
 * @param {number} params.floorArea  - m²
 * @param {number} params.storeys
 * @param {string} params.basementType
 * @param {Object} params.heating    - { efficiency, fuelCostPerGJ }
 * @returns {Object} Detailed results
 */
export function calculateHeatLoss({ climate, envelope, floorArea, storeys, basementType, ceilingHeight, heating }) {
  const { hdd, designTemp } = climate
  const { efficiency, fuelCostPerGJ } = heating
  const wallHeight = ceilingHeight ?? DEFAULT_WALL_HEIGHT

  // Convert R-values to RSI, then to U-values
  const U = {
    ceiling:       1 / rToRsi(envelope.ceilingR),
    walls:         1 / rToRsi(envelope.wallR),
    windows:       envelope.windowU,
    doors:         envelope.doorU,
    basementWalls: envelope.basementWallR > 0 ? 1 / rToRsi(envelope.basementWallR) : 1 / 0.3,
    // Basement floor: add ~2.0 RSI for soil resistance (NRCan convention)
    basementFloor: 1 / (rToRsi(envelope.basementFloorR || 0) + 2.0),
  }

  // Annual heat loss per component (GJ/year)
  // E_component = Area × U × HDD × seconds_per_day × J_to_GJ
  const components = {
    ceiling:       envelope.ceilingArea      * U.ceiling       * hdd * S_PER_DAY * J_TO_GJ,
    walls:         envelope.netWallArea      * U.walls         * hdd * S_PER_DAY * J_TO_GJ,
    windows:       envelope.windowArea       * U.windows       * hdd * S_PER_DAY * J_TO_GJ,
    doors:         envelope.doorArea         * U.doors         * hdd * S_PER_DAY * J_TO_GJ,
    basementWalls: envelope.basementWallArea * U.basementWalls * hdd * S_PER_DAY * J_TO_GJ,
    basementFloor: envelope.basementFloorArea * U.basementFloor * hdd * S_PER_DAY * J_TO_GJ,
    airLeakage:    0,   // calculated below
  }

  // Conditioned volume: above-grade storeys + heated basement (if applicable)
  const basementVolume = basementType === 'full_heated' ? (floorArea / storeys) * 2.1 : 0
  const conditionedVolume = floorArea * wallHeight + basementVolume

  // Infiltration: Q = ACH × Volume × AIR_HEAT_CAPACITY × HDD (per day × s/day)
  components.airLeakage = envelope.ach * conditionedVolume * AIR_HEAT_CAPACITY * hdd * S_PER_DAY * J_TO_GJ

  const totalHeatLossGJ = Object.values(components).reduce((s, v) => s + v, 0)

  // Fuel input required (heat loss ÷ system efficiency)
  const annualFuelGJ = totalHeatLossGJ / efficiency
  const annualCost   = annualFuelGJ * fuelCostPerGJ

  // Peak heat loss for equipment sizing reference
  const deltaT_design = 18 - designTemp   // °C between indoor setpoint and design outdoor temp
  const peakHeatLossW = deltaT_design > 0
    ? (totalHeatLossGJ / (hdd * S_PER_DAY * J_TO_GJ)) * deltaT_design
    : 0

  return {
    components,              // Annual heat loss (GJ/year) by component
    totalHeatLossGJ,         // Total annual heat loss through envelope (GJ/year)
    annualFuelGJ,            // Annual fuel input required (GJ/year)
    annualCost,              // Annual heating fuel cost (CAD/year)
    peakHeatLossKW: peakHeatLossW / 1000,   // Peak heat loss (kW) for boiler/furnace sizing
    conditionedVolume,       // m³
  }
}
