"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApex } from "@/lib/store";
import type { EnergyLevel } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";
import { deriveOperatingMode, deriveRisk, deriveTodaysMove } from "@/lib/apex/operating-mode";
import { getMockBrief } from "@/lib/apex/prompts";
import { generateCandidateInsights } from "@/lib/apex/learning-engine";
import EnergySelector from "@/components/today/EnergySelector";
import Onboarding from "@/components/Onboarding";
import type { ApexContext } from "@/lib/apex/context-builder";

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning${name ? ", " + name : ""}.`;
  if (h < 17) return `Good afternoon${name ? ", " + name : ""}.`;
  return `Good evening${name ? ", " + name : ""}.`;
}

function getFocusItemWhy(item: string, ctx: ApexContext): string | null {
  const t = item.toLowerCase();
  const hasEnergyWorkoutLink = ctx.behavioral.patterns.some(p =>
    p.pattern.toLowerCase().includes("energy") && p.pattern.toLowerCase().includes("workout")
  );
  const hasTrainingStreak = ctx.behavioral.patterns.some(p =>
    p.pattern.toLowerCase().includes("training") || p.pattern.toLowerCase().includes("workout")
  );
  if (t.includes("gym") || t.includes("workout") || t.includes("training") || t.includes("lift")) {
    if (hasEnergyWorkoutLink) return "You perform better on days you train.";
    if (hasTrainingStreak) return "Protecting this streak keeps your energy stable.";
    return "Movement is the highest-leverage energy input.";
  }
  if (t.includes("eat") || t.includes("cal") || t.includes("nutrition") || t.includes("protein")) {
    return "Fueling properly prevents the afternoon energy collapse.";
  }
  if (t.includes("block") || t.includes("deep work") || t.includes("90 min")) {
    return "Your best work happens in protected blocks.";
  }
  if (ctx.user.goals.length > 0) {
    const match = ctx.user.goals.find(g =>
      g.toLowerCase().split(" ").some(w => w.length > 4 && t.includes(w.toLowerCase()))
    );
    if (match) return `Advances: ${match.slice(0, 50)}.`;
  }
  return null;
}

export default function TodayPage() {
  const { state, dispatch } = useApex();
  const router = useRouter();
  const hasFetchedBrief = useRef(false);

  const fetchBrief = useCallback(async () => {
    try {
      const ctx = buildContext(state);
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctx }),
      });
      if (res.ok) {
        const data = await res.json();
        dispatch({
          type: "SET_BRIEF",
          brief: {
            text: data.text ?? data.brief,
            anchors: data.anchors,
            chips: data.chips,
            generatedAt: new Date().toISOString(),
            risk: data.risk,
            todaysMove: data.todaysMove,
            todaysMoveWhy: data.todaysMoveWhy,
            focusItems: data.focusItems,
            tonightRec: Array.isArray(data.tonightRec) ? data.tonightRec.join(". ") : data.tonightRec,
          },
        });
      }
    } catch { /* keep existing */ }
  }, [state, dispatch]);

  useEffect(() => {
    if (hasFetchedBrief.current) return;
    const generated = state.brief.generatedAt ? new Date(state.brief.generatedAt).getTime() : 0;
    if (Date.now() - generated > 30 * 60 * 1000) {
      hasFetchedBrief.current = true;
      fetchBrief();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = buildContext(state);
  const modeData = deriveOperatingMode(ctx);
  const mock = getMockBrief(ctx);
  const briefText     = state.brief.text         || mock.text;
  const todaysMove    = state.brief.todaysMove    || deriveTodaysMove(ctx);
  const todaysMoveWhy = state.brief.todaysMoveWhy || mock.todaysMoveWhy;
  const focusItems    = state.brief.focusItems    || mock.focusItems;
  const tonightRec    = state.brief.tonightRec    || mock.tonightRec;
  const risk          = state.brief.risk          || deriveRisk(ctx);
  const handleEnergy  = (level: EnergyLevel) => dispatch({ type: "SET_ENERGY", level });

  const allInsights = [
    ...(state.profile.learnedInsights || []),
    ...generateCandidateInsights(
      state.recentDecisions || [],
      state.profile.dismissedInsights || [],
      state.profile.learnedInsights || [],
    ),
  ];
  const resolved = (state.recentDecisions || []).filter(d => d.outcome);
  const pastDecisionNote: string | null = (() => {
    if (allInsights.length > 0) return allInsights[allInsights.length - 1];
    if (resolved.length < 2) return null;
    const recentWorked = resolved.slice(0, 5).filter(d => d.outcome === "worked").length;
    if (recentWorked >= 3) return `${recentWorked} of your last ${Math.min(5, resolved.length)} decisions worked well.`;
    return null;
  })();

  const needsOnboarding =
    (state.profile.goals || []).length === 0 ||
    (!state.isOnboarded && !state.profile.decisionStyle);
  if (needsOnboarding) return <Onboarding />;

  return (
    <div
      className="relative min-h-dvh font-body"
      style={{ background: "#060606", overflow: "hidden" }}
    >
      {/* ── Atmospheric glow ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none atmospheric-glow" style={{ zIndex: 0 }} />

      {/* ── Background identity word ─────────────────────────────────────── */}
      {/* The operating mode echoed behind content — editorial depth layer  */}
      <div
        aria-hidden="true"
        className="font-display"
        style={{
          position: "absolute",
          top: "2%",
          right: "-12%",
          fontSize: "clamp(100px, 38vw, 240px)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          color: modeData.color,
          opacity: 0.025,
          pointerEvents: "none",
          userSelect: "none",
          lineHeight: 1,
          zIndex: 0,
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {modeData.mode.split(" ")[0]}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 520,
          margin: "0 auto",
          padding: "56px 24px 140px",
        }}
      >
        {/* Wordmark + settings */}
        <div style={{ marginBottom: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", opacity: 0.55 }}>
            APEX
          </span>
          <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(216,195,173,0.2)", padding: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>settings</span>
          </button>
        </div>

        {/* ── Identity hero — operating mode ───────────────────────────── */}
        <div style={{ marginBottom: 52 }}>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(56px, 16vw, 80px)",
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 0.92,
              color: modeData.color,
              textShadow: `0 0 60px ${modeData.glowColor}`,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {modeData.mode}
          </h1>
          <p className="font-label" style={{ fontSize: 11, letterSpacing: "0.05em", color: "rgba(216,195,173,0.35)" }}>
            {modeData.subtitle}
          </p>
        </div>

        {/* Energy + greeting */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            <span className="font-label" style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(216,195,173,0.2)" }}>ENERGY</span>
            <EnergySelector value={state.today.energyLevel} onChange={handleEnergy} />
          </div>
          <p className="font-display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "#e3e2e7", marginBottom: 12 }}>
            {getGreeting(state.profile.name)}
          </p>
          <p className="font-body" style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(216,195,173,0.58)", letterSpacing: "-0.005em" }}>
            {briefText}
          </p>
        </div>

        {/* Memory callout */}
        {pastDecisionNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            style={{ marginBottom: 52, paddingLeft: 14, borderLeft: "2px solid rgba(46,204,113,0.2)" }}
          >
            <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(46,204,113,0.4)", marginBottom: 6 }}>
              MEMORY · {resolved.length} DECISION{resolved.length !== 1 ? "S" : ""} REVIEWED
            </p>
            <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.48)", lineHeight: 1.6, fontStyle: "italic" }}>
              &ldquo;{pastDecisionNote}&rdquo;
            </p>
          </motion.div>
        )}

        {/* ── THE MOVE ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.2 }}
          style={{ marginBottom: 52 }}
        >
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(245,158,11,0.45)", marginBottom: 18 }}>
            THE MOVE
          </p>
          <p
            className="font-display"
            style={{
              fontSize: "clamp(26px, 6.5vw, 34px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#e3e2e7",
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            {todaysMove}
          </p>
          <p className="font-body" style={{ fontSize: 14, color: "rgba(216,195,173,0.45)", lineHeight: 1.6 }}>
            {todaysMoveWhy}
          </p>
        </motion.div>

        {/* ── FOCUS ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 52 }}>
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.25)", marginBottom: 20 }}>
            FOCUS
          </p>
          {focusItems.slice(0, 3).map((item, i) => {
            const why = getFocusItemWhy(item, ctx);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.04, duration: 0.2 }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 18,
                  paddingBottom: 18,
                  marginBottom: 18,
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <span className="font-label" style={{ fontSize: 10, letterSpacing: "0.04em", color: "rgba(245,158,11,0.35)", paddingTop: 3, flexShrink: 0, width: 18, textAlign: "right" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-body" style={{ fontSize: 16, color: "#e3e2e7", lineHeight: 1.45, letterSpacing: "-0.005em" }}>{item}</p>
                  {why && <p className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.35)", marginTop: 4, lineHeight: 1.5 }}>{why}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── TONIGHT ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.2 }}
          style={{ marginBottom: 32 }}
        >
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.25)", marginBottom: 10 }}>
            TONIGHT
          </p>
          <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.58)", lineHeight: 1.65 }}>
            {tonightRec}
          </p>
        </motion.div>

        {/* ── RISK ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16, duration: 0.2 }}
          style={{ marginBottom: 60 }}
        >
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(255,92,92,0.4)", marginBottom: 10 }}>
            RISK
          </p>
          <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.52)", lineHeight: 1.65 }}>
            {risk}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/command")}
          style={{
            background: "#f59e0b",
            color: "#1a0e00",
            padding: "15px 36px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "var(--font-display, sans-serif)",
            letterSpacing: "-0.01em",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(245,158,11,0.18)",
            display: "block",
            margin: "0 auto 36px",
          }}
        >
          Ask Apex about a decision
        </motion.button>

        {/* Anchors */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {state.brief.anchors.map((anchor, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(245,158,11,0.2)", flexShrink: 0, marginTop: 8 }} />
              <span className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.24)", lineHeight: 1.5 }}>{anchor}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { hasFetchedBrief.current = false; fetchBrief(); }}
          style={{ marginTop: 24, background: "none", border: "none", color: "rgba(216,195,173,0.14)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "24px auto 0" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 10 }}>refresh</span>
          REFRESH
        </button>
      </motion.div>
    </div>
  );
}
