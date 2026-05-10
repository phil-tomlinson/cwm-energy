const MODES = [
  {
    id: 'simple',
    label: 'Simple',
    tag: 'Quick estimate',
    desc: 'Answer 7 questions from memory. Takes 60 seconds.',
  },
  {
    id: 'refined',
    label: 'Refined',
    tag: 'Better accuracy',
    desc: 'Add envelope details and equipment specs for a more precise result.',
  },
  {
    id: 'technical',
    label: 'Technical',
    tag: 'Professional',
    desc: 'Enter measured R-values, U-values, ACH, and actual areas.',
  },
]

export default function ModeSelector({ mode, onChange }) {
  return (
    <div className="mb-8">
      {/* Tab row */}
      <div className="flex border-b border-zinc-700">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex-1 py-3 text-center transition-colors relative ${
              mode === m.id
                ? 'text-emerald-400'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <span className="text-xs uppercase tracking-widest font-mono font-bold">{m.label}</span>
            {mode === m.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {/* Active mode description */}
      {MODES.filter(m => m.id === mode).map(m => (
        <div key={m.id} className="mt-3 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 px-2 py-0.5 font-mono">
            {m.tag}
          </span>
          <span className="text-xs text-zinc-500">{m.desc}</span>
        </div>
      ))}
    </div>
  )
}
