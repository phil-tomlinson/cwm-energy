export default function ProgressBar({ current, total, labels }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${i < current  ? 'bg-emerald-600 text-white'
              : i === current ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
              : 'bg-gray-200 text-gray-500'}
            `}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`mt-1 text-xs hidden sm:block ${i === current ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1.5 bg-gray-200 rounded-full mt-1">
        <div
          className="absolute h-1.5 bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${(current / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
