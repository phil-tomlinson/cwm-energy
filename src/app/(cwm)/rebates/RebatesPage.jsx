'use client'
import PageHeader from "@/components/cwm/PageHeader"
import { useState } from 'react'
import { programs, closedPrograms, LAST_VERIFIED } from '@/data/rebatePrograms'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  open:      { dot: 'bg-glacier', badge: 'border-glacier text-glacier', label: 'Open' },
  uncertain: { dot: 'bg-larch',   badge: 'border-larch  text-basalt',   label: 'Verify status' },
  closed:    { dot: 'bg-scree',    badge: 'border-hairline      text-scree',     label: 'Closed' },
}

const TYPE_LABELS = {
  grant:     'Grant',
  loan:      'Loan',
  rebate:    'Rebate',
  taxCredit: 'Tax credit',
}

const TYPE_STYLES = {
  grant:     'bg-glacier/10 text-glacier border-glacier',
  loan:      'bg-glacier/10    text-glacier    border-glacier',
  rebate:    'bg-glacier/10  text-glacier  border-glacier',
  taxCredit: 'bg-larch/10   text-basalt   border-larch',
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
    <div className="border border-hairline bg-snowfield-raised hover:border-hairline transition-colors">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className={`mt-1.5 flex-none w-2 h-2 rounded-full ${st.dot}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-block text-[13px] tabular-nums px-1.5 py-0.5 border ${TYPE_STYLES[p.type] ?? TYPE_STYLES.rebate}`}>
              {TYPE_LABELS[p.type] ?? p.type}
            </span>
            <span className={`inline-block text-[13px] tabular-nums px-1.5 py-0.5 border ${st.badge}`}>
              {st.label}
            </span>
            {p.incomeQualified && (
              <span className="inline-block text-[13px] tabular-nums px-1.5 py-0.5 border border-hairline text-scree">
                Income-qualified
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-basalt leading-snug">{p.name}</p>
          <p className="text-[13px] text-scree mt-0.5">{p.administeredBy}</p>
        </div>
        <div className="flex-none text-right ml-2 hidden sm:block">
          {p.amounts?.summary && (
            <p className="text-sm font-bold text-glacier tabular-nums">{p.amounts.summary}</p>
          )}
        </div>
        <span className="flex-none text-scree text-[13px] mt-0.5 ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {/* Mobile amount */}
      {p.amounts?.summary && (
        <div className="sm:hidden px-4 pb-2">
          <p className="text-sm font-bold text-glacier tabular-nums">{p.amounts.summary}</p>
        </div>
      )}

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-hairline px-4 py-4 space-y-4 text-sm text-basalt">

          {/* Status note */}
          {p.statusNote && (
            <p className={`text-[13px] tabular-nums px-2 py-1.5 border ${st.badge}`}>
              {p.statusNote}
            </p>
          )}

          {/* Amounts */}
          {p.amounts?.detail && (
            <div>
              <p className="text-[13px] text-scree tabular-nums mb-1">Amount</p>
              <p>{p.amounts.detail}</p>
            </div>
          )}

          {/* Eligible upgrades */}
          <div>
            <p className="text-[13px] text-scree tabular-nums mb-1">Eligible upgrades</p>
            <ul className="list-disc list-inside space-y-0.5 text-basalt">
              {p.eligibleUpgrades.map(u => <li key={u}>{u}</li>)}
            </ul>
          </div>

          {/* Key limitations */}
          {p.keyLimitations?.length > 0 && (
            <div>
              <p className="text-[13px] text-scree tabular-nums mb-1">Key limitations</p>
              <ul className="list-disc list-inside space-y-0.5 text-basalt">
                {p.keyLimitations.map(l => <li key={l}>{l}</li>)}
              </ul>
            </div>
          )}

          {/* Income thresholds */}
          {p.incomeQualified && p.incomeThresholds?.tiers?.length > 0 && (
            <div>
              <p className="text-[13px] text-scree tabular-nums mb-1">Income thresholds</p>
              <p className="text-[13px] text-scree mb-2">{p.incomeThresholds.description}</p>
              <div className="grid grid-cols-2 gap-1 text-[13px] tabular-nums">
                {p.incomeThresholds.tiers.map(t => (
                  <div key={t.size} className="flex justify-between gap-4 border-b border-hairline pb-0.5">
                    <span className="text-scree">{t.size}</span>
                    <span className="text-basalt">{fmt(t.maxIncome)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
            <div>
              <p className="text-[13px] text-scree tabular-nums mb-0.5">EnerGuide audit</p>
              <p className={p.energuideRequired ? 'text-basalt' : 'text-scree'}>
                {p.energuideRequired ? 'Required' : 'Not required'}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-scree tabular-nums mb-0.5">Stackable</p>
              <p className="text-scree">
                {p.stackable === true ? 'Yes' : p.stackable === false ? 'No' : 'Unknown'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[13px] text-scree tabular-nums mb-0.5">Deadline</p>
              <p className="text-scree">{p.deadline ?? 'None stated'}</p>
            </div>
          </div>

          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[13px] text-glacier underline hover:text-glacier tabular-nums"
          >
            Official program page
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
      <div className="border border-glacier bg-glacier/5 px-4 py-4 text-sm text-glacier tabular-nums rounded-[10px]">
        Thanks — we&apos;ll review and add it to the list.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[15px] font-semibold text-basalt mb-1">Program name *</label>
          <input
            required
            value={fields.programName}
            onChange={e => set('programName', e.target.value)}
            placeholder="e.g. Enbridge Home Efficiency Rebate"
            className="w-full bg-snowfield border border-hairline text-basalt text-sm px-3 py-2 placeholder:text-scree focus:outline-none focus:border-glacier"
          />
        </div>
        <div>
          <label className="block text-[15px] font-semibold text-basalt mb-1">Program URL</label>
          <input
            type="url"
            value={fields.url}
            onChange={e => set('url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-snowfield border border-hairline text-basalt text-sm px-3 py-2 placeholder:text-scree focus:outline-none focus:border-glacier"
          />
        </div>
      </div>

      <div>
        <label className="block text-[15px] font-semibold text-basalt mb-1">Brief description — what does it cover? *</label>
        <textarea
          required
          rows={3}
          value={fields.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Who is eligible, what upgrades are covered, rough dollar amounts..."
          className="w-full bg-snowfield border border-hairline text-basalt text-sm px-3 py-2 placeholder:text-scree focus:outline-none focus:border-glacier resize-none"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[15px] font-semibold text-basalt mb-1">Province</label>
          <select
            value={fields.province}
            onChange={e => set('province', e.target.value)}
            className="w-full bg-snowfield border border-hairline text-basalt text-sm px-3 py-2 focus:outline-none focus:border-glacier"
          >
            {['AB','BC','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[15px] font-semibold text-basalt mb-1">Your email (optional — if you&apos;d like a follow-up)</label>
          <input
            type="email"
            value={fields.email}
            onChange={e => set('email', e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-snowfield border border-hairline text-basalt text-sm px-3 py-2 placeholder:text-scree focus:outline-none focus:border-glacier"
          />
        </div>
      </div>

      {status === 'error' && (
        <p className="text-[13px] text-fireweed tabular-nums">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="bg-glacier text-on-glacier text-sm font-bold px-5 py-2 hover:opacity-90 transition-colors disabled:opacity-50 rounded-full"
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
    <div className="min-h-screen">
      <PageHeader
        width="max-w-3xl"
        title="Rebates and funding in Alberta"
        intro={<>Grants, loans and rebates available to Alberta homeowners for energy upgrades. Last checked {LAST_VERIFIED}.</>}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 space-y-8">

        {/* Canada Greener Homes Grant notice */}
        <div className="rounded-[10px] border-2 border-larch px-4 py-3 text-sm text-basalt">
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
                className={`text-[13px] tabular-nums px-3 py-1.5 border transition-colors ${
                  upgradeFilter === f.key
                    ? 'border-glacier bg-glacier/10 text-glacier'
                    : 'border-hairline text-scree hover:border-hairline'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-scree cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideIncome}
              onChange={e => setHideIncome(e.target.checked)}
              className="accent-[var(--glacier)]"
            />
            Hide income-qualified programs
          </label>
        </div>

        {/* Programs by jurisdiction */}
        {visible.length === 0 ? (
          <p className="text-sm text-scree tabular-nums">No programs match the current filters.</p>
        ) : (
          JURISDICTION_ORDER.map(jur => {
            const group = visible.filter(p => p.jurisdiction === jur)
            if (!group.length) return null
            return (
              <div key={jur}>
                <h2 className="text-[13px] tabular-nums text-scree mb-3">
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
            className="text-[13px] tabular-nums text-scree hover:text-basalt underline transition-colors"
          >
            {showClosed ? 'Hide' : 'Show'} recently closed programs ({closedPrograms.length})
          </button>
          {showClosed && (
            <div className="mt-3 space-y-2">
              {closedPrograms.map(p => (
                <div key={p.id} className="border border-hairline bg-snowfield-raised px-4 py-3 text-sm rounded-[10px]">
                  <p className="text-scree font-semibold line-through">{p.name}</p>
                  <p className="text-[13px] text-scree mt-1">{p.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tip submission */}
        <div className="border border-hairline bg-snowfield-raised px-4 py-5 rounded-[10px]">
          <h2 className="text-sm font-bold text-basalt mb-1">Know something we missed?</h2>
          <p className="text-[13px] text-scree mb-4">
            Utility rebates, municipal programs, and new federal initiatives are added and removed regularly.
            If you&apos;ve found a program that isn&apos;t listed here, let us know and we&apos;ll review and add it.
          </p>
          <TipForm />
        </div>

        {/* Methodology note */}
        <p className="text-[13px] text-scree tabular-nums leading-relaxed">
          This inventory is manually verified approximately quarterly against official program pages.
          Program availability, amounts, and eligibility rules change frequently — always confirm details
          directly with the administering body before starting work. Last verified {LAST_VERIFIED}.
        </p>

      </div>
    </div>
  )
}
