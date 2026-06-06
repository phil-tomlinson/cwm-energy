// User-supplied energy rates derived from their own bills (see EnergyCostCalculator).
// Persisted client-side and used to override provincial averages in the estimate.
// Shape: { [fuelType]: { ratePerGJ, fixedMonthly, source: 'user-bills', savedAt } }

const KEY = 'cwm_energy_rates'

export function loadEnergyRates() {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

export function saveEnergyRate(fuelType, { ratePerGJ, fixedMonthly }) {
  if (typeof window === 'undefined') return
  const all = loadEnergyRates()
  all[fuelType] = { ratePerGJ, fixedMonthly, source: 'user-bills', savedAt: new Date().toISOString() }
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch {}
}

export function clearEnergyRate(fuelType) {
  if (typeof window === 'undefined') return
  const all = loadEnergyRates()
  delete all[fuelType]
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch {}
}

/** User's marginal $/GJ for a fuel, or null if they haven't entered bills for it. */
export function getUserRatePerGJ(fuelType) {
  return loadEnergyRates()[fuelType]?.ratePerGJ ?? null
}
