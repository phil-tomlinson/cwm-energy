import Link from "next/link";

export const metadata = {
  title: "Tools | CWM Energy",
  description: "Quick, free calculators: EV benefit, home heat loss, solar, your real energy rate and rebates.",
};

const TOOLS = [
  { href: "/ev-benefit-calculator", title: "EV Benefit Calculator", text: "Compare any two vehicles on emissions and running costs, using your city's grid.", big: true },
  { href: "/calculator", title: "Home Heat Loss", text: "Walls, windows, basement and roof, ranked by heat loss and payback." },
  { href: "/solar", title: "Solar estimator", text: "What rooftop solar could generate and save on your home." },
  { href: "/energy-cost", title: "Your real energy rate", text: "Turn a few bills into the rate that actually drives your savings." },
  { href: "/rebates", title: "Rebates and funding", text: "Programs that can help pay for upgrades." },
];

export default function ToolsPage() {
  const [lead, ...rest] = TOOLS;
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[48px] sm:leading-[50px]">
          Quick answers, no timeline needed.
        </h1>
        <p className="m-0 max-w-[620px] text-scree">
          These calculators work on their own. Your timeline on My Footprint pulls the same maths together across the years.
        </p>
      </header>
      <Link href={lead.href} className="flex flex-col gap-2 rounded-[10px] bg-crevasse p-6 text-on-dark no-underline sm:p-8">
        <span className="text-[26px] font-extrabold leading-[32px] sm:text-[30px] sm:leading-[34px]">{lead.title}</span>
        <span className="max-w-[620px] text-on-dark-muted">{lead.text}</span>
      </Link>
      <ul className="m-0 grid list-none grid-cols-1 gap-0 border-t border-hairline p-0 sm:grid-cols-2 sm:gap-x-10">
        {rest.map((t) => (
          <li key={t.href} className="border-b border-hairline py-5">
            <Link href={t.href} className="text-[19px] font-bold text-glacier underline">{t.title}</Link>
            <p className="m-0 mt-1 text-scree">{t.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
