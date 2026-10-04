import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen px-4 sm:px-6 pt-14 pb-20">
      <div className="max-w-2xl mx-auto">

        <h1 className="m-0 mb-8 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] text-basalt sm:text-[48px] sm:leading-[50px]">
          Built by an engineer who gives a damn.
        </h1>

        {/* The name */}
        <div className="mb-10 rounded-[10px] bg-snowfield-raised border border-hairline p-6">
          <p className="text-basalt leading-relaxed mb-3">
            A <strong className="text-basalt">cwm</strong> (pronounced <em>coom</em>) is a high
            mountain valley carved by glaciers — a bowl of stillness surrounded by peaks. It&apos;s
            an obscure English word, and a deliberate choice. We think about energy the same way:
            find the right terrain, understand the forces at work, and you can do a lot with very
            little.
          </p>
        </div>

        {/* Story */}
        <div className="space-y-5 text-scree leading-relaxed mb-12">
          <p>
            CWM Energy started in the industrial energy sector — helping oil and gas operators
            understand where their emissions were actually coming from and what it would cost to
            reduce them. The methodology was rigorous, the analysis was quantitative, and the
            results were actionable. That approach works just as well on a house in Calgary as it
            does on a compressor station.
          </p>
          <p>
            The tools on this site are the residential version of that same thinking. We built them
            for ourselves first — to understand our own homes, our own footprints, our own
            trade-offs. Now they&apos;re available to anyone.
          </p>
          <p>
            Every calculation uses established Canadian methodology — NRCan data, NBCC climate
            tables, real provincial energy prices. No vague estimates, no greenwashing. Just
            numbers you can act on.
          </p>
        </div>

        {/* Manifesto line */}
        <div className="border-y border-hairline py-8 mb-12 text-center">
          <p className="text-xl font-black tracking-tight text-basalt">
            Sustainability doesn&apos;t mean doing less.<br />
            <span className="text-glacier">It means doing better.</span>
          </p>
        </div>

        {/* Open source */}
        <div className="mb-12">
          <h2 className="text-[13px] text-scree tabular-nums mb-4">Open Source</h2>
          <p className="text-scree leading-relaxed mb-4">
            The calculation engines behind these tools are open source and peer-reviewable. If
            you&apos;re an engineer, an energy nerd, or just someone who wants to check our math —
            the code is on GitHub. Pull requests welcome.
          </p>
          <a
            href="https://github.com/phil-tomlinson/cwm-energy"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[13px] text-glacier tabular-nums border border-glacier px-4 py-2 hover:border-glacier transition-colors"
          >
            View on GitHub
          </a>
        </div>

        {/* Contact */}
        <div className="border-t border-hairline pt-8">
          <h2 className="text-[13px] text-scree tabular-nums mb-4">Get in touch</h2>
          <p className="text-scree text-sm leading-relaxed mb-4">
            Questions, feedback, data corrections, or partnership inquiries — we want to hear from you.
          </p>
          <div className="flex gap-4">
            <Link
              href="/contact"
              className="text-[13px] font-bold bg-glacier text-on-glacier px-5 py-2.5 hover:opacity-90 transition-colors rounded-full"
            >
              Contact form
            </Link>
            <a
              href="mailto:info@cwmenergy.ca"
              className="text-[13px] text-scree border border-hairline px-5 py-2.5 hover:border-hairline hover:text-basalt transition-colors"
            >
              info@cwmenergy.ca
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
