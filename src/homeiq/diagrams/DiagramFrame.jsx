// Shared wrapper for the inline building-science diagrams. Keeps a consistent
// bordered frame + caption. The SVGs themselves use `currentColor` so they adapt
// to light/dark themes; the glacier token marks the highlighted element.
export default function DiagramFrame({ children, caption, className = '' }) {
  return (
    <figure className={`border border-hairline bg-snowfield-raised p-3 ${className}`}>
      <div className="text-basalt">{children}</div>
      {caption && (
        <figcaption className="text-[13px] text-scree leading-relaxed mt-2">{caption}</figcaption>
      )}
    </figure>
  )
}
