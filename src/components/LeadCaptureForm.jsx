'use client'
import { useState } from 'react'

// ── Copy variants by interest type ────────────────────────────────────────────
const COPY = {
  solar: {
    badge:    'Solar PV',
    headline: 'Get a free site assessment',
    sub:      'A certified solar installer will assess your roof and give you '
              + 'precise production estimates and an installation quote — typically at no cost.',
    button:   'Connect me with local solar installers',
    success:  'Most solar assessments are free and take 30–60 minutes. '
              + 'Your installer will give you precise numbers based on your actual roof.',
  },
  heat_pump: {
    badge:    'Heat pump',
    headline: 'Get quotes from local HVAC contractors',
    sub:      'Connect with certified heat pump installers in your area for a free '
              + 'in-home assessment and installation quote.',
    button:   'Connect me with local HVAC contractors',
    success:  'HVAC quotes are typically free and include a heat load calculation '
              + 'to ensure the system is correctly sized for your home.',
  },
  insulation: {
    badge:    'Insulation',
    headline: 'Get quotes for insulation upgrades',
    sub:      'Connect with local insulation contractors for a free assessment and quote. '
              + 'Many upgrades qualify for Canada Greener Homes grants.',
    button:   'Connect me with local contractors',
    success:  'A contractor will identify the highest-value areas to insulate and '
              + 'can advise on available rebates and grants in your province.',
  },
  water_heater: {
    badge:    'Water heater',
    headline: 'Get quotes for a water heater upgrade',
    sub:      'Connect with local plumbers and HVAC contractors for a free quote '
              + 'on heat pump water heaters and other high-efficiency options.',
    button:   'Connect me with local contractors',
    success:  'Heat pump water heaters typically qualify for provincial rebates — '
              + 'your contractor can advise on what\'s currently available in your area.',
  },
  home_efficiency: {
    badge:    'Home efficiency',
    headline: 'Connect with a local efficiency contractor',
    sub:      'Get quotes from contractors who can implement the upgrades with '
              + 'the best payback for your specific home.',
    button:   'Connect me with local contractors',
    success:  'An energy contractor will assess your home and provide a detailed '
              + 'quote for the most cost-effective upgrades.',
  },
  general: {
    badge:    'Home efficiency',
    headline: 'Get a free contractor assessment',
    sub:      'Connect with local contractors for precise quotes on your home\'s '
              + 'most cost-effective energy upgrades.',
    button:   'Connect me with local contractors',
    success:  'We\'ll follow up with local contractor recommendations for your area.',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, required, placeholder, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-300 mb-1">
        {label}{required && <span className="text-zinc-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-600
                   px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400
                   focus:border-emerald-400 transition-colors"
      />
      {hint && <p className="text-[10px] text-zinc-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function SuccessState({ copy, name, city, province }) {
  const location = [city, province].filter(Boolean).join(', ')
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-emerald-400 flex items-center justify-center shrink-0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#09090b" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">Request received</p>
      </div>
      <p className="text-sm font-semibold text-zinc-200 mb-2">
        Thanks{name ? `, ${name.split(' ')[0]}` : ''} — we&apos;ll be in touch shortly
        {location ? ` with options for ${location}` : ''}.
      </p>
      <p className="text-xs text-zinc-400 leading-relaxed">{copy.success}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {{
 *   interest?: 'solar'|'heat_pump'|'insulation'|'water_heater'|'home_efficiency'|'general'
 *   prefill?:  { province?: string, city?: string, houseType?: string }
 *   context?:  Record<string, unknown>
 * }} props
 */
export default function LeadCaptureForm({ interest = 'general', prefill = {}, context = {} }) {
  const copy = COPY[interest] ?? COPY.general

  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [consent, setConsent] = useState(false)
  const [status,  setStatus]  = useState('idle')  // 'idle' | 'submitting' | 'success' | 'error'
  const [errMsg,  setErrMsg]  = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!consent) return
    setStatus('submitting')
    setErrMsg('')

    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone:    phone || null,
          province: prefill.province ?? null,
          city:     prefill.city     ?? null,
          interest,
          context:  { ...prefill, ...context },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }
  }

  return (
    <div className="border border-emerald-400/20 bg-zinc-900">

      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            {copy.badge}
          </p>
          <span className="font-mono text-[9px] border border-emerald-400/30 text-emerald-400/60
                           px-1.5 py-0.5 uppercase tracking-widest">
            Free quotes
          </span>
        </div>
        <h3 className="text-sm font-bold text-zinc-100">{copy.headline}</h3>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{copy.sub}</p>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {status === 'success' ? (
          <SuccessState copy={copy} name={name} city={prefill.city} province={prefill.province} />
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Name"
                  value={name}
                  onChange={setName}
                  required
                  placeholder="Jane Smith"
                />
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  placeholder="jane@example.com"
                />
              </div>
              <Field
                label="Phone"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="403-555-0100"
                hint="Optional — some contractors prefer to call"
              />
            </div>

            {/* Location display */}
            {(prefill.city || prefill.province) && (
              <p className="text-[10px] font-mono text-zinc-500 mb-4">
                Location: {[prefill.city, prefill.province].filter(Boolean).join(', ')}
                {prefill.houseType ? ` · ${prefill.houseType}` : ''}
              </p>
            )}

            {/* Consent */}
            <label className="flex items-start gap-3 mb-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 shrink-0 accent-emerald-400"
                required
              />
              <span className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                I&apos;m happy to be contacted by local contractors about this upgrade.
                My contact details will not be used for any other purpose.
              </span>
            </label>

            {/* Error */}
            {status === 'error' && (
              <p className="text-xs text-red-400 mb-3 leading-relaxed">
                {errMsg || 'Something went wrong. Please try again or email us directly.'}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!consent || status === 'submitting'}
              className="w-full bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-widest
                         px-6 py-3 hover:bg-emerald-300 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Sending…' : copy.button + ' →'}
            </button>

          </form>
        )}
      </div>

    </div>
  )
}
