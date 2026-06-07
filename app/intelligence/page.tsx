"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useApex } from "@/lib/store";
import type { DecisionRecord, DecisionOutcome } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";
import type { BehavioralPattern } from "@/lib/apex/memory";
import {
  generateCandidateInsights,
  computeDecisionStats,
  getPendingFollowUps,
} from "@/lib/apex/learning-engine";

// ─── Pattern → insight ────────────────────────────────────────────────────────

function patternToInsight(p: BehavioralPattern): string | null {
  const t = p.pattern.toLowerCase();
  if (t.includes("energy") && (t.includes("workout") || t.includes("higher")))
    return "You perform better on days you train.";
  if (t.includes("solid training") || (t.includes("workout") && t.includes("consistency")))
    return "You show up for training when you protect the slot in advance.";
  if (t.includes("under-eat") && t.includes("energy"))
    return "Your energy collapses in the afternoon when you under-eat.";
  if (t.includes("under-eat"))
    return "You tend to under-eat during high-work periods — output suffers within 24 hours.";
  if (t.includes("protein"))
    return "You consistently miss your protein target — recovery and focus take a hit.";
  if (t.includes("weekend"))
    return "Your weekdays are more productive than your weekends. Structure is your edge.";
  if (t.includes("log") && t.includes("only"))
    return "You track inconsistently. Apex can only surface patterns when data exists.";
  return null;
}

// ─── Interactive insight ──────────────────────────────────────────────────────

function InsightCard({ text, confidence, index, isGenerated = false, onConfirm, onDismiss }: {
  text: string; confidence?: number; index: number;
  isGenerated?: boolean; onConfirm: (t: string) => void; onDismiss: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ delay: 0.04 + index * 0.03, duration: 0.2 }}
      style={{ marginBottom: 24 }}
    >
      {editing ? (
        <div>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8,
              padding: "10px 12px", color: "#e3e2e7", fontSize: 15,
              lineHeight: 1.5, fontFamily: "var(--font-body, sans-serif)",
              outline: "none", resize: "none", minHeight: 72, marginBottom: 8,
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onConfirm(editText.trim()); setGone(true); }} style={{ padding: "4px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", color: "#f59e0b", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>SAVE</button>
            <button onClick={() => { setEditText(text); setEditing(false); }} style={{ padding: "4px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(216,195,173,0.3)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>CANCEL</button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-body" style={{ fontSize: 16, color: "#e3e2e7", lineHeight: 1.65, letterSpacing: "-0.008em", marginBottom: 10, fontStyle: isGenerated ? "italic" : "normal" }}>
            {text}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {confidence !== undefined && (
              <span className="font-label" style={{ fontSize: 9, letterSpacing: "0.05em", color: "rgba(216,195,173,0.18)", marginRight: 2 }}>
                {Math.round(confidence * 100)}%
              </span>
            )}
            <button onClick={() => { onConfirm(text); setGone(true); }} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 10px", borderRadius: 999, border: "1px solid rgba(46,204,113,0.16)", background: "rgba(46,204,113,0.04)", color: "#2ecc71", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 10 }}>check</span>CONFIRM
            </button>
            <button onClick={() => setEditing(true)} style={{ padding: "2px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "rgba(216,195,173,0.3)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>EDIT</button>
            <button onClick={() => { onDismiss(text); setGone(true); }} style={{ padding: "2px 10px", borderRadius: 999, border: "1px solid rgba(255,92,92,0.08)", background: "transparent", color: "rgba(255,92,92,0.25)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>DISMISS</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Follow-up card ───────────────────────────────────────────────────────────

function FollowUpCard({ record, onSubmit }: {
  record: DecisionRecord;
  onSubmit: (id: string, outcome: DecisionOutcome, reflection?: string) => void;
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<DecisionOutcome | null>(null);
  const [reflection, setReflection] = useState("");
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return null;

  const daysAgo = Math.round((Date.now() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const OUTCOMES: { value: DecisionOutcome; label: string; color: string }[] = [
    { value: "worked", label: "Worked", color: "#2ecc71" },
    { value: "mixed", label: "Mixed", color: "#ffc174" },
    { value: "did_not_work", label: "Didn't work", color: "#ff5c5c" },
  ];

  return (
    <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(216,195,173,0.25)", marginBottom: 8 }}>
        {daysAgo === 1 ? "YESTERDAY" : `${daysAgo} DAYS AGO`}{record.category ? ` · ${record.category.toUpperCase()}` : ""}
      </p>
      <p className="font-display" style={{ fontSize: 16, fontWeight: 600, color: "#e3e2e7", lineHeight: 1.4, marginBottom: 16, letterSpacing: "-0.01em" }}>
        → {record.recommendation.slice(0, 90)}{record.recommendation.length > 90 ? "…" : ""}
      </p>
      {!selectedOutcome ? (
        <div style={{ display: "flex", gap: 8 }}>
          {OUTCOMES.map(o => (
            <button key={o.value} onClick={() => setSelectedOutcome(o.value)} style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: `1px solid ${o.color}18`, background: `${o.color}06`, color: o.color, fontSize: 12, fontFamily: "var(--font-body, sans-serif)", cursor: "pointer" }}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ color: OUTCOMES.find(o => o.value === selectedOutcome)!.color, fontSize: 13 }}>{OUTCOMES.find(o => o.value === selectedOutcome)!.label}</span>
            <button onClick={() => setSelectedOutcome(null)} style={{ background: "none", border: "none", color: "rgba(216,195,173,0.25)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.05em", cursor: "pointer" }}>CHANGE</button>
          </div>
          <input value={reflection} onChange={e => setReflection(e.target.value)} placeholder="Add a reflection (optional)…" style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", color: "#e3e2e7", fontSize: 13, fontFamily: "var(--font-body, sans-serif)", outline: "none", marginBottom: 10 }} />
          <button onClick={() => { onSubmit(record.id, selectedOutcome!, reflection || undefined); setSubmitted(true); }} style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 13, fontFamily: "var(--font-body, sans-serif)", cursor: "pointer" }}>
            Save outcome
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MePage() {
  const { state, dispatch } = useApex();
  const router = useRouter();
  const ctx = buildContext(state);
  const { patterns, daysOfData } = ctx.behavioral;
  const profile = state.profile;
  const decisions = state.recentDecisions || [];

  const stats = computeDecisionStats(decisions);
  const pendingFollowUps = getPendingFollowUps(decisions);
  const dismissed = new Set(profile.dismissedInsights || []);
  const confirmed = new Set(profile.learnedInsights || []);

  const detectedInsights = patterns
    .map(p => ({ text: patternToInsight(p), confidence: p.confidence }))
    .filter((i): i is { text: string; confidence: number } =>
      i.text !== null && !dismissed.has(i.text) && !confirmed.has(i.text)
    );

  const generatedInsights = generateCandidateInsights(
    decisions,
    profile.dismissedInsights || [],
    profile.learnedInsights || [],
  );

  useEffect(() => {
    if (generatedInsights.length > 0) {
      dispatch({ type: "ADD_GENERATED_INSIGHTS", insights: generatedInsights });
    }
  }, [generatedInsights.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmedInsights = profile.learnedInsights || [];
  const hasGoals = (profile.goals || []).length > 0;

  // Narrative intelligence summary
  const intelligenceSummary = (() => {
    if (stats.total === 0 && confirmedInsights.length === 0 && daysOfData < 3) {
      return "Apex is building your profile. Keep logging and reviewing decisions — patterns emerge with consistent data.";
    }
    const parts: string[] = [];
    if (stats.resolved >= 3) {
      parts.push(`Of ${stats.resolved} reviewed decision${stats.resolved !== 1 ? "s" : ""}, ${stats.worked} worked well.`);
      if (stats.successRate >= 70) parts.push("The trend is positive.");
      else if (stats.successRate < 50) parts.push("Mixed results — Apex needs more context to improve.");
    } else if (stats.total > 0) {
      parts.push(`${stats.total} decision${stats.total !== 1 ? "s" : ""} saved — review them in the Me tab to unlock learning.`);
    }
    if (confirmedInsights.length > 0) {
      parts.push(`${confirmedInsights.length} behavioral pattern${confirmedInsights.length !== 1 ? "s" : ""} confirmed.`);
    }
    if (daysOfData >= 3) {
      parts.push("Apex has begun recognizing repeat behavior.");
    }
    return parts.join(" ") || "Apex is calibrating.";
  })();

  // Open loops
  const openLoops: string[] = [];
  if (!profile.productiveWindows?.length) openLoops.push("when you do your best work");
  if (!profile.derailers?.length) openLoops.push("what usually derails your week");
  if (daysOfData < 3) openLoops.push("your behavioral patterns");
  if (stats.resolved < 5) openLoops.push("how your decisions tend to play out");

  const decisionStyleLabels: Record<string, string> = {
    direct: "Direct", balanced: "Balanced", gentle: "Gentle", brutally_honest: "Brutally honest",
  };

  // Background word based on learning stage
  const backgroundWord = stats.total >= 15 ? "GROWING"
    : confirmedInsights.length > 0 ? "LEARNING"
    : "BUILDING";

  return (
    <div className="font-body" style={{ background: "#060606", minHeight: "100dvh", overflow: "hidden", position: "relative" }}>

      {/* ── Background identity word ─────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="font-display"
        style={{
          position: "absolute",
          top: "2%",
          right: "-10%",
          fontSize: "clamp(110px, 38vw, 260px)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          color: "rgba(255,255,255,0.022)",
          pointerEvents: "none",
          userSelect: "none",
          lineHeight: 1,
          zIndex: 0,
          whiteSpace: "nowrap",
        }}
      >
        {backgroundWord}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "56px 24px 120px" }}>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* IDENTITY HERO                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ marginBottom: 60 }}
        >
          {/* The name — massive, identity-first */}
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(60px, 17vw, 88px)",
              fontWeight: 800,
              letterSpacing: "-0.05em",
              color: "#e3e2e7",
              lineHeight: 0.88,
              marginBottom: 20,
            }}
          >
            {profile.name ? profile.name.toUpperCase() + "." : "YOU."}
          </h1>

          {/* Identity statement */}
          <div style={{ paddingLeft: 4 }}>
            <p className="font-body" style={{ fontSize: 16, color: "rgba(216,195,173,0.5)", lineHeight: 1.6, marginBottom: 4 }}>
              Builder.
            </p>
            <p className="font-body" style={{ fontSize: 16, color: "rgba(216,195,173,0.4)", lineHeight: 1.6, marginBottom: 16 }}>
              Learning through action.
            </p>

            {hasGoals && (
              <div>
                <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(216,195,173,0.22)", marginBottom: 10 }}>
                  OPTIMIZING FOR
                </p>
                {profile.goals.slice(0, 2).map((goal, i) => (
                  <p key={i} className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.55)", lineHeight: 1.5, marginBottom: 4, letterSpacing: "-0.005em" }}>
                    {goal}
                  </p>
                ))}
              </div>
            )}

            {!hasGoals && (
              <button
                onClick={() => router.push("/settings")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.28)", lineHeight: 1.5 }}>
                  Tell Apex what you&apos;re optimizing for. →
                </p>
              </button>
            )}
          </div>
        </motion.section>

        {/* ── Apex intelligence — narrative ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.2 }}
          style={{
            marginBottom: 52,
            paddingBottom: 28,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.22)", marginBottom: 12 }}>
            APEX INTELLIGENCE
          </p>
          <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.5)", lineHeight: 1.75 }}>
            {intelligenceSummary}
          </p>
          {profile.decisionStyle && (
            <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.32)", marginTop: 8 }}>
              Advice style: {decisionStyleLabels[profile.decisionStyle] || "Direct"}.{" "}
              <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", color: "rgba(245,158,11,0.35)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Change</button>
            </p>
          )}
        </motion.div>

        {/* ── Decisions awaiting review ────────────────────────────────────── */}
        {pendingFollowUps.length > 0 && (
          <div style={{ marginBottom: 52 }}>
            <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(245,158,11,0.4)", marginBottom: 20 }}>
              DECISIONS AWAITING REVIEW
            </p>
            {pendingFollowUps.map(record => (
              <FollowUpCard
                key={record.id}
                record={record}
                onSubmit={(id, outcome, reflection) =>
                  dispatch({ type: "SET_DECISION_OUTCOME", id, outcome, reflection })
                }
              />
            ))}
          </div>
        )}

        {/* ── What Apex knows ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 52 }}>
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.22)", marginBottom: 20 }}>
            WHAT APEX KNOWS
          </p>

          {/* Confirmed — large, prominent, editorial */}
          {confirmedInsights.length > 0 && (
            <div style={{ marginBottom: confirmedInsights.length > 0 && (detectedInsights.length > 0) ? 28 : 0 }}>
              {confirmedInsights.map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.04 + i * 0.04, duration: 0.2 }}
                  style={{
                    marginBottom: 24,
                    paddingLeft: 16,
                    borderLeft: "2px solid rgba(46,204,113,0.25)",
                  }}
                >
                  <p className="font-display" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em", color: "#e3e2e7", lineHeight: 1.45, marginBottom: 5 }}>
                    {text}
                  </p>
                  <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(46,204,113,0.42)" }}>CONFIRMED</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Detected — interactive */}
          <AnimatePresence>
            {detectedInsights.map((insight, i) => (
              <InsightCard
                key={insight.text}
                text={insight.text}
                confidence={insight.confidence}
                index={i}
                onConfirm={text => dispatch({ type: "CONFIRM_INSIGHT", insight: text })}
                onDismiss={text => dispatch({ type: "DISMISS_INSIGHT", insight: text })}
              />
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {confirmedInsights.length === 0 && detectedInsights.length === 0 && generatedInsights.length === 0 && (
            <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.3)", lineHeight: 1.7 }}>
              Apex is building your behavioral profile. Review saved decisions, log consistently, and patterns will surface.
            </p>
          )}
        </div>

        {/* ── New patterns noticed ─────────────────────────────────────────── */}
        {generatedInsights.length > 0 && (
          <div style={{ marginBottom: 52 }}>
            <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(245,158,11,0.35)", marginBottom: 8 }}>
              NEW PATTERNS NOTICED
            </p>
            <p className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.3)", lineHeight: 1.55, marginBottom: 20 }}>
              Based on your decision outcomes. Confirm what feels accurate.
            </p>
            <AnimatePresence>
              {generatedInsights.map((insight, i) => (
                <InsightCard
                  key={insight}
                  text={insight}
                  index={i}
                  isGenerated={true}
                  onConfirm={text => dispatch({ type: "CONFIRM_INSIGHT", insight: text })}
                  onDismiss={text => dispatch({ type: "DISMISS_INSIGHT", insight: text })}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── What Apex is still learning ─────────────────────────────────── */}
        {openLoops.length > 0 && (
          <div style={{ marginBottom: 52 }}>
            <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.22)", marginBottom: 16 }}>
              STILL LEARNING
            </p>
            {openLoops.map((loop, i) => (
              <p key={i} className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.35)", lineHeight: 1.6, marginBottom: 8 }}>
                · {loop}
              </p>
            ))}
            <button
              onClick={() => router.push("/settings")}
              style={{ marginTop: 8, background: "none", border: "none", color: "rgba(245,158,11,0.32)", fontSize: 11, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}
            >
              Tell Apex →
            </button>
          </div>
        )}

        {/* ── Goals ───────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.22)" }}>GOALS</p>
            <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", color: "rgba(245,158,11,0.32)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>EDIT</button>
          </div>
          {hasGoals ? profile.goals.map((goal, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: i < profile.goals.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(245,158,11,0.3)", flexShrink: 0, marginTop: 2 }}>radio_button_unchecked</span>
              <p className="font-body" style={{ fontSize: 15, color: "#e3e2e7", lineHeight: 1.5, letterSpacing: "-0.005em" }}>{goal}</p>
            </div>
          )) : (
            <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
              <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.28)" }}>Add your goals so Apex can align every recommendation. →</p>
            </button>
          )}
        </div>

        {/* ── Outcomes — narrative ─────────────────────────────────────────── */}
        {decisions.length > 0 && (
          <div style={{ marginBottom: 52 }}>
            <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.22)", marginBottom: 16 }}>
              OUTCOMES
            </p>
            {stats.resolved > 0 ? (
              <div>
                <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.5)", lineHeight: 1.75, marginBottom: 20 }}>
                  Of {stats.resolved} reviewed decision{stats.resolved !== 1 ? "s" : ""}
                  {stats.worked > 0 && `, ${stats.worked} worked${stats.mixed > 0 ? `, ${stats.mixed} were mixed` : ""}${stats.didNotWork > 0 ? `, ${stats.didNotWork} didn't` : ""}`}.
                  {stats.successRate >= 70 ? " The trend is positive." : stats.successRate >= 50 ? " Results are mixed." : " More context needed."}
                </p>
                <div style={{ display: "flex", gap: "8px 32px", flexWrap: "wrap" }}>
                  {[
                    { label: "WORKED", value: stats.worked, color: "#2ecc71" },
                    { label: "MIXED", value: stats.mixed, color: "#ffc174" },
                    { label: "DIDN'T", value: stats.didNotWork, color: "#ff5c5c" },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(216,195,173,0.2)", marginBottom: 3 }}>{item.label}</p>
                      <p className="font-display" style={{ fontSize: 28, fontWeight: 800, color: item.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.3)", lineHeight: 1.7 }}>
                Save decisions in the Apex tab, then review them here to unlock learning.
              </p>
            )}
          </div>
        )}

        {/* ── Recent decisions ─────────────────────────────────────────────── */}
        {decisions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.22)", marginBottom: 16 }}>
              DECISIONS
            </p>
            {decisions.slice(0, 10).map((record) => {
              const outcomeColors: Record<string, string> = { worked: "#2ecc71", mixed: "#ffc174", did_not_work: "#ff5c5c" };
              const outcomeLabels: Record<string, string> = { worked: "Worked", mixed: "Mixed", did_not_work: "Didn't" };
              const date = new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <div key={record.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.35)", lineHeight: 1.35, marginBottom: 2 }}>
                      {record.question.slice(0, 58)}{record.question.length > 58 ? "…" : ""}
                    </p>
                    <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7", lineHeight: 1.35 }}>
                      → {record.recommendation.slice(0, 58)}{record.recommendation.length > 58 ? "…" : ""}
                    </p>
                    {record.reflection && (
                      <p className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.28)", marginTop: 3, fontStyle: "italic" }}>
                        &ldquo;{record.reflection.slice(0, 50)}&rdquo;
                      </p>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: 44 }}>
                    <p className="font-label" style={{ fontSize: 9, color: "rgba(216,195,173,0.18)", marginBottom: 3 }}>{date}</p>
                    {record.outcome ? (
                      <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.04em", color: outcomeColors[record.outcome] || "rgba(216,195,173,0.35)" }}>
                        {outcomeLabels[record.outcome] || record.outcome}
                      </p>
                    ) : (
                      <p className="font-label" style={{ fontSize: 9, color: "rgba(216,195,173,0.15)" }}>pending</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <button onClick={() => router.push("/settings")} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(216,195,173,0.16)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer", margin: "0 auto" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>settings</span>
          EDIT PROFILE
        </button>
      </div>
    </div>
  );
}
