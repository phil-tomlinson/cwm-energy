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
    expect(r.years[0].year).toBe(2015)
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

  it('handles an empty timeline', () => {
    const empty = computeTimeline({ version: 1, residences: [], changes: [], vehicles: [], updatedAt: '' }, NOW)
    expect(empty.years).toEqual([])
  })
})
