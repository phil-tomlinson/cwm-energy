import { NextRequest, NextResponse } from 'next/server'

// Server-side proxy → keeps API key out of the browser and avoids CORS
const UPSTREAM = process.env.CARBON_PROXY_URL
  ?? 'https://phillyt--3b2e313027fc11f18cd442dde27851f2.web.val.run'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lon = req.nextUrl.searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing query params: lat, lon' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${UPSTREAM}/?lat=${lat}&lon=${lon}`, {
      next: { revalidate: 0 },
    })
    const data = await upstream.json()
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/carbon]', err)
    return NextResponse.json(
      { error: 'Carbon intensity service unavailable. Check CARBON_PROXY_URL env var.' },
      { status: 502 },
    )
  }
}
