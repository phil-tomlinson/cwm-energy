import { describe, expect, it } from 'vitest'
import { computeTimeline, toMonthIndex, fromMonthIndex } from './engine'
import { SAMPLE_TIMELINE } from './sample'
import { gridFactor } from '@/lib/factors'
import type { Timeline } from './types'

const NOW = new Date(2026, 9, 3) // 3 October 2026

describe('months', () => {
  it('round-trips', () => {
    expect(fromMonthIndex(toMonthIndex('2024-03'))).toBe('2024-03')
    expect(toMonthIndex('2020-01') - toMonthIndex('2019-12')).toBe(1)
  })
})

describe('grid factors', () => {
  it('uses the published year when available', () => {
    expect(gridFactor('AB', 2022).value).toBeCloseTo(0.49)
    expect(gridFactor('AB', 2022).held).toBe(false)
  })
  it('holds the nearest year and says so', () => {
    expect(gridFactor('AB', 2018).value).toBeCloseTo(0.54)
    expect(gridFactor('AB', 2018).held).toBe(true)
    expect(gridFactor('AB', 2026).value).toBeCloseTo(0.346)
  })
})

describe('computeTimeline', () => {
  const r = computeTimeline(SAMPLE_TIMELINE, NOW)

  it('covers every year from move-in to this year', () => {
    // Moved in June 2015, so the chart starts at the first full year
    expect(r.years[0].year).toBe(2016)
    expect(r.years.at(-1)!.year).toBe(2026)
    expect(r.years.at(-1)!.projected).toBe(true)
  })

  it('impacts sum exactly to baseline minus actual', () => {
    const jan: Timeline = {
      ...SAMPLE_TIMELINE,
      residences: [{ ...SAMPLE_TIMELINE.residences[0], start: '2015-01' }],
      vehicles: SAMPLE_TIMELINE.vehicles.map((v) => (v.id === 'car-1' ? { ...v, start: '2015-01' } : v)),
    }
    const res = computeTimeline(jan, new Date(2025, 11, 31))
    const gap = res.years.reduce((s, y) => s + (y.baselineKg - y.actualKg), 0)
    expect(res.totals.kgToDate).toBeCloseTo(gap, 3)
  })

  it('credits solar and the EV, and accrues only from their dates', () => {
    const solar = r.actions.find((a) => a.id === 'solar-1')!
    const ev = r.actions.find((a) => a.id === 'car-2')!
    expect(solar.kgToDate).toBeGreaterThan(0)
    expect(ev.kgToDate).toBeGreaterThan(0)
    expect(solar.date).toBe('2020-06')
    // Six-plus years of solar should out-bank two and a half years of EV per kW-year logic
    expect(solar.kgToDate / 1000).toBeGreaterThan(5)
  })

  it('is honest when a change costs money', () => {
    // A heat pump replacing cheap Alberta gas usually raises the bill.
    const hp = r.actions.find((a) => a.id === 'heat-1')!
    expect(hp.dollarsPerYearNow).toBeLessThan(0)
  })

  it('totals equal the sum of the actions', () => {
    const sum = r.actions.reduce((s, a) => s + a.kgToDate, 0)
    expect(r.totals.kgToDate).toBeCloseTo(sum)
  })

  it('splits a home between its occupants', () => {
    const solo: Timeline = { ...SAMPLE_TIMELINE, residences: [{ ...SAMPLE_TIMELINE.residences[0], occupants: 1 }] }
    const one = computeTimeline(solo, NOW).actions.find((a) => a.id === 'solar-1')!
    const two = r.actions.find((a) => a.id === 'solar-1')!
    expect(one.kgToDate).toBeCloseTo(two.kgToDate * 2, 0)
  })

  it('stops a home change accruing after moving out', () => {
    const moved: Timeline = {
      ...SAMPLE_TIMELINE,
      residences: [{ ...SAMPLE_TIMELINE.residences[0], end: '2023-01' }],
    }
    const res = computeTimeline(moved, NOW)
    const solar = res.actions.find((a) => a.id === 'solar-1')!
    expect(solar.kgPerYearNow).toBe(0)
    expect(solar.kgToDate).toBeGreaterThan(0)
  })

  it('ignores a car owned before moving in when setting the start and the goal', () => {
    const early: Timeline = {
      ...SAMPLE_TIMELINE,
      vehicles: SAMPLE_TIMELINE.vehicles.map((v) => (v.id === 'car-1' ? { ...v, start: '2012-01' } : v)),
    }
    const res = computeTimeline(early, NOW)
    expect(res.years[0].year).toBe(2016)
    expect(res.target2030Kg).toBeGreaterThan(1000)
  })

  it('breaks each year down so the parts add up', () => {
    for (const y of r.years) {
      const parts = y.parts.reduce((s, p) => s + p.kg, 0)
      const saved = y.saved.reduce((s, p) => s + p.kg, 0)
      expect(parts).toBeCloseTo(y.actualKg, 3)
      expect(saved).toBeCloseTo(y.baselineKg - y.actualKg, 3)
    }
    const y2025 = r.years.find((y) => y.year === 2025)!
    expect(y2025.parts.find((p) => p.key === 'solar')!.kg).toBeLessThan(0)
  })

  it('credits every step of a chain of vehicle switches', () => {
    const chain: Timeline = {
      ...SAMPLE_TIMELINE,
      vehicles: [
        { id: 'a', label: 'Old truck', fuel: 'gasoline', efficiency: 13, annualKm: 15000, people: 1, start: '2015-06', end: '2019-01' },
        { id: 'b', label: 'Hybrid', fuel: 'hybrid', efficiency: 5.5, annualKm: 15000, people: 1, start: '2019-01', end: '2024-01', replaces: 'a' },
        { id: 'c', label: 'EV', fuel: 'ev', efficiency: 19, annualKm: 15000, people: 1, start: '2024-01', replaces: 'b' },
      ],
    }
    const res = computeTimeline(chain, NOW)
    for (const y of res.years) {
      const saved = y.saved.reduce((s, p) => s + p.kg, 0)
      expect(saved).toBeCloseTo(y.baselineKg - y.actualKg, 3)
    }
  })

  it('keeps the original vehicle, at its own distance and passengers, in the do-nothing line', () => {
    // Gas SUV, 12,000 km a year shared by 2, replaced by an EV driven 20,000 km alone.
    const switched: Timeline = {
      ...SAMPLE_TIMELINE,
      vehicles: [
        { id: 'gas', label: 'Gas SUV', fuel: 'gasoline', efficiency: 9, annualKm: 12000, people: 2, start: '2015-06', end: '2024-11' },
        { id: 'ev', label: 'EV', fuel: 'ev', efficiency: 19, annualKm: 20000, people: 1, start: '2024-11', replaces: 'gas' },
      ],
    }
    const homeOnly = computeTimeline({ ...SAMPLE_TIMELINE, vehicles: [] }, NOW)
    const res = computeTimeline(switched, NOW)
    const gasShareKg = (9 * 12000 / 100) * 2.307 / 2

    for (const year of [2023, 2024, 2025, 2026]) {
      const withCar = res.years.find((y) => y.year === year)!
      const home = homeOnly.years.find((y) => y.year === year)!
      // The car's part of the do-nothing line is the original SUV as it was used,
      // before and after the switch alike.
      expect(withCar.baselineKg - home.baselineKg).toBeCloseTo(gasShareKg, 1)
      const saved = withCar.saved.reduce((s, p) => s + p.kg, 0)
      expect(saved).toBeCloseTo(withCar.baselineKg - withCar.actualKg, 3)
    }
  })

  it('takes a replaced car off the road when its replacement starts, even if its saved end is later', () => {
    const stale: Timeline = {
      ...SAMPLE_TIMELINE,
      vehicles: [
        { id: 'old', label: 'Gas wagon', fuel: 'gasoline', efficiency: 8.5, annualKm: 15000, people: 1, start: '2015-06', end: '2026-10' },
        { id: 'new', label: 'Second car', fuel: 'gasoline', efficiency: 7, annualKm: 15000, people: 1, start: '2025-01', replaces: 'old' },
      ],
    }
    const res = computeTimeline(stale, NOW)
    const y2024 = res.years.find((y) => y.year === 2024)!
    const y2025 = res.years.find((y) => y.year === 2025)!
    // Only one car on the road in 2025, so the do-nothing line doesn't jump
    expect(y2025.baselineKg).toBeCloseTo(y2024.baselineKg, -2)
    expect(y2025.parts.filter((p) => p.key.startsWith('vehicle-'))).toHaveLength(1)
  })

  it('handles an empty timeline', () => {
    const empty = computeTimeline({ version: 1, residences: [], changes: [], vehicles: [], updatedAt: '' }, NOW)
    expect(empty.years).toEqual([])
  })
})
