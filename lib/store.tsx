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

export interface UserProfile {
  name: string;
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
  brief: {
    text: string;
    anchors: [string, string, string];
    chips: string[];
    generatedAt: string | null;
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
  name: "Naman",
  goal: "Lose 15 lbs by August 31, 2026",
  calorieTarget: 2100,
  proteinTarget: 155,
  stepTarget: 10000,
  units: "imperial",
  topPriority: "Close the Stripe integration",
  firstMeeting: "2:00 PM",
};

const MOCK_BRIEF = {
  text: "You've been under-eating all week and your energy is starting to show it. Today is your cleanest morning in days — protect it. The Stripe integration is still the bottleneck, so nothing else matters until that moves. Eat properly, get one deep work block in before noon, and lift light tonight.",
  anchors: [
    "Eat 2,100 cal · hit 155g protein",
    "First meeting: 2:00 PM",
    "Log weight after you step off the scale",
  ] as [string, string, string],
  chips: ["What should I eat?", "Plan my morning", "Am I on track?"],
  generatedAt: new Date().toISOString(),
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
    brief: MOCK_BRIEF,
    messages: [],
    logSheetOpen: false,
    logTab: "meal",
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
        dispatch({ type: "HYDRATE", state: { ...makeInitialState(), ...saved } });
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
