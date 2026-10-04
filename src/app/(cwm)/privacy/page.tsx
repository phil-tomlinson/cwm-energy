export const metadata = {
  title: 'Privacy Policy — CWM Energy',
  description: 'Privacy policy for CWM Energy.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Draft notice */}
        <div className="rounded-[10px] border-2 border-larch px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-[13px] font-semibold rounded-[4px] bg-larch text-on-larch px-2 py-0.5 shrink-0 mt-0.5">
            Draft
          </span>
          <p className="text-[13px] text-scree leading-relaxed">
            This is a working draft. A formal privacy policy compliant with PIPEDA and Alberta&apos;s
            PIPA will be published once CWM Energy&apos;s legal entity is established.
          </p>
        </div>

        <h1 className="m-0 mb-2 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] text-basalt sm:text-[48px] sm:leading-[50px]">Privacy policy</h1>
        <p className="tabular-nums text-[13px] text-scree mb-8">
          Last updated: May 2026, applicable law: PIPEDA · Alberta PIPA
        </p>

        <div className="space-y-8 text-basalt">

          <section>
            <h2 className="text-[19px] font-bold text-basalt mb-2">What we collect</h2>
            <p className="mb-3">
              CWM Energy&apos;s calculators run entirely in your browser. The inputs you enter
              (home details, province, vehicle data, etc.) are stored locally on your device using
              your browser&apos;s localStorage — they are not transmitted to or stored on our servers.
            </p>
            <p>
              We collect basic, anonymised usage analytics through{' '}
              <a href="https://vercel.com/analytics" target="_blank" rel="noreferrer" className="text-glacier hover:underline">
                Vercel Analytics
              </a>{' '}
              and Speed Insights. This includes page views, general location (country/region level),
              device type, and performance metrics. No personally identifiable information is
              collected through analytics.
            </p>
          </section>

          <section>
            <h2 className="text-[19px] font-bold text-basalt mb-2">Accounts</h2>
            <p>
              If you create an account, your email address, any saved calculator results and your
              footprint timeline (the homes, upgrades and vehicles you enter, with their dates) are
              stored securely via Supabase. We do not sell, share, or use this data for advertising.
              Account data is used solely to save your work and let you return to it on any device.
              You can delete your timeline at any time from the timeline page.
            </p>
          </section>

          <section>
            <h2 className="text-[19px] font-bold text-basalt mb-2">Cookies</h2>
            <p>
              We use only functional cookies necessary for authentication (if you create an account).
              No third-party advertising or tracking cookies are set.
            </p>
          </section>

          <section>
            <h2 className="text-[19px] font-bold text-basalt mb-2">Your rights</h2>
            <p>
              Under PIPEDA and Alberta&apos;s PIPA, you have the right to access, correct, or request
              deletion of any personal information we hold about you. To exercise these rights,
              contact us at{' '}
              <a href="mailto:info@cwmenergy.ca" className="text-glacier hover:underline">
                info@cwmenergy.ca
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-[19px] font-bold text-basalt mb-2">Contact</h2>
            <p>
              Privacy questions:{' '}
              <a href="mailto:info@cwmenergy.ca" className="text-glacier hover:underline">
                info@cwmenergy.ca
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
