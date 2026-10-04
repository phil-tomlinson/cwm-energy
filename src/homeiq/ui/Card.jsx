export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-snowfield border border-hairline p-6 ${className}`}>
      {children}
    </div>
  )
}

export function CardSection({ title, hint, children }) {
  return (
    <div className="mb-6 last:mb-0">
      {title && (
        <div className="mb-3">
          <h3 className="text-[13px] font-semibold text-scree ">{title}</h3>
          {hint && <p className="text-[13px] text-scree mt-0.5">{hint}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
