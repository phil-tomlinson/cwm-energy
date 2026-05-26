// ── Solar resource data ───────────────────────────────────────────────────────
// Sources:
//   Irradiance:   NRCan Photovoltaic Potential and Solar Resource Maps
//   Emissions:    Environment and Climate Change Canada, National Inventory Report 2023
//   Net metering: Provincial utility regulations, as of 2024

// ── Annual solar resource ─────────────────────────────────────────────────────
// kWh/kWp/year for a south-facing array at optimal tilt (approx. latitude angle).
// Represents total annual energy output per kilowatt of installed DC capacity.
// Coastal BC is lower (~1,100); interior BC (Kelowna) and AB are higher (~1,300+).
export const provincialIrradiance = {
  BC:  1150,
  AB:  1340,  // Calgary/Edmonton — high irradiance despite cold winters
  SK:  1310,
  MB:  1200,
  ON:  1190,  // Toronto/Ottawa; northern ON is lower
  QC:  1120,
  NB:  1090,
  NS:  1080,
  PE:  1060,
  NL:   980,
  YT:   970,
  NT:   860,
  NU:   760,
}

// ── Grid emission intensity ───────────────────────────────────────────────────
// g CO₂e / kWh — ECCC National Inventory Report 2022/2023 electricity estimates.
// This determines the carbon offset benefit of solar. Near-zero hydro grids
// (QC, MB, BC) have minimal CO₂ benefit but may still have strong financial payback.
// Fossil-heavy grids (AB, SK, NU) have the highest CO₂ offset per kWh generated.
export const gridEmissionFactors = {
  BC:   13,   // run-of-river and storage hydro dominant
  AB:  420,   // coal + gas mix; declining rapidly as coal phases out (was ~680 in 2015)
  SK:  580,   // still heavily coal-dependent
  MB:    3,   // almost entirely hydro
  ON:   30,   // nuclear + hydro dominant
  QC:    2,   // 99%+ hydro
  NB:  270,
  NS:  430,   // transitioning from coal
  PE:   25,   // significant wind + NB grid imports
  NL:   25,   // Muskrat Falls + existing hydro
  YT:   70,
  NT:  220,
  NU:  820,   // diesel generation — highest CO₂ intensity in Canada
}

// ── Net metering rules ────────────────────────────────────────────────────────
// 'retail'   — exported kWh credited at the full retail electricity rate.
//              Most common: BC, SK, MB, QC, NB, NS, PE, NL.
// 'avoided'  — credited at avoided/wholesale cost only (~40% of retail).
//              Ontario: commodity component only, not full delivery+commodity rate.
// 'variable' — auto-switching between net-importer and net-exporter tiers each billing month.
//              Alberta: net-importer months → commodity rate only (~$0.084/kWh);
//              net-exporter months → premium commodity rate (~$0.350/kWh). Retailers
//              automatically apply whichever designation favours the customer.
// 'none'     — no residential net metering program available.
export const netMeteringTypes = {
  BC: 'retail',    // BC Hydro net metering, annual true-up
  AB: 'variable',  // Micro-generation regulation; auto net-importer/exporter switching
  SK: 'retail',   // SaskPower net metering, annual true-up
  MB: 'retail',   // Manitoba Hydro net metering
  ON: 'avoided',  // Commodity-only credit (~$0.04–0.07/kWh vs. ~$0.165 retail)
  QC: 'retail',   // Hydro-Québec net metering
  NB: 'retail',   // NB Power net metering
  NS: 'retail',   // Nova Scotia Power net metering
  PE: 'retail',   // Maritime Electric net metering
  NL: 'retail',   // NL Hydro net metering (expanded 2022)
  YT: 'retail',   // YECL net metering (limited residential uptake)
  NT: 'avoided',  // NWT Power Corporation, limited program
  NU: 'none',     // Qulliq Energy — no residential net metering
}

// ── Orientation factors ───────────────────────────────────────────────────────
// Multiplier on irradiance for non-optimal roof orientation.
// South-facing at optimal tilt = 1.00 (baseline).
export const orientationFactors = {
  south: 1.00,
  sw:    0.93,
  se:    0.93,
  west:  0.80,
  east:  0.80,
  nw:    0.66,
  ne:    0.66,
  north: 0.55,
}

export const ORIENTATION_LABELS = {
  south: 'South (optimal)',
  sw:    'South-west',
  se:    'South-east',
  west:  'West',
  east:  'East',
  nw:    'North-west (not recommended)',
  ne:    'North-east (not recommended)',
  north: 'North (not recommended)',
}

// ── Roof type definitions ─────────────────────────────────────────────────────
// Describes the primary solar-suitable roof configuration.
export const ROOF_TYPES = [
  {
    id:    'ew',
    label: 'South-facing slope',
    sub:   'Ridge runs east–west',
    desc:  'The roof slopes toward the front and back of the house. The south slope receives direct sun all day — the best configuration for solar.',
  },
  {
    id:    'ns',
    label: 'East / west slopes only',
    sub:   'Ridge runs north–south',
    desc:  'The roof slopes to the sides. No direct south-facing slope — panels go on the east or west face, or split across both. Produces ~20% less than south-facing.',
  },
  {
    id:    'hip',
    label: 'Hip roof',
    sub:   'Four slopes, no full ridge',
    desc:  'All four sides slope down from a central peak. The south-facing portion is smaller than a full south slope but still useful.',
  },
  {
    id:    'flat',
    label: 'Flat or low-slope',
    sub:   'Panels racked at optimal angle',
    desc:  'Panels can be mounted on adjustable racks facing south at the ideal angle. Nearly the full roof footprint is available.',
  },
]

// ── Roof capacity estimation ──────────────────────────────────────────────────

// Fraction of horizontal footprint that is the primary solar-suitable slope,
// before applying pitch and usability factors. Keyed by [houseType][roofType].
// 'apartment' = 0: individual units can't access the shared roof.
const SOUTH_FRACTIONS = {
  detached:  { ew: 0.50, ns: 0.48, hip: 0.27, flat: 0.90 },
  semi:      { ew: 0.45, ns: 0.43, hip: 0.24, flat: 0.85 },
  townhouse: { ew: 0.38, ns: 0.36, hip: 0.20, flat: 0.80 },
  apartment: { ew: 0.00, ns: 0.00, hip: 0.00, flat: 0.00 },
}

// Default orientation per roof type.
// For N-S ridge, default to west (better for afternoon peak load coincidence).
const DEFAULT_ORIENTATIONS = {
  ew:   'south',
  ns:   'west',
  hip:  'sw',
  flat: 'south',
}

// Typical Canadian residential roof pitch (5/12–6/12, ~23°–27°).
// Converts horizontal footprint to actual slope area.
const PITCH_FACTOR = 1.12

// Modern residential panels: ~200 W/m² of panel area.
const KW_PER_SQM = 0.20

// Derating for setbacks, vents, chimneys, and edge clearances.
const USABILITY_FACTOR = 0.85

/**
 * Estimate the maximum installable system size from roof geometry.
 *
 * @param {object} p
 * @param {string}  p.houseType   - 'detached' | 'semi' | 'townhouse' | 'apartment'
 * @param {number}  p.floorArea   - Conditioned floor area in m²
 * @param {number}  p.storeys     - Number of storeys (determines footprint)
 * @param {string}  p.roofType    - 'ew' | 'ns' | 'hip' | 'flat'
 * @returns {{ maxKW, usableAreaM2, defaultOrientation }}
 */
export function estimateRoofCapacity({ houseType, floorArea, storeys, roofType }) {
  const type       = houseType ?? 'detached'
  const roof       = roofType  ?? 'ew'
  const footprint  = (floorArea ?? 150) / (storeys ?? 2)
  const fractions  = SOUTH_FRACTIONS[type] ?? SOUTH_FRACTIONS.detached
  const fraction   = fractions[roof] ?? 0.45

  const slopeArea  = footprint * fraction * PITCH_FACTOR
  const usable     = slopeArea * USABILITY_FACTOR
  const maxKW      = Math.max(1, Math.round(usable * KW_PER_SQM * 10) / 10)

  return {
    maxKW,
    usableAreaM2:       Math.round(usable),
    defaultOrientation: DEFAULT_ORIENTATIONS[roof] ?? 'south',
  }
}

/**
 * Return plain-English guidance about a home's solar potential.
 * Used below the roof-configuration inputs in the UI.
 *
 * @param {object} p
 * @param {string}  p.houseType
 * @param {string}  p.roofType
 * @param {number}  p.maxKW
 */
export function getRoofGuidanceText({ houseType, roofType, maxKW }) {
  if (houseType === 'apartment') {
    return 'Individual units typically cannot access a shared apartment roof for solar. '
      + 'Community solar programs or a green electricity tariff from your utility may be better options.'
  }

  const houseLabel = {
    detached:  'detached home',
    semi:      'semi-detached',
    townhouse: 'townhouse',
  }[houseType] ?? 'home'

  const roofLabel = ROOF_TYPES.find(r => r.id === roofType)?.label?.toLowerCase() ?? 'roof'

  if (roofType === 'ns') {
    const caveat = maxKW <= 4
      ? 'The east/west slopes limit your annual output to roughly 80% of what a south-facing roof would produce — but the system still pays back well in high-rate provinces.'
      : 'Panels on the east or west slope produce about 80% of a south-facing equivalent — still a solid investment where electricity is expensive.'
    return `Your ${houseLabel} has a ${roofLabel} — we estimate up to ${maxKW} kW of usable capacity. ${caveat}`
  }

  if (houseType === 'apartment' || maxKW <= 0) {
    return 'Solar is not typically feasible for individual apartment units.'
  }

  if (maxKW <= 3) {
    return `Your ${houseLabel} has limited roof area — we estimate up to ${maxKW} kW of usable ${roofLabel}. `
      + 'Even a small 2–3 kW system generates meaningful savings, especially where electricity rates are high.'
  }

  if (maxKW <= 7) {
    return `Your ${houseLabel} has moderate solar potential — we estimate up to ${maxKW} kW of usable ${roofLabel}. `
      + 'A system in the 4–6 kW range is typical for this configuration.'
  }

  return `Your ${houseLabel} has strong solar potential — we estimate up to ${maxKW} kW of usable ${roofLabel}. `
    + 'This is enough to cover a significant portion of your annual electricity load.'
}
