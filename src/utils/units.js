// Unit conversion utilities.
// All values are stored internally in SI (m, m²).
// These functions convert for display and convert user input back to SI.

const M2_PER_FT2 = 0.09290304
const M_PER_FT   = 0.3048

// ── Display (metric → display unit) ──────────────────────────────────────

export function displayArea(m2, units) {
  if (units === 'imperial') return Math.round(m2 / M2_PER_FT2 * 10) / 10
  return Math.round(m2 * 10) / 10
}

export function displayLength(m, units) {
  if (units === 'imperial') return Math.round(m / M_PER_FT * 100) / 100
  return Math.round(m * 100) / 100
}

// ── Input (display unit → metric) ────────────────────────────────────────

export function inputArea(displayVal, units) {
  if (units === 'imperial') return displayVal * M2_PER_FT2
  return displayVal
}

export function inputLength(displayVal, units) {
  if (units === 'imperial') return displayVal * M_PER_FT
  return displayVal
}

// ── Unit labels ───────────────────────────────────────────────────────────

export function areaUnit(units)   { return units === 'imperial' ? 'ft²' : 'm²' }
export function lengthUnit(units) { return units === 'imperial' ? 'ft'  : 'm'  }
