'use client'
import { createContext, useContext, useState, useCallback } from 'react'

// Tracks which question the user is currently engaging with, so the floating
// companion panel can show the matching house highlight + hints.
const CompanionContext = createContext(null)

export function CompanionProvider({ children }) {
  const [active, setActive] = useState(null)
  const set = useCallback((id) => setActive(id), [])
  return (
    <CompanionContext.Provider value={{ active, setActive: set }}>
      {children}
    </CompanionContext.Provider>
  )
}

export function useCompanion() {
  return useContext(CompanionContext) ?? { active: null, setActive: () => {} }
}

/**
 * Wraps a question so the companion activates when the user focuses or hovers it.
 * `id` keys into the guide registry (see questionGuides.js).
 */
export function CompanionTarget({ id, children, className = '' }) {
  const { active, setActive } = useCompanion()
  const isActive = active === id
  return (
    <div
      className={`${className} transition-colors ${isActive ? 'border-l-2 border-emerald-400/50 pl-3 -ml-3' : 'border-l-2 border-transparent pl-3 -ml-3'}`}
      onFocusCapture={() => setActive(id)}
      onMouseEnter={() => setActive(id)}
    >
      {children}
    </div>
  )
}
