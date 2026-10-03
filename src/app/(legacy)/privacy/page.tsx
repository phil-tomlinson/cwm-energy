export const metadata = {
  title: 'Privacy Policy — CWM Energy',
  description: 'Privacy policy for CWM Energy.',
}

export default function PrivacyPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Draft notice */}
        <div className="border border-amber-400/40 bg-amber-400/5 px-4 py-3 mb-8 flex items-start gap-3">
          <span className="font-mono text-[9px] uppercase tracking-widest border border-amber-400/50 text-amber-400 px-2 py-0.5 shrink-0 mt-0.5">
            Draft
          </span>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This is a working draft. A formal privacy policy compliant with PIPEDA and Alberta&apos;s
            PIPA will be published once CWM Energy&apos;s legal entity is established.
          </p>
        </div>

        <h1 className="text-2xl font-black text-zinc-100 tracking-tight mb-1">Privacy Policy</h1>
        <p className="font-mono text-xs text-zinc-500 mb-8">
          Last updated: May 2026 · Applicable law: PIPEDA · Alberta PIPA
        </p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">What we collect</h2>
            <p className="mb-3">
              CWM Energy&apos;s calculators run entirely in your browser. The inputs you enter
              (home details, province, vehicle data, etc.) are stored locally on your device using
              your browser&apos;s localStorage — they are not transmitted to or stored on our servers.
            </p>
            <p>
              We collect basic, anonymised usage analytics through{' '}
              <a href="https://vercel.com/analytics" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                Vercel Analytics
              </a>{' '}
              and Speed Insights. This includes page views, general location (country/region level),
              device type, and performance metrics. No personally identifiable information is
              collected through analytics.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">Accounts</h2>
            <p>
              If you create an account, your email address and any saved calculator results are
              stored securely via Supabase. We do not sell, share, or use this data for advertising.
              Account data is used solely to provide the &ldquo;save and return to your plan&rdquo; feature.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">Cookies</h2>
            <p>
              We use only functional cookies necessary for authentication (if you create an account).
              No third-party advertising or tracking cookies are set.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">Your rights</h2>
            <p>
              Under PIPEDA and Alberta&apos;s PIPA, you have the right to access, correct, or request
              deletion of any personal information we hold about you. To exercise these rights,
              contact us at{' '}
              <a href="mailto:info@cwmenergy.ca" className="text-emerald-400 hover:underline">
                info@cwmenergy.ca
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest mb-3">Contact</h2>
            <p>
              Privacy questions:{' '}
              <a href="mailto:info@cwmenergy.ca" className="text-emerald-400 hover:underline">
                info@cwmenergy.ca
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
