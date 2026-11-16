// ── Food ──────────────────────────────────────────────────────────────────────
// Two ways food enters the footprint:
//   1. A "usual diet" type for each period of your life (meat-eater, vegetarian…),
//      from a large UK study of what people actually eat. This fills in history.
//   2. A logged week of meals, from per-food factors. This measures your diet now
//      and calibrates the usual-diet figures to you (portions, choices).
// Cooking at home adds nothing here: the energy is already in your home's
// electricity and gas.

import type { FoodWeek, Meal, MealSource, DietType, WasteLevel } from '@/lib/timeline/types'

// Per-food factors, kg CO2e per kg of product, global means for 2010.
// Source: Poore & Nemecek (2018), Science 360:987, via Our World in Data.
export const FOOD_SOURCE = 'Poore & Nemecek (2018), Science 360:987, via Our World in Data'
export const FOOD_SOURCE_URL = 'https://ourworldindata.org/grapher/ghg-per-kg-poore'

export type FoodGroup = 'meat' | 'fish' | 'dairyEggs' | 'plantProtein' | 'staples' | 'produce' | 'treats'

export interface Food {
  id: string
  label: string
  /** What one serving means, in words */
  serving: string
  servingG: number
  kgPerKg: number
  group: FoodGroup
  /** grams of meat (not fish) per serving, for working out your diet type */
  meatG?: number
  fishG?: number
}

export const FOODS: Food[] = [
  { id: 'beef',       label: 'Beef',                         serving: '150 g, a burger or steak',    servingG: 150, kgPerKg: 99.48, group: 'meat', meatG: 150 },
  { id: 'lamb',       label: 'Lamb',                         serving: '150 g',                       servingG: 150, kgPerKg: 39.72, group: 'meat', meatG: 150 },
  { id: 'pork',       label: 'Pork, ham or bacon',           serving: '120 g',                       servingG: 120, kgPerKg: 12.31, group: 'meat', meatG: 120 },
  { id: 'poultry',    label: 'Chicken or turkey',            serving: '150 g, a breast',             servingG: 150, kgPerKg: 9.87,  group: 'meat', meatG: 150 },
  { id: 'fish',       label: 'Fish',                         serving: '150 g, a fillet',             servingG: 150, kgPerKg: 13.63, group: 'fish', fishG: 150 },
  { id: 'shrimp',     label: 'Shrimp or prawns',             serving: '100 g',                       servingG: 100, kgPerKg: 26.87, group: 'fish', fishG: 100 },
  { id: 'cheese',     label: 'Cheese',                       serving: '40 g, two slices',            servingG: 40,  kgPerKg: 23.88, group: 'dairyEggs' },
  { id: 'milk',       label: 'Milk or yogurt',               serving: 'a glass or bowl, 250 ml',     servingG: 250, kgPerKg: 3.15,  group: 'dairyEggs' },
  { id: 'eggs',       label: 'Eggs',                         serving: 'two eggs',                    servingG: 100, kgPerKg: 4.67,  group: 'dairyEggs' },
  { id: 'tofu',       label: 'Tofu or tempeh',               serving: '150 g',                       servingG: 150, kgPerKg: 3.16,  group: 'plantProtein' },
  { id: 'pulses',     label: 'Beans, lentils or chickpeas',  serving: 'a cup cooked',                servingG: 75,  kgPerKg: 1.79,  group: 'plantProtein' },
  { id: 'nuts',       label: 'Nuts or seeds',                serving: 'a handful, 30 g',             servingG: 30,  kgPerKg: 0.43,  group: 'plantProtein' },
  { id: 'plantMilk',  label: 'Plant milk',                   serving: 'a glass, 250 ml',             servingG: 250, kgPerKg: 0.98,  group: 'plantProtein' },
  { id: 'rice',       label: 'Rice',                         serving: 'a cup cooked',                servingG: 75,  kgPerKg: 4.45,  group: 'staples' },
  { id: 'grains',     label: 'Bread, pasta or other grains', serving: 'two slices or a cup of pasta', servingG: 100, kgPerKg: 1.57, group: 'staples' },
  { id: 'oats',       label: 'Oatmeal or cereal',            serving: 'a bowl',                      servingG: 50,  kgPerKg: 2.48,  group: 'staples' },
  { id: 'potatoes',   label: 'Potatoes',                     serving: 'a large potato',              servingG: 200, kgPerKg: 0.46,  group: 'staples' },
  { id: 'vegetables', label: 'Vegetables',                   serving: 'a side, 150 g',               servingG: 150, kgPerKg: 0.53,  group: 'produce' },
  { id: 'fruit',      label: 'Fruit',                        serving: 'a piece, 150 g',              servingG: 150, kgPerKg: 1.05,  group: 'produce' },
  { id: 'coffee',     label: 'Coffee',                       serving: 'a cup',                       servingG: 8,   kgPerKg: 28.53, group: 'treats' },
  { id: 'chocolate',  label: 'Chocolate',                    serving: 'a bar, 40 g',                 servingG: 40,  kgPerKg: 46.65, group: 'treats' },
  { id: 'wine',       label: 'Wine',                         serving: 'a glass',                     servingG: 150, kgPerKg: 1.79,  group: 'treats' },
]

export const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]))

export const GROUP_LABELS: Record<FoodGroup, string> = {
  meat: 'Meat',
  fish: 'Fish and seafood',
  dairyEggs: 'Dairy and eggs',
  plantProtein: 'Plant proteins',
  staples: 'Grains and potatoes',
  produce: 'Fruit and vegetables',
  treats: 'Coffee, chocolate and wine',
}

/** kg CO2e for one serving of a food. */
export function servingKg(f: Food): number {
  return (f.servingG / 1000) * f.kgPerKg
}

// Where a meal came from. Home cooking adds nothing: its energy is already in
// your home's footprint. Eating out adds the kitchen and dining room's energy and
// packaging, and restaurants serve and waste more food.
// These are CWM estimates, not from a single published factor; studies range from
// "slightly worse than home" to several times worse.
export const SOURCE_EFFECT: Record<MealSource, { foodMultiplier: number; extraKg: number; label: string }> = {
  home:       { foodMultiplier: 1.0,  extraKg: 0,    label: 'Made at home' },
  takeout:    { foodMultiplier: 1.05, extraKg: 0.25, label: 'Takeout or delivery' },
  restaurant: { foodMultiplier: 1.1,  extraKg: 0.5,  label: 'Restaurant or cafeteria' },
}

// Transport is a small share of food emissions: about 6% across EU diets.
// Buying mostly local removes most of that, not more.
// Source: Our World in Data, "Focus on what you eat, not whether your food is local".
export const LOCAL_MULTIPLIER = 0.95
export const LOCAL_SOURCE_URL = 'https://ourworldindata.org/food-choice-vs-eating-local'

// Food bought and thrown out at home. CWM estimate.
export const WASTE_MULTIPLIER: Record<WasteLevel, number> = { low: 1.0, average: 1.1, high: 1.25 }

// Cooking oil, sugar, sauces and drinks that nobody logs. CWM estimate, kg CO2e a day.
export const PANTRY_KG_PER_DAY = 0.3

// Usual-diet figures: median kg CO2e a day, standardised to 2,000 kcal.
// Source: Scarborough et al. (2023), Nature Food 4:565, 55,504 UK adults.
// UK diets; Canadian diet data is a known gap.
export const DIET_SOURCE = 'Scarborough et al. (2023), Nature Food 4:565 (UK adults)'
export const DIET_SOURCE_URL = 'https://www.nature.com/articles/s43016-023-00795-w'

export const DIETS: { id: DietType; label: string; describe: string; kgPerDay: number }[] = [
  { id: 'highMeat',    label: 'Lots of meat',  describe: 'Meat most meals, 100 g a day or more',    kgPerDay: 10.24 },
  { id: 'mediumMeat',  label: 'Some meat',     describe: 'Meat about once a day, 50 to 100 g',      kgPerDay: 7.04 },
  { id: 'lowMeat',     label: 'A little meat', describe: 'Meat a few times a week, under 50 g a day', kgPerDay: 5.37 },
  { id: 'pescatarian', label: 'Fish, no meat', describe: 'Fish and seafood, but no meat',           kgPerDay: 4.74 },
  { id: 'vegetarian',  label: 'Vegetarian',    describe: 'No meat or fish',                         kgPerDay: 4.16 },
  { id: 'vegan',       label: 'Vegan',         describe: 'No animal products',                      kgPerDay: 2.47 },
]

export const DIET_BY_ID = new Map(DIETS.map((d) => [d.id, d]))

// ── A logged week ─────────────────────────────────────────────────────────────

export interface WeekResult {
  /** Your measured diet, kg CO2e a day */
  kgPerDay: number
  daysLogged: number
  /** kg CO2e a day by part */
  parts: { key: string; label: string; kgPerDay: number }[]
  /** What the week looks like as a usual-diet type */
  dietType: DietType
  meatGPerDay: number
  mealsOut: number
  meals: number
}

function mealKg(meal: Meal): { byGroup: Map<FoodGroup, number>; extra: number } {
  const src = SOURCE_EFFECT[meal.source]
  const local = meal.local ? LOCAL_MULTIPLIER : 1
  const byGroup = new Map<FoodGroup, number>()
  for (const it of meal.items) {
    const f = FOOD_BY_ID.get(it.foodId)
    if (!f || !(it.servings > 0)) continue
    const kg = servingKg(f) * it.servings * src.foodMultiplier * local
    byGroup.set(f.group, (byGroup.get(f.group) ?? 0) + kg)
  }
  return { byGroup, extra: meal.items.length ? src.extraKg : 0 }
}

export function computeWeek(week: FoodWeek): WeekResult | null {
  const days = new Set(week.meals.filter((m) => m.items.length > 0).map((m) => m.day))
  const daysLogged = days.size
  if (daysLogged === 0) return null

  const groups = new Map<FoodGroup, number>()
  let eatingOut = 0
  let meatG = 0
  let fishG = 0
  let animal = 0
  for (const meal of week.meals) {
    const { byGroup, extra } = mealKg(meal)
    for (const [g, kg] of byGroup) groups.set(g, (groups.get(g) ?? 0) + kg)
    eatingOut += extra
    for (const it of meal.items) {
      const f = FOOD_BY_ID.get(it.foodId)
      if (!f) continue
      meatG += (f.meatG ?? 0) * it.servings
      fishG += (f.fishG ?? 0) * it.servings
      if (f.group === 'dairyEggs') animal += it.servings
    }
  }

  const waste = WASTE_MULTIPLIER[week.waste]
  const parts: WeekResult['parts'] = []
  for (const g of Object.keys(GROUP_LABELS) as FoodGroup[]) {
    const kg = groups.get(g) ?? 0
    if (kg > 0) parts.push({ key: g, label: GROUP_LABELS[g], kgPerDay: kg / daysLogged })
  }
  if (eatingOut > 0) parts.push({ key: 'eatingOut', label: 'Eating out: kitchens, dining rooms, packaging', kgPerDay: eatingOut / daysLogged })
  const foodPerDay = parts.reduce((t, p) => t + p.kgPerDay, 0)
  if (waste > 1) parts.push({ key: 'waste', label: 'Food thrown out at home', kgPerDay: foodPerDay * (waste - 1) })
  parts.push({ key: 'pantry', label: 'Oil, sugar, sauces and drinks (estimate)', kgPerDay: PANTRY_KG_PER_DAY })

  const meatGPerDay = meatG / daysLogged
  let dietType: DietType
  if (meatGPerDay >= 100) dietType = 'highMeat'
  else if (meatGPerDay >= 50) dietType = 'mediumMeat'
  else if (meatGPerDay > 0) dietType = 'lowMeat'
  else if (fishG > 0) dietType = 'pescatarian'
  else if (animal > 0) dietType = 'vegetarian'
  else dietType = 'vegan'

  return {
    kgPerDay: parts.reduce((t, p) => t + p.kgPerDay, 0),
    daysLogged,
    parts,
    dietType,
    meatGPerDay,
    mealsOut: week.meals.filter((m) => m.items.length && m.source !== 'home').length,
    meals: week.meals.filter((m) => m.items.length).length,
  }
}

/**
 * How your logged week compares with a typical person on the same usual diet.
 * Applied to every period of your diet history, so a change of diet is credited
 * at your own scale, and measuring doesn't itself count as a change.
 * Limited to 0.5–1.6 so one unusual week can't swing your history too far.
 */
export function calibration(measuredKgPerDay: number, usual: DietType): number {
  const typical = DIET_BY_ID.get(usual)?.kgPerDay
  if (!typical) return 1
  return Math.min(1.6, Math.max(0.5, measuredKgPerDay / typical))
}
