"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApex } from "@/lib/store";
import { buildContext, type ApexContext } from "@/lib/apex/context-builder";
import type { BehavioralPattern } from "@/lib/apex/memory";

// ─── Pattern enrichment ────────────────────────────────────────────────────────
// Maps detected pattern strings to human-readable "why it matters" and recommendations.

function getPatternContext(p: BehavioralPattern): {
  title: string;
  whyItMatters: string;
  recommendation: string;
} {
  const text = p.pattern.toLowerCase();

  if (text.includes("under-eat") && text.includes("energy")) {
    return {
      title: "Under-eating is collapsing afternoon energy.",
      whyItMatters:
        "Chronic calorie deficit depletes cognitive reserves fast. On under-fueled days your focus collapses before 3 PM — the exact window that matters for deep work.",
      recommendation:
        "Eat to target for 5 consecutive days. That's the minimum dose needed to break the energy loop.",
    };
  }
  if (text.includes("under-eat")) {
    return {
      title: "Consistent calorie deficit is the pattern.",
      whyItMatters:
        "Sustained under-eating suppresses metabolic rate and dopamine synthesis. Your output variance traces back here more than any other variable.",
      recommendation:
        "Prioritize hitting target — even at the expense of 'clean' eating. Calories in are more important right now than food quality.",
    };
  }
  if (text.includes("protein target missed") || text.includes("protein miss")) {
    return {
      title: "Protein target missed most days.",
      whyItMatters:
        "Protein shortfalls slow recovery between training sessions and reduce amino acid availability for neurotransmitter synthesis. Focus quality degrades within 48 hours.",
      recommendation:
        "Front-load 40g protein before 10 AM. That single move closes most of the daily deficit.",
    };
  }
  if (text.includes("energy") && (text.includes("workout") || text.includes("higher"))) {
    return {
      title: "Energy is reliably higher on training days.",
      whyItMatters:
        "Movement activates prefrontal cortex function and elevates BDNF. Your best decision-making and creative output consistently follows training — not coincidence.",
      recommendation:
        "Schedule workouts before your first meeting. Your focus window opens wider on days you've moved.",
    };
  }
  if (text.includes("solid training") || (text.includes("workout") && text.includes("consistency"))) {
    return {
      title: "Training consistency is intact.",
      whyItMatters:
        "Consistent training builds baseline energy capacity, not just fitness. Missing this streak compresses your effective working day for the next 48 hours.",
      recommendation:
        "Protect this streak. Book the next 3 workout slots before the calendar fills.",
    };
  }
  if (text.includes("weekend")) {
    return {
      title: "Weekend routine is disrupting the week.",
      whyItMatters:
        "Structural breaks on weekends bleed into Monday and Tuesday. The recovery period costs approximately 1.5 productive days each week — a compounding tax.",
      recommendation:
        "Build two minimal anchors into weekends: same wake time, one meal prep. These two constraints prevent most of the drift.",
    };
  }
  if (text.includes("log") && text.includes("only")) {
    return {
      title: "Tracking gaps are limiting pattern quality.",
      whyItMatters:
        "Without consistent data, Apex is operating with significant blind spots. Pattern confidence degrades below 60% after 3 unlogged days.",
      recommendation:
        "Log every meal this week. Partial data (even rough estimates) is significantly better than none.",
    };
  }
  if (text.includes("tightening")) {
    return {
      title: "Calorie consistency is improving.",
      whyItMatters:
        "Calorie consistency is the most controllable performance variable. As it tightens, day-to-day output variance shrinks.",
      recommendation:
        "Keep this trajectory for 10 more days to build a reliable baseline.",
    };
  }
  if (text.includes("drifting above") || text.includes("drifting")) {
    return {
      title: "Calorie intake is drifting from target.",
      whyItMatters:
        "Calorie drift signals structural breakdown. It usually precedes broader habit drift across sleep, training, and focus within 5-7 days.",
      recommendation:
        "Re-establish tracking discipline now. The drift is early-stage and reversible today.",
    };
  }
  // Generic
  return {
    title: p.pattern.replace(/^[a-z]/, (c) => c.toUpperCase()),
    whyItMatters:
      "This pattern affects your baseline performance. Consistent attention to it compounds over time.",
    recommendation:
      "Monitor for 5 more days to increase confidence before making structural changes.",
  };
}

// ─── Pattern card ──────────────────────────────────────────────────────────────

function PatternCard({
  pattern,
  large = false,
  index,
}: {
  pattern: BehavioralPattern;
  large?: boolean;
  index: number;
}) {
  const ctx = getPatternContext(pattern);
  const isHigh = pattern.confidence >= 0.78;
  const pct = Math.round(pattern.confidence * 100);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.5 }}
      className="glass-edge"
      style={{
        borderRadius: 16,
        padding: large ? "28px 28px" : "22px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span className={isHigh ? "badge-high" : "badge-emerging"}>
          {isHigh ? "High Confidence" : "Emerging Pattern"}
        </span>
        <span
          className="font-label"
          style={{ fontSize: 10, color: "rgba(216,195,173,0.3)", letterSpacing: "0.05em" }}
        >
          {pct}%
        </span>
      </div>

      {/* Observation */}
      <p
        className="font-label"
        style={{ fontSize: 10, letterSpacing: "0.1em", color: "#f59e0b", marginBottom: 8 }}
      >
        OBSERVATION
      </p>
      <h3
        className="font-display"
        style={{
          fontSize: large ? 22 : 18,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#e3e2e7",
          lineHeight: 1.3,
          marginBottom: 20,
        }}
      >
        {ctx.title}
      </h3>

      {/* Why it matters */}
      <p
        className="font-label"
        style={{ fontSize: 10, letterSpacing: "0.1em", color: "#f59e0b", marginBottom: 8 }}
      >
        WHY IT MATTERS
      </p>
      <p
        className="font-body"
        style={{
          fontSize: large ? 15 : 14,
          lineHeight: 1.7,
          color: "rgba(216,195,173,0.72)",
          marginBottom: 24,
        }}
      >
        {ctx.whyItMatters}
      </p>

      {/* Recommendation */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 16,
          marginTop: "auto",
        }}
      >
        <p
          className="font-label"
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "rgba(216,195,173,0.4)",
            marginBottom: 8,
          }}
        >
          RECOMMENDATION
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p
            className="font-display"
            style={{
              fontSize: large ? 17 : 15,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "#e3e2e7",
              lineHeight: 1.4,
            }}
          >
            {ctx.recommendation}
          </p>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: "#f59e0b", flexShrink: 0 }}
          >
            trending_flat
          </span>
        </div>
      </div>

      {/* Evidence count */}
      <p
        className="font-label"
        style={{
          fontSize: 10,
          letterSpacing: "0.05em",
          color: "rgba(216,195,173,0.25)",
          marginTop: 12,
        }}
      >
        {pattern.evidence.length} data point{pattern.evidence.length !== 1 ? "s" : ""} · last observed {pattern.lastObserved}
      </p>
    </motion.article>
  );
}

// ─── Current Reading (shown before patterns are available) ────────────────────
// Rich context view that shows today's real data and what's needed to unlock
// full pattern detection. No fake insights.

function CurrentReading({ ctx, daysOfData, dispatch }: {
  ctx: ApexContext;
  daysOfData: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (action: any) => void;
}) {
  const router = useRouter();
  const daysNeeded = Math.max(0, 3 - daysOfData);
  const calLeft = ctx.user.calorieTarget - ctx.today.caloriesEaten;

  // Build what-to-do-next items
  const nextSteps: { icon: string; text: string; action?: () => void }[] = [];
  if (!ctx.today.hasLoggedFood) {
    nextSteps.push({
      icon: "restaurant",
      text: "Log a meal to start your nutrition baseline",
      action: () => dispatch({ type: "OPEN_LOG_SHEET", tab: "meal" }),
    });
  }
  if (!ctx.today.energyLevel) {
    nextSteps.push({
      icon: "bolt",
      text: "Set your energy level on the Brief tab",
      action: () => router.push("/"),
    });
  }
  if (!ctx.today.workoutLogged) {
    nextSteps.push({
      icon: "fitness_center",
      text: "Log a workout to track training patterns",
      action: () => dispatch({ type: "OPEN_LOG_SHEET", tab: "workout" }),
    });
  }
  if (!ctx.today.hasLoggedWeight) {
    nextSteps.push({
      icon: "monitor_weight",
      text: "Log weight for body composition tracking",
      action: () => dispatch({ type: "OPEN_LOG_SHEET", tab: "weight" }),
    });
  }
  if (!ctx.user.topPriority) {
    nextSteps.push({
      icon: "flag",
      text: "Set your top priority in Settings",
      action: () => router.push("/settings"),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Progress tracker */}
      <div
        className="glass-card"
        style={{ borderRadius: 14, padding: "18px 18px", marginBottom: 20 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "#f59e0b" }}>
            CALIBRATION PROGRESS
          </p>
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(216,195,173,0.4)" }}>
            {daysOfData}/3 DAYS
          </p>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
          <div style={{
            height: "100%",
            width: `${Math.min(100, (daysOfData / 3) * 100)}%`,
            background: "linear-gradient(90deg, #f59e0b, #ffc174)",
            borderRadius: 999,
            transition: "width 0.6s ease",
          }} />
        </div>
        <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.5)", lineHeight: 1.5 }}>
          {daysNeeded > 0
            ? `${daysNeeded} more day${daysNeeded !== 1 ? "s" : ""} of logged data needed to surface behavioral patterns.`
            : "Enough data to start detecting patterns. Keep logging."}
        </p>
      </div>

      {/* Current Reading — what Apex sees right now */}
      <div style={{ marginBottom: 20 }}>
        <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(216,195,173,0.4)", marginBottom: 14 }}>
          CURRENT READING
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Goal */}
          <div className="glass-card" style={{ borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b", flexShrink: 0, marginTop: 1 }}>flag</span>
            <div>
              <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(216,195,173,0.4)", marginBottom: 4 }}>CURRENT MISSION</p>
              <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7", lineHeight: 1.5 }}>
                {ctx.user.goal || "No goal set — add one in Settings"}
              </p>
            </div>
          </div>

          {/* Energy */}
          <div className="glass-card" style={{ borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: ctx.today.energyLevel === "high" ? "#2ecc71" : ctx.today.energyLevel === "low" ? "#ff5c5c" : "#f59e0b", flexShrink: 0, marginTop: 1 }}>bolt</span>
            <div>
              <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(216,195,173,0.4)", marginBottom: 4 }}>TODAY&apos;S ENERGY</p>
              <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7" }}>
                {ctx.today.energyLevel
                  ? ctx.today.energyLevel.charAt(0).toUpperCase() + ctx.today.energyLevel.slice(1)
                  : "Not set yet"}
              </p>
            </div>
          </div>

          {/* Nutrition */}
          <div className="glass-card" style={{ borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b", flexShrink: 0, marginTop: 1 }}>restaurant</span>
            <div>
              <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(216,195,173,0.4)", marginBottom: 4 }}>TODAY&apos;S NUTRITION</p>
              <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7" }}>
                {ctx.today.hasLoggedFood
                  ? `${ctx.today.caloriesEaten} cal · ${ctx.today.proteinEaten}g protein · ${calLeft > 0 ? `${calLeft} cal remaining` : "Target hit"}`
                  : "Nothing logged yet today"}
              </p>
            </div>
          </div>

          {/* Training */}
          <div className="glass-card" style={{ borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: ctx.today.workoutLogged ? "#2ecc71" : "rgba(216,195,173,0.3)", flexShrink: 0, marginTop: 1 }}>fitness_center</span>
            <div>
              <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(216,195,173,0.4)", marginBottom: 4 }}>TODAY&apos;S TRAINING</p>
              <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7" }}>
                {ctx.today.workoutLogged
                  ? ctx.today.workoutDetails || "Workout logged"
                  : "No workout logged yet"}
              </p>
            </div>
          </div>

          {/* Weight */}
          {ctx.recent.currentWeight && (
            <div className="glass-card" style={{ borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b", flexShrink: 0, marginTop: 1 }}>monitor_weight</span>
              <div>
                <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(216,195,173,0.4)", marginBottom: 4 }}>CURRENT WEIGHT</p>
                <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7" }}>
                  {ctx.recent.currentWeight} lbs{ctx.recent.weightTrend ? ` · ${ctx.recent.weightTrend}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Top priority */}
          {ctx.user.topPriority && (
            <div className="glass-card" style={{ borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#f59e0b", flexShrink: 0, marginTop: 1 }}>priority_high</span>
              <div>
                <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(216,195,173,0.4)", marginBottom: 4 }}>TOP PRIORITY</p>
                <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7" }}>{ctx.user.topPriority}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* What Apex needs next */}
      {nextSteps.length > 0 && (
        <div>
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(216,195,173,0.4)", marginBottom: 14 }}>
            WHAT APEX NEEDS NEXT
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nextSteps.map((step, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.98 }}
                onClick={step.action}
                className="glass-card"
                style={{
                  borderRadius: 12,
                  padding: "13px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: step.action ? "pointer" : "default",
                  textAlign: "left",
                  width: "100%",
                  transition: "border-color 0.15s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "rgba(245,158,11,0.6)", flexShrink: 0 }}>
                  {step.icon}
                </span>
                <span className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.65)", lineHeight: 1.4, flex: 1 }}>
                  {step.text}
                </span>
                {step.action && (
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(245,158,11,0.4)", flexShrink: 0 }}>
                    arrow_forward
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Weekly summary bar ───────────────────────────────────────────────────────

function WeeklySummaryBar({ summary }: { summary: string }) {
  if (!summary || summary === "No historical data yet.") return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="glass-card"
      style={{
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 28,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 16, color: "#f59e0b", flexShrink: 0 }}
      >
        bar_chart_4_bars
      </span>
      <p
        className="font-label"
        style={{
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "rgba(216,195,173,0.6)",
          lineHeight: 1.5,
        }}
      >
        {summary}
      </p>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const { state, dispatch } = useApex();
  const ctx = buildContext(state);
  const { patterns, weeklySummary, daysOfData } = ctx.behavioral;

  const hasEnoughData = daysOfData >= 3 && patterns.length > 0;

  return (
    <div
      className="font-body"
      style={{ background: "#060606", minHeight: "100dvh" }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "72px 20px 120px",
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 40 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#f59e0b",
                animation: "pulse 2s infinite",
              }}
            />
            <p
              className="font-label"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "#f59e0b",
              }}
            >
              LIVE PATTERN SYNTHESIS
            </p>
          </div>

          <h2
            className="font-display"
            style={{
              fontSize: "clamp(36px, 9vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#e3e2e7",
              marginBottom: 14,
            }}
          >
            What Apex Knows
          </h2>

          <p
            className="font-body"
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: "rgba(216,195,173,0.6)",
              maxWidth: 480,
            }}
          >
            Behavioral patterns extracted from{" "}
            <span style={{ color: "#ffc174" }}>{daysOfData} day{daysOfData !== 1 ? "s" : ""}</span>{" "}
            of logged data. Higher confidence = more evidence.
          </p>
        </motion.section>

        {/* ── Weekly summary ───────────────────────────────────────────────── */}
        <WeeklySummaryBar summary={weeklySummary} />

        {/* ── Pattern cards or Current Reading ─────────────────────────────── */}
        {!hasEnoughData ? (
          <CurrentReading ctx={ctx} daysOfData={daysOfData} dispatch={dispatch} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {patterns.map((pattern, i) => (
              <PatternCard
                key={pattern.lastObserved + i}
                pattern={pattern}
                large={i === 0}
                index={i}
              />
            ))}
          </div>
        )}

        {/* ── Footer note ──────────────────────────────────────────────────── */}
        {hasEnoughData && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="font-label"
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "rgba(216,195,173,0.2)",
              textAlign: "center",
              marginTop: 32,
              lineHeight: 1.6,
            }}
          >
            Patterns update as new data is logged.
            <br />
            All insights derived from your logged history — no external data.
          </motion.p>
        )}
      </div>
    </div>
  );
}
