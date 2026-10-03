'use client'
import { useState } from 'react'
import { programs, closedPrograms, LAST_VERIFIED } from '@/data/rebatePrograms'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  open:      { dot: 'bg-emerald-400', badge: 'border-emerald-500/40 text-emerald-300', label: 'Open' },
  uncertain: { dot: 'bg-amber-400',   badge: 'border-amber-500/40  text-amber-300',   label: 'Verify status' },
  closed:    { dot: 'bg-zinc-500',    badge: 'border-zinc-600      text-zinc-400',     label: 'Closed' },
}

const TYPE_LABELS = {
  grant:     'Grant',
  loan:      'Loan',
  rebate:    'Rebate',
  taxCredit: 'Tax credit',
}

const TYPE_STYLES = {
  grant:     'bg-emerald-400/10 text-emerald-300 border-emerald-500/30',
  loan:      'bg-blue-400/10    text-blue-300    border-blue-500/30',
  rebate:    'bg-violet-400/10  text-violet-300  border-violet-500/30',
  taxCredit: 'bg-amber-400/10   text-amber-300   border-amber-500/30',
}

const JURISDICTION_ORDER = ['federal', 'provincial', 'municipal']
const JURISDICTION_LABELS = { federal: 'Federal', provincial: 'Provincial (Alberta)', municipal: 'Municipal' }

function fmt(n) {
  if (n == null) return null
  return '$' + n.toLocaleString('en-CA')
}

// ── Program card ──────────────────────────────────────────────────────────────

function ProgramCard({ p }) {
  const [open, setOpen] = useState(false)
  const st = STATUS_STYLES[p.status] ?? STATUS_STYLES.uncertain

  return (
    <div className="border border-zinc-700 bg-zinc-900 hover:border-zinc-500 transition-colors">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className={`mt-1.5 flex-none w-2 h-2 rounded-full ${st.dot}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 border ${TYPE_STYLES[p.type] ?? TYPE_STYLES.rebate}`}>
              {TYPE_LABELS[p.type] ?? p.type}
            </span>
            <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 border ${st.badge}`}>
              {st.label}
            </span>
            {p.incomeQualified && (
              <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 border border-zinc-600 text-zinc-400">
                Income-qualified
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-zinc-100 leading-snug">{p.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{p.administeredBy}</p>
        </div>
        <div className="flex-none text-right ml-2 hidden sm:block">
          {p.amounts?.summary && (
            <p className="text-sm font-bold text-emerald-400 font-mono">{p.amounts.summary}</p>
          )}
        </div>
        <span className="flex-none text-zinc-500 text-xs mt-0.5 ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {/* Mobile amount */}
      {p.amounts?.summary && (
        <div className="sm:hidden px-4 pb-2">
          <p className="text-sm font-bold text-emerald-400 font-mono">{p.amounts.summary}</p>
        </div>
      )}

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-zinc-700 px-4 py-4 space-y-4 text-sm text-zinc-300">

          {/* Status note */}
          {p.statusNote && (
            <p className={`text-xs font-mono px-2 py-1.5 border ${st.badge}`}>
              {p.statusNote}
            </p>
          )}

          {/* Amounts */}
          {p.amounts?.detail && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">Amount</p>
              <p>{p.amounts.detail}</p>
            </div>
          )}

          {/* Eligible upgrades */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">Eligible upgrades</p>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-300">
              {p.eligibleUpgrades.map(u => <li key={u}>{u}</li>)}
            </ul>
          </div>

          {/* Key limitations */}
          {p.keyLimitations?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">Key limitations</p>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-300">
                {p.keyLimitations.map(l => <li key={l}>{l}</li>)}
              </ul>
            </div>
          )}

          {/* Income thresholds */}
          {p.incomeQualified && p.incomeThresholds?.tiers?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">Income thresholds</p>
              <p className="text-xs text-zinc-400 mb-2">{p.incomeThresholds.description}</p>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                {p.incomeThresholds.tiers.map(t => (
                  <div key={t.size} className="flex justify-between gap-4 border-b border-zinc-800 pb-0.5">
                    <span className="text-zinc-400">{t.size}</span>
                    <span className="text-zinc-200">{fmt(t.maxIncome)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-0.5">EnerGuide audit</p>
              <p className={p.energuideRequired ? 'text-amber-300' : 'text-zinc-400'}>
                {p.energuideRequired ? 'Required' : 'Not required'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-0.5">Stackable</p>
              <p className="text-zinc-400">
                {p.stackable === true ? 'Yes' : p.stackable === false ? 'No' : 'Unknown'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-0.5">Deadline</p>
              <p className="text-zinc-400">{p.deadline ?? 'None stated'}</p>
            </div>
          </div>

          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-emerald-400 underline hover:text-emerald-300 font-mono"
          >
            Official program page →
          </a>
        </div>
      )}
    </div>
  )
}

// ── Tip submission form ───────────────────────────────────────────────────────

function TipForm() {
  const [fields, setFields] = useState({ programName: '', url: '', description: '', province: 'AB', email: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  function set(k, v) { setFields(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/program-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? 'Submission failed.'); setStatus('error'); return }
      setStatus('success')
    } catch {
      setErrorMsg('Network error — please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-emerald-500/40 bg-emerald-400/5 px-4 py-4 text-sm text-emerald-300 font-mono">
        Thanks — we&apos;ll review and add it to the list.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 font-mono mb-1">Program name *</label>
          <input
            required
            value={fields.programName}
            onChange={e => set('programName', e.target.value)}
            placeholder="e.g. Enbridge Home Efficiency Rebate"
            className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 font-mono mb-1">Program URL</label>
          <input
            type="url"
            value={fields.url}
            onChange={e => set('url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 font-mono mb-1">Brief description — what does it cover? *</label>
        <textarea
          required
          rows={3}
          value={fields.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Who is eligible, what upgrades are covered, rough dollar amounts..."
          className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400 resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 font-mono mb-1">Province</label>
          <select
            value={fields.province}
            onChange={e => set('province', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm px-3 py-2 focus:outline-none focus:border-emerald-400"
          >
            {['AB','BC','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 font-mono mb-1">Your email (optional — if you&apos;d like a follow-up)</label>
          <input
            type="email"
            value={fields.email}
            onChange={e => set('email', e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm px-3 py-2 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-400 font-mono">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="bg-emerald-400 text-zinc-950 text-sm font-bold px-5 py-2 hover:bg-emerald-300 transition-colors disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit tip'}
      </button>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const UPGRADE_FILTERS = [
  { key: 'all',       label: 'All upgrades' },
  { key: 'heatpump',  label: 'Heat pump' },
  { key: 'insulation',label: 'Insulation / air sealing' },
  { key: 'solar',     label: 'Solar PV' },
  { key: 'windows',   label: 'Windows & doors' },
  { key: 'water',     label: 'Water heater' },
]

function matchesUpgradeFilter(p, key) {
  if (key === 'all') return true
  const text = p.eligibleUpgrades.join(' ').toLowerCase()
  if (key === 'heatpump')   return text.includes('heat pump')
  if (key === 'insulation') return text.includes('insulation') || text.includes('air seal') || text.includes('weatherstrip')
  if (key === 'solar')      return text.includes('solar')
  if (key === 'windows')    return text.includes('window')
  if (key === 'water')      return text.includes('water heat')
  return true
}

export default function RebatesPage() {
  const [upgradeFilter, setUpgradeFilter] = useState('all')
  const [hideIncome, setHideIncome]       = useState(false)
  const [showClosed, setShowClosed]       = useState(false)

  const visible = programs.filter(p => {
    if (hideIncome && p.incomeQualified) return false
    if (!matchesUpgradeFilter(p, upgradeFilter)) return false
    return true
  })

  return (
    <div className="bg-zinc-950 min-h-screen">

      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Funding inventory</p>
          <h1 className="text-lg font-black tracking-tight text-zinc-100">Rebates &amp; Funding — Alberta</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Grants, loans, and rebates currently available to Alberta homeowners for home energy upgrades.
            Verified <span className="text-zinc-300 font-mono">{LAST_VERIFIED}</span>.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Canada Greener Homes Grant notice */}
        <div className="border border-amber-500/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
          <strong>Note:</strong> The Canada Greener Homes Grant closed in March 2024 and the Greener Homes Loan closed October 2025. Neither is currently available. The programs listed below are the current replacements.
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {UPGRADE_FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setUpgradeFilter(f.key)}
                className={`text-xs font-mono px-3 py-1.5 border transition-colors ${
                  upgradeFilter === f.key
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                    : 'border-zinc-600 text-zinc-400 hover:border-zinc-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideIncome}
              onChange={e => setHideIncome(e.target.checked)}
              className="accent-emerald-400"
            />
            Hide income-qualified programs
          </label>
        </div>

        {/* Programs by jurisdiction */}
        {visible.length === 0 ? (
          <p className="text-sm text-zinc-400 font-mono">No programs match the current filters.</p>
        ) : (
          JURISDICTION_ORDER.map(jur => {
            const group = visible.filter(p => p.jurisdiction === jur)
            if (!group.length) return null
            return (
              <div key={jur}>
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">
                  {JURISDICTION_LABELS[jur]}
                </h2>
                <div className="space-y-2">
                  {group.map(p => <ProgramCard key={p.id} p={p} />)}
                </div>
              </div>
            )
          })
        )}

        {/* Closed programs toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowClosed(v => !v)}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline transition-colors"
          >
            {showClosed ? 'Hide' : 'Show'} recently closed programs ({closedPrograms.length})
          </button>
          {showClosed && (
            <div className="mt-3 space-y-2">
              {closedPrograms.map(p => (
                <div key={p.id} className="border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm">
                  <p className="text-zinc-400 font-semibold line-through">{p.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{p.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tip submission */}
        <div className="border border-zinc-700 bg-zinc-900 px-4 py-5">
          <h2 className="text-sm font-bold text-zinc-100 mb-1">Know something we missed?</h2>
          <p className="text-xs text-zinc-400 mb-4">
            Utility rebates, municipal programs, and new federal initiatives are added and removed regularly.
            If you&apos;ve found a program that isn&apos;t listed here, let us know and we&apos;ll review and add it.
          </p>
          <TipForm />
        </div>

        {/* Methodology note */}
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">
          This inventory is manually verified approximately quarterly against official program pages.
          Program availability, amounts, and eligibility rules change frequently — always confirm details
          directly with the administering body before starting work. Last verified {LAST_VERIFIED}.
        </p>

      </div>
    </div>
  )
}
