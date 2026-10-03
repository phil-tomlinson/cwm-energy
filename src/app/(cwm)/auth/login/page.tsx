'use client'
import { useId, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Sign in or create an account with a one-time email link: no password.
// The same flow does both; Supabase creates the account on first use.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateEmail(email: string): string | null {
  const v = email.trim()
  if (!v) return 'Enter your email address.'
  if (!v.includes('@')) return 'Add the @ to your email address.'
  const [local, domain] = v.split('@')
  if (!local) return 'Add the part before the @.'
  if (!domain || !domain.includes('.')) return 'Check the part after the @.'
  if (!EMAIL_RE.test(v)) return 'Check your email address for typos.'
  return null
}

/** Only same-site paths, so the link can't send people elsewhere. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/my-footprint'
}

type Phase = 'idle' | 'sending' | 'sent' | 'error'

const noSubscribe = () => () => {}

export default function LoginPage() {
  const id = useId()
  const params = useSyncExternalStore(
    noSubscribe,
    () => window.location.search,
    () => '',
  )
  const search = new URLSearchParams(params)
  const next = safeNext(search.get('next'))
  const linkError = search.get('error')

  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [serverErr, setServerErr] = useState('')

  const validationErr = touched ? validateEmail(email) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (validateEmail(email)) return

    setPhase('sending')
    setServerErr('')
    const supabase = createClient()
    if (!supabase) {
      setServerErr('Accounts aren’t switched on for this site yet. Your timeline is still saved in this browser.')
      setPhase('error')
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (error) {
      setServerErr(`We couldn’t send the link: ${error.message}`)
      setPhase('error')
    } else {
      setPhase('sent')
    }
  }

  if (phase === 'sent') {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 py-14 sm:px-6">
        <h1 className="m-0 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[40px] sm:leading-[44px]">Check your email.</h1>
        <p className="m-0">
          We sent a sign-in link to <strong>{email.trim().toLowerCase()}</strong>. Open it on this device and you’ll come
          straight back here, signed in. Your timeline saves to your account from then on.
        </p>
        <p className="m-0 text-[15px] text-scree">
          Nothing there? Check your spam folder, or{' '}
          <button type="button" className="font-semibold text-glacier underline" onClick={() => { setPhase('idle'); setTouched(false) }}>
            use a different address
          </button>.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-4 py-14 sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[40px] sm:leading-[44px]">
          Save your timeline to an account.
        </h1>
        <p className="m-0">
          Without an account, your timeline lives only in this browser. With one, it’s kept safe if you clear your
          browser, and it follows you to your phone or another computer.
        </p>
        <p className="m-0 text-[15px] text-scree">
          No password: we email you a link each time you sign in. New here? The same link creates your account.
        </p>
      </div>

      {linkError && (
        <p role="alert" className="m-0 rounded-[10px] border-2 border-fireweed p-4">
          That sign-in link has expired or was already used. Send yourself a new one below.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-[10px] border border-hairline bg-snowfield-raised p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-[15px] font-semibold">Email address</label>
          <input
            id={id}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!validationErr}
            aria-describedby={validationErr ? `${id}-error` : undefined}
            className="h-11 w-full rounded-[4px] border border-hairline bg-snowfield-raised px-3 text-[17px] text-basalt"
          />
          {validationErr && <p id={`${id}-error`} className="m-0 text-[15px] text-fireweed">{validationErr}</p>}
        </div>
        {serverErr && phase === 'error' && <p role="alert" className="m-0 text-[15px] text-fireweed">{serverErr}</p>}
        <button
          type="submit"
          disabled={phase === 'sending'}
          className="min-h-11 rounded-full bg-glacier px-6 py-3 font-bold text-on-glacier disabled:opacity-60"
        >
          {phase === 'sending' ? 'Sending your link' : 'Email me a sign-in link'}
        </button>
        <p className="m-0 text-[13px] leading-[18px] text-scree">
          We only use your email to sign you in. We never share or sell it. See our <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </form>
    </div>
  )
}
