# HomeIQ Calculation Methodology

**CWM Energy — Home Heat Loss Analysis**
Calculation engine version: current `main` branch
Last updated: 2025

---

## Overview

HomeIQ estimates a home's annual heating energy use and cost by modelling steady-state heat flow through every envelope component, adding infiltration losses, and dividing by system efficiency. It then models domestic hot water demand separately and ranks upgrade opportunities by simple payback.

The approach follows the NRCan / HOT2000 simplified steady-state methodology, which is the basis of Canada's residential energy performance evaluation programs. It is suitable for budgetary estimates and upgrade prioritisation, not for mechanical design or permit submissions.

---

## Table of Contents

1. [Unit Conventions](#1-unit-conventions)
2. [Building Geometry Estimation](#2-building-geometry-estimation)
3. [Construction Era Defaults](#3-construction-era-defaults)
4. [Thermal Transmittance (U-values)](#4-thermal-transmittance-u-values)
5. [Conductive Heat Loss — Envelope Components](#5-conductive-heat-loss--envelope-components)
6. [Air Infiltration Heat Loss](#6-air-infiltration-heat-loss)
7. [Total Annual Heat Loss](#7-total-annual-heat-loss)
8. [Heating System Efficiency and Fuel Input](#8-heating-system-efficiency-and-fuel-input)
9. [Peak Heat Loss and Equipment Sizing](#9-peak-heat-loss-and-equipment-sizing)
10. [Domestic Hot Water Energy](#10-domestic-hot-water-energy)
11. [Fuel Prices and Unit Conversions](#11-fuel-prices-and-unit-conversions)
12. [CO₂ Emission Factors](#12-co-emission-factors)
13. [Upgrade Recommendations](#13-upgrade-recommendations)
14. [Assumptions and Limitations](#14-assumptions-and-limitations)
15. [References](#15-references)

---

## 1. Unit Conventions

| Quantity | Unit used internally | Notes |
|---|---|---|
| R-value (insulation label) | Imperial R (ft²·°F·h/BTU) | As printed on insulation batts |
| R-value (calculation) | RSI (m²·K/W) | Converted from imperial before use |
| U-value (windows, doors) | W/(m²·K) | Lower = better |
| Area | m² | Display converts to ft² when imperial units selected |
| Energy | GJ (gigajoules) | 1 GJ = 10⁹ J |
| Temperature | °C | |
| Climate | HDD base 18°C (K·days) | Heating Degree Days |
| Airflow | ACH (air changes per hour) | At natural pressure, not blower-door 50 Pa |
| Cost | CAD | 2024 approximate retail prices |

**R to RSI conversion:**

```
RSI = R_imperial / 5.678
```

*Derivation: 1 ft²·°F·h/BTU = 0.1761 m²·K/W; inverting and rounding gives the 5.678 factor.*

---

## 2. Building Geometry Estimation

When the user has not provided measured areas (Simple or Refined mode), the tool estimates building geometry from three inputs: conditioned floor area, number of storeys, and house type.

### 2.1 Footprint and Perimeter

The calculator assumes a square floor plan. This is a simplification; real homes vary, but the square assumption produces reasonable results for detached homes and is a standard HOT2000 shortcut.

```
footprint  = floorArea / storeys           (m²)
sideLength = √footprint                    (m)
perimeter  = 4 × sideLength               (m)
```

### 2.2 Exposed Wall Factor

Attached dwellings share insulated party walls that do not lose heat to the exterior. A factor is applied to reduce effective exposed area:

| House type | Exposed factor |
|---|---|
| Detached | 1.00 |
| Semi-detached / Duplex | 0.60 |
| Townhouse / Row house | 0.45 |
| Apartment / Condo | 0.35 |

### 2.3 Above-Grade Wall Area

```
grossWallArea = perimeter × wallHeight × storeys × exposedFactor
```

Default wall height is 2.44 m (8 ft). The user can override ceiling height in Refined and Technical modes.

### 2.4 Window and Door Areas

Windows and doors are subtracted from the gross wall area:

```
doorArea    = doorCount × 1.98 m²          (standard 0.91 m × 2.18 m door)
windowArea  = grossWallArea × windowFraction
netWallArea = grossWallArea − windowArea − doorArea
```

`windowFraction` (the ratio of glazing to gross wall area) is set by construction era and ranges from 12% (pre-1946) to 17% (2012+), reflecting the trend toward more glazing in newer homes.

### 2.5 Basement Areas

For homes with a full or partial basement:

```
basementWallArea  = perimeter × 2.1 m × 0.55 × exposedFactor
```

The 2.1 m is a typical basement wall height. The 0.55 factor reflects that approximately 55% of the basement wall height is below grade (soil contact, not air contact). Below-grade walls lose heat to soil, not to outdoor air, and the heat transfer mechanism is fundamentally different — handled by adding soil thermal resistance in Section 4.

```
basementFloorArea = footprint
```

For crawl spaces, the effective wall height is reduced to 0.9 m with no below-grade fraction adjustment.

---

## 3. Construction Era Defaults

When the user selects a construction era rather than entering measured values, the following defaults are applied. These are calibrated to Canadian building practice and NRCan housing stock data.

| Era | Wall R | Ceiling R | Window U (W/m²K) | Door U | Basement Wall R | Basement Floor R | ACH |
|---|---|---|---|---|---|---|---|
| Before 1946 | R-7 | R-12 | 4.5 | 3.5 | R-0 | R-0 | 1.00 |
| 1946–1979 | R-12 | R-20 | 3.5 | 2.5 | R-4 | R-0 | 0.80 |
| 1980–1999 | R-20 | R-32 | 2.8 | 2.0 | R-10 | R-0 | 0.50 |
| 2000–2011 | R-20 | R-40 | 2.0 | 1.8 | R-15 | R-5 | 0.35 |
| 2012+ | R-22 | R-50 | 1.6 | 1.6 | R-20 | R-10 | 0.20 |

These are *nominal* mid-range values for each era. Individual homes vary; the Refined and Technical modes allow the user to override every value.

---

## 4. Thermal Transmittance (U-values)

### 4.1 Opaque Assemblies (Walls, Ceiling, Basement Walls)

```
RSI = R_imperial / 5.678
U   = 1 / RSI               (W/m²·K)
```

### 4.2 Windows and Doors

These are entered directly as U-values (W/m²·K) in Technical mode, or set by era defaults. Windows use the NFRC whole-window U-value (frame + glazing combined).

### 4.3 Basement Floor — Soil Resistance

Heat loss through a slab-on-grade or basement floor is impeded not only by any insulation but also by the surrounding soil. The tool adds 2.0 RSI of effective soil resistance, following the NRCan HOT2000 convention:

```
RSI_total_basement_floor = RSI_insulation + 2.0
U_basement_floor         = 1 / RSI_total_basement_floor
```

This is a simplified 1-D steady-state approximation. Actual ground heat transfer is multi-dimensional and partially driven by the ground surface temperature rather than outdoor air temperature, so real basement floor losses are lower than above-grade components at the same temperature difference. The 2.0 RSI adder partially accounts for this.

### 4.4 Uninsulated Basement Walls

If `basementWallR = 0`, a minimum RSI of 0.3 is applied (≈ R-1.7) to represent the thermal mass of the concrete or masonry wall itself. This prevents a divide-by-zero and reflects that even bare concrete provides a small but non-zero resistance.

---

## 5. Conductive Heat Loss — Envelope Components

### 5.1 Core Equation

The fundamental steady-state heat transfer equation is:

```
Q = A × U × ΔT         (watts, instantaneous)
```

Where `ΔT` is the temperature difference between inside and outside. Integrated over a heating season using Heating Degree Days:

```
E = A × U × HDD × 86,400   (joules per year)
```

| Variable | Meaning |
|---|---|
| A | Component area (m²) |
| U | Thermal transmittance (W/m²·K) |
| HDD | Heating Degree Days, base 18°C (K·days) |
| 86,400 | Seconds per day (converts K·days to K·seconds) |

Converting to GJ:

```
E_component (GJ/year) = A × U × HDD × 86,400 × 10⁻⁹
```

### 5.2 Applied to Each Component

```
E_ceiling        = ceilingArea      × U_ceiling       × HDD × 86400 × 1e-9
E_walls          = netWallArea      × U_walls         × HDD × 86400 × 1e-9
E_windows        = windowArea       × U_windows       × HDD × 86400 × 1e-9
E_doors          = doorArea         × U_doors         × HDD × 86400 × 1e-9
E_basementWalls  = basementWallArea × U_basementWalls × HDD × 86400 × 1e-9
E_basementFloor  = basementFloorArea × U_basementFloor × HDD × 86400 × 1e-9
```

---

## 6. Air Infiltration Heat Loss

Air leakage is measured as ACH — the number of times per hour the entire conditioned air volume is replaced by outdoor air. The energy to heat that incoming cold air is:

```
E_infiltration = ACH × Volume × C_air × HDD × 86,400 × 10⁻⁹   (GJ/year)
```

| Variable | Value | Derivation |
|---|---|---|
| ACH | Natural air changes per hour | User input or era default |
| Volume | Conditioned volume (m³) | See below |
| C_air | 0.335 W·day/(m³·K) | ρ × c_p / 3600 = 1.2 kg/m³ × 1005 J/(kg·K) / 3600 s/h |
| HDD | Heating Degree Days (K·days) | From climate data |
| 86,400 | s/day | Unit conversion |

**Conditioned Volume:**

```
V_above_grade = floorArea × ceilingHeight
V_basement    = (floorArea / storeys) × 2.1   (only if basementType = 'full_heated')
V_total       = V_above_grade + V_basement
```

---

## 7. Total Annual Heat Loss

```
Q_total (GJ/year) = E_ceiling + E_walls + E_windows + E_doors
                  + E_basementWalls + E_basementFloor + E_infiltration
```

This is the heat energy that must be replaced by the heating system each year to maintain a comfortable indoor temperature. It represents the theoretical minimum fuel demand assuming a 100%-efficient heating system.

---

## 8. Heating System Efficiency and Fuel Input

The heating system is characterised by a single efficiency factor:

- **Gas / oil / propane furnaces:** AFUE (Annual Fuel Utilisation Efficiency) — fraction of fuel energy converted to useful heat
- **Heat pumps:** COP (Coefficient of Performance) — ratio of heat delivered to electrical energy consumed; COP > 1 is possible because a heat pump moves heat rather than generating it

```
fuelInput (GJ/year) = Q_total / efficiency
annualCost (CAD)    = fuelInput × fuelCostPerGJ
```

### Example

For a home with 80 GJ/year heat loss and a 96% AFUE gas furnace at $12/GJ:

```
fuelInput  = 80 / 0.96 = 83.3 GJ/year
annualCost = 83.3 × 12 = $1,000/year
```

---

## 9. Peak Heat Loss and Equipment Sizing

The annual average temperature difference that produced the HDD-based annual energy figure is:

```
ΔT_avg = HDD / 365   (°C average difference across the heating season)
```

The peak (design day) temperature difference uses the local design temperature — typically the 2.5th percentile outdoor temperature:

```
ΔT_design = 18°C − designTemp
```

Scaling the average annual heat flow to the peak:

```
Q_peak (W) = Q_total_W × (ΔT_design / ΔT_avg)

where Q_total_W = Q_total_GJ × 10⁹ / (HDD × 86,400)  (converting back to watts)

Simplifying:
Q_peak (W) = (Q_total_GJ / (HDD × 86,400 × 10⁻⁹)) × ΔT_design
```

This is displayed in kW and can be used as a rough guide for minimum heating equipment capacity. A properly sized furnace or heat pump will have capacity ≥ Q_peak. Note that equipment sizing should also account for duct losses and hot water heating loads; consult a mechanical engineer for precise sizing.

---

## 10. Domestic Hot Water Energy

### 10.1 Demand Model

The tool uses the NRCan residential average of 50 litres per person per day as the base hot water draw:

```
dailyVolume = occupants × 50 L/day
```

### 10.2 Useful Heat

The energy needed to raise `dailyVolume` litres from the cold water supply temperature to the delivery setpoint (55°C):

```
usefulEnergy (GJ/year) = dailyVolume × ρ_water × c_p_water × ΔT × 365 × 10⁻⁹

where:
  ρ_water   = 1.0 kg/L
  c_p_water = 4,186 J/(kg·°C)
  ΔT        = 55°C − coldWaterTemp
  coldWaterTemp varies by province (4–10°C from climate data)
```

### 10.3 Fuel Input via UEF

The Uniform Energy Factor (UEF) captures all water heater inefficiencies: standby losses, cycling losses, and jacket losses. It is the metric used on EnerGuide labels in Canada.

```
inputEnergy (GJ/year) = usefulEnergy / UEF
annualCost (CAD)      = inputEnergy × fuelCostPerGJ
```

### 10.4 Default UEF Values

| Water Heater Type | Default UEF |
|---|---|
| Storage tank – natural gas (standard) | 0.60 |
| Storage tank – natural gas (power vent) | 0.67 |
| Storage tank – electric | 0.90 |
| Tankless – natural gas | 0.87 |
| Tankless – electric | 0.98 |
| Heat pump water heater | 3.50 |

---

## 11. Fuel Prices and Unit Conversions

All energy costs are calculated on a common basis of CAD/GJ. Raw provincial prices are converted using the following energy content values:

| Fuel | Retail unit | Energy content | Multiplier to $/GJ |
|---|---|---|---|
| Natural gas | $/GJ | — | 1.00 |
| Electricity | $/kWh | 1 kWh = 0.0036 GJ | ÷ 0.0036 = × 277.78 |
| Heating oil | $/L | 38.2 MJ/L | × 1000/38.2 = × 26.18 |
| Propane | $/L | 25.3 MJ/L | × 1000/25.3 = × 39.53 |

Provincial prices used (approximate 2024 retail):

| Province | Natural gas ($/GJ) | Electricity ($/kWh) | Heating oil ($/L) | Propane ($/L) |
|---|---|---|---|---|
| BC | 11.00 | 0.128 | 1.35 | 0.95 |
| AB | 5.00 | 0.165 | 1.30 | 0.75 |
| SK | 9.00 | 0.158 | 1.40 | 0.85 |
| MB | 8.00 | 0.097 | 1.38 | 0.82 |
| ON | 12.00 | 0.165 | 1.42 | 0.90 |
| QC | 10.50 | 0.073 | 1.40 | 0.88 |
| NB | — | 0.155 | 1.45 | 0.92 |
| NS | — | 0.175 | 1.48 | 0.94 |
| PE | — | 0.173 | 1.46 | 0.93 |
| NL | — | 0.134 | 1.44 | 0.91 |
| YT | — | 0.158 | 1.60 | 1.10 |
| NT | — | 0.280 | 1.70 | 1.20 |
| NU | — | 0.380 | 1.90 | 1.40 |

Users are encouraged to verify against their own utility bill; rates vary by usage tier and local utility.

---

## 12. CO₂ Emission Factors

Greenhouse gas intensity of fuel combustion, in tonnes CO₂ equivalent per GJ of fuel *input* (not per GJ of useful heat). Source: NRCan national averages.

| Fuel | tCO₂e/GJ input |
|---|---|
| Natural gas | 0.0503 |
| Electricity | 0.014 (national average) |
| Heating oil | 0.0726 |
| Propane | 0.0614 |

**Important caveat on electricity:** The national average electricity factor of 0.014 tCO₂e/GJ masks enormous provincial variation. Québec, Manitoba, and British Columbia have grids that are >95% hydro and near zero in practice; Alberta and Saskatchewan are coal/gas-dominated and roughly 10× higher. The tool uses the national average as a neutral default; users in low-carbon-grid provinces will find heat pump CO₂ savings are significantly understated.

---

## 13. Upgrade Recommendations

Each upgrade recommendation compares the existing heat loss (or water heating cost) to a target scenario, calculates annual savings, and divides by installed cost.

### 13.1 Simple Payback

```
payback (years) = estimatedCost (CAD) / annualSavings (CAD/year)
```

Recommendations are sorted by shortest payback first (highest return on investment).

### 13.2 Envelope Upgrades

For each envelope upgrade, the new annual heat loss through that component is calculated at the target R-value or U-value using the same area and HDD as the baseline:

```
E_new_component = Area × U_target × HDD × 86,400 × 10⁻⁹

annualSavings = (E_old − E_new) / efficiency × fuelCostPerGJ
```

The division by `efficiency` converts heat loss savings into fuel savings — a 1 GJ reduction in heat loss only saves 1/AFUE GJ of fuel.

**Upgrade targets:**

| Component | Trigger condition | Target |
|---|---|---|
| Attic insulation | ceilingR < 50 | R-60 |
| Air sealing | ACH > 0.3 | 50% reduction (min 0.15 ACH) |
| Windows | windowU > 1.8 W/m²K | U = 1.6 W/m²K |
| Basement walls | basementWallR < 18 | R-20 |

A minimum annual savings threshold (typically $30–40) filters out upgrades with negligible impact.

### 13.3 Heating System Upgrades

**High-efficiency furnace (gas only, current efficiency < 90%):**

```
savedFuel = Q_total × (1/η_current − 1/η_new)     where η_new = 0.96
annualSavings = savedFuel × fuelCostPerGJ
```

**Cold-climate air-source heat pump (non-electric fuel, design temp ≥ −30°C):**

```
COP = 2.8   if designTemp ≥ −20°C
COP = 2.2   if designTemp < −20°C

newCost     = Q_total / COP × electricityCostPerGJ
annualSavings = currentCost − newCost
```

These seasonal COP values are conservative estimates for modern cold-climate heat pumps (e.g., Mitsubishi Zuba-Central, Bosch IDS) integrated over the full heating season including the coldest days.

### 13.4 Water Heating Upgrades

**Tankless gas (current UEF < 0.70, gas-fired):**

```
newCost = usefulEnergyGJ / 0.87 × fuelCostPerGJ
annualSavings = currentCost − newCost
```

**Heat pump water heater (current UEF < 3.0):**

```
newCost = usefulEnergyGJ / 3.5 × electricityCostPerGJ
annualSavings = currentCost − newCost
```

### 13.5 Installed Cost Estimates

Mid-range Canadian installed costs used for payback calculations (2024 CAD):

| Upgrade | Estimated cost |
|---|---|
| Attic insulation (blown-in, typical home) | $3,000 |
| Wall insulation (exterior or interior retrofit) | $12,000 |
| Window upgrade (per window) | $700 |
| Professional air sealing | $1,500 |
| Basement wall insulation | $4,000 |
| High-efficiency gas furnace | $6,000 |
| Cold-climate heat pump | $14,000 |
| Tankless gas water heater | $1,500 |
| Heat pump water heater | $1,800 |

These are mid-range estimates from contractor quotes and NRCan program data. Actual costs vary by region, home size, and site conditions. Window costs scale by estimated window count (windowArea ÷ 1.4 m² per window, minimum 8 windows).

---

## 14. Assumptions and Limitations

1. **Steady-state model.** The tool assumes a constant average temperature difference proportional to HDD. Real buildings experience thermal mass effects, solar gains through windows, and internal heat gains from occupants and appliances. These are all ignored. Solar gains and internal gains can reduce actual heating demand by 20–30% versus this model's output — the tool conservatively omits them.

2. **Square floor plan.** Geometry is estimated from a square footprint. L-shaped, T-shaped, or highly irregular plans will have more wall area per unit of floor area and will underestimate heat loss.

3. **Uniform temperatures.** The model assumes the entire conditioned volume is maintained at 18°C and the outdoor temperature is represented solely by HDD and the design temperature. Zoned heating, setback thermostats, and unheated rooms are not modelled.

4. **No solar gains.** South-facing windows can contribute meaningful passive solar heat in winter, partially offsetting their conduction losses. This tool calculates only the conduction loss side.

5. **No internal gains.** Appliances, lighting, occupants, and hot water distribution contribute 5–15 GJ/year in a typical home. Omitting these means the model overestimates fuel demand for homes with modern, efficient appliances.

6. **ACH is at natural pressure, not blower-door 50 Pa.** Blower-door results are reported at 50 Pa pressure. Natural ACH ≈ ACH50 / 20 is the conventional conversion for Canadian climates. The era-default ACH values in this tool are already expressed as natural ACH.

7. **Basement floor uses 1-D soil model.** Ground heat transfer is 3-D and temperature-dependent. The 2.0 RSI soil adder is a simplification; basements in deep-frost regions may lose more heat through the floor perimeter than this model captures.

8. **Energy prices are approximate 2024 retail rates.** Natural gas prices in Alberta in particular are volatile and have ranged from $3–$20/GJ in recent years. Users should check their current bill and override the defaults where significant.

9. **CO₂ factors are national averages.** See Section 12 for the important caveat on electricity.

10. **Simple payback ignores time value of money, maintenance costs, and incentives.** A more rigorous economic analysis would use NPV or IRR and would include Canada Greener Homes grants and provincial utility rebates, which can substantially reduce installed costs and payback periods.

---

## 15. References

- **NRCan HOT2000 Technical Reference:** Natural Resources Canada. *HOT2000 software and technical manual.* Used as the basis for the simplified steady-state approach and ground-contact resistance conventions.
- **ASHRAE Handbook — Fundamentals (2021):** Chapter 18, Non-residential Cooling and Heating Load Calculations. Provides the Q = A × U × ΔT foundation and psychrometric constants for air infiltration.
- **NRCan Energy Use Data Handbook:** Provincial and national energy prices, fuel energy content, and emission factors.
- **NBCC Climate Data:** Design temperatures and Heating Degree Days from the National Building Code of Canada climate appendix.
- **EnerGuide for Houses:** NRCan methodology for the Uniform Energy Factor (UEF) and hot water demand model (50 L/person/day).
- **Canada Greener Homes Grant:** Cost benchmarks for insulation, window, and HVAC upgrades.

---

*This tool is intended for educational and planning purposes. For mechanical permit applications, energy labelling, or utility incentive programs, engage a certified energy advisor or mechanical engineer.*
