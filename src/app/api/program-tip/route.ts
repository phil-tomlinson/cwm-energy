import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Program Tips API ──────────────────────────────────────────────────────────
// Accepts a user-submitted tip about a funding program we may have missed and
// inserts it into the program_tips Supabase table.
//
// Required Supabase table (run once):
//   create table program_tips (
//     id          bigserial primary key,
//     created_at  timestamptz default now(),
//     program_name text not null,
//     url          text,
//     description  text not null,
//     province     text,
//     email        text
//   );
//   -- Allow anonymous inserts:
//   create policy "Anyone can submit a tip"
//     on program_tips for insert to anon with check (true);
//   alter table program_tips enable row level security;

const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT  = 3
const RATE_WINDOW = 10 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  for (const [key, val] of rateMap) {
    if (now > val.resetAt) rateMap.delete(key)
  }
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const programName = typeof body.programName === 'string' ? body.programName.trim().slice(0, 200) : ''
  const url         = typeof body.url         === 'string' ? body.url.trim().slice(0, 500)         : null
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : ''
  const province    = typeof body.province    === 'string' ? body.province.trim().slice(0, 50)      : null
  const email       = typeof body.email       === 'string' ? body.email.trim().slice(0, 200)        : null

  const errors: string[] = []
  if (!programName || programName.length < 3) errors.push('Program name is required')
  if (!description || description.length < 10) errors.push('Please add a brief description (at least 10 characters)')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email format invalid')

  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 422 })
  }

  const db = supabase()
  if (!db) {
    console.warn('[/api/program-tip] Supabase not configured; tip not stored:', { programName })
    return NextResponse.json({ ok: true, warn: 'storage_unavailable' })
  }

  const { error } = await db.from('program_tips').insert({
    program_name: programName,
    url:          url || null,
    description,
    province:     province || null,
    email:        email || null,
  })

  if (error) {
    console.error('[/api/program-tip] insert error:', error)
    return NextResponse.json({ error: 'Failed to save tip' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
