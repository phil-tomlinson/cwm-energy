import EVCalculator from '@/ev/EVCalculator'

export const metadata = {
  title: 'EV Benefit Calculator — CWM Energy',
  description:
    'Compare a Hyundai Ioniq 5 and Ford Mustang Mach-E against a gas and hybrid RAV4 — emissions, fuel costs, maintenance — using live grid carbon data for your city.',
}

export default function EVBenefitCalculatorPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      {/* Page header */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-0.5">Module 02</p>
          <h1 className="text-lg font-black tracking-tight text-zinc-100">EV Benefit Calculator</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Should you buy an EV? Let&apos;s actually look at the numbers.
          </p>
        </div>
      </div>

      {/* Calculator */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8">
          <EVCalculator />
        </div>
      </div>
    </div>
  )
}
