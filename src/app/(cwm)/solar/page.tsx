import PageHeader from "@/components/cwm/PageHeader"
import SolarCalculator from '@/solar/SolarCalculator'

export const metadata = {
  title: 'Solar PV Estimator | CWM Energy',
  description:
    'Estimate rooftop solar potential for any Canadian home. See annual generation, savings, payback period, and CO₂ offset based on your province, roof type, and system size.',
}

export default function SolarPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        width="max-w-2xl"
        title="What could solar do on your roof?"
        intro="Estimate what rooftop solar could generate, save and earn back on your home."
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
        <SolarCalculator />
      </div>

    </div>
  )
}
