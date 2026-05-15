/**
 * lifeSelectors.js — Apex Life OS Intelligence Layer
 *
 * Pure, side-effect-free selectors that derive computed state from a store
 * snapshot. No React imports. No mutations. Safe to call in any context.
 *
 * All functions accept a `store` object matching the Apex store shape and
 * return plain values. Edge cases (empty store, missing keys, undefined
 * values) are handled defensively throughout.
 */

// ── Internal Helpers ──────────────────────────────────────────────────────────

/** Returns today's date string as 'YYYY-MM-DD' in local time. */
const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Returns a date string N days before (negative) or after (positive) the
 * given date string. Works with 'YYYY-MM-DD' format.
 */
function offsetDate(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the number of calendar days between two 'YYYY-MM-DD' strings.
 * Positive if b is after a.
 */
function daysBetween(a, b) {
  const msA = new Date(`${a}T00:00:00`).getTime();
  const msB = new Date(`${b}T00:00:00`).getTime();
  return Math.round((msB - msA) / 86400000);
}

/** Safely returns a number, defaulting to 0 for NaN/null/undefined. */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ── Exported Selectors ────────────────────────────────────────────────────────

/**
 * getDayFoodTotals(dayLog)
 *
 * Sums up macros for a single day's food log entry.
 * dayLog shape: { breakfast: [], lunch: [], dinner: [], snacks: [] }
 * Each item may carry { calories, protein, carbs, fat } at the top level
 * (as stored by addFoodEntry) or inside a nested `food` object.
 *
 * @param {Object|null|undefined} dayLog
 * @returns {{ calories: number, protein: number, carbs: number, fat: number }}
 */
export function getDayFoodTotals(dayLog) {
  if (!dayLog || typeof dayLog !== 'object') {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const meals = ['breakfast', 'lunch', 'dinner', 'snacks'];
  let calories = 0, protein = 0, carbs = 0, fat = 0;

  for (const meal of meals) {
    const items = Array.isArray(dayLog[meal]) ? dayLog[meal] : [];
    for (const item of items) {
      // Items stored by addFoodEntry already have top-level macros
      calories += num(item.calories);
      protein  += num(item.protein);
      carbs    += num(item.carbs);
      fat      += num(item.fat);
    }
  }

  return {
    calories: Math.round(calories),
    protein:  Math.round(protein * 10) / 10,
    carbs:    Math.round(carbs * 10) / 10,
    fat:      Math.round(fat * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getMomentumScore(store)
 *
 * Computes a 0–100 momentum score from five subsystems.
 *
 * Breakdown weights:
 *   habits    — 25 pts  (ratio of completed/active habits today)
 *   nutrition — 35 pts  (protein 20 pts + calorie adherence 15 pts)
 *   workout   — 20 pts  (recency of last logged workout)
 *   journal   — 10 pts  (whether today's journal entry exists)
 *   streak    — 10 pts  (consecutive days with ≥60% habits done)
 *
 * @param {Object} store
 * @returns {{ score: number, breakdown: Object, trend: number|null, label: string }}
 */
export function getMomentumScore(store) {
  const s = store || {};
  const today = todayStr();
  const settings  = s.settings  || {};
  const habits    = Array.isArray(s.habits) ? s.habits : [];
  const habitLogs = s.habitLogs  || {};
  const foodLogs  = s.foodLogs   || {};
  const workouts  = Array.isArray(s.workouts) ? s.workouts : [];
  const journalEntries = s.journalEntries || {};

  // ── Habits component (25 pts) ─────────────────────────────────────────────
  const activeHabits = habits.filter(h => h.active);
  const todayLog = habitLogs[today] || {};
  const doneCount = activeHabits.filter(h => !!todayLog[h.id]).length;
  const habitRatio = activeHabits.length > 0 ? doneCount / activeHabits.length : 0;
  const habitsScore = Math.round(habitRatio * 25);

  // ── Protein component (20 pts) ────────────────────────────────────────────
  const proteinTarget = num(settings.dailyProteinTarget) || 180;
  const todayTotals   = getDayFoodTotals(foodLogs[today]);
  const proteinRatio  = Math.min(todayTotals.protein / proteinTarget, 1);
  const proteinScore  = Math.round(proteinRatio * 20);

  // ── Calorie adherence component (15 pts) ──────────────────────────────────
  const calTarget  = num(settings.dailyCalorieTarget) || 2100;
  const calLogged  = todayTotals.calories;
  const calRatio   = calTarget > 0 ? calLogged / calTarget : 0;
  let calorieScore;
  if (calRatio >= 0.8 && calRatio <= 1.1) {
    calorieScore = 15;
  } else if (calRatio >= 0.6 && calRatio < 0.8) {
    calorieScore = Math.round(0.7 * 15);
  } else {
    calorieScore = Math.round(0.4 * 15);
  }
  // If nothing is logged at all, treat calorie adherence as 0
  if (calLogged === 0) calorieScore = 0;

  // ── Workout component (20 pts) ────────────────────────────────────────────
  let workoutScore = 0;
  let lastWorkoutDate = null;
  if (workouts.length > 0) {
    // Find most recent workout date
    const sorted = [...workouts]
      .filter(w => w.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length > 0) {
      lastWorkoutDate = sorted[0].date;
      const daysSince = daysBetween(lastWorkoutDate, today);
      if (daysSince <= 2) {
        workoutScore = 20;
      } else if (daysSince <= 5) {
        workoutScore = 10;
      }
    }
  }

  // ── Journal component (10 pts) ────────────────────────────────────────────
  const journalScore = journalEntries[today] ? 10 : 0;

  // ── Streak component (10 pts) ─────────────────────────────────────────────
  // Count consecutive past days (including today) with ≥60% habit completion
  let streak = 0;
  if (activeHabits.length > 0) {
    for (let i = 0; i <= 365; i++) {
      const d = offsetDate(today, -i);
      const log = habitLogs[d] || {};
      const done = activeHabits.filter(h => !!log[h.id]).length;
      if (done / activeHabits.length >= 0.6) {
        streak++;
      } else {
        break;
      }
    }
  }
  const streakScore = Math.min(Math.round((streak / 10) * 10), 10);

  // ── Totals ────────────────────────────────────────────────────────────────
  const score = habitsScore + proteinScore + calorieScore + workoutScore + journalScore + streakScore;

  // ── Trend: compare to yesterday's score snapshot (best-effort) ───────────
  // We recompute yesterday's score using the same logic where possible.
  let trend = null;
  try {
    const yesterday = offsetDate(today, -1);
    const yLog   = habitLogs[yesterday] || {};
    const yDone  = activeHabits.filter(h => !!yLog[h.id]).length;
    const yHabitsScore = activeHabits.length > 0
      ? Math.round((yDone / activeHabits.length) * 25)
      : 0;
    const yTotals  = getDayFoodTotals(foodLogs[yesterday]);
    const yProtein = Math.min(yTotals.protein / proteinTarget, 1);
    const yProteinScore = Math.round(yProtein * 20);
    const yCalRatio = calTarget > 0 ? yTotals.calories / calTarget : 0;
    let yCalScore;
    if (yTotals.calories === 0) {
      yCalScore = 0;
    } else if (yCalRatio >= 0.8 && yCalRatio <= 1.1) {
      yCalScore = 15;
    } else if (yCalRatio >= 0.6 && yCalRatio < 0.8) {
      yCalScore = Math.round(0.7 * 15);
    } else {
      yCalScore = Math.round(0.4 * 15);
    }
    // Workout score: use same lastWorkoutDate logic against yesterday
    let yWorkoutScore = 0;
    if (lastWorkoutDate) {
      const yDaysSince = daysBetween(lastWorkoutDate, yesterday);
      if (yDaysSince <= 2) yWorkoutScore = 20;
      else if (yDaysSince <= 5) yWorkoutScore = 10;
    }
    const yJournalScore = journalEntries[yesterday] ? 10 : 0;
    const yScore = yHabitsScore + yProteinScore + yCalScore + yWorkoutScore + yJournalScore;
    trend = score - yScore;
  } catch {
    trend = null;
  }

  // ── Label ──────────────────────────────────────────────────────────────────
  let label;
  if (score >= 85)      label = 'On Fire';
  else if (score >= 70) label = 'Strong';
  else if (score >= 50) label = 'Steady';
  else if (score >= 30) label = 'Building';
  else                  label = 'Just Starting';

  return {
    score,
    breakdown: {
      habits:    habitsScore,
      nutrition: proteinScore + calorieScore,
      workout:   workoutScore,
      journal:   journalScore,
      streak:    streakScore,
    },
    trend,
    label,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getTodaySummary(store)
 *
 * Produces a comprehensive snapshot of today across all tracked domains.
 *
 * @param {Object} store
 * @returns {{
 *   habits:    { done: number, total: number, pct: number },
 *   calories:  { logged: number, target: number, pct: number, remaining: number },
 *   protein:   { logged: number, target: number, pct: number, remaining: number },
 *   workout:   { hasToday: boolean, lastDate: string|null, daysSince: number|null },
 *   journal:   { hasToday: boolean, mood: string|null, snippet: string|null },
 *   nextEvent: { title: string, date: string, emoji: string, daysUntil: number }|null,
 *   upcomingDeadlines: Array<{ title: string, daysLeft: number, progress: number }>
 * }}
 */
export function getTodaySummary(store) {
  const s = store || {};
  const today = todayStr();
  const settings       = s.settings       || {};
  const habits         = Array.isArray(s.habits)         ? s.habits         : [];
  const habitLogs      = s.habitLogs      || {};
  const foodLogs       = s.foodLogs       || {};
  const workouts       = Array.isArray(s.workouts)       ? s.workouts       : [];
  const journalEntries = s.journalEntries || {};
  const goals          = Array.isArray(s.goals)          ? s.goals          : [];
  const calendarEvents = Array.isArray(s.calendarEvents) ? s.calendarEvents : [];

  // ── Habits ────────────────────────────────────────────────────────────────
  const activeHabits = habits.filter(h => h.active);
  const todayHabitLog = habitLogs[today] || {};
  const done  = activeHabits.filter(h => !!todayHabitLog[h.id]).length;
  const total = activeHabits.length;
  const habitPct = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Calories ──────────────────────────────────────────────────────────────
  const calTarget     = num(settings.dailyCalorieTarget) || 2100;
  const todayTotals   = getDayFoodTotals(foodLogs[today]);
  const calLogged     = todayTotals.calories;
  const calPct        = calTarget > 0 ? Math.round((calLogged / calTarget) * 100) : 0;
  const calRemaining  = Math.max(calTarget - calLogged, 0);

  // ── Protein ───────────────────────────────────────────────────────────────
  const proteinTarget    = num(settings.dailyProteinTarget) || 180;
  const proteinLogged    = todayTotals.protein;
  const proteinPct       = proteinTarget > 0 ? Math.round((proteinLogged / proteinTarget) * 100) : 0;
  const proteinRemaining = Math.max(proteinTarget - proteinLogged, 0);

  // ── Workout ───────────────────────────────────────────────────────────────
  const hasWorkoutToday = workouts.some(w => w.date === today);
  let lastWorkoutDate = null;
  let daysSince = null;
  if (workouts.length > 0) {
    const sorted = [...workouts]
      .filter(w => w.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length > 0) {
      lastWorkoutDate = sorted[0].date;
      daysSince = daysBetween(lastWorkoutDate, today);
    }
  }

  // ── Journal ───────────────────────────────────────────────────────────────
  const todayJournal = journalEntries[today] || null;
  const hasJournalToday = !!todayJournal;
  const journalMood = todayJournal?.mood || null;
  const journalSnippet = todayJournal?.text
    ? String(todayJournal.text).slice(0, 80) + (todayJournal.text.length > 80 ? '…' : '')
    : null;

  // ── Next calendar event ───────────────────────────────────────────────────
  const futureEvents = calendarEvents
    .filter(e => e.date && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  let nextEvent = null;
  if (futureEvents.length > 0) {
    const ev = futureEvents[0];
    nextEvent = {
      title:     ev.title  || '',
      date:      ev.date,
      emoji:     ev.emoji  || '',
      daysUntil: daysBetween(today, ev.date),
    };
  }

  // ── Upcoming goal deadlines ───────────────────────────────────────────────
  const upcomingDeadlines = goals
    .filter(g => !g.done && g.targetDate && g.targetDate > today)
    .map(g => ({
      title:    g.title || '',
      daysLeft: daysBetween(today, g.targetDate),
      progress: num(g.progress),
    }))
    .filter(g => g.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    habits:    { done, total, pct: habitPct },
    calories:  { logged: calLogged, target: calTarget, pct: calPct, remaining: calRemaining },
    protein:   { logged: proteinLogged, target: proteinTarget, pct: proteinPct, remaining: proteinRemaining },
    workout:   { hasToday: hasWorkoutToday, lastDate: lastWorkoutDate, daysSince },
    journal:   { hasToday: hasJournalToday, mood: journalMood, snippet: journalSnippet },
    nextEvent,
    upcomingDeadlines,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getWeakHabits(store)
 *
 * Finds habits that were missed 4 or more times in the last 7 days.
 * Only considers active habits.
 *
 * @param {Object} store
 * @returns {Array<{ id: string, name: string, emoji: string, missedDays: number }>}
 */
export function getWeakHabits(store) {
  const s = store || {};
  const today    = todayStr();
  const habits   = Array.isArray(s.habits) ? s.habits.filter(h => h.active) : [];
  const habitLogs = s.habitLogs || {};

  if (habits.length === 0) return [];

  // Build the last 7 days (today inclusive)
  const last7 = Array.from({ length: 7 }, (_, i) => offsetDate(today, -i));

  return habits
    .map(habit => {
      const missedDays = last7.filter(d => {
        const log = habitLogs[d] || {};
        return !log[habit.id];
      }).length;
      return { id: habit.id, name: habit.name, emoji: habit.emoji || '', missedDays };
    })
    .filter(h => h.missedDays >= 4)
    .sort((a, b) => b.missedDays - a.missedDays);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getNutritionCompliance(store)
 *
 * Summarises calorie and protein adherence over the last 7 days.
 * Days with no food logged are excluded from averages but counted in daysLogged.
 *
 * @param {Object} store
 * @returns {{
 *   avgCalPct:      number,
 *   avgProteinPct:  number,
 *   daysLogged:     number,
 *   lowProteinDays: number,
 *   overCalDays:    number
 * }}
 */
export function getNutritionCompliance(store) {
  const s = store || {};
  const today    = todayStr();
  const settings = s.settings  || {};
  const foodLogs = s.foodLogs  || {};

  const calTarget     = num(settings.dailyCalorieTarget) || 2100;
  const proteinTarget = num(settings.dailyProteinTarget) || 180;

  const last7 = Array.from({ length: 7 }, (_, i) => offsetDate(today, -i));

  let totalCalPct = 0;
  let totalProteinPct = 0;
  let daysLogged = 0;
  let lowProteinDays = 0;
  let overCalDays = 0;

  for (const d of last7) {
    const dayLog = foodLogs[d];
    if (!dayLog) continue;

    const totals = getDayFoodTotals(dayLog);
    // Skip days where nothing was actually logged
    if (totals.calories === 0 && totals.protein === 0) continue;

    daysLogged++;
    const calPct = calTarget > 0 ? (totals.calories / calTarget) * 100 : 0;
    const proteinPct = proteinTarget > 0 ? (totals.protein / proteinTarget) * 100 : 0;

    totalCalPct     += calPct;
    totalProteinPct += proteinPct;

    if (proteinPct < 80) lowProteinDays++;
    if (calPct > 110)    overCalDays++;
  }

  return {
    avgCalPct:      daysLogged > 0 ? Math.round(totalCalPct / daysLogged)     : 0,
    avgProteinPct:  daysLogged > 0 ? Math.round(totalProteinPct / daysLogged) : 0,
    daysLogged,
    lowProteinDays,
    overCalDays,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getGoalRiskAnalysis(store)
 *
 * Assesses risk level for each active goal that has a target date.
 *
 *   high:   < 7 days remaining AND progress < 80%
 *   medium: < 21 days remaining AND progress < 50%
 *   low:    everything else
 *
 * @param {Object} store
 * @returns {Array<{
 *   goal:     Object,
 *   daysLeft: number,
 *   risk:     'high'|'medium'|'low',
 *   reason:   string
 * }>}
 */
export function getGoalRiskAnalysis(store) {
  const s = store || {};
  const today = todayStr();
  const goals = Array.isArray(s.goals) ? s.goals : [];

  return goals
    .filter(g => !g.done && g.targetDate)
    .map(g => {
      const daysLeft = daysBetween(today, g.targetDate);
      const progress = num(g.progress);
      let risk;
      let reason;

      if (daysLeft < 7 && progress < 80) {
        risk   = 'high';
        reason = `Only ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left and progress is at ${progress}%.`;
      } else if (daysLeft < 21 && progress < 50) {
        risk   = 'medium';
        reason = `${daysLeft} days remaining with progress at ${progress}% — pace needs to increase.`;
      } else {
        risk   = 'low';
        reason = daysLeft < 0
          ? 'Goal deadline has passed.'
          : `On track with ${daysLeft} days remaining.`;
      }

      return { goal: g, daysLeft, risk, reason };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.risk] - order[b.risk]) || (a.daysLeft - b.daysLeft);
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getMoodTrend(store)
 *
 * Analyses journal mood entries for the last 7 days.
 * hasBadStreak is true when 3 or more consecutive days have mood 'rough' or 'tired'.
 *
 * @param {Object} store
 * @returns {{
 *   entries:       Array<{ date: string, mood: string|null }>,
 *   dominantMood:  string|null,
 *   hasBadStreak:  boolean
 * }}
 */
export function getMoodTrend(store) {
  const s = store || {};
  const today          = todayStr();
  const journalEntries = s.journalEntries || {};
  const BAD_MOODS      = new Set(['rough', 'tired']);

  // Build entries oldest-first for streak detection, then reverse for output
  const last7Asc = Array.from({ length: 7 }, (_, i) => offsetDate(today, -(6 - i)));
  const entries  = last7Asc.map(d => ({
    date: d,
    mood: journalEntries[d]?.mood || null,
  }));

  // Dominant mood: most frequent non-null mood
  const moodCounts = {};
  for (const { mood } of entries) {
    if (mood) moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  }
  const dominantMood = Object.keys(moodCounts).length > 0
    ? Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Bad streak: 3+ consecutive 'rough' or 'tired' days
  let maxConsecutiveBad = 0;
  let currentRun = 0;
  for (const { mood } of entries) {
    if (mood && BAD_MOODS.has(mood)) {
      currentRun++;
      maxConsecutiveBad = Math.max(maxConsecutiveBad, currentRun);
    } else {
      currentRun = 0;
    }
  }
  const hasBadStreak = maxConsecutiveBad >= 3;

  // Return newest-first
  return {
    entries: [...entries].reverse(),
    dominantMood,
    hasBadStreak,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getUpcomingDeadlines(store)
 *
 * Returns active goals with a target date, sorted ascending by that date,
 * each annotated with daysLeft.
 *
 * @param {Object} store
 * @returns {Array<Object & { daysLeft: number }>}
 */
export function getUpcomingDeadlines(store) {
  const s = store || {};
  const today = todayStr();
  const goals = Array.isArray(s.goals) ? s.goals : [];

  return goals
    .filter(g => !g.done && g.targetDate)
    .map(g => ({ ...g, daysLeft: daysBetween(today, g.targetDate) }))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getWeeklyInsights(store)
 *
 * Produces up to 5 plain-English insight strings from cross-system data
 * over the last 7 days.
 *
 * @param {Object} store
 * @returns {string[]}
 */
export function getWeeklyInsights(store) {
  const s = store || {};
  const today    = todayStr();
  const habits   = Array.isArray(s.habits) ? s.habits.filter(h => h.active) : [];
  const habitLogs = s.habitLogs || {};
  const foodLogs  = s.foodLogs  || {};
  const workouts  = Array.isArray(s.workouts) ? s.workouts : [];
  const journalEntries = s.journalEntries || {};
  const goals  = Array.isArray(s.goals) ? s.goals : [];
  const settings = s.settings || {};

  const last7 = Array.from({ length: 7 }, (_, i) => offsetDate(today, -i));
  const insights = [];

  // 1. Habit completion days
  if (habits.length > 0) {
    const daysCompleted = last7.filter(d => {
      const log = habitLogs[d] || {};
      const done = habits.filter(h => !!log[h.id]).length;
      return done / habits.length >= 0.6;
    }).length;
    insights.push(`You've completed habits on ${daysCompleted} of the last 7 days.`);
  }

  // 2. Protein compliance
  const proteinTarget = num(settings.dailyProteinTarget) || 180;
  if (proteinTarget > 0) {
    const onTrackDays = last7.filter(d => {
      const dayLog = foodLogs[d];
      if (!dayLog) return false;
      const totals = getDayFoodTotals(dayLog);
      return totals.protein > 0 && totals.protein / proteinTarget >= 0.8;
    }).length;
    insights.push(`Protein is on track ${onTrackDays} of the last 7 days.`);
  }

  // 3. Workout frequency
  const workoutsThisWeek = workouts.filter(w => w.date && last7.includes(w.date)).length;
  if (workoutsThisWeek === 0) {
    insights.push('No workouts logged in the last 7 days.');
  }

  // 4. Mood trend
  const { dominantMood } = getMoodTrend(s);
  if (dominantMood) {
    insights.push(`Your mood has been consistently ${dominantMood} this week.`);
  }

  // 5. Goal deadlines
  const nearGoals = goals.filter(g => !g.done && g.targetDate && daysBetween(today, g.targetDate) <= 21 && daysBetween(today, g.targetDate) >= 0).length;
  if (nearGoals > 0) {
    insights.push(`You have ${nearGoals} goal${nearGoals !== 1 ? 's' : ''} due within 21 days.`);
  }

  // 6. Momentum score (fill in if we still have room)
  if (insights.length < 5) {
    const { score } = getMomentumScore(s);
    insights.push(`Momentum score is ${score}/100 this week.`);
  }

  return insights.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getCustomFoods(store)
 *
 * Safe accessor for custom foods list — returns empty array if missing.
 *
 * @param {Object} store
 * @returns {Array}
 */
export function getCustomFoods(store) {
  const s = store || {};
  return Array.isArray(s.customFoods) ? s.customFoods : [];
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * getCrossSystemInsights(store)
 *
 * Detects patterns that span multiple subsystems and returns actionable
 * insight cards. Each card has:
 *   { type, message, severity: 'warning'|'positive'|'info', actionRoute }
 *
 * Checks performed:
 *   - bad mood + missed habits       → burnout risk
 *   - gym calendar event + low protein today → protein alert
 *   - goal deadline near + low progress → urgency
 *   - missed workouts 5+ days        → recovery suggestion
 *   - high consistency streak (7+ days) → momentum card
 *   - upcoming travel event + no food logged → disruption warning
 *   - sleep habit missed 3+ days     → recovery insight
 *
 * @param {Object} store
 * @returns {Array<{ type: string, message: string, severity: string, actionRoute: string }>}
 */
export function getCrossSystemInsights(store) {
  const s = store || {};
  const today    = todayStr();
  const habits   = Array.isArray(s.habits) ? s.habits : [];
  const habitLogs = s.habitLogs || {};
  const foodLogs  = s.foodLogs  || {};
  const workouts  = Array.isArray(s.workouts) ? s.workouts : [];
  const journalEntries = s.journalEntries || {};
  const goals  = Array.isArray(s.goals) ? s.goals : [];
  const calendarEvents = Array.isArray(s.calendarEvents) ? s.calendarEvents : [];
  const settings = s.settings || {};

  const last7 = Array.from({ length: 7 }, (_, i) => offsetDate(today, -i));
  const activeHabits = habits.filter(h => h.active);
  const insights = [];

  // ── 1. Burnout risk: bad mood + missed habits ─────────────────────────────
  const { hasBadStreak, dominantMood } = getMoodTrend(s);
  const weakHabits = getWeakHabits(s);
  if (hasBadStreak && weakHabits.length >= 2) {
    insights.push({
      type:        'burnout-risk',
      message:     `Your mood has been ${dominantMood || 'low'} for 3+ consecutive days and you're missing multiple habits. Consider a recovery day.`,
      severity:    'warning',
      actionRoute: '/journal',
    });
  }

  // ── 2. Gym event today + low protein ─────────────────────────────────────
  const gymEventToday = calendarEvents.some(e => e.date === today && /gym|workout|lift|leg|push|pull/i.test(e.title + (e.type || '')));
  const proteinTarget = num(settings.dailyProteinTarget) || 180;
  const todayTotals   = getDayFoodTotals(foodLogs[today]);
  if (gymEventToday && proteinTarget > 0 && todayTotals.protein < proteinTarget * 0.5) {
    insights.push({
      type:        'protein-alert',
      message:     `You have a workout today but protein is only at ${Math.round(todayTotals.protein)}g — aim for ${proteinTarget}g.`,
      severity:    'warning',
      actionRoute: '/nutrition',
    });
  }

  // ── 3. Goal deadline urgency ──────────────────────────────────────────────
  const highRiskGoals = getGoalRiskAnalysis(s).filter(r => r.risk === 'high');
  if (highRiskGoals.length > 0) {
    const g = highRiskGoals[0];
    insights.push({
      type:        'goal-urgency',
      message:     `"${g.goal.title}" is due in ${g.daysLeft} day${g.daysLeft !== 1 ? 's' : ''} with only ${g.goal.progress}% progress.`,
      severity:    'warning',
      actionRoute: '/goals',
    });
  }

  // ── 4. Missed workouts 5+ days ────────────────────────────────────────────
  const lastWorkout = [...workouts]
    .filter(w => w.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const daysSinceWorkout = lastWorkout ? daysBetween(lastWorkout.date, today) : Infinity;
  if (daysSinceWorkout >= 5) {
    insights.push({
      type:        'missed-workouts',
      message:     `No workout logged in ${daysSinceWorkout === Infinity ? 'a while' : `${daysSinceWorkout} days`}. A short session can re-anchor the habit.`,
      severity:    'info',
      actionRoute: '/workouts',
    });
  }

  // ── 5. High consistency streak ────────────────────────────────────────────
  if (activeHabits.length > 0) {
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const d = offsetDate(today, -i);
      const log = habitLogs[d] || {};
      const done = activeHabits.filter(h => !!log[h.id]).length;
      if (done / activeHabits.length >= 0.6) streak++;
      else break;
    }
    if (streak >= 7) {
      insights.push({
        type:        'momentum',
        message:     `${streak}-day habit streak — you're in a powerful rhythm. Keep it going.`,
        severity:    'positive',
        actionRoute: '/habits',
      });
    }
  }

  // ── 6. Upcoming travel + no meal plan (no food logged yesterday or today) ─
  const TRAVEL_KEYWORDS = /beach|trip|travel|vacation|flight|airport|hotel/i;
  const travelSoon = calendarEvents.some(e => {
    if (!e.date) return false;
    const dl = daysBetween(today, e.date);
    return dl >= 0 && dl <= 5 && TRAVEL_KEYWORDS.test(e.title || '');
  });
  if (travelSoon) {
    const yesterday  = offsetDate(today, -1);
    const todayFood  = getDayFoodTotals(foodLogs[today]);
    const yFood      = getDayFoodTotals(foodLogs[yesterday]);
    const noMealPlan = todayFood.calories === 0 && yFood.calories === 0;
    if (noMealPlan) {
      insights.push({
        type:        'travel-disruption',
        message:     'A trip is coming up and no meals have been logged recently. Plan ahead to stay on track.',
        severity:    'warning',
        actionRoute: '/nutrition',
      });
    }
  }

  // ── 7. Sleep habit missed 3+ days ─────────────────────────────────────────
  const sleepHabit = habits.find(h => h.active && /sleep/i.test(h.name));
  if (sleepHabit) {
    const sleepMissedDays = last7.slice(0, 3).filter(d => {
      const log = habitLogs[d] || {};
      return !log[sleepHabit.id];
    }).length;
    if (sleepMissedDays >= 3) {
      insights.push({
        type:        'sleep-recovery',
        message:     `Sleep habit missed ${sleepMissedDays} of the last 3 days. Poor sleep can undermine fat loss and recovery.`,
        severity:    'warning',
        actionRoute: '/habits',
      });
    }
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateWeeklyReview(store)
 *
 * Produces a structured weekly review for the most recently completed
 * Mon–Sun week before today.
 *
 * @param {Object} store
 * @returns {{
 *   weekStart:          string,
 *   weekEnd:            string,
 *   habitsConsistency:  number,   // 0-100 pct of active habit completions
 *   avgCalories:        number,
 *   avgProtein:         number,
 *   workoutsCount:      number,
 *   moodSummary:        string,
 *   goalsProgress:      Array<{ title: string, progress: number }>,
 *   bestDay:            string|null,
 *   worstDay:           string|null,
 *   recommendations:    string[]
 * }}
 */
export function generateWeeklyReview(store) {
  const s = store || {};
  const today = todayStr();

  // Find the most recent completed Mon–Sun week
  const todayDate = new Date(`${today}T00:00:00`);
  // dayOfWeek: 0=Sun, 1=Mon ... 6=Sat
  const dow = todayDate.getDay();
  // Days since last Monday (completed week ends on last Sunday)
  // If today is Mon(1): last week ended 1 day ago (Sun). dow=1, offset to lastSun = 1
  // If today is Sun(0): last week ended yesterday. offset = 7
  const daysToLastSun = dow === 0 ? 7 : dow;
  const lastSunday = new Date(todayDate);
  lastSunday.setDate(todayDate.getDate() - daysToLastSun);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const weekStart = fmt(lastMonday);
  const weekEnd   = fmt(lastSunday);

  // Build 7-day window
  const weekDays = Array.from({ length: 7 }, (_, i) => offsetDate(weekStart, i));

  const habits    = Array.isArray(s.habits) ? s.habits.filter(h => h.active) : [];
  const habitLogs = s.habitLogs || {};
  const foodLogs  = s.foodLogs  || {};
  const workouts  = Array.isArray(s.workouts) ? s.workouts : [];
  const journalEntries = s.journalEntries || {};
  const goals  = Array.isArray(s.goals) ? s.goals : [];
  const settings = s.settings || {};

  // ── Habit consistency ─────────────────────────────────────────────────────
  let totalHabitSlots = 0;
  let totalHabitDone  = 0;
  const dayScores = {}; // date → pct

  for (const d of weekDays) {
    const log  = habitLogs[d] || {};
    const done = habits.filter(h => !!log[h.id]).length;
    totalHabitSlots += habits.length;
    totalHabitDone  += done;
    dayScores[d] = habits.length > 0 ? Math.round((done / habits.length) * 100) : 0;
  }
  const habitsConsistency = totalHabitSlots > 0
    ? Math.round((totalHabitDone / totalHabitSlots) * 100)
    : 0;

  // ── Nutrition averages ────────────────────────────────────────────────────
  let totalCalories = 0;
  let totalProtein  = 0;
  let loggedDays    = 0;

  for (const d of weekDays) {
    const dayLog = foodLogs[d];
    if (!dayLog) continue;
    const t = getDayFoodTotals(dayLog);
    if (t.calories === 0 && t.protein === 0) continue;
    totalCalories += t.calories;
    totalProtein  += t.protein;
    loggedDays++;
  }

  const avgCalories = loggedDays > 0 ? Math.round(totalCalories / loggedDays) : 0;
  const avgProtein  = loggedDays > 0 ? Math.round((totalProtein  / loggedDays) * 10) / 10 : 0;

  // ── Workouts ──────────────────────────────────────────────────────────────
  const workoutsCount = workouts.filter(w => w.date && weekDays.includes(w.date)).length;

  // ── Mood summary ──────────────────────────────────────────────────────────
  const moodCounts = {};
  for (const d of weekDays) {
    const entry = journalEntries[d];
    if (entry?.mood) moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  }
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const moodSummary = topMood
    ? `Mostly ${topMood[0]} (${topMood[1]} day${topMood[1] !== 1 ? 's' : ''})`
    : 'No mood data this week';

  // ── Goals progress snapshot ───────────────────────────────────────────────
  const goalsProgress = goals
    .filter(g => !g.done)
    .map(g => ({ title: g.title || '', progress: num(g.progress) }));

  // ── Best / worst day by habit score ───────────────────────────────────────
  let bestDay = null;
  let worstDay = null;
  if (habits.length > 0) {
    const sorted = weekDays.slice().sort((a, b) => dayScores[b] - dayScores[a]);
    bestDay  = sorted[0] || null;
    worstDay = sorted[sorted.length - 1] || null;
    if (bestDay === worstDay) worstDay = null;
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = [];
  const proteinTarget = num(settings.dailyProteinTarget) || 180;
  const calTarget     = num(settings.dailyCalorieTarget) || 2100;

  if (habitsConsistency < 60) {
    recommendations.push('Habit consistency was below 60% — focus on 1–2 non-negotiable habits next week.');
  }
  if (avgProtein > 0 && avgProtein < proteinTarget * 0.8) {
    recommendations.push(`Average protein (${avgProtein}g) was below your target (${proteinTarget}g). Add a high-protein snack each day.`);
  }
  if (avgCalories > 0 && avgCalories > calTarget * 1.1) {
    recommendations.push(`Average calories (${avgCalories}) exceeded your target (${calTarget}). Identify which meal is running high.`);
  }
  if (workoutsCount === 0) {
    recommendations.push('No workouts were logged this week. Even two short sessions can restart momentum.');
  } else if (workoutsCount < 3) {
    recommendations.push(`Only ${workoutsCount} workout${workoutsCount !== 1 ? 's' : ''} this week — aim for 3–4 next week.`);
  }
  const { hasBadStreak } = getMoodTrend(s);
  if (hasBadStreak) {
    recommendations.push('Multiple rough/tired days detected — prioritise sleep and stress management.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Solid week overall. Keep the momentum going.');
  }

  return {
    weekStart,
    weekEnd,
    habitsConsistency,
    avgCalories,
    avgProtein,
    workoutsCount,
    moodSummary,
    goalsProgress,
    bestDay,
    worstDay,
    recommendations,
  };
}
