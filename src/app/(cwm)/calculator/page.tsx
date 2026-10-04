'use client'
import PageHeader from "@/components/cwm/PageHeader"
import { useState } from 'react'
import Wizard from '@/homeiq/Wizard'
import Results from '@/homeiq/results/Results'

export default function CalculatorPage() {
  const [results, setResults] = useState<any>(null)

  function handleComplete(r: any) {
    // Persist to localStorage so the Plan page can cross-reference HomeIQ data
    try { localStorage.setItem('cwm_homeiq', JSON.stringify(r)) } catch {}
    setResults(r)
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        width={results ? 'max-w-2xl' : 'max-w-5xl'}
        title="Where is your home losing heat?"
        intro="Walls, windows, basement and roof, ranked by heat loss and payback. No tape measure needed."
      />

      {/* Content */}
      {results ? (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
          <Results
            results={results}
            onReset={() => setResults(null)}
          />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          <Wizard onComplete={handleComplete} />
        </div>
      )}
    </div>
  )
}
