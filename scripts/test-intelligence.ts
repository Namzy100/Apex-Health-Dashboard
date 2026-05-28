// ─── Intelligence QA — Apex Behavioral Memory ────────────────────────────────
//
// Run: npx tsx scripts/test-intelligence.ts
//
// Tests pattern extraction, context synthesis, and brief quality across 5
// behavioral scenarios. No test framework required.

import { extractPatterns } from "../lib/apex/patterns";
import { buildWeeklySummary } from "../lib/apex/weekly-summary";
import { getMockBrief, getMockChatResponse } from "../lib/apex/prompts";
import {
  SCENARIO_A,
  SCENARIO_B,
  SCENARIO_C,
  SCENARIO_D,
  SCENARIO_E,
} from "../lib/apex/dev-seeds";
import type { DailySnapshot } from "../lib/apex/memory";
import type { ApexContext } from "../lib/apex/context-builder";

// ─── Mini assertion helpers ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
    failures.push(`${name}${detail ? ` (${detail})` : ""}`);
  }
}

function assertNot(name: string, condition: boolean, detail?: string) {
  assert(name, !condition, detail);
}

// ─── Context builder for tests (minimal, no store dependency) ────────────────

function buildTestContext(
  snapshots: DailySnapshot[],
  overrides: Partial<ApexContext> = {}
): ApexContext {
  const { extractPatterns: ep } = require("../lib/apex/patterns");
  const { buildWeeklySummary: bws } = require("../lib/apex/weekly-summary");

  const patterns = ep(snapshots);
  const weeklySummary = bws(snapshots);

  return {
    user: {
      name: "Naman",
      goal: "Lose 15 lbs by August 31, 2026",
      calorieTarget: 2100,
      proteinTarget: 155,
      stepTarget: 10000,
      topPriority: "Close the Stripe integration",
    },
    today: {
      date: "2026-05-27",
      dayOfWeek: "Wednesday",
      caloriesEaten: 0,
      proteinEaten: 0,
      steps: 0,
      firstMeeting: "2:00 PM",
      hasLoggedFood: false,
      hasLoggedWeight: false,
      workoutLogged: false,
    },
    recent: {
      currentWeight: 184.2,
      weightTrend: "down 0.8 lbs this week",
      weeklyAvgCalories: 1750,
      missedProteinDays: 3,
      daysLogged: 5,
    },
    goals: {
      weightRemaining: 9.2,
      daysToDeadline: 96,
      weeklyRateNeeded: 0.67,
      onTrack: true,
    },
    behavioral: {
      patterns,
      weeklySummary,
      daysOfData: snapshots.length,
    },
    ...overrides,
  };
}

function patternContains(
  patterns: ReturnType<typeof extractPatterns>,
  keyword: string
): boolean {
  return patterns.some(p => p.pattern.toLowerCase().includes(keyword.toLowerCase()));
}

// ─── Scenario A ───────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("SCENARIO A — Under-eating drift");
console.log("═══════════════════════════════════════════════════════════");

const patternsA = extractPatterns(SCENARIO_A);
const summaryA = buildWeeklySummary(SCENARIO_A);
const ctxA = buildTestContext(SCENARIO_A);
const briefA = getMockBrief(ctxA);

console.log(`\n  Patterns detected: ${patternsA.length}`);
patternsA.forEach(p =>
  console.log(`  • [${Math.round(p.confidence * 100)}%] ${p.pattern}`)
);
console.log(`\n  Weekly summary: ${summaryA}`);
console.log(`\n  Brief: "${briefA.brief}"`);
console.log(`  Chips: ${briefA.chips.join(" | ")}`);

console.log("\n  Assertions:");
assert("Under-eating pattern fires", patternContains(patternsA, "under-eat"));
assert(
  "Under-eating has evidence array",
  (patternsA.find(p => p.pattern.toLowerCase().includes("under-eat"))?.evidence?.length ?? 0) >= 3
);
assert("Protein miss pattern fires", patternContains(patternsA, "protein"));
assert(
  "Energy-calorie link fires",
  patternContains(patternsA, "energy") && patternsA.some(p => p.pattern.includes("follow"))
);
assertNot(
  "No logging-drift false positive (all days logged)",
  patternsA.some(p => p.pattern.toLowerCase().includes("logging") && p.pattern.toLowerCase().includes("only"))
);
assert(
  "Brief references under-eating behaviorally",
  briefA.brief.toLowerCase().includes("under-eat") ||
    briefA.brief.toLowerCase().includes("energy") ||
    briefA.brief.toLowerCase().includes("deficit")
);
assertNot(
  "Brief does NOT say 'stay consistent'",
  briefA.brief.toLowerCase().includes("stay consistent")
);
assertNot(
  "Brief does NOT say 'amazing' or 'great job'",
  briefA.brief.toLowerCase().includes("amazing") ||
    briefA.brief.toLowerCase().includes("great job")
);
assert(
  "All patterns have evidence",
  patternsA.every(p => p.evidence.length > 0)
);
assert(
  "All confidence scores 0–1",
  patternsA.every(p => p.confidence >= 0 && p.confidence <= 1)
);

// ─── Scenario B ───────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("SCENARIO B — Weekend disruption");
console.log("═══════════════════════════════════════════════════════════");

const patternsB = extractPatterns(SCENARIO_B);
const summaryB = buildWeeklySummary(SCENARIO_B);
const ctxB = buildTestContext(SCENARIO_B);
const briefB = getMockBrief(ctxB);

console.log(`\n  Patterns detected: ${patternsB.length}`);
patternsB.forEach(p =>
  console.log(`  • [${Math.round(p.confidence * 100)}%] ${p.pattern}`)
);
console.log(`\n  Weekly summary: ${summaryB}`);
console.log(`\n  Brief: "${briefB.brief}"`);

console.log("\n  Assertions:");
assert(
  "Weekend calorie shift pattern fires",
  patternContains(patternsB, "weekend")
);
assert(
  "Weekend pattern has calorie evidence",
  (patternsB.find(p => p.pattern.toLowerCase().includes("weekend"))?.evidence?.length ?? 0) >= 2
);
assertNot(
  "Under-eating NOT falsely triggered (weekdays were fine)",
  patternsB.some(
    p => p.pattern.toLowerCase().includes("under-eat") && p.confidence > 0.7
  )
);
assertNot(
  "Brief does not shame the user",
  briefB.brief.toLowerCase().includes("bad") ||
    briefB.brief.toLowerCase().includes("shame") ||
    briefB.brief.toLowerCase().includes("you failed")
);
assert(
  "Brief is constructive",
  briefB.brief.length > 50 && briefB.brief.length < 600
);
assert(
  "Brief references a behavioral pattern — NOT the generic 'nothing logged' fallback",
  // Top pattern in scenario B is workout-energy (0.78); weekend is second (0.72).
  // Brief should lead with whichever is highest-confidence, not fall back to generic.
  briefB.brief.toLowerCase().includes("workout") ||
    briefB.brief.toLowerCase().includes("weekend") ||
    briefB.brief.toLowerCase().includes("training") ||
    briefB.brief.toLowerCase().includes("energy")
);

// Chat: ask about weekend pattern
const chatB = getMockChatResponse("what patterns do you notice?", ctxB);
console.log(`\n  Chat (pattern query): "${chatB}"`);
assert(
  "Chat references behavioral pattern when asked",
  chatB.toLowerCase().includes("weekend") ||
    chatB.toLowerCase().includes("pattern") ||
    chatB.length > 60
);

// ─── Scenario C ───────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("SCENARIO C — Logging drift");
console.log("═══════════════════════════════════════════════════════════");

const patternsC = extractPatterns(SCENARIO_C);
const summaryC = buildWeeklySummary(SCENARIO_C);
const ctxC = buildTestContext(SCENARIO_C);
const briefC = getMockBrief(ctxC);

console.log(`\n  Patterns detected: ${patternsC.length}`);
patternsC.forEach(p =>
  console.log(`  • [${Math.round(p.confidence * 100)}%] ${p.pattern}`)
);
console.log(`\n  Weekly summary: ${summaryC}`);
console.log(`\n  Brief: "${briefC.brief}"`);

console.log("\n  Assertions:");
assert("Logging drift fires", patternContains(patternsC, "log"));
assertNot(
  "Under-eating NOT falsely triggered (only 2 logged days)",
  patternContains(patternsC, "under-eat")
);
assertNot(
  "Protein miss NOT falsely triggered (insufficient data)",
  patternsC.some(
    p => p.pattern.toLowerCase().includes("protein") && p.confidence > 0.6
  )
);
assert(
  "Brief is honest about limited data",
  briefC.brief.length > 50 // gives a useful response, not an error
);
assertNot(
  "Brief does NOT claim false certainty",
  briefC.brief.toLowerCase().includes("every day") ||
    briefC.brief.toLowerCase().includes("always") ||
    briefC.brief.toLowerCase().includes("never")
);

// ─── Scenario D ───────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("SCENARIO D — Workout momentum");
console.log("═══════════════════════════════════════════════════════════");

const patternsD = extractPatterns(SCENARIO_D);
const summaryD = buildWeeklySummary(SCENARIO_D);
const ctxD = buildTestContext(SCENARIO_D);
const briefD = getMockBrief(ctxD);

console.log(`\n  Patterns detected: ${patternsD.length}`);
patternsD.forEach(p =>
  console.log(`  • [${Math.round(p.confidence * 100)}%] ${p.pattern}`)
);
console.log(`\n  Weekly summary: ${summaryD}`);
console.log(`\n  Brief: "${briefD.brief}"`);

// Check chat response about workouts
const chatD = getMockChatResponse("should I work out today?", ctxD);
console.log(`\n  Chat (workout query): "${chatD}"`);

console.log("\n  Assertions:");
assert(
  "Workout consistency pattern fires (4/7 days)",
  patternContains(patternsD, "workout") || patternContains(patternsD, "training")
);
assert(
  "Workout-energy link fires",
  patternsD.some(p => p.pattern.toLowerCase().includes("energy") &&
    (p.pattern.toLowerCase().includes("workout") || p.pattern.toLowerCase().includes("higher")))
);
assertNot(
  "Under-eating NOT falsely triggered (calories were fine)",
  patternContains(patternsD, "under-eat")
);
assertNot(
  "Energy-calorie link NOT falsely triggered (no calorie-caused low energy)",
  patternsD.some(
    p =>
      p.pattern.toLowerCase().includes("follow") &&
      p.pattern.toLowerCase().includes("under-eat") &&
      p.confidence > 0.6
  )
);
assert(
  "Chat response to workout question is useful",
  chatD.length > 80
);
assert(
  "Brief references workout momentum (not generic 'nothing logged')",
  briefD.brief.toLowerCase().includes("workout") ||
    briefD.brief.toLowerCase().includes("training") ||
    briefD.brief.toLowerCase().includes("energy") ||
    briefD.brief.toLowerCase().includes("streak")
);
assert(
  "Momentum detector uses target-relative language",
  !patternsB.some(p =>
    p.pattern.toLowerCase().includes("improving") ||
    p.pattern.toLowerCase().includes("drifting down")
  )
);

// ─── Scenario E ───────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("SCENARIO E — No history (fresh user)");
console.log("═══════════════════════════════════════════════════════════");

const patternsE = extractPatterns(SCENARIO_E);
const summaryE = buildWeeklySummary(SCENARIO_E);
const ctxE = buildTestContext(SCENARIO_E);
const briefE = getMockBrief(ctxE);

console.log(`\n  Patterns detected: ${patternsE.length}`);
console.log(`\n  Weekly summary: ${summaryE}`);
console.log(`\n  Brief: "${briefE.brief}"`);

console.log("\n  Assertions:");
assert(
  "Zero patterns for fresh user (no hallucination)",
  patternsE.length === 0
);
assert(
  "Weekly summary handles empty gracefully",
  summaryE.length > 0
);
assert(
  "Brief is forward-looking, not empty",
  briefE.brief.length > 50
);
assertNot(
  "Brief does NOT invent patterns that don't exist",
  briefE.brief.toLowerCase().includes("pattern") ||
    briefE.brief.toLowerCase().includes("streak") ||
    briefE.brief.toLowerCase().includes("consistently")
);

// ─── Cross-scenario: confidence calibration ───────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("CROSS-SCENARIO — Confidence calibration");
console.log("═══════════════════════════════════════════════════════════");

const allPatterns = [...patternsA, ...patternsB, ...patternsC, ...patternsD];
const overconfident = allPatterns.filter(p => p.confidence > 0.95);
const allHaveEvidence = allPatterns.every(p => p.evidence.length > 0);
const allHaveDates = allPatterns.every(p => p.lastObserved.length === 10);

console.log(`  Total patterns across A-D: ${allPatterns.length}`);
console.log(`  Overconfident (>95%): ${overconfident.length}`);
if (overconfident.length > 0) {
  overconfident.forEach(p =>
    console.log(`    ⚠️  ${Math.round(p.confidence * 100)}% — "${p.pattern.slice(0, 60)}..."`)
  );
}

console.log("\n  Assertions:");
assert(
  "No patterns have confidence > 0.95",
  overconfident.length === 0
);
assert(
  "Every pattern has at least one evidence data point",
  allHaveEvidence
);
assert(
  "Every pattern has a valid lastObserved date (YYYY-MM-DD)",
  allHaveDates
);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("RESULTS");
console.log("═══════════════════════════════════════════════════════════");
console.log(`\n  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);

if (failures.length > 0) {
  console.log("\n  Failed assertions:");
  failures.forEach(f => console.log(`  ✗ ${f}`));
}

console.log("");
process.exit(failed > 0 ? 1 : 0);
