import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-emerald-400 flex items-center justify-center shrink-0">
            <span className="text-zinc-950 text-[8px] font-black tracking-tighter">CWM</span>
          </div>
          <span className="text-xs font-mono text-zinc-600">
            © {new Date().getFullYear()} CWM Energy · Built in Calgary, AB
          </span>
        </div>

        <div className="flex gap-6">
          {[
            { href: "/calculator", label: "Calculator" },
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "mailto:info@cwmenergy.ca", label: "info@cwmenergy.ca", external: true },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-300 transition-colors font-mono"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
