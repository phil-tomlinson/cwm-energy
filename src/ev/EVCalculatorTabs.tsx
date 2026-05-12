'use client'
import { useState } from 'react'
import EVCalculator from './EVCalculator'
import EVCompare    from './EVCompare'

export default function EVCalculatorTabs() {
  const [mode, setMode] = useState<'case-study' | 'compare'>('case-study')

  return (
    <>
      {/* Mode toggle */}
      <div className="flex border-b border-zinc-800 mb-8 -mx-6 sm:-mx-8 px-6 sm:px-8">
        {([
          { id: 'case-study', label: 'Case Study',            sub: 'Ioniq 5 · Mach-E · RAV4 · RAV4 Hybrid' },
          { id: 'compare',    label: 'Compare Your Vehicles', sub: 'Any two vehicles from the NRCan database' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex flex-col items-start py-4 pr-8 border-b-2 transition-colors ${
              mode === tab.id
                ? 'border-emerald-400 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-sm font-bold tracking-tight">{tab.label}</span>
            <span className="text-[10px] font-mono text-zinc-600 mt-0.5">{tab.sub}</span>
          </button>
        ))}
      </div>

      {mode === 'case-study' ? <EVCalculator /> : <EVCompare />}
    </>
  )
}
