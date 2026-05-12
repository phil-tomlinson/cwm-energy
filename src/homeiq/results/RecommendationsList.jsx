'use client'
import DiveDeeper from '@/components/DiveDeeper'

const CATEGORY_LABELS = {
  envelope: 'Building envelope',
  heating:  'Heating system',
  water:    'Water heating',
}

const CATEGORY_COLORS = {
  envelope: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
  heating:  'bg-orange-400/10 text-orange-400 border border-orange-400/20',
  water:    'bg-blue-400/10 text-blue-400 border border-blue-400/20',
}

export default function RecommendationsList({ recommendations }) {
  if (!recommendations.length) {
    return <p className="text-zinc-500 text-sm">No additional recommendations — your home is already well-optimised!</p>
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, i) => (
        <div key={rec.id} className="bg-zinc-800 border border-zinc-700 p-5 hover:border-zinc-600 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-emerald-400 text-zinc-950 text-xs flex items-center justify-center font-black flex-shrink-0">
                  {i + 1}
                </span>
                <h3 className="font-bold text-zinc-100 text-sm">{rec.title}</h3>
              </div>

              <span className={`inline-block text-[10px] px-2 py-0.5 font-mono uppercase tracking-wide mb-2 ${CATEGORY_COLORS[rec.category]}`}>
                {CATEGORY_LABELS[rec.category]}
              </span>

              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{rec.description}</p>

              <DiveDeeper label="Technical details">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 font-mono">
                  <span><span className="text-zinc-400">From:</span> {rec.currentValue}</span>
                  <span><span className="text-zinc-400">To:</span> {rec.targetValue}</span>
                </div>
              </DiveDeeper>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="text-2xl font-black text-emerald-400 font-mono">${Math.round(rec.annualSavingsCAD).toLocaleString()}</p>
              <p className="text-xs text-zinc-500">saved/year</p>
              <div className="mt-2 px-3 py-1.5 bg-zinc-700 border border-zinc-600 text-center">
                <p className="text-sm font-bold text-zinc-200 font-mono">
                  {rec.paybackYears < 100 ? `${rec.paybackYears.toFixed(1)} yr` : 'Long'}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">payback</p>
              </div>
              <p className="text-xs text-zinc-600 mt-1 font-mono">~${Math.round(rec.estimatedCostCAD).toLocaleString()} installed</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
