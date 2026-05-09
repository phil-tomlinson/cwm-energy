const CATEGORY_LABELS = {
  envelope: 'Building envelope',
  heating:  'Heating system',
  water:    'Water heating',
}

const CATEGORY_COLORS = {
  envelope: 'bg-emerald-100 text-emerald-800',
  heating:  'bg-orange-100 text-orange-800',
  water:    'bg-blue-100 text-blue-800',
}

export default function RecommendationsList({ recommendations }) {
  if (!recommendations.length) {
    return <p className="text-gray-500 text-sm">No additional recommendations — your home is already well-optimised!</p>
  }

  return (
    <div className="space-y-4">
      {recommendations.map((rec, i) => (
        <div key={rec.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-gray-800 text-sm">{rec.title}</h3>
              </div>

              <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium mb-2 ${CATEGORY_COLORS[rec.category]}`}>
                {CATEGORY_LABELS[rec.category]}
              </span>

              <p className="text-xs text-gray-500 mb-3">{rec.description}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span><span className="font-medium">From:</span> {rec.currentValue}</span>
                <span><span className="font-medium">To:</span> {rec.targetValue}</span>
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="text-xl font-bold text-emerald-700">${Math.round(rec.annualSavingsCAD).toLocaleString()}</p>
              <p className="text-xs text-gray-500">saved/year</p>
              <div className="mt-2 px-2 py-1 bg-gray-50 rounded text-center">
                <p className="text-sm font-semibold text-gray-700">
                  {rec.paybackYears < 100 ? `${rec.paybackYears.toFixed(1)} yr` : 'Long'}
                </p>
                <p className="text-xs text-gray-400">payback</p>
              </div>
              <p className="text-xs text-gray-400 mt-1">~${Math.round(rec.estimatedCostCAD).toLocaleString()} installed</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
