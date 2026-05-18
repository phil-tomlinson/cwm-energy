import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="bg-zinc-950 min-h-screen px-4 sm:px-6 py-20">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono mb-3">About</p>
        <h1 className="text-4xl font-black tracking-tight text-zinc-100 mb-10 leading-tight">
          Built by an engineer<br />
          <span className="text-emerald-400">who gives a damn.</span>
        </h1>

        {/* The name */}
        <div className="border-l-2 border-emerald-400 pl-6 mb-10">
          <p className="text-zinc-300 leading-relaxed mb-3">
            A <strong className="text-zinc-100">cwm</strong> (pronounced <em>coom</em>) is a high
            mountain valley carved by glaciers — a bowl of stillness surrounded by peaks. It&apos;s
            an obscure English word, and a deliberate choice. We think about energy the same way:
            find the right terrain, understand the forces at work, and you can do a lot with very
            little.
          </p>
        </div>

        {/* Story */}
        <div className="space-y-5 text-zinc-400 leading-relaxed mb-12">
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
        <div className="border-y border-zinc-800 py-8 mb-12 text-center">
          <p className="text-xl font-black tracking-tight text-zinc-100">
            Sustainability doesn&apos;t mean doing less.<br />
            <span className="text-emerald-400">It means doing better.</span>
          </p>
        </div>

        {/* Open source */}
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-mono mb-4">Open Source</h2>
          <p className="text-zinc-400 leading-relaxed mb-4">
            The calculation engines behind these tools are open source and peer-reviewable. If
            you&apos;re an engineer, an energy nerd, or just someone who wants to check our math —
            the code is on GitHub. Pull requests welcome.
          </p>
          <a
            href="https://github.com/phil-tomlinson/cwm-energy"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 font-mono border border-emerald-400/30 px-4 py-2 hover:border-emerald-400 transition-colors"
          >
            View on GitHub →
          </a>
        </div>

        {/* Contact */}
        <div className="border-t border-zinc-800 pt-8">
          <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-mono mb-4">Get in touch</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            Questions, feedback, data corrections, or partnership inquiries — we want to hear from you.
          </p>
          <div className="flex gap-4">
            <Link
              href="/contact"
              className="text-xs uppercase tracking-widest font-bold bg-emerald-400 text-zinc-950 px-5 py-2.5 hover:bg-emerald-300 transition-colors"
            >
              Contact form
            </Link>
            <a
              href="mailto:info@cwmenergy.ca"
              className="text-xs uppercase tracking-widest text-zinc-400 border border-zinc-700 px-5 py-2.5 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              info@cwmenergy.ca
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
