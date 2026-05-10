"use client";
import Link from "next/link";
import { useState } from "react";
import AuthButton from "@/components/AuthButton";

const links = [
  { href: "/calculator",           label: "Home" },
  { href: "/ev-benefit-calculator", label: "EVs"  },
  { href: "/plan",                  label: "Plan"  },
  { href: "/about",                 label: "About" },
  { href: "/contact",               label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-6 h-6 bg-emerald-400 flex items-center justify-center shrink-0">
            <span className="text-zinc-950 text-[9px] font-black tracking-tighter leading-none">CWM</span>
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">CWM Energy</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] uppercase tracking-widest text-zinc-500 hover:text-zinc-100 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="border-l border-zinc-800 pl-6">
            <AuthButton />
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          className="sm:hidden text-zinc-400 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs uppercase tracking-widest text-zinc-400"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-zinc-800 pt-4">
            <AuthButton mobile />
          </div>
        </div>
      )}
    </header>
  );
}
