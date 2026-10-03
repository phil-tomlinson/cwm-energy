'use client'
import { useEffect, useRef, useSyncExternalStore, useState } from 'react'

// ── Development notice ───────────────────────────────────────────────────────
// Shows once per browser session (sessionStorage) and asks for an explicit
// acknowledgment before the tools are used. Replace with a lighter notice once
// the site is production-ready.

const KEY = 'cwm_dev_notice'

function readDismissed(): boolean {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export default function DevModal() {
  const dismissedAtLoad = useSyncExternalStore(() => () => {}, readDismissed, () => true)
  const [dismissed, setDismissed] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const visible = !dismissedAtLoad && !dismissed

  useEffect(() => { if (visible) buttonRef.current?.focus() }, [visible])

  function dismiss() {
    try { sessionStorage.setItem(KEY, '1') } catch {}
    setDismissed(true)
  }

  if (!visible) return null

  return (
    <div className="cwm fixed inset-0 z-[200] flex items-center justify-center bg-[#0D2230]/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-notice-title"
        className="flex w-full max-w-[520px] flex-col gap-4 rounded-[10px] bg-snowfield-raised p-6 text-basalt"
      >
        <h2 id="dev-notice-title" className="m-0 text-[26px] font-extrabold leading-[32px]">Still being built.</h2>
        <p className="m-0">
          CWM Energy gives you rough estimates to help you think about your footprint and home upgrades. They&apos;re a
          starting point and won&apos;t be exactly right for your home.
        </p>
        <ul className="m-0 flex flex-col gap-1 pl-5 text-[15px] leading-[22px] text-scree">
          <li>It isn&apos;t professional advice. Don&apos;t make big money decisions on these numbers alone.</li>
          <li>Every home is different, so the estimates could be off.</li>
          <li>Before spending money, talk to a local expert who can look at your actual home.</li>
        </ul>
        <p className="m-0 text-[13px] leading-[18px] text-scree">
          By continuing, you agree that this site is for learning only and that CWM Energy isn&apos;t responsible for
          decisions you make based on it. See our <a href="/terms" className="text-glacier underline">Terms of Use</a>.
        </p>
        <button
          ref={buttonRef}
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-full bg-glacier px-6 py-3 font-bold text-on-glacier"
        >
          I understand, continue
        </button>
      </div>
    </div>
  )
}
