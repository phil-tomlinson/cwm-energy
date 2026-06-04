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

// RSI = R-imperial / 5.678; conversion factor per ASHRAE Handbook of Fundamentals,
// SI edition (ASHRAE Fundamentals 2021, Chapter 25, Table 1).
// Also consistent with ISO 6946 (Building components and building elements — thermal resistance).
const R_TO_RSI = 1 / 5.678

// Joules to Gigajoules — SI unit prefix (1 GJ = 10^9 J)
const J_TO_GJ  = 1e-9

// Seconds per day — exact by definition (60 s/min × 60 min/h × 24 h/day)
const S_PER_DAY = 86400

// Volumetric heat capacity of air at standard conditions (20°C, 101.3 kPa):
//   ρ_air = 1.20 kg/m³, c_p = 1005 J/(kg·K)
//   Wh/(m³·K) = ρ × c_p / 3600 s/h = 1.20 × 1005 / 3600 = 0.335 Wh/(m³·K)
//   Scaled to W·day/(m³·K): 0.335 × 3600 s/h / 86400 s/day = 0.335 / 24 ...
//   In the infiltration equation below we multiply by HDD (K·days) and S_PER_DAY (s/day)
//   to recover joules; the constant 0.335 effectively carries units of Wh/(m³·K).
// Per ASHRAE Handbook of Fundamentals 2021, Chapter 1 (Thermodynamics and Psychrometrics),
// Table 2; and NRCan HOT2000 Technical Manual, Section 3.5.
const AIR_HEAT_CAPACITY = 0.335

// Standard Canadian residential storey height of 2.44 m (8 ft), used when
// ceilingHeight is not explicitly provided.
// Per NRCan HOT2000 Technical Manual defaults and CMHC construction surveys.
const DEFAULT_WALL_HEIGHT = 2.44  // metres (= 8 ft)

export function rToRsi(rImperial) {
  return rImperial * R_TO_RSI
}

/**
 * Annual south-facing solar irradiance by climate zone (kWh/m²/year, vertical surface).
 * Derived from NRCan RETScreen climate database and Environment Canada solar radiation
 * normals (1981–2010). Vertical south-facing surface values from ASHRAE HVAC Applications
 * 2019, Chapter 35 (Solar Energy) adjusted for Canadian latitudes.
 */
function southInsolation(hdd) {
  if (hdd < 4000) return 280   // Mild: coastal BC, southern ON — ~45–49°N latitude
  if (hdd < 5500) return 240   // Cold: most of Canada — ~49–54°N
  if (hdd < 7000) return 210   // Very cold: SK, MB, northern ON/QC — ~54–58°N
  return 185                    // Extreme: northern territories — >58°N
}

/**
 * Approximate SHGC (Solar Heat Gain Coefficient) derived from window U-value.
 * Low-e coatings that reduce U-value also reduce SHGC. Relationship is approximate;
 * actual SHGC varies by glass type and coating.
 * Source: ASHRAE Fundamentals 2021, Chapter 15 (Fenestration); NRCan HOT2000 default
 * window properties table (SHGC vs. U-value ranges for common Canadian window types).
 */
function windowSHGC(windowU) {
  if (windowU < 1.6)  return 0.25   // Triple-pane low-e: very low SHGC
  if (windowU <= 2.2) return 0.30   // Double-pane low-e: moderate SHGC
  return 0.40                        // Clear double-pane / older windows: higher SHGC
}

/**
 * Estimate building geometry from floor area and building type.
 * Assumes a roughly square floor plan.
 *
 * @param {number} floorArea         - Total conditioned floor area (m²)
 * @param {number} storeys           - Number of above-grade storeys
 * @param {string} houseType         - 'detached' | 'semi' | 'townhouse' | 'apartment'
 * @param {string} basementType
 * @param {number} [basementWallHeight=2.1] - Basement wall floor-to-ceiling height (m)
 * @returns {Object} Estimated areas (m²)
 */
export function estimateGeometry(floorArea, storeys, houseType, basementType, basementWallHeight = 2.1) {
  const footprint   = floorArea / storeys
  const sideLength  = Math.sqrt(footprint)
  const perimeter   = 4 * sideLength

  // Exposed wall fractions estimated from typical Canadian housing stock geometry.
  // Detached: 4 exposed sides (factor 1.0). Semi: ~2.4 sides (~0.6). Townhouse end-unit
  // average: ~1.8 sides (~0.45). Apartment corner unit: ~1.4 sides (~0.35).
  // Per NRCan, Residential Energy Use Handbook; CMHC housing type surveys.
  const exposedFactors = { detached: 1.0, semi: 0.6, townhouse: 0.45, apartment: 0.35 }
  const ef = exposedFactors[houseType] ?? 1.0

  const grossWallArea = perimeter * DEFAULT_WALL_HEIGHT * storeys * ef
  const ceilingArea   = footprint   // area of the top floor ceiling (below unconditioned attic)

  let basementWallArea = 0
  let basementFloorArea = 0

  if (['full_heated', 'full_unheated', 'partial'].includes(basementType)) {
    // Below-grade fraction derived from wall height minus 0.3 m stem wall above grade.
    // 0.3 m above-grade stem wall is a typical Canadian poured-concrete foundation convention.
    // Source: NRCan HOT2000 Technical Manual, Section 3.3; CMHC Wood Frame House Construction.
    const bgFraction = (basementWallHeight - 0.3) / basementWallHeight
    basementWallArea  = perimeter * basementWallHeight * bgFraction * ef
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
  // Standard Canadian exterior door: 0.91 m × 2.18 m = 1.98 m²
  // Per NBC 2020 (National Building Code of Canada) minimum clear opening dimensions.
  const doorArea    = doorCount * 1.98
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
 *
 * @param {number} [basementWallHeight=2.1] - Basement wall height (m)
 */
export function buildEnvelopeFromDefaults(houseType, floorArea, storeys, basementType, eraDefaults, basementWallHeight = 2.1) {
  const geom = estimateGeometry(floorArea, storeys, houseType, basementType, basementWallHeight)
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
 * @param {Object} params.climate           - { hdd, designTemp }
 * @param {Object} params.envelope          - Full envelope object (from buildEnvelopeFromDefaults or user input)
 * @param {number} params.floorArea         - m²
 * @param {number} params.storeys
 * @param {string} params.basementType
 * @param {Object} params.heating           - { efficiency, fuelCostPerGJ }
 * @param {number} [params.basementWallHeight=2.1] - Basement wall floor-to-ceiling height (m)
 * @param {Object} [params.hrv]             - { has: boolean, effectiveness: number 0–1 }
 * @param {Object} [params.solarInputs]     - { southFraction: number 0–1 }
 * @returns {Object} Detailed results
 */
export function calculateHeatLoss({ climate, envelope, floorArea, storeys, basementType, ceilingHeight, heating, basementWallHeight = 2.1, hrv = { has: false, effectiveness: 0 }, solarInputs = { southFraction: 0 } }) {
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
    // Basement floor: depth-dependent soil resistance added to any floor insulation RSI.
    // RSI_soil = 0.8 + depth × 0.45, where depth = below-grade wall height.
    // Source: NRCan HOT2000 Technical Manual, Section 3.4 simplified ground heat loss model.
    // basementDepth = below-grade depth = wallHeight - 0.3 m (stem wall above grade).
    // Source for 0.3 m stem wall: NRCan HOT2000 Technical Manual, Section 3.3;
    // CMHC Wood Frame House Construction.
    basementFloor: (() => {
      const basementDepth = basementWallHeight - 0.3
      const soilRSI = 0.8 + basementDepth * 0.45
      return 1 / (rToRsi(envelope.basementFloorR || 0) + soilRSI)
    })(),
  }

  // Annual heat loss per component (GJ/year)
  // E_component = Area × U × HDD × seconds_per_day × J_to_GJ
  // HDD base 18°C is the NRCan/Environment Canada standard for Canadian residential
  // energy analysis (NRCan RETScreen, HOT2000). Ref: NRCan, Heating Degree Days Overview.
  const components = {
    ceiling:       envelope.ceilingArea      * U.ceiling       * hdd * S_PER_DAY * J_TO_GJ,
    walls:         envelope.netWallArea      * U.walls         * hdd * S_PER_DAY * J_TO_GJ,
    windows:       envelope.windowArea       * U.windows       * hdd * S_PER_DAY * J_TO_GJ,
    doors:         envelope.doorArea         * U.doors         * hdd * S_PER_DAY * J_TO_GJ,
    basementWalls: envelope.basementWallArea * U.basementWalls * hdd * S_PER_DAY * J_TO_GJ,
    basementFloor: envelope.basementFloorArea * U.basementFloor * hdd * S_PER_DAY * J_TO_GJ,
    airLeakage:    0,   // calculated below
  }

  // Conditioned volume: above-grade storeys + heated basement (if applicable).
  // Basement volume uses basementWallHeight per NRCan HOT2000 default geometry.
  const basementVolume = basementType === 'full_heated' ? (floorArea / storeys) * basementWallHeight : 0
  const conditionedVolume = floorArea * wallHeight + basementVolume

  // Infiltration: Q = ACH × Volume × AIR_HEAT_CAPACITY × HDD (per day × s/day)
  // Infiltration model per NRCan HOT2000 Technical Manual, Section 3.5.
  components.airLeakage = envelope.ach * conditionedVolume * AIR_HEAT_CAPACITY * hdd * S_PER_DAY * J_TO_GJ

  // HRV/ERV heat recovery: reduces effective ventilation heat loss by the sensible
  // effectiveness fraction. Store the pre-HRV leakage so downstream code (e.g. air-sealing
  // savings) computes savings relative to the true unrecovered baseline, not the
  // already-discounted value. Source: NRCan HOT2000 Technical Manual, Section 3.5;
  // CSA C439 Standard for Rating the Performance of Heat/Energy Recovery Ventilators.
  const grossAirLeakageGJ = components.airLeakage
  if (hrv?.has && hrv?.effectiveness > 0) {
    components.airLeakage = components.airLeakage * (1 - hrv.effectiveness)
  }

  const rawHeatLossGJ = Object.values(components).reduce((s, v) => s + v, 0)

  // Passive solar heat gain through south-facing windows offsets heating load.
  // Q_solar = windowArea × southFraction × SHGC × annualInsolation (kWh/m²) × 0.0036 (GJ/kWh)
  // Source: Simplified from NRCan HOT2000 solar gain model (Section 3.6) and
  // ASHRAE 90.1-2019 simplified solar gain method.
  let solarGainGJ = 0
  if (solarInputs?.southFraction > 0 && envelope.windowArea > 0) {
    const shgc       = windowSHGC(envelope.windowU)
    const insolation = southInsolation(hdd)
    solarGainGJ = envelope.windowArea * solarInputs.southFraction * shgc * insolation * 0.0036
  }

  const totalHeatLossGJ = Math.max(0, rawHeatLossGJ - solarGainGJ)

  // Fuel input required (heat loss ÷ system efficiency)
  const annualFuelGJ = totalHeatLossGJ / efficiency
  const annualCost   = annualFuelGJ * fuelCostPerGJ

  // Peak heat loss for equipment sizing reference.
  // Indoor design temperature 18°C per ASHRAE 90.1 and NRCan HOT2000.
  // Outdoor design temperature at 2.5% annual probability per NBCC 2020 Appendix C (Table C-2).
  // Use rawHeatLossGJ (pre-solar) here: solar gain is an annual average offset but is zero on
  // the coldest design night, so it must not reduce equipment sizing capacity.
  const deltaT_design = 18 - designTemp   // °C between indoor setpoint and design outdoor temp
  const peakHeatLossW = deltaT_design > 0
    ? (rawHeatLossGJ / (hdd * S_PER_DAY * J_TO_GJ)) * deltaT_design
    : 0

  return {
    components,              // Annual heat loss (GJ/year) by component (airLeakage is post-HRV)
    grossAirLeakageGJ,       // Pre-HRV air leakage (GJ/year) — use as baseline for air-sealing savings
    totalHeatLossGJ,         // Total annual heat loss through envelope (GJ/year)
    solarGainGJ,             // Passive solar offset (GJ/year)
    annualFuelGJ,            // Annual fuel input required (GJ/year)
    annualCost,              // Annual heating fuel cost (CAD/year)
    peakHeatLossKW: peakHeatLossW / 1000,   // Peak heat loss (kW) for boiler/furnace sizing
    conditionedVolume,       // m³
  }
}
