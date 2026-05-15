/**
 * Unified Apex data store.
 * Single localStorage key: "apex.data"
 * Provides useApexStore() hook + helpers for all CRUD operations.
 */
import { useState, useCallback } from 'react';
import { weightLogs as sampleWeights, macroLogs as sampleMacros, workouts as sampleWorkouts, prs } from '../data/sampleData';

const KEY = 'apex.data';
const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Default store shape ───────────────────────────────────────────────────────

function defaultStore() {
  return {
    settings: {
      name: 'Naman',
      startWeight: 185,    // canonical: lbs
      goalWeight: 165,     // canonical: lbs
      startDate: '2026-05-01',
      goalDate: '2026-08-31',
      height: 71,          // canonical: inches
      dailyCalorieTarget: 2100,
      dailyProteinTarget: 180,
      dailyCarbTarget: 200,
      dailyFatTarget: 65,
      dailyStepTarget: 10000,
      waterTarget: 3.5,    // canonical: oz (stored as L legacy; treat as-is)
      tdee: 2600,
      units: 'imperial',   // 'imperial' | 'metric' — display only, does not change stored values
    },
    weightLogs: sampleWeights,
    foodLogs: {},
    savedMeals: defaultSavedMeals(),
    recipes: [],
    workouts: sampleWorkouts,
    prs: prs,
    progressPhotos: [],
    summerPlans: {
      goals: defaultGoals(),
      events: defaultEvents(),
      notes: 'This summer is different. Every choice compounds.',
    },
    calendarEvents: defaultCalendarEvents(),
    dailyCheckins: {},
    importedRecipes: [],
  };
}

function defaultGoals() {
  return [
    { id: '1', text: 'Hit 165 lbs by August 31', done: false, category: 'fitness' },
    { id: '2', text: 'Visible abs by summer', done: false, category: 'fitness' },
    { id: '3', text: 'Run a 5K under 25 minutes', done: false, category: 'fitness' },
    { id: '4', text: 'Beach trip in July — look your best', done: false, category: 'lifestyle' },
    { id: '5', text: 'Read 3 books this summer', done: false, category: 'growth' },
    { id: '6', text: 'Cold plunge every morning for 30 days', done: false, category: 'habits' },
  ];
}

function defaultEvents() {
  return [
    { id: '1', title: 'Beach Trip', date: '2026-07-15', emoji: '🏖️', category: 'lifestyle' },
    { id: '2', title: 'Progress Check-in', date: '2026-06-01', emoji: '📊', category: 'fitness' },
    { id: '3', title: 'Final Weigh-in', date: '2026-08-31', emoji: '🎯', category: 'fitness' },
  ];
}

function defaultCalendarEvents() {
  const today = todayStr();
  return [
    { id: '1', title: 'Leg Day', date: today, type: 'workout', emoji: '🦵' },
    { id: '2', title: 'Meal Prep Sunday', date: '2026-05-17', type: 'meal-prep', emoji: '🍱' },
    { id: '3', title: 'Progress Photo', date: '2026-05-20', type: 'progress', emoji: '📸' },
    { id: '4', title: 'Beach Trip', date: '2026-07-15', type: 'event', emoji: '🏖️' },
  ];
}

function defaultSavedMeals() {
  return [
    {
      id: 'meal-1', name: 'Chicken Rice Bowl', emoji: '🍗',
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
      totalCalories: 696, totalProtein: 62, totalCarbs: 51, totalFat: 22,
      items: [
        { name: 'Chicken Breast', servingSize: '200g', calories: 330, protein: 62, carbs: 0, fat: 7 },
        { name: 'Brown Rice', servingSize: '1 cup', calories: 216, protein: 5, carbs: 45, fat: 2 },
        { name: 'Broccoli', servingSize: '1 cup', calories: 31, protein: 3, carbs: 6, fat: 0 },
        { name: 'Olive Oil', servingSize: '1 tbsp', calories: 119, protein: 0, carbs: 0, fat: 14 },
      ],
      tags: ['high-protein', 'meal-prep'], frequency: 12, isFavorite: true,
    },
    {
      id: 'meal-2', name: 'Greek Yogurt Parfait', emoji: '🥛',
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
      totalCalories: 310, totalProtein: 28, totalCarbs: 35, totalFat: 6,
      items: [
        { name: 'Greek Yogurt (0%)', servingSize: '200g', calories: 110, protein: 20, carbs: 6, fat: 0 },
        { name: 'Mixed Berries', servingSize: '100g', calories: 57, protein: 1, carbs: 14, fat: 0 },
        { name: 'Granola', servingSize: '30g', calories: 120, protein: 3, carbs: 22, fat: 3 },
        { name: 'Honey', servingSize: '1 tsp', calories: 21, protein: 0, carbs: 6, fat: 0 },
      ],
      tags: ['breakfast', 'quick'], frequency: 8, isFavorite: true,
    },
    {
      id: 'meal-3', name: 'Protein Shake', emoji: '🥤',
      imageUrl: 'https://images.unsplash.com/photo-1553530979-7f1a2e34789e?auto=format&fit=crop&w=400&q=80',
      totalCalories: 280, totalProtein: 35, totalCarbs: 20, totalFat: 5,
      items: [
        { name: 'Whey Protein', servingSize: '1 scoop', calories: 120, protein: 25, carbs: 3, fat: 2 },
        { name: 'Banana', servingSize: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
        { name: 'Almond Milk', servingSize: '1 cup', calories: 30, protein: 1, carbs: 1, fat: 2.5 },
        { name: 'Peanut Butter', servingSize: '1 tbsp', calories: 94, protein: 4, carbs: 3, fat: 8 },
      ],
      tags: ['snack', 'quick', 'post-workout'], frequency: 20, isFavorite: false,
    },
    {
      id: 'meal-4', name: 'Egg Avocado Toast', emoji: '🥑',
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80',
      totalCalories: 380, totalProtein: 18, totalCarbs: 30, totalFat: 22,
      items: [
        { name: 'Sourdough Bread', servingSize: '2 slices', calories: 160, protein: 7, carbs: 30, fat: 2 },
        { name: 'Avocado', servingSize: '1/2 medium', calories: 120, protein: 1, carbs: 6, fat: 11 },
        { name: 'Eggs', servingSize: '2 large', calories: 143, protein: 13, carbs: 1, fat: 10 },
      ],
      tags: ['breakfast', 'no-cook'], frequency: 6, isFavorite: true,
    },
  ];
}

// ── Read / Write ──────────────────────────────────────────────────────────────

export function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function writeStore(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getOrInitStore() {
  const existing = readStore();
  if (existing) return existing;
  const defaults = defaultStore();
  writeStore(defaults);
  return defaults;
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useApexStore() {
  const [store, setStore] = useState(getOrInitStore);

  const update = useCallback((updater) => {
    setStore(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      writeStore(next);
      return next;
    });
  }, []);

  return [store, update];
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export function saveSettings(settings) {
  const store = getOrInitStore();
  writeStore({ ...store, settings });
}

// ── Weight log helpers ────────────────────────────────────────────────────────

export function addWeightEntry(date, weight) {
  const store = getOrInitStore();
  const existing = store.weightLogs.findIndex(e => e.date === date);
  const logs = existing >= 0
    ? store.weightLogs.map((e, i) => i === existing ? { date, weight } : e)
    : [...store.weightLogs, { date, weight }].sort((a, b) => a.date.localeCompare(b.date));
  writeStore({ ...store, weightLogs: logs });
  return logs;
}

export function deleteWeightEntry(date) {
  const store = getOrInitStore();
  writeStore({ ...store, weightLogs: store.weightLogs.filter(e => e.date !== date) });
}

// ── Food log helpers ──────────────────────────────────────────────────────────

const EMPTY_LOG = { breakfast: [], lunch: [], dinner: [], snacks: [] };

export function getFoodLog(date = todayStr()) {
  const store = getOrInitStore();
  return store.foodLogs[date] || { ...EMPTY_LOG };
}

export function addFoodEntry(food, meal, quantity = 1, date = todayStr()) {
  const store = getOrInitStore();
  const log = store.foodLogs[date] || { ...EMPTY_LOG };
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    food,
    meal,
    quantity,
    addedAt: new Date().toISOString(),
    calories: Math.round((food.calories || 0) * quantity),
    protein: Math.round((food.protein || 0) * quantity * 10) / 10,
    carbs: Math.round((food.carbs || 0) * quantity * 10) / 10,
    fat: Math.round((food.fat || 0) * quantity * 10) / 10,
  };
  const updated = { ...log, [meal]: [...(log[meal] || []), entry] };
  writeStore({ ...store, foodLogs: { ...store.foodLogs, [date]: updated } });

  // Track recents
  addToRecentFoods(food);
  return entry;
}

export function removeFoodEntry(entryId, meal, date = todayStr()) {
  const store = getOrInitStore();
  const log = store.foodLogs[date] || { ...EMPTY_LOG };
  const updated = { ...log, [meal]: (log[meal] || []).filter(e => e.id !== entryId) };
  writeStore({ ...store, foodLogs: { ...store.foodLogs, [date]: updated } });
}

export function getDailyTotals(date = todayStr()) {
  const log = getFoodLog(date);
  const all = Object.values(log).flat();
  return {
    calories: Math.round(all.reduce((s, e) => s + (e.calories || 0), 0)),
    protein: Math.round(all.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10,
    carbs: Math.round(all.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10,
    fat: Math.round(all.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10,
    items: all.length,
  };
}

// Copy yesterday's meals to today
export function copyYesterdayMeals(meal = null) {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const store = getOrInitStore();
  const yLog = store.foodLogs[yStr] || { ...EMPTY_LOG };
  const today = store.foodLogs[todayStr()] || { ...EMPTY_LOG };
  const restamp = (entries) => entries.map(e => ({
    ...e,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    addedAt: new Date().toISOString(),
  }));
  const updated = meal
    ? { ...today, [meal]: restamp(yLog[meal] || []) }
    : Object.fromEntries(Object.keys(EMPTY_LOG).map(m => [m, restamp(yLog[m] || [])]));
  writeStore({ ...store, foodLogs: { ...store.foodLogs, [todayStr()]: updated } });
}

// ── Recents ───────────────────────────────────────────────────────────────────

const RECENTS_KEY = 'apex.recents';

export function getRecentFoods() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); }
  catch { return []; }
}

export function addToRecentFoods(food) {
  const recents = getRecentFoods().filter(f => f.id !== food.id);
  localStorage.setItem(RECENTS_KEY, JSON.stringify([food, ...recents].slice(0, 30)));
}

// ── Saved meals ───────────────────────────────────────────────────────────────

export function getSavedMeals() {
  return getOrInitStore().savedMeals || [];
}

export function saveMeal(meal) {
  const store = getOrInitStore();
  const meals = store.savedMeals || [];
  const idx = meals.findIndex(m => m.id === meal.id);
  const updated = idx >= 0
    ? meals.map((m, i) => i === idx ? meal : m)
    : [meal, ...meals];
  writeStore({ ...store, savedMeals: updated });
}

export function deleteSavedMeal(id) {
  const store = getOrInitStore();
  writeStore({ ...store, savedMeals: (store.savedMeals || []).filter(m => m.id !== id) });
}

// ── Calendar events ───────────────────────────────────────────────────────────

export function getCalendarEvents() {
  return getOrInitStore().calendarEvents || [];
}

export function addCalendarEvent(event) {
  const store = getOrInitStore();
  const ev = { ...event, id: event.id || `ev-${Date.now()}` };
  writeStore({ ...store, calendarEvents: [...(store.calendarEvents || []), ev] });
}

export function deleteCalendarEvent(id) {
  const store = getOrInitStore();
  writeStore({ ...store, calendarEvents: (store.calendarEvents || []).filter(e => e.id !== id) });
}

// ── Daily check-in ────────────────────────────────────────────────────────────

export function getDailyCheckin(date = todayStr()) {
  return getOrInitStore().dailyCheckins?.[date] || { gamePlan: {}, note: '' };
}

export function saveDailyCheckin(date = todayStr(), checkin) {
  const store = getOrInitStore();
  writeStore({ ...store, dailyCheckins: { ...(store.dailyCheckins || {}), [date]: checkin } });
}

// ── Progress photos ───────────────────────────────────────────────────────────

export function getProgressPhotos() {
  return getOrInitStore().progressPhotos || [];
}

export function addProgressPhoto(photo) {
  const store = getOrInitStore();
  writeStore({ ...store, progressPhotos: [photo, ...(store.progressPhotos || [])] });
}

export function deleteProgressPhoto(id) {
  const store = getOrInitStore();
  writeStore({ ...store, progressPhotos: (store.progressPhotos || []).filter(p => p.id !== id) });
}

// ── Summer plans ──────────────────────────────────────────────────────────────

export function getSummerPlans() {
  return getOrInitStore().summerPlans || defaultStore().summerPlans;
}

export function saveSummerPlans(plans) {
  const store = getOrInitStore();
  writeStore({ ...store, summerPlans: plans });
}

// ── Workouts ──────────────────────────────────────────────────────────────────

export function getWorkouts() {
  return getOrInitStore().workouts || [];
}

export function addWorkout(workout) {
  const store = getOrInitStore();
  writeStore({ ...store, workouts: [workout, ...(store.workouts || [])] });
}

// ── Imported recipes ──────────────────────────────────────────────────────────

export function getImportedRecipes() {
  return getOrInitStore().importedRecipes || [];
}

export function saveImportedRecipe(recipe) {
  const store = getOrInitStore();
  const existing = (store.importedRecipes || []);
  const idx = existing.findIndex(r => r.id === recipe.id);
  const updated = idx >= 0
    ? existing.map((r, i) => i === idx ? recipe : r)
    : [recipe, ...existing];
  writeStore({ ...store, importedRecipes: updated });
}

export function deleteImportedRecipe(id) {
  const store = getOrInitStore();
  writeStore({ ...store, importedRecipes: (store.importedRecipes || []).filter(r => r.id !== id) });
}

export function updateImportedRecipe(id, changes) {
  const store = getOrInitStore();
  const updated = (store.importedRecipes || []).map(r => r.id === id ? { ...r, ...changes } : r);
  writeStore({ ...store, importedRecipes: updated });
}

// ── Export / Import ───────────────────────────────────────────────────────────

export function exportStoreAsJSON() {
  const data = getOrInitStore();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `apex-backup-${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url);
}

export function exportWeightCSV() {
  const { weightLogs } = getOrInitStore();
  const csv = ['Date,Weight (lbs)', ...weightLogs.map(e => `${e.date},${e.weight}`)].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `apex-weight-${todayStr()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function resetStore() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(RECENTS_KEY);
  // Clear old keys too
  Object.keys(localStorage).filter(k => k.startsWith('apex_')).forEach(k => localStorage.removeItem(k));
}
