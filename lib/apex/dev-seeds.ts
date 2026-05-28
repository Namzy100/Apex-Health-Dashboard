// ─── Dev seed scenarios for intelligence QA ───────────────────────────────────
//
// Each scenario returns a DailySnapshot[] representing past days.
// Used in scripts/test-intelligence.ts and optionally from the settings dev panel.
//
// Do NOT use in production logic.

import type { DailySnapshot } from "./memory";

// ─── Scenario A — Under-eating drift ─────────────────────────────────────────
// 5 days of significant calorie deficit + protein miss + low energy
// Expected patterns:
//   ✅ detectUnderEatingStreak
//   ✅ detectProteinMissPattern
//   ✅ detectEnergyCalorieLink (low energy follows each under-eat day)
//   ❌ detectLoggingDrift (all days logged)
//   ❌ detectWeekendCalorieShift (not relevant — consistent pattern)

export const SCENARIO_A: DailySnapshot[] = [
  {
    date: "2026-05-22",
    dayOfWeek: "Friday",
    caloriesEaten: 1450,
    calorieTarget: 2100,
    proteinEaten: 88,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 6200,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    date: "2026-05-23",
    dayOfWeek: "Saturday",
    caloriesEaten: 1620,
    calorieTarget: 2100,
    proteinEaten: 102,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "moderate",
    energyLevel: "medium",
    steps: 8100,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    // Low energy follows May 23 (1620 cal — under 2100*0.88=1848)
    date: "2026-05-24",
    dayOfWeek: "Sunday",
    caloriesEaten: 1380,
    calorieTarget: 2100,
    proteinEaten: 79,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "low",
    steps: 4800,
    stepTarget: 10000,
    foodLogCount: 2,
  },
  {
    // Low energy follows May 24 (1380 cal — clearly under)
    date: "2026-05-25",
    dayOfWeek: "Monday",
    caloriesEaten: 1510,
    calorieTarget: 2100,
    proteinEaten: 91,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "low",
    steps: 5200,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    // Low energy follows May 25 (1510 cal — under)
    date: "2026-05-26",
    dayOfWeek: "Tuesday",
    caloriesEaten: 1680,
    calorieTarget: 2100,
    proteinEaten: 108,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "light",
    energyLevel: "low",
    steps: 7400,
    stepTarget: 10000,
    foodLogCount: 4,
  },
];

// ─── Scenario B — Weekend disruption ──────────────────────────────────────────
// Weekdays on target, weekends significantly over, Monday crashes
// Expected patterns:
//   ✅ detectWeekendCalorieShift (weekends ~3000 cal vs weekdays ~1960)
//   ❌ detectUnderEatingStreak (weekdays are fine)
//   ❌ detectEnergyCalorieLink (Monday low energy came after HIGH cal, not under-cal)

export const SCENARIO_B: DailySnapshot[] = [
  {
    date: "2026-05-19",
    dayOfWeek: "Tuesday",
    caloriesEaten: 2020,
    calorieTarget: 2100,
    proteinEaten: 148,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "moderate",
    energyLevel: "high",
    steps: 9800,
    stepTarget: 10000,
    foodLogCount: 4,
  },
  {
    date: "2026-05-20",
    dayOfWeek: "Wednesday",
    caloriesEaten: 2080,
    calorieTarget: 2100,
    proteinEaten: 152,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 8400,
    stepTarget: 10000,
    foodLogCount: 4,
  },
  {
    date: "2026-05-21",
    dayOfWeek: "Thursday",
    caloriesEaten: 2110,
    calorieTarget: 2100,
    proteinEaten: 155,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "hard",
    energyLevel: "high",
    steps: 11200,
    stepTarget: 10000,
    foodLogCount: 4,
  },
  {
    date: "2026-05-22",
    dayOfWeek: "Friday",
    caloriesEaten: 1980,
    calorieTarget: 2100,
    proteinEaten: 142,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 7600,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    date: "2026-05-23",
    dayOfWeek: "Saturday",
    caloriesEaten: 2950,
    calorieTarget: 2100,
    proteinEaten: 180,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 12000,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    date: "2026-05-24",
    dayOfWeek: "Sunday",
    caloriesEaten: 3200,
    calorieTarget: 2100,
    proteinEaten: 195,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 10500,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    // Monday: low energy, not because of under-eating but disrupted routine
    date: "2026-05-25",
    dayOfWeek: "Monday",
    caloriesEaten: 1650,
    calorieTarget: 2100,
    proteinEaten: 118,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "low",
    steps: 5100,
    stepTarget: 10000,
    foodLogCount: 3,
  },
];

// ─── Scenario C — Logging drift ───────────────────────────────────────────────
// 7 days, only 2 have food logged
// Expected patterns:
//   ✅ detectLoggingDrift
//   ❌ detectUnderEatingStreak (not enough logged days)
//   ❌ detectProteinMissPattern (not enough logged days)
//   NOTE: the 2 logged days show solid nutrition — no false negative patterns

export const SCENARIO_C: DailySnapshot[] = [
  {
    date: "2026-05-20",
    dayOfWeek: "Wednesday",
    caloriesEaten: 0,
    calorieTarget: 2100,
    proteinEaten: 0,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 7200,
    stepTarget: 10000,
    foodLogCount: 0,
  },
  {
    date: "2026-05-21",
    dayOfWeek: "Thursday",
    caloriesEaten: 0,
    calorieTarget: 2100,
    proteinEaten: 0,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "moderate",
    energyLevel: "high",
    steps: 9400,
    stepTarget: 10000,
    foodLogCount: 0,
  },
  {
    date: "2026-05-22",
    dayOfWeek: "Friday",
    caloriesEaten: 1850,
    calorieTarget: 2100,
    proteinEaten: 140,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 8100,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    date: "2026-05-23",
    dayOfWeek: "Saturday",
    caloriesEaten: 0,
    calorieTarget: 2100,
    proteinEaten: 0,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 11200,
    stepTarget: 10000,
    foodLogCount: 0,
  },
  {
    date: "2026-05-24",
    dayOfWeek: "Sunday",
    caloriesEaten: 2050,
    calorieTarget: 2100,
    proteinEaten: 150,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "hard",
    energyLevel: "high",
    steps: 10200,
    stepTarget: 10000,
    foodLogCount: 4,
  },
  {
    date: "2026-05-25",
    dayOfWeek: "Monday",
    caloriesEaten: 0,
    calorieTarget: 2100,
    proteinEaten: 0,
    proteinTarget: 155,
    workoutLogged: false,
    steps: 6800,
    stepTarget: 10000,
    foodLogCount: 0,
  },
  {
    date: "2026-05-26",
    dayOfWeek: "Tuesday",
    caloriesEaten: 0,
    calorieTarget: 2100,
    proteinEaten: 0,
    proteinTarget: 155,
    workoutLogged: false,
    steps: 5900,
    stepTarget: 10000,
    foodLogCount: 0,
  },
];

// ─── Scenario D — Workout momentum ───────────────────────────────────────────
// 4/7 workout days, clear energy lift on those days
// Expected patterns:
//   ✅ detectWorkoutConsistency (strong — >= 4 days)
//   ✅ detectWorkoutEnergyLink (workout days = high, rest days = low/medium)
//   ❌ detectUnderEatingStreak (calories are fine)
//   ❌ detectEnergyCalorieLink (under-eating never precedes low-energy days)

export const SCENARIO_D: DailySnapshot[] = [
  {
    date: "2026-05-20",
    dayOfWeek: "Wednesday",
    caloriesEaten: 2050,
    calorieTarget: 2100,
    proteinEaten: 151,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "hard",
    energyLevel: "high",
    steps: 11500,
    stepTarget: 10000,
    foodLogCount: 4,
  },
  {
    date: "2026-05-21",
    dayOfWeek: "Thursday",
    caloriesEaten: 2080,
    calorieTarget: 2100,
    proteinEaten: 148,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "low",
    steps: 5800,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    date: "2026-05-22",
    dayOfWeek: "Friday",
    caloriesEaten: 2100,
    calorieTarget: 2100,
    proteinEaten: 156,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "moderate",
    energyLevel: "high",
    steps: 10200,
    stepTarget: 10000,
    foodLogCount: 4,
  },
  {
    date: "2026-05-23",
    dayOfWeek: "Saturday",
    caloriesEaten: 1980,
    calorieTarget: 2100,
    proteinEaten: 138,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "medium",
    steps: 8700,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    date: "2026-05-24",
    dayOfWeek: "Sunday",
    caloriesEaten: 2120,
    calorieTarget: 2100,
    proteinEaten: 160,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "hard",
    energyLevel: "high",
    steps: 12100,
    stepTarget: 10000,
    foodLogCount: 4,
  },
  {
    date: "2026-05-25",
    dayOfWeek: "Monday",
    caloriesEaten: 2030,
    calorieTarget: 2100,
    proteinEaten: 143,
    proteinTarget: 155,
    workoutLogged: false,
    energyLevel: "low",
    steps: 6100,
    stepTarget: 10000,
    foodLogCount: 3,
  },
  {
    date: "2026-05-26",
    dayOfWeek: "Tuesday",
    caloriesEaten: 2090,
    calorieTarget: 2100,
    proteinEaten: 152,
    proteinTarget: 155,
    workoutLogged: true,
    workoutIntensity: "moderate",
    energyLevel: "high",
    steps: 9900,
    stepTarget: 10000,
    foodLogCount: 4,
  },
];

// ─── Scenario E — No history ───────────────────────────────────────────────────
// Fresh user, zero snapshots
// Expected:
//   ✅ Zero patterns extracted
//   ✅ Brief gives forward-looking setup, no invented claims

export const SCENARIO_E: DailySnapshot[] = [];

// ─── Scenario map (for UI) ────────────────────────────────────────────────────

export const DEV_SCENARIOS: Record<
  string,
  { label: string; snapshots: DailySnapshot[]; description: string }
> = {
  a: {
    label: "Scenario A — Under-eating drift",
    snapshots: SCENARIO_A,
    description:
      "5 days of calories 400–700 below target, protein missed 4/5 days, low energy on 3 days",
  },
  b: {
    label: "Scenario B — Weekend disruption",
    snapshots: SCENARIO_B,
    description:
      "Weekdays on target, weekend calories ~3000, Monday low energy",
  },
  c: {
    label: "Scenario C — Logging drift",
    snapshots: SCENARIO_C,
    description: "Only 2 of 7 days have food logged",
  },
  d: {
    label: "Scenario D — Workout momentum",
    snapshots: SCENARIO_D,
    description:
      "4/7 workout days, high energy on workout days, low on rest days",
  },
  e: {
    label: "Scenario E — Fresh start",
    snapshots: SCENARIO_E,
    description: "No history",
  },
};
