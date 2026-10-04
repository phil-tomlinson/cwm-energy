import { redirect } from 'next/navigation'
import PageHeader from "@/components/cwm/PageHeader"
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
      <button className="text-[13px] tabular-nums text-scree hover:text-fireweed transition-colors">
        Delete
      </button>
    </form>
  )
}

export default async function AccountPage() {
  const supabase = await createClient()

  if (!supabase) {
    return (
      <div className="bg-snowfield min-h-screen flex items-center justify-center">
        <p className="text-scree tabular-nums text-sm">Auth service not configured.</p>
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
    <div className="min-h-screen">
      <PageHeader width="max-w-3xl" title="Your account" intro={<>Signed in as <strong className="text-basalt">{user.email}</strong>.</>}>
        <form action={signOut}>
          <button className="min-h-11 rounded-full border-2 border-hairline px-5 font-semibold text-basalt">
            Sign out
          </button>
        </form>
      </PageHeader>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 space-y-10">
        <section className="rounded-[10px] border border-hairline bg-snowfield-raised p-6 flex flex-col gap-2">
          <h2 className="m-0 text-[22px] font-bold leading-[28px]">Your timeline</h2>
          <p className="m-0 text-scree">Your timeline saves to this account automatically while you&apos;re signed in, and follows you to any device you sign in on.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/my-footprint" className="font-semibold text-glacier underline">See your footprint</Link>
            <Link href="/start" className="font-semibold text-glacier underline">Edit or delete your timeline</Link>
          </div>
        </section>

        {/* Plan CTA */}
        <div className="border border-glacier bg-glacier/5 p-6 flex items-center justify-between gap-6 rounded-[10px]">
          <div>
            <p className="text-[17px] font-bold text-basalt mb-1">Ready to act?</p>
            <p className="text-sm font-bold text-basalt">Build your carbon reduction plan</p>
            <p className="text-[13px] text-scree mt-1">Cross-module prioritised actions — ranked by payback or emissions impact.</p>
          </div>
          <Link
            href="/plan"
            className="shrink-0 bg-glacier text-on-glacier font-black text-[13px] px-5 py-2.5 hover:opacity-90 transition-colors rounded-full"
          >
            Build plan
          </Link>
        </div>

        {/* Saved results */}
        {[
          { label: 'Home Heat Loss', rows: homeiqRows, href: '/calculator', module: 'homeiq' },
          { label: 'EV Comparison',  rows: evRows,     href: '/ev-benefit-calculator', module: 'ev' },
        ].map(({ label, rows, href, module }) => (
          <section key={module}>
            <div className="flex items-center justify-between mb-4">
              <p className="tabular-nums text-[13px] text-scree">{label}</p>
              <Link href={href} className="text-[13px] tabular-nums text-glacier hover:underline">
                Run calculator
              </Link>
            </div>

            {rows.length === 0 ? (
              <div className="border border-hairline bg-snowfield-raised p-5 text-[13px] text-scree rounded-[10px]">
                No saved results yet.{' '}
                <Link href={href} className="text-glacier hover:underline">Run the {label.toLowerCase()} calculator</Link> and save your results.
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(row => (
                  <div key={row.id} className="border border-hairline bg-snowfield-raised px-4 py-3 flex items-center justify-between gap-4 rounded-[10px]">
                    <div>
                      <p className="text-sm font-semibold text-basalt">{row.label}</p>
                      <p className="tabular-nums text-[13px] text-scree mt-0.5">{fmt(row.created_at)}</p>
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
