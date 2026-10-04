# CWM Energy

A free, open-source carbon tracker for Canadians. People build a timeline of where they've lived, what they've
driven and what they've changed (solar, a heat pump, insulation, an EV), and see the tonnes and dollars each
change has saved since, counted against their province's grid in every year.

Live site: [cwmenergy.ca](https://cwmenergy.ca)

## How it's organised

- `src/app/(cwm)/`: every page (landing, My Footprint, the timeline wizard at `/start`, the calculators, Plan,
  Rebates and the rest). The EV Benefit Calculator stays at `/ev-benefit-calculator`.
- `src/app/globals.css`: the design tokens (Daylight, Alpine night and high-contrast). Use the token classes
  (`bg-snowfield`, `text-basalt`, `text-scree`, `bg-glacier`…) rather than raw colours; canvas charts read the
  same tokens through `src/lib/theme.ts`.
- `src/lib/factors.ts`: every emission factor and assumption, with its source.
- `src/lib/timeline/`: the timeline data model, local-first storage and the engine that computes each
  year's footprint and each change's impact.
- `src/calculations/`: the heat-loss, water-heater and solar models the engine builds on.
- `METHODOLOGY.md`: how the home calculations work.

Timelines are stored in the visitor's browser only.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine tests
npm run build
```
