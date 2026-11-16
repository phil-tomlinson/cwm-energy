"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel, tonnes } from "@/components/cwm/ui";
import {
  DIETS, DIET_BY_ID, DIET_SOURCE, DIET_SOURCE_URL, FOODS, FOOD_BY_ID, FOOD_SOURCE, FOOD_SOURCE_URL,
  GROUP_LABELS, LOCAL_SOURCE_URL, SOURCE_EFFECT, computeWeek, servingKg, type FoodGroup,
} from "@/lib/food";
import { foodPlan, toMonthIndex } from "@/lib/timeline/engine";
import { newId, saveTimeline } from "@/lib/timeline/storage";
import { STORAGE_KEYS, parseTimeline, useIsClient, useStoredRaw } from "@/lib/timeline/useStored";
import type { DietPeriod, DietType, FoodWeek, Meal, MealSlot, MealSource, Timeline, WasteLevel } from "@/lib/timeline/types";
import { MonthField } from "../start/fields";

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks and drinks" },
];

const WASTE: { id: WasteLevel; label: string; hint: string }[] = [
  { id: "low", label: "Very little", hint: "Leftovers get eaten" },
  { id: "average", label: "Some", hint: "The odd thing goes off" },
  { id: "high", label: "Quite a lot", hint: "Fridge clear-outs most weeks" },
];

const GROUP_ORDER: FoodGroup[] = ["meat", "fish", "dairyEggs", "plantProtein", "staples", "produce", "treats"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayLabel(startDate: string, day: number): { short: string; long: string } {
  const [y, m, d] = startDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + day);
  return {
    short: date.toLocaleDateString("en-CA", { weekday: "short" }),
    long: date.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" }),
  };
}

function kg(n: number): string {
  return `${n < 100 ? n.toFixed(1) : Math.round(n)} kg`;
}

function mealSummary(meal: Meal): string {
  return meal.items
    .map((it) => {
      const f = FOOD_BY_ID.get(it.foodId);
      if (!f) return null;
      return it.servings === 1 ? f.label : `${f.label} ×${it.servings}`;
    })
    .filter(Boolean)
    .join(", ");
}

export default function FoodView() {
  const ready = useIsClient();
  const raw = useStoredRaw(STORAGE_KEYS.timeline);
  const t = useMemo(() => parseTimeline(raw), [raw]);

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <header className="flex max-w-[760px] flex-col gap-3">
        <h1 className="m-0 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[48px] sm:leading-[50px]">
          What you eat, measured.
        </h1>
        <p className="m-0">
          Log a week of meals. About 20 seconds each: what was on the plate, and whether you made it, picked it up or
          ate out. We&apos;ll turn it into your food footprint and show what moves it.
        </p>
      </header>
      {t ? <FoodEditor t={t} /> : (
        <Panel className="flex max-w-[760px] flex-col gap-3">
          <p className="m-0">Food goes on your timeline, next to your home and car. Start your timeline first; it takes about five minutes.</p>
          <Link href="/start" data-button className="self-start rounded-full bg-glacier px-6 py-3 font-bold text-on-glacier no-underline">Start your timeline</Link>
        </Panel>
      )}
    </div>
  );
}

function FoodEditor({ t }: { t: Timeline }) {
  const weeks = t.foodWeeks ?? [];
  const week = [...weeks].sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null;
  const result = week ? computeWeek(week) : null;
  const plan = foodPlan(t);
  const [day, setDay] = useState(0);

  const save = (next: Timeline) => saveTimeline(next);
  const saveWeek = (w: FoodWeek) =>
    save({ ...t, foodWeeks: [...weeks.filter((x) => x.id !== w.id), w] });

  const startWeek = () => {
    const w: FoodWeek = { id: newId("week"), startDate: todayIso(), meals: [], waste: "average" };
    save({ ...t, foodWeeks: [...weeks, w] });
    setDay(0);
  };

  return (
    <>
      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="week-heading" className="flex min-w-0 flex-[999_1_620px] flex-col gap-4">
          <h2 id="week-heading" className="m-0 text-[22px] font-bold leading-[28px] sm:text-[26px] sm:leading-[32px]">Your week</h2>
          {!week ? (
            <Panel className="flex flex-col gap-3">
              <p className="m-0">Start today and log as you go, or fill in the last few days from memory. Rough is fine: a typical week tells us far more than a perfect one.</p>
              <button type="button" onClick={startWeek} className="min-h-11 self-start rounded-full bg-glacier px-6 py-3 font-bold text-on-glacier">
                Start logging
              </button>
            </Panel>
          ) : (
            <WeekLogger week={week} day={day} setDay={setDay} onChange={saveWeek} onNewWeek={startWeek} />
          )}
        </section>
        <aside className="flex flex-[1_1_320px] flex-col gap-4 lg:sticky lg:top-4">
          <WeekResultPanel t={t} week={week} />
        </aside>
      </div>

      {result && plan && <MismatchPrompt t={t} week={week!} detected={result.dietType} />}
      <DietHistory t={t} />
      <Sources />
      {plan && plan.ratio !== 1 && (
        <p className="m-0 max-w-[760px] text-[13px] leading-[18px] text-scree">
          Your logged week is {Math.round(plan.ratio * 100)}% of a typical {DIET_BY_ID.get(plan.periods[plan.weekPeriod]?.diet ?? "mediumMeat")?.label.toLowerCase()} diet,
          so we&apos;ve scaled your whole diet history by the same amount.
        </p>
      )}
    </>
  );
}

// ── Logging ───────────────────────────────────────────────────────────────────

function WeekLogger({ week, day, setDay, onChange, onNewWeek }: {
  week: FoodWeek; day: number; setDay: (d: number) => void; onChange: (w: FoodWeek) => void; onNewWeek: () => void
}) {
  const setMeal = (slot: MealSlot, meal: Meal | null) => {
    const rest = week.meals.filter((m) => !(m.day === day && m.slot === slot));
    onChange({ ...week, meals: meal && meal.items.length ? [...rest, meal] : rest });
  };
  const daysWithFood = new Set(week.meals.filter((m) => m.items.length).map((m) => m.day));

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Days of your week" className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }, (_, d) => {
          const label = dayLabel(week.startDate, d);
          const selected = d === day;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={label.long}
              onClick={() => setDay(d)}
              className={`flex min-h-11 min-w-[56px] flex-col items-center justify-center rounded-[8px] border px-3 py-1 text-[15px] font-semibold ${
                selected ? "border-glacier bg-glacier text-on-glacier" : "border-hairline bg-snowfield-raised text-basalt"
              }`}
            >
              {label.short}
              <span aria-hidden="true" className={`mt-0.5 h-1.5 w-1.5 rounded-full ${daysWithFood.has(d) ? (selected ? "bg-on-glacier" : "bg-glacier") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
      <h3 className="m-0 text-[19px] font-bold">{dayLabel(week.startDate, day).long}</h3>
      {SLOTS.map((s) => {
        const meal = week.meals.find((m) => m.day === day && m.slot === s.id) ?? null;
        const yesterday = day > 0 ? week.meals.find((m) => m.day === day - 1 && m.slot === s.id) ?? null : null;
        return (
          <MealCard
            key={`${day}-${s.id}`}
            label={s.label}
            meal={meal}
            yesterday={yesterday}
            onChange={(m) => setMeal(s.id, m)}
            makeNew={(): Meal => ({ id: newId("meal"), day, slot: s.id, items: [], source: "home", local: false })}
          />
        );
      })}

      <fieldset className="m-0 flex flex-col gap-2 rounded-[10px] border border-hairline bg-snowfield-raised p-4 sm:p-6">
        <legend className="px-1 text-[17px] font-bold">How much food gets thrown out at home?</legend>
        <div className="flex flex-wrap gap-2">
          {WASTE.map((w) => (
            <label key={w.id} className={`flex min-h-11 flex-[1_1_160px] cursor-pointer flex-col justify-center rounded-[8px] border px-4 py-2 ${week.waste === w.id ? "border-glacier bg-glacier/10" : "border-hairline"}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="waste" className="h-4 w-4 accent-[var(--glacier)]" checked={week.waste === w.id} onChange={() => onChange({ ...week, waste: w.id })} />
                <span className="font-semibold">{w.label}</span>
              </span>
              <span className="pl-6 text-[13px] text-scree">{w.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="m-0 text-[15px] text-scree">
        Saved as you go. Week started {dayLabel(week.startDate, 0).long}.{" "}
        <button type="button" onClick={onNewWeek} className="font-semibold text-glacier underline">Start a new week</button>
      </p>
    </div>
  );
}

function MealCard({ label, meal, yesterday, onChange, makeNew }: {
  label: string; meal: Meal | null; yesterday: Meal | null; onChange: (m: Meal | null) => void; makeNew: () => Meal
}) {
  const [open, setOpen] = useState(false);
  const m = meal ?? makeNew();
  const total = meal ? computeMealKg(meal) : 0;

  const setItem = (foodId: string, servings: number) => {
    const others = m.items.filter((i) => i.foodId !== foodId);
    onChange({ ...m, items: servings > 0 ? [...others, { foodId, servings }].sort((a, b) => FOODS.findIndex((f) => f.id === a.foodId) - FOODS.findIndex((f) => f.id === b.foodId)) : others });
  };
  const servingsOf = (id: string) => m.items.find((i) => i.foodId === id)?.servings ?? 0;

  return (
    <section aria-label={label} className="rounded-[10px] border border-hairline bg-snowfield-raised">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 sm:px-6">
        <div className="mr-auto min-w-0 flex-[1_1_240px]">
          <h4 className="m-0 text-[17px] font-bold">{label}</h4>
          <p className="m-0 text-[15px] leading-[20px] text-scree">
            {meal ? (
              <>
                {mealSummary(meal)}<span aria-hidden="true" className="mx-1.5">·</span>{SOURCE_EFFECT[meal.source].label.toLowerCase()}
                {meal.local ? ", mostly local" : ""}<span aria-hidden="true" className="mx-1.5">·</span><span className="font-semibold text-basalt tabular-nums">{kg(total)}</span>
              </>
            ) : "Nothing logged"}
          </p>
        </div>
        {!meal && yesterday && !open && (
          <button type="button" aria-label={`Same ${label.toLowerCase()} as yesterday`} onClick={() => onChange({ ...yesterday, id: m.id, day: m.day })} className="min-h-11 px-2 text-[15px] font-semibold text-glacier underline">
            Same as yesterday
          </button>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Done with" : meal ? "Edit" : "Add"} ${label.toLowerCase()}`}
          onClick={() => setOpen(!open)}
          className="min-h-11 rounded-full border border-glacier px-5 text-[15px] font-semibold text-glacier"
        >
          {open ? "Done" : meal ? "Edit" : "Add"}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-5 border-t border-hairline p-4 sm:px-6">
          {GROUP_ORDER.map((g) => (
            <fieldset key={g} className="m-0 border-0 p-0">
              <legend className="mb-2 p-0 text-[13px] font-semibold uppercase tracking-[0.04em] text-scree">{GROUP_LABELS[g]}</legend>
              <div className="flex flex-wrap gap-2">
                {FOODS.filter((f) => f.group === g).map((f) => {
                  const n = servingsOf(f.id);
                  return n > 0 ? (
                    <span key={f.id} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-glacier bg-glacier/10 pl-4 pr-1">
                      <span className="mr-1 font-semibold">{f.label}</span>
                      <button type="button" aria-label={`Less ${f.label}`} onClick={() => setItem(f.id, n <= 0.5 ? 0 : n - 0.5)} className="h-9 w-9 rounded-full text-[20px] font-bold text-glacier">−</button>
                      <span className="w-8 text-center tabular-nums" aria-live="polite">{n}</span>
                      <button type="button" aria-label={`More ${f.label}`} onClick={() => setItem(f.id, Math.min(6, n + 0.5))} className="h-9 w-9 rounded-full text-[20px] font-bold text-glacier">+</button>
                    </span>
                  ) : (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setItem(f.id, 1)}
                      title={`One serving: ${f.serving}, about ${kg(servingKg(f))} CO2e`}
                      className="min-h-11 rounded-full border border-hairline px-4 text-[15px]"
                    >
                      + {f.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <p className="m-0 text-[13px] leading-[18px] text-scree">
            One tap is one normal serving; use − and + for half or double portions. Hover or long-press a food to see what a serving is.
          </p>

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[15px] font-semibold">Where did it come from?</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SOURCE_EFFECT) as MealSource[]).map((src) => (
                <label key={src} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 ${m.source === src ? "border-glacier bg-glacier/10" : "border-hairline"}`}>
                  <input type="radio" name={`src-${m.id}`} className="h-4 w-4 accent-[var(--glacier)]" checked={m.source === src} onChange={() => onChange({ ...m, source: src })} />
                  {SOURCE_EFFECT[src].label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="h-5 w-5 accent-[var(--glacier)]" checked={m.local} onChange={(e) => onChange({ ...m, local: e.target.checked })} />
            <span>Mostly local ingredients (grown or raised in your province)</span>
          </label>
          {meal && (
            <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="min-h-11 self-start px-1 text-[15px] font-semibold text-glacier underline">
              Clear this meal
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function computeMealKg(meal: Meal): number {
  const r = computeWeek({ id: "x", startDate: "2000-01-01", meals: [{ ...meal, day: 0 }], waste: "low" });
  return r ? r.kgPerDay - r.parts.find((p) => p.key === "pantry")!.kgPerDay : 0;
}

// ── Results ───────────────────────────────────────────────────────────────────

function WeekResultPanel({ t, week }: { t: Timeline; week: FoodWeek | null }) {
  const r = week ? computeWeek(week) : null;
  const plan = foodPlan(t);
  if (!r) {
    return (
      <Panel className="flex flex-col gap-2">
        <p className="m-0 font-bold">Your result will appear here</p>
        <p className="m-0 text-[15px] leading-[22px] text-scree">
          {plan
            ? `Until you log, we use a typical "${DIET_BY_ID.get(plan.periods.at(-1)!.diet)!.label.toLowerCase()}" diet: ${tonnes(plan.kgYear.at(-1)!)} a year.`
            : "Log a day or two and you'll see your food footprint, and what's driving it."}
        </p>
      </Panel>
    );
  }
  const max = Math.max(...DIETS.map((d) => d.kgPerDay), r.kgPerDay);
  const parts = [...r.parts].sort((a, b) => b.kgPerDay - a.kgPerDay);
  const top = parts[0];
  const outPart = r.parts.find((p) => p.key === "eatingOut");
  return (
    <Panel className="flex flex-col gap-4">
      <div>
        <p className="m-0 flex items-baseline gap-2">
          <span className="text-[44px] font-extrabold leading-[44px] tabular-nums">{kg(r.kgPerDay)}</span>
          <span className="text-[15px] font-semibold">CO2e a day</span>
        </p>
        <p className="m-0 text-[15px] text-scree">
          {tonnes(r.kgPerDay * 365.25)} a year, from {r.daysLogged} {r.daysLogged === 1 ? "day" : "days"} logged.
          Your week looks like <strong className="text-basalt">{DIET_BY_ID.get(r.dietType)!.label.toLowerCase()}</strong>.
        </p>
      </div>

      <div>
        <p className="m-0 mb-2 text-[15px] font-semibold">Where it comes from, a day</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {parts.map((p) => (
            <li key={p.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[13px] leading-[18px]">
              <span>{p.label}</span>
              <span className="font-semibold tabular-nums">{kg(p.kgPerDay)}</span>
              <span aria-hidden="true" className="col-span-2 h-1.5 rounded-full bg-hairline">
                <span className="block h-1.5 rounded-full bg-glacier" style={{ width: `${(p.kgPerDay / top.kgPerDay) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="m-0 mb-2 text-[15px] font-semibold">You, next to typical diets</p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] leading-[18px]">
          {[...DIETS.map((d) => ({ key: d.id, label: d.label, v: d.kgPerDay, you: false })), { key: "you", label: "You", v: r.kgPerDay, you: true }]
            .sort((a, b) => b.v - a.v)
            .map((d) => (
              <li key={d.key} className="grid grid-cols-[96px_1fr_auto] items-center gap-2">
                <span className={d.you ? "font-bold" : ""}>{d.label}</span>
                <span aria-hidden="true" className="h-2 rounded-full bg-hairline">
                  <span className={`block h-2 rounded-full ${d.you ? "bg-larch" : "bg-scree/60"}`} style={{ width: `${(d.v / max) * 100}%` }} />
                </span>
                <span className={`tabular-nums ${d.you ? "font-bold" : ""}`}>{d.v.toFixed(1)}</span>
              </li>
            ))}
        </ul>
        <p className="m-0 mt-1 text-[13px] leading-[18px] text-scree">kg CO2e a day. Typical diets are UK medians, standardised to 2,000 kcal.</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-3 text-[15px] leading-[22px]">
        <p className="m-0"><strong>{top.label}</strong> is your biggest share. What&apos;s on the plate matters far more than where it came from.</p>
        {outPart && <p className="m-0 text-scree">Eating out added {kg(outPart.kgPerDay)} a day ({r.mealsOut} of {r.meals} meals).</p>}
        <p className="m-0 text-scree">
          Buying local trims about 5%: transport is a small slice of food emissions.{" "}
          <a href={LOCAL_SOURCE_URL} className="font-semibold text-glacier underline">Why</a>
        </p>
      </div>
    </Panel>
  );
}

function MismatchPrompt({ t, week, detected }: { t: Timeline; week: FoodWeek; detected: DietType }) {
  const [changing, setChanging] = useState(false);
  const [month, setMonth] = useState(week.startDate.slice(0, 7));
  const periods = [...(t.diet ?? [])].sort((a, b) => toMonthIndex(a.start) - toMonthIndex(b.start));
  if (periods.length === 0) return null;
  const at = toMonthIndex(week.startDate.slice(0, 7));
  let idx = 0;
  for (let i = 1; i < periods.length; i++) if (toMonthIndex(periods[i].start) <= at) idx = i;
  const current = periods[idx];
  if (current.diet === detected) return null;
  const d = DIET_BY_ID.get(detected)!;

  const always = () => saveTimeline({ ...t, diet: periods.map((p) => (p.id === current.id ? { ...p, diet: detected } : p)) });
  const changed = () => {
    const next: DietPeriod = { id: newId("diet"), diet: detected, start: month };
    saveTimeline({ ...t, diet: [...periods.filter((p) => p.start !== month), next] });
    setChanging(false);
  };

  return (
    <section className="flex max-w-[860px] flex-col gap-3 rounded-[10px] border-2 border-glacier p-4 sm:p-6">
      <p className="m-0">
        <strong>Your week looks like &ldquo;{d.label.toLowerCase()}&rdquo;</strong>, but your history says &ldquo;
        {DIET_BY_ID.get(current.diet)!.label.toLowerCase()}&rdquo; for this time. Which is right?
      </p>
      {!changing ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={always} className="min-h-11 rounded-full bg-glacier px-5 font-bold text-on-glacier">I&apos;ve eaten like this all along</button>
          <button type="button" onClick={() => setChanging(true)} className="min-h-11 rounded-full border border-glacier px-5 font-semibold text-glacier">I changed at some point</button>
          <p className="m-0 flex min-h-11 items-center text-[15px] text-scree">Or leave it: an unusual week won&apos;t change your history.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-[320px]"><MonthField label="When did you change?" value={month} onChange={setMonth} /></div>
          <button type="button" onClick={changed} className="min-h-11 rounded-full bg-glacier px-5 font-bold text-on-glacier">Add the change</button>
          <button type="button" onClick={() => setChanging(false)} className="min-h-11 px-2 font-semibold text-glacier underline">Cancel</button>
        </div>
      )}
    </section>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function DietSelect({ value, onChange, label }: { value: DietType; onChange: (d: DietType) => void; label: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[15px] font-semibold">{label}</span>
      <select
        className="h-11 w-full rounded-[4px] border border-hairline bg-snowfield-raised px-3 text-[17px] text-basalt"
        value={value}
        onChange={(e) => onChange(e.target.value as DietType)}
      >
        {DIETS.map((d) => <option key={d.id} value={d.id}>{d.label}: {d.describe.toLowerCase()}</option>)}
      </select>
    </label>
  );
}

function DietHistory({ t }: { t: Timeline }) {
  const periods = [...(t.diet ?? [])].sort((a, b) => toMonthIndex(a.start) - toMonthIndex(b.start));
  const firstStart = [...t.residences.map((r) => r.start), ...t.vehicles.map((v) => v.start)].sort()[0] ?? thisMonth();
  const save = (next: DietPeriod[]) => saveTimeline({ ...t, diet: next });
  const update = (id: string, patch: Partial<DietPeriod>) => save(periods.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const plan = foodPlan(t);

  return (
    <section aria-labelledby="history-heading" className="flex max-w-[860px] flex-col gap-4">
      <div>
        <h2 id="history-heading" className="m-0 text-[22px] font-bold leading-[28px] sm:text-[26px] sm:leading-[32px]">How you&apos;ve eaten over the years</h2>
        <p className="m-0 text-[15px] leading-[22px] text-scree">
          This fills in your food for past years. A change of diet counts as a change on your timeline, just like solar or a new car, and is credited from the month you made it.
        </p>
      </div>
      {periods.length === 0 ? (
        <Panel className="flex flex-col gap-3">
          <DietSelect label="How do you usually eat?" value={plan?.periods[0]?.diet ?? "mediumMeat"} onChange={(d) => save([{ id: newId("diet"), diet: d, start: firstStart }])} />
          <p className="m-0 text-[13px] leading-[18px] text-scree">Pick one to add food to your footprint. If you&apos;ve changed how you eat, you can add that next.</p>
        </Panel>
      ) : (
        <Panel className="flex flex-col gap-4">
          {periods.map((p, i) => (
            <div key={p.id} className={`grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto] ${i ? "border-t border-hairline pt-4" : ""}`}>
              {i === 0 ? (
                <p className="m-0 flex min-h-11 items-center font-semibold">{periods.length > 1 ? "Before any change" : "All along"}</p>
              ) : (
                <MonthField label="From" value={p.start} onChange={(v) => update(p.id, { start: v })} />
              )}
              <DietSelect label={i === 0 ? "You ate" : "You switched to"} value={p.diet} onChange={(d) => update(p.id, { diet: d })} />
              {i > 0 ? (
                <button type="button" onClick={() => save(periods.filter((x) => x.id !== p.id))} className="min-h-11 px-2 text-[15px] font-semibold text-glacier underline">Remove</button>
              ) : <span />}
            </div>
          ))}
          <button
            type="button"
            onClick={() => save([...periods, { id: newId("diet"), diet: periods.at(-1)!.diet, start: thisMonth() }])}
            className="min-h-11 self-start rounded-full border border-glacier px-5 font-semibold text-glacier"
          >
            Add a change of diet
          </button>
        </Panel>
      )}
    </section>
  );
}

function Sources() {
  return (
    <details className="max-w-[860px] text-[15px] leading-[22px]">
      <summary className="cursor-pointer font-semibold text-glacier">How we worked this out</summary>
      <div className="mt-3 flex flex-col gap-2 text-scree">
        <p className="m-0">
          Each food uses its average footprint per kilogram from farm to shop, from{" "}
          <a href={FOOD_SOURCE_URL} className="text-glacier underline">{FOOD_SOURCE}</a>. These are global averages; Canadian
          beef in particular is likely lower than the global figure.
        </p>
        <p className="m-0">
          Typical diets, used for past years, come from{" "}
          <a href={DIET_SOURCE_URL} className="text-glacier underline">{DIET_SOURCE}</a>. When you log a week, we scale
          your history by how your week compares with a typical person on the same diet.
        </p>
        <p className="m-0">
          Cooking at home adds nothing here, because that energy is already in your home&apos;s footprint. For eating out we
          add our own estimate for the restaurant&apos;s kitchen, heating and packaging, and a little extra food: about
          0.5 kg a restaurant meal and 0.25 kg a takeout. Published studies disagree widely on this, so treat it as a rough
          figure. Buying mostly local takes 5% off a meal, matching transport&apos;s typical share. Waste at home adds 0%,
          10% or 25%, and a flat 0.3 kg a day covers cooking oil, sugar, sauces and drinks nobody logs.
        </p>
      </div>
    </details>
  );
}
