/**
 * Local food database service — main entry point for food search.
 *
 * Search order:
 *   1. Local packaged foods (instant, no API)
 *   2. Restaurant foods (instant, no API)
 *   3. USDA FDC (async, requires API key)
 *   4. Open Food Facts (async, no key needed)
 *   5. Nutritionix (async, requires API key)
 *
 * All results are normalized to the same AppFood shape.
 */

import { packagedFoods } from '../data/samplePackagedFoods';
import { restaurantFoods } from '../data/sampleRestaurantFoods';
import { searchFoodDataCentral } from './foodDataCentral';
import { searchOpenFoodFacts } from './openFoodFacts';
import { calculateServingMacros } from '../utils/macroCalculations';

// ── Local search ─────────────────────────────────────────────────────────────

function scoreMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  const words = q.split(/\s+/);
  const matched = words.filter(w => t.includes(w)).length;
  return (matched / words.length) * 40;
}

export function searchLocalFoods(query, limit = 20) {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();

  const results = [
    ...packagedFoods.map(f => ({ ...f, _score: scoreMatch(`${f.name} ${f.brand || ''}`, q) })),
    ...restaurantFoods.map(f => ({ ...f, _score: scoreMatch(`${f.name} ${f.restaurant}`, q) })),
  ]
    .filter(f => f._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  return results;
}

export function searchLocalPackaged(query) {
  const q = query.toLowerCase();
  return packagedFoods.filter(f =>
    f.name.toLowerCase().includes(q) || (f.brand || '').toLowerCase().includes(q)
  );
}

export function searchLocalRestaurants(query) {
  const q = query.toLowerCase();
  return restaurantFoods.filter(f =>
    f.name.toLowerCase().includes(q) || f.restaurant.toLowerCase().includes(q)
  );
}

// ── Main search (local + optional remote) ────────────────────────────────────

/**
 * Search all food sources.
 * Returns results grouped by source type.
 */
export async function searchFoods(query, options = {}) {
  const { includeRemote = false, limit = 20 } = options;

  const local = searchLocalFoods(query, limit);
  if (!includeRemote) return { local, remote: [] };

  // Parallel remote fetch
  const [fdcResults, offResults] = await Promise.allSettled([
    searchFoodDataCentral(query, 5),
    searchOpenFoodFacts(query, 5),
  ]);

  const remote = [
    ...(fdcResults.status === 'fulfilled' ? fdcResults.value : []),
    ...(offResults.status === 'fulfilled' ? offResults.value : []),
  ];

  return { local, remote };
}

// ── Food log operations ───────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

const EMPTY_LOG = { breakfast: [], lunch: [], dinner: [], snacks: [] };

export function getDailyLog(date = todayStr()) {
  try {
    const raw = localStorage.getItem(`apex_daily_log_${date}`);
    return raw ? JSON.parse(raw) : { ...EMPTY_LOG };
  } catch { return { ...EMPTY_LOG }; }
}

export function saveDailyLog(log, date = todayStr()) {
  localStorage.setItem(`apex_daily_log_${date}`, JSON.stringify(log));
}

export function addFoodToLog(food, meal, quantity = 1, date = todayStr()) {
  const log = getDailyLog(date);
  const macros = calculateServingMacros(food, quantity);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    food,
    quantity,
    meal,
    addedAt: new Date().toISOString(),
    ...macros,
  };
  log[meal] = [...(log[meal] || []), entry];
  saveDailyLog(log, date);

  // Track recent foods
  addToRecent(food);
  return entry;
}

export function removeFoodFromLog(entryId, meal, date = todayStr()) {
  const log = getDailyLog(date);
  log[meal] = (log[meal] || []).filter(e => e.id !== entryId);
  saveDailyLog(log, date);
}

// ── Recent foods ─────────────────────────────────────────────────────────────

export function getRecentFoods() {
  try { return JSON.parse(localStorage.getItem('apex_recent_foods') || '[]'); }
  catch { return []; }
}

export function addToRecent(food) {
  const recents = getRecentFoods().filter(f => f.id !== food.id);
  const updated = [food, ...recents].slice(0, 20);
  localStorage.setItem('apex_recent_foods', JSON.stringify(updated));
}

// ── Favorite foods ────────────────────────────────────────────────────────────

export function getFavoriteFoods() {
  try { return JSON.parse(localStorage.getItem('apex_favorite_foods') || '[]'); }
  catch { return []; }
}

export function toggleFavorite(food) {
  const favs = getFavoriteFoods();
  const idx = favs.findIndex(f => f.id === food.id);
  const updated = idx >= 0 ? favs.filter(f => f.id !== food.id) : [food, ...favs];
  localStorage.setItem('apex_favorite_foods', JSON.stringify(updated));
  return idx < 0; // returns true if now favorited
}

export function isFavorite(foodId) {
  return getFavoriteFoods().some(f => f.id === foodId);
}

// ── Duplicate yesterday's meals ───────────────────────────────────────────────

export function getYesterdayLog() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDailyLog(yesterday.toISOString().slice(0, 10));
}

export function duplicateYesterdayMeals(mealType = null) {
  const yesterday = getYesterdayLog();
  const today = getDailyLog();

  if (mealType) {
    today[mealType] = (yesterday[mealType] || []).map(e => ({
      ...e,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      addedAt: new Date().toISOString(),
    }));
  } else {
    Object.keys(EMPTY_LOG).forEach(meal => {
      today[meal] = (yesterday[meal] || []).map(e => ({
        ...e,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        addedAt: new Date().toISOString(),
      }));
    });
  }

  saveDailyLog(today);
  return today;
}

// ── Daily totals ──────────────────────────────────────────────────────────────

export function getDailyTotals(log) {
  const all = Object.values(log).flat();
  return {
    calories: Math.round(all.reduce((s, e) => s + (e.calories || 0), 0)),
    protein: Math.round(all.reduce((s, e) => s + (e.protein || 0), 0) * 10) / 10,
    carbs: Math.round(all.reduce((s, e) => s + (e.carbs || 0), 0) * 10) / 10,
    fat: Math.round(all.reduce((s, e) => s + (e.fat || 0), 0) * 10) / 10,
    items: all.length,
  };
}
