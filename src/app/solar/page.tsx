import SolarCalculator from '@/solar/SolarCalculator'

export const metadata = {
  title: 'Solar PV Estimator — CWM Energy',
  description:
    'Estimate rooftop solar potential for any Canadian home. See annual generation, savings, payback period, and CO₂ offset based on your province, roof type, and system size.',
}

export default function SolarPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">

      {/* Header bar — matches Module 01 and 02 pattern */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Module 03</p>
          <h1 className="text-lg font-black tracking-tight text-zinc-100">Solar PV Estimator</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Estimate what rooftop solar could generate, save, and earn back on your Canadian home.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <SolarCalculator />
      </div>

    </div>
  )
}
