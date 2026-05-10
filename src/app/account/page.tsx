import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Account — CWM Energy' }

async function DeleteButton({ id }: { id: string }) {
  // Server action for deletion
  async function del() {
    'use server'
    const supabase = await createClient()
    if (!supabase) return
    await supabase.from('saved_results').delete().eq('id', id)
    redirect('/account')
  }
  return (
    <form action={del}>
      <button className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 hover:text-red-400 transition-colors">
        Delete
      </button>
    </form>
  )
}

export default async function AccountPage() {
  const supabase = await createClient()

  if (!supabase) {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
        <p className="text-zinc-500 font-mono text-sm">Auth service not configured.</p>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/account')

  const { data: rows } = await supabase
    .from('saved_results')
    .select('id, module, label, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const homeiqRows = rows?.filter(r => r.module === 'homeiq') ?? []
  const evRows     = rows?.filter(r => r.module === 'ev')     ?? []

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })

  async function signOut() {
    'use server'
    const supabase = await createClient()
    if (supabase) await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">Account</p>
            <h1 className="text-base font-black text-zinc-100 tracking-tight">{user.email}</h1>
          </div>
          <form action={signOut}>
            <button className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors border border-zinc-700 px-3 py-1.5">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* Plan CTA */}
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-6 flex items-center justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">Ready to act?</p>
            <p className="text-sm font-bold text-zinc-200">Build your carbon reduction plan</p>
            <p className="text-xs text-zinc-500 mt-1">Cross-module prioritised actions — ranked by payback or emissions impact.</p>
          </div>
          <Link
            href="/plan"
            className="shrink-0 bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-widest px-5 py-2.5 hover:bg-emerald-300 transition-colors"
          >
            Build plan →
          </Link>
        </div>

        {/* Saved results */}
        {[
          { label: 'Home Heat Loss', rows: homeiqRows, href: '/calculator', module: 'homeiq' },
          { label: 'EV Comparison',  rows: evRows,     href: '/ev-benefit-calculator', module: 'ev' },
        ].map(({ label, rows, href, module }) => (
          <section key={module}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
              <Link href={href} className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:underline">
                Run calculator →
              </Link>
            </div>

            {rows.length === 0 ? (
              <div className="border border-zinc-800 bg-zinc-900 p-5 text-xs text-zinc-600">
                No saved results yet.{' '}
                <Link href={href} className="text-emerald-400 hover:underline">Run the {label.toLowerCase()} calculator</Link> and save your results.
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(row => (
                  <div key={row.id} className="border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{row.label}</p>
                      <p className="font-mono text-[10px] text-zinc-600 mt-0.5">{fmt(row.created_at)}</p>
                    </div>
                    <DeleteButton id={row.id} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

      </div>
    </div>
  )
}
