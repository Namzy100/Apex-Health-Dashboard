// ─── Behavioral memory types and snapshot builder ─────────────────────────────
//
// DailySnapshot is a compressed daily record persisted in ApexState.dailyHistory.
// buildSnapshot() takes plain primitives — no store imports, no circular deps.

export interface DailySnapshot {
  date: string;             // "2026-05-27"
  dayOfWeek: string;        // "Monday"
  caloriesEaten: number;
  calorieTarget: number;
  proteinEaten: number;
  proteinTarget: number;
  workoutLogged: boolean;
  workoutIntensity?: "light" | "moderate" | "hard";
  energyLevel?: "low" | "medium" | "high";
  steps: number;
  stepTarget: number;
  foodLogCount: number;     // 0 means day was not tracked
}

export interface BehavioralPattern {
  pattern: string;          // human-readable observation
  confidence: number;       // 0.0 – 1.0
  evidence: string[];       // data points supporting the pattern
  lastObserved: string;     // ISO date of most recent evidence
}

// ─── Snapshot builder ─────────────────────────────────────────────────────────

export interface SnapshotParams {
  date: string;
  calorieTarget: number;
  proteinTarget: number;
  stepTarget: number;
  caloriesEaten: number;
  proteinEaten: number;
  workoutLogged: boolean;
  workoutIntensity?: "light" | "moderate" | "hard";
  energyLevel?: "low" | "medium" | "high";
  steps: number;
  foodLogCount: number;
}

export function buildSnapshot(p: SnapshotParams): DailySnapshot {
  const dayOfWeek = new Date(p.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
  });
  return {
    date: p.date,
    dayOfWeek,
    caloriesEaten: p.caloriesEaten,
    calorieTarget: p.calorieTarget,
    proteinEaten: p.proteinEaten,
    proteinTarget: p.proteinTarget,
    workoutLogged: p.workoutLogged,
    workoutIntensity: p.workoutIntensity,
    energyLevel: p.energyLevel,
    steps: p.steps,
    stepTarget: p.stepTarget,
    foodLogCount: p.foodLogCount,
  };
}
