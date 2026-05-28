"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Utensils, Scale, Dumbbell } from "lucide-react";
import { useApex, uid } from "@/lib/store";
import type { FoodLog, WorkoutLog } from "@/lib/store";

// ─── NLP parsers ─────────────────────────────────────────────────────────────

function parseFoodInput(input: string): Partial<FoodLog> {
  const lower = input.toLowerCase();

  // Extract calories: "650 cal", "650 kcal", "cal 650"
  const calMatch =
    lower.match(/(\d+(?:\.\d+)?)\s*(?:cal(?:ories?|s)?|kcal)/i) ??
    lower.match(/(?:cal(?:ories?)?\s*)(\d+(?:\.\d+)?)/i);
  const calories = calMatch ? Math.round(parseFloat(calMatch[1])) : 0;

  // Extract protein: "45g protein", "45p", "protein 45"
  const protMatch =
    lower.match(/(\d+(?:\.\d+)?)\s*g?\s*(?:protein|pro|p\b)/i) ??
    lower.match(/(?:protein\s*)(\d+(?:\.\d+)?)/i);
  const protein = protMatch ? parseFloat(protMatch[1]) : 0;

  // Guess meal from input text
  const mealMap: { keys: string[]; meal: FoodLog["meal"] }[] = [
    { keys: ["breakfast", "morning", "oatmeal", "eggs", "toast", "cereal", "yogurt"], meal: "breakfast" },
    { keys: ["lunch", "noon", "midday", "sandwich", "wrap"], meal: "lunch" },
    { keys: ["dinner", "evening", "night", "supper"], meal: "dinner" },
    { keys: ["snack", "bar", "shake", "protein shake", "handful"], meal: "snack" },
  ];

  const hourNow = new Date().getHours();
  const defaultMeal: FoodLog["meal"] =
    hourNow < 10 ? "breakfast" : hourNow < 14 ? "lunch" : hourNow < 19 ? "dinner" : "snack";

  let meal: FoodLog["meal"] = defaultMeal;
  for (const { keys, meal: m } of mealMap) {
    if (keys.some(k => lower.includes(k))) { meal = m; break; }
  }

  // Clean name: strip numbers + keywords
  const name = input
    .replace(/\d+(?:\.\d+)?\s*(?:cal(?:ories?|s)?|kcal|g?\s*protein|pro|p\b)/gi, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    || input.trim();

  return { name, calories, protein, meal };
}

function parseWorkoutInput(input: string): Partial<WorkoutLog> {
  const lower = input.toLowerCase();

  // Duration: "45 min", "1 hour", "45m"
  const durMatch =
    lower.match(/(\d+)\s*(?:min(?:utes?)?|m\b)/) ??
    lower.match(/(\d+)\s*(?:hr|hour)s?/);
  const duration = durMatch
    ? lower.includes("hour") || lower.includes("hr")
      ? parseInt(durMatch[1]) * 60
      : parseInt(durMatch[1])
    : 45;

  // Intensity
  const intensity: WorkoutLog["intensity"] = lower.includes("light") || lower.includes("easy")
    ? "light"
    : lower.includes("hard") || lower.includes("intense") || lower.includes("heavy")
    ? "hard"
    : "moderate";

  // Muscle group: just take whatever they wrote
  const muscleGroup = input
    .replace(/\d+\s*(?:min(?:utes?)?|m\b|hr|hour)s?/gi, "")
    .replace(/light|easy|moderate|hard|intense|heavy/gi, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    || "Full body";

  return { muscleGroup, duration, intensity };
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Utensils;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
      style={{
        background: active ? "var(--surface-2)" : "transparent",
        border: `1px solid ${active ? "rgba(255,255,255,0.1)" : "transparent"}`,
        color: active ? "var(--text-primary)" : "var(--text-muted)",
      }}
    >
      <Icon size={16} strokeWidth={active ? 2 : 1.5} />
      <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{label}</span>
    </button>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export default function LogSheet() {
  const { state, dispatch } = useApex();
  const { logSheetOpen, logTab } = state;

  const [mealInput, setMealInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [workoutInput, setWorkoutInput] = useState("");
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<Partial<FoodLog> | null>(null);

  const mealRef = useRef<HTMLTextAreaElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const workoutRef = useRef<HTMLTextAreaElement>(null);

  const close = () => { dispatch({ type: "CLOSE_LOG_SHEET" }); setDone(false); setPreview(null); };
  const setTab = (tab: typeof logTab) => dispatch({ type: "OPEN_LOG_SHEET", tab });

  // Auto-focus on open
  useEffect(() => {
    if (!logSheetOpen) return;
    setDone(false);
    setPreview(null);
    setMealInput(""); setWeightInput(""); setWorkoutInput("");
    setTimeout(() => {
      if (logTab === "meal") mealRef.current?.focus();
      else if (logTab === "weight") weightRef.current?.focus();
      else workoutRef.current?.focus();
    }, 320);
  }, [logSheetOpen, logTab]);

  // Live preview for meal
  useEffect(() => {
    if (logTab !== "meal" || !mealInput.trim()) { setPreview(null); return; }
    const parsed = parseFoodInput(mealInput);
    setPreview(parsed);
  }, [mealInput, logTab]);

  const handleLogMeal = () => {
    if (!mealInput.trim()) return;
    const parsed = parseFoodInput(mealInput);
    const log: FoodLog = {
      id: uid(),
      name: parsed.name ?? mealInput.trim(),
      calories: parsed.calories ?? 0,
      protein: parsed.protein ?? 0,
      meal: parsed.meal ?? "snack",
      loggedAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_FOOD_LOG", log });
    setDone(true);
    setTimeout(close, 900);
  };

  const handleLogWeight = () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    dispatch({ type: "SET_WEIGHT", weight: w });
    setDone(true);
    setTimeout(close, 900);
  };

  const handleLogWorkout = () => {
    if (!workoutInput.trim()) return;
    const parsed = parseWorkoutInput(workoutInput);
    const log: WorkoutLog = {
      id: uid(),
      muscleGroup: parsed.muscleGroup ?? workoutInput.trim(),
      duration: parsed.duration ?? 45,
      intensity: parsed.intensity ?? "moderate",
      loggedAt: new Date().toISOString(),
    };
    dispatch({ type: "SET_WORKOUT", workout: log });
    setDone(true);
    setTimeout(close, 900);
  };

  const handleKey = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fn(); }
  };

  return (
    <AnimatePresence>
      {logSheetOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div
              className="rounded-t-3xl px-5 pt-4 pb-8"
              style={{
                background: "#161412",
                border: "1px solid rgba(255,255,255,0.1)",
                borderBottom: "none",
                minHeight: 340,
              }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.12)" }} />

              {/* Tab row */}
              <div className="flex gap-2 mb-6">
                <TabBtn active={logTab === "meal"}    onClick={() => setTab("meal")}    icon={Utensils} label="Meal"    />
                <TabBtn active={logTab === "weight"}  onClick={() => setTab("weight")}  icon={Scale}    label="Weight"  />
                <TabBtn active={logTab === "workout"} onClick={() => setTab("workout")} icon={Dumbbell} label="Workout" />
              </div>

              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 gap-3"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(16,185,129,0.15)" }}
                    >
                      <Check size={26} style={{ color: "var(--emerald)" }} />
                    </div>
                    <p style={{ color: "var(--emerald)", fontWeight: 600, fontSize: 15 }}>Logged</p>
                  </motion.div>
                ) : logTab === "meal" ? (
                  <motion.div key="meal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.04em" }}>
                      WHAT DID YOU EAT?
                    </label>
                    <textarea
                      ref={mealRef}
                      value={mealInput}
                      onChange={e => setMealInput(e.target.value)}
                      onKeyDown={e => handleKey(e, handleLogMeal)}
                      placeholder="chicken rice bowl, 650 cal, 45g protein"
                      rows={3}
                      className="w-full mt-2 resize-none"
                      style={{
                        fontSize: 16,
                        lineHeight: 1.6,
                        color: "var(--text-primary)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                    {/* Live preview */}
                    {preview && (preview.calories || preview.protein) ? (
                      <div className="flex gap-4 mt-2 mb-4">
                        {preview.calories ? (
                          <span style={{ fontSize: 12, color: "var(--amber)" }}>
                            ~{preview.calories} cal
                          </span>
                        ) : null}
                        {preview.protein ? (
                          <span style={{ fontSize: 12, color: "var(--emerald)" }}>
                            ~{preview.protein}g protein
                          </span>
                        ) : null}
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {preview.meal}
                        </span>
                      </div>
                    ) : <div className="mb-4" />}
                    <button
                      onClick={handleLogMeal}
                      disabled={!mealInput.trim()}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: mealInput.trim() ? "linear-gradient(135deg, #f59e0b, #f97316)" : "rgba(255,255,255,0.06)",
                        color: mealInput.trim() ? "#000" : "var(--text-muted)",
                        cursor: mealInput.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      Log Meal
                    </button>
                  </motion.div>
                ) : logTab === "weight" ? (
                  <motion.div key="weight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.04em" }}>
                      TODAY&apos;S WEIGHT (LBS)
                    </label>
                    <div className="flex items-center gap-3 mt-3 mb-6">
                      <input
                        ref={weightRef}
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={weightInput}
                        onChange={e => setWeightInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleLogWeight(); }}
                        placeholder="178.5"
                        className="flex-1 text-4xl font-black text-center py-4 rounded-2xl"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-primary)",
                          outline: "none",
                          fontFamily: "inherit",
                        }}
                      />
                      <span style={{ fontSize: 18, color: "var(--text-muted)", fontWeight: 500 }}>lbs</span>
                    </div>
                    <button
                      onClick={handleLogWeight}
                      disabled={!weightInput || parseFloat(weightInput) <= 0}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: weightInput ? "linear-gradient(135deg, #f59e0b, #f97316)" : "rgba(255,255,255,0.06)",
                        color: weightInput ? "#000" : "var(--text-muted)",
                        cursor: weightInput ? "pointer" : "not-allowed",
                      }}
                    >
                      Log Weight
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="workout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.04em" }}>
                      WHAT DID YOU DO?
                    </label>
                    <textarea
                      ref={workoutRef}
                      value={workoutInput}
                      onChange={e => setWorkoutInput(e.target.value)}
                      onKeyDown={e => handleKey(e, handleLogWorkout)}
                      placeholder="legs, 45 min, moderate"
                      rows={2}
                      className="w-full mt-2 resize-none mb-6"
                      style={{
                        fontSize: 16,
                        lineHeight: 1.6,
                        color: "var(--text-primary)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleLogWorkout}
                      disabled={!workoutInput.trim()}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: workoutInput.trim() ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "rgba(255,255,255,0.06)",
                        color: workoutInput.trim() ? "#fff" : "var(--text-muted)",
                        cursor: workoutInput.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      Log Workout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close button */}
              <button
                onClick={close}
                className="absolute top-4 right-5 p-1.5 rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
