'use client'
import { useState, useEffect } from 'react'

// ── Development disclaimer modal ──────────────────────────────────────────────
// Shows once per browser session (sessionStorage). Requires affirmative
// acknowledgment before the user can access any tool.
// Remove or replace with a lighter notice once the site is production-ready.

export default function DevModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('cwm_dev_notice')
      if (!dismissed) setVisible(true)
    } catch {
      // sessionStorage unavailable (e.g. private browsing restrictions) — show anyway
      setVisible(true)
    }
  }, [])

  function dismiss() {
    try { sessionStorage.setItem('cwm_dev_notice', '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-sm">
      <div className="max-w-lg w-full bg-zinc-900 border border-zinc-700">

        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-widest border border-amber-400/50 text-amber-400 px-2 py-1">
            Under Development
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
            Not production-ready
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <h2 className="text-xl font-black text-zinc-100 tracking-tight">
            Still being built!
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            This tool gives you <strong className="text-white">rough estimates</strong> to help
            you think about home upgrades. The numbers are a starting point — they
            won't be exactly right for your home.
          </p>

          <div className="border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✕ &nbsp;Not professional advice — don't use these numbers to make big money decisions
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✕ &nbsp;The estimates could be off — every home is different
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✓ &nbsp;Good for getting a rough idea of what's possible
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✓ &nbsp;Before spending money, talk to a local expert who can look at your actual home
            </p>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            By clicking below, you agree that this tool is for learning only and that
            CWM Energy is not responsible for any decisions you make based on it. See our{' '}
            <a href="/terms" className="text-zinc-400 hover:text-zinc-300 underline">Terms of Use</a>
            {' '}for more.
          </p>
        </div>

        {/* CTA */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={dismiss}
            className="w-full bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-widest px-6 py-3 hover:bg-emerald-300 transition-colors"
          >
            Got it — show me the tool
          </button>
        </div>

      </div>
    </div>
  )
}
