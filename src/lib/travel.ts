// ── Trips: flights, train, bus and ferry ─────────────────────────────────────
// Each trip is your own seat, so nothing is split between travellers. Road trips
// in your own car are already in that car's yearly distance.

import type { Trip, Cabin } from '@/lib/timeline/types'

// Flights, kg CO2e per passenger-km, direct (combustion) emissions.
// Source: UK DESNZ greenhouse gas conversion factors 2025, business travel (air);
// unchanged in the 2026 set. "With RF" adds the extra warming from contrails and
// nitrogen oxides at altitude, about 1.7 times the CO2 effect.
export const FLIGHT_SOURCE = 'UK DESNZ greenhouse gas conversion factors 2025 (unchanged in 2026)'
export const FLIGHT_SOURCE_URL = 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025'

type Band = 'domestic' | 'short' | 'long'

const FLIGHT: Record<Band, { withoutRF: number; withRF: number; label: string }> = {
  // DESNZ's domestic factor is for short hops in small planes: we use it under 500 km.
  domestic: { withoutRF: 0.13552, withRF: 0.22928, label: 'short hop' },
  // Short-haul and long-haul, economy.
  short:    { withoutRF: 0.07435, withRF: 0.12576, label: 'short-haul' },
  long:     { withoutRF: 0.06926, withRF: 0.11704, label: 'long-haul' },
}

// Bigger seats carry a bigger share of the plane. Ratios from DESNZ 2025 class factors.
const CABIN: Record<Exclude<Band, 'domestic'>, Record<Cabin, number>> = {
  short: { economy: 1, premium: 1, business: 1.5, first: 1.5 },
  long:  { economy: 1, premium: 1.6, business: 2.9, first: 4.0 },
}

// DESNZ adds 8% to the straight-line distance for routing and holding.
export const DISTANCE_UPLIFT = 1.08

export function flightBand(km: number): Band {
  if (km < 500) return 'domestic'
  if (km <= 3700) return 'short'
  return 'long'
}

// Ground and water, kg CO2e per passenger-km.
export const GROUND: Record<'rail' | 'bus' | 'ferry', { factor: number; label: string; source: string; url: string }> = {
  rail:  { factor: 0.093,   label: 'Train',                   source: 'Railway Association of Canada, Locomotive Emissions Monitoring report 2024 (intercity passenger rail, 2022)', url: 'https://www.railcan.ca/' },
  bus:   { factor: 0.03948, label: 'Intercity bus or coach',  source: 'UK DESNZ conversion factors 2026, coach', url: FLIGHT_SOURCE_URL },
  ferry: { factor: 0.01871, label: 'Ferry, on foot',          source: 'UK DESNZ conversion factors 2026, ferry foot passenger', url: FLIGHT_SOURCE_URL },
}

export interface TripKg {
  /** CO2 and other gases from burning the fuel */
  kg: number
  /** Flights only: extra warming at altitude */
  extraKg: number
  /** Distance travelled, both ways if a return trip */
  km: number
}

export function tripKg(t: Pick<Trip, 'mode' | 'km' | 'roundTrip' | 'cabin'>): TripKg {
  const legs = t.roundTrip ? 2 : 1
  if (t.mode === 'flight') {
    const band = flightBand(t.km)
    const f = FLIGHT[band]
    const cabin = band === 'domestic' ? 1 : CABIN[band][t.cabin ?? 'economy']
    const km = t.km * DISTANCE_UPLIFT * legs
    return { kg: km * f.withoutRF * cabin, extraKg: km * (f.withRF - f.withoutRF) * cabin, km }
  }
  const km = t.km * legs
  return { kg: km * GROUND[t.mode].factor, extraKg: 0, km }
}

/** Great-circle distance in km. */
export function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

export const MODE_LABELS: Record<Trip['mode'], string> = {
  flight: 'Flight',
  rail: GROUND.rail.label,
  bus: GROUND.bus.label,
  ferry: GROUND.ferry.label,
}

export const CABIN_LABELS: Record<Cabin, string> = {
  economy: 'Economy',
  premium: 'Premium economy',
  business: 'Business',
  first: 'First',
}
