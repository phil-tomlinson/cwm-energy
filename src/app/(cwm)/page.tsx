import Link from "next/link";
import { computeTimeline } from "@/lib/timeline/engine";
import { SAMPLE_TIMELINE } from "@/lib/timeline/sample";
import { CarbonChip, MoneyChip, Nugget, PhotoBand, elephants, tonnes } from "@/components/cwm/ui";

const STEPS = [
  { title: "Build your timeline", text: "Where you've lived, what you drove, how you heated, and what you changed when." },
  { title: "See your altitude", text: "Your footprint for every year, against your own past and your 2030 target." },
  { title: "Count your impact", text: "Tonnes and dollars saved by each change, from the day you made it." },
  { title: "Plan the next step", text: "Actions ranked by bills or by tonnes, with rebates for your province." },
  { title: "Keep heading down", text: "Log new changes and trips. Your numbers update as you go." },
];

const STEP_OFFSETS = ["md:mt-0", "md:mt-6", "md:mt-12", "md:mt-[72px]", "md:mt-24"];
const PHONE_INDENT = ["pl-0", "pl-3", "pl-6", "pl-9", "pl-12"];

// The example numbers keep growing with time, so rebuild the page daily.
export const revalidate = 86400;

export default function Home() {
  const example = computeTimeline(SAMPLE_TIMELINE);
  const solar = example.actions.find((a) => a.id === "solar-1")!;

  return (
    <>
      <PhotoBand
        src="/photos/spire-glacier-approach.webp"
        alt="A skier hauling a sled across a glacier toward a granite spire, low sun behind the peak"
        credit="Bugaboos, 2016"
        height="h-[320px] sm:h-[640px]"
        position="center 70%"
      />

      <section className="bg-crevasse text-on-dark">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end gap-x-12 gap-y-6 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
          <h1 className="m-0 max-w-[760px] basis-full text-[44px] font-black leading-[44px] tracking-[-0.02em] sm:text-[72px] sm:leading-[68px]">
            Every tonne you&apos;ve already cut counts.
          </h1>
          <p className="m-0 max-w-[640px] flex-[1_1_520px] text-[18px] leading-[28px] sm:text-[21px] sm:leading-[32px]">
            Put solar, a heat pump or an EV on your timeline with the date you did it. See the tonnes and
            dollars each one has saved since, counted against your province&apos;s grid in every year.
          </p>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
            <Link href="/start" data-button className="rounded-full bg-on-dark px-7 py-[14px] text-center text-[17px] font-bold text-[#144969] no-underline">
              Start your timeline
            </Link>
            <Link href="/my-footprint?example=1" className="text-center text-[15px] font-semibold text-on-dark underline">
              See an example
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-6 pt-10 sm:px-6 sm:pt-16">
        <h2 className="m-0 mb-2 text-[30px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[40px] sm:leading-[44px]">
          Start with what you&apos;ve already done.
        </h2>
        <p className="m-0 mb-8 max-w-[620px] text-scree">
          Rough answers are fine to begin with. You can sharpen them later with bills and logged trips.
        </p>
        <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-5 md:items-start md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className={`flex gap-3 md:flex-col md:gap-2 ${STEP_OFFSETS[i]} ${PHONE_INDENT[i]} md:pl-0`}>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold text-on-dark ${i === 4 ? "bg-spruce" : "bg-[#16698A]"}`}
              >
                {i + 1}
              </span>
              <span className="flex flex-col gap-1">
                <strong className="text-[19px] leading-[24px]">{s.title}</strong>
                <span className="text-[15px] leading-[22px] text-scree">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto flex max-w-[1200px] flex-wrap items-stretch gap-10 px-4 py-10 sm:px-6 sm:pb-16">
        <figure className="m-0 flex flex-[1_1_480px] flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/photos/ski-descent-icefield.webp"
            alt="A skier in a red jacket carving down a bright slope below an icefall"
            loading="lazy"
            width={1800}
            height={1196}
            className="h-[260px] w-full rounded-[10px] object-cover sm:h-[440px]"
            style={{ objectPosition: "60% center" }}
          />
          <figcaption className="text-[13px] leading-[18px] text-scree">Photo from our own trips</figcaption>
        </figure>
        <div className="flex flex-[1_1_420px] flex-col justify-center gap-6">
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[15px] font-semibold text-scree">
              Example: 6 kW of solar on a Calgary home, installed June 2020
            </p>
            <p className="m-0 flex flex-wrap items-baseline gap-2">
              <span className="text-[48px] font-extrabold leading-[48px] tabular-nums sm:text-[64px] sm:leading-[64px]">
                {tonnes(solar.kgToDate)}
              </span>
              <span className="font-semibold">CO2e avoided so far</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <MoneyChip value={solar.dollarsToDate} />
              <CarbonChip kg={solar.kgPerYearNow} suffix=" a year" />
            </div>
            <p className="m-0 mt-2 max-w-[460px] text-[15px] leading-[22px] text-scree">
              One person&apos;s share of a two-person home. Each year is counted against Alberta&apos;s grid for
              that year.
            </p>
          </div>
          <div className="max-w-[460px] border-t border-hairline pt-6">
            <Nugget kg={solar.kgToDate}>
              {tonnes(solar.kgToDate)} is {elephants(solar.kgToDate)}, at five tonnes an elephant. Which raises a
              better question: how do you move an elephant to a new zoo?
            </Nugget>
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-snowfield-raised">
        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="m-0 flex-[1_1_280px] text-[30px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[40px] sm:leading-[44px]">
            Free, open and straight with you.
          </h2>
          <div className="grid flex-[2_1_560px] grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-10">
            <div>
              <h3 className="m-0 mb-2 text-[19px] font-bold leading-[24px]">Every number has a source.</h3>
              <p className="m-0 text-scree">Each factor comes with where it came from and the year it applies to.</p>
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[19px] font-bold leading-[24px]">Your timeline stays with you.</h3>
              <p className="m-0 text-scree">It stays in your browser unless you make an account to save it. No ads, and we never sell data.</p>
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[19px] font-bold leading-[24px]">The code is public.</h3>
              <p className="m-0 text-scree">
                CWM Energy is open source, so anyone can check the maths.{" "}
                <a href="https://github.com/phil-tomlinson/cwm-energy" className="text-glacier underline">See it on GitHub</a>
              </p>
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[19px] font-bold leading-[24px]">Offsets don&apos;t count.</h3>
              <p className="m-0 text-scree">
                Only real reductions move your numbers. Good estimates beat false precision, and we show our assumptions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <h2 className="m-0 mb-2 text-[26px] font-bold leading-[32px]">Just want a quick answer?</h2>
        <p className="m-0 mb-4 max-w-[620px] text-scree">
          The EV Benefit Calculator compares any two vehicles on emissions and running costs for your city.
        </p>
        <Link href="/ev-benefit-calculator" className="text-[17px] font-bold text-glacier underline">
          Open the EV Benefit Calculator
        </Link>
      </section>
    </>
  );
}
