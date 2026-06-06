/**
 * Derive a household's *effective marginal* energy cost and fixed service charge
 * from a handful of utility bills.
 *
 * A metered utility bill follows a straight line:
 *
 *     total $  =  fixedMonthly ($/month)  +  ratePerGJ ($/GJ) × consumption (GJ)
 *
 * Fitting that line across several bills separates the two components:
 *   - ratePerGJ    (slope)     — the marginal cost of one more GJ. This is what
 *                                upgrade savings should use: cutting consumption
 *                                only saves the variable portion, never the fixed
 *                                service charge.
 *   - fixedMonthly (intercept) — cost of service you pay regardless of usage.
 *
 * Using the naive all-in average (total ÷ GJ) instead would fold the fixed charge
 * into the per-GJ number and overstate every upgrade's savings.
 */

// Energy content per native billing unit, in GJ. Net (lower) heating values, NRCan.
export const BILL_UNITS = {
  naturalGas:  [
    { value: 'm3', label: 'm³',  gjPer: 0.03726 },   // ~37.26 MJ/m³
    { value: 'GJ', label: 'GJ',  gjPer: 1 },
  ],
  electricity: [
    { value: 'kWh', label: 'kWh', gjPer: 0.0036 },   // 1 kWh = 3.6 MJ
  ],
  heatingOil:  [
    { value: 'L', label: 'L', gjPer: 0.03820 },      // ~38.2 MJ/L
  ],
  propane:     [
    { value: 'L', label: 'L', gjPer: 0.02530 },      // ~25.3 MJ/L
  ],
}

/** Convert a consumption amount in a native unit to GJ. */
export function toGJ(amount, unit) {
  for (const units of Object.values(BILL_UNITS)) {
    const u = units.find(x => x.value === unit)
    if (u) return amount * u.gjPer
  }
  return amount   // assume already GJ if unit unrecognised
}

/**
 * @param {Array<{ consumptionGJ: number, totalCost: number }>} points
 * @returns {{ ratePerGJ, fixedMonthly, rSquared, method, allInAvgPerGJ, n }}
 *
 * `method`:
 *   'regression' — slope/intercept fit (2+ bills with differing consumption)
 *   'average'    — fell back to all-in average (too few/identical points, or a
 *                  noisy fit that produced a non-positive marginal rate)
 */
export function computeEffectiveRate(points) {
  const pts = points.filter(p =>
    Number.isFinite(p.consumptionGJ) && p.consumptionGJ > 0 &&
    Number.isFinite(p.totalCost)     && p.totalCost >= 0
  )
  const n = pts.length

  const sumGJ   = pts.reduce((s, p) => s + p.consumptionGJ, 0)
  const sumCost = pts.reduce((s, p) => s + p.totalCost, 0)
  const allInAvgPerGJ = sumGJ > 0 ? sumCost / sumGJ : null

  // Fallback: not enough spread to separate fixed from variable.
  const average = () => ({
    ratePerGJ:    allInAvgPerGJ,
    fixedMonthly: 0,
    rSquared:     null,
    method:       'average',
    allInAvgPerGJ,
    n,
  })

  if (n < 2) return average()

  const meanGJ   = sumGJ / n
  const meanCost = sumCost / n
  let sxx = 0, sxy = 0
  for (const p of pts) {
    const dx = p.consumptionGJ - meanGJ
    sxx += dx * dx
    sxy += dx * (p.totalCost - meanCost)
  }
  if (sxx === 0) return average()   // all bills identical consumption

  let slope     = sxy / sxx
  let intercept = meanCost - slope * meanGJ

  // A non-positive marginal rate means the bills don't separate cleanly — the
  // all-in average is the honest answer.
  if (slope <= 0) return average()

  // Clamp a negative fixed charge (regression noise) to zero.
  if (intercept < 0) intercept = 0

  // Coefficient of determination, as a confidence hint.
  let ssRes = 0, ssTot = 0
  for (const p of pts) {
    const pred = intercept + slope * p.consumptionGJ
    ssRes += (p.totalCost - pred) ** 2
    ssTot += (p.totalCost - meanCost) ** 2
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : null

  return {
    ratePerGJ:    slope,
    fixedMonthly: intercept,
    rSquared,
    method:       'regression',
    allInAvgPerGJ,
    n,
  }
}
