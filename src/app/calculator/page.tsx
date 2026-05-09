'use client'
import { useState } from 'react'
import Wizard from '@/homeiq/Wizard'
import Results from '@/homeiq/results/Results'

export default function CalculatorPage() {
  const [results, setResults] = useState<any>(null)

  return (
    <div className="bg-zinc-950 min-h-screen">
      {/* Header bar */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-0.5">Module 01</p>
            <h1 className="text-lg font-black tracking-tight text-zinc-100">Home Heat Loss Analysis</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {results ? (
          <Results
            results={results}
            onReset={() => setResults(null)}
          />
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8">
            <Wizard onComplete={setResults} />
          </div>
        )}
      </div>
    </div>
  )
}
