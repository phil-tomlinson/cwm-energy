'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import SolarCard from './SolarCard'
import Disclaimer from '@/components/Disclaimer'

// ── Standalone solar calculator ────────────────────────────────────────────
// Reads HomeIQ + EV data from localStorage (same keys used by plan/page.tsx),
// renders SolarCard in full-page context, and adds a back-link to the Plan page.

export default function SolarCalculator() {
  const [homeiqData, setHomeiqData] = useState(null)
  const [evData,     setEvData]     = useState(null)
  const [loaded,     setLoaded]     = useState(false)

  useEffect(() => {
    try { const h = localStorage.getItem('cwm_homeiq'); if (h) setHomeiqData(JSON.parse(h)) } catch {}
    try { const e = localStorage.getItem('cwm_ev');     if (e) setEvData(JSON.parse(e))     } catch {}
    setLoaded(true)
  }, [])

  // Suppress render until localStorage is read to avoid a hydration flash
  if (!loaded) return null

  return (
    <div className="space-y-6">

      {/* HomeIQ context banner */}
      {homeiqData && (
        <div className="border border-hairline bg-snowfield-raised p-4 flex items-center justify-between gap-4 rounded-[10px]">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-basalt">Pre-filled from HomeIQ</p>
            <p className="tabular-nums text-[13px] text-scree mt-0.5 truncate">
              {[homeiqData.inputs?.city, homeiqData.inputs?.province].filter(Boolean).join(', ')}
              {homeiqData.inputs?.houseType ? ` · ${homeiqData.inputs.houseType}` : ''}
              {homeiqData.inputs?.floorArea ? ` · ${homeiqData.inputs.floorArea} m²` : ''}
            </p>
          </div>
          <Link
            href="/calculator"
            className="shrink-0 tabular-nums text-[13px] text-glacier hover:underline whitespace-nowrap"
          >
            Update
          </Link>
        </div>
      )}

      {/* Main solar card — no detailHref here (we're already on the detail page) */}
      <SolarCard homeiqData={homeiqData} evData={evData} />

      {/* Disclaimer */}
      <Disclaimer context="solar" />

      {/* Plan CTA */}
      <div className="border border-hairline bg-snowfield-raised p-5 flex items-center justify-between gap-4 rounded-[10px]">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-basalt">See solar alongside your full action plan</p>
          <p className="text-[13px] text-scree mt-0.5 leading-relaxed">
            Compare solar against insulation, heat pumps, and an EV switch — all ranked by payback or
            CO₂ impact. Your solar estimate is already reflected in the plan.
          </p>
        </div>
        <Link
          href="/plan"
          className="shrink-0 tabular-nums text-[13px] border border-glacier text-glacier px-4 py-2.5 hover:bg-glacier/10 transition-colors whitespace-nowrap"
        >
          View plan
        </Link>
      </div>

    </div>
  )
}
