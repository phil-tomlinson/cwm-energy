'use client'
import { useState } from 'react'
import Link from 'next/link'
import EnergyCostCalculator from '@/homeiq/energyCost/EnergyCostCalculator'
import { saveEnergyRate } from '@/data/energyRates'

export default function EnergyCostPage() {
  const [saved, setSaved] = useState<string | null>(null)

  function handleApply({ fuelType, ratePerGJ, fixedMonthly }: { fuelType: string; ratePerGJ: number; fixedMonthly: number }) {
    saveEnergyRate(fuelType, { ratePerGJ, fixedMonthly })
    setSaved(fuelType)
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      {/* Header bar */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono mb-0.5">Module 04</p>
          <h1 className="text-lg font-black tracking-tight text-zinc-100">What's Your Actual Energy Cost?</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8">
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Your utility bill mixes a <strong className="text-zinc-300">fixed service charge</strong> with a{' '}
            <strong className="text-zinc-300">per-unit energy rate</strong>, plus taxes and riders. Enter a few
            bills and we'll work out your true cost per GJ — the number that actually determines how much an
            efficiency upgrade saves you.
          </p>

          <EnergyCostCalculator onApply={handleApply} />

          {saved && (
            <div className="mt-5 border border-emerald-400/30 bg-emerald-400/5 p-4 flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <div>
                <p className="text-sm text-zinc-200 font-medium">Saved — your rates will be used in future estimates.</p>
                <p className="text-xs text-zinc-400 mt-1">
                  <Link href="/calculator" className="text-emerald-400 hover:underline">Run the home analysis</Link>
                  {' '}or{' '}
                  <Link href="/plan" className="text-emerald-400 hover:underline">view your plan</Link>
                  {' '}to see them applied.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
