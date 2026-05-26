'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import SolarCard from './SolarCard'
import Disclaimer from '@/components/Disclaimer'
import LeadCaptureForm from '@/components/LeadCaptureForm'

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
        <div className="border border-zinc-800 bg-zinc-900 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-300">Pre-filled from HomeIQ</p>
            <p className="font-mono text-[10px] text-zinc-400 mt-0.5 truncate">
              {[homeiqData.inputs?.city, homeiqData.inputs?.province].filter(Boolean).join(', ')}
              {homeiqData.inputs?.houseType ? ` · ${homeiqData.inputs.houseType}` : ''}
              {homeiqData.inputs?.floorArea ? ` · ${homeiqData.inputs.floorArea} m²` : ''}
            </p>
          </div>
          <Link
            href="/calculator"
            className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-emerald-400 hover:underline whitespace-nowrap"
          >
            Update →
          </Link>
        </div>
      )}

      {/* Main solar card — no detailHref here (we're already on the detail page) */}
      <SolarCard homeiqData={homeiqData} evData={evData} />

      {/* Lead capture — only for non-apartment house types */}
      {homeiqData?.inputs?.houseType !== 'apartment' && (
        <LeadCaptureForm
          interest="solar"
          prefill={{
            province: homeiqData?.inputs?.province ?? null,
            city:     homeiqData?.inputs?.city     ?? null,
            houseType: homeiqData?.inputs?.houseType ?? null,
          }}
          context={{
            floorArea: homeiqData?.inputs?.floorArea ?? null,
            storeys:   homeiqData?.inputs?.storeys   ?? null,
            source:    'solar_calculator',
          }}
        />
      )}

      {/* Disclaimer */}
      <Disclaimer context="solar" />

      {/* Plan CTA */}
      <div className="border border-zinc-800 bg-zinc-900 p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-300">See solar alongside your full action plan</p>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
            Compare solar against insulation, heat pumps, and an EV switch — all ranked by payback or
            CO₂ impact. Your solar estimate is already reflected in the plan.
          </p>
        </div>
        <Link
          href="/plan"
          className="shrink-0 font-mono text-[10px] uppercase tracking-widest border border-emerald-400/40 text-emerald-400 px-4 py-2.5 hover:bg-emerald-400/10 transition-colors whitespace-nowrap"
        >
          View plan →
        </Link>
      </div>

    </div>
  )
}
