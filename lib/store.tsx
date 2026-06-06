"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { buildSnapshot, type DailySnapshot } from "@/lib/apex/memory";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnergyLevel = "low" | "medium" | "high";

export interface FoodLog {
  id: string;
  name: string;
  calories: number;
  protein: number;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  loggedAt: string;
}

export interface WorkoutLog {
  id: string;
  muscleGroup: string;
  duration: number;
  intensity: "light" | "moderate" | "hard";
  loggedAt: string;
}

export interface WeightLog {
  date: string;
  weight: number; // lbs
}

export type DecisionStyle = "direct" | "balanced" | "gentle" | "brutally_honest";

// ─── Decision Record — extended for outcome tracking ─────────────────────────

export type DecisionOutcome = "worked" | "mixed" | "did_not_work";

export interface DecisionRecord {
  id: string;
  question: string;
  recommendation: string;
  confidence?: string;
  category?: string;
  createdAt: string;
  // V2.3: outcome tracking
  outcome?: DecisionOutcome;
  reflection?: string;
  reviewedAt?: string;
}

export interface UserProfile {
  name: string;

  // ── V2: Chief of Staff memory layer ────────────────────────────────────────
  goals: string[];                        // multi-domain goal statements
  preferences: string[];                  // explicit behavioral preferences
  decisionStyle: DecisionStyle;           // how Apex should deliver advice
  derailers: string[];                    // what typically throws the day off
  productiveWindows: string[];            // when they do their best work
  currentPriorities: string[];            // top priorities this week/month
  commonDecisionCategories: string[];     // what kinds of decisions they face most
  learnedInsights: string[];              // confirmed behavioral insights
  dismissedInsights: string[];            // insights the user dismissed
  generatedInsights: string[];            // AI-generated, awaiting review

  // ── Legacy fields — kept for backward compat + logging ───────────────────
  goal: string;
  calorieTarget: number;
  proteinTarget: number;
  stepTarget: number;
  startWeight?: number;
  goalWeight?: number;
  goalDate?: string;
  units: "imperial" | "metric";
  topPriority?: string;
  firstMeeting?: string; // "2:00 PM" — from Apple Calendar
}

export interface DailyState {
  date: string;
  energyLevel: EnergyLevel | null;
  foodLogs: FoodLog[];
  workoutLog: WorkoutLog | null;
  weightLog: WeightLog | null;
  steps: number;
}

export interface ApexState {
  profile: UserProfile;
  today: DailyState;
  weightHistory: WeightLog[];
  dailyHistory: DailySnapshot[];   // compressed daily archives, last 30 days
  isOnboarded: boolean;            // true after first-run flow completes
  recentDecisions: DecisionRecord[];  // last 20 decisions Apex made
  brief: {
    text: string;
    anchors: [string, string, string];
    chips: string[];
    generatedAt: string | null;
    risk?: string;
    todaysMove?: string;
    todaysMoveWhy?: string;        // why this move matters most today
    focusItems?: string[];
    tonightRec?: string;           // single clear evening recommendation
  };
  messages: Array<{ role: "user" | "assistant"; content: string; id: string }>;
  logSheetOpen: boolean;
  logTab: "meal" | "weight" | "workout";
}

// Re-export DailySnapshot so consumers don't need to import from memory directly
export type { DailySnapshot };

// ─── Default state ────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  goals: [],
  preferences: [],
  decisionStyle: "direct",
  derailers: [],
  productiveWindows: [],
  currentPriorities: [],
  commonDecisionCategories: [],
  learnedInsights: [],
  dismissedInsights: [],
  generatedInsights: [],
  goal: "Build consistent high-performance habits",
  calorieTarget: 2100,
  proteinTarget: 155,
  stepTarget: 10000,
  units: "imperial",
  topPriority: "",
  firstMeeting: "",
};

const MOCK_BRIEF = {
  text: "Your morning window is your highest-leverage asset today. Protect it before it fills with reactive work and you lose the compound effect of focused effort.",
  todaysMove: "Lock a 90-minute no-interruption deep work block before noon.",
  todaysMoveWhy: "This creates more career momentum than anything else on today's schedule.",
  focusItems: [
    "Deep work block: your top priority — 90 min before noon",
    "Gym session — 45 min, keeps the training streak alive",
    "No non-essential spending today",
  ],
  tonightRec: "Stay in, cook dinner, and sleep before midnight.",
  anchors: [
    "Today's priority: your most important work",
    "Set your energy level above",
    "Apex is ready to help you decide",
  ] as [string, string, string],
  chips: ["Plan my day", "Should I go out tonight?", "Am I on track?"],
  generatedAt: new Date().toISOString(),
  risk: "Your biggest risk today is losing the afternoon to low-priority errands.",
};

function makeInitialState(): ApexState {
  return {
    profile: DEFAULT_PROFILE,
    today: {
      date: todayStr(),
      energyLevel: null,
      foodLogs: [],
      workoutLog: null,
      weightLog: null,
      steps: 0,
    },
    weightHistory: [],
    dailyHistory: [],
    isOnboarded: false,
    recentDecisions: [],
    brief: MOCK_BRIEF,
    messages: [],
    logSheetOpen: false,
    logTab: "meal",
  };
}

// ─── Migration helper — merges saved state with current shape ─────────────────
// Safe defaults for any new fields added after user's first session.
function migrate(saved: Partial<ApexState>): ApexState {
  const base = makeInitialState();
  const profile: UserProfile = {
    ...base.profile,
    ...saved.profile,
    // Ensure new V2.x fields exist even for old users
    goals:                      saved.profile?.goals                      ?? base.profile.goals,
    preferences:                saved.profile?.preferences                ?? base.profile.preferences,
    decisionStyle:              saved.profile?.decisionStyle              ?? base.profile.decisionStyle,
    derailers:                  saved.profile?.derailers                  ?? base.profile.derailers,
    productiveWindows:          saved.profile?.productiveWindows          ?? base.profile.productiveWindows,
    currentPriorities:          saved.profile?.currentPriorities          ?? base.profile.currentPriorities,
    commonDecisionCategories:   saved.profile?.commonDecisionCategories   ?? base.profile.commonDecisionCategories,
    learnedInsights:            saved.profile?.learnedInsights            ?? base.profile.learnedInsights,
    dismissedInsights:          saved.profile?.dismissedInsights          ?? base.profile.dismissedInsights,
    generatedInsights:          saved.profile?.generatedInsights          ?? base.profile.generatedInsights,
  };
  return {
    ...base,
    ...saved,
    profile,
    isOnboarded: saved.isOnboarded ?? false,
    recentDecisions: saved.recentDecisions ?? [],
    // Reset today if stale
    today: saved.today?.date !== todayStr() ? base.today : (saved.today ?? base.today),
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_ENERGY"; level: EnergyLevel }
  | { type: "ADD_FOOD_LOG"; log: FoodLog }
  | { type: "SET_WEIGHT"; weight: number }
  | { type: "SET_WORKOUT"; workout: WorkoutLog }
  | { type: "SET_BRIEF"; brief: ApexState["brief"] }
  | { type: "SET_PROFILE"; profile: Partial<UserProfile> }
  | { type: "SET_GOALS"; goals: string[] }
  | { type: "COMPLETE_ONBOARDING"; profile: Partial<UserProfile> }
  | { type: "ADD_LEARNED_INSIGHT"; insight: string }
  | { type: "SET_DECISION_STYLE"; style: DecisionStyle }
  | { type: "CONFIRM_INSIGHT"; insight: string }
  | { type: "DISMISS_INSIGHT"; insight: string }
  | { type: "EDIT_INSIGHT"; original: string; updated: string }
  | { type: "ADD_DECISION_RECORD"; record: DecisionRecord }
  | { type: "SET_DECISION_OUTCOME"; id: string; outcome: DecisionOutcome; reflection?: string }
  | { type: "ADD_GENERATED_INSIGHTS"; insights: string[] }
  | { type: "ADD_MESSAGE"; message: ApexState["messages"][0] }
  | { type: "SET_MESSAGES"; messages: ApexState["messages"] }
  | { type: "OPEN_LOG_SHEET"; tab?: ApexState["logTab"] }
  | { type: "CLOSE_LOG_SHEET" }
  | { type: "HYDRATE"; state: ApexState }
  | { type: "SET_PRIORITY"; priority: string }
  | { type: "SET_MEETING"; meeting: string }
  | { type: "SET_STEPS"; steps: number };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: ApexState, action: Action): ApexState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "SET_ENERGY":
      return { ...state, today: { ...state.today, energyLevel: action.level } };

    case "ADD_FOOD_LOG":
      return {
        ...state,
        today: { ...state.today, foodLogs: [...state.today.foodLogs, action.log] },
      };

    case "SET_WEIGHT": {
      const wl: WeightLog = { date: state.today.date, weight: action.weight };
      const history = state.weightHistory.filter(w => w.date !== state.today.date);
      return {
        ...state,
        today: { ...state.today, weightLog: wl },
        weightHistory: [...history, wl].sort((a, b) => a.date.localeCompare(b.date)),
      };
    }

    case "SET_WORKOUT":
      return { ...state, today: { ...state.today, workoutLog: action.workout } };

    case "SET_BRIEF":
      return { ...state, brief: action.brief };

    case "SET_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.profile } };

    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };

    case "SET_MESSAGES":
      return { ...state, messages: action.messages };

    case "OPEN_LOG_SHEET":
      return { ...state, logSheetOpen: true, logTab: action.tab ?? state.logTab };

    case "CLOSE_LOG_SHEET":
      return { ...state, logSheetOpen: false };

    case "SET_GOALS":
      return { ...state, profile: { ...state.profile, goals: action.goals } };

    case "COMPLETE_ONBOARDING":
      return { ...state, isOnboarded: true, profile: { ...state.profile, ...action.profile } };

    case "ADD_LEARNED_INSIGHT": {
      const existing = state.profile.learnedInsights || [];
      if (existing.includes(action.insight)) return state;
      return { ...state, profile: { ...state.profile, learnedInsights: [...existing, action.insight].slice(-20) } };
    }

    case "SET_DECISION_STYLE":
      return { ...state, profile: { ...state.profile, decisionStyle: action.style } };

    case "CONFIRM_INSIGHT": {
      const existing = state.profile.learnedInsights || [];
      if (existing.includes(action.insight)) return state;
      return { ...state, profile: { ...state.profile, learnedInsights: [...existing, action.insight].slice(-20) } };
    }

    case "DISMISS_INSIGHT": {
      const dismissed = state.profile.dismissedInsights || [];
      if (dismissed.includes(action.insight)) return state;
      return { ...state, profile: { ...state.profile, dismissedInsights: [...dismissed, action.insight] } };
    }

    case "EDIT_INSIGHT": {
      const existing = state.profile.learnedInsights || [];
      const filtered = existing.filter(i => i !== action.original);
      return { ...state, profile: { ...state.profile, learnedInsights: [...filtered, action.updated].slice(-20) } };
    }

    case "ADD_DECISION_RECORD": {
      const existing = state.recentDecisions || [];
      return { ...state, recentDecisions: [action.record, ...existing].slice(0, 20) };
    }

    case "SET_DECISION_OUTCOME": {
      return {
        ...state,
        recentDecisions: (state.recentDecisions || []).map(d =>
          d.id === action.id
            ? { ...d, outcome: action.outcome, reflection: action.reflection, reviewedAt: new Date().toISOString() }
            : d
        ),
      };
    }

    case "ADD_GENERATED_INSIGHTS": {
      const existing = state.profile.generatedInsights || [];
      const dismissed = new Set(state.profile.dismissedInsights || []);
      const confirmed = new Set(state.profile.learnedInsights || []);
      const truly_new = action.insights.filter(i => !dismissed.has(i) && !confirmed.has(i) && !existing.includes(i));
      return { ...state, profile: { ...state.profile, generatedInsights: [...existing, ...truly_new].slice(-30) } };
    }

    case "SET_PRIORITY":
      return { ...state, profile: { ...state.profile, topPriority: action.priority } };

    case "SET_MEETING":
      return { ...state, profile: { ...state.profile, firstMeeting: action.meeting } };

    case "SET_STEPS":
      return { ...state, today: { ...state.today, steps: action.steps } };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ApexContext = createContext<{
  state: ApexState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

const STORAGE_KEY = "apex_state_v1";

export function ApexProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, makeInitialState());

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ApexState;
        // New day: archive yesterday's data before resetting
        if (saved.today?.date !== todayStr()) {
          const caloriesEaten = (saved.today?.foodLogs ?? []).reduce((s, f) => s + f.calories, 0);
          const proteinEaten = (saved.today?.foodLogs ?? []).reduce((s, f) => s + f.protein, 0);
          const snapshot = buildSnapshot({
            date: saved.today?.date ?? todayStr(),
            calorieTarget: saved.profile?.calorieTarget ?? DEFAULT_PROFILE.calorieTarget,
            proteinTarget: saved.profile?.proteinTarget ?? DEFAULT_PROFILE.proteinTarget,
            stepTarget: saved.profile?.stepTarget ?? DEFAULT_PROFILE.stepTarget,
            caloriesEaten,
            proteinEaten: Math.round(proteinEaten),
            workoutLogged: saved.today?.workoutLog != null,
            workoutIntensity: saved.today?.workoutLog?.intensity,
            energyLevel: saved.today?.energyLevel ?? undefined,
            steps: saved.today?.steps ?? 0,
            foodLogCount: (saved.today?.foodLogs ?? []).length,
          });
          const existing = saved.dailyHistory ?? [];
          // Avoid duplicate entries for same date
          const deduped = existing.filter(s => s.date !== snapshot.date);
          saved.dailyHistory = [...deduped, snapshot].slice(-30);
          saved.today = { ...makeInitialState().today };
        }
        dispatch({ type: "HYDRATE", state: migrate(saved) });
      }
    } catch { /* fresh start */ }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state]);

  return (
    <ApexContext.Provider value={{ state, dispatch }}>
      {children}
    </ApexContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApex() {
  const ctx = useContext(ApexContext);
  if (!ctx) throw new Error("useApex must be used within ApexProvider");
  return ctx;
}

// ─── Derived selectors ────────────────────────────────────────────────────────

export function useTodayMacros() {
  const { state } = useApex();
  const eaten = state.today.foodLogs.reduce(
    (acc, f) => ({ cal: acc.cal + f.calories, protein: acc.protein + f.protein }),
    { cal: 0, protein: 0 }
  );
  return {
    caloriesEaten: eaten.cal,
    proteinEaten: Math.round(eaten.protein * 10) / 10,
    caloriesRemaining: Math.max(0, state.profile.calorieTarget - eaten.cal),
    proteinRemaining: Math.max(0, state.profile.proteinTarget - eaten.protein),
  };
}

export function useLatestWeight() {
  const { state } = useApex();
  const logs = state.weightHistory;
  return logs.length > 0 ? logs[logs.length - 1].weight : null;
}

// ─── ID generator ─────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10);
