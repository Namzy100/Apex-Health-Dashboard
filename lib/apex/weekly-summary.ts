// ─── Weekly summary compression ───────────────────────────────────────────────
//
// Converts last 7 DailySnapshots into a token-efficient summary string for
// prompt injection. Goal: give Claude the shape of the week without dumping
// raw log data.

import type { DailySnapshot } from "./memory";

export function buildWeeklySummary(snapshots: DailySnapshot[]): string {
  const last7 = snapshots.slice(-7);
  if (last7.length === 0) return "No historical data yet.";

  const loggedDays = last7.filter(s => s.foodLogCount > 0);
  const unloggedDays = last7.length - loggedDays.length;

  // Calorie stats
  const avgCal =
    loggedDays.length > 0
      ? Math.round(
          loggedDays.reduce((s, d) => s + d.caloriesEaten, 0) / loggedDays.length
        )
      : 0;

  // Protein stats
  const proteinHitDays = loggedDays.filter(
    s => s.proteinEaten >= s.proteinTarget * 0.9
  ).length;

  // Workout stats
  const workoutDays = last7.filter(s => s.workoutLogged).length;

  // Energy distribution
  const energyCounts: Record<string, number> = { low: 0, medium: 0, high: 0 };
  last7.forEach(s => {
    if (s.energyLevel) energyCounts[s.energyLevel]++;
  });
  const energyTotal = Object.values(energyCounts).reduce((a, b) => a + b, 0);

  const parts: string[] = [];

  const target = last7[0]?.calorieTarget ?? 2100;
  if (loggedDays.length > 0) {
    const defOrSurp = avgCal < target
      ? `${target - avgCal} under target`
      : `on target`;
    parts.push(
      `Avg ${avgCal} cal/day over ${loggedDays.length} tracked days (${defOrSurp})`
    );
    parts.push(`Protein hit ${proteinHitDays}/${loggedDays.length} days`);
  } else {
    parts.push("No food logged this week");
  }

  if (unloggedDays > 0) {
    parts.push(`${unloggedDays} day${unloggedDays > 1 ? "s" : ""} untracked`);
  }

  parts.push(`Workouts: ${workoutDays}/7`);

  if (energyTotal > 0) {
    const energyStr = Object.entries(energyCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k} ×${v}`)
      .join(", ");
    parts.push(`Energy: ${energyStr}`);
  }

  return parts.join(" · ");
}
