export default function ProgressBar({ current, total, labels }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className={`
              w-8 h-8 flex items-center justify-center text-sm font-bold
              ${i < current   ? 'bg-glacier text-on-glacier'
              : i === current  ? 'bg-glacier text-on-glacier ring-4 ring-glacier'
              : 'bg-hairline text-scree'}
            `}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`mt-1 text-[13px] hidden sm:block ${i === current ? 'text-glacier font-medium' : 'text-scree'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-hairline mt-1">
        <div
          className="absolute h-1 bg-glacier transition-all duration-300"
          style={{ width: `${(current / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
