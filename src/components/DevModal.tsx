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
            This tool is a work in progress
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed">
            CWM Energy is under active development. The calculators here produce{' '}
            <strong className="text-white">rough estimates that can be substantially wrong</strong>{' '}
            for your specific situation.
          </p>

          <div className="border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✕ &nbsp;Not financial, engineering, or professional advice of any kind
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✕ &nbsp;No warranty of accuracy, completeness, or fitness for any purpose
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✕ &nbsp;Do not make investment or purchasing decisions based on these numbers alone
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✓ &nbsp;Useful for understanding what <em>might</em> be possible — a thought experiment
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              ✓ &nbsp;Always verify with a qualified local professional before acting
            </p>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            By continuing, you acknowledge that this tool is provided for informational and
            educational purposes only, and that CWM Energy accepts no liability for decisions
            made based on its output. See our{' '}
            <a href="/terms" className="text-zinc-400 hover:text-zinc-300 underline">Terms of Use</a>
            {' '}for full details.
          </p>
        </div>

        {/* CTA */}
        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={dismiss}
            className="w-full bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-widest px-6 py-3 hover:bg-emerald-300 transition-colors"
          >
            I understand — show me the tool
          </button>
        </div>

      </div>
    </div>
  )
}
