import { describe, expect, it } from 'vitest'
import { computeWeek, calibration, servingKg, FOOD_BY_ID, PANTRY_KG_PER_DAY, DIET_BY_ID } from './food'
import { tripKg, flightBand, greatCircleKm } from './travel'
import { computeTimeline, foodPlan } from './timeline/engine'
import { SAMPLE_TIMELINE } from './timeline/sample'
import type { FoodWeek, Meal, Timeline } from './timeline/types'

const NOW = new Date(2026, 9, 3) // 3 October 2026

const meal = (day: number, foods: [string, number][], extra: Partial<Meal> = {}): Meal => ({
  id: `m-${day}-${Math.random()}`, day, slot: 'dinner', source: 'home', local: false,
  items: foods.map(([foodId, servings]) => ({ foodId, servings })), ...extra,
})

const week = (meals: Meal[], waste: FoodWeek['waste'] = 'low'): FoodWeek => ({ id: 'w', startDate: '2026-09-07', meals, waste })

describe('a logged week', () => {
  it('turns servings into kg a day, plus the pantry allowance', () => {
    const r = computeWeek(week([meal(0, [['poultry', 1], ['rice', 1]]), meal(1, [['tofu', 1]])]))!
    const chicken = servingKg(FOOD_BY_ID.get('poultry')!)
    expect(chicken).toBeCloseTo(1.48, 2)
    const expected = (chicken + servingKg(FOOD_BY_ID.get('rice')!) + servingKg(FOOD_BY_ID.get('tofu')!)) / 2 + PANTRY_KG_PER_DAY
    expect(r.daysLogged).toBe(2)
    expect(r.kgPerDay).toBeCloseTo(expected, 6)
  })

  it('makes a restaurant meal cost more than the same meal at home, and local slightly less', () => {
    const home = computeWeek(week([meal(0, [['beef', 1]])]))!
    const out = computeWeek(week([meal(0, [['beef', 1]], { source: 'restaurant' })]))!
    const local = computeWeek(week([meal(0, [['beef', 1]], { local: true })]))!
    expect(out.kgPerDay).toBeGreaterThan(home.kgPerDay)
    expect(home.kgPerDay - local.kgPerDay).toBeCloseTo(servingKg(FOOD_BY_ID.get('beef')!) * 0.05, 6)
  })

  it('adds food waste on top of what was eaten', () => {
    const low = computeWeek(week([meal(0, [['pork', 1]])], 'low'))!
    const high = computeWeek(week([meal(0, [['pork', 1]])], 'high'))!
    expect(high.kgPerDay - low.kgPerDay).toBeCloseTo((low.kgPerDay - PANTRY_KG_PER_DAY) * 0.25, 6)
  })

  it('works out the diet type from what was eaten', () => {
    expect(computeWeek(week([meal(0, [['beef', 1]])]))!.dietType).toBe('highMeat')
    expect(computeWeek(week([meal(0, [['fish', 1]])]))!.dietType).toBe('pescatarian')
    expect(computeWeek(week([meal(0, [['cheese', 1]])]))!.dietType).toBe('vegetarian')
    expect(computeWeek(week([meal(0, [['tofu', 1]])]))!.dietType).toBe('vegan')
  })

  it('ignores an empty week', () => {
    expect(computeWeek(week([]))).toBeNull()
  })

  it('limits how far one week can scale your history', () => {
    expect(calibration(100, 'vegan')).toBe(1.6)
    expect(calibration(0.1, 'highMeat')).toBe(0.5)
  })
})

describe('trips', () => {
  it('measures Calgary to Toronto at about 2,700 km', () => {
    const km = greatCircleKm(51.114, -114.02, 43.677, -79.631)
    expect(km).toBeGreaterThan(2650)
    expect(km).toBeLessThan(2750)
    expect(flightBand(km)).toBe('short')
  })

  it('adds the 8% uplift and the altitude effect, and doubles a return trip', () => {
    const one = tripKg({ mode: 'flight', km: 1000, roundTrip: false, cabin: 'economy' })
    expect(one.km).toBeCloseTo(1080)
    expect(one.kg).toBeCloseTo(1080 * 0.07435, 6)
    expect(one.extraKg / one.kg).toBeCloseTo(0.12576 / 0.07435 - 1, 6)
    const back = tripKg({ mode: 'flight', km: 1000, roundTrip: true, cabin: 'economy' })
    expect(back.kg).toBeCloseTo(one.kg * 2, 6)
  })

  it('charges business class more on long flights', () => {
    const econ = tripKg({ mode: 'flight', km: 8000, roundTrip: false, cabin: 'economy' })
    const biz = tripKg({ mode: 'flight', km: 8000, roundTrip: false, cabin: 'business' })
    expect(biz.kg / econ.kg).toBeCloseTo(2.9, 6)
  })

  it('has no altitude effect on the ground', () => {
    const rail = tripKg({ mode: 'rail', km: 500, roundTrip: false })
    expect(rail.extraKg).toBe(0)
    expect(rail.kg).toBeCloseTo(500 * 0.093, 6)
  })
})

describe('food and trips in the timeline', () => {
  const base: Timeline = {
    ...SAMPLE_TIMELINE,
    diet: [{ id: 'd0', diet: 'mediumMeat', start: '2015-06' }],
  }

  it('adds your diet to both lines when nothing changed', () => {
    const withFood = computeTimeline(base, NOW)
    const without = computeTimeline(SAMPLE_TIMELINE, NOW)
    const y = (r: typeof withFood) => r.years.find((p) => p.year === 2023)!
    const yearKg = DIET_BY_ID.get('mediumMeat')!.kgPerDay * 365.25
    expect(y(withFood).actualKg - y(without).actualKg).toBeCloseTo(yearKg, 0)
    expect(y(withFood).baselineKg - y(without).baselineKg).toBeCloseTo(yearKg, 0)
    expect(withFood.actions.some((a) => a.short === 'Diet')).toBe(false)
  })

  it('credits a change of diet, and the credits still add up', () => {
    const changed: Timeline = { ...base, diet: [...base.diet!, { id: 'd1', diet: 'vegetarian', start: '2022-01' }] }
    const r = computeTimeline(changed, NOW)
    const action = r.actions.find((a) => a.id === 'd1')!
    const perYear = (DIET_BY_ID.get('mediumMeat')!.kgPerDay - DIET_BY_ID.get('vegetarian')!.kgPerDay) * 365.25
    expect(action.kgPerYearNow).toBeCloseTo(perYear, 0)
    for (const y of r.years) {
      const saved = y.saved.reduce((s, p) => s + p.kg, 0)
      expect(saved).toBeCloseTo(y.baselineKg - y.actualKg, 3)
    }
  })

  it("doesn't count measuring your diet as a change", () => {
    const measured: Timeline = {
      ...base,
      foodWeeks: [week([meal(0, [['tofu', 1]]), meal(1, [['pulses', 1]])])],
    }
    const r = computeTimeline(measured, NOW)
    const plain = computeTimeline(SAMPLE_TIMELINE, NOW)
    // Food moves both lines by the same amount, so nothing is credited for it.
    for (const y of r.years) {
      const p = plain.years.find((x) => x.year === y.year)!
      expect(y.baselineKg - p.baselineKg).toBeCloseTo(y.actualKg - p.actualKg, 3)
    }
    expect(r.actions.some((a) => a.short === 'Diet')).toBe(false)
    expect(foodPlan(measured)!.ratio).toBe(0.5)
  })

  it('uses a logged week alone when there is no diet history', () => {
    const plan = foodPlan({ ...SAMPLE_TIMELINE, foodWeeks: [week([meal(0, [['beef', 1]])])] })!
    expect(plan.periods).toHaveLength(1)
    expect(plan.periods[0].diet).toBe('highMeat')
  })

  it('puts a flight in the year you took it, in both lines', () => {
    const flew: Timeline = { ...SAMPLE_TIMELINE, trips: [{ id: 't', mode: 'flight', date: '2023-07', km: 2700, roundTrip: true, cabin: 'economy' }] }
    const a = computeTimeline(flew, NOW).years.find((p) => p.year === 2023)!
    const b = computeTimeline(SAMPLE_TIMELINE, NOW).years.find((p) => p.year === 2023)!
    const k = tripKg({ mode: 'flight', km: 2700, roundTrip: true, cabin: 'economy' })
    expect(a.actualKg - b.actualKg).toBeCloseTo(k.kg + k.extraKg, 3)
    expect(a.baselineKg - b.baselineKg).toBeCloseTo(k.kg + k.extraKg, 3)
    expect(a.parts.find((p) => p.key === 'flights-altitude')!.kg).toBeCloseTo(k.extraKg, 3)
  })
})
