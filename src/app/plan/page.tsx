'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { VEHICLES, maintTotal } from '@/ev/evData'

// ── Types ────────────────────────────────────────────────────────────────
type Mode = 'bills' | 'emissions'

interface PlanAction {
  id:               string
  category:         'envelope' | 'heating' | 'water' | 'transport'
  title:            string
  description:      string
  estimatedCostCAD: number
  vendorCostCAD?:   number    // set when user enters a real vendor quote
  annualSavingsCAD: number
  co2SavedTonnes:   number
  paybackYears:     number
  grants?:          string
}

interface PlanStep extends PlanAction {
  cumCost:    number
  cumSavings: number
  cumCO2:     number
}

// ── Grants map ───────────────────────────────────────────────────────────
const GRANTS: Record<string, string> = {
  atticInsulation:    'Canada Greener Homes Grant: up to $5,000',
  airSealing:         'Canada Greener Homes Grant: up to $1,000',
  windows:            'Canada Greener Homes Grant: up to $250/window',
  basementInsulation: 'Canada Greener Homes Grant: up to $2,500',
  furnaceUpgrade:     'Canada Greener Homes Grant: up to $1,000',
  heatPump:           'Canada Greener Homes Grant: up to $6,500 · Provincial rebates vary',
  waterHeaterUpgrade: 'Provincial utility rebates: $100–$500',
  hpwh:               'Canada Greener Homes Grant: up to $1,000',
  ev_switch:          'Federal iZEV incentive: up to $5,000 · Provincial rebates vary',
}

// ── Category styling ─────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  envelope:  { label: 'Envelope',   color: 'text-emerald-400', bg: 'bg-emerald-400/10',  border: 'border-emerald-400/30' },
  heating:   { label: 'Heating',    color: 'text-orange-400',  bg: 'bg-orange-400/10',   border: 'border-orange-400/30'  },
  water:     { label: 'Hot Water',  color: 'text-blue-400',    bg: 'bg-blue-400/10',     border: 'border-blue-400/30'    },
  transport: { label: 'Transport',  color: 'text-purple-400',  bg: 'bg-purple-400/10',   border: 'border-purple-400/30'  },
}

// ── Plan generator ───────────────────────────────────────────────────────
function generatePlan(homeiqData: any, evData: any): PlanAction[] {
  const actions: PlanAction[] = []

  // HomeIQ recommendations — already computed by the recommendations engine
  if (homeiqData?.recommendations) {
    for (const r of homeiqData.recommendations) {
      actions.push({
        id:               r.id,
        category:         r.category === 'water' ? 'water' : r.category === 'heating' ? 'heating' : 'envelope',
        title:            r.title,
        description:      r.description,
        estimatedCostCAD: r.estimatedCostCAD,
        annualSavingsCAD: r.annualSavingsCAD,
        co2SavedTonnes:   r.co2SavedTonnes ?? 0,
        paybackYears:     r.paybackYears,
        grants:           GRANTS[r.id],
      })
    }
  }

  // EV calculator — derive a transport action
  if (evData) {

    // ── Compare mode (any two NRCan vehicles) ────────────────────────────
    if (evData.source === 'compare') {
      const { vehicleA, vehicleB, costA, costB, co2kmA, co2kmB, effPA, effPB, annualKm, grid, cityName } = evData

      if (vehicleA && vehicleB && costA != null && costB != null && annualKm) {
        const aBetter    = (costA ?? Infinity) <= (costB ?? Infinity)
        const winner     = aBetter ? vehicleA : vehicleB
        const loser      = aBetter ? vehicleB : vehicleA
        const winCost    = aBetter ? costA    : costB
        const loseCost   = aBetter ? costB    : costA
        const winCO2km   = aBetter ? (co2kmA ?? 0) : (co2kmB ?? 0)
        const loseCO2km  = aBetter ? (co2kmB ?? 0) : (co2kmA ?? 0)
        const winPrice   = aBetter ? (effPA  ?? 0) : (effPB  ?? 0)
        const losePrice  = aBetter ? (effPB  ?? 0) : (effPA  ?? 0)

        const annSaving    = loseCost - winCost
        const annCO2Saved  = (loseCO2km - winCO2km) * annualKm / 1000  // tonnes/yr
        const pricePremium = Math.max(0, winPrice - losePrice)
        const payback      = pricePremium > 0 && annSaving > 0 ? pricePremium / annSaving : 0

        const winName  = `${winner.year ?? ''} ${winner.make ?? ''} ${winner.model ?? ''}`.trim()
        const loseName = `${loser.year  ?? ''} ${loser.make  ?? ''} ${loser.model  ?? ''}`.trim()
        const isWinEV  = winner.type === 'ev' || winner.type === 'phev'

        const gridNote  = cityName && grid != null
          ? ` at ${cityName}'s grid intensity (${Math.round(grid)} gCO₂e/kWh)`
          : ''
        const co2Note   = annCO2Saved > 0.01
          ? ` It also cuts driving emissions by ${fmt(annCO2Saved, 1)} t CO₂e/yr — ${(winCO2km * 1000).toFixed(0)} g/km vs ${(loseCO2km * 1000).toFixed(0)} g/km${gridNote}.`
          : ''

        if (annSaving > 0) {
          actions.push({
            id:               'ev_switch',
            category:         'transport',
            title:            `When replacing your vehicle, choose the ${winName}`,
            description:      `Based on your comparison, the ${winName} saves $${Math.round(annSaving).toLocaleString('en-CA')}/yr in fuel costs over the ${loseName}.${co2Note}`,
            estimatedCostCAD: pricePremium,
            annualSavingsCAD: annSaving,
            co2SavedTonnes:   Math.max(0, annCO2Saved),
            paybackYears:     payback,
            grants:           isWinEV ? GRANTS.ev_switch : undefined,
          })
        }
      }

    // ── Case-study mode (Ioniq 5 / Mach-E vs RAV4) ───────────────────────
    } else {
      const { annualCosts, c2km, prices, annualKm, grid, cityName } = evData

      if (annualCosts && c2km && prices && annualKm) {
        const bestEVid   = (annualCosts.ioniq5 ?? Infinity) <= (annualCosts.macheelfp ?? Infinity) ? 'ioniq5' : 'macheelfp'
        const bestEV     = VEHICLES[bestEVid]
        const bestCost   = annualCosts[bestEVid]
        const bestCO2km  = c2km[bestEVid]

        const annFuelSaving  = (annualCosts.rav4 ?? 0) - bestCost
        const annMaintSaving = (maintTotal('rav4', annualKm * 10) - maintTotal(bestEVid, annualKm * 10)) / 10
        const annTotalSaving = annFuelSaving + annMaintSaving
        const annCO2Saved    = ((c2km.rav4 ?? 0) - bestCO2km) * annualKm / 1000  // tonnes/yr

        // Price premium over RAV4 (what you pay extra vs just buying the gas car)
        const pricePremium = (prices[bestEVid] ?? 0) - (prices.rav4 ?? 0)
        const payback      = pricePremium > 0 && annTotalSaving > 0
          ? pricePremium / annTotalSaving
          : Infinity

        if (annTotalSaving > 0 && isFinite(payback)) {
          actions.push({
            id:               'ev_switch',
            category:         'transport',
            title:            `When replacing your vehicle, choose a ${bestEV.name}`,
            description:      `At ${cityName ?? 'your location'}'s grid intensity (${Math.round(grid ?? 0)} gCO₂e/kWh), the ${bestEV.name} emits ${(bestCO2km * 1000).toFixed(0)} g CO₂e/km — versus ~${((c2km.rav4 ?? 0.243) * 1000).toFixed(0)} g/km for the RAV4. Fuel and maintenance savings add up to $${Math.round(annTotalSaving).toLocaleString('en-CA')}/year. The ${bestEV.sub.includes('LFP') ? 'LFP battery has lower manufacturing emissions and no cobalt or nickel' : 'NMC battery offers longer range but a higher manufacturing footprint'}.`,
            estimatedCostCAD: Math.max(0, pricePremium),
            annualSavingsCAD: annTotalSaving,
            co2SavedTonnes:   Math.max(0, annCO2Saved),
            paybackYears:     payback,
            grants:           GRANTS.ev_switch,
          })
        }
      }
    }
  }

  return actions
}

// ── Running totals ────────────────────────────────────────────────────────
function withTotals(actions: PlanAction[]): PlanStep[] {
  let cumCost = 0, cumSavings = 0, cumCO2 = 0
  return actions.map(a => {
    cumCost    += a.vendorCostCAD ?? a.estimatedCostCAD   // vendor quote wins when set
    cumSavings += a.annualSavingsCAD
    cumCO2     += a.co2SavedTonnes
    return { ...a, cumCost, cumSavings, cumCO2 }
  })
}

// ── Sort helper (applied after vendor-quote overrides) ────────────────────
function sortActions(actions: PlanAction[], mode: Mode): PlanAction[] {
  return [...actions].sort((a, b) =>
    mode === 'bills' ? a.paybackYears - b.paybackYears : b.co2SavedTonnes - a.co2SavedTonnes
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n: number, d = 0) {
  return n.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d })
}

// ── UI components ─────────────────────────────────────────────────────────
function StepCard({
  step,
  index,
  onQuoteChange,
}: {
  step:          PlanStep
  index:         number
  onQuoteChange: (id: string, amount: number | null) => void
}) {
  const cat          = CAT_STYLE[step.category] ?? CAT_STYLE.envelope
  const pb           = step.paybackYears
  const hasQuote     = step.vendorCostCAD != null
  const effectiveCost = step.vendorCostCAD ?? step.estimatedCostCAD

  const [editing,    setEditing]    = useState(false)
  const [quoteInput, setQuoteInput] = useState('')

  function openEdit() {
    setQuoteInput(step.vendorCostCAD != null ? String(step.vendorCostCAD) : '')
    setEditing(true)
  }

  function confirmEdit() {
    const val = parseFloat(quoteInput)
    if (!isNaN(val) && val >= 0) onQuoteChange(step.id, val)
    setEditing(false)
  }

  return (
    <div className="border border-zinc-700 bg-zinc-900">

      {/* Step header */}
      <div className="flex items-start gap-4 p-5 border-b border-zinc-800">
        <div className="shrink-0 w-8 h-8 border border-zinc-700 flex items-center justify-center">
          <span className="font-mono text-xs font-bold text-zinc-400">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-mono text-[9px] uppercase tracking-widest border px-2 py-0.5 ${cat.color} ${cat.bg} ${cat.border}`}>
              {cat.label}
            </span>
            {hasQuote && (
              <span className="font-mono text-[9px] uppercase tracking-widest border px-2 py-0.5 text-amber-400 bg-amber-400/10 border-amber-400/30">
                Quoted
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-zinc-100 leading-snug">{step.title}</h3>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-xs text-zinc-400 leading-relaxed">{step.description}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-px bg-zinc-800 mx-5 mb-2">
        <div className="bg-zinc-900 p-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Investment</p>
          <p className={`font-mono text-base font-semibold ${hasQuote ? 'text-amber-400' : 'text-zinc-200'}`}>
            {effectiveCost > 0 ? `$${fmt(effectiveCost)}` : 'None'}
          </p>
          {hasQuote && (
            <p className="font-mono text-[9px] text-zinc-600 mt-0.5">
              Est. ${fmt(step.estimatedCostCAD)}
            </p>
          )}
        </div>
        <div className="bg-zinc-900 p-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Annual savings</p>
          <p className="font-mono text-base font-semibold text-emerald-400">${fmt(step.annualSavingsCAD)}/yr</p>
        </div>
        <div className="bg-zinc-900 p-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-600 mb-1">CO₂ cut</p>
          <p className="font-mono text-base font-semibold text-zinc-200">{fmt(step.co2SavedTonnes, 1)} t/yr</p>
        </div>
      </div>

      {/* Vendor quote row */}
      <div className="px-5 py-2.5 flex items-center gap-3 flex-wrap border-b border-zinc-800/60">
        {editing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-500 pointer-events-none">$</span>
              <input
                type="number"
                min="0"
                value={quoteInput}
                onChange={e => setQuoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false) }}
                autoFocus
                placeholder="0"
                className="w-36 bg-zinc-950 border border-amber-400/50 pl-6 pr-3 py-1 font-mono text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              onClick={confirmEdit}
              className="font-mono text-[10px] font-bold bg-amber-400 text-zinc-950 px-3 py-1 hover:bg-amber-300 transition-colors"
            >
              Set
            </button>
            <button
              onClick={() => setEditing(false)}
              className="font-mono text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={openEdit}
              className="font-mono text-[9px] uppercase tracking-widest text-zinc-600 hover:text-amber-400 transition-colors"
            >
              {hasQuote ? '✎ Edit vendor quote' : '+ Add vendor quote'}
            </button>
            {hasQuote && (
              <button
                onClick={() => onQuoteChange(step.id, null)}
                className="font-mono text-[9px] uppercase tracking-widest text-zinc-700 hover:text-red-400 transition-colors"
              >
                × Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3 gap-4">
        <p className="text-[11px] text-zinc-500 font-mono">
          {isFinite(pb) ? `Payback: ${fmt(pb, 1)} years` : 'No payback calculated'}
        </p>
        {step.grants && (
          <p className="text-[10px] text-emerald-400 font-mono text-right">
            ↗ {step.grants}
          </p>
        )}
      </div>

      {/* Running totals */}
      <div className="bg-zinc-950 border-t border-zinc-800 px-5 py-3 flex flex-wrap gap-x-6 gap-y-1">
        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wide">After this step:</span>
        <span className="font-mono text-[10px] text-zinc-400">Total invested: <span className="text-zinc-200">${fmt(step.cumCost)}</span></span>
        <span className="font-mono text-[10px] text-zinc-400">Saving: <span className="text-emerald-400">${fmt(step.cumSavings)}/yr</span></span>
        <span className="font-mono text-[10px] text-zinc-400">CO₂ cut: <span className="text-emerald-400">{fmt(step.cumCO2, 1)} t/yr</span></span>
      </div>

    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function PlanPage() {
  const [mode,         setMode]         = useState<Mode>('bills')
  const [homeiqData,   setHomeiqData]   = useState<any>(null)
  const [evData,       setEvData]       = useState<any>(null)
  const [authed,       setAuthed]       = useState(false)
  const [vendorQuotes, setVendorQuotes] = useState<Record<string, number>>({})

  useEffect(() => {
    try { const h = localStorage.getItem('cwm_homeiq');      if (h) setHomeiqData(JSON.parse(h))   } catch {}
    try { const e = localStorage.getItem('cwm_ev');          if (e) setEvData(JSON.parse(e))        } catch {}
    try { const q = localStorage.getItem('cwm_plan_quotes'); if (q) setVendorQuotes(JSON.parse(q)) } catch {}

    import('@/lib/supabase/client').then(({ createClient }) => {
      const sb = createClient()
      if (!sb) return
      sb.auth.getUser().then(({ data }) => setAuthed(!!data.user))
      sb.auth.onAuthStateChange((_, s) => setAuthed(!!s?.user))
    })
  }, [])

  function updateQuote(id: string, amount: number | null) {
    setVendorQuotes(prev => {
      const next = { ...prev }
      if (amount == null) delete next[id]
      else next[id] = amount
      try { localStorage.setItem('cwm_plan_quotes', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const hasData    = homeiqData || evData
  const rawActions = hasData ? generatePlan(homeiqData, evData) : []
  // Apply vendor quote overrides — recalculate payback from real cost
  const quoted     = rawActions.map(a => {
    const q = vendorQuotes[a.id]
    if (q == null) return a
    const payback = q > 0 && a.annualSavingsCAD > 0 ? q / a.annualSavingsCAD : Infinity
    return { ...a, vendorCostCAD: q, paybackYears: payback }
  })
  const steps      = withTotals(sortActions(quoted, mode))
  const last       = steps[steps.length - 1]

  return (
    <div className="bg-zinc-950 min-h-screen">

      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">CWM Energy</p>
          <h1 className="text-lg font-black text-zinc-100 tracking-tight">Your Carbon Reduction Plan</h1>
          <p className="text-xs text-zinc-500 mt-1">Prioritised actions across your home and transport — ranked by what matters most to you.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Mode toggle ── */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Optimise for</p>
          <div className="flex border border-zinc-700 w-fit">
            {([['bills', 'Cut bills first', 'Shortest payback at the top'],
               ['emissions', 'Cut emissions first', 'Biggest CO₂ impact at the top']] as const).map(([id, label, sub]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`px-5 py-3 text-left transition-colors border-r last:border-r-0 border-zinc-700 ${
                  mode === id ? 'bg-emerald-400 text-zinc-950' : 'bg-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-widest ${mode === id ? 'text-zinc-950' : ''}`}>{label}</p>
                <p className={`text-[10px] font-mono mt-0.5 ${mode === id ? 'text-zinc-800' : 'text-zinc-600'}`}>{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Data sources ── */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Using data from</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                key:   'homeiq',
                label: 'Home Heat Loss',
                href:  '/calculator',
                data:  homeiqData,
                meta:  homeiqData
                  ? `${homeiqData.inputs?.city ?? ''}, ${homeiqData.inputs?.province ?? ''} · ${homeiqData.inputs?.era ?? ''}`
                  : null,
              },
              {
                key:   'ev',
                label: 'EV Benefit Calculator',
                href:  '/ev-benefit-calculator',
                data:  evData,
                meta:  evData
                  ? evData.source === 'compare'
                    ? `${[evData.vehicleA?.make, evData.vehicleA?.model].filter(Boolean).join(' ')} vs ${[evData.vehicleB?.make, evData.vehicleB?.model].filter(Boolean).join(' ')}`
                    : `${evData.cityName ?? ''} · ${(evData.annualKm ?? 0).toLocaleString('en-CA')} km/yr`
                  : null,
              },
            ].map(({ key, label, href, data, meta }) => (
              <div key={key} className={`border p-4 flex items-start gap-3 ${data ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-zinc-800 bg-zinc-900'}`}>
                <div className={`mt-0.5 w-4 h-4 flex items-center justify-center shrink-0 ${data ? 'bg-emerald-400' : 'bg-zinc-700'}`}>
                  {data
                    ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="#09090b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <span className="text-zinc-500 text-[10px]">–</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${data ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</p>
                  {meta
                    ? (
                      <div className="flex items-baseline justify-between gap-2 mt-0.5">
                        <p className="font-mono text-[10px] text-zinc-500 truncate">{meta}</p>
                        <Link href={href} className="font-mono text-[10px] text-emerald-400 hover:underline whitespace-nowrap flex-shrink-0">
                          Update →
                        </Link>
                      </div>
                    )
                    : <Link href={href} className="font-mono text-[10px] text-emerald-400 hover:underline">Run calculator →</Link>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── No data state ── */}
        {!hasData && (
          <div className="border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-zinc-500 text-sm mb-4">Run at least one calculator to generate your plan.</p>
            <div className="flex justify-center gap-4">
              <Link href="/calculator" className="text-xs uppercase tracking-widest font-bold bg-emerald-400 text-zinc-950 px-5 py-2.5 hover:bg-emerald-300 transition-colors">
                Home analysis →
              </Link>
              <Link href="/ev-benefit-calculator" className="text-xs uppercase tracking-widest font-bold border border-zinc-700 text-zinc-400 px-5 py-2.5 hover:border-zinc-500 transition-colors">
                EV calculator →
              </Link>
            </div>
          </div>
        )}

        {/* ── Plan steps ── */}
        {steps.length > 0 && (
          <>
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {steps.length} action{steps.length !== 1 ? 's' : ''} · sorted by {mode === 'bills' ? 'fastest payback' : 'biggest CO₂ impact'}
                </p>
              </div>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <StepCard key={step.id} step={step} index={i} onQuoteChange={updateQuote} />
                ))}
              </div>
            </div>

            {/* ── Summary ── */}
            {last && (
              <div className="border border-emerald-400/30 bg-emerald-400/5 p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-4">Full plan summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total investment',     value: `$${fmt(last.cumCost)}` },
                    { label: 'Annual savings',        value: `$${fmt(last.cumSavings)}/yr` },
                    { label: 'Plan payback',          value: last.cumSavings > 0 ? `${fmt(last.cumCost / last.cumSavings, 1)} years` : '—' },
                    { label: 'CO₂ cut per year',     value: `${fmt(last.cumCO2, 1)} tonnes` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
                      <p className="font-mono text-xl font-semibold text-emerald-400">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-600 mt-4 leading-relaxed">
                  Default costs are mid-range installed estimates (2024 CAD). Add a vendor quote to any step to recalculate
                  payback with your actual number — the plan re-sorts instantly. Government grants can significantly reduce
                  out-of-pocket costs; see each step for applicable incentives.
                </p>
              </div>
            )}

            {/* ── Save / auth prompt ── */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
              {authed ? (
                <p className="text-xs text-zinc-500">
                  Save your calculator results from the{' '}
                  <Link href="/calculator" className="text-emerald-400 hover:underline">HomeIQ</Link> and{' '}
                  <Link href="/ev-benefit-calculator" className="text-emerald-400 hover:underline">EV calculator</Link>{' '}
                  pages to keep this plan across sessions.
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  <Link href="/auth/login?next=/plan" className="text-emerald-400 hover:underline font-semibold">Create a free account</Link>{' '}
                  to save your calculator results and return to this plan anytime.
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Long-range vision ── */}
        <div className="border-t border-zinc-800 pt-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">The bigger picture</p>
          <p className="text-sm font-bold text-zinc-200 mb-3">A systematic tool for reducing your carbon footprint across your whole life</p>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
            Right now, the plan covers your home and your vehicle — typically the two largest sources of household emissions.
            Future modules will add flights, diet, consumer goods, and a unified priority action ranking that pulls from all of them.
            The goal: a single, honest, quantitative answer to "what should I do first?"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: '01 Home',      status: 'live',   href: '/calculator' },
              { label: '02 EVs',       status: 'live',   href: '/ev-benefit-calculator' },
              { label: '03 Flights',   status: 'coming', href: null },
              { label: '04 Diet',      status: 'coming', href: null },
            ].map(({ label, status, href }) => (
              <div key={label} className={`border p-3 ${status === 'live' ? 'border-emerald-400/30' : 'border-zinc-800'}`}>
                <p className={`font-mono text-xs font-semibold ${status === 'live' ? 'text-zinc-200' : 'text-zinc-600'}`}>{label}</p>
                <p className={`font-mono text-[9px] uppercase tracking-widest mt-1 ${status === 'live' ? 'text-emerald-400' : 'text-zinc-700'}`}>
                  {status === 'live' ? 'Available' : 'Coming soon'}
                </p>
                {href && <Link href={href} className="block font-mono text-[9px] text-zinc-500 hover:text-emerald-400 mt-1">Open →</Link>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
