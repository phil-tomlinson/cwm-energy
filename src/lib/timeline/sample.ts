import type { Timeline } from './types'

/**
 * An illustrative Calgary household, used for "Try an example" and in tests.
 * Not a real person's data.
 */
export const SAMPLE_TIMELINE: Timeline = {
  version: 1,
  updatedAt: '2026-10-01T00:00:00.000Z',
  residences: [
    {
      id: 'home-1',
      province: 'AB',
      city: 'Calgary',
      houseType: 'detached',
      era: '1980_1999',
      floorAreaM2: 150,
      storeys: 2,
      basementType: 'full_heated',
      occupants: 2,
      heatingSystemId: 'furnace_90',
      waterHeaterType: 'storage_gas',
      start: '2015-06',
    },
  ],
  changes: [
    { id: 'solar-1', kind: 'solar', residenceId: 'home-1', date: '2020-06', kW: 6, orientation: 'south' },
    { id: 'attic-1', kind: 'attic', residenceId: 'home-1', date: '2021-09' },
    { id: 'heat-1', kind: 'heating', residenceId: 'home-1', date: '2022-10', heatingSystemId: 'ccashp' },
  ],
  vehicles: [
    { id: 'car-1', label: 'Gas SUV', fuel: 'gasoline', efficiency: 8.4, annualKm: 15000, people: 1, start: '2015-06', end: '2024-03' },
    { id: 'car-2', label: 'Electric crossover', fuel: 'ev', efficiency: 19.5, annualKm: 15000, people: 1, start: '2024-03', replaces: 'car-1' },
  ],
}
