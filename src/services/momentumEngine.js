/**
 * Momentum Engine — pure JS, no React.
 * Computes a 0-100 score that captures overall life momentum
 * across habits, nutrition, training, journal, goals, and streaks.
 *
 * Output shape:
 * {
 *   score: 0-100,
 *   label: 'Locked In' | 'Rising' | 'Steady' | 'Slipping' | 'Reset Needed',
 *   trend: number,          // score delta vs 7 days ago
 *   trendLabel: string,
 *   breakdown: { habits, nutrition, training, journal, goals, streak },
 *   reasons: string[],      // 2-4 positive/negative highlights
 *   weakAreas: string[],
 *   strongAreas: string[],
 *   recommendations: string[],
 *   modeLabel: string,      // "Recovery Day" | "Deep Work" | "Full Send" etc.
 *   modeColor: string,
 *   history: { date, score }[],
 * }
 */

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// ── Sub-scorers ───────────────────────────────────────────────────────────────

function scoreHabits(store) {
  const habits = (store.habits || []).filter(h => h.active);
  const logs   = store.habitLogs || {};
  if (!habits.length) return { score: 50, detail: 'No active habits' };

  let totalPossible = 0;
  let totalDone     = 0;

  for (let i = 0; i < 7; i++) {
    const d    = daysAgo(i);
    const log  = logs[d] || {};
    const done = habits.filter(h => log[h.id]).length;
    totalPossible += habits.length;
    totalDone     += done;
  }

  const pct   = totalPossible > 0 ? totalDone / totalPossible : 0;
  const score = Math.round(clamp(pct * 100));
  const todayLog  = logs[todayStr()] || {};
  const todayDone = habits.filter(h => todayLog[h.id]).length;

  return {
    score,
    todayDone,
    total: habits.length,
    weekPct: Math.round(pct * 100),
    detail: `${todayDone}/${habits.length} today · ${Math.round(pct * 100)}% this week`,
  };
}

function scoreNutrition(store) {
  const settings = store.settings || {};
  const calTarget  = settings.dailyCalorieTarget || 2100;
  const protTarget = settings.dailyProteinTarget  || 180;
  const foodLogs   = store.foodLogs || {};

  let calScores  = [];
  let protScores = [];

  for (let i = 0; i < 7; i++) {
    const d   = daysAgo(i);
    const log = foodLogs[d];
    if (!log) continue;

    const entries = Object.values(log).flat();
    const calories = entries.reduce((s, e) => s + (e.calories || 0), 0);
    const protein  = entries.reduce((s, e) => s + (e.protein  || 0), 0);

    if (calories > 0) {
      // Penalise being >20% over; reward being within 10%
      const calRatio = calories / calTarget;
      const calScore = calRatio > 1.2 ? 40 : calRatio > 1.1 ? 65 : calRatio >= 0.75 ? 100 : 50;
      calScores.push(calScore);
    }
    if (protein > 0) {
      const protRatio = protein / protTarget;
      const protScore = protRatio >= 0.9 ? 100 : protRatio >= 0.7 ? 70 : 40;
      protScores.push(protScore);
    }
  }

  const avgCal  = calScores.length  ? calScores.reduce((s, v) => s + v, 0)  / calScores.length  : 50;
  const avgProt = protScores.length ? protScores.reduce((s, v) => s + v, 0) / protScores.length : 50;
  const score   = Math.round(clamp(avgCal * 0.4 + avgProt * 0.6));
  const loggedDays = Math.max(calScores.length, protScores.length);

  return {
    score,
    loggedDays,
    detail: `${loggedDays}/7 days logged · ${Math.round(avgProt)}% protein avg`,
  };
}

function scoreTraining(store) {
  const workouts = store.workouts || [];
  if (!workouts.length) return { score: 40, detail: 'No workout data' };

  // Count workouts in last 7 days
  const cutoff = daysAgo(7);
  const recentWorkouts = workouts.filter(w => w.date && w.date >= cutoff);
  const count  = recentWorkouts.length;

  // 4+ workouts = 100, 3 = 80, 2 = 60, 1 = 40, 0 = 20
  const score = count >= 4 ? 100 : count === 3 ? 80 : count === 2 ? 60 : count === 1 ? 40 : 20;

  return {
    score,
    count,
    detail: `${count} workout${count !== 1 ? 's' : ''} this week`,
  };
}

function scoreJournal(store) {
  const entries = store.journalEntries || {};

  let daysLogged  = 0;
  let moodSum     = 0;
  let moodCount   = 0;
  const MOOD_SCORE = { great: 100, good: 80, okay: 60, bad: 35, terrible: 10 };

  for (let i = 0; i < 7; i++) {
    const d = daysAgo(i);
    const e = entries[d];
    if (!e) continue;
    daysLogged++;
    if (e.mood && MOOD_SCORE[e.mood] !== undefined) {
      moodSum   += MOOD_SCORE[e.mood];
      moodCount++;
    }
  }

  const consistencyScore = Math.round((daysLogged / 7) * 100);
  const moodScore        = moodCount ? Math.round(moodSum / moodCount) : 60;
  const score            = Math.round(clamp(consistencyScore * 0.5 + moodScore * 0.5));
  const avgMood          = moodCount ? Math.round(moodSum / moodCount) : null;

  return {
    score,
    daysLogged,
    avgMoodScore: avgMood,
    detail: `${daysLogged}/7 days journalled`,
  };
}

function scoreGoals(store) {
  const goals = (store.goals || []).filter(g => !g.done);
  if (!goals.length) return { score: 60, detail: 'No active goals' };

  const avgProgress = goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length;
  const score       = Math.round(clamp(avgProgress));

  // Check for overdue goals
  const today   = todayStr();
  const overdue = goals.filter(g => g.targetDate && g.targetDate < today && !g.done).length;

  return {
    score: overdue > 0 ? Math.max(score - overdue * 10, 0) : score,
    avgProgress: Math.round(avgProgress),
    overdue,
    total: goals.length,
    detail: `${goals.length} active goals · ${Math.round(avgProgress)}% avg progress`,
  };
}

function scoreStreak(store) {
  const habits = (store.habits || []).filter(h => h.active);
  const logs   = store.habitLogs || {};
  if (!habits.length) return { score: 50, streak: 0 };

  // Find longest consecutive day streak where ≥50% habits were done
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d    = daysAgo(i);
    const log  = logs[d] || {};
    const done = habits.filter(h => log[h.id]).length;
    if (done >= habits.length * 0.5) streak++;
    else break;
  }

  const score = streak >= 14 ? 100 : streak >= 7 ? 85 : streak >= 3 ? 65 : streak >= 1 ? 45 : 20;
  return { score, streak, detail: `${streak}-day streak` };
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function computeMomentum(store) {
  const habits    = scoreHabits(store);
  const nutrition = scoreNutrition(store);
  const training  = scoreTraining(store);
  const journal   = scoreJournal(store);
  const goals     = scoreGoals(store);
  const streak    = scoreStreak(store);

  // Weighted composite
  const score = Math.round(clamp(
    habits.score    * 0.28 +
    nutrition.score * 0.22 +
    training.score  * 0.20 +
    streak.score    * 0.15 +
    goals.score     * 0.10 +
    journal.score   * 0.05,
  ));

  // Trend — compare today's score vs 7 days ago stored snapshot
  const momentumLog = store.momentumLog || {};
  const oldEntry    = momentumLog[daysAgo(7)];
  const trend       = oldEntry ? score - (oldEntry.score || score) : 0;
  const trendLabel  = trend > 5 ? `↑ ${trend} pts this week` : trend < -5 ? `↓ ${Math.abs(trend)} pts this week` : 'Holding steady';

  // Label
  const label = score >= 85 ? 'Locked In' : score >= 70 ? 'Rising' : score >= 55 ? 'Steady' : score >= 40 ? 'Slipping' : 'Reset Needed';

  // Mode
  let modeLabel = 'Full Send';
  let modeColor = '#10b981';
  if (training.count === 0 && journal.daysLogged > 3) { modeLabel = 'Recovery Day'; modeColor = '#6366f1'; }
  else if (score >= 80 && habits.todayDone >= habits.total) { modeLabel = 'Locked In'; modeColor = '#f59e0b'; }
  else if (score < 45) { modeLabel = 'Reset Day'; modeColor = '#ef4444'; }
  else if (habits.todayDone === 0) { modeLabel = 'Warming Up'; modeColor = '#f97316'; }

  // Weak and strong areas
  const scores = [
    { name: 'Habits',    score: habits.score,    detail: habits.detail },
    { name: 'Nutrition', score: nutrition.score, detail: nutrition.detail },
    { name: 'Training',  score: training.score,  detail: training.detail },
    { name: 'Journal',   score: journal.score,   detail: journal.detail },
    { name: 'Goals',     score: goals.score,     detail: goals.detail },
    { name: 'Streak',    score: streak.score,    detail: streak.detail },
  ];
  const sorted     = [...scores].sort((a, b) => a.score - b.score);
  const weakAreas  = sorted.slice(0, 2).filter(s => s.score < 65).map(s => s.name);
  const strongAreas = sorted.slice(-2).filter(s => s.score >= 70).map(s => s.name);

  // Reasons
  const reasons = [];
  if (streak.streak >= 7) reasons.push(`🔥 ${streak.streak}-day streak — keep it alive`);
  if (habits.weekPct >= 80) reasons.push(`✅ ${habits.weekPct}% habit completion this week`);
  if (training.count >= 4) reasons.push(`💪 ${training.count} workouts this week`);
  if (nutrition.score >= 80) reasons.push(`🥩 Protein targets on point`);
  if (habits.score < 40) reasons.push(`⚠ Habits are slipping — ${habits.todayDone}/${habits.total} today`);
  if (nutrition.loggedDays < 3) reasons.push(`📉 Only ${nutrition.loggedDays} days of food logged this week`);
  if (training.count === 0) reasons.push(`🛑 No workouts logged this week`);
  if (goals.overdue > 0) reasons.push(`⏰ ${goals.overdue} overdue goal${goals.overdue > 1 ? 's' : ''}`);

  // Recommendations
  const recommendations = [];
  if (weakAreas.includes('Habits'))    recommendations.push('Start with just 1 habit today to rebuild momentum.');
  if (weakAreas.includes('Nutrition')) recommendations.push("Log your next meal now — even if it wasn't perfect.");
  if (weakAreas.includes('Training'))  recommendations.push('A 20-min workout beats zero. Schedule it.');
  if (weakAreas.includes('Journal'))   recommendations.push('Write 3 sentences before you sleep tonight.');
  if (streak.streak === 0)             recommendations.push('One good day restarts your streak. Make today count.');

  // 7-day history from stored log
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const d   = daysAgo(i);
    const val = momentumLog[d];
    history.push({ date: d, score: val?.score ?? null });
  }
  // Fill today's live score
  history[6] = { date: todayStr(), score };

  return {
    score,
    label,
    trend,
    trendLabel,
    breakdown: {
      habits:    { score: habits.score,    label: 'Habits',    detail: habits.detail },
      nutrition: { score: nutrition.score, label: 'Nutrition', detail: nutrition.detail },
      training:  { score: training.score,  label: 'Training',  detail: training.detail },
      journal:   { score: journal.score,   label: 'Journal',   detail: journal.detail },
      goals:     { score: goals.score,     label: 'Goals',     detail: goals.detail },
      streak:    { score: streak.score,    label: 'Streak',    detail: streak.detail },
    },
    reasons:         reasons.slice(0, 4),
    weakAreas,
    strongAreas,
    recommendations: recommendations.slice(0, 3),
    modeLabel,
    modeColor,
    history,
    // Raw sub-scores for UI display
    _raw: { habits, nutrition, training, journal, goals, streak },
  };
}

// ── Score color helper ────────────────────────────────────────────────────────

export function scoreColor(score) {
  if (score >= 80) return '#10b981';   // emerald — momentum
  if (score >= 60) return '#f59e0b';   // amber  — steady
  if (score >= 40) return '#f97316';   // orange — slipping
  return '#ef4444';                    // red    — reset needed
}

export function scoreGradient(score) {
  if (score >= 80) return 'linear-gradient(135deg, #10b981, #059669)';
  if (score >= 60) return 'linear-gradient(135deg, #f59e0b, #f97316)';
  if (score >= 40) return 'linear-gradient(135deg, #f97316, #ea580c)';
  return 'linear-gradient(135deg, #ef4444, #dc2626)';
}
