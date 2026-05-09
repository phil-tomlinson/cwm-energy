export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  )
}

export function CardSection({ title, hint, children }) {
  return (
    <div className="mb-6 last:mb-0">
      {title && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
          {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
