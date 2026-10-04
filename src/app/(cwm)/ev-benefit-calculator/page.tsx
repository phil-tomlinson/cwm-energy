import EVCalculatorTabs from '@/ev/EVCalculatorTabs'
import PageHeader from "@/components/cwm/PageHeader"
import Disclaimer from '@/components/Disclaimer'

export const metadata = {
  title: 'EV Benefit Calculator | CWM Energy',
  description:
    'Compare any two vehicles — or see how Ioniq 5 and Mach-E stack up against a gas and hybrid RAV4 — on emissions, fuel costs, and lifetime ownership. Uses live grid carbon data for your city and official NRCan fuel consumption ratings.',
}

export default function EVBenefitCalculatorPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        width="max-w-5xl"
        title="Should you buy an EV?"
        intro="Compare vehicles on emissions, running costs and total cost of ownership, using your city's grid and official NRCan fuel ratings."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
        <div className="bg-snowfield-raised border border-hairline rounded-[10px] p-4 sm:p-8">
          <EVCalculatorTabs />
        </div>
        <Disclaimer context="ev" />
      </div>
    </div>
  )
}
