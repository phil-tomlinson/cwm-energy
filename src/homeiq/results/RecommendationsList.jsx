'use client'
import { useState } from 'react'
import Link from 'next/link'
import DiveDeeper from '@/components/DiveDeeper'
import { compareRecs, carbonCostPerTonne, isProratable, proratedUpgradeCost, EQUIPMENT_LABEL } from '@/calculations/recommendations'

const CATEGORY_LABELS = {
  envelope:   'Building envelope',
  heating:    'Heating system',
  water:      'Water heating',
  generation: 'Solar generation',
}

const CATEGORY_COLORS = {
  envelope:   'bg-glacier/10 text-glacier border border-glacier',
  heating:    'bg-larch/10 text-basalt border border-larch',
  water:      'bg-glacier/10 text-glacier border border-glacier',
  generation: 'bg-larch/10 text-basalt border border-larch',
}

const HEATING_IDS = new Set(['furnaceUpgrade', 'heatPump'])

const HEATING_BEST_FOR = {
  furnaceUpgrade: 'Lower bills',
  heatPump:       'Lower carbon',
}

const AGE_OPTIONS = [
  { value: 3,  label: '0–5 yrs' },
  { value: 8,  label: '6–10 yrs' },
  { value: 13, label: '11–15 yrs' },
  { value: 18, label: '16–20 yrs' },
  { value: 25, label: '20+ yrs' },
]

function RecCard({ rec, rank, onMarkDone, isDone, onAddToPlan, isInPlan, highlight }) {
  const [age, setAge] = useState(null)
  const prorated = age != null ? proratedUpgradeCost(rec.id, rec.estimatedCostCAD, age) : null
  const proratedPaybackYrs = prorated && rec.annualSavingsCAD > 0
    ? prorated.effectiveCost / rec.annualSavingsCAD
    : null
  return (
    <div className={`border p-5 transition-colors ${
      isDone
        ? 'border-hairline bg-snowfield-raised opacity-60'
        : highlight
          ? 'bg-snowfield border-glacier hover:border-glacier'
          : 'bg-snowfield border-hairline hover:border-hairline'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {rank != null && (
              <span className="w-6 h-6 bg-glacier text-on-glacier text-[13px] flex items-center justify-center font-black flex-shrink-0">
                {rank}
              </span>
            )}
            {isDone && (
              <span className="w-6 h-6 bg-scree text-basalt text-[13px] flex items-center justify-center font-black flex-shrink-0">
                ✓
              </span>
            )}
            <h3 className="font-bold text-basalt text-sm">{rec.title}</h3>
          </div>

          <span className={`inline-block text-[13px] px-2 py-0.5 tabular-nums   mb-2 ${CATEGORY_COLORS[rec.category]}`}>
            {CATEGORY_LABELS[rec.category]}
          </span>

          <p className="text-[13px] text-scree mb-3 leading-relaxed">{rec.description}</p>

          <DiveDeeper label="Technical details">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-scree tabular-nums">
              <span><span className="text-scree">From:</span> {rec.currentValue}</span>
              <span><span className="text-scree">To:</span> {rec.targetValue}</span>
            </div>
          </DiveDeeper>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-black text-glacier tabular-nums">${Math.round(rec.annualSavingsCAD).toLocaleString()}</p>
          <p className="text-[13px] text-scree">saved/year</p>
          <div className="mt-2 px-3 py-1.5 bg-hairline border border-hairline text-center">
            <p className="text-sm font-bold text-basalt tabular-nums">
              {rec.paybackYears < 100 ? `${rec.paybackYears.toFixed(1)} yr` : 'Long'}
            </p>
            <p className="text-[13px] text-scree ">payback</p>
          </div>
          <p className="text-[13px] text-scree mt-1 tabular-nums">~${Math.round(rec.estimatedCostCAD).toLocaleString()} installed</p>
          {rec.co2SavedTonnes > 0.01 && (
            <>
              <p className="text-[13px] text-scree mt-1 tabular-nums">{rec.co2SavedTonnes.toFixed(1)} t CO₂/yr</p>
              <p className="text-[13px] text-scree tabular-nums">${Math.round(carbonCostPerTonne(rec)).toLocaleString()}/t CO₂</p>
            </>
          )}
        </div>
      </div>

      {/* Replace-on-burnout proration for equipment upgrades */}
      {isProratable(rec.id) && !isDone && (
        <div className="mt-4 pt-3 border-t border-hairline">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[13px] text-basalt">How old is your current {EQUIPMENT_LABEL[rec.id]}?</label>
            <select
              value={age ?? ''}
              onChange={e => setAge(e.target.value ? Number(e.target.value) : null)}
              className="bg-snowfield-raised border border-hairline text-basalt text-[13px] tabular-nums px-2 py-1 focus:outline-none focus:ring-1 focus:ring-glacier"
            >
              <option value="">Select age…</option>
              {AGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {prorated && (
            <div className="mt-2 border border-glacier bg-glacier/5 p-3 rounded-[10px]">
              <p className="text-[13px] text-basalt leading-relaxed mb-2">
                A {EQUIPMENT_LABEL[rec.id]} lasts about {prorated.lifespanYears} years, so yours will likely need
                replacing {prorated.remainingYears <= 1 ? 'very soon' : `in roughly ${Math.round(prorated.remainingYears)} years`}.
                Since you'll pay for a replacement either way, the real cost of choosing the efficient option is
                mostly the premium on top of that — not the full sticker price:
              </p>
              <div className="flex items-baseline gap-5">
                <div>
                  <p className="tabular-nums text-lg font-black text-glacier">~${prorated.effectiveCost.toLocaleString()}</p>
                  <p className="text-[13px] text-scree">
                    effective cost{' '}
                    <span className="line-through text-scree">${Math.round(rec.estimatedCostCAD).toLocaleString()}</span>
                  </p>
                </div>
                {proratedPaybackYrs != null && (
                  <div>
                    <p className="tabular-nums text-lg font-black text-basalt">{proratedPaybackYrs.toFixed(1)} yr</p>
                    <p className="text-[13px] text-scree">prorated payback</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => onMarkDone(rec.id)}
          className="text-[13px] tabular-nums transition-colors px-3 py-1.5 border border-hairline text-scree hover:border-hairline hover:text-basalt"
        >
          {isDone ? '↩ Restore to list' : '✓ Already done'}
        </button>

        {onAddToPlan && !isDone && (
          isInPlan ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] tabular-nums text-glacier">✓ Added</span>
              <Link
                href="/plan"
                className="text-[13px] tabular-nums border border-glacier text-glacier px-3 py-1.5 hover:bg-glacier/10 transition-colors whitespace-nowrap"
              >
                View plan
              </Link>
            </div>
          ) : (
            <button
              onClick={() => onAddToPlan(rec.id)}
              className="text-[13px] tabular-nums transition-colors px-3 py-1.5 border border-hairline text-basalt hover:border-glacier hover:text-glacier"
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
  const sorted = [...heatingRecs].sort(compareRecs(priority))

  return (
    <div className="border border-hairline">
      <div className="bg-snowfield-raised border-b border-hairline px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <span className="tabular-nums text-[13px] text-basalt">
          Heating system — choose one
        </span>
        <span className="text-[13px] text-scree tabular-nums">
          {priority === 'bills' ? 'Sorted by shortest payback' : 'Sorted by lowest cost per tonne of CO₂ ($/t)'}
        </span>
      </div>
      <div>
        {sorted.map((rec, i) => {
          const bestFor = HEATING_BEST_FOR[rec.id]
          const isTop   = i === 0
          return (
            <div key={rec.id} className={i > 0 ? 'border-t border-hairline' : ''}>
              {bestFor && (
                <div className={`px-4 py-1.5 ${
                  isTop ? 'bg-glacier/10' : 'bg-snowfield'
                }`}>
                  <span className={`text-[13px] tabular-nums   ${
                    isTop ? 'text-glacier' : 'text-scree'
                  }`}>
                    {isTop ? 'Best for: ' : 'Also: '}{bestFor}
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
  const [showAll,  setShowAll]  = useState(false)
  const TOP_N = 3

  if (!recommendations.length && !doneRecs.length) {
    return mode === 'simple'
      ? (
        <p className="text-scree text-sm leading-relaxed">
          Nothing stands out with era-typical defaults — but that doesn't mean there's nothing to find.
          Try <span className="text-basalt font-medium">Refined mode</span> to enter your actual insulation values and get specific, personalised recommendations.
        </p>
      )
      : <p className="text-scree text-sm">No additional recommendations — your home is already well-optimised!</p>
  }

  const doneIds = doneRecs.map(r => r.id)

  // Separate heating pair from other recs
  const heatingRecs = recommendations.filter(r => HEATING_IDS.has(r.id))
  const otherRecs   = recommendations.filter(r => !HEATING_IDS.has(r.id))

  // Recs to show in the ranked list (includes single heating rec if no comparison group)
  const listedRecs = heatingRecs.length === 2 ? otherRecs : [...heatingRecs, ...otherRecs]
  const sortedRecs = [...listedRecs].sort(compareRecs(priority))
  // Lead with the few biggest wins; tuck the rest behind a toggle to cut overwhelm.
  const visibleRecs = showAll ? sortedRecs : sortedRecs.slice(0, TOP_N)
  const hiddenCount = sortedRecs.length - visibleRecs.length

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

      {/* All other recommendations — top few first, rest collapsed */}
      {sortedRecs.length > 0 && (
        <div className="space-y-3">
          {visibleRecs.map((rec, i) => (
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
      {(hiddenCount > 0 || showAll) && sortedRecs.length > TOP_N && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 w-full border border-hairline hover:border-glacier text-basalt hover:text-glacier tabular-nums text-[13px] py-2.5 transition-colors"
        >
          {showAll ? '↑ Show fewer' : `↓ Show all ${sortedRecs.length} upgrades (${hiddenCount} more)`}
        </button>
      )}

      {/* Completed section */}
      {doneRecs.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-2 tabular-nums text-[13px] text-scree hover:text-glacier transition-colors mb-3"
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
            <div className="space-y-3 border-l-2 border-hairline pl-4">
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
