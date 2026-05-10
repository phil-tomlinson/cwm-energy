import { NextRequest, NextResponse } from 'next/server'

// ── NRCan fuel consumption ratings proxy ──────────────────────────────────
// Data: https://open.canada.ca/data/en/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64
// Three CSV files cover the full vehicle catalogue:

const URL_BEV = 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/026e45b4-eb63-451f-b34f-d9308ea3a3d9/download/my2012-2026-battery-electric-vehicles.csv'

const URL_PHEV = 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/8812228b-a6aa-4303-b3d0-66489225120d/download/my2012-2026-plug-in-hybrid-electric-vehicles.csv'

// Conventional (ICE + non-plug-in hybrids) split across three files
const URL_CONV_15_24 = 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/c98b9dc8-b23f-4cd8-8b19-e892da1e4688/download/my2015-2024-fuel-consumption-ratings.csv'
const URL_CONV_25    = 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/d589f2bc-9a85-4f65-be2f-20f17debfcb1/download/my2025-fuel-consumption-ratings.csv'
const URL_CONV_26    = 'https://open.canada.ca/data/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64/resource/9df1b18d-d036-4783-a61c-99f1f75b3ac5/download/my2026-fuel-consumption-ratings.csv'

// ── Types ─────────────────────────────────────────────────────────────────
export type NrcanVehicle = {
  year:         number
  make:         string
  model:        string
  vehicleClass: string
  type:         'ev' | 'phev' | 'ice'
  transmission: string
  effKwh100km:  number | null  // BEV / PHEV electric mode
  fuelL100km:   number | null  // ICE / PHEV gas mode
  evRangeKm:    number | null  // BEV electric range; PHEV electric range
  co2gkm:       number | null
}

// ── CSV parser ────────────────────────────────────────────────────────────
// NRCan CSVs don't embed commas in values, so a plain split is safe.
function parseCsv(text: string): Record<string, string>[] {
  const clean = text
    .replace(/^﻿/, '')    // strip UTF-8 BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = clean.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    const vals: string[] = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim() })
    return row
  }).filter(r => r['Model year'] && r['Make'])
}

// PHEV "Combined Le/100 km" field looks like: "2.5 (22.3 kWh/100 km)"
// Extract the kWh/100km value from inside the parens.
function parsePhevKwh(s: string): number | null {
  const m = s.match(/\(([0-9.]+)\s*kWh/)
  return m ? parseFloat(m[1]) : null
}

function num(s: string | undefined): number | null {
  const n = parseFloat(s ?? '')
  return isNaN(n) || n === 0 ? null : n
}

// ── Module-level cache ────────────────────────────────────────────────────
// Survives across requests within the same serverless instance.
// Next.js fetch cache (revalidate: 86400) handles cross-instance staleness.
let _cache: NrcanVehicle[] | null   = null
let _cacheExpiry = 0

async function getAllVehicles(): Promise<NrcanVehicle[]> {
  if (_cache && Date.now() < _cacheExpiry) return _cache

  const fetchOpts = { next: { revalidate: 86400 } } as const

  const [bevText, phevText, conv1524Text, conv25Text, conv26Text] = await Promise.all([
    fetch(URL_BEV,        fetchOpts).then(r => r.text()),
    fetch(URL_PHEV,       fetchOpts).then(r => r.text()),
    fetch(URL_CONV_15_24, fetchOpts).then(r => r.text()),
    fetch(URL_CONV_25,    fetchOpts).then(r => r.text()),
    fetch(URL_CONV_26,    fetchOpts).then(r => r.text()),
  ])

  // BEV rows
  // Confirmed columns: Model year, Make, Model, Vehicle class, Motor (kW),
  //   Transmission, Fuel type, City/Hwy/Combined (kWh/100 km),
  //   City/Hwy/Combined (Le/100 km), Range (km), CO2 emissions (g/km), …
  const bevRows: NrcanVehicle[] = parseCsv(bevText).map(r => ({
    year:         parseInt(r['Model year'] ?? '0'),
    make:         r['Make'] ?? '',
    model:        r['Model'] ?? '',
    vehicleClass: r['Vehicle class'] ?? '',
    type:         'ev',
    transmission: r['Transmission'] ?? '',
    effKwh100km:  num(r['Combined (kWh/100 km)']),
    fuelL100km:   null,
    evRangeKm:    num(r['Range (km)']),
    co2gkm:       num(r['CO2 emissions (g/km)']),
  }))

  // PHEV rows
  // Confirmed columns: Model year, Make, Model, Vehicle class, Motor (kW),
  //   Engine size (L), Cylinders, Transmission, Fuel type 1,
  //   Combined Le/100 km  ← format: "2.5 (22.3 kWh/100 km)",
  //   Range 1 (km), Recharge time (h), Fuel type 2,
  //   City/Hwy/Combined (L/100 km) ← gas mode, Range 2 (km), CO2 emissions (g/km), …
  const phevRows: NrcanVehicle[] = parseCsv(phevText).map(r => ({
    year:         parseInt(r['Model year'] ?? '0'),
    make:         r['Make'] ?? '',
    model:        r['Model'] ?? '',
    vehicleClass: r['Vehicle class'] ?? '',
    type:         'phev',
    transmission: r['Transmission'] ?? '',
    effKwh100km:  parsePhevKwh(r['Combined Le/100 km'] ?? ''),
    fuelL100km:   num(r['Combined (L/100 km)']),
    evRangeKm:    num(r['Range 1 (km)']),
    co2gkm:       num(r['CO2 emissions (g/km)']),
  }))

  // Conventional rows (ICE + non-plug-in hybrids)
  // Confirmed columns: Model year, Make, Model, Vehicle class, Engine size (L),
  //   Cylinders, Transmission, Fuel type, City/Hwy/Combined (L/100 km),
  //   Combined (mpg), CO2 emissions (g/km), …
  const convRows: NrcanVehicle[] = [
    ...parseCsv(conv1524Text),
    ...parseCsv(conv25Text),
    ...parseCsv(conv26Text),
  ].map(r => ({
    year:         parseInt(r['Model year'] ?? '0'),
    make:         r['Make'] ?? '',
    model:        r['Model'] ?? '',
    vehicleClass: r['Vehicle class'] ?? '',
    type:         'ice',
    transmission: r['Transmission'] ?? '',
    effKwh100km:  null,
    fuelL100km:   num(r['Combined (L/100 km)']),
    evRangeKm:    null,
    co2gkm:       num(r['CO2 emissions (g/km)']),
  }))

  const all = [...bevRows, ...phevRows, ...convRows].filter(v => v.year > 0 && v.make)

  _cache       = all
  _cacheExpiry = Date.now() + 24 * 60 * 60 * 1000
  return all
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const action = sp.get('action') ?? ''

  try {
    const all = await getAllVehicles()

    // ── List of unique makes for a model year ─────────────────────────────
    if (action === 'makes') {
      const year  = parseInt(sp.get('year') ?? '0')
      if (!year) return NextResponse.json({ error: 'Missing year' }, { status: 400 })
      const makes = [...new Set(all.filter(v => v.year === year).map(v => v.make))].sort()
      return NextResponse.json(makes)
    }

    // ── List of unique models for a year + make ───────────────────────────
    if (action === 'models') {
      const year = parseInt(sp.get('year') ?? '0')
      const make = sp.get('make') ?? ''
      if (!year || !make) return NextResponse.json({ error: 'Missing year or make' }, { status: 400 })
      const models = [
        ...new Set(all.filter(v => v.year === year && v.make === make).map(v => v.model)),
      ].sort()
      return NextResponse.json(models)
    }

    // ── All variants for a specific year + make + model ───────────────────
    // Returns full NrcanVehicle objects so the client can display and select.
    if (action === 'vehicles') {
      const year  = parseInt(sp.get('year') ?? '0')
      const make  = sp.get('make') ?? ''
      const model = sp.get('model') ?? ''
      if (!year || !make || !model) {
        return NextResponse.json({ error: 'Missing year, make, or model' }, { status: 400 })
      }
      const vehicles = all.filter(v => v.year === year && v.make === make && v.model === model)
      return NextResponse.json(vehicles)
    }

    return NextResponse.json(
      { error: 'Unknown action. Use: makes | models | vehicles' },
      { status: 400 },
    )

  } catch (err) {
    console.error('[/api/nrcan]', err)
    return NextResponse.json(
      { error: 'NRCan data service unavailable. Try again shortly.' },
      { status: 502 },
    )
  }
}
