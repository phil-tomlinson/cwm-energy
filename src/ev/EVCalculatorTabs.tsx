'use client'
import { useState } from 'react'
import EVCalculator from './EVCalculator'
import EVCompare    from './EVCompare'

const TABS = [
  {
    id:    'case-study' as const,
    label: 'Case Study',
    sub:   'Pre-loaded: Ioniq 5 · Mach-E · CR-V · RAV4 Hybrid Limited',
    desc:  'Explore curated EV vs. gas comparisons with real Canadian cost data.',
  },
  {
    id:    'compare' as const,
    label: 'Compare Your Vehicles',
    sub:   'Any two vehicles from the NRCan database',
    desc:  'Pick any make/model and compare TCO, emissions, and payback on your own grid.',
  },
]

export default function EVCalculatorTabs() {
  const [mode, setMode] = useState<'case-study' | 'compare'>('case-study')

  return (
    <>
      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="-mx-6 sm:-mx-8 mb-8">

        {/* "Choose a mode" label */}
        <div className="px-6 sm:px-8 mb-0">
          <p className="tabular-nums text-[13px] text-scree mb-2">
            Select a tool
          </p>
        </div>

        {/* Tab strip */}
        <div className="flex border-y border-hairline bg-snowfield-raised">
          {TABS.map((tab, i) => {
            const active = mode === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`
                  relative flex-1 flex flex-col items-start px-6 sm:px-8 py-4
                  border-r border-hairline last:border-r-0
                  transition-colors duration-150
                  ${active
                    ? 'bg-snowfield text-basalt'
                    : 'bg-snowfield-raised text-scree hover:bg-snowfield hover:text-basalt'}
                `}
              >
                {/* Top accent bar — only on active */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 transition-colors ${active ? 'bg-glacier' : 'bg-transparent'}`} />

                <div className="flex items-center gap-2 mt-1">
                  {/* Active dot */}
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${active ? 'bg-glacier' : 'bg-hairline'}`} />
                  <span className="text-sm font-bold tracking-tight leading-tight">{tab.label}</span>
                </div>

                <p className={`text-[13px] tabular-nums mt-1.5 ml-3.5 leading-relaxed ${active ? 'text-scree' : 'text-scree'}`}>
                  {tab.sub}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {mode === 'case-study' ? <EVCalculator /> : <EVCompare />}
    </>
  )
}
