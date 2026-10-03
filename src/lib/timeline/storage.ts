// Local-first storage: the timeline lives in this browser unless the person
// chooses to sign in (syncing is a later phase). Every access is guarded, because
// storage can be blocked in private windows.

import type { Timeline } from './types'

const TIMELINE_KEY = 'cwm_timeline_v1'
const VISIT_KEY = 'cwm_last_visit_v1'

function notify() {
  try { window.dispatchEvent(new Event('cwm-storage')) } catch {}
}

export interface LastVisit {
  at: string
  kgToDate: number
  dollarsToDate: number
}

export function loadTimeline(): Timeline | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TIMELINE_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as Timeline
    return t?.version === 1 ? t : null
  } catch {
    return null
  }
}

export function saveTimeline(t: Timeline): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TIMELINE_KEY, JSON.stringify({ ...t, updatedAt: new Date().toISOString() }))
    notify()
  } catch {
    // Storage blocked: the page still works for this visit.
  }
}

/** Store a timeline exactly as given (used when restoring from your account). */
export function replaceTimeline(t: Timeline): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(t))
    notify()
  } catch {}
}

export function clearTimeline(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(TIMELINE_KEY)
    localStorage.removeItem(VISIT_KEY)
    notify()
  } catch {}
}

export function loadLastVisit(): LastVisit | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(VISIT_KEY)
    return raw ? (JSON.parse(raw) as LastVisit) : null
  } catch {
    return null
  }
}

export function saveLastVisit(v: LastVisit): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(VISIT_KEY, JSON.stringify(v))
  } catch {}
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
