"use client";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { Panel, tonnes } from "@/components/cwm/ui";
import {
  CABIN_LABELS, DISTANCE_UPLIFT, FLIGHT_SOURCE, FLIGHT_SOURCE_URL, GROUND, MODE_LABELS, flightBand, greatCircleKm, tripKg,
} from "@/lib/travel";
import { newId, saveTimeline } from "@/lib/timeline/storage";
import { STORAGE_KEYS, parseTimeline, useIsClient, useStoredRaw } from "@/lib/timeline/useStored";
import type { Cabin, Timeline, Trip, TripMode } from "@/lib/timeline/types";
import { MonthField, inputClass } from "../start/fields";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Airport = { code: string; name: string; city: string; country: string; lat: number; lon: number; large: boolean };

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function useAirports(): Airport[] | null {
  const [list, setList] = useState<Airport[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/data/airports.json")
      .then((r) => r.json())
      .then((d: { rows: [string, string, string, string, number, number, number][] }) => {
        if (live) setList(d.rows.map(([code, name, city, country, lat, lon, large]) => ({ code, name, city, country, lat, lon, large: large === 1 })));
      })
      .catch(() => { if (live) setList([]); });
    return () => { live = false; };
  }, []);
  return list;
}

function searchAirports(list: Airport[], q: string): Airport[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const score = (a: Airport): number => {
    if (a.code.toLowerCase() === s) return 0;
    if (a.city.toLowerCase().startsWith(s)) return a.large ? 1 : 2;
    if (a.name.toLowerCase().includes(s)) return a.large ? 3 : 4;
    if (a.city.toLowerCase().includes(s)) return 5;
    return 99;
  };
  return list
    .map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s < 99)
    .sort((x, y) => x.s - y.s)
    .slice(0, 8)
    .map((x) => x.a);
}

export default function TripsView() {
  const ready = useIsClient();
  const raw = useStoredRaw(STORAGE_KEYS.timeline);
  const t = useMemo(() => parseTimeline(raw), [raw]);
  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <header className="flex max-w-[760px] flex-col gap-3">
        <h1 className="m-0 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[48px] sm:leading-[50px]">
          Your trips.
        </h1>
        <p className="m-0">
          Flights, trains, buses and ferries, past and planned. Each trip lands in the month you took it. Road trips in
          your own car are already counted in its yearly distance.
        </p>
      </header>
      {t ? <TripsEditor t={t} /> : (
        <Panel className="flex max-w-[760px] flex-col gap-3">
          <p className="m-0">Trips go on your timeline, next to your home and car. Start your timeline first; it takes about five minutes.</p>
          <Link href="/start" data-button className="self-start rounded-full bg-glacier px-6 py-3 font-bold text-on-glacier no-underline">Start your timeline</Link>
        </Panel>
      )}
    </div>
  );
}

function TripsEditor({ t }: { t: Timeline }) {
  const trips = [...(t.trips ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const airports = useAirports();
  const byCode = useMemo(() => new Map((airports ?? []).map((a) => [a.code, a])), [airports]);
  const save = (next: Trip[]) => saveTimeline({ ...t, trips: next });

  const years = [...new Set(trips.map((x) => x.date.slice(0, 4)))];
  const placeName = (s?: string) => (s && byCode.get(s) ? `${byCode.get(s)!.city || byCode.get(s)!.name} (${s})` : s ?? "");

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-6">
        <AddTrip airports={airports} onAdd={(trip) => save([...(t.trips ?? []), trip])} />
        {trips.length === 0 ? (
          <p className="m-0 text-scree">No trips yet. Add your flights from the last few years to see them on your footprint.</p>
        ) : (
          years.map((y) => {
            const inYear = trips.filter((x) => x.date.startsWith(y));
            const total = inYear.reduce((s, x) => { const k = tripKg(x); return s + k.kg + k.extraKg; }, 0);
            return (
              <section key={y} aria-labelledby={`y-${y}`}>
                <h2 id={`y-${y}`} className="m-0 mb-2 flex items-baseline gap-3 text-[22px] font-bold">
                  {y} <span className="text-[15px] font-semibold text-scree tabular-nums">{tonnes(total)}</span>
                </h2>
                <ul className="m-0 list-none border-t border-hairline p-0">
                  {inYear.map((x) => {
                    const k = tripKg(x);
                    return (
                      <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline py-3">
                        <span className="min-w-0 flex-[1_1_280px]">
                          <strong>{x.from || x.to ? `${placeName(x.from)} to ${placeName(x.to)}` : MODE_LABELS[x.mode]}</strong>
                          {x.roundTrip ? " and back" : ""}
                          <br />
                          <span className="text-[13px] text-scree">
                            {monthName(x.date)}<span aria-hidden="true" className="mx-1.5">·</span>{MODE_LABELS[x.mode]}
                            {x.mode === "flight" && x.cabin && x.cabin !== "economy" ? `, ${CABIN_LABELS[x.cabin].toLowerCase()}` : ""}
                            <span aria-hidden="true" className="mx-1.5">·</span>{Math.round(k.km).toLocaleString("en-CA")} km
                          </span>
                        </span>
                        <span className="text-right tabular-nums">
                          <strong>{tonnes(k.kg + k.extraKg, 2)}</strong>
                          {k.extraKg > 0 && <><br /><span className="text-[13px] text-scree">incl. {tonnes(k.extraKg, 2)} at altitude</span></>}
                        </span>
                        <button type="button" onClick={() => save((t.trips ?? []).filter((z) => z.id !== x.id))} className="min-h-11 px-2 text-[15px] font-semibold text-glacier underline" aria-label={`Remove trip ${placeName(x.from)} to ${placeName(x.to)}, ${monthName(x.date)}`}>
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
      <aside className="flex flex-[1_1_300px] flex-col gap-4">
        <Panel className="flex flex-col gap-2 text-[15px] leading-[22px]">
          <p className="m-0 font-bold">What a flight costs the climate</p>
          <p className="m-0 text-scree">
            Calgary to Toronto and back in economy is about 0.4 t of fuel emissions, plus about 0.3 t of extra warming from
            contrails and nitrogen oxides at altitude: roughly what a gas car emits in 3,500 km.
          </p>
          <p className="m-0 text-scree">
            Short hops burn the most per kilometre, because take-off is the thirstiest part. Business class takes more of
            the plane&apos;s space, so more of its emissions.
          </p>
        </Panel>
        <details className="text-[15px] leading-[22px]">
          <summary className="cursor-pointer font-semibold text-glacier">How we worked this out</summary>
          <div className="mt-3 flex flex-col gap-2 text-scree">
            <p className="m-0">
              Flights use the straight-line distance between airports plus {Math.round((DISTANCE_UPLIFT - 1) * 100)}% for routing, and
              per-passenger factors from <a href={FLIGHT_SOURCE_URL} className="text-glacier underline">{FLIGHT_SOURCE}</a>: one
              figure for hops under 500 km, short-haul up to 3,700 km, and long-haul beyond. We include the extra warming at
              altitude (about 1.7 times the CO₂ effect) and show it as its own line, because the science is real but
              uncertain.
            </p>
            <p className="m-0">
              Train: {GROUND.rail.source}. Bus: {GROUND.bus.source}. Ferry: {GROUND.ferry.source}; taking a car on board adds more.
            </p>
          </div>
        </details>
      </aside>
    </div>
  );
}

function AddTrip({ airports, onAdd }: { airports: Airport[] | null; onAdd: (t: Trip) => void }) {
  const [mode, setMode] = useState<TripMode>("flight");
  const [from, setFrom] = useState<Airport | null>(null);
  const [to, setTo] = useState<Airport | null>(null);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [km, setKm] = useState<number>(NaN);
  const [roundTrip, setRoundTrip] = useState(true);
  const [cabin, setCabin] = useState<Cabin>("economy");
  const [date, setDate] = useState(thisMonth());
  const [error, setError] = useState("");

  const flightKm = from && to ? greatCircleKm(from.lat, from.lon, to.lat, to.lon) : NaN;
  const oneWay = Math.round(mode === "flight" ? flightKm : km);
  const preview = Number.isFinite(oneWay) && oneWay > 0 ? tripKg({ mode, km: oneWay, roundTrip, cabin }) : null;

  const reset = () => { setFrom(null); setTo(null); setFromText(""); setToText(""); setKm(NaN); setError(""); };
  const add = () => {
    if (mode === "flight" && (!from || !to)) { setError("Pick both airports from the list."); return; }
    if (mode === "flight" && from && to && from.code === to.code) { setError("Pick two different airports."); return; }
    if (mode !== "flight" && !(km > 0)) { setError("Enter the distance one way, in km."); return; }
    onAdd({
      id: newId("trip"), mode, date, roundTrip, km: oneWay,
      ...(mode === "flight" ? { from: from!.code, to: to!.code, cabin } : { from: fromText.trim() || undefined, to: toText.trim() || undefined }),
    });
    reset();
  };

  return (
    <Panel className="flex flex-col gap-4">
      <h2 className="m-0 text-[22px] font-bold leading-[28px]">Add a trip</h2>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-[15px] font-semibold">How did you travel?</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MODE_LABELS) as TripMode[]).map((m) => (
            <label key={m} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 ${mode === m ? "border-glacier bg-glacier/10" : "border-hairline"}`}>
              <input type="radio" name="mode" className="h-4 w-4 accent-[var(--glacier)]" checked={mode === m} onChange={() => { setMode(m); setError(""); }} />
              {MODE_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mode === "flight" ? (
          <>
            <AirportField label="From" airports={airports} value={from} onChange={setFrom} />
            <AirportField label="To" airports={airports} value={to} onChange={setTo} />
            <label className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">Cabin</span>
              <select className={inputClass} value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)}>
                {(Object.keys(CABIN_LABELS) as Cabin[]).map((c) => <option key={c} value={c}>{CABIN_LABELS[c]}</option>)}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">From (optional)</span>
              <input className={inputClass} value={fromText} onChange={(e) => setFromText(e.target.value)} placeholder="Calgary" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">To (optional)</span>
              <input className={inputClass} value={toText} onChange={(e) => setToText(e.target.value)} placeholder="Banff" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold">Distance one way (km)</span>
              <input className={inputClass} type="number" inputMode="decimal" min={1} value={Number.isFinite(km) ? km : ""} onChange={(e) => setKm(e.target.value === "" ? NaN : Number(e.target.value))} />
              <span className="text-[13px] leading-[18px] text-scree">A map app&apos;s driving distance is close enough.</span>
            </label>
          </>
        )}
        <MonthField label="When" value={date} onChange={setDate} minYear={2000} />
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[var(--glacier)]" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
        <span>Return trip (there and back)</span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={add} className="min-h-11 rounded-full bg-glacier px-6 py-3 font-bold text-on-glacier">Add trip</button>
        {preview && (
          <p className="m-0 text-[15px] tabular-nums" aria-live="polite">
            {Math.round(preview.km).toLocaleString("en-CA")} km{mode === "flight" ? `, ${flightBand(oneWay) === "long" ? "long-haul" : flightBand(oneWay) === "short" ? "short-haul" : "short hop"}` : ""}:{" "}
            <strong>{tonnes(preview.kg + preview.extraKg, 2)}</strong>
            {preview.extraKg > 0 && <span className="text-scree"> incl. {tonnes(preview.extraKg, 2)} at altitude</span>}
          </p>
        )}
        {error && <p role="alert" className="m-0 text-[15px] text-fireweed">{error}</p>}
      </div>
    </Panel>
  );
}

function AirportField({ label, airports, value, onChange }: {
  label: string; airports: Airport[] | null; value: Airport | null; onChange: (a: Airport | null) => void
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => (airports ? searchAirports(airports, q) : []), [airports, q]);
  const shown = value ? `${value.city || value.name} (${value.code})` : q;

  const pick = (a: Airport) => { onChange(a); setQ(""); setOpen(false); };

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-[15px] font-semibold">{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${id}-${results[active].code}` : undefined}
        className={inputClass}
        placeholder={airports ? "City or airport code" : "Loading airports…"}
        value={shown}
        disabled={!airports}
        onChange={(e) => { onChange(null); setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full z-20 m-0 mt-1 max-h-[320px] list-none overflow-auto rounded-[8px] border border-hairline bg-snowfield-raised p-1 shadow-lg">
          {results.map((a, i) => (
            <li
              key={a.code}
              id={`${id}-${a.code}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(a); }}
              className={`cursor-pointer rounded-[6px] px-3 py-2 text-[15px] leading-[20px] ${i === active ? "bg-glacier/10" : ""}`}
            >
              <strong>{a.code}</strong> {a.city || a.name}
              <span className="block text-[13px] text-scree">{a.name}, {a.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
