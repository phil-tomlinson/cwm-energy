/**
 * Canadian residential energy efficiency rebate, loan, and grant programs.
 * Scope: Alberta (federal + provincial + municipal programs applicable to AB residents).
 *
 * MAINTENANCE: This data should be reviewed quarterly. Run the research prompt in
 * docs/rebate-research-prompt.md and update this file with any changes.
 * Last verified: 2026-06-03
 *
 * Status values:
 *   'open'      — Accepting applications, funding available
 *   'uncertain' — Program exists but key details (funding availability, dates) unverified
 *   'closed'    — Confirmed closed or fully subscribed
 *
 * Type values:
 *   'grant'     — Free money, no repayment
 *   'loan'      — Repayable financing (may be low/no-interest)
 *   'rebate'    — Rebate on purchase or utility bill credit
 *   'taxCredit' — Reduces income tax owing
 */

export const LAST_VERIFIED = '2026-06-03'

export const programs = [
  // ─── FEDERAL ──────────────────────────────────────────────────────────────

  {
    id: 'ohpa',
    name: 'Oil to Heat Pump Affordability Program (OHPA)',
    type: 'grant',
    jurisdiction: 'federal',
    administeredBy: 'Natural Resources Canada',
    status: 'uncertain',
    statusNote: 'Technically open but verify funding availability — nationally approaching full commitment as of early 2026. Only 1 grant issued in Alberta to date due to very low oil-heating prevalence.',
    incomeQualified: true,
    incomeThresholds: {
      description: 'Household after-tax income at or below Alberta median:',
      tiers: [
        { size: '1 person',    maxIncome: 48760 },
        { size: '2 persons',   maxIncome: 95450 },
        { size: '3 persons',   maxIncome: 118450 },
        { size: '4 persons',   maxIncome: 139150 },
        { size: '5+ persons',  maxIncome: 146050 },
      ],
    },
    eligibleUpgrades: ['Heat pump (air-source or ground-source)', 'Electrical upgrades required for heat pump', 'Oil tank removal', 'Supplemental electric heating'],
    amounts: {
      summary: 'Up to $10,000',
      detail: '$10,000 grant (Alberta receives federal-only amount; no provincial top-up unlike NS, NB, NL, ON)',
    },
    maxAmountCAD: 10000,
    keyLimitations: [
      'Must currently heat with oil (≥500 L purchased in past 12 months) — gas, propane, and wood heat are ineligible',
      'No Alberta provincial co-delivery top-up (other provinces add $5,000)',
      'Home must be connected to integrated electricity grid — off-grid ineligible',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'No stated deadline — verify funding availability before applying',
    url: 'https://natural-resources.canada.ca/energy-efficiency/home-energy-efficiency/canada-greener-homes-initiative/oil-heat-pump-affordability-program',
  },

  {
    id: 'cghap',
    name: 'Canada Greener Homes Affordability Program (CGHAP)',
    type: 'grant',
    jurisdiction: 'federal',
    administeredBy: 'Natural Resources Canada (provincial delivery)',
    status: 'uncertain',
    statusNote: 'Program launched nationally September 2025 but Alberta has NOT signed a provincial delivery agreement as of June 2026. Albertans cannot currently apply.',
    incomeQualified: true,
    incomeThresholds: {
      description: 'Low-to-median income — thresholds set by provincial delivery partner (not yet published for AB)',
      tiers: [],
    },
    eligibleUpgrades: ['Insulation and air sealing', 'Heat pumps', 'Solar panels', 'Windows and doors', 'Energy-efficient equipment'],
    amounts: {
      summary: 'No-cost direct install',
      detail: 'Qualifying homeowners pay nothing — federal covers retrofit costs. Dollar caps set by provincial partner.',
    },
    maxAmountCAD: null,
    keyLimitations: [
      'Alberta has not signed a delivery agreement — program not available here yet',
      'Each province sets its own eligible technology list and income thresholds',
    ],
    energuideRequired: false,
    stackable: null,
    deadline: 'No deadline — rolling provincial launch throughout 2026',
    url: 'https://natural-resources.canada.ca/energy-efficiency/home-energy-efficiency/canada-greener-homes-initiative/canada-greener-homes-affordability-program',
  },

  {
    id: 'cmhc-eco-improvement',
    name: 'CMHC Eco Improvement',
    type: 'rebate',
    jurisdiction: 'federal',
    administeredBy: 'Canada Mortgage and Housing Corporation (CMHC)',
    status: 'open',
    statusNote: 'Open — processing times are currently 24+ weeks.',
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Insulation, windows, doors, roof, attic, air sealing', 'HVAC and heat pumps', 'Solar and renewable energy', 'Foundation improvements'],
    amounts: {
      summary: '25% refund on mortgage insurance premium',
      detail: 'e.g. on a $600K mortgage with 10% down ≈ $3,500–$4,200 refund',
    },
    maxAmountCAD: null,
    keyLimitations: [
      'Must have a CMHC-insured mortgage (less than 20% down payment)',
      'Minimum $20,000 investment in eligible renovations required',
      'Application must be submitted within 24 months of mortgage closing',
      'Existing homes only (see Eco Plus for new construction)',
    ],
    energuideRequired: false,
    stackable: null,
    deadline: 'Within 24 months of mortgage closing date',
    url: 'https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance-for-consumers/cmhc-eco-products/cmhc-eco-improvement',
  },

  {
    id: 'cmhc-eco-plus',
    name: 'CMHC Eco Plus',
    type: 'rebate',
    jurisdiction: 'federal',
    administeredBy: 'Canada Mortgage and Housing Corporation (CMHC)',
    status: 'open',
    statusNote: 'Open — processing times are currently 24+ weeks.',
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['New construction homes meeting energy efficiency certification (LEED, Built Green, Passive House, ENERGY STAR, R-2000, etc.) or ≥20% better than typical new house per EnerGuide'],
    amounts: {
      summary: '25% refund on mortgage insurance premium',
      detail: 'Same refund rate as Eco Improvement — dollar amount depends on mortgage size',
    },
    maxAmountCAD: null,
    keyLimitations: [
      'New construction only — existing/resale homes use Eco Improvement instead',
      'Must have CMHC-insured mortgage',
      'Home must hold third-party certification OR EnerGuide assessment showing ≥20% below typical new house benchmark',
    ],
    energuideRequired: true,
    stackable: null,
    deadline: 'Within 24 months of mortgage closing date',
    url: 'https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance-for-consumers/cmhc-eco-products/cmhc-eco-plus',
  },

  // ─── PROVINCIAL (ALBERTA) ─────────────────────────────────────────────────

  {
    id: 'sharp-loan',
    name: 'Seniors Home Adaptation and Repair Program — Loan (SHARP)',
    type: 'loan',
    jurisdiction: 'provincial',
    administeredBy: 'Government of Alberta',
    status: 'open',
    statusNote: null,
    incomeQualified: true,
    incomeThresholds: {
      description: 'Annual household income ≤$75,000',
      tiers: [{ size: 'All household sizes', maxIncome: 75000 }],
    },
    eligibleUpgrades: ['Furnace and water heater upgrades', 'Window replacement', 'Roof repairs', 'Insulation', 'Accessibility modifications (grab bars, stair lifts)', 'General energy efficiency improvements'],
    amounts: {
      summary: 'Up to $40,000',
      detail: 'Loan at 4.45% simple interest (rate reviewed April/October). No monthly payments — repaid when home is sold.',
    },
    maxAmountCAD: 40000,
    keyLimitations: [
      'Homeowner must be 65+ (surviving spouse minimum 55)',
      'Must be primary residence',
      'Minimum 25% home equity required after loan',
      'Income ≤$75,000 annual household income',
      'Work completed within 12 months prior to application may qualify retroactively',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'No deadline — ongoing program',
    url: 'https://www.alberta.ca/seniors-home-adaptation-repair-program',
  },

  {
    id: 'sharp-grant',
    name: 'Seniors Home Adaptation and Repair Program — Grant (SHARP)',
    type: 'grant',
    jurisdiction: 'provincial',
    administeredBy: 'Government of Alberta',
    status: 'open',
    statusNote: 'For seniors who do not qualify for the SHARP loan.',
    incomeQualified: true,
    incomeThresholds: {
      description: 'Low-income seniors only:',
      tiers: [
        { size: 'Single senior',    maxIncome: 34770 },
        { size: 'Senior couple',    maxIncome: 56820 },
      ],
    },
    eligibleUpgrades: ['Basic and essential home repairs', 'Energy efficiency improvements (furnaces, insulation, windows)'],
    amounts: {
      summary: 'Up to $5,000/year, $15,000 lifetime',
      detail: '$5,000 per benefit year, $15,000 total per household',
    },
    maxAmountCAD: 15000,
    keyLimitations: [
      'Only available to those who do not qualify for the SHARP loan',
      'Very low income thresholds: single ≤$34,770 / couple ≤$56,820',
      'Primary residence only',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'No deadline — ongoing program',
    url: 'https://www.alberta.ca/seniors-home-adaptation-repair-program',
  },

  // ─── MUNICIPAL ────────────────────────────────────────────────────────────

  {
    id: 'ceip-calgary',
    name: 'Clean Energy Improvement Program — Calgary (CEIP)',
    type: 'loan',
    jurisdiction: 'municipal',
    municipalities: ['Calgary'],
    administeredBy: 'City of Calgary / Alberta Municipalities',
    status: 'uncertain',
    statusNote: 'Current intake CLOSED. Next intake opens September 22, 2026.',
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Solar PV', 'Heat pumps (preferred over gas)', 'Insulation', 'Windows and doors', 'Water heating', 'Lighting', 'Custom upgrades'],
    amounts: {
      summary: 'Up to $50,000 financed',
      detail: '100% of project costs financed at ~5.66–5.75% fixed; up to 20-year repayment term. Loan attaches to property tax bill.',
    },
    maxAmountCAD: 50000,
    keyLimitations: [
      'Loan only — not a grant',
      'Attached to property tax — transfers to new owner if home is sold',
      'Intake currently closed; reopens September 22, 2026',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'Next intake opens September 22, 2026',
    url: 'https://www.calgary.ca/environment/programs/clean-energy-improvement-program.html',
  },

  {
    id: 'ceip-edmonton',
    name: 'Clean Energy Improvement Program — Edmonton (CEIP)',
    type: 'loan',
    jurisdiction: 'municipal',
    municipalities: ['Edmonton'],
    administeredBy: 'City of Edmonton / Alberta Municipalities',
    status: 'open',
    statusNote: null,
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Solar PV', 'Heat pumps', 'Insulation', 'Windows and doors', 'Water heating', 'Lighting', 'Custom upgrades'],
    amounts: {
      summary: '$3,000–$50,000 financed',
      detail: '6.00% fixed, up to 20-year term. Minimum 3 upgrades required. Attaches to property tax.',
    },
    maxAmountCAD: 50000,
    keyLimitations: [
      'Loan only — not a grant',
      'Minimum 3 upgrades required (limited exceptions)',
      'Property-attached financing — transfers to new owner on sale',
      'Intake pauses after 150 applications',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'Continuous intake until capacity reached',
    url: 'https://www.edmonton.ca/city_government/environmental_stewardship/clean-energy-improvement-program',
  },

  {
    id: 'ceip-other',
    name: 'Clean Energy Improvement Program — Other Alberta Municipalities',
    type: 'loan',
    jurisdiction: 'municipal',
    municipalities: ['St. Albert', 'Strathcona County', 'Grande Prairie', 'Leduc', 'Okotoks', 'Canmore', 'Banff', 'Cold Lake', 'Devon', 'Athabasca', 'Pincher Creek', 'Rocky Mountain House', 'Westlock', 'Stirling', 'Sturgeon County', 'Moose Jaw'],
    administeredBy: 'Alberta Municipalities (ceip.abmunis.ca)',
    status: 'open',
    statusNote: 'Open in most of 26 participating municipalities — check ceip.abmunis.ca for your city.',
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Solar PV', 'Heat pumps', 'Insulation', 'Windows and doors', 'Water heating', 'Other energy efficiency upgrades'],
    amounts: {
      summary: 'Up to $50,000 financed',
      detail: 'Up to 25-year repayment depending on municipality. Interest rate varies by municipality and year of application.',
    },
    maxAmountCAD: 50000,
    keyLimitations: [
      'Loan only — no grant component',
      'Property-attached; transfers on sale',
      'Terms (rate, max amount, eligible upgrades) vary by municipality',
      'Not all 26 municipalities may have open intakes simultaneously',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'Varies by municipality',
    url: 'https://ceip.abmunis.ca/',
  },

  {
    id: 'home-upgrades-program',
    name: 'Home Upgrades Program (HUP)',
    type: 'grant',
    jurisdiction: 'municipal',
    municipalities: ['Calgary', 'Edmonton', 'Canmore', 'St. Albert'],
    administeredBy: 'Kambo Energy Group & Alberta Ecotrust Foundation',
    status: 'open',
    statusNote: null,
    incomeQualified: true,
    incomeThresholds: {
      description: 'Household income of ALL adults 18+ in the home:',
      tiers: [
        { size: '1 person',  maxIncome: 49296 },
        { size: '2 people',  maxIncome: 59997 },
        { size: '3 people',  maxIncome: 74409 },
        { size: '4 people',  maxIncome: 93205 },
        { size: '5 people',  maxIncome: 106132 },
        { size: '6 people',  maxIncome: 117703 },
        { size: '7+ people', maxIncome: 129276 },
      ],
    },
    eligibleUpgrades: ['High-efficiency furnaces', 'Insulation', 'Weatherstripping and draft proofing', 'LED lighting', 'Water-saving devices'],
    amounts: {
      summary: '$0 to homeowner — completely free',
      detail: 'All eligible upgrades installed at no cost to qualifying households.',
    },
    maxAmountCAD: null,
    keyLimitations: [
      'Income-qualified only',
      'Calgary, Edmonton, Canmore, and St. Albert only',
      'Home must be built before 1998 on permanent foundation (no mobile homes)',
      'Scope of upgrades determined by home assessment — not all upgrades guaranteed',
    ],
    energuideRequired: true,
    stackable: null,
    deadline: 'No stated deadline — ongoing while funding lasts',
    url: 'https://www.homeupgradesprogram.ca/',
  },

  {
    id: 'banff-solar',
    name: 'Town of Banff Solar Incentive Program',
    type: 'rebate',
    jurisdiction: 'municipal',
    municipalities: ['Banff'],
    administeredBy: 'Town of Banff',
    status: 'open',
    statusNote: null,
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Grid-tied solar PV systems (minimum 2 kW)'],
    amounts: {
      summary: '$450/kW residential, up to $9,000',
      detail: 'Residential: $450/kW, max $9,000 (20 kW). Commercial: $750/kW, max $15,000.',
    },
    maxAmountCAD: 9000,
    keyLimitations: [
      'Minimum 2 kW system required',
      'Post-install application — must install first, then apply',
      'Only one application per property',
      'Must provide microgeneration agreement with Fortis, interconnection agreement, certificate of inspection, and invoice',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'No stated deadline',
    url: 'https://banff.ca/807/Solar-Incentive-Program',
  },

  {
    id: 'medicine-hat-hat-smart',
    name: 'City of Medicine Hat HAT Smart — Existing Homes Incentive',
    type: 'rebate',
    jurisdiction: 'municipal',
    municipalities: ['Medicine Hat'],
    administeredBy: 'City of Medicine Hat',
    status: 'open',
    statusNote: '$375,000 total 2026 budget — first-come, first-served until exhausted.',
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Windows and doors', 'Heating, cooling, and ventilation', 'Water heaters', 'Insulation', 'Solar PV', 'Heat/energy recovery ventilators (HRV/ERV)'],
    amounts: {
      summary: 'Up to $5,000 per home',
      detail: 'Maximum $5,000 for combined eligible retrofits. $250 rebate also available for EnerGuide evaluation cost.',
    },
    maxAmountCAD: 5000,
    keyLimitations: [
      'Must be a City of Medicine Hat utility customer',
      'Pre-renovation EnerGuide evaluation MANDATORY — only upgrades in the Upgrade Report are eligible',
      'Post-renovation EnerGuide evaluation also required',
      'EnerGuide evaluator must hold a City of Medicine Hat Business Licence',
      '$375,000 total budget — may run out before December 15 deadline',
    ],
    energuideRequired: true,
    stackable: null,
    deadline: 'December 15, 2026 (or when $375,000 budget is exhausted)',
    url: 'https://www.medicinehat.ca/home-property-utilities/utilities/hat-smart/existing-homes-incentive-program/',
  },

  {
    id: 'edmonton-solar-multiunit',
    name: 'Edmonton Change Homes for Climate — Solar Rebate (Multi-Unit Only)',
    type: 'rebate',
    jurisdiction: 'municipal',
    municipalities: ['Edmonton'],
    administeredBy: 'City of Edmonton',
    status: 'open',
    statusNote: 'Multi-unit residential (4+ units) ONLY. The previous single-family program is fully subscribed and closed.',
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Rooftop solar PV systems on multi-unit residential buildings (4+ units)'],
    amounts: {
      summary: '$0.50/watt, up to $4,000/unit or $100,000/applicant',
      detail: '$0.50/W of installed capacity; capped at $4,000 per dwelling unit and $100,000 per applicant per year.',
    },
    maxAmountCAD: 100000,
    keyLimitations: [
      'Multi-unit residential with 4+ units ONLY — single-family, duplex, and triplex are excluded',
      'Previous single-family program is fully subscribed and closed',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'No stated deadline',
    url: 'https://homes.changeforclimate.ca/solar-rebate-program/',
  },

  // ─── UTILITY / BILLING FRAMEWORKS ─────────────────────────────────────────

  {
    id: 'ab-microgeneration',
    name: 'Alberta Micro-Generation Framework (Net Metering)',
    type: 'rebate',
    jurisdiction: 'provincial',
    administeredBy: 'Alberta Utilities Commission (AUC) — administered through individual electricity retailers',
    status: 'open',
    statusNote: 'Ongoing provincial framework — not a grant, but a billing arrangement that reduces solar payback periods.',
    incomeQualified: false,
    incomeThresholds: null,
    eligibleUpgrades: ['Solar PV systems', 'Any eligible micro-generation technology'],
    amounts: {
      summary: 'Bill credits for surplus solar exports',
      detail: 'Monthly bill credits for electricity exported to grid; unused annual credits paid out by retailer. Rate varies by retailer (e.g., ENMAX Easymax Seasonal Solar pays up to $0.30/kWh for summer exports).',
    },
    maxAmountCAD: null,
    keyLimitations: [
      'Not a rebate or grant — a billing arrangement',
      'Credit rates negotiated with your individual electricity retailer',
      'Fixed distribution and delivery charges cannot be offset by self-generation',
      'Must complete AUC Rule 024 process and get distributor approval before installation',
    ],
    energuideRequired: false,
    stackable: true,
    deadline: 'Ongoing — no deadline',
    url: 'https://ucahelps.alberta.ca/residential/electricity/micro-generation/',
  },
]

/**
 * Programs that are explicitly closed/expired — kept for historical reference
 * and to answer "what happened to X?"
 */
export const closedPrograms = [
  {
    id: 'canada-greener-homes-grant',
    name: 'Canada Greener Homes Grant',
    closedDate: '2024-03',
    note: 'Closed March 2024 after funding committed. Replaced by Canada Greener Homes Affordability Program (income-qualified) and the Oil to Heat Pump Affordability Program.',
  },
  {
    id: 'canada-greener-homes-loan',
    name: 'Canada Greener Homes Loan',
    closedDate: '2025-10-01',
    note: 'Closed October 1, 2025.',
  },
  {
    id: 'edmonton-single-family-solar',
    name: 'Edmonton Change Homes for Climate Solar Rebate — Single Family',
    closedDate: '2025',
    note: 'Fully subscribed and closed. Multi-unit program (4+ units) remains open.',
  },
  {
    id: 'calgary-new-home-energy-label',
    name: 'Calgary New Home Energy Label Pilot Rebate',
    closedDate: '2025-12-11',
    note: 'Closed December 11, 2025.',
  },
]
