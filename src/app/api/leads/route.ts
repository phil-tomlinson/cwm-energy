import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Leads API ─────────────────────────────────────────────────────────────────
// Accepts a contractor lead submission, validates it, and inserts into Supabase.
// Uses service-role key if available (bypasses RLS); falls back to anon key
// which requires the "Anyone can submit a lead" INSERT policy on the leads table.

const VALID_INTERESTS = [
  'solar', 'heat_pump', 'insulation', 'water_heater', 'home_efficiency', 'general',
] as const

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY   // server-only, not exposed to browser
           ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Validate required fields ────────────────────────────────────────────────
  const name     = (typeof body.name  === 'string' ? body.name.trim()  : '')
  const email    = (typeof body.email === 'string' ? body.email.trim() : '')
  const phone    = (typeof body.phone === 'string' ? body.phone.trim() : null) || null
  const province = (typeof body.province === 'string' ? body.province : null) || null
  const city     = (typeof body.city     === 'string' ? body.city     : null) || null
  const interest = VALID_INTERESTS.includes(body.interest as typeof VALID_INTERESTS[number])
    ? (body.interest as string)
    : 'general'
  const context  = body.context && typeof body.context === 'object' ? body.context : null

  const errors: string[] = []
  if (!name  || name.length  < 2)  errors.push('name: must be at least 2 characters')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email: invalid format')

  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 422 })
  }

  // ── Insert ──────────────────────────────────────────────────────────────────
  const db = supabase()
  if (!db) {
    // Supabase not configured — log and return success so the UX isn't broken
    console.warn('[/api/leads] Supabase not configured; lead not stored:', { name, email, interest })
    return NextResponse.json({ ok: true, warn: 'storage_unavailable' })
  }

  const { error } = await db.from('leads').insert({
    name, email, phone, province, city, interest, context,
  })

  if (error) {
    console.error('[/api/leads] insert error:', error)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
