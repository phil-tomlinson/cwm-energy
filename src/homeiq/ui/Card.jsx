export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-zinc-800 border border-zinc-700 p-6 ${className}`}>
      {children}
    </div>
  )
}

export function CardSection({ title, hint, children }) {
  return (
    <div className="mb-6 last:mb-0">
      {title && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{title}</h3>
          {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
