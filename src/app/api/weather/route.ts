import { NextRequest, NextResponse } from 'next/server'

// Server-side proxy → keeps API key out of the browser and avoids CORS
const UPSTREAM = process.env.WEATHER_PROXY_URL
  ?? 'https://phillyt--a73fa35227f911f185f142dde27851f2.web.val.run'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) {
    return NextResponse.json({ error: 'Missing query param: q' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${UPSTREAM}/?q=${encodeURIComponent(q)}`, {
      next: { revalidate: 0 },
    })
    const data = await upstream.json()
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/weather]', err)
    return NextResponse.json(
      { error: 'Weather service unavailable. Check WEATHER_PROXY_URL env var.' },
      { status: 502 },
    )
  }
}
