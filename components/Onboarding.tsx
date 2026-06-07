"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApex } from "@/lib/store";
import type { DecisionStyle } from "@/lib/store";

// ─── Step definitions ──────────────────────────────────────────────────────────

const BECOMING = [
  { label: "Career",          value: "career",        icon: "work" },
  { label: "Fitness",         value: "fitness",       icon: "fitness_center" },
  { label: "Money",           value: "money",         icon: "savings" },
  { label: "Discipline",      value: "discipline",    icon: "psychology" },
  { label: "Relationships",   value: "relationships", icon: "people" },
  { label: "Personal Growth", value: "growth",        icon: "trending_up" },
];

const DERAILERS = [
  "Overcommitting",
  "Phone",
  "Social pressure",
  "Lack of structure",
  "Low energy",
  "Procrastination",
  "Perfectionism",
  "Distractions",
];

const DECISION_STYLES: { value: DecisionStyle; label: string; description: string }[] = [
  { value: "direct",          label: "Direct",          description: "Just tell me what to do." },
  { value: "balanced",        label: "Balanced",        description: "Show me both sides." },
  { value: "gentle",          label: "Gentle",          description: "Soften the edges a bit." },
  { value: "brutally_honest", label: "Brutally honest", description: "Don't hold back." },
];

const HELP_WITH = [
  { label: "Focus",        value: "focus"       },
  { label: "Money",        value: "money"       },
  { label: "Food",         value: "food"        },
  { label: "Opportunities", value: "opportunity" },
  { label: "Social plans", value: "social"      },
  { label: "Productivity", value: "productivity" },
];

const PRODUCTIVE_WINDOWS = [
  "Before 9 AM",
  "9 AM – noon",
  "After noon",
  "Afternoon",
  "Evening",
  "It varies",
];

const TOTAL_STEPS = 5;

// Background words per step — atmospheric identity
const STEP_WORDS = ["BECOMING", "BUILDING", "PROTECTING", "EVOLVING", "DECIDING", "APEX"];

// ─── Chip toggle ──────────────────────────────────────────────────────────────

function Chip({ label, icon, selected, onClick }: {
  label: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        padding: "10px 16px",
        borderRadius: 999,
        border: selected ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.1)",
        background: selected ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
        color: selected ? "#ffc174" : "rgba(216,195,173,0.6)",
        fontSize: 14,
        fontFamily: "var(--font-body, sans-serif)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s ease",
      }}
    >
      {icon && (
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{icon}</span>
      )}
      {label}
    </motion.button>
  );
}

// ─── Step 1 — WHO ARE YOU BECOMING? ──────────────────────────────────────────

function Step1({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <h2
        className="font-display"
        style={{ fontSize: "clamp(30px, 8vw, 38px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e3e2e7", marginBottom: 10, lineHeight: 1.1 }}
      >
        WHO ARE YOU BECOMING?
      </h2>
      <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.5)", marginBottom: 32, lineHeight: 1.65 }}>
        Apex aligns every recommendation around what matters most to you. Select everything that applies.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {BECOMING.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            selected={selected.includes(opt.value)}
            onClick={() => onToggle(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 — WHAT MATTERS MOST THIS MONTH? ──────────────────────────────────

function Step2({ goals, onUpdate }: { goals: string[]; onUpdate: (goals: string[]) => void }) {
  const padded = [...goals];
  while (padded.length < 3) padded.push("");

  const update = (i: number, val: string) => {
    const next = [...padded];
    next[i] = val;
    onUpdate(next.filter(g => g.trim().length > 0));
  };

  const examples = [
    "e.g. Ship the feature before end of month",
    "e.g. Train 4x per week, hit protein target",
    "e.g. Read 2 books, cut phone to 1 hour/day",
  ];

  return (
    <div>
      <h2
        className="font-display"
        style={{ fontSize: "clamp(30px, 8vw, 38px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e3e2e7", marginBottom: 10, lineHeight: 1.1 }}
      >
        WHAT MATTERS MOST THIS MONTH?
      </h2>
      <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.5)", marginBottom: 32, lineHeight: 1.65 }}>
        Be specific. &ldquo;Get fitter&rdquo; is too weak. &ldquo;Train 4x per week&rdquo; is something Apex can act on.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="font-label" style={{ fontSize: 11, color: "rgba(245,158,11,0.6)" }}>{i + 1}</span>
            </div>
            <input
              value={padded[i] || ""}
              onChange={e => update(i, e.target.value)}
              placeholder={examples[i]}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e3e2e7",
                fontSize: 15,
                outline: "none",
                fontFamily: "var(--font-body, sans-serif)",
                borderRadius: 12,
                padding: "13px 16px",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(245,158,11,0.35)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3 — WHAT USUALLY DERAILS YOU? ──────────────────────────────────────

function Step3({ selected, onToggle, productive, onProductive }: {
  selected: string[];
  onToggle: (v: string) => void;
  productive: string[];
  onProductive: (v: string) => void;
}) {
  return (
    <div>
      <h2
        className="font-display"
        style={{ fontSize: "clamp(30px, 8vw, 38px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e3e2e7", marginBottom: 10, lineHeight: 1.1 }}
      >
        WHAT USUALLY DERAILS YOU?
      </h2>
      <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.5)", marginBottom: 24, lineHeight: 1.65 }}>
        Apex will flag these as risks and route around them in every recommendation.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
        {DERAILERS.map(d => (
          <Chip key={d} label={d} selected={selected.includes(d)} onClick={() => onToggle(d)} />
        ))}
      </div>

      <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(216,195,173,0.32)", marginBottom: 12 }}>
        WHEN DO YOU DO YOUR BEST WORK?
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PRODUCTIVE_WINDOWS.map(w => (
          <Chip key={w} label={w} selected={productive.includes(w)} onClick={() => onProductive(w)} />
        ))}
      </div>
    </div>
  );
}

// ─── Step 4 — HOW SHOULD APEX CHALLENGE YOU? ─────────────────────────────────

function Step4({ selected, onSelect }: { selected: DecisionStyle; onSelect: (s: DecisionStyle) => void }) {
  return (
    <div>
      <h2
        className="font-display"
        style={{ fontSize: "clamp(30px, 8vw, 38px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e3e2e7", marginBottom: 10, lineHeight: 1.1 }}
      >
        HOW SHOULD APEX CHALLENGE YOU?
      </h2>
      <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.5)", marginBottom: 32, lineHeight: 1.65 }}>
        This shapes how Apex delivers every recommendation. You can change it at any time.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {DECISION_STYLES.map(s => (
          <motion.button
            key={s.value}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(s.value)}
            style={{
              padding: "16px 20px",
              borderRadius: 14,
              border: selected === s.value ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.08)",
              background: selected === s.value ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                width: 18, height: 18, borderRadius: "50%",
                border: selected === s.value ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              {selected === s.value && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
              )}
            </div>
            <div>
              <p className="font-display" style={{ fontSize: 16, fontWeight: 600, color: "#e3e2e7", marginBottom: 2 }}>
                {s.label}
              </p>
              <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.5)" }}>
                {s.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5 — WHAT SHOULD APEX HELP YOU DECIDE? ──────────────────────────────

function Step5({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <h2
        className="font-display"
        style={{ fontSize: "clamp(30px, 8vw, 38px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e3e2e7", marginBottom: 10, lineHeight: 1.1 }}
      >
        WHAT SHOULD APEX HELP YOU DECIDE?
      </h2>
      <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.5)", marginBottom: 32, lineHeight: 1.65 }}>
        Apex will prioritize these decision types in your daily brief and recommendations.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {HELP_WITH.map(h => (
          <Chip
            key={h.value}
            label={h.label}
            selected={selected.includes(h.value)}
            onClick={() => onToggle(h.value)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 6 — WELCOME TO APEX ────────────────────────────────────────────────

function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", flexDirection: "column", minHeight: "60dvh", justifyContent: "center" }}
    >
      <p className="font-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", marginBottom: 32 }}>
        APEX
      </p>
      <h2
        className="font-display"
        style={{
          fontSize: "clamp(44px, 14vw, 68px)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          color: "#e3e2e7",
          lineHeight: 0.95,
          marginBottom: 28,
          textTransform: "uppercase",
        }}
      >
        Welcome.
      </h2>
      <p className="font-body" style={{ fontSize: 16, color: "rgba(216,195,173,0.55)", lineHeight: 1.75, maxWidth: 300, marginBottom: 48 }}>
        A system that gets smarter every time you make a decision.
      </p>
      <p className="font-body" style={{ fontSize: 14, color: "rgba(216,195,173,0.32)", lineHeight: 1.65, marginBottom: 48 }}>
        Every recommendation Apex gives is a data point. Review outcomes, confirm what&rsquo;s true, and watch the advice sharpen over time.
      </p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onBegin}
        style={{
          padding: "17px 36px",
          borderRadius: 999,
          background: "#f59e0b",
          border: "none",
          color: "#1a0e00",
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "var(--font-display, sans-serif)",
          letterSpacing: "-0.01em",
          cursor: "pointer",
          boxShadow: "0 0 32px rgba(245,158,11,0.22)",
          alignSelf: "flex-start",
        }}
      >
        Begin
      </motion.button>
    </motion.div>
  );
}

// ─── Main Onboarding overlay ──────────────────────────────────────────────────

export default function Onboarding() {
  const { dispatch } = useApex();
  const [step, setStep] = useState(1);

  // Step 1
  const [optimizing, setOptimizing] = useState<string[]>([]);
  // Step 2
  const [goals, setGoals] = useState<string[]>([]);
  // Step 3
  const [derailers, setDerailers] = useState<string[]>([]);
  const [productiveWindows, setProductiveWindows] = useState<string[]>([]);
  // Step 4
  const [decisionStyle, setDecisionStyle] = useState<DecisionStyle>("direct");
  // Step 5
  const [helpWith, setHelpWith] = useState<string[]>([]);

  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const toggleProductive = (w: string) => {
    setProductiveWindows(productiveWindows.includes(w) ? [] : [w]);
  };

  const canNext = () => {
    if (step === 1) return optimizing.length > 0;
    if (step === 2) return goals.filter(g => g.trim()).length > 0;
    return true;
  };

  const handleComplete = () => {
    dispatch({
      type: "COMPLETE_ONBOARDING",
      profile: {
        goals: goals.filter(g => g.trim()),
        preferences: optimizing,
        decisionStyle,
        derailers,
        productiveWindows,
        commonDecisionCategories: helpWith,
        currentPriorities: goals.filter(g => g.trim()).slice(0, 3),
      },
    });
  };

  const isWelcomeScreen = step === TOTAL_STEPS + 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#060606",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflow: "hidden",
      }}
    >
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none atmospheric-glow" />

      {/* Background identity word — shifts per step */}
      <div
        aria-hidden="true"
        className="font-display"
        style={{
          position: "absolute",
          top: "0%",
          right: "-10%",
          fontSize: "clamp(90px, 36vw, 220px)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          color: "rgba(255,255,255,0.018)",
          pointerEvents: "none",
          userSelect: "none",
          lineHeight: 1,
          zIndex: 0,
          whiteSpace: "nowrap",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {STEP_WORDS[step - 1] || "APEX"}
          </motion.span>
        </AnimatePresence>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 520,
          margin: "0 auto",
          width: "100%",
          padding: "52px 24px 120px",
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        {!isWelcomeScreen && (
          <div style={{ marginBottom: 36 }}>
            <span className="font-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", opacity: 0.6 }}>
              APEX
            </span>
          </div>
        )}

        {/* Progress bar — only on steps 1–5 */}
        {!isWelcomeScreen && (
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="font-label" style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(216,195,173,0.28)" }}>
                {step} OF {TOTAL_STEPS}
              </span>
              <span className="font-label" style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(216,195,173,0.28)" }}>
                {Math.round((step / TOTAL_STEPS) * 100)}%
              </span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: "rgba(245,158,11,0.55)", borderRadius: 999 }}
                animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Step content */}
        <div style={{ flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 && (
                <Step1
                  selected={optimizing}
                  onToggle={v => toggleArr(optimizing, v, setOptimizing)}
                />
              )}
              {step === 2 && (
                <Step2 goals={goals} onUpdate={setGoals} />
              )}
              {step === 3 && (
                <Step3
                  selected={derailers}
                  onToggle={v => toggleArr(derailers, v, setDerailers)}
                  productive={productiveWindows}
                  onProductive={toggleProductive}
                />
              )}
              {step === 4 && (
                <Step4 selected={decisionStyle} onSelect={setDecisionStyle} />
              )}
              {step === 5 && (
                <Step5
                  selected={helpWith}
                  onToggle={v => toggleArr(helpWith, v, setHelpWith)}
                />
              )}
              {isWelcomeScreen && (
                <WelcomeScreen onBegin={handleComplete} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation — hidden on welcome screen */}
        {!isWelcomeScreen && (
          <div
            style={{
              position: "fixed",
              bottom: "env(safe-area-inset-bottom, 0px)",
              left: 0,
              right: 0,
              padding: "16px 24px",
              background: "rgba(6,6,6,0.9)",
              backdropFilter: "blur(20px)",
              display: "flex",
              gap: 12,
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            {step > 1 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 0,
                  padding: "15px 24px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(216,195,173,0.55)",
                  fontSize: 15,
                  fontFamily: "var(--font-body, sans-serif)",
                  cursor: "pointer",
                }}
              >
                Back
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: canNext() ? 0.96 : 1 }}
              onClick={() => {
                if (!canNext()) return;
                if (step < TOTAL_STEPS) {
                  setStep(s => s + 1);
                } else {
                  // Go to welcome screen
                  setStep(TOTAL_STEPS + 1);
                }
              }}
              style={{
                flex: 1,
                padding: "15px 24px",
                borderRadius: 999,
                background: canNext() ? "#f59e0b" : "rgba(245,158,11,0.12)",
                border: "none",
                color: canNext() ? "#1a0e00" : "rgba(245,158,11,0.35)",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "var(--font-display, sans-serif)",
                letterSpacing: "-0.01em",
                cursor: canNext() ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                boxShadow: canNext() ? "0 0 20px rgba(245,158,11,0.18)" : "none",
              }}
            >
              {step === TOTAL_STEPS ? "Finish" : "Continue"}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
