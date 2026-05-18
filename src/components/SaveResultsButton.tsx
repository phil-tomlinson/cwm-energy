'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Module = 'homeiq' | 'ev'
type Phase  = 'idle' | 'saving' | 'saved' | 'error' | 'noauth'

export default function SaveResultsButton({
  module,
  data,
  label,
}: {
  module: Module
  data: unknown
  label?: string
}) {
  const [phase, setPhase]   = useState<Phase>('idle')
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user))
  }, [])

  async function save() {
    const supabase = createClient()
    if (!supabase) { setPhase('noauth'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPhase('noauth'); return }

    setPhase('saving')
    const { error } = await supabase.from('saved_results').insert({
      user_id: user.id,
      module,
      label: label ?? (module === 'homeiq' ? 'Home Heat Loss' : 'EV Comparison'),
      data,
    })

    setPhase(error ? 'error' : 'saved')
    if (!error) setTimeout(() => setPhase('idle'), 3000)
  }

  if (!authed) {
    return (
      <p className="text-[11px] text-zinc-400 font-mono">
        <a href="/auth/login" className="text-emerald-400 hover:underline">Sign in</a> to save these results to your account.
      </p>
    )
  }

  return (
    <button
      onClick={save}
      disabled={phase === 'saving' || phase === 'saved'}
      className={`text-xs uppercase tracking-widest font-bold px-4 py-2 border transition-colors ${
        phase === 'saved'
          ? 'border-emerald-400 text-emerald-400 cursor-default'
          : phase === 'error'
            ? 'border-red-400 text-red-400'
            : 'border-zinc-700 text-zinc-400 hover:border-emerald-400 hover:text-emerald-400'
      }`}
    >
      {phase === 'saving' ? 'Saving…'
        : phase === 'saved' ? '✓ Saved to account'
        : phase === 'error' ? 'Error — try again'
        : 'Save to account'}
    </button>
  )
}
