// Shared wrapper for the inline building-science diagrams. Keeps a consistent
// bordered frame + caption. The SVGs themselves use `currentColor` so they adapt
// to light/dark themes; emerald (#059669) marks the highlighted element.
export default function DiagramFrame({ children, caption, className = '' }) {
  return (
    <figure className={`border border-zinc-700 bg-zinc-900/40 p-3 ${className}`}>
      <div className="text-zinc-300">{children}</div>
      {caption && (
        <figcaption className="text-[11px] text-zinc-400 leading-relaxed mt-2">{caption}</figcaption>
      )}
    </figure>
  )
}
