import type { Province } from '@/lib/factors'

/** A calendar month, written 'YYYY-MM'. */
export type YearMonth = string

export type HouseType = 'detached' | 'semi' | 'townhouse' | 'apartment'
export type Era = 'pre1946' | '1946_1979' | '1980_1999' | '2000_2011' | '2012plus'
export type BasementType =
  | 'full_heated' | 'full_unheated' | 'partial' | 'crawlspace' | 'slab' | 'none'

/** Where you lived, and how the home was when you moved in. */
export interface Residence {
  id: string
  province: Province
  city: string
  houseType: HouseType
  era: Era
  floorAreaM2: number
  storeys: number
  basementType: BasementType
  occupants: number
  /** Id from HEATING_SYSTEMS (src/data/energyPrices.js) at move-in */
  heatingSystemId: string
  /** Value from waterHeaterTypes (src/calculations/waterHeater.js) at move-in */
  waterHeaterType: string
  start: YearMonth
  end?: YearMonth
}

export type EnvelopeUpgrade = 'attic' | 'walls' | 'windows' | 'airSealing'

/** A dated change you made to a home. Changes are what earn impact. */
export type HomeChange =
  | { id: string; kind: 'solar'; residenceId: string; date: YearMonth; kW: number; orientation: string }
  | { id: string; kind: 'heating'; residenceId: string; date: YearMonth; heatingSystemId: string }
  | { id: string; kind: 'waterHeater'; residenceId: string; date: YearMonth; waterHeaterType: string }
  | { id: string; kind: EnvelopeUpgrade; residenceId: string; date: YearMonth }

export type VehicleFuel = 'gasoline' | 'diesel' | 'hybrid' | 'ev'

export interface Vehicle {
  id: string
  label: string
  fuel: VehicleFuel
  /** L/100 km, or kWh/100 km for an EV */
  efficiency: number
  annualKm: number
  /** People the car's emissions are split between (carpools, shared family car) */
  people: number
  start: YearMonth
  end?: YearMonth
  /** The vehicle this one replaced. A replacement counts as an action. */
  replaces?: string
}

export interface Timeline {
  version: 1
  residences: Residence[]
  changes: HomeChange[]
  vehicles: Vehicle[]
  updatedAt: string
}

export type Grade = 'easy' | 'medium' | 'hard'

export interface ActionImpact {
  id: string
  label: string
  /** One or two words for chart markers */
  short: string
  date: YearMonth
  grade: Grade
  /** Your share, from the action's date to today */
  kgToDate: number
  dollarsToDate: number
  /** Your share, at today's rate */
  kgPerYearNow: number
  dollarsPerYearNow: number
}

export interface YearPoint {
  year: number
  /** Your share, kg CO2e */
  actualKg: number
  /** If you had changed nothing since each home's move-in or each original vehicle */
  baselineKg: number
  /** Includes months still to come this year, at your current rate */
  projected: boolean
  /** No year-specific grid factor loaded for this year */
  gridHeld: boolean
}

export interface TimelineResult {
  years: YearPoint[]
  actions: ActionImpact[]
  totals: { kgToDate: number; dollarsToDate: number; kgPerYearNow: number; dollarsPerYearNow: number }
  firstYear: number
  currentYear: number
  target2030Kg: number
}
