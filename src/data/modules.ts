// ── Module registry ───────────────────────────────────────────────────────
// Single source of truth for the app's calculator modules. Drives the top nav,
// the home-page toolkit grid, and the plan page's data-source + vision lists.
// Add a module here and it appears everywhere — no more hunting down hardcoded
// lists. Non-module site pages (About, Contact, Terms…) live in their components.

export type ModuleCategory = 'home' | 'transport' | 'planning'
export type ModuleStatus   = 'live' | 'coming'

export interface AppModule {
  id:        string          // stable key
  num:       string          // display-order label, e.g. "01"
  navLabel:  string          // short label for the top nav
  title:     string          // full title for cards / page headers
  desc:      string          // one-line description for cards
  href:      string          // route ('#' for not-yet-built)
  category:  ModuleCategory
  status:    ModuleStatus
  inNav:     boolean         // show in the top nav
  /** localStorage key this module writes — lets the plan bind to its output. */
  storageKey?: string
  /** Which stored dataset the plan reads for this module's "data source" card.
   *  (Solar pre-fills from the home analysis, so it points at cwm_homeiq.) */
  planDataKey?: string
}

export const MODULES: AppModule[] = [
  {
    id: 'home', num: '01', navLabel: 'Home',
    title: 'Home Heat Loss',
    desc: 'Walls, windows, basement, roof — ranked by heat loss and payback. No tape measure needed.',
    href: '/calculator', category: 'home', status: 'live', inNav: true,
    storageKey: 'cwm_homeiq', planDataKey: 'cwm_homeiq',
  },
  {
    id: 'ev', num: '02', navLabel: 'EVs',
    title: 'EV Benefit Calculator',
    desc: 'Compare EVs, hybrids, and gas vehicles — emissions, fuel cost, and maintenance over 10 years using live grid data for your city.',
    href: '/ev-benefit-calculator', category: 'transport', status: 'live', inNav: true,
    storageKey: 'cwm_ev', planDataKey: 'cwm_ev',
  },
  {
    id: 'solar', num: '03', navLabel: 'Solar',
    title: 'Solar PV Estimator',
    desc: 'How much could rooftop solar generate on your home? Annual output, savings, and payback — based on your province, roof type, and system size.',
    href: '/solar', category: 'home', status: 'live', inNav: true,
    planDataKey: 'cwm_homeiq',
  },
  {
    id: 'energyCost', num: '04', navLabel: 'Bills',
    title: "What's Your Actual Energy Cost?",
    desc: 'Turn a few utility bills into your true marginal cost per GJ and fixed monthly service charge — the numbers that drive every upgrade’s payback.',
    href: '/energy-cost', category: 'home', status: 'live', inNav: true,
    storageKey: 'cwm_energy_rates',
  },
  {
    id: 'plan', num: '05', navLabel: 'Plan',
    title: 'Priority Action Plan',
    desc: 'Every module feeds one ranked list — highest impact, fastest payback, first.',
    href: '/plan', category: 'planning', status: 'live', inNav: true,
  },
  {
    id: 'flights', num: '06', navLabel: 'Flights',
    title: 'Flights',
    desc: 'Air travel emissions and offset trade-offs, folded into your priority plan.',
    href: '#', category: 'transport', status: 'coming', inNav: false,
  },
]

export const navModules  = MODULES.filter(m => m.inNav)
export const planSources = MODULES.filter(m => m.planDataKey)
export const getModule   = (id: string) => MODULES.find(m => m.id === id)
