# HomeIQ Calculator — Manual Sniff Test Protocol

Run this after any change to calculations, data, or wizard flow. Each case takes ~2 minutes.
Expected ranges are derived from first principles (NRCan HOT2000 methodology) and cross-checked
against published Canadian energy use benchmarks. A result outside any range is a red flag worth
investigating; not every flag is a bug, but every flag needs an explanation.

---

## Setup

Open the wizard at `/homeiq`. Use **Simple mode** unless the case specifies Technical mode.
Record the four headline figures from the Results page:

| Figure | Label on results page |
|--------|----------------------|
| **Heat loss** | Annual heating energy (GJ/yr) |
| **Heating cost** | Annual heating fuel cost ($/yr) |
| **Peak load** | Peak heat loss (kW) |
| **Water heater** | Annual water heating cost ($/yr) |

---

## Case A — Toronto, typical 1980s detached (baseline reference)

**Inputs**

| Field | Value |
|-------|-------|
| Province | Ontario |
| City | Toronto |
| House type | Detached |
| Floor area | 180 m² |
| Storeys | 2 |
| Basement | Full (heated) |
| Basement wall height | 2.1 m (default) |
| Construction era | 1980–1999 |
| Heating fuel | Natural gas |
| Heating system | Gas furnace – standard (80% AFUE) |
| Water heater | Storage tank – natural gas (standard) |
| Occupants | 3 |

**Expected results**

| Metric | Expected range | Rationale |
|--------|---------------|-----------|
| Annual heat loss (GJ) | 95 – 120 | HOT2000 reference detached, Toronto, ~1985 vintage = ~105 GJ |
| Annual heating cost | $1,400 – $1,900 | ~130 GJ fuel input × ON gas $12/GJ |
| Peak heat loss (kW) | 9 – 14 | ΔT = 34°C; UA back-calculated from annual load |
| Water heating cost | $380 – $480 | 50 L/person/day, 3 occupants, cold water ~9°C, UEF 0.60 |

**Direction checks** — make one change at a time, verify direction, then revert:

- Change era to **Before 1946** → heating cost should rise ≥ 60 %
- Change era to **2012+** → heating cost should fall ≥ 40 %
- Change city to **Winnipeg** → heating cost should rise ≥ 80 % (HDD 5670 vs 3520)
- Change city to **Vancouver** → heating cost should fall ≥ 40 % (HDD 2925)
- Change house type to **Apartment** → heating cost should fall ≥ 50 % (exposed factor 0.35 vs 1.0)
- Change fuel to **Heating oil** → cost increases substantially (oil is more expensive per GJ than gas in ON)

---

## Case B — Winnipeg, pre-1946 detached (worst-case cold climate)

**Inputs**

| Field | Value |
|-------|-------|
| Province | Manitoba |
| City | Winnipeg |
| House type | Detached |
| Floor area | 140 m² |
| Storeys | 1.5 |
| Basement | Full (heated) |
| Construction era | Before 1946 |
| Heating fuel | Natural gas |
| Heating system | Gas furnace – standard (80% AFUE) |
| Occupants | 2 |

**Expected results**

| Metric | Expected range | Rationale |
|--------|---------------|-----------|
| Annual heat loss (GJ) | 200 – 320 | Very leaky (ACH 1.0), single pane, uninsulated foundation; HDD 5670 |
| Annual heating cost | $2,000 – $3,200 | MB gas ~$8/GJ |
| Peak heat loss (kW) | 18 – 30 | ΔT = 51°C; very high UA |
| Water heating cost | $200 – $280 | 2 occupants |

**Sanity check:** The air leakage component alone (ACH 1.0 in a drafty old house) should account for 35–50 % of total heat loss. Inspect the breakdown chart on the results page; if air leakage bar is less than 30 % something is wrong with the infiltration calculation.

---

## Case C — Vancouver, 2012+ apartment, electric baseboard (mild climate, low loss)

**Inputs**

| Field | Value |
|-------|-------|
| Province | British Columbia |
| City | Vancouver |
| House type | Apartment / Condo |
| Floor area | 75 m² |
| Storeys | 1 |
| Basement | No ground floor (apartment above grade) |
| Construction era | 2012 or newer |
| Heating fuel | Electricity |
| Heating system | Electric baseboard |
| Occupants | 2 |

**Expected results**

| Metric | Expected range | Rationale |
|--------|---------------|-----------|
| Annual heat loss (GJ) | 8 – 18 | Small well-insulated apartment, exposed factor 0.35, HDD 2925 |
| Annual heating cost | $500 – $1,100 | BC electricity ≈ $35.6/GJ; baseboard efficiency 1.0 |
| Peak heat loss (kW) | 1.5 – 4 | ΔT = 25°C; low UA due to good envelope and shared walls |

**Checks:**
- Peak load should be very low — this case should NOT recommend a large heat pump
- If heating cost exceeds $1,500 for this case, something is wrong with the apartment exposed-wall factor or 2012+ defaults

---

## Case D — Calgary, 2000–2011 semi-detached, heat pump (moderate climate)

**Inputs**

| Field | Value |
|-------|-------|
| Province | Alberta |
| City | Calgary |
| House type | Semi-detached / Duplex |
| Floor area | 130 m² |
| Storeys | 2 |
| Basement | Full (heated) |
| Construction era | 2000–2011 |
| Heating fuel | Electricity |
| Heating system | Air-source heat pump (avg. COP 2.5) |
| Occupants | 3 |

**Expected results**

| Metric | Expected range | Rationale |
|--------|---------------|-----------|
| Annual heat loss (GJ) | 55 – 85 | Semi exposed factor 0.6; decent insulation; HDD 5000 |
| Annual heating cost | $1,400 – $2,200 | AB electricity ≈ $59.7/GJ; ÷ COP 2.5 = ~$24/GJ effective |
| Peak heat loss (kW) | 6 – 11 | ΔT = 41°C |

---

## Case E — HRV effect (Technical mode)

Start from **Case A** (Toronto 1980s detached, gas 80%). Switch to **Technical mode**.

**Baseline** (no HRV): note annual heating cost.

**Enable HRV:**
- Set HRV/ERV installed → **Yes**
- Effectiveness → **75%**

**Expected change:**
- Annual heating cost should decrease by **10–20 %**
- The decrease should come entirely from a reduction in the air leakage component in the chart
- Ceiling, wall, window, basement components should be **unchanged**
- Peak heat loss (kW) should be **unchanged** — HRV reduces annual energy but not the sizing peak (which uses rawHeatLossGJ)

> **Why peak must not change:** Peak demand occurs at the design-temperature condition (coldest night). The HRV reduces annual ventilation loss but does not offset the peak instantaneous load, which the calculator correctly derives from gross (pre-HRV) heat loss.

---

## Case F — Solar gain effect (Technical mode)

Start from **Case A** again, Technical mode, no HRV.

**Baseline** (south-facing windows = 25 %): note total heat loss GJ and annual cost.

**Test 1 — zero south glazing:**
- Set South-facing windows → **0 %**
- Heat loss should increase slightly (~1–4 GJ relative to baseline for a 1980s Toronto home)
- Peak load (kW) should **not change** vs 0 % solar (peak never benefits from solar)

**Test 2 — maximum south glazing:**
- Set South-facing windows → **60 %**
- Heat loss should decrease by 3–8 GJ vs baseline
- The solar gain callout below the chart should show a positive GJ/year offset
- Peak load (kW) should be **the same** as at 0 % south glazing (solar never reduces peak)

> **Key invariant:** `peakHeatLossKW` must be identical at 0 % and 60 % south glazing for the same house. If it differs, the peak formula is using the solar-reduced total instead of the gross heat loss.

---

## Case G — Basement wall height (Technical mode)

Start from **Case A**, Technical mode.

**Baseline** at 2.1 m basement height: note basement wall heat loss GJ (read from chart).

**Change to 2.7 m:**
- Basement wall heat loss GJ should increase ~15–20 % (taller wall = more below-grade area)
- Total annual heat loss should increase
- No other component (ceiling, walls, windows) should change

**Change to 1.8 m:**
- Basement wall heat loss GJ should decrease vs 2.1 m baseline

**Edge case — change height in Step 2 (Simple mode), then view results:**
- Results should reflect the non-default height, not the 2.1 m default
- This tests that the `useEffect` in Step 3 correctly passes `basementWallHeight` to `buildEnvelopeFromDefaults`

---

## Case H — ACH50 toggle (Technical mode)

Start from **Case A**, Technical mode.

1. Confirm default shows **Natural ACH mode**, value ≈ 0.5 ACH
2. Switch to **ACH50 mode**
   - Displayed value should be **0.5 × 17 = 8.5 ACH50**
   - Hint below should read "→ Natural ACH: 0.50"
3. Change ACH50 to **5.0**
   - Hint should update to "→ Natural ACH: 0.29"
   - Recalculate — annual cost should decrease (less leakage)
4. Switch back to **Natural ACH mode**
   - Displayed value should be **0.29 ACH** (not 0.50 — must reflect the change made in ACH50 mode)
5. **Stale state check:** Change era to **Before 1946** (resets envelope, new ACH = 1.0)
   - Switch to ACH50 mode
   - Displayed value should be **1.0 × 17 = 17.0 ACH50** (not the old 8.5)
   - If it still shows 8.5, the `useEffect` sync is broken

---

## Case I — Heat pump recommendation COP (Technical mode)

**Purpose:** Verify that the heat pump recommendation uses a climate-appropriate COP, not always the standard (lower) one.

Use **Ottawa** (designTemp −22°C) with a gas furnace baseline (Case A inputs but Ottawa).

In recommendations:
- A heat pump recommendation should appear
- The estimated savings and new annual cost should imply **COP ≈ 2.2** (standard ASHP at −22°C per the multi-bin model)
- Verify: `savings = currentCost − (totalHeatLossGJ / COP × electricityCostPerGJ)`
  - ON electricity ≈ $45.8/GJ; at COP 2.2 effective cost ≈ $20.8/GJ
  - If the implied effective cost is ≈ $14.0/GJ (COP 3.0), the wrong bin is being used

---

## Case J — Era progression sanity (monotonicity)

Using **Toronto detached 180 m², gas 80%, all other defaults**, step through each era and record annual heating cost. Costs must decrease monotonically:

| Era | Expected cost range |
|-----|-------------------|
| Before 1946 | $2,400 – $3,500 |
| 1946–1979 | $1,800 – $2,600 |
| 1980–1999 | $1,400 – $1,900 |
| 2000–2011 | $1,000 – $1,400 |
| 2012+ | $700 – $1,050 |

If any era is higher than the one before it, a default value is wrong.

---

## Case K — Water heater cross-checks

Use **Toronto, 4 occupants, storage gas standard (UEF 0.60)**, cold water temp 9°C (default for ON).

| Metric | Expected range | Rationale |
|--------|---------------|-----------|
| Annual water heating cost | $480 – $620 | 200 L/day; ΔT = 46°C; 73.2 GJ input; ×$12/GJ ÷ UEF 0.60 |
| Annual energy input (GJ) | 60 – 80 | 200 L/day × 1 kg/L × 4186 J/kg°C × 46°C × 365 / 1e9 / 0.60 ≈ 73 GJ |

**Switch to HPWH (heat pump water heater, UEF 3.5):**
- Annual cost should fall to **$100 – $160** (ON electricity at $45.8/GJ)
- Recommendation for HPWH should appear if current system is gas

---

## Red flags — automatic failures

Any of these outcomes means stop and investigate before shipping:

- Annual heat loss **below 5 GJ** for a heated detached house anywhere in Canada
- Annual heat loss **above 500 GJ** for any residential case (even old Winnipeg house)
- Peak heat loss **changes** when only south-facing window % changes (bug: solar affecting peak sizing)
- Peak heat load **decreases** when HRV is enabled (bug: HRV reducing peak instead of only annual)
- Heating cost **increases** when switching from a leaky era to a tighter era (monotonicity failure)
- ACH50 field still shows old value after changing construction era (stale state bug)
- Air leakage bar in breakdown chart **below 15 %** for a pre-1946 home (infiltration is underweighted)
- Air leakage bar **above 60 %** for a 2012+ home (infiltration is overweighted)
- Basement wall area = 0 for a heated full basement (bgFraction calculation failure)
- Heat pump recommendation savings **do not change** at all between Vancouver (−7°C) and Winnipeg (−33°C) — COP binning must produce different results

---

## Recording results

| Case | Run date | Annual cost ($) | Peak (kW) | Pass/Fail | Notes |
|------|----------|----------------|-----------|-----------|-------|
| A — Toronto 1980s | | | | | |
| B — Winnipeg pre-1946 | | | | | |
| C — Vancouver apt | | | | | |
| D — Calgary semi HP | | | | | |
| E — HRV effect | | | | | |
| F — Solar gain / peak invariant | | | | | |
| G — Basement wall height | | | | | |
| H — ACH50 toggle / stale state | | | | | |
| I — HP COP climate bins | | | | | |
| J — Era monotonicity | | | | | |
| K — Water heater | | | | | |
