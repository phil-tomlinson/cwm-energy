export default function ProgressBar({ current, total, labels }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className={`
              w-8 h-8 flex items-center justify-center text-sm font-bold
              ${i < current   ? 'bg-emerald-400 text-zinc-950'
              : i === current  ? 'bg-emerald-400 text-zinc-950 ring-4 ring-emerald-400/20'
              : 'bg-zinc-700 text-zinc-400'}
            `}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`mt-1 text-xs hidden sm:block ${i === current ? 'text-emerald-400 font-medium' : 'text-zinc-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-zinc-700 mt-1">
        <div
          className="absolute h-1 bg-emerald-400 transition-all duration-300"
          style={{ width: `${(current / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
