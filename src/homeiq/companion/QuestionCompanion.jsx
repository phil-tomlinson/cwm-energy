'use client'
import HouseDiagram from '../diagrams/HouseDiagram'
import { useCompanion } from './CompanionContext'
import { getGuide } from './questionGuides'

// Floating panel that follows the question you're answering: the house with the
// relevant part spotlit (everything else faded for context) plus how-to-identify
// hints. Reads the active question from CompanionContext and the home shape from
// the wizard `data`.
export default function QuestionCompanion({ data, className = '' }) {
  const { active } = useCompanion()
  const guide = getGuide(active)

  return (
    <aside className={className} aria-live="polite">
      <div className="sticky top-20">
        <HouseDiagram
          houseType={data.houseType}
          storeys={data.storeys}
          basementType={data.basementType}
          highlight={guide.highlight}
        />
        <div className="mt-3 border border-zinc-700 bg-zinc-900/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">{guide.title}</p>
          <ul className="space-y-2">
            {guide.hints.map((h, i) => (
              <li key={i} className="text-xs text-zinc-400 leading-relaxed flex gap-2">
                <span className="text-emerald-400/60 shrink-0">›</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
