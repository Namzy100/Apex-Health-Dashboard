/**
 * useDashboardData — aggregates all dashboard-relevant data in one place.
 * Memoises expensive derivations so Dashboard.jsx stays clean.
 */
import { useMemo } from 'react';
import { useApexStore, getDailyTotals } from '../store/apexStore';
import { computeMomentum } from '../services/momentumEngine';
import { analyseNutrition } from '../services/nutritionInsights';
import { analyseJournal } from '../services/journalInsights';
import { analyseSchedule } from '../services/scheduleEngine';
import { analyzeHabitsPatterns, analyzeGoalsProgress } from '../services/aiCoach';

export function useDashboardData() {
  const [store, update] = useApexStore();

  // Heavy computations — memoised independently so each only reruns
  // when the store slice it reads actually changes (store is a new reference
  // after any mutation, so all run together — still better than computing in
  // the render body of Dashboard which runs for every keystroke/interaction).

  const momentum   = useMemo(() => computeMomentum(store),    [store]);
  const nutrition  = useMemo(() => analyseNutrition(store),   [store]);
  const journal    = useMemo(() => analyseJournal(store),     [store]);
  const schedule   = useMemo(() => analyseSchedule(store),    [store]);
  const habits     = useMemo(() => analyzeHabitsPatterns(store), [store]);
  const goals      = useMemo(() => analyzeGoalsProgress(store),  [store]);
  const totals     = useMemo(() => getDailyTotals(),           [store]);

  // Time of day
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Dynamic greeting
  const name = store.settings?.name || 'there';
  const greetings = {
    morning:   `Good morning, ${name} ☀️`,
    afternoon: `Good afternoon, ${name} 🌤`,
    evening:   `Good evening, ${name} 🌙`,
  };
  const greeting = greetings[timeOfDay];

  return {
    store,
    update,
    momentum,
    nutrition,
    journal,
    schedule,
    habits,
    goals,
    totals,
    timeOfDay,
    greeting,
    settings: store.settings,
  };
}
