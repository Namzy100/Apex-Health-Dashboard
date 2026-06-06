"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApex } from "@/lib/store";
import type { EnergyLevel } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";
import { deriveOperatingMode, deriveRisk, deriveTodaysMove } from "@/lib/apex/operating-mode";
import { getMockBrief } from "@/lib/apex/prompts";
import EnergySelector from "@/components/today/EnergySelector";
import Onboarding from "@/components/Onboarding";
import { generateCandidateInsights } from "@/lib/apex/learning-engine";

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning${name ? ", " + name : ""}.`;
  if (h < 17) return `Good afternoon${name ? ", " + name : ""}.`;
  return `Good evening${name ? ", " + name : ""}.`;
}

// ─── Why line derivation for focus items ─────────────────────────────────────

import type { ApexContext } from "@/lib/apex/context-builder";

function getFocusItemWhy(item: string, ctx: ApexContext): string | null {
  const t = item.toLowerCase();
  const hasTrainingStreak = ctx.behavioral.patterns.some(p =>
    p.pattern.toLowerCase().includes("training") || p.pattern.toLowerCase().includes("workout")
  );
  const hasEnergyWorkoutLink = ctx.behavioral.patterns.some(p =>
    p.pattern.toLowerCase().includes("energy") && p.pattern.toLowerCase().includes("workout")
  );

  if (t.includes("gym") || t.includes("workout") || t.includes("training") || t.includes("lift")) {
    if (hasEnergyWorkoutLink) return "You perform better on days you train — this compounds.";
    if (hasTrainingStreak) return "Protecting this streak is what's keeping your energy stable.";
    return "Movement is one of the highest-leverage inputs for energy and focus.";
  }
  if (t.includes("eat") || t.includes("cal") || t.includes("nutrition") || t.includes("protein")) {
    return "Fueling properly prevents the afternoon energy collapse that cuts output short.";
  }
  if (t.includes("spend") || t.includes("budget") || t.includes("no non-essential")) {
    return "Intentional spending compounds. Small decisions set the pattern.";
  }
  if (t.includes("block") || t.includes("deep work") || t.includes("focus") || t.includes("90 min")) {
    return "Your best work happens in protected blocks — not in the gaps between meetings.";
  }
  if (ctx.user.goals.length > 0) {
    const goalMatch = ctx.user.goals.find(g =>
      g.toLowerCase().split(" ").some(w => w.length > 4 && t.includes(w.toLowerCase()))
    );
    if (goalMatch) return `This directly advances: ${goalMatch.slice(0, 60)}.`;
  }
  return null;
}

// ─── Focus item ────────────────────────────────────────────────────────────────

function FocusItem({ text, why, index }: { text: string; why?: string | null; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.07, duration: 0.4 }}
      style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "11px 0" }}
    >
      <span
        className="font-label"
        style={{ fontSize: 10, letterSpacing: "0.05em", color: "rgba(245,158,11,0.5)", paddingTop: 4, flexShrink: 0, width: 16, textAlign: "right" }}
      >
        {index + 1}
      </span>
      <div>
        <p className="font-body" style={{ fontSize: 15, lineHeight: 1.5, color: "#e3e2e7", letterSpacing: "-0.005em" }}>
          {text}
        </p>
        {why && (
          <p className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.42)", marginTop: 3, lineHeight: 1.45 }}>
            {why}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { state, dispatch } = useApex();
  const router = useRouter();
  const hasFetchedBrief = useRef(false);

  // ── Brief fetch ───────────────────────────────────────────────────────────
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
            text: data.text ?? data.brief,   // standardized — `text` is primary
            anchors: data.anchors,
            chips: data.chips,
            generatedAt: new Date().toISOString(),
            risk: data.risk,
            todaysMove: data.todaysMove,
            todaysMoveWhy: data.todaysMoveWhy,
            focusItems: data.focusItems,
            tonightRec: Array.isArray(data.tonightRec)
              ? data.tonightRec.join(". ")   // graceful compat
              : data.tonightRec,
          },
        });
      }
    } catch { /* keep existing */ }
  }, [state, dispatch]);

  useEffect(() => {
    if (hasFetchedBrief.current) return;
    const generated = state.brief.generatedAt
      ? new Date(state.brief.generatedAt).getTime()
      : 0;
    if (Date.now() - generated > 30 * 60 * 1000) {
      hasFetchedBrief.current = true;
      fetchBrief();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────
  const ctx = buildContext(state);
  const modeData = deriveOperatingMode(ctx);
  const mock = getMockBrief(ctx);

  const briefText    = state.brief.text         || mock.text;

  // Derive a "based on past decisions" callout
  const allInsights = [
    ...(state.profile.learnedInsights || []),
    ...generateCandidateInsights(
      state.recentDecisions || [],
      state.profile.dismissedInsights || [],
      state.profile.learnedInsights || [],
    ),
  ];
  const pastDecisionNote: string | null = (() => {
    if (allInsights.length > 0) return allInsights[allInsights.length - 1];
    const resolved = (state.recentDecisions || []).filter(d => d.outcome);
    if (resolved.length < 2) return null;
    const recentWorked = resolved.slice(0, 5).filter(d => d.outcome === "worked").length;
    if (recentWorked >= 3) return `${recentWorked} of your last ${Math.min(5, resolved.length)} decisions have worked out well. You're making good calls.`;
    return null;
  })();
  const todaysMove   = state.brief.todaysMove   || deriveTodaysMove(ctx);
  const todaysMoveWhy = state.brief.todaysMoveWhy || mock.todaysMoveWhy;
  const focusItems   = state.brief.focusItems   || mock.focusItems;
  const tonightRec   = state.brief.tonightRec   || mock.tonightRec;
  const risk         = state.brief.risk         || deriveRisk(ctx);

  const handleEnergy = (level: EnergyLevel) => dispatch({ type: "SET_ENERGY", level });

  // Show onboarding when user has insufficient personalization context.
  // Do NOT rely solely on isOnboarded — check actual profile completeness.
  const needsOnboarding =
    (state.profile.goals || []).length === 0 ||
    (!state.isOnboarded && !state.profile.decisionStyle);

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return (
    <div
      className="relative min-h-dvh font-body overflow-x-hidden"
      style={{ background: "#060606" }}
    >
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none atmospheric-glow" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 560,
          margin: "0 auto",
          padding: "60px 24px 132px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Wordmark + settings ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", opacity: 0.6 }}>
            APEX
          </span>
          <button
            onClick={() => router.push("/settings")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(216,195,173,0.28)", padding: 4 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
          </button>
        </div>

        {/* ── Operating mode ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(44px, 12vw, 64px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: modeData.color,
              textShadow: `0 0 50px ${modeData.glowColor}`,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {modeData.mode}
          </h1>
          <div style={{ height: 2, width: 20, background: "#f59e0b", borderRadius: 999, margin: "0 auto 6px", opacity: 0.5, filter: "blur(0.5px)" }} />
          <p className="font-label" style={{ fontSize: 11, letterSpacing: "0.05em", color: "rgba(216,195,173,0.42)" }}>
            {modeData.subtitle}
          </p>
        </div>

        {/* ── Energy selector ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, justifyContent: "center" }}>
          <span className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(216,195,173,0.28)" }}>
            ENERGY
          </span>
          <EnergySelector value={state.today.energyLevel} onChange={handleEnergy} />
        </div>

        {/* ── Greeting + context ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p className="font-display" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.025em", color: "#e3e2e7", marginBottom: 10 }}>
            {getGreeting(state.profile.name)}
          </p>
          <p className="font-body" style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(216,195,173,0.65)", letterSpacing: "-0.005em" }}>
            {briefText}
          </p>
        </div>

        {/* ── Based on past decisions ──────────────────────────────────────── */}
        {pastDecisionNote && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            style={{
              borderRadius: 10,
              padding: "11px 14px",
              marginBottom: 20,
              background: "rgba(46,204,113,0.04)",
              border: "1px solid rgba(46,204,113,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "rgba(46,204,113,0.6)", flexShrink: 0 }}>
              history
            </span>
            <p className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.55)", lineHeight: 1.5 }}>
              <span style={{ color: "rgba(46,204,113,0.7)", fontFamily: "var(--font-mono, monospace)", fontSize: 10, letterSpacing: "0.06em" }}>BASED ON PAST DECISIONS · </span>
              {pastDecisionNote}
            </p>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TODAY'S MOST IMPORTANT MOVE — hero section                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          style={{
            borderRadius: 16,
            padding: "22px 20px",
            marginBottom: 24,
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.18)",
          }}
        >
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.12em", color: "#f59e0b", marginBottom: 12 }}>
            TODAY&apos;S MOST IMPORTANT MOVE
          </p>
          <p
            className="font-display"
            style={{
              fontSize: "clamp(18px, 4.5vw, 22px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "#e3e2e7",
              lineHeight: 1.3,
              marginBottom: 12,
            }}
          >
            {todaysMove}
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(245,158,11,0.5)", flexShrink: 0, marginTop: 1 }}>
              arrow_right
            </span>
            <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.6)", lineHeight: 1.55 }}>
              {todaysMoveWhy}
            </p>
          </div>
        </motion.div>

        {/* ── TODAY'S FOCUS — top 3 priorities ────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(216,195,173,0.35)", marginBottom: 4 }}>
            TODAY&apos;S FOCUS
          </p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 4 }}>
            {focusItems.slice(0, 3).map((item, i) => (
              <FocusItem key={i} text={item} why={getFocusItemWhy(item, ctx)} index={i} />
            ))}
          </div>
        </div>

        {/* ── TONIGHT ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(216,195,173,0.35)", flexShrink: 0 }}>
            bedtime
          </span>
          <div>
            <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(216,195,173,0.3)", marginBottom: 3 }}>
              TONIGHT
            </p>
            <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.62)", lineHeight: 1.5 }}>
              {tonightRec}
            </p>
          </div>
        </motion.div>

        {/* ── RISK TO WATCH ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          style={{
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 32,
            background: "rgba(255,92,92,0.04)",
            border: "1px solid rgba(255,92,92,0.16)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 15, color: "#ff5c5c", fontVariationSettings: "'FILL' 1", flexShrink: 0, marginTop: 1 }}
          >
            warning
          </span>
          <div>
            <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "#ff5c5c", marginBottom: 3 }}>
              RISK TO WATCH
            </p>
            <p className="font-body" style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(216,195,173,0.7)" }}>
              {risk}
            </p>
          </div>
        </motion.div>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.72, duration: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/command")}
          style={{
            background: "#f59e0b",
            color: "#1a0e00",
            padding: "15px 36px",
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--font-display, sans-serif)",
            letterSpacing: "-0.01em",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 28px rgba(245,158,11,0.24)",
            alignSelf: "center",
            marginBottom: 28,
          }}
        >
          Ask Apex about a decision
        </motion.button>

        {/* ── Anchors ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {state.brief.anchors.map((anchor, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(245,158,11,0.28)", flexShrink: 0, marginTop: 8 }} />
              <span className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.32)", lineHeight: 1.5 }}>
                {anchor}
              </span>
            </div>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { hasFetchedBrief.current = false; fetchBrief(); }}
          style={{
            marginTop: 20,
            background: "none",
            border: "none",
            color: "rgba(216,195,173,0.18)",
            fontSize: 10,
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.08em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            alignSelf: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>refresh</span>
          REFRESH BRIEF
        </button>
      </motion.div>
    </div>
  );
}
