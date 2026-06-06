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
  getDecisionIntelligenceStatus,
} from "@/lib/apex/learning-engine";

// ─── Pattern → insight ────────────────────────────────────────────────────────

function patternToInsight(p: BehavioralPattern): string | null {
  const t = p.pattern.toLowerCase();
  if (t.includes("energy") && (t.includes("workout") || t.includes("higher")))
    return "You perform better on days you train — movement is your most reliable energy lever.";
  if (t.includes("solid training") || (t.includes("workout") && t.includes("consistency")))
    return "You show up consistently for training when you block the slot in advance.";
  if (t.includes("under-eat") && t.includes("energy"))
    return "Your energy collapses in the afternoon when you under-eat. The two are directly linked.";
  if (t.includes("under-eat"))
    return "You tend to under-eat during high-work periods — your output suffers within 24 hours.";
  if (t.includes("protein"))
    return "You consistently miss your protein target. Recovery and focus both take a hit within 48 hours.";
  if (t.includes("weekend"))
    return "Your weekdays are more productive than your weekends — structure is your edge.";
  if (t.includes("log") && t.includes("only"))
    return "You track inconsistently. Apex can only surface patterns when data exists.";
  if (t.includes("tightening"))
    return "Your nutrition consistency is improving — a leading indicator of better energy.";
  return null;
}

// ─── Interactive insight card (confirm / edit / dismiss) ─────────────────────

function InsightCard({ text, confidence, index, isGenerated = false, onConfirm, onDismiss }: {
  text: string;
  confidence?: number;
  index: number;
  isGenerated?: boolean;
  onConfirm: (t: string) => void;
  onDismiss: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [gone, setGone] = useState(false);

  if (gone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden", marginBottom: 0 }}
      transition={{ delay: 0.05 + index * 0.05, duration: 0.4 }}
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        border: isGenerated ? "1px solid rgba(245,158,11,0.15)" : "1px solid rgba(255,255,255,0.07)",
        background: isGenerated ? "rgba(245,158,11,0.03)" : "rgba(255,255,255,0.02)",
        marginBottom: 8,
      }}
    >
      {editing ? (
        <div>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 8,
              padding: "8px 10px",
              color: "#e3e2e7",
              fontSize: 14,
              lineHeight: 1.5,
              fontFamily: "var(--font-body, sans-serif)",
              outline: "none",
              resize: "none",
              minHeight: 60,
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => { onConfirm(editText.trim()); setGone(true); }}
              style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", fontSize: 11, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}
            >
              SAVE
            </button>
            <button
              onClick={() => { setEditText(text); setEditing(false); }}
              style={{ padding: "5px 12px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(216,195,173,0.4)", fontSize: 11, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: isGenerated ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.4)", flexShrink: 0, marginTop: 2 }}>
            {isGenerated ? "auto_awesome" : "lightbulb"}
          </span>
          <div style={{ flex: 1 }}>
            <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7", lineHeight: 1.55 }}>{text}</p>
            <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
              <button onClick={() => { onConfirm(text); setGone(true); }}
                style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(46,204,113,0.2)", background: "rgba(46,204,113,0.06)", color: "#2ecc71", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>check</span>CONFIRM
              </button>
              <button onClick={() => setEditing(true)}
                style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(216,195,173,0.4)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>
                EDIT
              </button>
              <button onClick={() => { onDismiss(text); setGone(true); }}
                style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(255,92,92,0.12)", background: "transparent", color: "rgba(255,92,92,0.3)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>
                DISMISS
              </button>
            </div>
          </div>
          {confidence !== undefined && (
            <span className="font-label" style={{ fontSize: 10, color: "rgba(216,195,173,0.22)", flexShrink: 0 }}>
              {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Confirmed insight ────────────────────────────────────────────────────────

function ConfirmedInsight({ text, index }: { text: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.04 + index * 0.04 }}
      style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(46,204,113,0.18)", background: "rgba(46,204,113,0.04)", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#2ecc71", flexShrink: 0 }}>check_circle</span>
      <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7", lineHeight: 1.5 }}>{text}</p>
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

  const daysAgo = Math.round(
    (Date.now() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (submitted) return null;

  const OUTCOMES: { value: DecisionOutcome; label: string; color: string }[] = [
    { value: "worked",       label: "✓ Worked",      color: "#2ecc71" },
    { value: "mixed",        label: "~ Mixed",        color: "#ffc174" },
    { value: "did_not_work", label: "✗ Didn't work", color: "#ff5c5c" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ borderRadius: 14, padding: "16px", marginBottom: 10 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(245,158,11,0.5)" }}>schedule</span>
        <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(216,195,173,0.35)" }}>
          {daysAgo === 1 ? "YESTERDAY" : `${daysAgo} DAYS AGO`}
          {record.category ? ` · ${record.category.toUpperCase()}` : ""}
        </p>
      </div>
      <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.5)", marginBottom: 4, lineHeight: 1.4 }}>
        {record.question.slice(0, 80)}
      </p>
      <p className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "#e3e2e7", letterSpacing: "-0.01em", marginBottom: 14, lineHeight: 1.35 }}>
        → {record.recommendation.slice(0, 80)}
      </p>

      {!selectedOutcome ? (
        <div>
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(216,195,173,0.35)", marginBottom: 8 }}>HOW DID IT GO?</p>
          <div style={{ display: "flex", gap: 8 }}>
            {OUTCOMES.map(o => (
              <button
                key={o.value}
                onClick={() => setSelectedOutcome(o.value)}
                style={{
                  flex: 1,
                  padding: "9px 8px",
                  borderRadius: 10,
                  border: `1px solid ${o.color}22`,
                  background: `${o.color}08`,
                  color: o.color,
                  fontSize: 12,
                  fontFamily: "var(--font-body, sans-serif)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {OUTCOMES.find(o => o.value === selectedOutcome) && (
              <span style={{ color: OUTCOMES.find(o => o.value === selectedOutcome)!.color, fontSize: 13, fontFamily: "var(--font-body, sans-serif)" }}>
                {OUTCOMES.find(o => o.value === selectedOutcome)!.label}
              </span>
            )}
            <button
              onClick={() => setSelectedOutcome(null)}
              style={{ background: "none", border: "none", color: "rgba(216,195,173,0.3)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.05em", cursor: "pointer" }}
            >
              CHANGE
            </button>
          </div>
          <input
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            placeholder="Add a reflection (optional)..."
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: "9px 12px",
              color: "#e3e2e7",
              fontSize: 13,
              fontFamily: "var(--font-body, sans-serif)",
              outline: "none",
              marginBottom: 10,
            }}
          />
          <button
            onClick={() => {
              onSubmit(record.id, selectedOutcome!, reflection || undefined);
              setSubmitted(true);
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 10,
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#f59e0b",
              fontSize: 13,
              fontFamily: "var(--font-body, sans-serif)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Save Outcome
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Decision outcome stats ───────────────────────────────────────────────────

function DecisionOutcomeStats({ stats }: { stats: ReturnType<typeof computeDecisionStats> }) {
  const status = getDecisionIntelligenceStatus(stats.total);

  return (
    <div>
      {/* Empty state intelligence */}
      <div style={{ marginBottom: stats.resolved > 0 ? 14 : 0 }}>
        <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.45)", lineHeight: 1.55 }}>
          {status.detail}
        </p>
      </div>

      {stats.resolved > 0 && (
        <div
          className="glass-card"
          style={{ borderRadius: 12, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: "6px 20px" }}
        >
          <StatPill label="SAVED" value={stats.total} />
          <StatPill label="WORKED" value={stats.worked} color="#2ecc71" />
          <StatPill label="MIXED" value={stats.mixed} color="#ffc174" />
          <StatPill label="DIDN'T WORK" value={stats.didNotWork} color="#ff5c5c" />
          {stats.resolved >= 3 && (
            <StatPill
              label="SUCCESS RATE"
              value={`${stats.successRate}%`}
              color={stats.successRate >= 70 ? "#2ecc71" : stats.successRate >= 50 ? "#ffc174" : "#ff5c5c"}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(216,195,173,0.28)", marginBottom: 2 }}>{label}</p>
      <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: color || "#e3e2e7", letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

// ─── Recent decision row ──────────────────────────────────────────────────────

function RecentDecisionRow({ record, index }: { record: DecisionRecord; index: number }) {
  const date = new Date(record.createdAt);
  const dayLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const outcomeColors: Record<string, string> = {
    worked: "#2ecc71",
    mixed: "#ffc174",
    did_not_work: "#ff5c5c",
  };
  const outcomeLabels: Record<string, string> = {
    worked: "✓ Worked",
    mixed: "~ Mixed",
    did_not_work: "✗ Didn't work",
  };

  return (
    <div style={{ padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(245,158,11,0.3)", flexShrink: 0, marginTop: 2 }}>psychology</span>
      <div style={{ flex: 1 }}>
        <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.45)", lineHeight: 1.35, marginBottom: 2 }}>
          {record.question.slice(0, 70)}{record.question.length > 70 ? "…" : ""}
        </p>
        <p className="font-body" style={{ fontSize: 14, color: "#e3e2e7", lineHeight: 1.35 }}>
          → {record.recommendation.slice(0, 70)}{record.recommendation.length > 70 ? "…" : ""}
        </p>
        {record.reflection && (
          <p className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.35)", marginTop: 3, fontStyle: "italic" }}>
            &ldquo;{record.reflection.slice(0, 60)}&rdquo;
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.04em", color: "rgba(216,195,173,0.2)", marginBottom: 3 }}>
          {dayLabel}
        </p>
        {record.outcome && (
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.04em", color: outcomeColors[record.outcome] || "rgba(216,195,173,0.4)" }}>
            {outcomeLabels[record.outcome] || record.outcome}
          </p>
        )}
        {!record.outcome && (
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.04em", color: "rgba(216,195,173,0.2)" }}>PENDING</p>
        )}
      </div>
    </div>
  );
}

// ─── Learning card ────────────────────────────────────────────────────────────

function LearningCard({ text, action, actionLabel, index }: {
  text: string; action?: () => void; actionLabel?: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05 }}
      onClick={action}
      style={{
        padding: "12px 14px",
        borderRadius: 11,
        border: "1px dashed rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.01)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: action ? "pointer" : "default",
        marginBottom: 7,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(216,195,173,0.18)", flexShrink: 0 }}>pending</span>
      <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.42)", lineHeight: 1.5, flex: 1 }}>{text}</p>
      {action && <span className="font-label" style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(245,158,11,0.38)", flexShrink: 0 }}>{actionLabel || "ADD →"}</span>}
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(216,195,173,0.28)", marginBottom: 12 }}>
      {children}
    </p>
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

  // Compute all derived data
  const stats = computeDecisionStats(decisions);
  const pendingFollowUps = getPendingFollowUps(decisions);
  const dismissed = new Set(profile.dismissedInsights || []);
  const confirmed = new Set(profile.learnedInsights || []);

  // Detected insights from behavioral patterns
  const detectedInsights = patterns
    .map(p => ({ text: patternToInsight(p), confidence: p.confidence }))
    .filter((i): i is { text: string; confidence: number } =>
      i.text !== null && !dismissed.has(i.text) && !confirmed.has(i.text)
    );

  // Generated insights from learning engine
  const generatedInsights = generateCandidateInsights(
    decisions,
    profile.dismissedInsights || [],
    profile.learnedInsights || [],
  );

  // Auto-store generated insights to profile for context-builder access
  useEffect(() => {
    if (generatedInsights.length > 0) {
      dispatch({ type: "ADD_GENERATED_INSIGHTS", insights: generatedInsights });
    }
  }, [generatedInsights.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmedInsights = profile.learnedInsights || [];
  const hasGoals = (profile.goals || []).length > 0;
  const hasDerailers = (profile.derailers || []).length > 0;
  const hasProductiveWindow = (profile.productiveWindows || []).length > 0;

  const decisionStyleLabels: Record<string, string> = {
    direct: "Direct",
    balanced: "Balanced",
    gentle: "Gentle",
    brutally_honest: "Brutally honest",
  };

  // Learning prompts
  const learningPrompts: { text: string; action: () => void; label: string }[] = [];
  if (!hasGoals) learningPrompts.push({ text: "Tell Apex your top 3 goals for this month.", action: () => router.push("/settings"), label: "ADD →" });
  if (!hasDerailers) learningPrompts.push({ text: "Tell Apex what usually derails your day.", action: () => router.push("/settings"), label: "TELL APEX →" });
  if (!hasProductiveWindow) learningPrompts.push({ text: "Tell Apex when you usually do your best work.", action: () => router.push("/settings"), label: "TELL APEX →" });
  if (daysOfData < 3) learningPrompts.push({ text: "Log consistently for a few days to unlock behavioral pattern detection.", action: () => router.push("/"), label: "LOG TODAY →" });

  const showInsightEmptyState = detectedInsights.length === 0 && confirmedInsights.length === 0 && generatedInsights.length === 0;

  return (
    <div className="font-body" style={{ background: "#060606", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 20px 120px" }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 28 }}>
          <h2 className="font-display" style={{ fontSize: "clamp(32px, 8vw, 44px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e3e2e7", marginBottom: 6, lineHeight: 1.05 }}>
            Me
          </h2>
          <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.4)", lineHeight: 1.6 }}>
            What Apex knows, what it&apos;s learning, and what it&apos;s optimizing for.
          </p>
        </motion.section>

        {/* Decision style */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }} style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "rgba(245,158,11,0.4)" }}>tune</span>
          <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.42)" }}>
            Advice style: <span style={{ color: "#ffc174", fontWeight: 500 }}>{decisionStyleLabels[profile.decisionStyle || "direct"] || "Direct"}</span>
          </p>
          <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", color: "rgba(216,195,173,0.2)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>
            CHANGE
          </button>
        </motion.div>

        {/* ── DECISIONS AWAITING REVIEW ────────────────────────────────────── */}
        {pendingFollowUps.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <SectionLabel>DECISIONS AWAITING REVIEW</SectionLabel>
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

        {/* ── WHAT APEX KNOWS ABOUT YOU ────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>WHAT APEX KNOWS ABOUT YOU</SectionLabel>

          {/* Confirmed (green) */}
          {confirmedInsights.map((text, i) => <ConfirmedInsight key={i} text={text} index={i} />)}

          {/* Detected from behavioral patterns */}
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
          {showInsightEmptyState && (
            <div>
              <LearningCard text="Apex is still learning when you do your best work." index={0} action={() => router.push("/settings")} actionLabel="SET IT →" />
              <LearningCard text="Apex is still learning what usually derails your day." index={1} action={() => router.push("/settings")} actionLabel="TELL APEX →" />
              {daysOfData < 3 && <LearningCard text={`${Math.max(0, 3 - daysOfData)} more day${3 - daysOfData !== 1 ? "s" : ""} of logs needed to surface behavioral patterns.`} index={2} action={() => router.push("/")} actionLabel="LOG TODAY →" />}
            </div>
          )}

          {(detectedInsights.length > 0 || confirmedInsights.length > 0) && (
            <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.05em", color: "rgba(216,195,173,0.2)", marginTop: 8, lineHeight: 1.5 }}>
              Confirm to save · Edit to refine · Dismiss to hide
            </p>
          )}
        </div>

        {/* ── NEW PATTERNS APEX HAS NOTICED ───────────────────────────────── */}
        {generatedInsights.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>NEW PATTERNS APEX HAS NOTICED</SectionLabel>
            <p className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.38)", lineHeight: 1.55, marginBottom: 12 }}>
              Based on your decision outcomes — confirm what feels right.
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

        {/* ── YOUR GOALS ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionLabel>YOUR CURRENT GOALS</SectionLabel>
            <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", color: "rgba(245,158,11,0.38)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>
              EDIT
            </button>
          </div>
          {hasGoals ? (
            profile.goals.map((goal, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(245,158,11,0.38)", flexShrink: 0, marginTop: 2 }}>radio_button_unchecked</span>
                <p className="font-body" style={{ fontSize: 15, color: "#e3e2e7", lineHeight: 1.5, letterSpacing: "-0.005em" }}>{goal}</p>
              </div>
            ))
          ) : (
            <button onClick={() => router.push("/settings")} style={{ width: "100%", padding: "14px", borderRadius: 11, border: "1px dashed rgba(245,158,11,0.14)", background: "rgba(245,158,11,0.02)", cursor: "pointer", textAlign: "center" }}>
              <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.35)", marginBottom: 3 }}>No goals set yet.</p>
              <p className="font-label" style={{ fontSize: 11, letterSpacing: "0.06em", color: "rgba(245,158,11,0.38)" }}>ADD YOUR GOALS →</p>
            </button>
          )}
        </div>

        {/* ── DECISION OUTCOMES ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>DECISION OUTCOMES</SectionLabel>
          <DecisionOutcomeStats stats={stats} />
        </div>

        {/* ── RECENT DECISIONS ─────────────────────────────────────────────── */}
        {decisions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>RECENT DECISIONS</SectionLabel>
            {decisions.slice(0, 12).map((record, i) => (
              <RecentDecisionRow key={record.id} record={record} index={i} />
            ))}
          </div>
        )}

        {/* ── WHAT APEX NEEDS NEXT ─────────────────────────────────────────── */}
        {learningPrompts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>WHAT APEX NEEDS NEXT</SectionLabel>
            {learningPrompts.map((p, i) => (
              <LearningCard key={i} text={p.text} action={p.action} actionLabel={p.label} index={i} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", color: "rgba(216,195,173,0.2)", fontSize: 11, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>settings</span>
            EDIT PROFILE & SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}
