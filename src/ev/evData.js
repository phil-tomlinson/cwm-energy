// ── Vehicle definitions ───────────────────────────────────────────────────
// Sources: NRCan Fuel Consumption Ratings, GREET 2023 (Argonne National Lab)
export const VEHICLES = {
  ioniq5: {
    id:                   'ioniq5',
    name:                 'Hyundai Ioniq 5',
    sub:                  'NMC Battery · AWD Long Range',
    type:                 'ev',
    batteryKwh:           77.4,
    effKwh100km:          21.1,   // NRCan combined AWD Long Range: 21.3 (2022), 21.0 (2023), 21.5 (2024)
    fuelL100km:           null,
    co2PerFuelL:          null,
    mfgKgCO2e:            14500,  // GREET 2023: ~6500 kg battery + ~8000 kg glider
    batteryMfgKgCO2e:     6500,   // 77.4 kWh × ~84 kg CO₂e/kWh (NMC811)
    color:                '#34d399',  // emerald-400
    colorMuted:           'rgba(52,211,153,0.15)',
  },
  macheelfp: {
    id:                   'macheelfp',
    name:                 'Ford Mustang Mach-E',
    sub:                  'LFP Battery · Standard Range RWD',
    type:                 'ev',
    batteryKwh:           72,
    effKwh100km:          20.7,   // NRCan combined SR RWD (LFP, 2023)
    fuelL100km:           null,
    co2PerFuelL:          null,
    mfgKgCO2e:            11740,  // GREET 2023: ~3740 kg battery + ~8000 kg glider
    batteryMfgKgCO2e:     3740,   // 72 kWh × ~52 kg CO₂e/kWh (LFP — no Co/Ni)
    color:                '#f87171',  // red-400
    colorMuted:           'rgba(248,113,113,0.15)',
  },
  rav4: {
    id:                   'rav4',
    name:                 'Toyota RAV4',
    sub:                  '2.5L AWD Gas',
    type:                 'ice',
    batteryKwh:           null,
    effKwh100km:          null,
    fuelL100km:           8.5,    // NRCan combined AWD 2.5L (2023–2025 consistent)
    co2PerFuelL:          2.31,   // kg CO₂e/L gasoline (IPCC AR5)
    mfgKgCO2e:            8500,   // GREET 2023 mid-size ICE SUV
    batteryMfgKgCO2e:     0,
    color:                '#fb923c',  // orange-400
    colorMuted:           'rgba(251,146,60,0.15)',
  },
  rav4h: {
    id:                   'rav4h',
    name:                 'Toyota RAV4 Hybrid',
    sub:                  'NiMH Hybrid · AWD',
    type:                 'hybrid',
    batteryKwh:           null,
    effKwh100km:          null,
    fuelL100km:           6.0,    // NRCan combined Hybrid AWD (2022–2025 consistent)
    co2PerFuelL:          2.31,
    mfgKgCO2e:            9200,   // GREET 2023 + ~700 kg NiMH premium
    batteryMfgKgCO2e:     700,
    color:                '#60a5fa',  // blue-400
    colorMuted:           'rgba(96,165,250,0.15)',
  },
}

export const VEHICLE_ORDER = ['ioniq5', 'macheelfp', 'rav4', 'rav4h']

// ── Service schedule ─────────────────────────────────────────────────────
// Sources: CAA 2023 Driving Costs, Consumer Reports, manufacturer service manuals.
// Costs are Canadian market averages (labour + parts).
export const SERVICE_ITEMS = [
  {
    name: 'Oil change', note: 'ICE only',
    vehicles: {
      ioniq5:    null,
      macheelfp: null,
      rav4:      { intervalKm: 8000,   cost: 85  },
      rav4h:     { intervalKm: 8000,   cost: 85  },
    },
  },
  {
    name: 'Fuel injector service', note: 'Labour-intensive cleaning/replacement · ICE only',
    vehicles: {
      ioniq5:    null,
      macheelfp: null,
      rav4:      { intervalKm: 150000, cost: 650 },
      rav4h:     { intervalKm: 150000, cost: 650 },
    },
  },
  {
    name: 'Spark plugs', note: 'Iridium long-life type',
    vehicles: {
      ioniq5:    null,
      macheelfp: null,
      rav4:      { intervalKm: 120000, cost: 220 },
      rav4h:     { intervalKm: 120000, cost: 230 },
    },
  },
  {
    name: 'Engine air filter', note: 'ICE only',
    vehicles: {
      ioniq5:    null,
      macheelfp: null,
      rav4:      { intervalKm: 30000,  cost: 45  },
      rav4h:     { intervalKm: 30000,  cost: 45  },
    },
  },
  {
    name: 'Cabin air filter', note: 'All vehicles',
    vehicles: {
      ioniq5:    { intervalKm: 20000, cost: 35 },
      macheelfp: { intervalKm: 20000, cost: 35 },
      rav4:      { intervalKm: 20000, cost: 35 },
      rav4h:     { intervalKm: 20000, cost: 35 },
    },
  },
  {
    name: 'Brake fluid flush', note: 'Moisture contamination over time',
    vehicles: {
      ioniq5:    { intervalKm: 40000, cost: 65 },
      macheelfp: { intervalKm: 40000, cost: 65 },
      rav4:      { intervalKm: 40000, cost: 65 },
      rav4h:     { intervalKm: 60000, cost: 65 }, // less pedal use in hybrid
    },
  },
  {
    name: 'Coolant service', note: 'Engine / thermal management system',
    vehicles: {
      ioniq5:    { intervalKm: 100000, cost: 150 }, // EV heat pump + battery cooling
      macheelfp: { intervalKm: 100000, cost: 150 },
      rav4:      { intervalKm: 80000,  cost: 130 },
      rav4h:     { intervalKm: 100000, cost: 130 },
    },
  },
  {
    name: 'CVT / transmission fluid', note: 'RAV4 Hybrid eCVT is sealed (no service)',
    vehicles: {
      ioniq5:    null,
      macheelfp: null,
      rav4:      { intervalKm: 80000, cost: 180 },
      rav4h:     null,  // Toyota sealed eCVT
    },
  },
  {
    name: 'Rear differential fluid', note: 'AWD · EVs use motor-per-axle (no diff)',
    vehicles: {
      ioniq5:    null,
      macheelfp: null,
      rav4:      { intervalKm: 60000, cost: 120 },
      rav4h:     { intervalKm: 60000, cost: 120 },
    },
  },
  {
    name: 'Transfer case fluid', note: 'AWD · not applicable to EV architecture',
    vehicles: {
      ioniq5:    null,
      macheelfp: null,
      rav4:      { intervalKm: 60000, cost: 90 },
      rav4h:     { intervalKm: 60000, cost: 90 },
    },
  },
  {
    name: 'Tire rotation', note: 'All vehicles',
    vehicles: {
      ioniq5:    { intervalKm: 10000, cost: 30 },
      macheelfp: { intervalKm: 10000, cost: 30 },
      rav4:      { intervalKm: 10000, cost: 30 },
      rav4h:     { intervalKm: 10000, cost: 30 },
    },
  },
  {
    name: 'Wiper blades', note: 'Approx. every 40,000 km',
    vehicles: {
      ioniq5:    { intervalKm: 40000, cost: 45 },
      macheelfp: { intervalKm: 40000, cost: 45 },
      rav4:      { intervalKm: 40000, cost: 45 },
      rav4h:     { intervalKm: 40000, cost: 45 },
    },
  },
  {
    name: 'Brake pads & rotors', note: 'Regen braking dramatically reduces EV wear',
    vehicles: {
      ioniq5:    { intervalKm: 150000, cost: 600 }, // regen does ~70% of braking
      macheelfp: { intervalKm: 150000, cost: 600 },
      rav4:      { intervalKm: 80000,  cost: 700 },
      rav4h:     { intervalKm: 100000, cost: 700 }, // partial regen benefit
    },
  },
]

// ── Internal API routes (server-side proxies — no CORS, key stays server-side) ──
export const WEATHER_PROXY = '/api/weather'
export const CARBON_PROXY  = '/api/carbon'

// ── Helpers ──────────────────────────────────────────────────────────────
export function co2PerKm(vehicle, gridGCO2kWh) {
  if (vehicle.type === 'ev') {
    return (gridGCO2kWh * vehicle.effKwh100km) / 100000 // kg/km
  }
  return (vehicle.fuelL100km * vehicle.co2PerFuelL) / 100
}

export function maintTotal(vid, totalKm) {
  return SERVICE_ITEMS.reduce((sum, item) => {
    const v = item.vehicles[vid]
    return v ? sum + (totalKm / v.intervalKm) * v.cost : sum
  }, 0)
}

export function fmt(n, decimals = 0) {
  return n.toLocaleString('en-CA', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}
