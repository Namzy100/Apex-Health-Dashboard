"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useApex } from "@/lib/store";
import { DEV_SCENARIOS } from "@/lib/apex/dev-seeds";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.5 }}>{hint}</p>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        fontSize: 14,
        outline: "none",
        fontFamily: "inherit",
        transition: "border-color 0.2s",
      }}
      onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.18)")}
      onBlur={e => (e.target.style.borderColor = "var(--border)")}
    />
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 16, marginTop: 32 }}>
      {title}
    </p>
  );
}

export default function SettingsPage() {
  const { state, dispatch } = useApex();
  const { profile } = state;
  const [saved, setSaved] = useState(false);

  const set = (key: string) => (val: string) => {
    const numKeys = ["calorieTarget", "proteinTarget", "stepTarget", "startWeight", "goalWeight"];
    const parsed = numKeys.includes(key) ? (parseFloat(val) || 0) : val;
    dispatch({ type: "SET_PROFILE", profile: { [key]: parsed } });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto px-5 py-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "var(--amber)", marginBottom: 6 }}>
          APEX
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          The more context you give Apex, the sharper your brief gets.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

        <SectionHeader title="PROFILE" />
        <Field label="YOUR NAME">
          <TextInput value={profile.name} onChange={set("name")} placeholder="Naman" />
        </Field>
        <Field
          label="WHAT ARE YOU TRYING TO DO?"
          hint="Be specific. This shapes every brief."
        >
          <input
            value={profile.goal ?? ""}
            onChange={e => set("goal")(e.target.value)}
            placeholder="Lose 15 lbs by August 31, stop feeling sluggish, launch my startup"
            className="w-full px-4 py-3 rounded-xl resize-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </Field>

        <SectionHeader title="WEIGHT GOAL" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="START WEIGHT (LBS)">
            <TextInput value={profile.startWeight} onChange={set("startWeight")} type="number" placeholder="195" />
          </Field>
          <Field label="GOAL WEIGHT (LBS)">
            <TextInput value={profile.goalWeight} onChange={set("goalWeight")} type="number" placeholder="175" />
          </Field>
        </div>
        <Field label="GOAL DATE">
          <TextInput value={profile.goalDate} onChange={set("goalDate")} type="date" />
        </Field>

        <SectionHeader title="DAILY TARGETS" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="CALORIES">
            <TextInput value={profile.calorieTarget} onChange={set("calorieTarget")} type="number" placeholder="2100" />
          </Field>
          <Field label="PROTEIN (G)">
            <TextInput value={profile.proteinTarget} onChange={set("proteinTarget")} type="number" placeholder="155" />
          </Field>
        </div>
        <Field label="DAILY STEPS">
          <TextInput value={profile.stepTarget} onChange={set("stepTarget")} type="number" placeholder="10000" />
        </Field>

        <SectionHeader title="CONTEXT FOR APEX" />
        <Field
          label="TOP PRIORITY THIS WEEK"
          hint="Apex will reference this in every brief."
        >
          <TextInput
            value={profile.topPriority}
            onChange={val => dispatch({ type: "SET_PRIORITY", priority: val })}
            placeholder="Close the Stripe integration"
          />
        </Field>
        <Field
          label="FIRST MEETING TODAY"
          hint="e.g. 2:00 PM — helps Apex protect your morning"
        >
          <TextInput
            value={profile.firstMeeting}
            onChange={val => dispatch({ type: "SET_MEETING", meeting: val })}
            placeholder="2:00 PM"
          />
        </Field>

        <SectionHeader title="APPLE HEALTH (SHORTCUTS BRIDGE)" />
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 12 }}>
            Create an iOS Shortcut that runs on schedule and opens this URL with your health data:
          </p>
          <div
            className="rounded-xl p-3 font-mono"
            style={{ background: "#0d0b0e", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "var(--amber)", lineHeight: 1.8, overflowX: "auto", wordBreak: "break-all" }}
          >
            {typeof window !== "undefined" ? window.location.origin : "https://your-apex.app"}
            /?steps=[Steps]&cal=[Active Energy]&date=[Current Date, ISO 8601]
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
            Apex reads these URL params on open and saves them to today&apos;s check-in.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full mt-8 py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: saved
              ? "rgba(16,185,129,0.15)"
              : "linear-gradient(135deg, #f59e0b, #f97316)",
            color: saved ? "var(--emerald)" : "#000",
            border: saved ? "1px solid rgba(16,185,129,0.25)" : "none",
          }}
        >
          {saved ? <><Check size={15} />Saved</> : "Save Settings"}
        </button>

        {/* Version */}
        <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 32 }}>
          Apex · Personal OS · v1.0
        </p>

        {/* ── DEV ONLY: Intelligence QA seed loader ───────────────────── */}
        {process.env.NODE_ENV !== "production" && (
          <div
            style={{
              marginTop: 40,
              padding: "16px",
              borderRadius: 14,
              border: "1px dashed rgba(245,158,11,0.2)",
              background: "rgba(245,158,11,0.03)",
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,158,11,0.5)", marginBottom: 12 }}>
              DEV — INTELLIGENCE SCENARIOS
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
              Load a seed scenario into dailyHistory to test pattern detection and brief quality.
              Overwrites existing history.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(DEV_SCENARIOS).map(([key, scenario]) => (
                <button
                  key={key}
                  onClick={() =>
                    dispatch({
                      type: "HYDRATE",
                      state: { ...state, dailyHistory: scenario.snapshots, brief: { ...state.brief, generatedAt: null } },
                    })
                  }
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{scenario.label}</span>
                  <br />
                  <span style={{ color: "var(--text-muted)" }}>{scenario.description}</span>
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
