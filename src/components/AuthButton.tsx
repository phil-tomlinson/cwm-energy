'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function AuthButton({ mobile = false }: { mobile?: boolean }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) { setReady(true); return }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!ready) return null

  if (!user) {
    return mobile ? (
      <Link
        href="/auth/login"
        className="text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        Sign in
      </Link>
    ) : (
      <Link
        href="/auth/login"
        className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        Sign in
      </Link>
    )
  }

  const short = user.email?.split('@')[0] ?? 'Account'

  return mobile ? (
    <div className="flex flex-col gap-3">
      <Link href="/account" className="text-xs uppercase tracking-widest text-emerald-400">
        {short}
      </Link>
      <button onClick={signOut} className="text-xs uppercase tracking-widest text-zinc-400 text-left">
        Sign out
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-4">
      <Link
        href="/account"
        className="text-[11px] uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        {short}
      </Link>
      <button
        onClick={signOut}
        className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
