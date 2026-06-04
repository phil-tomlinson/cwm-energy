'use client'
import { useState } from 'react'
import Link from 'next/link'
import DiveDeeper from '@/components/DiveDeeper'

const CATEGORY_LABELS = {
  envelope:   'Building envelope',
  heating:    'Heating system',
  water:      'Water heating',
  generation: 'Solar generation',
}

const CATEGORY_COLORS = {
  envelope:   'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
  heating:    'bg-orange-400/10 text-orange-400 border border-orange-400/20',
  water:      'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  generation: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
}

const HEATING_IDS = new Set(['furnaceUpgrade', 'heatPump'])

const HEATING_BEST_FOR = {
  furnaceUpgrade: 'Lower bills',
  heatPump:       'Lower carbon',
}

function RecCard({ rec, rank, onMarkDone, isDone, onAddToPlan, isInPlan, highlight }) {
  return (
    <div className={`border p-5 transition-colors ${
      isDone
        ? 'border-zinc-700 bg-zinc-900/60 opacity-60'
        : highlight
          ? 'bg-zinc-800 border-emerald-400/40 hover:border-emerald-400/60'
          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {rank != null && (
              <span className="w-6 h-6 bg-emerald-400 text-zinc-950 text-xs flex items-center justify-center font-black flex-shrink-0">
                {rank}
              </span>
            )}
            {isDone && (
              <span className="w-6 h-6 bg-zinc-600 text-zinc-300 text-xs flex items-center justify-center font-black flex-shrink-0">
                ✓
              </span>
            )}
            <h3 className="font-bold text-zinc-100 text-sm">{rec.title}</h3>
          </div>

          <span className={`inline-block text-[10px] px-2 py-0.5 font-mono uppercase tracking-wide mb-2 ${CATEGORY_COLORS[rec.category]}`}>
            {CATEGORY_LABELS[rec.category]}
          </span>

          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{rec.description}</p>

          <DiveDeeper label="Technical details">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono">
              <span><span className="text-zinc-400">From:</span> {rec.currentValue}</span>
              <span><span className="text-zinc-400">To:</span> {rec.targetValue}</span>
            </div>
          </DiveDeeper>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-black text-emerald-400 font-mono">${Math.round(rec.annualSavingsCAD).toLocaleString()}</p>
          <p className="text-xs text-zinc-400">saved/year</p>
          <div className="mt-2 px-3 py-1.5 bg-zinc-700 border border-zinc-600 text-center">
            <p className="text-sm font-bold text-zinc-200 font-mono">
              {rec.paybackYears < 100 ? `${rec.paybackYears.toFixed(1)} yr` : 'Long'}
            </p>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">payback</p>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">~${Math.round(rec.estimatedCostCAD).toLocaleString()} installed</p>
          {rec.co2SavedTonnes > 0.01 && (
            <p className="text-xs text-zinc-500 mt-1 font-mono">{rec.co2SavedTonnes.toFixed(1)} t CO₂/yr</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-700 flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => onMarkDone(rec.id)}
          className="text-xs font-mono uppercase tracking-wide transition-colors px-3 py-1.5 border border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-300"
        >
          {isDone ? '↩ Restore to list' : '✓ Already done'}
        </button>

        {onAddToPlan && !isDone && (
          isInPlan ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400">✓ Added</span>
              <Link
                href="/plan"
                className="text-xs font-mono uppercase tracking-wide border border-emerald-400/50 text-emerald-400 px-3 py-1.5 hover:bg-emerald-400/10 transition-colors whitespace-nowrap"
              >
                View plan →
              </Link>
            </div>
          ) : (
            <button
              onClick={() => onAddToPlan(rec.id)}
              className="text-xs font-mono uppercase tracking-wide transition-colors px-3 py-1.5 border border-zinc-600 text-zinc-300 hover:border-emerald-400 hover:text-emerald-400"
            >
              + Add to my plan
            </button>
          )
        )}
      </div>
    </div>
  )
}

function HeatingComparisonGroup({ heatingRecs, priority, planSelected, onAddToPlan, onMarkDone, doneIds }) {
  const sorted = [...heatingRecs].sort((a, b) =>
    priority === 'bills'
      ? a.paybackYears - b.paybackYears
      : b.co2SavedTonnes - a.co2SavedTonnes
  )

  return (
    <div className="border border-zinc-700">
      <div className="bg-zinc-900 border-b border-zinc-700 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-orange-400">
          Heating system — choose one
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">
          {priority === 'bills' ? 'Sorted by shortest payback' : 'Sorted by most carbon saved'}
        </span>
      </div>
      <div>
        {sorted.map((rec, i) => {
          const bestFor = HEATING_BEST_FOR[rec.id]
          const isTop   = i === 0
          return (
            <div key={rec.id} className={i > 0 ? 'border-t border-zinc-700/60' : ''}>
              {bestFor && (
                <div className={`px-4 py-1.5 border-l-2 ${
                  isTop ? 'border-l-emerald-400 bg-emerald-400/5' : 'border-l-zinc-700 bg-zinc-900/40'
                }`}>
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${
                    isTop ? 'text-emerald-400' : 'text-zinc-500'
                  }`}>
                    {isTop ? '▲ Best for: ' : 'Also: '}{bestFor}
                  </span>
                </div>
              )}
              <RecCard
                rec={rec}
                rank={null}
                onMarkDone={onMarkDone}
                isDone={doneIds.includes(rec.id)}
                onAddToPlan={onAddToPlan}
                isInPlan={planSelected.includes(rec.id)}
                highlight={isTop}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function RecommendationsList({
  recommendations,
  doneRecs = [],
  onToggleDone,
  mode,
  priority = 'bills',
  planSelected = [],
  onAddToPlan,
}) {
  const [showDone, setShowDone] = useState(false)

  if (!recommendations.length && !doneRecs.length) {
    return mode === 'simple'
      ? (
        <p className="text-zinc-400 text-sm leading-relaxed">
          Nothing stands out with era-typical defaults — but that doesn't mean there's nothing to find.
          Try <span className="text-zinc-300 font-medium">Refined mode</span> to enter your actual insulation values and get specific, personalised recommendations.
        </p>
      )
      : <p className="text-zinc-400 text-sm">No additional recommendations — your home is already well-optimised!</p>
  }

  const doneIds = doneRecs.map(r => r.id)

  // Separate heating pair from other recs
  const heatingRecs = recommendations.filter(r => HEATING_IDS.has(r.id))
  const otherRecs   = recommendations.filter(r => !HEATING_IDS.has(r.id))

  // Recs to show in the ranked list (includes single heating rec if no comparison group)
  const listedRecs = heatingRecs.length === 2 ? otherRecs : [...heatingRecs, ...otherRecs]
  const sortedRecs = [...listedRecs].sort((a, b) =>
    priority === 'bills'
      ? a.paybackYears - b.paybackYears
      : b.co2SavedTonnes - a.co2SavedTonnes
  )

  return (
    <div>
      {/* Heating comparison group — shown at top when both options exist */}
      {heatingRecs.length === 2 && (
        <div className="mb-3">
          <HeatingComparisonGroup
            heatingRecs={heatingRecs}
            priority={priority}
            planSelected={planSelected}
            onAddToPlan={onAddToPlan}
            onMarkDone={onToggleDone}
            doneIds={doneIds}
          />
        </div>
      )}

      {/* All other recommendations */}
      {sortedRecs.length > 0 && (
        <div className="space-y-3">
          {sortedRecs.map((rec, i) => (
            <RecCard
              key={rec.id}
              rec={rec}
              rank={i + 1}
              onMarkDone={onToggleDone}
              isDone={false}
              onAddToPlan={onAddToPlan}
              isInPlan={planSelected.includes(rec.id)}
              highlight={false}
            />
          ))}
        </div>
      )}

      {/* Completed section */}
      {doneRecs.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition-colors mb-3"
          >
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className={`shrink-0 transition-transform duration-150 ${showDone ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Already completed ({doneRecs.length})
          </button>

          {showDone && (
            <div className="space-y-3 border-l-2 border-zinc-700 pl-4">
              {doneRecs.map(rec => (
                <RecCard
                  key={rec.id}
                  rec={rec}
                  rank={null}
                  onMarkDone={onToggleDone}
                  isDone={true}
                  onAddToPlan={null}
                  isInPlan={false}
                  highlight={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
