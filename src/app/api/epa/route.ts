import { NextRequest, NextResponse } from 'next/server'

// ── EPA fueleconomy.gov proxy ─────────────────────────────────────────────
// Docs: https://www.fueleconomy.gov/feg/ws/
// Returns JSON parsed from the EPA's XML responses.
const BASE = 'https://www.fueleconomy.gov/ws/rest'

// Parse EPA menu XML: <menuItems><menuItem><text>…</text><value>…</value></menuItem>…</menuItems>
function parseMenu(xml: string): { text: string; value: string }[] {
  const out: { text: string; value: string }[] = []
  for (const m of xml.matchAll(/<menuItem>[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<value>([\s\S]*?)<\/value>[\s\S]*?<\/menuItem>/g)) {
    out.push({ text: m[1].trim(), value: m[2].trim() })
  }
  return out
}

// Extract a single XML tag value
function tag(xml: string, name: string): string {
  return xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1]?.trim() ?? ''
}

// Convert MPGe → kWh/100km  (1 gal ≡ 33.705 kWh; 1 mile = 1.60934 km)
const mpgeToKwh100km = (mpge: number) => +(2094.2 / mpge).toFixed(2)

// Convert MPG → L/100km
const mpgToL100km = (mpg: number) => +(235.215 / mpg).toFixed(2)

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const action = sp.get('action') ?? ''

  try {
    // ── Years ─────────────────────────────────────────────────────────────
    if (action === 'years') {
      const r = await fetch(`${BASE}/vehicle/menu/year`, { next: { revalidate: 86400 } })
      const items = parseMenu(await r.text())
      // Return in reverse chronological order (newest first)
      return NextResponse.json(items.reverse())
    }

    // ── Makes for a year ──────────────────────────────────────────────────
    if (action === 'makes') {
      const year = sp.get('year')
      if (!year) return NextResponse.json({ error: 'Missing year' }, { status: 400 })
      const r = await fetch(`${BASE}/vehicle/menu/make?year=${year}`, { next: { revalidate: 86400 } })
      return NextResponse.json(parseMenu(await r.text()))
    }

    // ── Models for a year + make ──────────────────────────────────────────
    if (action === 'models') {
      const year = sp.get('year')
      const make = sp.get('make')
      if (!year || !make) return NextResponse.json({ error: 'Missing year or make' }, { status: 400 })
      const r = await fetch(
        `${BASE}/vehicle/menu/model?year=${year}&make=${encodeURIComponent(make)}`,
        { next: { revalidate: 86400 } },
      )
      return NextResponse.json(parseMenu(await r.text()))
    }

    // ── Trims (options) for year + make + model ───────────────────────────
    if (action === 'trims') {
      const year  = sp.get('year')
      const make  = sp.get('make')
      const model = sp.get('model')
      if (!year || !make || !model) {
        return NextResponse.json({ error: 'Missing year, make, or model' }, { status: 400 })
      }
      const r = await fetch(
        `${BASE}/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
        { next: { revalidate: 86400 } },
      )
      return NextResponse.json(parseMenu(await r.text()))
    }

    // ── Vehicle specs by ID ───────────────────────────────────────────────
    if (action === 'vehicle') {
      const id = sp.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const r   = await fetch(`${BASE}/vehicle/${id}`, { next: { revalidate: 86400 } })
      const xml = await r.text()
      const g   = (t: string) => tag(xml, t)

      const atvType  = g('atvType')   // 'EV', 'PHEV', 'HEV', 'PHEV', '' for ICE
      const fuelType = g('fuelType1') // 'Electricity', 'Regular Gasoline', etc.
      const comb08   = parseFloat(g('comb08')  || '0')  // combined MPG or MPGe
      const combA08  = parseFloat(g('combA08') || '0')  // alternate combined MPGe (PHEVs on electricity)
      const range    = g('range')     // EV range in miles

      // Determine canonical type and fuel economy in metric units
      let type: 'ev' | 'phev' | 'hybrid' | 'ice'
      let effKwh100km: number | null = null
      let fuelL100km:  number | null = null

      if (atvType === 'EV' || fuelType === 'Electricity') {
        type         = 'ev'
        // comb08 is MPGe for BEVs
        effKwh100km  = comb08  > 0 ? mpgeToKwh100km(comb08)  : null
      } else if (atvType === 'PHEV') {
        type         = 'phev'
        // combA08 is MPGe (electricity mode); comb08 is MPG (gasoline mode)
        effKwh100km  = combA08 > 0 ? mpgeToKwh100km(combA08) : null
        fuelL100km   = comb08  > 0 ? mpgToL100km(comb08)     : null
      } else if (atvType === 'HEV' || atvType === 'Hybrid') {
        type         = 'hybrid'
        fuelL100km   = comb08  > 0 ? mpgToL100km(comb08)     : null
      } else {
        type         = 'ice'
        fuelL100km   = comb08  > 0 ? mpgToL100km(comb08)     : null
      }

      return NextResponse.json({
        id:          g('id'),
        make:        g('make'),
        model:       g('model'),
        year:        g('year'),
        drive:       g('drive'),
        trany:       g('trany'),
        fuelType,
        atvType,
        type,
        comb08,
        combA08,
        effKwh100km, // kWh/100km (EVs/PHEVs) — null for ICE/hybrid
        fuelL100km,  // L/100km (ICE/hybrid/PHEV gas mode) — null for pure EV
        evRangeMiles: range ? parseFloat(range) : null,
        evRangeKm:    range ? +(parseFloat(range) * 1.60934).toFixed(0) : null,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('[/api/epa]', err)
    return NextResponse.json(
      { error: 'EPA fuel economy service unavailable. Try again shortly.' },
      { status: 502 },
    )
  }
}
