/**
 * AI Coach V3 — structured intelligence engine.
 * Produces typed insight cards per life domain.
 * Pure JS, no React.
 *
 * Insight shape:
 * {
 *   id: string,
 *   category: 'health'|'habits'|'goals'|'nutrition'|'recovery'|'momentum'|'schedule'|'mental',
 *   title: string,
 *   explanation: string,
 *   why: string,
 *   severity: 'high'|'medium'|'low',
 *   action: string,
 *   dismissable: boolean,
 *   emoji: string,
 * }
 */

import { computeMomentum } from './momentumEngine';
import { analyseNutrition } from './nutritionInsights';
import { analyseJournal, detectBurnout } from './journalInsights';
import { analyseSchedule } from './scheduleEngine';

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

// ── Domain: Health & Recovery ─────────────────────────────────────────────────

function healthInsights(store, journal, burnout) {
  const cards = [];
  const entries = store.journalEntries || {};
  const workouts = store.workouts || [];

  // Sleep proxy — check journal for sleep keywords
  let poorSleepDays = 0;
  for (let i = 0; i < 7; i++) {
    const e = entries[daysAgo(i)];
    if (e?.text) {
      const t = e.text.toLowerCase();
      if (t.includes('tired') || t.includes('bad sleep') || t.includes('insomnia') || t.includes('exhausted')) poorSleepDays++;
    }
  }

  if (poorSleepDays >= 3) {
    cards.push({
      id: 'health-sleep', category: 'health', severity: 'high', emoji: '😴',
      title: `Sleep quality is suffering`,
      explanation: `You've logged sleep issues ${poorSleepDays} of the last 7 days. Poor sleep raises cortisol, reduces muscle protein synthesis, and tanks motivation.`,
      why: 'Sleep is the highest-ROI recovery tool. No supplement, workout, or diet hack beats it.',
      action: 'Set a non-negotiable sleep alarm for 10:30pm tonight. No phone in bed.',
      dismissable: false,
    });
  }

  if (burnout.level === 'high') {
    cards.push({
      id: 'health-burnout', category: 'recovery', severity: 'high', emoji: '🔴',
      title: 'Burnout risk is elevated',
      explanation: `${burnout.stressDays} stress days, ${burnout.lowMoodDays} low mood days detected in the last 2 weeks. Habit completion is also low.`,
      why: 'Burnout is a signal — not a character flaw. Early recognition changes the outcome.',
      action: 'Block one full rest day this week. Schedule it as a calendar event right now.',
      dismissable: false,
    });
  }

  // Recovery check: many workouts + low mood = overtrain risk
  const recentWorkouts = workouts.filter(w => w.date && w.date >= daysAgo(7)).length;
  if (recentWorkouts >= 6 && journal.trend?.avgScore < 3.5) {
    cards.push({
      id: 'health-overtrain', category: 'recovery', severity: 'medium', emoji: '⚡',
      title: 'Possible overtraining signal',
      explanation: `${recentWorkouts} workouts in 7 days, but mood is trending low. Overtraining manifests as mood decline before physical breakdown.`,
      why: 'Muscle is built in recovery, not during training. Rest is productive.',
      action: 'Take tomorrow as an active rest day — walk, stretch, no lifting.',
      dismissable: true,
    });
  }

  return cards;
}

// ── Domain: Habits ────────────────────────────────────────────────────────────

function habitsInsights(store) {
  const cards = [];
  const habits    = (store.habits || []).filter(h => h.active);
  const logs      = store.habitLogs || {};
  const today     = todayStr();
  const todayLog  = logs[today] || {};

  if (!habits.length) return cards;

  const todayDone = habits.filter(h => todayLog[h.id]).length;
  const todayPct  = Math.round((todayDone / habits.length) * 100);

  // Per-habit completion in last 7 days
  const habitStats = habits.map(h => {
    let done = 0;
    for (let i = 0; i < 7; i++) {
      if (logs[daysAgo(i)]?.[h.id]) done++;
    }
    return { ...h, weekDone: done, weekPct: Math.round((done / 7) * 100) };
  });

  const weakest = habitStats.reduce((w, h) => (!w || h.weekPct < w.weekPct) ? h : w, null);
  const strongest = habitStats.reduce((s, h) => (!s || h.weekPct > s.weekPct) ? h : s, null);

  if (todayDone === 0 && new Date().getHours() >= 10) {
    cards.push({
      id: 'habits-zero', category: 'habits', severity: 'high', emoji: '🔔',
      title: 'No habits logged yet today',
      explanation: `It's past 10am and 0/${habits.length} habits are marked. The longer you wait, the harder it gets.`,
      why: 'The first habit of the day activates all the others. It's the keystone.',
      action: `Start with "${habits[0]?.name || 'your easiest habit'}" right now.`,
      dismissable: false,
    });
  } else if (todayPct < 50 && new Date().getHours() >= 16) {
    cards.push({
      id: 'habits-behind', category: 'habits', severity: 'medium', emoji: '⏰',
      title: `Only ${todayPct}% of habits done by late afternoon`,
      explanation: `${todayDone}/${habits.length} habits completed. The evening window is narrowing.`,
      why: 'Partial days still count and protect your streak.',
      action: `Batch the remaining ${habits.length - todayDone} habits now before dinner.`,
      dismissable: true,
    });
  } else if (todayPct === 100) {
    cards.push({
      id: 'habits-perfect', category: 'habits', severity: 'low', emoji: '🏆',
      title: 'All habits done today',
      explanation: `${habits.length}/${habits.length} habits completed. Today is locked in.`,
      why: 'Full days compound into identity change.',
      action: 'Protect this energy — log how you feel in your journal.',
      dismissable: true,
    });
  }

  if (weakest && weakest.weekPct < 40) {
    cards.push({
      id: `habit-weak-${weakest.id}`, category: 'habits', severity: 'medium', emoji: weakest.emoji || '⚠',
      title: `"${weakest.name}" is slipping`,
      explanation: `Only ${weakest.weekDone}/7 days this week (${weakest.weekPct}%). Habits below 50% start to feel optional.`,
      why: 'A habit done inconsistently is harder to maintain than a new one.',
      action: `Make "${weakest.name}" non-negotiable for the next 7 days. No exceptions.`,
      dismissable: true,
    });
  }

  if (strongest && strongest.weekPct === 100) {
    cards.push({
      id: `habit-strong-${strongest.id}`, category: 'habits', severity: 'low', emoji: strongest.emoji || '✅',
      title: `"${strongest.name}" — perfect week`,
      explanation: `7/7 days this week. This habit is now deeply ingrained.`,
      why: 'A habit at 100% for 2+ weeks no longer needs willpower — it's automatic.',
      action: 'Consider adding a complementary habit to stack on this win.',
      dismissable: true,
    });
  }

  return cards;
}

// ── Domain: Nutrition ─────────────────────────────────────────────────────────

function nutritionInsightsCards(store, nutrition) {
  const cards = [];
  const settings = store.settings || {};
  const protTarget = settings.dailyProteinTarget || 180;

  if (nutrition.lowProtStreak >= 3) {
    cards.push({
      id: 'nutrition-protein-streak', category: 'nutrition', severity: 'high', emoji: '🥩',
      title: `Protein deficit: ${nutrition.lowProtStreak} days in a row`,
      explanation: `You've missed the ${protTarget}g protein target for ${nutrition.lowProtStreak} consecutive days. During a cut, this risks muscle loss.`,
      why: 'Protein intake is the single biggest lever for body composition. It protects muscle while in a caloric deficit.',
      action: `Today's priority: hit ${protTarget}g protein before anything else. Track it early.`,
      dismissable: true,
    });
  }

  if (nutrition.highSodiumDays >= 4) {
    cards.push({
      id: 'nutrition-sodium', category: 'nutrition', severity: 'medium', emoji: '🧂',
      title: `High sodium ${nutrition.highSodiumDays} days this week`,
      explanation: `Averaging ${nutrition.avgSodium}mg sodium. Above 2,300mg consistently causes water retention and can make weight fluctuate 2-4 lbs.`,
      why: 'Sodium spikes can mask fat loss progress on the scale — causing frustration and quitting.',
      action: 'Cut processed food today. Cook one meal from whole foods.',
      dismissable: true,
    });
  }

  if (nutrition.logged >= 6 && nutrition.avgProt >= (protTarget * 0.9)) {
    cards.push({
      id: 'nutrition-excellent', category: 'nutrition', severity: 'low', emoji: '💪',
      title: 'Excellent nutrition week',
      explanation: `6+ days logged, averaging ${nutrition.avgProt}g protein. Hitting targets consistently.`,
      why: 'This level of consistency is what separates people who get results from those who don't.',
      action: 'Meal prep this weekend to lock in next week too.',
      dismissable: true,
    });
  }

  if (nutrition.skippedBreakfasts >= 4) {
    cards.push({
      id: 'nutrition-breakfast', category: 'nutrition', severity: 'low', emoji: '🌅',
      title: `Skipping breakfast ${nutrition.skippedBreakfasts}× this week`,
      explanation: 'Missing morning meals pushes calories and protein to the evening, making it harder to hit targets without overeating late.',
      why: 'Front-loading protein early reduces afternoon cravings and evening binges.',
      action: 'Log a high-protein breakfast tomorrow — even just Greek yogurt and eggs.',
      dismissable: true,
    });
  }

  return cards;
}

// ── Domain: Goals ─────────────────────────────────────────────────────────────

function goalsInsights(store) {
  const cards = [];
  const goals   = (store.goals || []).filter(g => !g.done);
  const today   = todayStr();

  if (!goals.length) {
    cards.push({
      id: 'goals-empty', category: 'goals', severity: 'medium', emoji: '🎯',
      title: 'No active goals set',
      explanation: 'Goals give your habits and training a direction. Without targets, effort has no vector.',
      why: 'Studies show written goals are 42% more likely to be achieved.',
      action: 'Add 1 specific, dated goal in the Goals page right now.',
      dismissable: false,
    });
    return cards;
  }

  const overdue = goals.filter(g => g.targetDate && g.targetDate < today);
  if (overdue.length > 0) {
    cards.push({
      id: 'goals-overdue', category: 'goals', severity: 'high', emoji: '⏰',
      title: `${overdue.length} overdue goal${overdue.length > 1 ? 's' : ''}`,
      explanation: overdue.map(g => `"${g.title}" (was due ${g.targetDate})`).join('. '),
      why: 'Overdue goals drain motivation if left unaddressed.',
      action: 'Either update the deadline or mark it done. Don\'t let stale goals haunt you.',
      dismissable: false,
    });
  }

  const stalled = goals.filter(g => (g.progress || 0) < 5 && g.targetDate && daysBetween(today, g.targetDate) < 60);
  if (stalled.length > 0) {
    cards.push({
      id: 'goals-stalled', category: 'goals', severity: 'medium', emoji: '🚧',
      title: `"${stalled[0].title}" needs movement`,
      explanation: `Less than 5% progress with ${daysBetween(today, stalled[0].targetDate)} days left. This goal needs action this week.`,
      why: 'A goal that stays at 0% for more than 2 weeks is usually the wrong goal or missing a system.',
      action: 'Identify one action you can take in the next 30 minutes toward this goal.',
      dismissable: true,
    });
  }

  const nearComplete = goals.filter(g => (g.progress || 0) >= 85 && !g.done);
  if (nearComplete.length > 0) {
    cards.push({
      id: 'goals-close', category: 'goals', severity: 'low', emoji: '🏁',
      title: `"${nearComplete[0].title}" — almost there`,
      explanation: `${nearComplete[0].progress}% complete. The finish line is close.`,
      why: 'The final stretch is where most people give up. Don\'t.',
      action: 'What\'s the one thing that gets this to 100%? Do it today.',
      dismissable: true,
    });
  }

  return cards;
}

// ── Domain: Momentum & Mental ─────────────────────────────────────────────────

function momentumMentalInsights(store, momentum, journal) {
  const cards = [];

  if (momentum.trend < -10) {
    cards.push({
      id: 'momentum-falling', category: 'momentum', severity: 'high', emoji: '📉',
      title: `Momentum dropped ${Math.abs(momentum.trend)} points this week`,
      explanation: `Score is ${momentum.score}/100. Weak areas: ${momentum.weakAreas.join(', ')}.`,
      why: 'Momentum is compound — small drops accelerate. Catch it early.',
      action: momentum.recommendations[0] || 'Pick one weak area and make progress on it today.',
      dismissable: false,
    });
  }

  if (momentum.trend > 10) {
    cards.push({
      id: 'momentum-rising', category: 'momentum', severity: 'low', emoji: '📈',
      title: `Momentum up ${momentum.trend} points this week`,
      explanation: `${momentum.label} at ${momentum.score}/100. ${momentum.strongAreas.join(' and ')} are leading.`,
      why: 'Upward momentum is the most valuable asset. Protect it.',
      action: 'Share your progress — accountability amplifies momentum.',
      dismissable: true,
    });
  }

  if (journal.trend?.hasBadStreak) {
    cards.push({
      id: 'mental-bad-streak', category: 'mental', severity: 'high', emoji: '💭',
      title: `${journal.trend.badStreakLength} rough days in a row`,
      explanation: `Journal shows consistently low mood. This often precedes habit and training breakdown by 3-5 days.`,
      why: 'Mental state predicts physical output. This is the signal — not the noise.',
      action: journal.reflectionPrompt || 'Write 5 minutes in your journal — no filter, just honesty.',
      dismissable: false,
    });
  }

  return cards;
}

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ── Main coach engine ─────────────────────────────────────────────────────────

export function generateCoachInsights(store) {
  const momentum  = computeMomentum(store);
  const nutrition = analyseNutrition(store);
  const journal   = analyseJournal(store);
  const schedule  = analyseSchedule(store);
  const burnout   = detectBurnout(store);

  const all = [
    ...healthInsights(store, journal, burnout),
    ...habitsInsights(store),
    ...nutritionInsightsCards(store, nutrition),
    ...goalsInsights(store),
    ...momentumMentalInsights(store, momentum, journal),
  ];

  // Schedule insights
  if (schedule.overloadedDays > 1) {
    all.push({
      id: 'schedule-overload', category: 'schedule', severity: 'medium', emoji: '📅',
      title: `${schedule.overloadedDays} overloaded days ahead`,
      explanation: 'Your calendar is stacked this week. This is when habits most commonly slip.',
      why: 'Overloaded schedules create decision fatigue that kills discretionary effort (like working out).',
      action: 'Block your workout times NOW as calendar events so they don\'t get bumped.',
      dismissable: true,
    });
  }

  // Deduplicate + sort by severity
  const seen = new Set();
  const deduped = all.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return deduped.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).slice(0, 8);
}

// ── Contextual daily summary for AI chat ─────────────────────────────────────

export function buildCoachContext(store) {
  const momentum  = computeMomentum(store);
  const nutrition = analyseNutrition(store);
  const journal   = analyseJournal(store);
  const insights  = generateCoachInsights(store);

  const topIssue = insights[0];

  return {
    momentumScore: momentum.score,
    momentumLabel: momentum.label,
    topInsight: topIssue ? `${topIssue.title}: ${topIssue.action}` : null,
    nutritionAdherence: nutrition.adherenceScore,
    moodTrend: journal.trend?.trend || 'unknown',
    burnoutLevel: detectBurnout(store).level,
    insightCount: insights.length,
    highSeverityCount: insights.filter(i => i.severity === 'high').length,
  };
}
