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
 * Your footprint per year, told as one story: the dashed line is what you'd
 * emit if you'd changed nothing, the solid line is what you actually emit, and
 * the shaded gap between them is what your changes save. The green floor is
 * your 2030 goal. The axis starts at zero so heights compare honestly.
 * Drawn at the container's real pixel width so labels stay readable on a phone.
 */
export default function AltitudeChart({ years, actions, target2030Kg, now = new Date() }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [selected, setSelected] = useState<number | null>(null);

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
  const left = narrow ? 34 : 44;
  const right = 8;
  const top = 16;
  const axisH = 24; // room for year labels under the plot
  const bottom = H - axisH;

  const first = years[0].year;
  const lastYear = Math.max(TARGET_YEAR, years.at(-1)!.year);
  const slots = lastYear - first + 1;
  const slot = (width - left - right) / slots;
  const x = (yearFloat: number) => left + (yearFloat - first) * slot;

  const peak = Math.max(...years.map((p) => Math.max(p.actualKg, p.baselineKg)), target2030Kg);
  const tick = peak > 15000 ? 5000 : peak > 6000 ? 2000 : 1000;
  const yMax = Math.max(tick * 2, Math.ceil((peak * 1.1) / tick) * tick);
  const y = (kg: number) => bottom - (Math.max(0, kg) / yMax) * (bottom - top);

  const current = years.find((p) => p.projected);
  const lastPoint = years.at(-1)!;

  // Step lines: each year is a flat segment across its slot.
  const steps = (key: "actualKg" | "baselineKg") =>
    years.flatMap((p) => [[x(p.year), y(p[key])], [x(p.year + 1), y(p[key])]] as [number, number][]);
  const toPath = (pts: [number, number][]) => pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ");
  const actualPts = steps("actualKg");
  const baselinePts = steps("baselineKg");
  const savedArea = `${toPath(baselinePts)} ${[...actualPts].reverse().map(([px, py]) => `L${px},${py}`).join(" ")} Z`;

  const gridLines: number[] = [];
  for (let kg = tick; kg <= yMax; kg += tick) gridLines.push(kg);

  const nowYear = now.getFullYear() + now.getMonth() / 12;

  // Action markers sit on the solid line in the month they happened.
  const markers: { a: ActionImpact; mx: number; my: number; label: boolean }[] = [];
  const gap = narrow ? 60 : 84;
  let lastLabel = -Infinity;
  const todayX = current ? x(nowYear) : Infinity;
  for (const a of actions) {
    const [yy, mm] = a.date.split("-").map(Number);
    const point = years.find((p) => p.year === yy);
    if (!point) continue;
    const mx = x(yy + (mm - 1) / 12);
    const label = Math.abs(todayX - mx) >= gap && mx - lastLabel > gap;
    if (label) lastLabel = mx;
    markers.push({ a, mx, my: y(point.actualKg), label });
  }

  const everyOther = narrow ? slots > 8 : slots > 16;
  const labelYears = Array.from({ length: slots }, (_, i) => first + i).filter(
    (yr, i) => !everyOther || i % 2 === 0 || yr === TARGET_YEAR,
  );

  // Direct labels for the two lines, in the empty years before 2030, when there's room.
  const labelX = x(lastPoint.year + 1) + 10;
  const roomForLabels = width - right - labelX > 150;
  const savedNow = lastPoint.baselineKg - lastPoint.actualKg;
  const withY = y(lastPoint.actualKg);
  const withoutY = y(lastPoint.baselineKg);
  const labelsClash = withY - withoutY < 34;

  const summary = `Each year, the dashed line shows your footprint if you'd changed nothing and the solid line shows your actual footprint. In ${lastPoint.year}${
    lastPoint.projected ? " (projected)" : ""
  } that's ${tonnes(lastPoint.baselineKg)} without your changes and ${tonnes(lastPoint.actualKg)} with them. Your 2030 goal is ${tonnes(target2030Kg)}.`;

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={summary} className="block">
        <g fontFamily="inherit">
          {/* 2030 goal: the valley floor */}
          <rect x={left} y={y(target2030Kg)} width={width - left - right} height={bottom - y(target2030Kg)} fill="var(--spruce)" opacity={0.18} />
          <line x1={left} x2={width - right} y1={y(target2030Kg)} y2={y(target2030Kg)} stroke="var(--spruce)" strokeWidth={2} />

          {gridLines.map((kg) => (
            <g key={kg}>
              <line x1={left} x2={width - right} y1={y(kg)} y2={y(kg)} stroke="var(--hairline)" />
              <text x={left - 6} y={y(kg) + 4} textAnchor="end" fontSize={12} fill="var(--scree)">
                {kg / 1000} t
              </text>
            </g>
          ))}
          <line x1={left} x2={width - right} y1={bottom} y2={bottom} stroke="var(--scree)" />
          <text x={left - 6} y={bottom + 4} textAnchor="end" fontSize={12} fill="var(--scree)">0</text>

          {/* Selected year */}
          {selected !== null && selected >= first && (
            <rect x={x(selected)} y={top} width={slot} height={bottom - top} fill="var(--basalt)" opacity={0.07} />
          )}

          {/* What your changes save */}
          <path d={savedArea} fill="var(--glacier-bright)" opacity={0.75} />
          <path d={toPath(baselinePts)} fill="none" stroke="var(--scree)" strokeWidth={2} strokeDasharray="5 5" />
          <path d={toPath(actualPts)} fill="none" stroke="var(--glacier)" strokeWidth={4} strokeLinejoin="round" />

          <text x={left + 6} y={y(target2030Kg) - 6} fontSize={narrow ? 11 : 13} fontWeight={700} fill="var(--basalt)">
            2030 goal: {tonnes(target2030Kg)}
          </text>

          {labelYears.map((yr) => (
            <text key={yr} x={x(yr + 0.5)} y={H - 6} textAnchor="middle" fontSize={narrow ? 11 : 12} fill="var(--scree)">
              {narrow && yr !== first && yr !== TARGET_YEAR ? `'${String(yr).slice(2)}` : yr}
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
                <text x={mx} y={my + 24} textAnchor="middle" fontSize={narrow ? 11 : 13} fontWeight={700} fill="var(--basalt)">
                  {a.short}
                </text>
              )}
            </g>
          ))}

          {current && (
            <g>
              <circle cx={x(nowYear)} cy={y(current.actualKg)} r={7} fill="var(--snowfield-raised)" stroke="var(--basalt)" strokeWidth={3} />
              <text x={x(nowYear)} y={y(current.actualKg) - 12} textAnchor="middle" fontSize={narrow ? 11 : 13} fontWeight={700} fill="var(--basalt)">
                Today
              </text>
            </g>
          )}

          {roomForLabels && (
            <g fontSize={13}>
              <text x={labelX} y={(labelsClash ? withoutY - 6 : withoutY + 4)} fill="var(--scree)">
                Without your changes: <tspan fontWeight={700}>{tonnes(lastPoint.baselineKg)}</tspan>
              </text>
              <text x={labelX} y={(labelsClash ? withoutY + 12 : withY + 4)} fill="var(--glacier)" fontWeight={700}>
                With them: {tonnes(lastPoint.actualKg)}
              </text>
              {savedNow > 100 && !labelsClash && (
                <text x={labelX} y={(withY + withoutY) / 2 + 4} fill="var(--basalt)">
                  Saved: {tonnes(savedNow)} a year
                </text>
              )}
            </g>
          )}
          {/* Tap a year to open its breakdown below */}
          {years.map((p) => (
            <rect
              key={`hit-${p.year}`}
              x={x(p.year)}
              y={top}
              width={slot}
              height={bottom - top + axisH}
              fill="transparent"
              aria-hidden="true"
              style={{ cursor: "pointer" }}
              onClick={() => setSelected((cur) => (cur === p.year ? null : p.year))}
            />
          ))}
        </g>
      </svg>

      <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[13px] leading-[18px] text-scree">
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block w-6 border-t-2 border-dashed border-scree" /> Without your changes
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-1 w-6 rounded bg-glacier" /> With your changes (what you actually emit)
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-6 rounded-sm bg-glacier-bright" /> Saved by your changes
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-1 w-6 rounded bg-spruce" /> Your 2030 goal
        </li>
      </ul>

      <YearBreakdown years={years} selected={selected} onSelect={setSelected} />
    </div>
  );
}

function signed(kg: number): string {
  return kg < 0 ? `−${tonnes(-kg)}` : tonnes(kg);
}

/** Every year, expandable into what added to it and what took away from it. */
function YearBreakdown({ years, selected, onSelect }: {
  years: YearPoint[]; selected: number | null; onSelect: (y: number | null) => void
}) {
  return (
    <section aria-labelledby="year-by-year" className="mt-5">
      <h3 id="year-by-year" className="m-0 text-[17px] font-bold">Year by year</h3>
      <p className="m-0 mb-2 text-[13px] leading-[18px] text-scree">
        Tonnes of CO2e, your share. Open a year, or tap it on the chart, to see what added to it and what took away.
      </p>
      <ul className="m-0 list-none border-t border-hairline p-0">
        {[...years].reverse().map((p) => {
          const open = selected === p.year;
          const adders = p.parts.filter((x) => x.kg > 0.5).sort((a, b) => b.kg - a.kg);
          const subtracters = p.parts.filter((x) => x.kg < -0.5);
          const saved = p.saved.filter((x) => Math.abs(x.kg) > 0.5).sort((a, b) => b.kg - a.kg);
          const savedTotal = p.baselineKg - p.actualKg;
          const panelId = `year-${p.year}`;
          return (
            <li key={p.year} className="border-b border-hairline">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onSelect(open ? null : p.year)}
                className="flex min-h-11 w-full items-center gap-3 py-2 text-left tabular-nums"
              >
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}>
                  <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="w-[92px] shrink-0 font-semibold">{p.year}{p.projected ? "*" : ""}</span>
                <span className="mr-auto font-bold">{tonnes(p.actualKg)}</span>
                {savedTotal > 50 && <span className="text-[15px] text-glacier">{tonnes(savedTotal)} saved</span>}
              </button>
              {open && (
                <div id={panelId} className="grid grid-cols-1 gap-4 pb-4 pl-6 text-[15px] leading-[22px] sm:grid-cols-2 sm:gap-8">
                  <div>
                    <p className="m-0 mb-1 font-semibold">What made up your footprint</p>
                    <ul className="m-0 list-none p-0">
                      {adders.map((x) => (
                        <li key={x.key} className="flex gap-3 border-b border-hairline py-1.5">
                          <span className="mr-auto">
                            {x.label}
                            {x.detail && <span className="block text-[13px] leading-[18px] text-scree">{x.detail}</span>}
                          </span>
                          <span className="whitespace-nowrap tabular-nums">+{tonnes(x.kg)}</span>
                        </li>
                      ))}
                      {subtracters.map((x) => (
                        <li key={x.key} className="flex gap-3 border-b border-hairline py-1.5">
                          <span className="mr-auto">
                            {x.label}
                            {x.detail && <span className="block text-[13px] leading-[18px] text-scree">{x.detail}</span>}
                          </span>
                          <span className="whitespace-nowrap font-semibold tabular-nums text-glacier">{signed(x.kg)}</span>
                        </li>
                      ))}
                      <li className="flex gap-3 py-1.5 font-bold">
                        <span className="mr-auto">Your footprint</span>
                        <span className="tabular-nums">{tonnes(p.actualKg)}</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="m-0 mb-1 font-semibold">Compared with changing nothing</p>
                    <ul className="m-0 list-none p-0">
                      <li className="flex gap-3 border-b border-hairline py-1.5">
                        <span className="mr-auto">Without your changes</span>
                        <span className="tabular-nums">{tonnes(p.baselineKg)}</span>
                      </li>
                      {saved.map((x) => (
                        <li key={x.id} className="flex gap-3 border-b border-hairline py-1.5">
                          <span className="mr-auto">{x.label}</span>
                          <span className={`whitespace-nowrap tabular-nums ${x.kg > 0 ? "font-semibold text-glacier" : ""}`}>
                            {x.kg > 0 ? signed(-x.kg) : `+${tonnes(-x.kg)}`}
                          </span>
                        </li>
                      ))}
                      {saved.length === 0 && (
                        <li className="border-b border-hairline py-1.5 text-scree">No changes active this year yet.</li>
                      )}
                      <li className="flex gap-3 py-1.5 font-bold">
                        <span className="mr-auto">With your changes</span>
                        <span className="tabular-nums">{tonnes(p.actualKg)}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {years.some((p) => p.projected) && (
        <p className="m-0 mt-2 text-[13px] leading-[18px] text-scree">* Projected for the full year from your current setup.</p>
      )}
    </section>
  );
}
