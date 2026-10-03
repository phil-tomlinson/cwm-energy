// ── Timeline engine ───────────────────────────────────────────────────────────
// Computes a footprint for every month of the user's timeline and the impact of
// each dated change. Each change's impact is the gap between the state just
// before it (held constant) and the state with it, using that year's factors.
// Changes at a home are applied in date order, so the impacts sum exactly to
// "if you'd changed nothing" minus "actual".
//
// Scope for the MVP: home energy (heating, hot water, baseload, solar) and
// driving. Flights, diet and goods come later.

import { calculateHeatLoss, buildEnvelopeFromDefaults } from '@/calculations/heatLoss'
import { calculateWaterHeater, waterHeaterTypes } from '@/calculations/waterHeater'
import { calculateSolar } from '@/calculations/solar'
import { HEATING_SYSTEMS, getFuelCostPerGJ, provincialPrices } from '@/data/energyPrices'
import { eraDefaults } from '@/data/houseDefaults'
import { getClimateData } from '@/data/climateData'
import { ASSUMPTIONS, FUEL, TARGET_CUT_2030, gridFactor, type Province } from '@/lib/factors'
import type {
  ActionImpact, EnvelopeUpgrade, Grade, HomeChange, Residence, Timeline,
  TimelineResult, Vehicle, YearMonth, YearPoint,
} from './types'

const KWH_PER_GJ = 1 / 0.0036

// ── Months ────────────────────────────────────────────────────────────────────

export function toMonthIndex(ym: YearMonth): number {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}

export function fromMonthIndex(i: number): YearMonth {
  const y = Math.floor(i / 12)
  const m = (i % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function activeIn(start: YearMonth, end: YearMonth | undefined, m: number) {
  return toMonthIndex(start) <= m && (end === undefined || m < toMonthIndex(end))
}

// ── Home state and its annual energy ──────────────────────────────────────────

interface HomeState {
  province: Province
  city: string
  houseType: Residence['houseType']
  era: Residence['era']
  floorAreaM2: number
  storeys: number
  basementType: Residence['basementType']
  occupants: number
  heatingSystemId: string
  waterHeaterType: string
  solarKW: number
  solarOrientation: string
  upgrades: EnvelopeUpgrade[]
}

export interface Annual { kg: number; dollars: number }

function initialState(r: Residence): HomeState {
  return {
    province: r.province, city: r.city, houseType: r.houseType, era: r.era,
    floorAreaM2: r.floorAreaM2, storeys: r.storeys, basementType: r.basementType,
    occupants: r.occupants, heatingSystemId: r.heatingSystemId,
    waterHeaterType: r.waterHeaterType, solarKW: 0, solarOrientation: 'south', upgrades: [],
  }
}

function applyChange(s: HomeState, c: HomeChange): HomeState {
  switch (c.kind) {
    case 'solar':       return { ...s, solarKW: s.solarKW + c.kW, solarOrientation: c.orientation }
    case 'heating':     return { ...s, heatingSystemId: c.heatingSystemId }
    case 'waterHeater': return { ...s, waterHeaterType: c.waterHeaterType }
    default:            return s.upgrades.includes(c.kind) ? s : { ...s, upgrades: [...s.upgrades, c.kind] }
  }
}

function electricityPrice(p: Province): number {
  return (provincialPrices as Record<string, { electricity: number }>)[p]?.electricity ?? 0.15
}

function fossilFactor(fuelType: string): number {
  if (fuelType === 'naturalGas') return FUEL.naturalGas.value
  if (fuelType === 'heatingOil') return FUEL.heatingOil.value
  if (fuelType === 'propane') return FUEL.propane.value
  return 0
}

const homeCache = new Map<string, Annual>()

/** Annual kg CO2e and dollars for a whole home in a given year (not yet split per person). */
export function homeAnnual(s: HomeState, year: number): Annual {
  const key = `${JSON.stringify(s)}|${year}`
  const hit = homeCache.get(key)
  if (hit) return hit

  const climate = getClimateData(s.province, s.city)
  if (!climate) throw new Error(`Unknown city ${s.city}, ${s.province}`)
  const era = eraDefaults[s.era as keyof typeof eraDefaults]
  const envelope = buildEnvelopeFromDefaults(s.houseType, s.floorAreaM2, s.storeys, s.basementType, era)

  // Envelope upgrades use the same targets as the Heat Loss recommendations.
  if (s.upgrades.includes('attic'))      envelope.ceilingR = Math.max(envelope.ceilingR, 50)
  if (s.upgrades.includes('walls'))      envelope.wallR = Math.max(envelope.wallR, 24)
  if (s.upgrades.includes('windows'))    envelope.windowU = Math.min(envelope.windowU, 1.6)
  if (s.upgrades.includes('airSealing')) envelope.ach = Math.max(0.15, envelope.ach * 0.5)

  const heating = HEATING_SYSTEMS.find((h: { id: string }) => h.id === s.heatingSystemId)
  if (!heating) throw new Error(`Unknown heating system ${s.heatingSystemId}`)
  const heatingPrice = getFuelCostPerGJ(s.province, heating.fuelType) ?? 0

  // calculateHeatLoss is JSDoc-typed as returning Object; these are the fields we use.
  const hl = calculateHeatLoss({
    climate, envelope, floorArea: s.floorAreaM2, storeys: s.storeys, basementType: s.basementType,
    heating: { efficiency: heating.efficiency, fuelCostPerGJ: heatingPrice },
  }) as unknown as { annualFuelGJ: number; annualCost: number }

  const wh = waterHeaterTypes.find((w) => w.value === s.waterHeaterType) ?? waterHeaterTypes[0]
  const whPrice = getFuelCostPerGJ(s.province, wh.fuel) ?? 0
  const whRes = calculateWaterHeater(s.occupants, wh.defaultUef, wh.fuel, climate.coldWaterTemp, whPrice) as unknown as {
    inputEnergyGJ: number; annualCost: number
  }

  const grid = gridFactor(s.province, year).value
  const elecRate = electricityPrice(s.province)

  let kWh = ASSUMPTIONS.baseloadKWh.value
  let kg = 0
  let dollars = 0

  if (heating.fuelType === 'electricity') kWh += hl.annualFuelGJ * KWH_PER_GJ
  else { kg += hl.annualFuelGJ * fossilFactor(heating.fuelType); dollars += hl.annualCost }

  if (wh.fuel === 'electricity') kWh += whRes.inputEnergyGJ * KWH_PER_GJ
  else { kg += whRes.inputEnergyGJ * fossilFactor(wh.fuel); dollars += whRes.annualCost }

  kg += kWh * grid
  dollars += kWh * elecRate

  if (s.solarKW > 0) {
    const solar = calculateSolar({ systemKW: s.solarKW, province: s.province, orientation: s.solarOrientation })
    kg -= solar.annualGenKWh * grid
    dollars -= solar.annualSavingsCAD
  }

  const out = { kg, dollars }
  homeCache.set(key, out)
  return out
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export function vehicleAnnual(v: Pick<Vehicle, 'fuel' | 'efficiency' | 'annualKm'>, province: Province, year: number): Annual {
  const per100 = v.annualKm / 100
  if (v.fuel === 'ev') {
    const kWh = per100 * v.efficiency
    return { kg: kWh * gridFactor(province, year).value, dollars: kWh * electricityPrice(province) }
  }
  const litres = per100 * v.efficiency
  const factor = v.fuel === 'diesel' ? FUEL.diesel.value : FUEL.gasoline.value
  return { kg: litres * factor, dollars: litres * ASSUMPTIONS.gasolinePrice.value }
}

// ── Labels ────────────────────────────────────────────────────────────────────

function heatingLabel(id: string): string {
  const h = HEATING_SYSTEMS.find((x: { id: string }) => x.id === id)
  return h ? h.label : id
}

function changeLabel(c: HomeChange): { label: string; short: string; grade: Grade } {
  switch (c.kind) {
    case 'solar': return { label: `Rooftop solar, ${c.kW} kW`, short: 'Solar', grade: 'hard' }
    case 'heating': {
      const isHeatPump = ['ashp', 'ccashp', 'gshp'].includes(c.heatingSystemId)
      return { label: isHeatPump ? `Heat pump: ${heatingLabel(c.heatingSystemId)}` : `New heating: ${heatingLabel(c.heatingSystemId)}`, short: isHeatPump ? 'Heat pump' : 'Heating', grade: isHeatPump ? 'hard' : 'medium' }
    }
    case 'waterHeater': {
      const w = waterHeaterTypes.find((x) => x.value === c.waterHeaterType)
      return { label: `New water heater: ${w?.label ?? c.waterHeaterType}`, short: 'Hot water', grade: 'medium' }
    }
    case 'attic':      return { label: 'Attic insulation to R-50', short: 'Attic', grade: 'medium' }
    case 'walls':      return { label: 'Wall insulation to R-24', short: 'Walls', grade: 'hard' }
    case 'windows':    return { label: 'High-performance windows', short: 'Windows', grade: 'hard' }
    case 'airSealing': return { label: 'Air sealing', short: 'Air sealing', grade: 'easy' }
  }
}

function vehicleLabel(v: Vehicle): { label: string; short: string; grade: Grade } {
  if (v.fuel === 'ev') return { label: `Switched to an EV: ${v.label}`, short: 'EV', grade: 'hard' }
  if (v.fuel === 'hybrid') return { label: `Switched to a hybrid: ${v.label}`, short: 'Hybrid', grade: 'medium' }
  return { label: `Changed vehicle: ${v.label}`, short: 'New vehicle', grade: 'medium' }
}

// ── The run ───────────────────────────────────────────────────────────────────

/** Fraction of the current month that has passed, so "to date" stops at today. */
function monthWeight(m: number, nowIdx: number, now: Date): number {
  if (m < nowIdx) return 1
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return now.getDate() / days
}

export function computeTimeline(t: Timeline, now: Date = new Date()): TimelineResult {
  const nowIdx = now.getFullYear() * 12 + now.getMonth()
  const currentYear = now.getFullYear()

  const starts = [...t.residences.map((r) => r.start), ...t.vehicles.map((v) => v.start)]
  if (starts.length === 0) {
    return {
      years: [], actions: [], firstYear: currentYear, currentYear, target2030Kg: 0,
      totals: { kgToDate: 0, dollarsToDate: 0, kgPerYearNow: 0, dollarsPerYearNow: 0 },
    }
  }
  const firstIdx = Math.min(...starts.map(toMonthIndex))
  const lastIdx = currentYear * 12 + 11 // through December, for this year's projection

  const impacts = new Map<string, ActionImpact>()
  const ensure = (id: string, label: string, short: string, date: YearMonth, grade: Grade) => {
    if (!impacts.has(id)) impacts.set(id, { id, label, short, date, grade, kgToDate: 0, dollarsToDate: 0, kgPerYearNow: 0, dollarsPerYearNow: 0 })
    return impacts.get(id)!
  }

  const years = new Map<number, YearPoint>()
  const coveredMonths = new Map<number, number>()
  const vehicleById = new Map(t.vehicles.map((v) => [v.id, v]))

  const provinceAt = (m: number): Province => {
    const r = t.residences.find((x) => activeIn(x.start, x.end, m)) ?? t.residences[0]
    return r?.province ?? 'AB'
  }

  for (let m = firstIdx; m <= lastIdx; m++) {
    const year = Math.floor(m / 12)
    const future = m > nowIdx
    const w = future ? 1 : monthWeight(m, nowIdx, now)
    const point = years.get(year) ?? { year, actualKg: 0, baselineKg: 0, projected: false, gridHeld: false }
    let covered = false
    if (future) point.projected = true
    point.gridHeld = point.gridHeld || gridFactor('AB', year).held === true

    // Homes
    for (const r of t.residences) {
      if (!activeIn(r.start, r.end, m)) continue
      const share = 1 / Math.max(1, r.occupants)
      const changes = t.changes
        .filter((c) => c.residenceId === r.id && toMonthIndex(c.date) <= m)
        .sort((a, b) => toMonthIndex(a.date) - toMonthIndex(b.date) || a.id.localeCompare(b.id))

      let state = initialState(r)
      let prev = homeAnnual(state, year)
      covered = true
      point.baselineKg += (prev.kg / 12) * share
      for (const c of changes) {
        state = applyChange(state, c)
        const next = homeAnnual(state, year)
        const { label, short, grade } = changeLabel(c)
        const a = ensure(c.id, label, short, c.date, grade)
        const dKg = (prev.kg - next.kg) * share
        const d$ = (prev.dollars - next.dollars) * share
        if (!future) { a.kgToDate += (dKg / 12) * w; a.dollarsToDate += (d$ / 12) * w }
        if (m === nowIdx) { a.kgPerYearNow += dKg; a.dollarsPerYearNow += d$ }
        prev = next
      }
      point.actualKg += (prev.kg / 12) * share
    }

    // Vehicles
    const province = provinceAt(m)
    for (const v of t.vehicles) {
      if (!activeIn(v.start, v.end, m)) continue
      const share = 1 / Math.max(1, v.people)
      const actual = vehicleAnnual(v, province, year)
      covered = true
      point.actualKg += (actual.kg / 12) * share

      // Walk back the replacement chain: impact is versus the vehicle it replaced;
      // the do-nothing baseline is the original vehicle, driven the same distance.
      let root: Vehicle = v
      const seen = new Set<string>([v.id])
      while (root.replaces && vehicleById.has(root.replaces) && !seen.has(root.replaces)) {
        root = vehicleById.get(root.replaces)!
        seen.add(root.id)
      }
      const baseline = vehicleAnnual({ ...root, annualKm: v.annualKm }, province, year)
      point.baselineKg += (baseline.kg / 12) * share

      if (v.replaces && vehicleById.has(v.replaces)) {
        const before = vehicleById.get(v.replaces)!
        const counter = vehicleAnnual({ ...before, annualKm: v.annualKm }, province, year)
        const { label, short, grade } = vehicleLabel(v)
        const a = ensure(v.id, label, short, v.start, grade)
        const dKg = (counter.kg - actual.kg) * share
        const d$ = (counter.dollars - actual.dollars) * share
        if (!future) { a.kgToDate += (dKg / 12) * w; a.dollarsToDate += (d$ / 12) * w }
        if (m === nowIdx) { a.kgPerYearNow += dKg; a.dollarsPerYearNow += d$ }
      }
    }

    if (covered) coveredMonths.set(year, (coveredMonths.get(year) ?? 0) + 1)
    years.set(year, point)
  }

  const actions = [...impacts.values()].sort((a, b) => toMonthIndex(a.date) - toMonthIndex(b.date))
  const totals = actions.reduce(
    (s, a) => ({
      kgToDate: s.kgToDate + a.kgToDate,
      dollarsToDate: s.dollarsToDate + a.dollarsToDate,
      kgPerYearNow: s.kgPerYearNow + a.kgPerYearNow,
      dollarsPerYearNow: s.dollarsPerYearNow + a.dollarsPerYearNow,
    }),
    { kgToDate: 0, dollarsToDate: 0, kgPerYearNow: 0, dollarsPerYearNow: 0 },
  )

  // Annualise partial years (a move-in in June, say) so every point is a full-year figure.
  const yearList = [...years.values()]
    .map((p) => {
      const months = coveredMonths.get(p.year) ?? 0
      if (months === 0) return null
      const scale = 12 / months
      return { ...p, actualKg: p.actualKg * scale, baselineKg: p.baselineKg * scale }
    })
    .filter((p): p is YearPoint => p !== null)
    .sort((a, b) => a.year - b.year)
  const firstYear = yearList[0]?.year ?? currentYear
  const referenceKg = yearList[0]?.actualKg ?? 0

  return {
    years: yearList,
    actions,
    totals,
    firstYear,
    currentYear,
    target2030Kg: referenceKg * (1 - TARGET_CUT_2030),
  }
}

// ── A typical household, by our method ───────────────────────────────────────
// Used as a comparison. Every assumption is listed so people can judge it.

const TYPICAL_HEATING: Record<Province, { heating: string; water: string }> = {
  BC: { heating: 'furnace_90', water: 'storage_gas' },
  AB: { heating: 'furnace_90', water: 'storage_gas' },
  SK: { heating: 'furnace_90', water: 'storage_gas' },
  MB: { heating: 'furnace_90', water: 'storage_gas' },
  ON: { heating: 'furnace_90', water: 'storage_gas' },
  QC: { heating: 'baseboard', water: 'storage_electric' },
  NB: { heating: 'baseboard', water: 'storage_electric' },
  NS: { heating: 'oil_86', water: 'storage_electric' },
  PE: { heating: 'oil_86', water: 'storage_electric' },
  NL: { heating: 'baseboard', water: 'storage_electric' },
  YT: { heating: 'oil_86', water: 'storage_electric' },
  NT: { heating: 'oil_86', water: 'storage_electric' },
  NU: { heating: 'oil_86', water: 'storage_electric' },
}

export const TYPICAL_ASSUMPTIONS = {
  people: 2.4,
  floorAreaM2: 150,
  era: '1980_1999' as const,
  carLPer100: 9.5,
  carKm: 15000,
}

export function typicalPerPerson(province: Province, city: string, year: number): number {
  const a = TYPICAL_ASSUMPTIONS
  const h = TYPICAL_HEATING[province]
  const home = homeAnnual({
    province, city, houseType: 'detached', era: a.era, floorAreaM2: a.floorAreaM2, storeys: 2,
    basementType: 'full_heated', occupants: Math.round(a.people), heatingSystemId: h.heating,
    waterHeaterType: h.water, solarKW: 0, solarOrientation: 'south', upgrades: [],
  }, year)
  const car = vehicleAnnual({ fuel: 'gasoline', efficiency: a.carLPer100, annualKm: a.carKm }, province, year)
  return (home.kg + car.kg) / a.people
}

export function typicalHeatingLabel(province: Province): string {
  return heatingLabel(TYPICAL_HEATING[province].heating).toLowerCase()
}
