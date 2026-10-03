"use client";
import { useEffect, useRef, useState } from "react";
import type { ActionImpact, YearPoint } from "@/lib/timeline/types";
import { tonnes } from "./ui";

interface Props {
  years: YearPoint[];
  actions: ActionImpact[];
  target2030Kg: number;
  now?: Date;
}

const TARGET_YEAR = 2030;

/**
 * The altitude view: your footprint per year as a descent toward the valley
 * floor (your 2030 target). Drawn at the container's real pixel width so the
 * labels stay readable on a phone.
 */
export default function AltitudeChart({ years, actions, target2030Kg, now = new Date() }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.max(300, entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (years.length === 0) return null;

  const narrow = width < 560;
  const H = narrow ? 260 : 340;
  const left = narrow ? 36 : 48;
  const right = 12;
  const top = 28;
  const valleyH = narrow ? 52 : 64;
  const bottom = H - valleyH;

  const first = years[0].year;
  const lastYear = Math.max(TARGET_YEAR, years.at(-1)!.year);
  const slots = lastYear - first + 1;
  const slot = (width - left - right) / slots;
  const x = (yearFloat: number) => left + (yearFloat - first) * slot;

  const peak = Math.max(...years.map((p) => Math.max(p.actualKg, p.baselineKg)), target2030Kg);
  const tick = peak > 15000 ? 5000 : 2000;
  const yMax = Math.max(tick * 2, Math.ceil((peak * 1.08) / tick) * tick);
  const plotTop = top;
  // The valley floor sits at the target; the plot above it spans target → yMax.
  const y = (kg: number) => {
    const t = Math.min(1, Math.max(0, (kg - target2030Kg) / (yMax - target2030Kg)));
    return bottom - t * (bottom - plotTop);
  };

  const past = years.filter((p) => !p.projected);
  const current = years.find((p) => p.projected);

  const stepPath = (pts: YearPoint[], key: "actualKg" | "baselineKg") =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year)},${y(p[key])} L${x(p.year + 1)},${y(p[key])}`).join(" ");

  const actualPath = stepPath(past, "actualKg");
  const areaPath = past.length
    ? `${stepPath(past, "actualKg")} L${x(past.at(-1)!.year + 1)},${bottom} L${x(past[0].year)},${bottom} Z`
    : "";
  const baselinePath = stepPath(years, "baselineKg");

  const gridLines: number[] = [];
  for (let kg = tick; kg <= yMax; kg += tick) if (kg > target2030Kg) gridLines.push(kg);

  const nowYear = now.getFullYear() + now.getMonth() / 12;

  // Markers at each action's month, on that year's line; labels only where they fit.
  // Labels sit above the line, or below when the previous label is too close; skipped only if both sides are taken.
  const markers: { a: ActionImpact; mx: number; my: number; label: "above" | "below" | null }[] = [];
  const gap = narrow ? 56 : 84;
  // "Today" has its own label, so keep action labels clear of it.
  let lastAbove = -Infinity;
  const todayX = current ? x(nowYear) : Infinity;
  let lastBelow = -Infinity;
  for (const a of actions) {
    const [yy, mm] = a.date.split("-").map(Number);
    const point = years.find((p) => p.year === yy);
    if (!point) continue;
    const mx = x(yy + (mm - 1) / 12);
    const my = y(point.actualKg);
    let label: "above" | "below" | null = null;
    if (Math.abs(todayX - mx) < gap) label = null;
    else if (mx - lastAbove > gap) { label = "above"; lastAbove = mx; }
    else if (mx - lastBelow > gap && my + 26 < bottom) { label = "below"; lastBelow = mx; }
    markers.push({ a, mx, my, label });
  }

  const labelYears = narrow
    ? [first, Math.floor(nowYear), TARGET_YEAR]
    : Array.from({ length: slots }, (_, i) => first + i).filter((yr, i, arr) => arr.length <= 12 || i % 2 === 0 || yr === TARGET_YEAR);

  const summary = `Your footprint went from ${tonnes(years[0].actualKg)} in ${first} to ${tonnes(
    (current ?? years.at(-1)!).actualKg,
  )} in ${(current ?? years.at(-1)!).year}. Your 2030 target is ${tonnes(target2030Kg)}.`;

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={summary} className="block">
        <g fontFamily="inherit">
          {gridLines.map((kg) => (
            <g key={kg}>
              <line x1={left} x2={width - right} y1={y(kg)} y2={y(kg)} stroke="var(--hairline)" />
              <text x={left - 8} y={y(kg) + 5} textAnchor="end" fontSize={13} fill="var(--scree)">
                {kg / 1000} t
              </text>
            </g>
          ))}

          <path d={areaPath} fill="var(--glacier-bright)" />
          <path d={baselinePath} fill="none" stroke="var(--scree)" strokeWidth={2} strokeDasharray="4 6" />
          <path d={actualPath} fill="none" stroke="var(--glacier)" strokeWidth={4} strokeLinejoin="round" />
          {current && (
            <path
              d={`M${x(current.year)},${y(current.actualKg)} L${x(current.year + 1)},${y(current.actualKg)}`}
              stroke="var(--glacier)"
              strokeWidth={4}
              strokeDasharray="8 6"
            />
          )}

          <rect x={left} y={bottom} width={width - left - right} height={valleyH} fill="var(--spruce)" />
          <text x={left + 8} y={bottom + 20} fontSize={narrow ? 12 : 14} fontWeight={700} fill="#FFFFFF">
            Valley floor: your 2030 target, {tonnes(target2030Kg)}
          </text>
          {labelYears.map((yr) => (
            <text
              key={yr}
              x={yr === TARGET_YEAR ? x(yr + 1) - 4 : x(yr + 0.5)}
              y={H - 10}
              textAnchor={yr === TARGET_YEAR ? "end" : "middle"}
              fontSize={narrow ? 12 : 13}
              fill="#FFFFFF"
            >
              {yr}
            </text>
          ))}

          {markers.map(({ a, mx, my, label }) => (
            <g key={a.id}>
              {a.grade === "hard" ? (
                <rect x={mx - 6} y={my - 6} width={12} height={12} fill="var(--grade-hard)" transform={`rotate(45 ${mx} ${my})`} />
              ) : a.grade === "medium" ? (
                <rect x={mx - 6} y={my - 6} width={12} height={12} fill="var(--grade-medium)" />
              ) : (
                <circle cx={mx} cy={my} r={6} fill="var(--grade-easy)" />
              )}
              {label && (
                <text x={mx + 10} y={label === "above" ? my - 10 : my + 22} fontSize={narrow ? 12 : 14} fontWeight={700} fill="var(--basalt)">
                  {a.short}
                </text>
              )}
            </g>
          ))}

          {current && (
            <g>
              <circle cx={x(nowYear)} cy={y(current.actualKg)} r={8} fill="var(--snowfield-raised)" stroke="var(--basalt)" strokeWidth={3} />
              <text x={x(nowYear)} y={y(current.actualKg) - 14} textAnchor="middle" fontSize={narrow ? 12 : 14} fontWeight={700} fill="var(--basalt)">
                Today
              </text>
            </g>
          )}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] leading-[18px] text-scree">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-1 w-6 rounded bg-glacier" /> Your footprint
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block w-6 border-t-2 border-dashed border-scree" /> If you&apos;d changed nothing
        </span>
      </div>

      <details className="mt-3 text-[15px]">
        <summary className="cursor-pointer font-semibold text-glacier">Show the numbers as a table</summary>
        <table className="mt-2 w-full border-collapse text-left text-[15px] tabular-nums">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="py-2 pr-4 font-semibold">Year</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Your footprint</th>
              <th scope="col" className="py-2 font-semibold">If you&apos;d changed nothing</th>
            </tr>
          </thead>
          <tbody>
            {years.map((p) => (
              <tr key={p.year} className="border-b border-hairline">
                <td className="py-2 pr-4">{p.year}{p.projected ? " (projected)" : ""}</td>
                <td className="py-2 pr-4">{tonnes(p.actualKg)}</td>
                <td className="py-2">{tonnes(p.baselineKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
