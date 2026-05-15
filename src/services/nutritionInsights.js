/**
 * Nutrition Insights — pure JS, no React.
 * Analyses food logs to surface patterns, warnings, and suggestions.
 */

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function getDayTotals(log) {
  if (!log) return null;
  const all = Object.values(log).flat();
  if (!all.length) return null;
  return {
    calories: Math.round(all.reduce((s, e) => s + (e.calories || 0), 0)),
    protein:  Math.round(all.reduce((s, e) => s + (e.protein  || 0), 0) * 10) / 10,
    carbs:    Math.round(all.reduce((s, e) => s + (e.carbs    || 0), 0) * 10) / 10,
    fat:      Math.round(all.reduce((s, e) => s + (e.fat      || 0), 0) * 10) / 10,
    sodium:   Math.round(all.reduce((s, e) => s + (e.sodium   || 0), 0)),
    items:    all.length,
    hasBreakfast: (log.breakfast || []).length > 0,
    hasMeals: all.length > 0,
  };
}

// ── Main analyser ─────────────────────────────────────────────────────────────

export function analyseNutrition(store) {
  const settings = store.settings || {};
  const foodLogs = store.foodLogs || {};
  const calTarget  = settings.dailyCalorieTarget || 2100;
  const protTarget = settings.dailyProteinTarget  || 180;

  const days = [];
  for (let i = 0; i < 14; i++) {
    const d   = daysAgo(i);
    const tot = getDayTotals(foodLogs[d]);
    if (tot) days.push({ date: d, ...tot });
  }

  const last7  = days.filter(d => d.date >= daysAgo(7));
  const logged = last7.length;

  // Averages
  const avgCal  = logged ? Math.round(last7.reduce((s, d) => s + d.calories, 0) / logged) : 0;
  const avgProt = logged ? Math.round((last7.reduce((s, d) => s + d.protein,  0) / logged) * 10) / 10 : 0;
  const avgSod  = logged ? Math.round(last7.reduce((s, d) => s + (d.sodium || 0), 0) / logged) : 0;

  // Streak checks
  let proteinStreak = 0;   // days in a row hitting protein
  let lowProtStreak = 0;   // days in a row missing protein
  let skippedBreakfasts = 0;
  for (let i = 0; i < 7; i++) {
    const d = days.find(x => x.date === daysAgo(i));
    if (!d) continue;
    if (d.protein >= protTarget * 0.9) { proteinStreak++; lowProtStreak = 0; }
    else { lowProtStreak++; }
    if (!d.hasBreakfast) skippedBreakfasts++;
  }

  // High-sodium days
  const highSodiumDays = last7.filter(d => d.sodium > 2300).length;

  // Best day (highest protein relative to calories)
  const bestDay = last7.reduce((best, d) => {
    const ratio = d.protein / Math.max(d.calories, 1);
    return ratio > (best?.ratio || 0) ? { ...d, ratio } : best;
  }, null);

  // Today's quick status
  const today     = getDayTotals(foodLogs[todayStr()]);
  const todayCal  = today?.calories || 0;
  const todayProt = today?.protein  || 0;
  const calRemain = Math.max(0, calTarget  - todayCal);
  const protRemain = Math.max(0, protTarget - todayProt);

  // Insights array
  const insights = [];

  if (logged < 3) {
    insights.push({ type: 'warning', icon: '📊', title: 'Low logging consistency', body: `Only ${logged} of last 7 days tracked. Consistent logging unlocks real patterns.`, severity: 'medium' });
  }
  if (lowProtStreak >= 3) {
    insights.push({ type: 'warning', icon: '🥩', title: `${lowProtStreak}-day protein deficit`, body: `You've missed your protein target ${lowProtStreak} days in a row. This slows recovery and muscle retention.`, severity: 'high' });
  }
  if (proteinStreak >= 3) {
    insights.push({ type: 'success', icon: '💪', title: `${proteinStreak}-day protein streak`, body: `Hitting ${protTarget}g protein consistently. Your body thanks you.`, severity: 'low' });
  }
  if (highSodiumDays >= 3) {
    insights.push({ type: 'warning', icon: '🧂', title: 'High sodium pattern', body: `${highSodiumDays} days this week above 2,300mg sodium. May cause water retention and bloat.`, severity: 'medium' });
  }
  if (skippedBreakfasts >= 4) {
    insights.push({ type: 'info', icon: '🌅', title: `Skipping breakfast ${skippedBreakfasts}× this week`, body: 'Missing morning meals can spike afternoon hunger and make hitting protein harder.', severity: 'low' });
  }
  if (avgCal > calTarget * 1.15 && logged >= 3) {
    insights.push({ type: 'warning', icon: '🔥', title: 'Trending over target', body: `Averaging ${avgCal} cal vs your ${calTarget} goal. ${Math.round(avgCal - calTarget)} excess per day.`, severity: 'medium' });
  }
  if (avgCal < calTarget * 0.7 && logged >= 3) {
    insights.push({ type: 'info', icon: '📉', title: 'Very low calorie days', body: `Averaging only ${avgCal} cal. Too low risks muscle loss and metabolic slowdown.`, severity: 'medium' });
  }
  if (today && todayProt >= protTarget * 0.9) {
    insights.push({ type: 'success', icon: '✅', title: 'Protein target hit today', body: `${todayProt}g logged. Recovery and muscle retention are covered.`, severity: 'low' });
  }

  // Meal timing — check if eating late (snacks logged but no breakfast/lunch)
  const todayLog = foodLogs[todayStr()];
  if (todayLog) {
    const hasSnacks  = (todayLog.snacks || []).length > 0;
    const hasLunch   = (todayLog.lunch   || []).length > 0;
    const hasDinner  = (todayLog.dinner  || []).length > 0;
    const noEarly    = !today?.hasBreakfast && !hasLunch;
    if (hasSnacks && noEarly && hasDinner) {
      insights.push({ type: 'info', icon: '🌙', title: 'Late-heavy eating pattern', body: 'Most calories logged after evening. Front-loading meals improves satiety and protein timing.', severity: 'low' });
    }
  }

  // Protein suggestion
  const proteinSuggestions = [];
  if (todayProt < protTarget * 0.6 && todayCal < calTarget * 0.9) {
    const gap = Math.round(protTarget - todayProt);
    proteinSuggestions.push(`Add ~${gap}g protein to hit today's target`);
    if (gap > 50) proteinSuggestions.push('Consider: chicken breast (31g/100g), Greek yogurt (10g/100g), whey shake (25g)');
  }

  return {
    logged,
    avgCal,
    avgProt,
    avgSodium: avgSod,
    proteinStreak,
    lowProtStreak,
    skippedBreakfasts,
    highSodiumDays,
    bestDay,
    today: today ? {
      calories: todayCal,
      protein:  todayProt,
      calRemaining:  calRemain,
      protRemaining: protRemain,
      hasBreakfast: today.hasBreakfast,
    } : null,
    insights: insights.slice(0, 5),
    proteinSuggestions,
    // Adherence score 0-100
    adherenceScore: Math.round(Math.min(100,
      (logged / 7) * 40 +
      (Math.min(proteinStreak, 7) / 7) * 40 +
      (highSodiumDays === 0 ? 20 : Math.max(0, 20 - highSodiumDays * 4))
    )),
  };
}

// ── Favourite foods ────────────────────────────────────────────────────────────

export function getFavouriteFoods(store, limit = 10) {
  const foodLogs = store.foodLogs || {};
  const counts   = {};

  Object.values(foodLogs).forEach(dayLog => {
    Object.values(dayLog).flat().forEach(entry => {
      const key = entry.food?.id || entry.food?.name;
      if (!key) return;
      counts[key] = counts[key] || { food: entry.food, count: 0 };
      counts[key].count++;
    });
  });

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ── Meal templates from history ───────────────────────────────────────────────

export function getMealTemplates(store) {
  // Surfaces repeating same-meal combinations as templates
  const foodLogs = store.foodLogs || {};
  const mealSigs = {};

  Object.values(foodLogs).forEach(dayLog => {
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      const entries = dayLog[meal] || [];
      if (entries.length < 2) return;
      const sig = entries.map(e => e.food?.name || '').sort().join('|');
      if (!sig) return;
      mealSigs[sig] = mealSigs[sig] || { meal, entries, count: 0 };
      mealSigs[sig].count++;
    });
  });

  return Object.values(mealSigs)
    .filter(t => t.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// ── Post-workout nutrition detection ──────────────────────────────────────────

export function getPostWorkoutPatterns(store) {
  const workouts = store.workouts || [];
  const foodLogs = store.foodLogs || {};

  const patterns = workouts
    .filter(w => w.date)
    .map(w => {
      const log     = foodLogs[w.date];
      const entries = log ? Object.values(log).flat() : [];
      const protein = entries.reduce((s, e) => s + (e.protein || 0), 0);
      return { date: w.date, workout: w.name || 'Workout', protein: Math.round(protein) };
    })
    .filter(p => p.protein > 0);

  const avgPostProtein = patterns.length
    ? Math.round(patterns.reduce((s, p) => s + p.protein, 0) / patterns.length)
    : null;

  return { patterns: patterns.slice(0, 7), avgPostProtein };
}
