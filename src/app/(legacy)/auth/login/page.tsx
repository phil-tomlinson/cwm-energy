'use client'
import { useState, useId } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── Email validation ─────────────────────────────────────────────────────
// RFC-5321 compliant enough for UX purposes.
// The magic link delivery is the true validation gate.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateEmail(email: string): string | null {
  const v = email.trim()
  if (!v)              return 'Enter your email address.'
  if (!v.includes('@')) return 'Missing @ — check your email address.'
  const [local, domain] = v.split('@')
  if (!local)          return 'Missing address before the @.'
  if (!domain || !domain.includes('.')) return 'Incomplete domain — check the part after @.'
  if (!EMAIL_RE.test(v)) return 'That doesn\'t look like a valid email address.'
  return null
}

type Phase = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const id = useId()
  const [email,     setEmail]     = useState('')
  const [touched,   setTouched]   = useState(false)
  const [phase,     setPhase]     = useState<Phase>('idle')
  const [serverErr, setServerErr] = useState('')

  const validationErr = touched ? validateEmail(email) : null
  const isValid       = validateEmail(email) === null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    const err = validateEmail(email)
    if (err) return

    setPhase('sending')
    setServerErr('')

    const supabase = createClient()
    if (!supabase) {
      setServerErr('Auth service not configured. Contact info@cwmenergy.ca.')
      setPhase('error')
      return
    }

    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })

    if (error) {
      setServerErr(error.message)
      setPhase('error')
    } else {
      setPhase('sent')
    }
  }

  // ── Sent state ───────────────────────────────────────────────────────
  if (phase === 'sent') {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="border border-zinc-800 bg-zinc-900 p-8">
            <div className="w-8 h-8 bg-emerald-400 flex items-center justify-center mb-6">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l4 4 8-8" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">Check your inbox</p>
            <h1 className="text-xl font-black text-zinc-100 tracking-tight mb-3">Magic link sent</h1>
            <p className="text-sm text-zinc-300 leading-relaxed mb-6">
              We sent a sign-in link to{' '}
              <span className="text-zinc-200 font-mono">{email.trim().toLowerCase()}</span>.
              Click it to sign in — no password needed.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Didn't receive it? Check your spam folder, or{' '}
              <button
                className="text-emerald-400 underline hover:no-underline"
                onClick={() => { setPhase('idle'); setTouched(false) }}
              >
                try a different address
              </button>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Form state ───────────────────────────────────────────────────────
  return (
    <div className="bg-zinc-950 min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-5 h-5 bg-emerald-400 flex items-center justify-center">
              <span className="text-zinc-950 text-[8px] font-black tracking-tighter">CWM</span>
            </div>
            <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">CWM Energy</span>
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">Sign in</p>
          <h1 className="text-2xl font-black text-zinc-100 tracking-tight">Save your results.</h1>
          <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
            Enter your email and we'll send you a magic link — no password, no friction.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-5">
            <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-2">
              Email address
            </label>
            <input
              id={id}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="you@example.com"
              aria-invalid={!!validationErr}
              aria-describedby={validationErr ? `${id}-error` : undefined}
              className={`w-full bg-zinc-950 border px-4 py-3 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 transition-colors ${
                validationErr
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-zinc-700 focus:border-emerald-400'
              }`}
            />
            {validationErr && (
              <p id={`${id}-error`} className="mt-2 text-xs text-red-400 font-mono">
                {validationErr}
              </p>
            )}
          </div>

          {serverErr && phase === 'error' && (
            <p className="mb-4 text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 font-mono">
              {serverErr}
            </p>
          )}

          <button
            type="submit"
            disabled={phase === 'sending' || (touched && !isValid)}
            className="w-full bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-widest py-3 hover:bg-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            {phase === 'sending' ? 'Sending…' : 'Send magic link →'}
          </button>

          <p className="mt-4 text-xs text-zinc-400 leading-relaxed text-center">
            By signing in you agree to our{' '}
            <Link href="/about" className="text-zinc-400 hover:text-zinc-300 underline">terms of use</Link>.
            We never share your email.
          </p>
        </form>

      </div>
    </div>
  )
}
