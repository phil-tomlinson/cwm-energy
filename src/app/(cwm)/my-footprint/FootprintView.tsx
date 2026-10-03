"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import AltitudeChart from "@/components/cwm/AltitudeChart";
import { CarbonChip, GradeMark, MoneyChip, Nugget, Panel, PhotoBand, dollars, elephants, tonnes } from "@/components/cwm/ui";
import { TYPICAL_ASSUMPTIONS, computeTimeline, typicalHeatingLabel, typicalPerPerson } from "@/lib/timeline/engine";
import { SAMPLE_TIMELINE } from "@/lib/timeline/sample";
import { saveLastVisit } from "@/lib/timeline/storage";
import { STORAGE_KEYS, parseLastVisit, parseTimeline, useIsClient, useStoredRaw } from "@/lib/timeline/useStored";
import { PROVINCES, gridFactor } from "@/lib/factors";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthName(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

const noSubscribe = () => () => {};

export default function FootprintView() {
  const ready = useIsClient();
  const storedRaw = useStoredRaw(STORAGE_KEYS.timeline);
  const visitRaw = useStoredRaw(STORAGE_KEYS.visit);
  const urlExample = useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get("example") === "1",
    () => false,
  );
  const [clickedExample, setClickedExample] = useState(false);
  const [openedAt] = useState(() => Date.now());

  const stored = useMemo(() => parseTimeline(storedRaw), [storedRaw]);
  const isExample = urlExample || clickedExample;
  const timeline = isExample ? SAMPLE_TIMELINE : stored;
  const result = useMemo(() => (timeline ? computeTimeline(timeline) : null), [timeline]);

  // "Since your last visit": only when something real has changed. The visit is
  // recorded when you leave, so the panel stays put while you're here.
  const since = useMemo(() => {
    const last = parseLastVisit(visitRaw);
    if (!last || !result || isExample) return null;
    const days = (openedAt - new Date(last.at).getTime()) / 86_400_000;
    const kg = result.totals.kgToDate - last.kgToDate;
    if (days < 1 || kg < 1) return null;
    return { date: last.at, kg, dollars: result.totals.dollarsToDate - last.dollarsToDate };
  }, [visitRaw, result, isExample, openedAt]);

  useEffect(() => {
    if (!result || isExample) return;
    const record = () =>
      saveLastVisit({ at: new Date().toISOString(), kgToDate: result.totals.kgToDate, dollarsToDate: result.totals.dollarsToDate });
    window.addEventListener("pagehide", record);
    return () => {
      window.removeEventListener("pagehide", record);
      record();
    };
  }, [result, isExample]);

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;

  if (!timeline || !result || result.years.length === 0) {
    return (
      <>
        <PhotoBand src="/photos/shadow-line-pair.webp" alt="Two people in silhouette on a shadowed slope above an icefall" credit="Photo from our own trips" height="h-[200px] sm:h-[300px]" position="center 35%" />
        <section className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="m-0 max-w-[720px] text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[48px] sm:leading-[50px]">
            Your footprint starts with your timeline.
          </h1>
          <p className="m-0 max-w-[620px]">
            Tell us where you live, what you drive and what you&apos;ve already changed. It takes about five minutes,
            and rough answers are fine. Everything stays in this browser.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/start" data-button className="rounded-full bg-glacier px-7 py-[14px] text-center font-bold text-on-glacier no-underline">
              Start your timeline
            </Link>
            <Link href="/my-footprint?example=1" onClick={() => setClickedExample(true)} className="text-center font-semibold text-glacier underline">
              See an example household
            </Link>
          </div>
        </section>
      </>
    );
  }

  const r = result;
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const firstPoint = r.years[0];
  const thisYear = r.years.find((p) => p.year === r.currentYear) ?? r.years.at(-1)!;
  const down = firstPoint.actualKg - thisYear.actualKg;
  const home = timeline.residences.find((x) => !x.end) ?? timeline.residences.at(-1)!;
  const provinceName = PROVINCES.find((p) => p.code === home.province)?.name ?? home.province;
  const typical = typicalPerPerson(home.province, home.city, r.currentYear);
  const anyHeld = r.years.some((p) => p.gridHeld);
  const lastGrid = gridFactor(home.province, r.currentYear);

  return (
    <>
      <PhotoBand src="/photos/shadow-line-pair.webp" alt="Two people in silhouette on a shadowed slope above an icefall" credit="Photo from our own trips" height="h-[160px] sm:h-[240px]" position="center 68%" />

      {isExample && (
        <div className="border-b border-hairline bg-snowfield-raised">
          <p className="mx-auto m-0 flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[15px] sm:px-6">
            <strong>You&apos;re looking at an example Calgary household, not real data.</strong>
            <Link href="/start" className="font-semibold text-glacier underline">Start your own timeline</Link>
          </p>
        </div>
      )}

      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <header className="flex flex-col gap-2">
          <h1 className="m-0 max-w-[820px] text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[48px] sm:leading-[50px]">
            {down > 50
              ? `You're ${tonnes(down).replace(" t", " tonnes")} down from ${firstPoint.year}.`
              : `Here's your footprint since ${firstPoint.year}.`}
          </h1>
          <p className="m-0 text-scree">
            Per person, for your home and driving. {r.currentYear} is projected from your current setup.
          </p>
        </header>

        {since && (
          <section aria-labelledby="since-heading" className="flex flex-wrap gap-6">
            <Panel className="flex flex-[3_1_520px] flex-col gap-4">
              <h2 id="since-heading" className="m-0 text-[22px] font-bold leading-[28px] sm:text-[26px] sm:leading-[32px]">
                Welcome back. Since {new Date(since.date).toLocaleDateString("en-CA", { day: "numeric", month: "long" })}:
              </h2>
              <div className="flex flex-wrap gap-3">
                <CarbonChip kg={since.kg} prefix="+" size="lg" />
                {since.dollars > 0 && (
                  <span className="inline-block rounded-full bg-larch px-5 py-2 text-[24px] font-extrabold leading-[28px] text-on-larch tabular-nums">
                    +{dollars(since.dollars)}
                  </span>
                )}
              </div>
              <p className="m-0">Your past changes kept working while you were away. Total so far: {tonnes(r.totals.kgToDate)} and {dollars(r.totals.dollarsToDate)}.</p>
            </Panel>
            <section className="flex flex-[2_1_320px] flex-col gap-3 rounded-[10px] bg-crevasse p-6 text-on-dark">
              <p className="m-0 text-[15px] font-semibold text-on-dark-muted">From real life</p>
              <h2 className="m-0 text-[22px] font-extrabold leading-[28px]">Got a recent power or gas bill?</h2>
              <p className="m-0 text-on-dark-muted">Use it to find your real energy rate. Your numbers get more accurate, and so does your plan.</p>
              <Link href="/energy-cost" data-button className="self-start rounded-full bg-on-dark px-6 py-3 font-bold text-[#144969] no-underline">
                Find your real energy rate
              </Link>
            </section>
          </section>
        )}

        <div className="flex flex-wrap items-stretch gap-6">
          <Panel className="flex min-w-0 flex-[999_1_620px] flex-col gap-2">
            <h2 className="m-0 text-[22px] font-bold leading-[28px] sm:text-[26px] sm:leading-[32px]">Your footprint, year by year</h2>
            <p className="m-0 mb-2 max-w-[640px]">
              {thisYear.baselineKg - thisYear.actualKg > 100 ? (
                <>
                  This year you&apos;re on track for <strong>{tonnes(thisYear.actualKg)}</strong>. Without the changes
                  you&apos;ve made it would be <strong>{tonnes(thisYear.baselineKg)}</strong>, so they&apos;re saving
                  you <strong>{tonnes(thisYear.baselineKg - thisYear.actualKg)}</strong> a year.
                </>
              ) : (
                <>This year you&apos;re on track for <strong>{tonnes(thisYear.actualKg)}</strong>. Add the changes you&apos;ve made to see what they save.</>
              )}{" "}
              Your 2030 goal is {tonnes(r.target2030Kg)}, 45% below {firstPoint.year}.
            </p>
            <AltitudeChart years={r.years} actions={r.actions} target2030Kg={r.target2030Kg} />
          </Panel>

          <aside className="flex flex-[1_1_300px] flex-col gap-4">
            <Panel className="flex flex-col gap-1">
              <p className="m-0 flex items-baseline gap-2">
                <span className="text-[44px] font-extrabold leading-[44px] tabular-nums">{tonnes(thisYear.actualKg)}</span>
                <span className="text-[15px] font-semibold">CO2e in {thisYear.year}</span>
              </p>
              <p className="m-0 mb-3 text-[13px] leading-[18px] text-scree">Projected for the full year.</p>
              <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[15px] leading-[22px]">
                <dt className="text-scree">You, if you&apos;d changed nothing</dt>
                <dd className="m-0 font-bold tabular-nums">{tonnes(thisYear.baselineKg)}</dd>
                <dt className="text-scree">A typical {provinceName} home and car, per person</dt>
                <dd className="m-0 font-bold tabular-nums">{tonnes(typical)}</dd>
              </dl>
              <details className="mt-2 text-[13px] leading-[18px] text-scree">
                <summary className="cursor-pointer text-[15px] font-semibold text-glacier">What&apos;s typical?</summary>
                <p className="m-0 mt-2">
                  Our own estimate, not a survey: a detached 1980s–90s home of {TYPICAL_ASSUMPTIONS.floorAreaM2} m² in {home.city} with a {typicalHeatingLabel(home.province)},
                  {" "}{TYPICAL_ASSUMPTIONS.people} people, and one gas car using {TYPICAL_ASSUMPTIONS.carLPer100} L/100 km for {TYPICAL_ASSUMPTIONS.carKm.toLocaleString("en-CA")} km a year,
                  shared by the household.
                </p>
              </details>
            </Panel>
            <Panel className="flex flex-col gap-2">
              <p className="m-0 font-bold">Sharpen your numbers</p>
              <p className="m-0 text-[15px] leading-[22px] text-scree">
                Your home energy is estimated from its size, age and heating. Real bills make it yours.
              </p>
              <Link href="/energy-cost" className="text-[15px] font-semibold text-glacier underline">Add your bills</Link>
            </Panel>
          </aside>
        </div>

        <section className="flex flex-wrap gap-x-10 gap-y-6">
          <div className="min-w-0 flex-[999_1_620px]">
            <h2 className="m-0 mb-1 text-[22px] font-bold leading-[28px] sm:text-[26px] sm:leading-[32px]">Impact to date</h2>
            <p className="m-0 mb-4 text-[15px] leading-[22px] text-scree">Each change counted from the month you made it. Your share only.</p>
            {r.actions.length === 0 ? (
              <p className="m-0 border-t border-hairline pt-4">
                No changes on your timeline yet. <Link href="/start" className="font-semibold text-glacier underline">Add solar, a heat pump, insulation or a new car</Link> with the date you did it.
              </p>
            ) : (
              <ul className="m-0 list-none border-t border-hairline p-0">
                {r.actions.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline py-4">
                    <span className="flex flex-[1_1_260px] items-center gap-2">
                      <GradeMark grade={a.grade} />
                      <span>
                        <strong>{a.label}</strong>
                        <br />
                        <span className="text-[13px] text-scree">{monthName(a.date)}</span>
                      </span>
                    </span>
                    {a.date === currentMonth ? (
                      <span className="text-[15px] text-scree">Just started: counting from this month</span>
                    ) : (
                      <>
                        <MoneyChip value={a.dollarsToDate} />
                        <CarbonChip kg={a.kgToDate} />
                      </>
                    )}
                  </li>
                ))}
                <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                  <strong className="flex-[1_1_260px] text-[19px]">Total so far</strong>
                  <MoneyChip value={r.totals.dollarsToDate} />
                  <CarbonChip kg={r.totals.kgToDate} />
                </li>
              </ul>
            )}
            {r.actions.some((a) => a.dollarsToDate < 0) && (
              <p className="m-0 mt-2 text-[15px] leading-[22px] text-scree">
                Some changes cost more to run than what they replaced, usually a heat pump replacing cheap gas. We show that
                plainly. Your real bills will tell you how close we are.
              </p>
            )}
          </div>

          {r.totals.kgToDate > 0 && (
            <div className="flex flex-[1_1_300px] flex-col gap-6">
              <Nugget kg={r.totals.kgToDate}>
                That&apos;s {tonnes(r.totals.kgToDate)} of CO2 you never put in the air: the weight of {elephants(r.totals.kgToDate)}, at five tonnes an elephant.
              </Nugget>
            </div>
          )}
        </section>

        <section className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[10px] bg-crevasse p-6 text-on-dark sm:p-8">
          <div className="flex flex-[1_1_420px] flex-col gap-2">
            <p className="m-0 text-[15px] font-semibold text-on-dark-muted">Next step</p>
            <h2 className="m-0 text-[24px] font-extrabold leading-[28px] sm:text-[30px] sm:leading-[34px]">Find the change that pays off first.</h2>
            <p className="m-0 text-on-dark-muted">Your plan ranks upgrades by bills or by tonnes, with rebates for your province.</p>
          </div>
          <Link href="/plan" data-button className="rounded-full bg-on-dark px-7 py-[14px] font-bold text-[#144969] no-underline">
            See your plan
          </Link>
        </section>

        <details className="text-[15px] leading-[22px]">
          <summary className="cursor-pointer font-semibold text-glacier">How we worked this out</summary>
          <div className="mt-3 flex max-w-[760px] flex-col gap-2 text-scree">
            <p className="m-0">
              Each change&apos;s impact is the gap between your home or car just before it and with it, using that
              year&apos;s grid. Changes are counted in date order, so nothing is counted twice. Home emissions are split
              between the people living there; a car&apos;s between the people it&apos;s shared with.
            </p>
            <p className="m-0">
              Grid intensity comes from Canada&apos;s National Inventory Report ({lastGrid.source}). Home energy uses the
              same heat-loss method as our Heat Loss calculator, and dollars are in today&apos;s prices.
            </p>
            {anyHeld && (
              <p className="m-0">
                We&apos;ve only loaded year-specific grid values for 2021 to 2024 so far. Earlier years use 2021&apos;s
                value, which understates past impact on fossil-heavy grids like Alberta&apos;s. Later years use 2024&apos;s.
              </p>
            )}
            <p className="m-0">
              These are direct emissions for now. Lifecycle figures (including upstream fuel) are coming. Flights, food and
              goods aren&apos;t included yet.
            </p>
          </div>
        </details>
      </div>
    </>
  );
}
