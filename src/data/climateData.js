/**
 * Canadian city climate data for residential energy calculations.
 * HDD (Heating Degree Days, base 18°C): NRCan RETScreen database / Environment and Climate Change Canada
 *   climate normals 1981–2010 (updated where 1991–2020 data available).
 * Design temperature (2.5% January): NBCC 2020, Appendix C, Table C-2
 *   (outdoor design temperature at 2.5% annual probability of exceedance).
 * Cold water inlet temperature: NRCan HOT2000 default ground water temperatures by region,
 *   derived from Environment Canada mean annual ground temperature data.
 */

export const provinces = [
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'ON', name: 'Ontario' },
  { code: 'QC', name: 'Quebec' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NL', name: 'Newfoundland & Labrador' },
  { code: 'YT', name: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
]

export const cities = [
  // British Columbia
  { city: 'Vancouver',      province: 'BC', hdd: 2925, designTemp: -7,  coldWaterTemp: 10 },
  { city: 'Victoria',       province: 'BC', hdd: 2650, designTemp: -5,  coldWaterTemp: 10 },
  { city: 'Kelowna',        province: 'BC', hdd: 3380, designTemp: -16, coldWaterTemp: 8  },
  { city: 'Kamloops',       province: 'BC', hdd: 3250, designTemp: -18, coldWaterTemp: 9  },
  { city: 'Abbotsford',     province: 'BC', hdd: 2900, designTemp: -8,  coldWaterTemp: 10 },
  { city: 'Prince George',  province: 'BC', hdd: 5060, designTemp: -31, coldWaterTemp: 6  },
  { city: 'Nanaimo',        province: 'BC', hdd: 2800, designTemp: -6,  coldWaterTemp: 10 },

  // Alberta
  { city: 'Calgary',        province: 'AB', hdd: 5000, designTemp: -23, coldWaterTemp: 7 },
  { city: 'Edmonton',       province: 'AB', hdd: 5120, designTemp: -27, coldWaterTemp: 6 },
  { city: 'Red Deer',       province: 'AB', hdd: 5200, designTemp: -27, coldWaterTemp: 6 },
  { city: 'Lethbridge',     province: 'AB', hdd: 4300, designTemp: -23, coldWaterTemp: 8 },
  { city: 'Medicine Hat',   province: 'AB', hdd: 4400, designTemp: -25, coldWaterTemp: 8 },
  { city: 'Grande Prairie', province: 'AB', hdd: 5750, designTemp: -33, coldWaterTemp: 5 },

  // Saskatchewan
  { city: 'Saskatoon',      province: 'SK', hdd: 5600, designTemp: -33, coldWaterTemp: 5 },
  { city: 'Regina',         province: 'SK', hdd: 5600, designTemp: -33, coldWaterTemp: 5 },
  { city: 'Prince Albert',  province: 'SK', hdd: 5900, designTemp: -37, coldWaterTemp: 4 },
  { city: 'Moose Jaw',      province: 'SK', hdd: 5500, designTemp: -32, coldWaterTemp: 5 },

  // Manitoba
  { city: 'Winnipeg',       province: 'MB', hdd: 5670, designTemp: -33, coldWaterTemp: 5 },
  { city: 'Brandon',        province: 'MB', hdd: 5700, designTemp: -33, coldWaterTemp: 5 },
  { city: 'Thompson',       province: 'MB', hdd: 7400, designTemp: -40, coldWaterTemp: 3 },

  // Ontario
  { city: 'Toronto',        province: 'ON', hdd: 3520, designTemp: -16, coldWaterTemp: 9 },
  { city: 'Ottawa',         province: 'ON', hdd: 4440, designTemp: -22, coldWaterTemp: 7 },
  { city: 'Hamilton',       province: 'ON', hdd: 3400, designTemp: -15, coldWaterTemp: 9 },
  { city: 'London',         province: 'ON', hdd: 3800, designTemp: -18, coldWaterTemp: 8 },
  { city: 'Windsor',        province: 'ON', hdd: 3200, designTemp: -14, coldWaterTemp: 10 },
  { city: 'Kingston',       province: 'ON', hdd: 4000, designTemp: -19, coldWaterTemp: 8 },
  { city: 'Barrie',         province: 'ON', hdd: 4050, designTemp: -20, coldWaterTemp: 8 },
  { city: 'Sudbury',        province: 'ON', hdd: 4900, designTemp: -27, coldWaterTemp: 6 },
  { city: 'Thunder Bay',    province: 'ON', hdd: 5730, designTemp: -31, coldWaterTemp: 5 },
  { city: 'Sault Ste. Marie', province: 'ON', hdd: 4900, designTemp: -25, coldWaterTemp: 6 },

  // Quebec
  { city: 'Montreal',       province: 'QC', hdd: 4200, designTemp: -21, coldWaterTemp: 7 },
  { city: 'Quebec City',    province: 'QC', hdd: 4900, designTemp: -24, coldWaterTemp: 6 },
  { city: 'Laval',          province: 'QC', hdd: 4200, designTemp: -21, coldWaterTemp: 7 },
  { city: 'Gatineau',       province: 'QC', hdd: 4440, designTemp: -22, coldWaterTemp: 7 },
  { city: 'Sherbrooke',     province: 'QC', hdd: 4500, designTemp: -22, coldWaterTemp: 7 },
  { city: 'Saguenay',       province: 'QC', hdd: 5400, designTemp: -28, coldWaterTemp: 5 },
  { city: 'Trois-Rivières', province: 'QC', hdd: 4550, designTemp: -24, coldWaterTemp: 6 },
  { city: 'Sept-Îles',      province: 'QC', hdd: 6000, designTemp: -28, coldWaterTemp: 4 },

  // New Brunswick
  { city: 'Fredericton',    province: 'NB', hdd: 4700, designTemp: -23, coldWaterTemp: 7 },
  { city: 'Moncton',        province: 'NB', hdd: 4300, designTemp: -20, coldWaterTemp: 7 },
  { city: 'Saint John',     province: 'NB', hdd: 4200, designTemp: -18, coldWaterTemp: 7 },

  // Nova Scotia
  { city: 'Halifax',        province: 'NS', hdd: 3800, designTemp: -16, coldWaterTemp: 8 },
  { city: 'Sydney',         province: 'NS', hdd: 4200, designTemp: -15, coldWaterTemp: 7 },
  { city: 'Truro',          province: 'NS', hdd: 4100, designTemp: -18, coldWaterTemp: 7 },

  // Prince Edward Island
  { city: 'Charlottetown',  province: 'PE', hdd: 4300, designTemp: -18, coldWaterTemp: 7 },
  { city: 'Summerside',     province: 'PE', hdd: 4400, designTemp: -19, coldWaterTemp: 7 },

  // Newfoundland & Labrador
  { city: "St. John's",     province: 'NL', hdd: 4800, designTemp: -14, coldWaterTemp: 7 },
  { city: 'Corner Brook',   province: 'NL', hdd: 5000, designTemp: -17, coldWaterTemp: 6 },
  { city: 'Happy Valley-Goose Bay', province: 'NL', hdd: 7600, designTemp: -32, coldWaterTemp: 3 },

  // Yukon
  { city: 'Whitehorse',     province: 'YT', hdd: 6580, designTemp: -41, coldWaterTemp: 3 },
  { city: 'Dawson City',    province: 'YT', hdd: 8400, designTemp: -49, coldWaterTemp: 2 },

  // Northwest Territories
  { city: 'Yellowknife',    province: 'NT', hdd: 8170, designTemp: -43, coldWaterTemp: 2 },
  { city: 'Hay River',      province: 'NT', hdd: 7200, designTemp: -40, coldWaterTemp: 2 },

  // Nunavut
  { city: 'Iqaluit',        province: 'NU', hdd: 9900, designTemp: -41, coldWaterTemp: 1 },
  { city: 'Rankin Inlet',   province: 'NU', hdd: 10500, designTemp: -43, coldWaterTemp: 1 },
]

export function getCitiesForProvince(provinceCode) {
  return cities.filter(c => c.province === provinceCode)
}

export function getClimateData(provinceCode, cityName) {
  return cities.find(c => c.province === provinceCode && c.city === cityName)
}
