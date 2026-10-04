import Link from "next/link";

const LINKS = [
  { href: "/ev-benefit-calculator", label: "EV Benefit Calculator" },
  { href: "/tools", label: "All tools" },
  { href: "/about", label: "About and methodology" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "Account" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-crevasse text-on-dark">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <span className="mr-auto text-[20px] font-extrabold">CWM Energy</span>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[15px] text-on-dark underline-offset-2 hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
        <p className="max-w-[720px] text-[13px] leading-[18px] text-on-dark-muted">
          Estimates only. Good estimates with their assumptions shown, not precise measurements, and not
          financial, engineering or professional advice. Check with a qualified local professional before
          acting. All photos are from our own trips in the mountains. © {new Date().getFullYear()} CWM Energy,
          built in Calgary, Alberta.
        </p>
      </div>
    </footer>
  );
}
