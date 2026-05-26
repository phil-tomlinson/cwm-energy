import EVCalculatorTabs from '@/ev/EVCalculatorTabs'
import Disclaimer from '@/components/Disclaimer'

export const metadata = {
  title: 'EV Benefit Calculator — CWM Energy',
  description:
    'Compare any two vehicles — or see how Ioniq 5 and Mach-E stack up against a gas and hybrid RAV4 — on emissions, fuel costs, and lifetime ownership. Uses live grid carbon data for your city and official NRCan fuel consumption ratings.',
}

export default function EVBenefitCalculatorPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      {/* Page header */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono mb-0.5">Module 02</p>
          <h1 className="text-lg font-black tracking-tight text-zinc-100">EV Benefit Calculator</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Should you buy an EV? Let&apos;s actually look at the numbers.
          </p>
        </div>
      </div>

      {/* Calculator */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8">
          <EVCalculatorTabs />
        </div>
        <Disclaimer context="ev" />
      </div>
    </div>
  )
}
