/**
 * Unified food search — single entry point used by FoodCalories and other pages.
 *
 * Search order (each source adds a `source` label to results):
 *   1. Saved meals (instant)
 *   2. Recent foods (instant)
 *   3. Local packaged + restaurant foods (instant)
 *   4. USDA FoodData Central (async, requires VITE_USDA_API_KEY)
 *   5. Open Food Facts (async, no key needed)
 *
 * Progress callback: onProgress({ phase, done, count })
 *   phases: 'local' | 'usda' | 'off' | 'complete'
 */

import { searchLocalFoods } from './localFoodDatabase';
import { searchFoodDataCentral } from './foodDataCentral';
import { searchOpenFoodFacts } from './openFoodFacts';

const FDC_KEY = import.meta.env.VITE_USDA_API_KEY;
const DEV = import.meta.env.DEV;

// Source labels shown in the UI
export const SOURCE_META = {
  saved:        { label: 'Saved',       color: '#f59e0b' },
  recent:       { label: 'Recent',      color: '#a78bfa' },
  local:        { label: 'Local',       color: '#57534e' },
  usda:         { label: 'USDA',        color: '#10b981' },
  openfoodfacts:{ label: 'Open Food Facts', color: '#3b82f6' },
  spoonacular:  { label: 'Spoonacular', color: '#f97316' },
  nutritionix:  { label: 'Nutritionix', color: '#ec4899' },
  ai:           { label: 'AI',          color: '#f59e0b' },
};

/**
 * Main search function.
 *
 * @param {string}   query
 * @param {object}   opts
 * @param {object[]} opts.savedMeals    — from getSavedMeals()
 * @param {object[]} opts.recentFoods   — from getRecentFoods()
 * @param {boolean}  opts.remote        — whether to hit USDA + OFF (default true)
 * @param {function} opts.onProgress    — called as each source resolves
 * @returns {Promise<object[]>}         — deduplicated, sorted results
 */
export async function searchAllFoods(query, opts = {}) {
  const { savedMeals = [], recentFoods = [], remote = true, onProgress = () => {} } = opts;
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // ── Phase 1: instant local results ──────────────────────────────────────────
  const savedMatches = savedMeals
    .filter(m => m.name.toLowerCase().includes(q))
    .map(m => ({
      id: `saved-meal-${m.id}`,
      name: m.name,
      emoji: m.emoji || '🍽️',
      calories: m.totalCalories,
      protein: m.totalProtein,
      carbs: m.totalCarbs,
      fat: m.totalFat,
      servingSize: '1 serving',
      source: 'saved',
      _savedMeal: m,
    }));

  const recentMatches = recentFoods
    .filter(f => (f.name || '').toLowerCase().includes(q))
    .map(f => ({ ...f, source: f.source || 'recent', _isRecent: true }));

  const localMatches = searchLocalFoods(query, 15);

  const instantResults = dedup([...savedMatches, ...recentMatches, ...localMatches]);
  onProgress({ phase: 'local', done: false, count: instantResults.length });

  if (DEV) {
    console.group(`[FoodSearch] query="${query}"`);
    console.log(`  saved: ${savedMatches.length}, recent: ${recentMatches.length}, local: ${localMatches.length}`);
  }

  if (!remote) {
    if (DEV) { console.log('  (remote disabled)'); console.groupEnd(); }
    onProgress({ phase: 'complete', done: true, count: instantResults.length });
    return instantResults;
  }

  // ── Phase 2: async remote search ────────────────────────────────────────────
  const remoteResults = [];

  const [fdcResult, offResult] = await Promise.allSettled([
    FDC_KEY ? searchFoodDataCentral(query, 8) : Promise.resolve([]),
    searchOpenFoodFacts(query, 8),
  ]);

  if (fdcResult.status === 'fulfilled' && fdcResult.value.length) {
    remoteResults.push(...fdcResult.value.map(f => ({ ...f, source: 'usda' })));
    if (DEV) console.log(`  usda: ${fdcResult.value.length}`);
  } else if (!FDC_KEY && DEV) {
    console.log('  usda: skipped (no VITE_USDA_API_KEY)');
  }

  if (offResult.status === 'fulfilled' && offResult.value.length) {
    remoteResults.push(...offResult.value.map(f => ({ ...f, source: 'openfoodfacts' })));
    if (DEV) console.log(`  off: ${offResult.value.length}`);
  }

  if (DEV) console.groupEnd();

  const all = dedup([...instantResults, ...remoteResults]);
  onProgress({ phase: 'complete', done: true, count: all.length });
  return all;
}

/** Remove duplicates by name similarity */
function dedup(foods) {
  const seen = new Set();
  return foods.filter(f => {
    const key = (f.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Check which remote sources are available */
export function getSourceAvailability() {
  return {
    usda: !!FDC_KEY,
    openfoodfacts: true,
    spoonacular: !!import.meta.env.VITE_SPOONACULAR_API_KEY,
    nutritionix: !!(import.meta.env.VITE_NUTRITIONIX_APP_ID && import.meta.env.VITE_NUTRITIONIX_API_KEY),
  };
}
