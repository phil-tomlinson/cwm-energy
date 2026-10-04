'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Phase = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Shown in calculator results to let users explicitly add their current
 * comparison to the /plan page. Saves to localStorage (always) and
 * Supabase (if the user is authenticated).
 */
export default function SaveToPlanBanner({
  storageKey,
  data,
}: {
  storageKey: string
  data: unknown
}) {
  const [phase,  setPhase]  = useState<Phase>('idle')
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    import('@/lib/supabase/client')
      .then(({ createClient }) => {
        const sb = createClient()
        if (!sb) return
        sb.auth.getUser().then(({ data: d }) => setAuthed(!!d.user))
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setPhase('saving')

    // Always save to localStorage so the /plan page can read it
    try { localStorage.setItem(storageKey, JSON.stringify(data)) } catch {}

    // Also persist to Supabase for authenticated users
    if (authed) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        if (sb) {
          const { data: { user } } = await sb.auth.getUser()
          if (user) {
            const module = storageKey === 'cwm_ev' ? 'ev' : 'homeiq'
            await sb.from('saved_results').insert({ user_id: user.id, module, data })
          }
        }
      } catch {}
    }

    setPhase('saved')
  }

  // ── Saved state ───────────────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-glacier bg-glacier/5 px-4 py-3 mt-4 mb-2 rounded-[10px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 bg-glacier text-on-glacier text-[13px] flex items-center justify-center font-black flex-shrink-0">
              ✓
            </span>
            <p className="text-[13px] font-semibold text-basalt">
              Saved to your carbon reduction plan.
            </p>
          </div>
          {!authed && (
            <p className="text-[13px] text-scree">
              <Link href="/auth/login" className="text-glacier hover:underline">
                Sign in
              </Link>
              {' '}to access it from any device.
            </p>
          )}
        </div>
        <Link
          href="/plan"
          className="flex-shrink-0 text-[13px] font-bold tabular-nums bg-glacier text-on-glacier px-4 py-1.5 hover:opacity-90 transition-colors whitespace-nowrap rounded-full"
        >
          View my plan
        </Link>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex items-center justify-between gap-3 border border-fireweed bg-fireweed/5 px-4 py-3 mt-4 mb-2">
        <p className="text-[13px] text-fireweed">Couldn't save — try again.</p>
        <button
          onClick={() => setPhase('idle')}
          className="text-[13px] tabular-nums text-scree hover:text-basalt"
        >
          Dismiss
        </button>
      </div>
    )
  }

  // ── Default / saving state ────────────────────────────────────────────────
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-hairline bg-snowfield-raised px-4 py-3 mt-4 mb-2 rounded-[10px]">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-basalt">
          Happy with this comparison? Save it to your carbon reduction plan.
        </p>
        <p className="text-[13px] text-scree mt-0.5">
          Combines with your home energy analysis for a single prioritised action list.
          {authed ? ' Saved to your account.' : ' Saved locally — sign in to sync across devices.'}
        </p>
      </div>
      <button
        onClick={handleSave}
        disabled={phase === 'saving'}
        className="flex-shrink-0 text-[13px] font-bold tabular-nums px-4 py-2 border border-hairline text-basalt hover:border-glacier hover:text-glacier transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {phase === 'saving' ? 'Saving…' : '+ Save to my plan'}
      </button>
    </div>
  )
}
