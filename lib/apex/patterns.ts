// ─── Behavioral pattern extraction ────────────────────────────────────────────
//
// Pure functions. No side effects. Takes DailySnapshot history, returns
// BehavioralPattern[]. Designed to notice loops, not just describe data.
//
// Philosophy:
//   Bad: "You ate 1700 calories yesterday."
//   Good: "Under-eating again — this is the third time this week your energy
//          collapsed the day after."

import type { DailySnapshot, BehavioralPattern } from "./memory";

// ─── Main extractor ───────────────────────────────────────────────────────────

export function extractPatterns(snapshots: DailySnapshot[]): BehavioralPattern[] {
  if (snapshots.length < 3) return [];

  const patterns: BehavioralPattern[] = [];
  const recent = snapshots.slice(-14);
  const last7 = snapshots.slice(-7);

  // Run each detector
  const detectors = [
    detectUnderEatingStreak,
    detectProteinMissPattern,
    detectEnergyCalorieLink,
    detectWorkoutConsistency,
    detectWorkoutEnergyLink,
    detectWeekendCalorieShift,
    detectLoggingDrift,
    detectMomentumDirection,
  ];

  for (const detector of detectors) {
    const found = detector(last7, recent, snapshots);
    if (found) patterns.push(found);
  }

  // Sort by confidence descending, return top 6
  return patterns
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

// ─── Detectors ────────────────────────────────────────────────────────────────

function detectUnderEatingStreak(
  last7: DailySnapshot[]
): BehavioralPattern | null {
  const loggedDays = last7.filter(s => s.foodLogCount > 0);
  if (loggedDays.length < 3) return null;

  const underDays = loggedDays.filter(
    s => s.caloriesEaten < s.calorieTarget * 0.88
  );
  if (underDays.length < 3) return null;

  const avgCal = Math.round(
    underDays.reduce((s, d) => s + d.caloriesEaten, 0) / underDays.length
  );
  const avgDeficit = underDays[0].calorieTarget - avgCal;

  return {
    pattern: `Under-eating on ${underDays.length} of the last ${loggedDays.length} tracked days — averaging ${avgCal} cal vs ${underDays[0].calorieTarget} target (${avgDeficit} cal/day short)`,
    confidence: Math.min(0.95, 0.52 + underDays.length * 0.1),
    evidence: underDays.map(
      s => `${s.date} (${s.dayOfWeek}): ${s.caloriesEaten} cal`
    ),
    lastObserved: underDays[underDays.length - 1].date,
  };
}

function detectProteinMissPattern(
  last7: DailySnapshot[]
): BehavioralPattern | null {
  const loggedDays = last7.filter(s => s.foodLogCount > 0);
  if (loggedDays.length < 3) return null;

  const missDays = loggedDays.filter(
    s => s.proteinEaten < s.proteinTarget * 0.88
  );
  if (missDays.length < 3) return null;

  const avgShort = Math.round(
    missDays.reduce((s, d) => s + (d.proteinTarget - d.proteinEaten), 0) /
      missDays.length
  );

  return {
    pattern: `Protein target missed ${missDays.length}/${loggedDays.length} logged days — consistently ${avgShort}g short on average`,
    confidence: Math.min(0.9, 0.5 + missDays.length * 0.1),
    evidence: missDays.map(
      s =>
        `${s.date}: ${s.proteinEaten}g / ${s.proteinTarget}g target`
    ),
    lastObserved: missDays[missDays.length - 1].date,
  };
}

function detectEnergyCalorieLink(
  _last7: DailySnapshot[],
  recent: DailySnapshot[]
): BehavioralPattern | null {
  if (recent.length < 4) return null;

  const lowEnergyDays = recent.filter(s => s.energyLevel === "low");
  if (lowEnergyDays.length < 2) return null;

  // Check if day before low-energy days were under-cal days
  const confirmed = lowEnergyDays.filter(s => {
    const idx = recent.indexOf(s);
    if (idx === 0) return false;
    const prev = recent[idx - 1];
    return prev.foodLogCount > 0 && prev.caloriesEaten < prev.calorieTarget * 0.87;
  });

  if (confirmed.length < 2) return null;

  return {
    pattern: `Low energy consistently follows under-eating — ${confirmed.length} confirmed instances in the last 2 weeks`,
    confidence: Math.min(0.88, 0.52 + confirmed.length * 0.12),
    evidence: confirmed.map(s => {
      const idx = recent.indexOf(s);
      const prev = recent[idx - 1];
      return `${s.date} low energy ← ${prev.date} was ${prev.caloriesEaten} cal`;
    }),
    lastObserved: confirmed[confirmed.length - 1].date,
  };
}

function detectWorkoutConsistency(
  last7: DailySnapshot[],
  _recent: DailySnapshot[],
  all: DailySnapshot[]
): BehavioralPattern | null {
  if (all.length < 7) return null;

  const workoutDays = last7.filter(s => s.workoutLogged).length;

  if (workoutDays <= 1) {
    return {
      pattern: `Only ${workoutDays} workout${workoutDays === 1 ? "" : "s"} logged in the last 7 days — training consistency is the biggest gap`,
      confidence: 0.85,
      evidence: last7.map(
        s => `${s.date}: ${s.workoutLogged ? `workout (${s.workoutIntensity ?? "logged"})` : "no workout"}`
      ),
      lastObserved: last7[last7.length - 1].date,
    };
  }

  // 4+ is a real streak for founders with busy schedules
  if (workoutDays >= 4) {
    return {
      pattern: `Solid training consistency — ${workoutDays}/7 days with workouts this week`,
      confidence: Math.min(0.92, 0.72 + workoutDays * 0.04),
      evidence: last7
        .filter(s => s.workoutLogged)
        .map(s => `${s.date}: ${s.workoutIntensity ?? "workout"}`),
      lastObserved: last7[last7.length - 1].date,
    };
  }

  return null;
}

function detectWorkoutEnergyLink(
  _last7: DailySnapshot[],
  recent: DailySnapshot[]
): BehavioralPattern | null {
  const energyScore = (level: DailySnapshot["energyLevel"]) =>
    level === "high" ? 2 : level === "medium" ? 1 : 0;

  const workoutDaysWithEnergy = recent.filter(
    s => s.workoutLogged && s.energyLevel != null
  );
  const noWorkoutDaysWithEnergy = recent.filter(
    s => !s.workoutLogged && s.energyLevel != null
  );

  // Need enough data points on both sides
  if (workoutDaysWithEnergy.length < 2 || noWorkoutDaysWithEnergy.length < 2) return null;

  const workoutAvg =
    workoutDaysWithEnergy.reduce((s, d) => s + energyScore(d.energyLevel), 0) /
    workoutDaysWithEnergy.length;
  const noWorkoutAvg =
    noWorkoutDaysWithEnergy.reduce((s, d) => s + energyScore(d.energyLevel), 0) /
    noWorkoutDaysWithEnergy.length;

  // Only fire if the difference is meaningful (>= 0.6 on a 0–2 scale)
  if (workoutAvg - noWorkoutAvg < 0.6) return null;

  const energyLabel = (score: number) =>
    score >= 1.7 ? "high" : score >= 1.0 ? "medium" : "low";

  return {
    pattern: `Energy is reliably higher on workout days — ${energyLabel(workoutAvg)} avg on workout days vs ${energyLabel(noWorkoutAvg)} on rest days across ${workoutDaysWithEnergy.length + noWorkoutDaysWithEnergy.length} data points`,
    confidence: Math.min(0.84, 0.5 + workoutDaysWithEnergy.length * 0.08 + (workoutAvg - noWorkoutAvg) * 0.1),
    evidence: [
      ...workoutDaysWithEnergy.map(s => `${s.date}: workout + ${s.energyLevel} energy`),
      ...noWorkoutDaysWithEnergy.map(s => `${s.date}: no workout + ${s.energyLevel} energy`),
    ],
    lastObserved: recent[recent.length - 1].date,
  };
}

function detectWeekendCalorieShift(
  _last7: DailySnapshot[],
  recent: DailySnapshot[]
): BehavioralPattern | null {
  const weekendDays = recent.filter(
    s => s.dayOfWeek === "Saturday" || s.dayOfWeek === "Sunday"
  );
  const weekdayDays = recent.filter(
    s => !["Saturday", "Sunday"].includes(s.dayOfWeek) && s.foodLogCount > 0
  );

  if (weekendDays.length < 2 || weekdayDays.length < 4) return null;

  const wkendAvg =
    weekendDays.reduce((s, d) => s + d.caloriesEaten, 0) / weekendDays.length;
  const wkdayAvg =
    weekdayDays.reduce((s, d) => s + d.caloriesEaten, 0) / weekdayDays.length;

  const diff = Math.abs(wkendAvg - wkdayAvg);
  if (diff < 280) return null;

  const direction = wkendAvg > wkdayAvg ? "higher" : "lower";
  const cause =
    direction === "lower"
      ? "Weekend structure is weaker — routine breaks and intake drops"
      : "Weekend intake spikes — likely eating out or untracked";

  return {
    pattern: `Calories run ${Math.round(diff)} ${direction} on weekends vs weekdays. ${cause}`,
    confidence: 0.72,
    evidence: [
      `Weekend avg: ${Math.round(wkendAvg)} cal/day`,
      `Weekday avg: ${Math.round(wkdayAvg)} cal/day`,
    ],
    lastObserved: recent[recent.length - 1].date,
  };
}

function detectLoggingDrift(last7: DailySnapshot[]): BehavioralPattern | null {
  const loggedDays = last7.filter(s => s.foodLogCount > 0).length;
  if (loggedDays > 4) return null; // not a problem

  return {
    pattern: `Food logged only ${loggedDays}/7 days this week — tracking gaps make pattern detection blind and goal math unreliable`,
    confidence: 0.82,
    evidence: last7.map(
      s =>
        `${s.date}: ${s.foodLogCount > 0 ? `${s.foodLogCount} log entry(s)` : "not tracked"}`
    ),
    lastObserved: last7[last7.length - 1].date,
  };
}

function detectMomentumDirection(
  _last7: DailySnapshot[],
  recent: DailySnapshot[]
): BehavioralPattern | null {
  if (recent.length < 5) return null;

  const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
  const secondHalf = recent.slice(Math.floor(recent.length / 2));

  const firstLogged = firstHalf.filter(s => s.foodLogCount > 0);
  const secondLogged = secondHalf.filter(s => s.foodLogCount > 0);

  if (firstLogged.length === 0 || secondLogged.length === 0) return null;

  const firstAvg =
    firstLogged.reduce((s, d) => s + d.caloriesEaten, 0) / firstLogged.length;
  const secondAvg =
    secondLogged.reduce((s, d) => s + d.caloriesEaten, 0) / secondLogged.length;

  const delta = secondAvg - firstAvg;
  if (Math.abs(delta) < 150) return null; // not a meaningful shift

  // Express direction relative to target, not absolute direction
  const target = recent[0]?.calorieTarget ?? 2100;
  const firstDistance = Math.abs(firstAvg - target);
  const secondDistance = Math.abs(secondAvg - target);
  const movingTowardTarget = secondDistance < firstDistance;

  const message = movingTowardTarget
    ? `Calorie consistency is tightening — avg ${Math.round(firstAvg)} cal/day earlier vs ${Math.round(secondAvg)} recently (target ${target})`
    : `Calorie intake is drifting ${delta > 0 ? "above" : "below"} target — avg ${Math.round(firstAvg)} earlier vs ${Math.round(secondAvg)} more recently (target ${target})`;

  return {
    pattern: message,
    confidence: 0.62,
    evidence: [
      `Earlier period avg: ${Math.round(firstAvg)} cal`,
      `Recent period avg: ${Math.round(secondAvg)} cal`,
      `Target: ${target} cal/day`,
    ],
    lastObserved: recent[recent.length - 1].date,
  };
}
