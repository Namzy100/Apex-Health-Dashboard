import type { ApexState } from "@/lib/store";
import { extractPatterns } from "./patterns";
import type { BehavioralPattern } from "./memory";
import { buildWeeklySummary } from "./weekly-summary";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApexContext {
  user: {
    name: string;
    goal: string;
    calorieTarget: number;
    proteinTarget: number;
    stepTarget: number;
    topPriority?: string;
  };
  today: {
    date: string;
    dayOfWeek: string;
    energyLevel?: "low" | "medium" | "high";
    caloriesEaten: number;
    proteinEaten: number;
    steps: number;
    firstMeeting?: string;
    hasLoggedFood: boolean;
    hasLoggedWeight: boolean;
    workoutLogged: boolean;
    workoutDetails?: string;
  };
  recent: {
    currentWeight?: number;
    weightTrend?: string;    // e.g. "down 1.2 lbs this week"
    weeklyAvgCalories: number;
    missedProteinDays: number;
    daysLogged: number;
    notes?: string[];
  };
  goals: {
    weightRemaining?: number;
    daysToDeadline?: number;
    weeklyRateNeeded?: number;
    onTrack: boolean;
  };
  // ── Behavioral intelligence layer ─────────────────────────────────────────
  behavioral: {
    patterns: BehavioralPattern[];      // extracted behavioral patterns, sorted by confidence
    weeklySummary: string;              // token-compressed 7-day summary
    daysOfData: number;                 // how many historical days are available
  };
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildContext(state: ApexState): ApexContext {
  const { profile, today, weightHistory, dailyHistory = [] } = state;

  // ── Today's macro totals ─────────────────────────────────────────────────
  const caloriesEaten = today.foodLogs.reduce((s, f) => s + f.calories, 0);
  const proteinEaten = today.foodLogs.reduce((s, f) => s + f.protein, 0);

  // ── Weight trend ─────────────────────────────────────────────────────────
  const currentWeight =
    weightHistory.length > 0
      ? weightHistory[weightHistory.length - 1].weight
      : profile.startWeight;

  const last7weights = weightHistory.slice(-7);
  let weightTrend: string | undefined;
  if (last7weights.length >= 2) {
    const diff =
      last7weights[last7weights.length - 1].weight - last7weights[0].weight;
    const abs = Math.abs(diff).toFixed(1);
    weightTrend =
      diff < 0 ? `down ${abs} lbs this week` : `up ${abs} lbs this week`;
  }

  // ── Weekly logging stats from dailyHistory ───────────────────────────────
  const last7snapshots = dailyHistory.slice(-7);
  const loggedSnapshots = last7snapshots.filter(s => s.foodLogCount > 0);
  const weeklyAvgCalories =
    loggedSnapshots.length > 0
      ? Math.round(
          loggedSnapshots.reduce((s, d) => s + d.caloriesEaten, 0) /
            loggedSnapshots.length
        )
      : caloriesEaten; // fall back to today if no history
  const missedProteinDays = loggedSnapshots.filter(
    s => s.proteinEaten < s.proteinTarget * 0.9
  ).length;
  const daysLogged =
    loggedSnapshots.length + (today.foodLogs.length > 0 ? 1 : 0);

  // ── Goal math ────────────────────────────────────────────────────────────
  let weightRemaining: number | undefined;
  let daysToDeadline: number | undefined;
  let weeklyRateNeeded: number | undefined;
  let onTrack = true;

  if (currentWeight && profile.goalWeight) {
    weightRemaining = Math.max(0, currentWeight - profile.goalWeight);
  }
  if (profile.goalDate) {
    const msLeft =
      new Date(profile.goalDate + "T12:00:00").getTime() - Date.now();
    daysToDeadline = Math.max(0, Math.ceil(msLeft / 86400000));
    if (weightRemaining && daysToDeadline > 0) {
      weeklyRateNeeded = parseFloat(
        (weightRemaining / (daysToDeadline / 7)).toFixed(2)
      );
      onTrack = weeklyRateNeeded <= 2.0;
    }
  }

  const dayOfWeek = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  // ── Behavioral intelligence ──────────────────────────────────────────────
  // Include today's data as a tentative snapshot in the pattern analysis
  // so current-day behavior is reflected even before archiving
  const liveSnapshot = {
    date: today.date,
    dayOfWeek,
    caloriesEaten,
    calorieTarget: profile.calorieTarget,
    proteinEaten: Math.round(proteinEaten),
    proteinTarget: profile.proteinTarget,
    workoutLogged: today.workoutLog != null,
    workoutIntensity: today.workoutLog?.intensity,
    energyLevel: today.energyLevel ?? undefined,
    steps: today.steps,
    stepTarget: profile.stepTarget,
    foodLogCount: today.foodLogs.length,
  };

  // Merge history + today (deduplicated)
  const allSnapshots = [
    ...dailyHistory.filter(s => s.date !== today.date),
    liveSnapshot,
  ];

  const patterns = extractPatterns(allSnapshots);
  const weeklySummary = buildWeeklySummary(allSnapshots);

  return {
    user: {
      name: profile.name || "there",
      goal: profile.goal || "improve health and performance",
      calorieTarget: profile.calorieTarget,
      proteinTarget: profile.proteinTarget,
      stepTarget: profile.stepTarget,
      topPriority: profile.topPriority,
    },
    today: {
      date: today.date,
      dayOfWeek,
      energyLevel: today.energyLevel ?? undefined,
      caloriesEaten,
      proteinEaten: Math.round(proteinEaten * 10) / 10,
      steps: today.steps,
      firstMeeting: profile.firstMeeting,
      hasLoggedFood: today.foodLogs.length > 0,
      hasLoggedWeight: today.weightLog != null,
      workoutLogged: today.workoutLog != null,
      workoutDetails: today.workoutLog
        ? `${today.workoutLog.muscleGroup}, ${today.workoutLog.duration}min, ${today.workoutLog.intensity}`
        : undefined,
    },
    recent: {
      currentWeight,
      weightTrend,
      weeklyAvgCalories,
      missedProteinDays,
      daysLogged,
    },
    goals: {
      weightRemaining,
      daysToDeadline,
      weeklyRateNeeded,
      onTrack,
    },
    behavioral: {
      patterns,
      weeklySummary,
      daysOfData: allSnapshots.length,
    },
  };
}
