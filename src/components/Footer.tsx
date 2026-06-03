import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-5 h-5 bg-emerald-400 flex items-center justify-center shrink-0">
              <span className="text-zinc-950 text-[8px] font-black tracking-tighter">CWM</span>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              © {new Date().getFullYear()} CWM Energy · Built in Calgary, AB
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-500 max-w-sm leading-relaxed">
            Estimates only — figures can be substantially wrong. Not financial, engineering, or
            professional advice. No warranty. Verify with a qualified local professional before acting.
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { href: "/calculator",          label: "Calculator" },
              { href: "/about",               label: "About"      },
              { href: "/contact",             label: "Contact"    },
              { href: "/terms",               label: "Terms"      },
              { href: "/privacy",             label: "Privacy"    },
              { href: "mailto:info@cwmenergy.ca", label: "info@cwmenergy.ca" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors font-mono"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-xs font-mono text-zinc-500">
            By using this site you agree to our{' '}
            <Link href="/terms" className="hover:text-zinc-500 underline">Terms of Use</Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
