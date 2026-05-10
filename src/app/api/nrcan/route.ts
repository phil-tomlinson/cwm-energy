import { NextRequest, NextResponse } from 'next/server'
import nrcanData from '@/data/nrcan-vehicles.json'

// ── NRCan fuel consumption ratings — served from bundled static JSON ───────
// Source data: https://open.canada.ca/data/en/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64
// Refresh: npm run update-nrcan  (fetches latest CSVs and rewrites the JSON)
//
// The JSON is committed to the repo so the route works instantly with zero
// cold-start latency and no external network dependency at runtime.

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
  co2gkm?:      number         // omitted when null in the JSON (optional)
}

// Cast the imported JSON to the expected shape
const ALL_VEHICLES = (nrcanData as { meta: unknown; vehicles: NrcanVehicle[] }).vehicles

// ── Route handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const action = sp.get('action') ?? ''

  try {
    // ── List of unique makes for a model year ─────────────────────────────
    if (action === 'makes') {
      const year  = parseInt(sp.get('year') ?? '0')
      if (!year) return NextResponse.json({ error: 'Missing year' }, { status: 400 })
      const makes = [...new Set(ALL_VEHICLES.filter(v => v.year === year).map(v => v.make))].sort()
      return NextResponse.json(makes)
    }

    // ── List of unique models for a year + make ───────────────────────────
    if (action === 'models') {
      const year = parseInt(sp.get('year') ?? '0')
      const make = sp.get('make') ?? ''
      if (!year || !make) return NextResponse.json({ error: 'Missing year or make' }, { status: 400 })
      const models = [
        ...new Set(ALL_VEHICLES.filter(v => v.year === year && v.make === make).map(v => v.model)),
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
      const vehicles = ALL_VEHICLES.filter(
        v => v.year === year && v.make === make && v.model === model
      )
      return NextResponse.json(vehicles)
    }

    // ── Meta — handy for verifying the bundled data is current ────────────
    if (action === 'meta') {
      return NextResponse.json((nrcanData as { meta: unknown }).meta)
    }

    return NextResponse.json(
      { error: 'Unknown action. Use: makes | models | vehicles | meta' },
      { status: 400 },
    )

  } catch (err) {
    console.error('[/api/nrcan]', err)
    return NextResponse.json(
      { error: 'NRCan data unavailable.' },
      { status: 500 },
    )
  }
}
