import type { Grade } from "@/lib/timeline/types";
import { ASSUMPTIONS } from "@/lib/factors";

export function tonnes(kg: number, digits = 1): string {
  // Small amounts get an extra decimal so a real saving never shows as "0.0 t".
  const d = Math.abs(kg) > 0 && Math.abs(kg) < 100 ? Math.max(digits, 2) : digits;
  return `${(kg / 1000).toLocaleString("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d })} t`;
}

export function dollars(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString("en-CA")}`;
}

/** Money chip: larch for savings, outlined when a change costs more. */
export function MoneyChip({ value, suffix = "", size = "md" }: { value: number; suffix?: string; size?: "md" | "lg" }) {
  const pad = size === "lg" ? "px-5 py-2 text-[24px] leading-[28px] font-extrabold" : "px-3 py-1 text-[15px] font-bold";
  if (value < 0) {
    return (
      <span className={`inline-block rounded-full border-2 border-scree text-basalt tabular-nums ${pad}`}>
        {dollars(value)} extra{suffix}
      </span>
    );
  }
  return (
    <span className={`inline-block rounded-full bg-larch text-on-larch tabular-nums ${pad}`}>
      {dollars(value)} saved{suffix}
    </span>
  );
}

export function CarbonChip({ kg, suffix = "", size = "md", prefix = "" }: { kg: number; suffix?: string; size?: "md" | "lg"; prefix?: string }) {
  const pad = size === "lg" ? "px-5 py-2 text-[24px] leading-[28px] font-extrabold" : "px-3 py-1 text-[15px] font-bold";
  return (
    <span className={`inline-block rounded-full bg-glacier text-on-glacier tabular-nums ${pad}`}>
      {prefix}{tonnes(kg)} CO2e{suffix}
    </span>
  );
}

const GRADE_WORD: Record<Grade, string> = { easy: "Green circle", medium: "Blue square", hard: "Black diamond" };

/** Ski-trail difficulty: always the shape and its word together. */
export function GradeMark({ grade, showWord = false }: { grade: Grade; showWord?: boolean }) {
  const shape =
    grade === "easy" ? (
      <span aria-hidden="true" className="inline-block h-[11px] w-[11px] shrink-0 rounded-full" style={{ background: "var(--grade-easy)" }} />
    ) : grade === "medium" ? (
      <span aria-hidden="true" className="inline-block h-[11px] w-[11px] shrink-0" style={{ background: "var(--grade-medium)" }} />
    ) : (
      <span aria-hidden="true" className="mx-[2px] inline-block h-[10px] w-[10px] shrink-0 rotate-45" style={{ background: "var(--grade-hard)" }} />
    );
  return (
    <span className="inline-flex items-center gap-2">
      {shape}
      <span className={showWord ? "" : "sr-only"}>{GRADE_WORD[grade]}</span>
    </span>
  );
}

/** "About 2½ elephants" — a playful unit, always the true weight behind it. */
export function elephants(kg: number): string {
  const n = kg / 1000 / ASSUMPTIONS.elephantTonnes.value;
  const halves = Math.round(n * 2) / 2;
  if (n < 0.2) return "a small fraction of an elephant";
  if (n < 0.4) return "about a quarter of an elephant";
  if (n < 0.65) return "about half an elephant";
  if (n < 0.9) return "about three quarters of an elephant";
  const whole = Math.floor(halves);
  const half = halves - whole === 0.5 ? "½" : "";
  const count = `${whole}${half}`;
  return `about ${count} ${whole === 1 && !half ? "elephant" : "elephants"}`;
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Nugget({ kg, children }: { kg: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[28px] font-extrabold leading-[32px] text-fireweed sm:text-[32px] sm:leading-[36px]">
        {capitalise(elephants(kg))}
      </p>
      <p className="m-0 font-serif text-[17px] italic leading-[26px] sm:text-[18px] sm:leading-[28px]">{children}</p>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[10px] border border-hairline bg-snowfield-raised p-4 sm:p-6 ${className}`}>{children}</section>
  );
}

export function PhotoBand({ src, alt, credit, height = "h-[260px] sm:h-[420px]", position = "center" }: {
  src: string; alt: string; credit: string; height?: string; position?: string
}) {
  return (
    <figure className={`relative m-0 overflow-hidden bg-glacier-bright ${height}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} />
      <figcaption className="absolute bottom-3 right-4 rounded-[4px] bg-[#F6F8F7]/85 px-2 py-0.5 text-[13px] leading-[18px] text-[#1A2A36]">
        {credit}
      </figcaption>
    </figure>
  );
}
