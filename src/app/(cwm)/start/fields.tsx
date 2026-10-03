"use client";
import { useId } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const inputClass =
  "h-11 w-full rounded-[4px] border border-hairline bg-snowfield-raised px-3 text-[17px] text-basalt";

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[15px] font-semibold leading-[20px]">{label}</label>
      {children(id)}
      {hint && <p className="m-0 text-[13px] leading-[18px] text-scree">{hint}</p>}
    </div>
  );
}

export function SelectField<T extends string | number>({ label, hint, value, options, onChange }: {
  label: string; hint?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select
          id={id}
          className={inputClass}
          value={String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            const match = options.find((o) => String(o.value) === raw);
            if (match) onChange(match.value);
          }}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function NumberField({ label, hint, value, onChange, min, max, step = 1, unit }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string
}) {
  return (
    <Field label={unit ? `${label} (${unit})` : label} hint={hint}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={inputClass}
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        />
      )}
    </Field>
  );
}

export function TextField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => <input id={id} type="text" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

/** Month and year as two selects: works in every browser, unlike type="month". */
export function MonthField({ label, value, onChange, minYear = 1990 }: {
  label: string; value: string; onChange: (v: string) => void; minYear?: number
}) {
  const id = useId();
  const now = new Date();
  const [y, m] = value.split("-").map(Number);
  const years: number[] = [];
  for (let yr = now.getFullYear(); yr >= minYear; yr--) years.push(yr);
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-1 p-0 text-[15px] font-semibold leading-[20px]">{label}</legend>
      <div className="flex gap-2">
        <label htmlFor={`${id}-m`} className="sr-only">Month</label>
        <select id={`${id}-m`} className={`${inputClass} flex-1`} value={m} onChange={(e) => onChange(`${y}-${String(e.target.value).padStart(2, "0")}`)}>
          {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <label htmlFor={`${id}-y`} className="sr-only">Year</label>
        <select id={`${id}-y`} className={`${inputClass} flex-1`} value={y} onChange={(e) => onChange(`${e.target.value}-${String(m).padStart(2, "0")}`)}>
          {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
        </select>
      </div>
    </fieldset>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input id={id} type="checkbox" className="h-5 w-5 accent-[var(--glacier)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id} className="text-[17px]">{label}</label>
    </div>
  );
}

export function Card({ title, onRemove, children }: { title: string; onRemove?: () => void; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[10px] border border-hairline bg-snowfield-raised p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <h3 className="m-0 mr-auto text-[19px] font-bold leading-[24px]">{title}</h3>
        {onRemove && (
          <button type="button" onClick={onRemove} className="min-h-11 px-2 text-[15px] font-semibold text-glacier underline">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
