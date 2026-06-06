"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useApex } from "@/lib/store";
import type { DecisionStyle } from "@/lib/store";
import { DEV_SCENARIOS } from "@/lib/apex/dev-seeds";

// ─── UI primitives ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(216,195,173,0.35)", display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "rgba(216,195,173,0.3)", marginTop: 5, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string | number | undefined; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e3e2e7", fontSize: 14, outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" }}
      onFocus={e => (e.target.style.borderColor = "rgba(245,158,11,0.35)")}
      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
    />
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginTop: 36, marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(216,195,173,0.3)" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13, color: "rgba(216,195,173,0.4)", marginTop: 4, lineHeight: 1.5 }}>{subtitle}</p>}
    </div>
  );
}

// ─── Goals editor ─────────────────────────────────────────────────────────────

function GoalsEditor({ goals, onChange }: { goals: string[]; onChange: (goals: string[]) => void }) {
  const padded = [...goals];
  while (padded.length < 3) padded.push("");

  const update = (i: number, val: string) => {
    const next = [...padded];
    next[i] = val;
    onChange(next.filter(g => g.trim()));
  };

  const placeholders = [
    "e.g. Close Stripe integration by end of month",
    "e.g. Train 4x per week consistently",
    "e.g. Read 2 books this month",
    "e.g. Save $500 this month",
    "e.g. Study for 2 hours daily",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {padded.slice(0, 5).map((goal, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="font-label" style={{ fontSize: 10, color: "rgba(245,158,11,0.5)" }}>{i + 1}</span>
          </div>
          <input
            value={goal} onChange={e => update(i, e.target.value)} placeholder={placeholders[i] || "Add another goal"}
            style={{
              flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              color: "#e3e2e7", fontSize: 14, outline: "none", fontFamily: "inherit",
              borderRadius: 10, padding: "11px 14px", transition: "border-color 0.2s",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(245,158,11,0.3)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Tag list editor (derailers / preferences) ────────────────────────────────

function TagEditor({ tags, onChange, placeholder, suggestions }: {
  tags: string[]; onChange: (t: string[]) => void; placeholder?: string; suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const add = (val: string) => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {tags.map(t => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <span className="font-body" style={{ fontSize: 12, color: "#ffc174" }}>{t}</span>
            <button onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,158,11,0.5)", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
          placeholder={placeholder || "Type and press Enter"}
          style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#e3e2e7", fontSize: 13, outline: "none", fontFamily: "inherit", borderRadius: 10, padding: "9px 12px" }}
        />
        <button onClick={() => add(draft)} style={{ padding: "9px 14px", borderRadius: 10, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: 12, cursor: "pointer" }}>Add</button>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          {suggestions.filter(s => !tags.includes(s)).slice(0, 6).map(s => (
            <button key={s} onClick={() => add(s)} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(216,195,173,0.4)", fontSize: 12, cursor: "pointer" }}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Decision style selector ──────────────────────────────────────────────────

function DecisionStyleSelector({ value, onChange }: { value: DecisionStyle; onChange: (s: DecisionStyle) => void }) {
  const options: { value: DecisionStyle; label: string; description: string }[] = [
    { value: "direct", label: "Direct", description: "Just tell me what to do." },
    { value: "balanced", label: "Balanced", description: "Show me both sides." },
    { value: "gentle", label: "Gentle", description: "Soften the edges a bit." },
    { value: "brutally_honest", label: "Brutally honest", description: "Don't hold back." },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "11px 12px", borderRadius: 12, textAlign: "left", cursor: "pointer",
            border: value === opt.value ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(255,255,255,0.07)",
            background: value === opt.value ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.02)",
            transition: "all 0.15s ease",
          }}
        >
          <p className="font-display" style={{ fontSize: 13, fontWeight: 600, color: value === opt.value ? "#ffc174" : "#e3e2e7", marginBottom: 2 }}>{opt.label}</p>
          <p className="font-body" style={{ fontSize: 11, color: "rgba(216,195,173,0.4)", lineHeight: 1.4 }}>{opt.description}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { state, dispatch } = useApex();
  const { profile } = state;
  const [saved, setSaved] = useState(false);

  const set = (key: string) => (val: string) => {
    const numKeys = ["calorieTarget", "proteinTarget", "stepTarget", "startWeight", "goalWeight"];
    const parsed = numKeys.includes(key) ? (parseFloat(val) || 0) : val;
    dispatch({ type: "SET_PROFILE", profile: { [key]: parsed } });
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const DERAILER_SUGGESTIONS = ["Procrastination", "Too many meetings", "Low energy", "Perfectionism", "Distractions", "Overcommitting", "Social obligations", "Lack of clarity"];
  const WINDOW_SUGGESTIONS = ["Before 9 AM", "9 AM – noon", "Afternoon", "Evening", "It varies"];

  return (
    <div className="max-w-lg mx-auto px-5 py-8 font-body" style={{ background: "#060606", minHeight: "100dvh" }}>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="font-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", marginBottom: 6, opacity: 0.65 }}>APEX</p>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "#e3e2e7" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "rgba(216,195,173,0.38)", marginTop: 4 }}>The more context Apex has, the sharper your brief.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <SectionHeader title="PROFILE" />
        <Field label="YOUR NAME">
          <TextInput value={profile.name} onChange={set("name")} placeholder="Your name" />
        </Field>

        {/* ── Goals — primary ─────────────────────────────────────────────── */}
        <SectionHeader title="YOUR GOALS" subtitle="Apex builds your daily brief and decisions around these. Be specific." />
        <div style={{ marginBottom: 20 }}>
          <GoalsEditor goals={profile.goals || []} onChange={goals => dispatch({ type: "SET_GOALS", goals })} />
        </div>

        {/* ── Decision style ───────────────────────────────────────────────── */}
        <SectionHeader title="ADVICE STYLE" subtitle="How should Apex deliver recommendations?" />
        <Field label="">
          <DecisionStyleSelector
            value={profile.decisionStyle || "direct"}
            onChange={style => dispatch({ type: "SET_DECISION_STYLE", style })}
          />
        </Field>

        {/* ── Derailers ───────────────────────────────────────────────────── */}
        <SectionHeader title="WHAT USUALLY DERAILS YOU?" subtitle="Apex will flag these as risks and help you work around them." />
        <div style={{ marginBottom: 20 }}>
          <TagEditor
            tags={profile.derailers || []}
            onChange={derailers => dispatch({ type: "SET_PROFILE", profile: { derailers } })}
            placeholder="e.g. Procrastination"
            suggestions={DERAILER_SUGGESTIONS}
          />
        </div>

        {/* ── Productive windows ───────────────────────────────────────────── */}
        <SectionHeader title="WHEN DO YOU DO YOUR BEST WORK?" />
        <div style={{ marginBottom: 20 }}>
          <TagEditor
            tags={profile.productiveWindows || []}
            onChange={productiveWindows => dispatch({ type: "SET_PROFILE", profile: { productiveWindows } })}
            placeholder="e.g. Before 9 AM"
            suggestions={WINDOW_SUGGESTIONS}
          />
        </div>

        {/* ── Today context ────────────────────────────────────────────────── */}
        <SectionHeader title="TODAY'S CONTEXT" />
        <Field label="TOP PRIORITY THIS WEEK" hint="Apex references this in your brief.">
          <TextInput value={profile.topPriority} onChange={val => dispatch({ type: "SET_PRIORITY", priority: val })} placeholder="e.g. Close the Stripe integration" />
        </Field>
        <Field label="FIRST MEETING TODAY" hint="Helps Apex protect your morning window.">
          <TextInput value={profile.firstMeeting} onChange={val => dispatch({ type: "SET_MEETING", meeting: val })} placeholder="e.g. 2:00 PM" />
        </Field>

        {/* ── Health & fitness targets ─────────────────────────────────────── */}
        <SectionHeader title="HEALTH CONTEXT" subtitle="Used as performance signals — not the focus of Apex." />
        <div className="grid grid-cols-2 gap-3">
          <Field label="CALORIE TARGET / DAY">
            <TextInput value={profile.calorieTarget} onChange={set("calorieTarget")} type="number" placeholder="2100" />
          </Field>
          <Field label="PROTEIN TARGET (G)">
            <TextInput value={profile.proteinTarget} onChange={set("proteinTarget")} type="number" placeholder="155" />
          </Field>
        </div>

        {/* ── Weight (optional) ────────────────────────────────────────────── */}
        <SectionHeader title="WEIGHT GOAL (OPTIONAL)" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="CURRENT (LBS)">
            <TextInput value={profile.startWeight} onChange={set("startWeight")} type="number" placeholder="185" />
          </Field>
          <Field label="GOAL (LBS)">
            <TextInput value={profile.goalWeight} onChange={set("goalWeight")} type="number" placeholder="175" />
          </Field>
        </div>
        <Field label="GOAL DATE">
          <TextInput value={profile.goalDate} onChange={set("goalDate")} type="date" />
        </Field>

        {/* ── Apple Health ────────────────────────────────────────────────── */}
        <SectionHeader title="APPLE HEALTH (SHORTCUTS BRIDGE)" />
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: 13, color: "rgba(216,195,173,0.45)", lineHeight: 1.7, marginBottom: 10 }}>
            Create an iOS Shortcut that opens this URL with your health data:
          </p>
          <div style={{ borderRadius: 10, padding: "10px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#f59e0b", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.8, overflowX: "auto", wordBreak: "break-all" }}>
            {typeof window !== "undefined" ? window.location.origin : "https://your-apex.app"}/?steps=[Steps]&cal=[Active Energy]
          </div>
        </div>

        {/* ── Save ─────────────────────────────────────────────────────────── */}
        <button
          onClick={handleSave}
          className="w-full mt-8 py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: saved ? "rgba(46,204,113,0.1)" : "linear-gradient(135deg, #f59e0b, #f97316)",
            color: saved ? "#2ecc71" : "#1a0e00",
            border: saved ? "1px solid rgba(46,204,113,0.2)" : "none",
            fontFamily: "var(--font-display, sans-serif)",
          }}
        >
          {saved ? <><Check size={15} />Saved</> : "Save Settings"}
        </button>

        <p className="font-label" style={{ fontSize: 10, color: "rgba(216,195,173,0.18)", textAlign: "center", marginTop: 20, letterSpacing: "0.06em" }}>
          Apex · AI Chief of Staff · v2.1
        </p>

        {/* DEV: Scenario seeds */}
        {process.env.NODE_ENV !== "production" && (
          <div style={{ marginTop: 40, padding: 14, borderRadius: 12, border: "1px dashed rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.02)" }}>
            <p className="font-label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,158,11,0.4)", marginBottom: 10 }}>DEV — SCENARIOS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(DEV_SCENARIOS).map(([key, scenario]) => (
                <button key={key} onClick={() => dispatch({ type: "HYDRATE", state: { ...state, dailyHistory: scenario.snapshots, brief: { ...state.brief, generatedAt: null } } })}
                  style={{ textAlign: "left", padding: "9px 12px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#e3e2e7", fontSize: 12, cursor: "pointer", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600 }}>{scenario.label}</span><br />
                  <span style={{ color: "rgba(216,195,173,0.35)", fontSize: 11 }}>{scenario.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </motion.div>
      <div style={{ height: 32 }} />
    </div>
  );
}
