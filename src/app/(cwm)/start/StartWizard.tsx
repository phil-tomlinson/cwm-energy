"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { STORAGE_KEYS, parseTimeline, useIsClient, useStoredRaw } from "@/lib/timeline/useStored";
import { HEATING_SYSTEMS } from "@/data/energyPrices";
import { waterHeaterTypes } from "@/calculations/waterHeater";
import { getCitiesForProvince } from "@/data/climateData";
import { constructionEras, houseTypes, basementTypes } from "@/data/houseDefaults";
import { PROVINCES, type Province } from "@/lib/factors";
import { clearTimeline, newId, saveTimeline } from "@/lib/timeline/storage";
import { toMonthIndex } from "@/lib/timeline/engine";
import type { EnvelopeUpgrade, HomeChange, Residence, Timeline, Vehicle, VehicleFuel } from "@/lib/timeline/types";
import { Card, Checkbox, MonthField, NumberField, SelectField, TextField } from "./fields";

const STEPS = ["Your home", "What you've changed", "What you drive", "Check and save"];

const FT2_PER_M2 = 10.7639;

const ORIENTATIONS = [
  { value: "south", label: "South" }, { value: "se", label: "South-east" }, { value: "sw", label: "South-west" },
  { value: "east", label: "East" }, { value: "west", label: "West" }, { value: "north", label: "North" },
];

const FUELS: { value: VehicleFuel; label: string; unit: string; efficiency: number }[] = [
  { value: "gasoline", label: "Gas", unit: "L/100 km", efficiency: 9.0 },
  { value: "hybrid", label: "Hybrid", unit: "L/100 km", efficiency: 5.5 },
  { value: "diesel", label: "Diesel", unit: "L/100 km", efficiency: 9.5 },
  { value: "ev", label: "Electric", unit: "kWh/100 km", efficiency: 19 },
];

const ENVELOPE: { kind: EnvelopeUpgrade; title: string; button: string }[] = [
  { kind: "attic", title: "Attic insulation (to about R-50)", button: "Attic insulation" },
  { kind: "walls", title: "Wall insulation (to about R-24)", button: "Wall insulation" },
  { kind: "windows", title: "High-performance windows", button: "New windows" },
  { kind: "airSealing", title: "Air sealing", button: "Air sealing" },
];

function defaultTimeline(): Timeline {
  const y = new Date().getFullYear() - 5;
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    residences: [{
      id: "home-1", province: "AB", city: "Calgary", houseType: "detached", era: "1980_1999",
      floorAreaM2: 150, storeys: 2, basementType: "full_heated", occupants: 2,
      heatingSystemId: "furnace_90", waterHeaterType: "storage_gas", start: `${y}-01`,
    }],
    changes: [],
    vehicles: [],
  };
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Problems that would make the numbers wrong, in plain words. */
function problems(t: Timeline): string[] {
  const out: string[] = [];
  const home = t.residences[0];
  const now = toMonthIndex(thisMonth());
  if (!(home.floorAreaM2 > 10)) out.push("Your home's size needs a number.");
  if (!(home.occupants >= 1)) out.push("Add how many people live in your home.");
  if (toMonthIndex(home.start) > now) out.push("Your move-in date is in the future.");
  if (home.end && toMonthIndex(home.end) <= toMonthIndex(home.start)) out.push("Your move-out date is before your move-in date.");
  for (const c of t.changes) {
    if (toMonthIndex(c.date) < toMonthIndex(home.start)) out.push(`A change is dated before you moved in. Upgrades made before then are part of how the home was; set them in Your home instead.`);
    if (toMonthIndex(c.date) > now) out.push("A change is dated in the future.");
    if (c.kind === "solar" && !(c.kW > 0)) out.push("Your solar size needs a number of kW.");
  }
  for (const v of t.vehicles) {
    if (!(v.efficiency > 0) || !(v.annualKm >= 0)) out.push(`${v.label || "A vehicle"} needs its fuel use and kilometres.`);
    if (v.end && toMonthIndex(v.end) <= toMonthIndex(v.start)) out.push(`${v.label || "A vehicle"} ends before it starts.`);
  }
  return [...new Set(out)];
}

export default function StartWizard() {
  const isClient = useIsClient();
  const raw = useStoredRaw(STORAGE_KEYS.timeline);
  if (!isClient) return <div className="min-h-[60vh]" aria-busy="true" />;
  return <Wizard initial={parseTimeline(raw)} />;
}

function Wizard({ initial }: { initial: Timeline | null }) {
  const router = useRouter();
  const [t, setT] = useState<Timeline>(() => initial ?? defaultTimeline());
  const [step, setStep] = useState(0);
  const [hadSaved, setHadSaved] = useState(initial !== null);
  const [areaUnit, setAreaUnit] = useState<"m2" | "ft2">("ft2");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const home = t.residences[0];
  const setHome = (patch: Partial<Residence>) =>
    setT((prev) => ({ ...prev, residences: [{ ...prev.residences[0], ...patch }, ...prev.residences.slice(1)] }));
  const setChange = (id: string, patch: Partial<HomeChange>) =>
    setT((prev) => ({ ...prev, changes: prev.changes.map((c) => (c.id === id ? ({ ...c, ...patch } as HomeChange) : c)) }));
  const removeChange = (id: string) => setT((prev) => ({ ...prev, changes: prev.changes.filter((c) => c.id !== id) }));
  const addChange = (c: HomeChange) => setT((prev) => ({ ...prev, changes: [...prev.changes, c] }));
  const setVehicle = (id: string, patch: Partial<Vehicle>) =>
    setT((prev) => {
      let vehicles = prev.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v));
      // Choosing what a vehicle replaced ends the old one on the new one's start date.
      const changed = vehicles.find((v) => v.id === id)!;
      if (changed.replaces) {
        vehicles = vehicles.map((v) => (v.id === changed.replaces && (!v.end || patch.replaces) ? { ...v, end: changed.start } : v));
      }
      return { ...prev, vehicles };
    });
  const removeVehicle = (id: string) =>
    setT((prev) => ({ ...prev, vehicles: prev.vehicles.filter((v) => v.id !== id).map((v) => (v.replaces === id ? { ...v, replaces: undefined } : v)) }));

  const cities = getCitiesForProvince(home.province).map((c: { city: string }) => ({ value: c.city, label: c.city }));
  const heatingOptions = HEATING_SYSTEMS.map((h: { id: string; label: string }) => ({ value: h.id, label: h.label }));
  const waterOptions = waterHeaterTypes.map((w) => ({ value: w.value, label: w.label }));
  const issues = problems(t);

  const save = () => {
    saveTimeline(t);
    router.push("/my-footprint");
  };

  const area = areaUnit === "m2" ? home.floorAreaM2 : Math.round(home.floorAreaM2 * FT2_PER_M2);

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-[15px] font-semibold text-scree">Step {step + 1} of {STEPS.length}</p>
        <h1 ref={headingRef} tabIndex={-1} className="m-0 text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] outline-none sm:text-[40px] sm:leading-[44px]">
          {step === 0 && "Start with your home."}
          {step === 1 && "What have you already changed, and when?"}
          {step === 2 && "What do you drive?"}
          {step === 3 && "Check it over."}
        </h1>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-[6px] flex-1 rounded-full ${i <= step ? "bg-glacier" : "bg-hairline"}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <p className="m-0 max-w-[620px]">
            Tell us how the home was when you moved in. Upgrades you made after that come next, with their dates.
            Rough answers are fine.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField label="Province or territory" value={home.province} options={PROVINCES.map((p) => ({ value: p.code, label: p.name }))}
              onChange={(v) => {
                const first = getCitiesForProvince(v)[0]?.city ?? "";
                setHome({ province: v as Province, city: first });
              }} />
            <SelectField label="Nearest city" hint="Used for your climate." value={home.city} options={cities} onChange={(v) => setHome({ city: v })} />
            <SelectField label="Type of home" value={home.houseType} options={houseTypes} onChange={(v) => setHome({ houseType: v as Residence["houseType"] })} />
            <SelectField label="When it was built" value={home.era} options={constructionEras} onChange={(v) => setHome({ era: v as Residence["era"] })} />
            <div className="flex gap-2">
              <div className="flex-1">
                <NumberField label="Living area" value={area} min={10} step={areaUnit === "m2" ? 5 : 50}
                  onChange={(v) => setHome({ floorAreaM2: areaUnit === "m2" ? v : v / FT2_PER_M2 })} />
              </div>
              <div className="w-[110px]">
                <SelectField label="Unit" value={areaUnit} options={[{ value: "ft2", label: "sq ft" }, { value: "m2", label: "m²" }]} onChange={(v) => setAreaUnit(v)} />
              </div>
            </div>
            <SelectField label="Storeys above ground" value={home.storeys} options={[1, 1.5, 2, 2.5, 3].map((n) => ({ value: n, label: String(n) }))} onChange={(v) => setHome({ storeys: v })} />
            <SelectField label="Basement" value={home.basementType} options={basementTypes} onChange={(v) => setHome({ basementType: v as Residence["basementType"] })} />
            <NumberField label="People living there" hint="Home emissions are split between everyone." value={home.occupants} min={1} max={12}
              onChange={(v) => setHome({ occupants: Math.max(1, Math.round(v || 1)) })} />
            <SelectField label="Heating when you moved in" value={home.heatingSystemId} options={heatingOptions} onChange={(v) => setHome({ heatingSystemId: v })} />
            <SelectField label="Water heater when you moved in" value={home.waterHeaterType} options={waterOptions} onChange={(v) => setHome({ waterHeaterType: v })} />
            <MonthField label="Moved in" value={home.start} onChange={(v) => setHome({ start: v })} />
            <div className="flex flex-col gap-2">
              <Checkbox label="I still live here" checked={!home.end} onChange={(still) => setHome({ end: still ? undefined : thisMonth() })} />
              {home.end && <MonthField label="Moved out" value={home.end} onChange={(v) => setHome({ end: v })} />}
            </div>
          </div>
          <p className="m-0 text-[15px] leading-[22px] text-scree">
            Lived somewhere else before this? Earlier homes are coming soon. For now, start from this one.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <p className="m-0 max-w-[620px]">
            Add each change with the month you made it. We count its impact from then on, against that year&apos;s grid.
          </p>
          {t.changes.length === 0 && (
            <p className="m-0 rounded-[10px] border border-dashed border-hairline p-4 text-scree">
              Nothing yet. Add a change below, or skip this step if you haven&apos;t made any.
            </p>
          )}
          {t.changes.map((c) => {
            if (c.kind === "solar") {
              return (
                <Card key={c.id} title="Rooftop solar" onRemove={() => removeChange(c.id)}>
                  <NumberField label="System size" unit="kW" value={c.kW} min={0.5} max={50} step={0.1} onChange={(v) => setChange(c.id, { kW: v })} />
                  <SelectField label="Panels face" value={c.orientation} options={ORIENTATIONS} onChange={(v) => setChange(c.id, { orientation: v })} />
                  <MonthField label="Switched on" value={c.date} onChange={(v) => setChange(c.id, { date: v })} />
                </Card>
              );
            }
            if (c.kind === "heating") {
              return (
                <Card key={c.id} title="New heating" onRemove={() => removeChange(c.id)}>
                  <SelectField label="New system" value={c.heatingSystemId} options={heatingOptions} onChange={(v) => setChange(c.id, { heatingSystemId: v })} />
                  <MonthField label="Installed" value={c.date} onChange={(v) => setChange(c.id, { date: v })} />
                </Card>
              );
            }
            if (c.kind === "waterHeater") {
              return (
                <Card key={c.id} title="New water heater" onRemove={() => removeChange(c.id)}>
                  <SelectField label="New water heater" value={c.waterHeaterType} options={waterOptions} onChange={(v) => setChange(c.id, { waterHeaterType: v })} />
                  <MonthField label="Installed" value={c.date} onChange={(v) => setChange(c.id, { date: v })} />
                </Card>
              );
            }
            const env = ENVELOPE.find((e) => e.kind === c.kind)!;
            return (
              <Card key={c.id} title={env.title} onRemove={() => removeChange(c.id)}>
                <MonthField label="Done" value={c.date} onChange={(v) => setChange(c.id, { date: v })} />
              </Card>
            );
          })}

          <div className="flex flex-col gap-3">
            <p className="m-0 font-semibold">Add a change</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Solar panels", make: (): HomeChange => ({ id: newId("solar"), kind: "solar", residenceId: home.id, date: thisMonth(), kW: 6, orientation: "south" }) },
                { label: "Heat pump or new heating", make: (): HomeChange => ({ id: newId("heat"), kind: "heating", residenceId: home.id, date: thisMonth(), heatingSystemId: "ccashp" }) },
                { label: "Water heater", make: (): HomeChange => ({ id: newId("water"), kind: "waterHeater", residenceId: home.id, date: thisMonth(), waterHeaterType: "hpwh" }) },
                ...ENVELOPE.map((e) => ({ label: e.button, make: (): HomeChange => ({ id: newId(e.kind), kind: e.kind, residenceId: home.id, date: thisMonth() }) })),
              ].map((b) => (
                <button key={b.label} type="button" onClick={() => addChange(b.make())}
                  className="min-h-11 rounded-full border-2 border-glacier px-4 text-[15px] font-semibold text-glacier">
                  + {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <p className="m-0 max-w-[620px]">
            Add the vehicles you&apos;ve driven since moving in. If you switched cars, add both and say which one the
            new one replaced: that&apos;s how we count the switch.
          </p>
          {t.vehicles.length === 0 && (
            <p className="m-0 rounded-[10px] border border-dashed border-hairline p-4 text-scree">
              No vehicles yet. Skip this step if you don&apos;t drive.
            </p>
          )}
          {t.vehicles.map((v) => {
            const fuel = FUELS.find((f) => f.value === v.fuel)!;
            const others = t.vehicles.filter((o) => o.id !== v.id);
            return (
              <Card key={v.id} title={v.label || "Vehicle"} onRemove={() => removeVehicle(v.id)}>
                <TextField label="Name" hint="Anything that helps you recognise it." value={v.label} onChange={(x) => setVehicle(v.id, { label: x })} />
                <SelectField label="Fuel" value={v.fuel} options={FUELS.map((f) => ({ value: f.value, label: f.label }))}
                  onChange={(x) => setVehicle(v.id, { fuel: x, efficiency: FUELS.find((f) => f.value === x)!.efficiency })} />
                <NumberField label="Fuel use" unit={fuel.unit} hint="The combined figure on its EnerGuide label is fine." value={v.efficiency} min={0} step={0.1}
                  onChange={(x) => setVehicle(v.id, { efficiency: x })} />
                <NumberField label="Kilometres a year" value={v.annualKm} min={0} step={500} onChange={(x) => setVehicle(v.id, { annualKm: x })} />
                <NumberField label="People sharing its emissions" hint="Usually 1. More if it's a regular carpool." value={v.people} min={1} max={8}
                  onChange={(x) => setVehicle(v.id, { people: Math.max(1, Math.round(x || 1)) })} />
                {others.length > 0 && (
                  <SelectField label="It replaced" value={v.replaces ?? ""}
                    options={[{ value: "", label: "Nothing (an extra vehicle)" }, ...others.map((o) => ({ value: o.id, label: o.label || "Another vehicle" }))]}
                    onChange={(x) => setVehicle(v.id, { replaces: x || undefined })} />
                )}
                <MonthField label="Started driving it" value={v.start} onChange={(x) => setVehicle(v.id, { start: x })} />
                <div className="flex flex-col gap-2">
                  <Checkbox label="Still driving it" checked={!v.end} onChange={(still) => setVehicle(v.id, { end: still ? undefined : thisMonth() })} />
                  {v.end && <MonthField label="Stopped driving it" value={v.end} onChange={(x) => setVehicle(v.id, { end: x })} />}
                </div>
              </Card>
            );
          })}
          <button type="button"
            onClick={() => setT((prev) => ({ ...prev, vehicles: [...prev.vehicles, {
              id: newId("car"), label: prev.vehicles.length === 0 ? "My car" : "New car", fuel: "gasoline", efficiency: 9, annualKm: 15000, people: 1,
              start: prev.vehicles.length === 0 ? home.start : thisMonth(),
            }] }))}
            className="min-h-11 self-start rounded-full border-2 border-glacier px-4 text-[15px] font-semibold text-glacier">
            + Add a vehicle
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[200px_1fr]">
            <dt className="font-semibold">Home</dt>
            <dd className="m-0">
              {houseTypes.find((h) => h.value === home.houseType)?.label} in {home.city}, {home.occupants} {home.occupants === 1 ? "person" : "people"}, since {home.start}
            </dd>
            <dt className="font-semibold">Changes</dt>
            <dd className="m-0">{t.changes.length === 0 ? "None yet" : `${t.changes.length} dated ${t.changes.length === 1 ? "change" : "changes"}`}</dd>
            <dt className="font-semibold">Vehicles</dt>
            <dd className="m-0">{t.vehicles.length === 0 ? "None" : t.vehicles.map((v) => v.label || "Vehicle").join(", ")}</dd>
          </dl>
          {issues.length > 0 ? (
            <div role="alert" className="rounded-[10px] border-2 border-fireweed p-4">
              <p className="m-0 mb-2 font-bold">Fix these first:</p>
              <ul className="m-0 pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ) : (
            <p className="m-0 text-scree">
              Saving keeps your timeline in this browser only. You can come back and edit it any time.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-hairline pt-6">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="min-h-11 rounded-full border-2 border-hairline px-6 font-semibold">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className="min-h-11 rounded-full bg-glacier px-7 font-bold text-on-glacier">
            Next: {STEPS[step + 1]}
          </button>
        ) : (
          <button type="button" onClick={save} disabled={issues.length > 0}
            className="min-h-11 rounded-full bg-glacier px-7 font-bold text-on-glacier disabled:opacity-50">
            Save and see my footprint
          </button>
        )}
        {hadSaved && step === STEPS.length - 1 && (
          <button type="button" className="ml-auto min-h-11 px-2 text-[15px] font-semibold text-glacier underline"
            onClick={() => {
              if (window.confirm("Clear your saved timeline from this browser? This can't be undone.")) {
                clearTimeline();
                setT(defaultTimeline());
                setHadSaved(false);
                setStep(0);
              }
            }}>
            Clear my timeline
          </button>
        )}
        {!hadSaved && step === 0 && (
          <Link href="/my-footprint?example=1" className="ml-auto text-[15px] font-semibold text-glacier underline">
            See an example first
          </Link>
        )}
      </div>
    </div>
  );
}
