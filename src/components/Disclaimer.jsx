// ── Disclaimer ────────────────────────────────────────────────────────────────
// Honest, plain-English disclaimer for each tool context.
// This is an information-only tool — figures can be substantially wrong.

const COPY = {
  solar: {
    headline: 'Information only — not engineering or financial advice',
    body: 'Solar estimates depend heavily on site-specific shading, exact roof geometry, local installer '
      + 'pricing, and electricity rates that change over time. Figures here can be substantially wrong '
      + 'for your specific situation. Before committing to any installation, get a site assessment from '
      + 'a certified solar installer — most provide them at no cost.',
  },
  homeiq: {
    headline: 'Model estimates — not a professional energy audit',
    body: 'Heat loss figures and upgrade savings are calculated from standard models and era-typical '
      + 'defaults. Actual performance depends on your specific insulation levels, air sealing quality, '
      + 'window condition, and equipment. These numbers can be substantially wrong. An EnerGuide audit '
      + 'from a certified energy advisor gives far more accurate results for your home.',
  },
  plan: {
    headline: 'Illustrative estimates — not a quote or financial advice',
    body: 'Investment figures, annual savings, and payback periods are rough estimates based on '
      + 'Canadian averages and the data you\'ve entered. Real costs and savings vary significantly '
      + 'by contractor, location, and household. This is a thought experiment to help you understand '
      + 'what might be possible — not a plan to act on without professional input.',
  },
  ev: {
    headline: 'Estimates based on NRCan ratings and average grid data',
    body: 'Real-world fuel and electricity costs depend on your driving habits, climate, vehicle '
      + 'condition, and local prices — all of which change over time. Grid carbon intensity varies '
      + 'by hour and season. Treat these numbers as directionally useful, not precise.',
  },
}

/**
 * @param {{ context?: 'solar' | 'homeiq' | 'plan' | 'ev' }} props
 */
export default function Disclaimer({ context = 'plan' }) {
  const copy = COPY[context] ?? COPY.plan

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">
        {copy.headline}
      </p>
      <p className="text-[11px] text-zinc-500 leading-relaxed">
        {copy.body}
      </p>
    </div>
  )
}
