// ─── Operating mode derivation ────────────────────────────────────────────────
//
// Derives the user's current operating state from behavioral patterns and
// today's context. Returns display data for the Brief tab hero section.

import type { ApexContext } from "./context-builder";

export type OperatingMode =
  | "MOMENTUM"
  | "RECOVERY"
  | "LOCKED IN"
  | "DRIFTING"
  | "REBUILD MODE"
  | "SHARP"
  | "FRAGILE"
  | "BASELINE"
  | "CALIBRATING";

export interface ModeData {
  mode: OperatingMode;
  color: string;       // CSS color for the display text
  glowColor: string;   // rgba for text-shadow glow
  subtitle: string;    // brief one-liner under the mode
}

export function deriveOperatingMode(ctx: ApexContext): ModeData {
  const patterns = ctx.behavioral.patterns;
  const energy = ctx.today.energyLevel;
  const hasData = ctx.behavioral.daysOfData >= 3;

  // ── No history yet — honest baseline state ───────────────────────────────
  if (!hasData) {
    const daysLogged = ctx.behavioral.daysOfData;

    if (daysLogged === 0) {
      return {
        mode: "BASELINE",
        color: "#d8c3ad",
        glowColor: "rgba(216,195,173,0.2)",
        subtitle: "Apex is calibrating. Log one meal, one priority, and your energy today.",
      };
    }

    // 1–2 days of data — actively learning
    return {
      mode: "CALIBRATING",
      color: "#ffc174",
      glowColor: "rgba(245,158,11,0.2)",
      subtitle: `${3 - daysLogged} more day${3 - daysLogged !== 1 ? "s" : ""} of data needed to surface your first patterns.`,
    };
  }

  const topPattern = patterns[0];

  // ── Energy override — high confidence signals ──────────────────────────────
  if (!topPattern || topPattern.confidence < 0.65) {
    if (energy === "high") return { mode: "SHARP", color: "#ffc174", glowColor: "rgba(245,158,11,0.35)", subtitle: "Energy and focus are aligned." };
    if (energy === "low") return { mode: "FRAGILE", color: "#ffb4ab", glowColor: "rgba(255,92,92,0.3)", subtitle: "Protect your reserves today." };
    return { mode: "MOMENTUM", color: "#ffc174", glowColor: "rgba(245,158,11,0.35)", subtitle: "On track." };
  }

  const p = topPattern.pattern.toLowerCase();

  // ── Pattern-driven mode ────────────────────────────────────────────────────

  if (p.includes("solid training") || (p.includes("workout") && p.includes("consistency"))) {
    if (energy === "low") {
      return { mode: "RECOVERY", color: "#ffc174", glowColor: "rgba(245,158,11,0.25)", subtitle: "Training streak intact. Rest to maintain it." };
    }
    return { mode: "MOMENTUM", color: "#ffc174", glowColor: "rgba(245,158,11,0.4)", subtitle: "Training consistency is your edge." };
  }

  if (p.includes("energy") && (p.includes("workout") || p.includes("higher"))) {
    if (ctx.today.workoutLogged) {
      return { mode: "SHARP", color: "#ffc174", glowColor: "rgba(245,158,11,0.4)", subtitle: "Movement activated. Best window is open." };
    }
    return { mode: "MOMENTUM", color: "#ffc174", glowColor: "rgba(245,158,11,0.35)", subtitle: "Training is your performance multiplier." };
  }

  if (p.includes("under-eat")) {
    const hasEnergyLink = patterns.some(
      pat => pat.pattern.toLowerCase().includes("energy") && pat.pattern.toLowerCase().includes("follow")
    );
    if (hasEnergyLink || energy === "low") {
      return { mode: "RECOVERY", color: "#ffb4ab", glowColor: "rgba(255,92,92,0.3)", subtitle: "Fuel the system. Everything follows from that." };
    }
    return { mode: "DRIFTING", color: "#d8c3ad", glowColor: "rgba(216,195,173,0.2)", subtitle: "Consistent deficit is compressing your output." };
  }

  if (p.includes("log") && p.includes("only")) {
    return { mode: "REBUILD MODE", color: "#d8c3ad", glowColor: "rgba(216,195,173,0.2)", subtitle: "Data gaps limit what Apex can see. Track today." };
  }

  if (p.includes("weekend")) {
    if (ctx.today.dayOfWeek === "Monday") {
      return { mode: "RECOVERY", color: "#ffc174", glowColor: "rgba(245,158,11,0.25)", subtitle: "Rebuild the structure from this morning." };
    }
    return { mode: "DRIFTING", color: "#d8c3ad", glowColor: "rgba(216,195,173,0.2)", subtitle: "Weekend disruption is bleeding into the week." };
  }

  if (p.includes("protein")) {
    return { mode: "DRIFTING", color: "#d8c3ad", glowColor: "rgba(216,195,173,0.2)", subtitle: "Protein gap is the recurring bottleneck." };
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  if (energy === "high") return { mode: "SHARP", color: "#ffc174", glowColor: "rgba(245,158,11,0.4)", subtitle: "Energy and focus aligned." };
  if (energy === "low") return { mode: "FRAGILE", color: "#ffb4ab", glowColor: "rgba(255,92,92,0.3)", subtitle: "Recovery is the priority." };
  return { mode: "LOCKED IN", color: "#ffc174", glowColor: "rgba(245,158,11,0.35)", subtitle: "Execution mode." };
}

// ─── Risk derivation (fallback when API doesn't return one) ─────────────────

export function deriveRisk(ctx: ApexContext): string {
  const patterns = ctx.behavioral.patterns;
  const topPattern = patterns[0];

  if (!topPattern || ctx.behavioral.daysOfData < 3) {
    if (ctx.today.firstMeeting) {
      return `First meeting at ${ctx.today.firstMeeting} — don't let the day start with admin before you've done meaningful work.`;
    }
    return "Apex needs more data to detect real risks. Log today consistently to start pattern detection.";
  }

  const p = topPattern.pattern.toLowerCase();

  if (p.includes("under-eat") && p.includes("energy")) {
    return "Under-eating is collapsing your afternoon energy. The deficit will hit before 3 PM.";
  }
  if (p.includes("under-eat")) {
    return "Calorie deficit is running hot. Your focus reserves will burn out before end of day.";
  }
  if (p.includes("weekend")) {
    return "Weekend disruption is the recurring leak. Without Monday structure, the whole week drifts.";
  }
  if (p.includes("log")) {
    return "Tracking gaps mean Apex is operating blind. Pattern quality degrades without consistent data.";
  }
  if (p.includes("protein")) {
    return "Protein miss is slowing recovery between sessions. Cumulative debt will affect performance.";
  }
  if (ctx.today.firstMeeting) {
    return `Meetings could fragment your best hours. Protect the block before ${ctx.today.firstMeeting}.`;
  }
  return "Monitor closely. No critical risks detected today.";
}

// ─── Today's Move derivation (fallback) ──────────────────────────────────────

export function deriveTodaysMove(ctx: ApexContext): string {
  const calLeft = ctx.user.calorieTarget - ctx.today.caloriesEaten;
  const patterns = ctx.behavioral.patterns;
  const topPattern = patterns[0];

  // During baseline period — guide the user toward useful first actions
  if (ctx.behavioral.daysOfData < 3) {
    if (!ctx.today.hasLoggedFood) return "Log your first meal to start building your baseline.";
    if (!ctx.today.energyLevel) return "Set your energy level — Apex uses this to detect patterns.";
    if (!ctx.today.workoutLogged) return "Log a workout or movement session to complete today's picture.";
    return "Keep logging — patterns unlock after 3 days of data.";
  }

  if (!ctx.today.hasLoggedFood && calLeft > ctx.user.calorieTarget * 0.9) {
    return "Eat a real breakfast before you open the laptop.";
  }
  if (calLeft > 700) {
    return `Close the ${calLeft} cal gap — plan your next two meals right now.`;
  }
  if (!ctx.today.workoutLogged && ctx.behavioral.patterns.some(p => p.pattern.toLowerCase().includes("training"))) {
    return "Log the workout before the evening fills up.";
  }
  if (ctx.user.topPriority) {
    return `Lock 90 minutes on ${ctx.user.topPriority} before the day fragments.`;
  }
  if (topPattern) {
    const p = topPattern.pattern.toLowerCase();
    if (p.includes("under-eat")) return "Eat to target today. No exceptions.";
    if (p.includes("protein")) return "Front-load 40g protein at breakfast.";
    if (p.includes("workout")) return "Get the workout done before noon.";
  }
  return "Execute the one thing that moves the needle most today.";
}
