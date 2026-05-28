"use client";

import { motion } from "framer-motion";
import { useApex, useTodayMacros, useLatestWeight } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{label}</span>
      <div className="text-right">
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>{sub}</span>}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 4, marginTop: 28 }}>
      {String(children)}
    </p>
  );
}

export default function MePage() {
  const { state } = useApex();
  const macros = useTodayMacros();
  const latestWeight = useLatestWeight();
  const ctx = buildContext(state);
  const { profile } = state;

  const goalWeight = profile.goalWeight;
  const weightLost =
    latestWeight && profile.startWeight
      ? parseFloat((profile.startWeight - latestWeight).toFixed(1))
      : null;
  const weightRemaining =
    latestWeight && goalWeight
      ? parseFloat(Math.max(0, latestWeight - goalWeight).toFixed(1))
      : null;

  // Goal progress %
  const progressPct =
    profile.startWeight && goalWeight && latestWeight
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((profile.startWeight - latestWeight) /
                (profile.startWeight - goalWeight)) *
                100
            )
          )
        )
      : null;

  // Days to goal
  const daysToGoal = ctx.goals.daysToDeadline;

  return (
    <div className="max-w-lg mx-auto px-5 py-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "var(--amber)", marginBottom: 4 }}>
          APEX
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          {profile.name}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          {profile.goal || "No goal set yet."}
        </p>
      </motion.div>

      {/* Goal progress */}
      {progressPct !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 mb-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Goal Progress</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: "var(--amber)", letterSpacing: "-0.02em" }}>
              {progressPct}%
            </p>
          </div>
          {/* Progress bar */}
          <div className="rounded-full overflow-hidden h-1.5 mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: "linear-gradient(90deg, #f59e0b, #10b981)" }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Lost", value: weightLost !== null ? `${weightLost} lbs` : "—" },
              { label: "Remaining", value: weightRemaining !== null ? `${weightRemaining} lbs` : "—" },
              { label: "Days left", value: daysToGoal != null ? String(daysToGoal) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {value}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* This week */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <SectionLabel>THIS WEEK</SectionLabel>
        <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "0 16px", background: "var(--surface)" }}>
          <StatRow
            label="Calories today"
            value={macros.caloriesEaten > 0 ? `${macros.caloriesEaten.toLocaleString()} cal` : "—"}
            sub={macros.caloriesEaten > 0 ? `${macros.caloriesRemaining} left` : undefined}
          />
          <StatRow
            label="Protein today"
            value={macros.proteinEaten > 0 ? `${macros.proteinEaten}g` : "—"}
            sub={macros.proteinEaten > 0 ? `${macros.proteinRemaining.toFixed(0)}g remaining` : undefined}
          />
          <StatRow
            label="Steps today"
            value={state.today.steps > 0 ? state.today.steps.toLocaleString() : "—"}
            sub={state.today.steps > 0 ? `of ${state.profile.stepTarget.toLocaleString()}` : undefined}
          />
          <StatRow
            label="Energy logged"
            value={state.today.energyLevel ? state.today.energyLevel.charAt(0).toUpperCase() + state.today.energyLevel.slice(1) : "—"}
          />
          <StatRow
            label="Workout"
            value={state.today.workoutLog
              ? `${state.today.workoutLog.muscleGroup} · ${state.today.workoutLog.duration}min`
              : "—"}
          />
        </div>
      </motion.div>

      {/* Weight history */}
      {state.weightHistory.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <SectionLabel>WEIGHT</SectionLabel>
          <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "0 16px", background: "var(--surface)" }}>
            <StatRow label="Current" value={latestWeight ? `${latestWeight} lbs` : "—"} />
            {profile.startWeight && (
              <StatRow label="Started" value={`${profile.startWeight} lbs`} />
            )}
            {goalWeight && (
              <StatRow label="Goal" value={`${goalWeight} lbs`} />
            )}
            {ctx.goals.weeklyRateNeeded != null && (
              <StatRow
                label="Rate needed"
                value={`${ctx.goals.weeklyRateNeeded} lbs/wk`}
                sub={ctx.goals.onTrack ? "on track" : "behind pace"}
              />
            )}
          </div>
        </motion.div>
      )}

      {/* What Apex knows */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <SectionLabel>WHAT APEX KNOWS</SectionLabel>
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {[
            { key: "Goal", val: profile.goal },
            { key: "Calorie target", val: profile.calorieTarget ? `${profile.calorieTarget.toLocaleString()} kcal/day` : null },
            { key: "Protein target", val: profile.proteinTarget ? `${profile.proteinTarget}g/day` : null },
            { key: "Step target", val: profile.stepTarget ? `${profile.stepTarget.toLocaleString()} steps/day` : null },
            { key: "Top priority", val: profile.topPriority },
            { key: "First meeting", val: profile.firstMeeting },
          ]
            .filter(item => item.val)
            .map(({ key, val }) => (
              <div key={key} className="flex gap-3">
                <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 100, flexShrink: 0 }}>
                  {key}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {val}
                </span>
              </div>
            ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
          Update your profile in Settings. The more context you give Apex, the sharper your brief gets.
        </p>
      </motion.div>

      {/* Bottom padding */}
      <div style={{ height: 32 }} />
    </div>
  );
}
