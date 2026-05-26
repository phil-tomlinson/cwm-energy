export const metadata = {
  title: 'Terms of Use — CWM Energy',
  description: 'Terms of use for CWM Energy calculators and tools.',
}

export default function TermsPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Draft notice */}
        <div className="border border-amber-400/40 bg-amber-400/5 px-4 py-3 mb-8 flex items-start gap-3">
          <span className="font-mono text-[9px] uppercase tracking-widest border border-amber-400/50 text-amber-400 px-2 py-0.5 shrink-0 mt-0.5">
            Draft
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            These terms are a working draft. CWM Energy&apos;s legal entity is currently being established.
            Formal, legally-reviewed terms will replace this document once that process is complete.
            The intent and substance described here reflect the operator&apos;s current position.
          </p>
        </div>

        <h1 className="text-2xl font-black text-zinc-100 tracking-tight mb-1">Terms of Use</h1>
        <p className="font-mono text-xs text-zinc-500 mb-8">
          Last updated: May 2026 · Governing law: Alberta, Canada
        </p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">1. About this tool</h2>
            <p>
              CWM Energy provides free online calculators designed to help Canadians understand their
              home energy use, estimate the potential benefits of efficiency upgrades, and explore
              options for reducing their carbon footprint. These tools are provided for informational
              and educational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">2. Not professional advice</h2>
            <p className="mb-3">
              Nothing on this site — including calculator outputs, estimates, projections, payback periods,
              savings figures, or any other results — constitutes financial, engineering, investment,
              legal, or professional advice of any kind.
            </p>
            <p>
              The figures produced by these tools are rough estimates based on publicly available data,
              provincial averages, and simplified models. They can be <strong className="text-zinc-300">substantially
              wrong</strong> for your specific situation. Before making any significant financial or
              purchasing decision, you should consult a qualified local professional — a certified energy
              advisor, licensed contractor, financial advisor, or other relevant expert as appropriate.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">3. No warranty</h2>
            <p className="mb-3">
              This site and its tools are provided <strong className="text-zinc-300">&ldquo;as is&rdquo;</strong> without
              warranty of any kind, express or implied. CWM Energy makes no representations or warranties
              regarding the accuracy, completeness, reliability, or fitness for any particular purpose of
              any information or calculation produced by these tools.
            </p>
            <p>
              Electricity rates, incentive programs, equipment costs, and regulations change frequently.
              The data used in these calculators may be out of date. Always verify current figures with
              your utility, installer, or relevant government program.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">4. Limitation of liability</h2>
            <p className="mb-3">
              To the maximum extent permitted by applicable law, CWM Energy and its operators shall not
              be liable for any direct, indirect, incidental, special, consequential, or punitive damages
              arising out of or related to your use of this site or reliance on any information or
              estimate provided here.
            </p>
            <p>
              This includes, without limitation, any financial losses, costs of installation,
              purchasing decisions, or other consequences resulting from acting on calculator outputs
              without independent professional verification.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">5. Under development</h2>
            <p>
              CWM Energy is under active development. Features, calculations, and data may change
              without notice. The tools are not production-ready and should be treated as a
              work in progress. Known limitations and assumptions are documented within each tool
              where possible.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">6. Governing law</h2>
            <p>
              These terms are governed by the laws of the Province of Alberta and the federal laws
              of Canada applicable therein. Any disputes shall be subject to the exclusive jurisdiction
              of the courts of Alberta.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">7. Contact</h2>
            <p>
              Questions about these terms:{' '}
              <a href="mailto:info@cwmenergy.ca" className="text-emerald-400 hover:underline">
                info@cwmenergy.ca
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
