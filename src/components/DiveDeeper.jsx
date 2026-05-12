'use client'
import { useState } from 'react'

/**
 * DiveDeeper — a labelled disclosure button that reveals technical detail on demand.
 *
 * Usage:
 *   <DiveDeeper label="How is this calculated?">
 *     <p className="text-xs text-zinc-400 ...">...</p>
 *   </DiveDeeper>
 */
export default function DiveDeeper({ label = 'Dive deeper', children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-500 hover:text-emerald-400 transition-colors"
      >
        {/* chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </button>

      {open && (
        <div className="mt-3 border-l-2 border-zinc-700 pl-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
