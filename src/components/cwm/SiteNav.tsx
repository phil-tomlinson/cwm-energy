"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useA11y } from "@/components/A11yProvider";
import { STORAGE_KEYS, useStoredRaw } from "@/lib/timeline/useStored";

const LINKS = [
  { href: "/my-footprint", label: "My Footprint" },
  { href: "/plan", label: "Plan" },
  { href: "/tools", label: "Tools" },
  { href: "/about", label: "About" },
];

function IconButton({ label, pressed, onClick, children }: {
  label: string; pressed: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-hairline text-basalt hover:bg-snowfield"
    >
      {children}
    </button>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  const { theme, toggleTheme, a11y, toggleA11y } = useA11y();
  const [open, setOpen] = useState(false);
  const hasTimeline = useStoredRaw(STORAGE_KEYS.timeline) !== null;

  const cta = hasTimeline
    ? { href: "/start", label: "Edit your timeline" }
    : { href: "/start", label: "Start your timeline" };

  const toggles = (
    <>
      <IconButton label={theme === "dark" ? "Switch to daylight colours" : "Switch to night colours"} pressed={theme === "dark"} onClick={toggleTheme}>
        {theme === "dark" ? (
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        ) : (
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
        )}
      </IconButton>
      <IconButton label={a11y ? "Turn off high-contrast mode" : "Turn on high-contrast mode"} pressed={a11y} onClick={toggleA11y}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
      </IconButton>
    </>
  );

  return (
    <header className="cwm border-b border-hairline bg-snowfield-raised">
      <nav aria-label="Main" className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-2 sm:px-6 sm:py-3">
        <Link href="/" className="mr-auto text-[22px] font-extrabold text-basalt no-underline">
          CWM Energy
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-[15px] text-basalt no-underline ${active ? "border-b-[3px] border-glacier pb-1 font-bold" : "font-semibold hover:underline"}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-2 md:flex">{toggles}</div>

        <Link
          href={cta.href}
          data-button
          className="hidden rounded-full bg-glacier px-[22px] py-3 text-[15px] font-semibold text-on-glacier no-underline md:inline-block"
        >
          {cta.label}
        </Link>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-hairline md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-hairline px-4 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-[17px] font-semibold text-basalt no-underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={cta.href} onClick={() => setOpen(false)} data-button className="mt-3 block rounded-full bg-glacier px-6 py-3 text-center font-semibold text-on-glacier no-underline">
            {cta.label}
          </Link>
          <div className="mt-4 flex gap-2">{toggles}</div>
        </div>
      )}
    </header>
  );
}
