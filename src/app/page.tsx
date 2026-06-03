import Link from "next/link";

const stats = [
  { value: "13%", label: "of Canada's GHG emissions come from buildings" },
  { value: "25%", label: "of heating energy lost in a typical Canadian home" },
  { value: "5–8yr", label: "typical payback on insulation upgrades" },
];

const modules = [
  {
    num: "01",
    tag: "Available Now",
    title: "Home Heat Loss",
    desc: "Walls, windows, basement, roof — ranked by heat loss and payback. No tape measure needed.",
    href: "/calculator",
    live: true,
  },
  {
    num: "02",
    tag: "Available Now",
    title: "EV Benefit Calculator",
    desc: "Ioniq 5 vs Mach-E vs RAV4 vs RAV4 Hybrid — emissions, fuel cost, and maintenance over 10 years using live grid data for your city.",
    href: "/ev-benefit-calculator",
    live: true,
  },
  {
    num: "03",
    tag: "Coming Soon",
    title: "Flights",
    desc: "A single return flight can outweigh months of driving. See the real impact.",
    href: "#",
    live: false,
  },
  {
    num: "04",
    tag: "Coming Soon",
    title: "Priority Action Plan",
    desc: "Every module feeds one ranked list — highest impact, fastest payback, first.",
    href: "#",
    live: false,
  },
];

export default function Home() {
  return (
    <div className="bg-zinc-950 text-zinc-100">

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative dot-grid min-h-[92vh] flex flex-col justify-center px-4 sm:px-6 py-24 overflow-hidden">

        {/* Emerald glow */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto w-full">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-1 mb-10">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono">
              Open source · Built for Canada
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6">
            Understand<br />
            <span className="text-emerald-400">Your Energy.</span>
          </h1>

          <p className="text-zinc-300 text-lg sm:text-xl max-w-xl leading-relaxed mb-10 font-light">
            Science-based tools that show exactly where your carbon goes —
            and the most cost-effective ways to cut it. No guesswork.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/calculator"
              className="inline-flex items-center gap-3 bg-emerald-400 text-zinc-950 px-6 py-3.5 font-bold text-sm uppercase tracking-widest hover:bg-emerald-300 transition-colors"
            >
              Start Home Analysis
              <span className="text-lg">→</span>
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-3 border border-zinc-700 text-zinc-300 px-6 py-3.5 text-sm uppercase tracking-widest hover:border-zinc-400 hover:text-zinc-100 transition-colors"
            >
              How it works
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-400 font-mono">No account. No tape measure. ~5 minutes.</p>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <section className="border-y border-zinc-800 bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
          {stats.map((s) => (
            <div key={s.value} className="py-6 sm:py-4 sm:px-8 first:pl-0 last:pr-0">
              <div className="text-3xl font-black font-mono text-emerald-400 mb-1">{s.value}</div>
              <div className="text-sm text-zinc-300 leading-relaxed">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modules ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-24">
        <div className="max-w-6xl mx-auto">

          {/* Section label */}
          <div className="flex items-center gap-4 mb-12">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono">The Toolkit</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Module grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-zinc-800">
            {modules.map((m) => (
              <div
                key={m.num}
                className={`bg-zinc-950 p-8 flex flex-col gap-4 group transition-colors ${
                  m.live ? "hover:bg-zinc-900 cursor-pointer" : "opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400">{m.num}</span>
                  <span
                    className={`text-[10px] uppercase tracking-widest px-2 py-0.5 font-mono ${
                      m.live
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/30"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    {m.tag}
                  </span>
                </div>

                <h3 className="text-xl font-black tracking-tight text-zinc-100">{m.title}</h3>
                <p className="text-sm text-zinc-300 leading-relaxed flex-1">{m.desc}</p>

                {m.live && (
                  <Link
                    href={m.href}
                    className="self-start text-xs uppercase tracking-widest text-emerald-400 font-mono border-b border-emerald-400/30 pb-0.5 hover:border-emerald-400 transition-colors"
                  >
                    Open tool →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Manifesto strip ─────────────────────────────────────── */}
      <section className="border-y border-zinc-800 bg-zinc-900 px-4 sm:px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100 leading-tight">
            Sustainability doesn&apos;t mean doing less.
            <br />
            <span className="text-emerald-400">It means doing better.</span>
          </p>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-24">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8 border-t border-zinc-800 pt-16">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono mb-3">Start here</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Your home.<br />
              <span className="text-emerald-400">Your numbers.</span>
            </h2>
          </div>
          <Link
            href="/calculator"
            className="shrink-0 inline-flex items-center gap-3 bg-emerald-400 text-zinc-950 px-8 py-4 font-black text-sm uppercase tracking-widest hover:bg-emerald-300 transition-colors"
          >
            Run the Analysis →
          </Link>
        </div>
      </section>

    </div>
  );
}
