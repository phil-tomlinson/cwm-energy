// Default building envelope values by Canadian construction era.
// R-values are nominal imperial (ft²·°F·h/BTU) as labeled on insulation products.
// Window U-values are in W/(m²·K).
// ACH = natural air changes per hour (at typical pressures, not blower-door).
// windowFraction = window area as a fraction of gross above-grade wall area.

export const constructionEras = [
  { value: 'pre1946',    label: 'Before 1946' },
  { value: '1946_1979', label: '1946 – 1979' },
  { value: '1980_1999', label: '1980 – 1999' },
  { value: '2000_2011', label: '2000 – 2011' },
  { value: '2012plus',  label: '2012 or newer' },
]

export const eraDefaults = {
  pre1946: {
    label: 'Before 1946',
    wallR: 7,           // Minimal insulation; plaster on wood studs
    ceilingR: 12,       // Little or no attic insulation
    windowU: 4.5,       // Single pane, wood frame
    doorU: 3.5,         // Solid wood
    basementWallR: 0,   // Uninsulated stone or brick foundation
    basementFloorR: 0,  // Uninsulated slab or bare earth
    ach: 1.0,           // Very leaky construction
    windowFraction: 0.12,
  },
  '1946_1979': {
    label: '1946 – 1979',
    wallR: 12,
    ceilingR: 20,
    windowU: 3.5,       // Early double pane or storm windows
    doorU: 2.5,
    basementWallR: 4,
    basementFloorR: 0,
    ach: 0.8,
    windowFraction: 0.14,
  },
  '1980_1999': {
    label: '1980 – 1999',
    wallR: 20,
    ceilingR: 32,
    windowU: 2.8,       // Standard double pane
    doorU: 2.0,
    basementWallR: 10,
    basementFloorR: 0,
    ach: 0.5,
    windowFraction: 0.15,
  },
  '2000_2011': {
    label: '2000 – 2011',
    wallR: 20,
    ceilingR: 40,
    windowU: 2.0,       // Low-e double pane
    doorU: 1.8,
    basementWallR: 15,
    basementFloorR: 5,
    ach: 0.35,
    windowFraction: 0.16,
  },
  '2012plus': {
    label: '2012 or newer',
    wallR: 22,
    ceilingR: 50,
    windowU: 1.6,       // Low-e triple pane or high-performance double
    doorU: 1.6,
    basementWallR: 20,
    basementFloorR: 10,
    ach: 0.20,
    windowFraction: 0.17,
  },
}

export const houseTypes = [
  { value: 'detached',   label: 'Detached house' },
  { value: 'semi',       label: 'Semi-detached / Duplex' },
  { value: 'townhouse',  label: 'Townhouse / Row house' },
  { value: 'apartment',  label: 'Apartment / Condo' },
]

export const storeyOptions = [
  { value: 1,   label: '1 storey (bungalow)' },
  { value: 1.5, label: '1½ storeys (bungalow with loft)' },
  { value: 2,   label: '2 storeys' },
  { value: 2.5, label: '2½ storeys' },
  { value: 3,   label: '3 storeys' },
]

export const basementTypes = [
  { value: 'full_heated',   label: 'Full basement (heated / conditioned)' },
  { value: 'full_unheated', label: 'Full basement (unheated)' },
  { value: 'partial',       label: 'Partial basement' },
  { value: 'crawlspace',    label: 'Crawl space' },
  { value: 'slab',          label: 'Slab on grade (no basement)' },
  { value: 'none',          label: 'No ground floor (apartment above grade)' },
]

// Fraction of gross wall area that is exposed (not shared party walls).
// Affects calculated above-grade wall area and basement perimeter.
export const exposedWallFactor = {
  detached:  1.0,
  semi:      0.6,   // ~2 of 4 sides exposed
  townhouse: 0.4,   // average of end and interior units
  apartment: 0.3,   // corner unit approximation
}
