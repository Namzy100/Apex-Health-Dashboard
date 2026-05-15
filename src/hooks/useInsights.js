/**
 * useInsights — generates cross-system AI Coach insights.
 * Returns structured insight cards for each life domain.
 */
import { useMemo } from 'react';
import { useApexStore } from '../store/apexStore';
import { computeMomentum } from '../services/momentumEngine';
import { analyseNutrition } from '../services/nutritionInsights';
import { analyseJournal, detectBurnout } from '../services/journalInsights';
import { analyseSchedule } from '../services/scheduleEngine';

function buildInsights(store) {
  const momentum  = computeMomentum(store);
  const nutrition = analyseNutrition(store);
  const journal   = analyseJournal(store);
  const schedule  = analyseSchedule(store);
  const habits    = (store.habits || []).filter(h => h.active);
  const goals     = (store.goals  || []).filter(g => !g.done);
  const burnout   = detectBurnout(store);

  const cards = [];

  // ── Momentum ──────────────────────────────────────────────────────────────
  if (momentum.score < 45) {
    cards.push({
      id: 'momentum-low', category: 'momentum', severity: 'high',
      title: 'Momentum is low right now',
      explanation: `Your current score is ${momentum.score}/100. ${momentum.weakAreas.join(' and ')} are dragging it down.`,
      why: 'Compound small wins reset momentum faster than big changes.',
      action: momentum.recommendations[0] || 'Complete just one habit today.',
      dismissable: true,
    });
  } else if (momentum.score >= 80) {
    cards.push({
      id: 'momentum-high', category: 'momentum', severity: 'low',
      title: `Locked in at ${momentum.score}/100`,
      explanation: `You're in the top momentum range. ${momentum.strongAreas.join(' and ')} are strong.`,
      why: 'Consistency at this level compounds exponentially.',
      action: 'Keep the streak alive. Push a goal forward today.',
      dismissable: true,
    });
  }

  // ── Habits ────────────────────────────────────────────────────────────────
  const todayLog  = store.habitLogs?.[new Date().toISOString().slice(0, 10)] || {};
  const doneTodayCount = habits.filter(h => todayLog[h.id]).length;
  if (habits.length > 0 && doneTodayCount === 0) {
    cards.push({
      id: 'habits-none-today', category: 'habits', severity: 'medium',
      title: 'No habits completed yet today',
      explanation: `You have ${habits.length} active habits and none are logged for today.`,
      why: 'Even 1 habit logged resets psychological inertia.',
      action: `Start with your easiest habit: ${habits[0]?.name || 'any habit'}.`,
      dismissable: false,
    });
  }

  // ── Nutrition ─────────────────────────────────────────────────────────────
  if (nutrition.lowProtStreak >= 3) {
    cards.push({
      id: 'nutrition-protein', category: 'nutrition', severity: 'high',
      title: `Protein gap — ${nutrition.lowProtStreak} days running`,
      explanation: `Missing protein target for ${nutrition.lowProtStreak} consecutive days. This slows recovery and risks lean mass loss.`,
      why: 'Protein drives muscle retention during a cut. No protein = no protection.',
      action: `Add a protein-first meal today. Target: ${store.settings?.dailyProteinTarget || 180}g.`,
      dismissable: true,
    });
  }
  if (nutrition.logged < 3) {
    cards.push({
      id: 'nutrition-logging', category: 'nutrition', severity: 'medium',
      title: 'Food logging is inconsistent',
      explanation: `Only ${nutrition.logged} of the last 7 days were tracked. Blind spots make it hard to know what's working.`,
      why: 'Tracking calories is the single strongest predictor of fat loss success.',
      action: 'Log your next meal before you eat it.',
      dismissable: true,
    });
  }

  // ── Recovery / Burnout ────────────────────────────────────────────────────
  if (burnout.level === 'high') {
    cards.push({
      id: 'burnout-high', category: 'recovery', severity: 'high',
      title: 'Burnout signals detected',
      explanation: `${burnout.stressDays} stress entries and ${burnout.lowMoodDays} low mood days in the last 2 weeks.`,
      why: 'Ignoring burnout signals compounds fatigue exponentially.',
      action: 'Schedule one full rest day this week. No negotiation.',
      dismissable: false,
    });
  } else if (burnout.level === 'medium') {
    cards.push({
      id: 'burnout-medium', category: 'recovery', severity: 'medium',
      title: 'Managing stress levels',
      explanation: `Moderate stress signals this fortnight. Your mood trend is ${journal.trend?.trend || 'mixed'}.`,
      why: 'Early course-correction is far easier than recovery.',
      action: 'Protect sleep tonight. Aim for 7-8 hours.',
      dismissable: true,
    });
  }

  // ── Schedule ──────────────────────────────────────────────────────────────
  if (schedule.overloadedDays > 0) {
    cards.push({
      id: 'schedule-overloaded', category: 'schedule', severity: 'medium',
      title: `${schedule.overloadedDays} overloaded day${schedule.overloadedDays > 1 ? 's' : ''} this week`,
      explanation: `Your calendar has too much stacked on certain days. This creates decision fatigue and habit slip.`,
      why: 'Overpacked days are the #1 reason habits fail.',
      action: 'Defer one non-urgent event to a lighter day.',
      dismissable: true,
    });
  }
  if (schedule.deadlines.length > 0) {
    const d = schedule.deadlines[0];
    cards.push({
      id: 'deadline-soon', category: 'schedule', severity: d.urgency === 'critical' ? 'high' : 'medium',
      title: `"${d.title}" in ${d.daysOut} day${d.daysOut !== 1 ? 's' : ''}`,
      explanation: `Upcoming ${d.type === 'goal' ? 'goal deadline' : 'deadline'} on ${d.date}.${d.progress !== undefined ? ` Progress: ${d.progress}%.` : ''}`,
      why: 'Proximity awareness primes better planning.',
      action: `Block 30 min today to advance this.`,
      dismissable: true,
    });
  }

  // ── Goals ─────────────────────────────────────────────────────────────────
  const stuckGoals = goals.filter(g => (g.progress || 0) < 10 && g.targetDate);
  if (stuckGoals.length > 0) {
    cards.push({
      id: 'goals-stuck', category: 'goals', severity: 'medium',
      title: `${stuckGoals.length} goal${stuckGoals.length > 1 ? 's' : ''} stuck at 0–10%`,
      explanation: `"${stuckGoals[0].title}" hasn't moved. Inactive goals drain motivation.`,
      why: 'A goal with zero action is just a wish.',
      action: 'Take one micro-action on your most important goal today.',
      dismissable: true,
    });
  }

  // ── Mood correlation ──────────────────────────────────────────────────────
  if (journal.trend?.hasBadStreak) {
    cards.push({
      id: 'mood-streak', category: 'mental', severity: 'high',
      title: `${journal.trend.badStreakLength} low-mood days in a row`,
      explanation: `Your journal shows a streak of low entries. This correlates with reduced habit and workout consistency.`,
      why: 'Mood drives behaviour. Protecting your mental state is training.',
      action: journal.journal?.reflectionPrompt || 'Write 3 things you\'re grateful for right now.',
      dismissable: false,
    });
  }

  // Sort by severity
  const ORDER = { high: 0, medium: 1, low: 2 };
  return cards.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export function useInsights() {
  const [store] = useApexStore();
  const insights = useMemo(() => buildInsights(store), [store]);
  return insights;
}
