'use client'
import PageHeader from "@/components/cwm/PageHeader"
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
    <div className="min-h-screen">
      <PageHeader width="max-w-2xl" title="What does your energy really cost?" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
        <div className="bg-snowfield-raised border border-hairline rounded-[10px] p-4 sm:p-8">
          <p className="text-sm text-scree leading-relaxed mb-6">
            Your utility bill mixes a <strong className="text-basalt">fixed service charge</strong> with a{' '}
            <strong className="text-basalt">per-unit energy rate</strong>, plus taxes and riders. Enter a few
            bills and we'll work out your true cost per GJ — the number that actually determines how much an
            efficiency upgrade saves you.
          </p>

          <EnergyCostCalculator onApply={handleApply} />

          {saved && (
            <div className="mt-5 rounded-[10px] border border-glacier bg-glacier/5 p-4 flex items-start gap-3">
              <span className="text-glacier mt-0.5">✓</span>
              <div>
                <p className="text-sm text-basalt font-medium">Saved. Your rates will be used in future estimates.</p>
                <p className="text-[13px] text-scree mt-1">
                  <Link href="/calculator" className="text-glacier hover:underline">Run the home analysis</Link>
                  {' '}or{' '}
                  <Link href="/plan" className="text-glacier hover:underline">view your plan</Link>
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
