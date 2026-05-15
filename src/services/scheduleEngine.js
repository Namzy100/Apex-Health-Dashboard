/**
 * Schedule Engine — pure JS, no React.
 * Analyses calendar events to detect overload, deadlines,
 * recovery windows, and suggest optimal times for workouts & meal prep.
 */

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Event categories
const EVENT_WEIGHT = {
  workout:    { label: 'Workout',    load: 3, color: '#10b981', emoji: '🏋️' },
  meeting:    { label: 'Meeting',    load: 2, color: '#6366f1', emoji: '📅' },
  deadline:   { label: 'Deadline',   load: 4, color: '#ef4444', emoji: '⏰' },
  'meal-prep':{ label: 'Meal Prep',  load: 1, color: '#f59e0b', emoji: '🍱' },
  travel:     { label: 'Travel',     load: 5, color: '#8b5cf6', emoji: '✈️' },
  event:      { label: 'Event',      load: 2, color: '#06b6d4', emoji: '🎉' },
  habit:      { label: 'Habit',      load: 1, color: '#a78bfa', emoji: '✅' },
  progress:   { label: 'Progress',   load: 1, color: '#f97316', emoji: '📸' },
};

// ── Day load analysis ─────────────────────────────────────────────────────────

export function analyseDayLoad(events, date) {
  const dayEvents = events.filter(e => e.date === date);
  const totalLoad = dayEvents.reduce((s, e) => s + (EVENT_WEIGHT[e.type]?.load || 1), 0);

  let status = 'light';
  let statusColor = '#10b981';
  if (totalLoad >= 10) { status = 'overloaded'; statusColor = '#ef4444'; }
  else if (totalLoad >= 6) { status = 'busy'; statusColor = '#f97316'; }
  else if (totalLoad >= 3) { status = 'moderate'; statusColor = '#f59e0b'; }

  return { date, events: dayEvents, totalLoad, status, statusColor };
}

// ── Week overview ─────────────────────────────────────────────────────────────

export function getWeekOverview(store) {
  const events = store.calendarEvents || [];
  const today  = todayStr();

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d    = daysFromNow(i);
    const day  = analyseDayLoad(events, d);
    const dow  = new Date(d).toLocaleDateString('en-US', { weekday: 'short' });
    week.push({ ...day, dayOfWeek: dow, isToday: d === today });
  }
  return week;
}

// ── Deadline detection ────────────────────────────────────────────────────────

export function getUpcomingDeadlines(store, withinDays = 14) {
  const events = store.calendarEvents || [];
  const goals  = (store.goals || []).filter(g => !g.done && g.targetDate);
  const today  = todayStr();
  const cutoff = daysFromNow(withinDays);

  const deadlines = [];

  // Calendar deadlines
  events
    .filter(e => e.type === 'deadline' && e.date >= today && e.date <= cutoff)
    .forEach(e => {
      const days = daysBetween(today, e.date);
      deadlines.push({
        id:      e.id,
        title:   e.title,
        date:    e.date,
        daysOut: days,
        type:    'calendar',
        urgency: days <= 2 ? 'critical' : days <= 5 ? 'high' : 'medium',
        color:   days <= 2 ? '#ef4444' : days <= 5 ? '#f97316' : '#f59e0b',
      });
    });

  // Goal deadlines
  goals
    .filter(g => g.targetDate >= today && g.targetDate <= cutoff)
    .forEach(g => {
      const days = daysBetween(today, g.targetDate);
      deadlines.push({
        id:      g.id,
        title:   g.title,
        date:    g.targetDate,
        daysOut: days,
        type:    'goal',
        progress: g.progress || 0,
        urgency: (days <= 7 && (g.progress || 0) < 70) ? 'high' : 'medium',
        color:   (days <= 7 && (g.progress || 0) < 70) ? '#ef4444' : '#f59e0b',
      });
    });

  return deadlines.sort((a, b) => a.daysOut - b.daysOut).slice(0, 5);
}

// ── Workout suggestion ────────────────────────────────────────────────────────

export function suggestWorkoutTime(store) {
  const events  = store.calendarEvents || [];
  const onboarding = store.onboarding || {};
  const routineStyle = onboarding.routineStyle || 'flexible';

  const today = todayStr();
  const dayLoad = analyseDayLoad(events, today);
  const hasWorkout = events.some(e => e.date === today && e.type === 'workout');

  if (hasWorkout) return { suggestion: 'Workout already scheduled today ✓', time: null };

  if (dayLoad.status === 'overloaded') {
    return { suggestion: 'Heavy day — consider a 20-min walk instead of a full session', time: null, isLight: true };
  }

  let time = '6:00 AM';
  let reason = 'Morning workouts boost energy for the day';
  if (routineStyle === 'night_owl') { time = '7:00 PM'; reason = 'Evening training suits your rhythm'; }
  else if (dayLoad.status === 'busy') { time = '12:00 PM'; reason = 'Lunch break workout beats an evening squeeze'; }

  return { suggestion: `Best window: ${time}`, time, reason, dayStatus: dayLoad.status };
}

// ── Meal prep suggestion ──────────────────────────────────────────────────────

export function suggestMealPrepTime(store) {
  const events = store.calendarEvents || [];
  const week   = getWeekOverview(store);

  // Find lightest day in next 7 days
  const lightest = week.reduce((best, d) =>
    (!best || d.totalLoad < best.totalLoad) ? d : best, null);

  const hasMealPrep = events.some(e => e.date === lightest?.date && e.type === 'meal-prep');

  if (hasMealPrep) return { suggestion: 'Meal prep already scheduled ✓', date: lightest?.date };

  return {
    suggestion: lightest
      ? `Best for meal prep: ${new Date(lightest.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
      : 'Schedule 90 min on your lightest day',
    date: lightest?.date,
    reason: 'Prep on low-load days reduces stress during busy stretches.',
  };
}

// ── Collision detection ───────────────────────────────────────────────────────

export function detectCollisions(store) {
  const events = store.calendarEvents || [];
  const week   = getWeekOverview(store);
  const issues = [];

  week.forEach(day => {
    const hasDeadline = day.events.some(e => e.type === 'deadline');
    const hasTravel   = day.events.some(e => e.type === 'travel');
    const hasWorkout  = day.events.some(e => e.type === 'workout');

    if (hasDeadline && hasWorkout) {
      issues.push({ type: 'warning', date: day.date, dayOfWeek: day.dayOfWeek,
        message: `Deadline + workout collision on ${day.dayOfWeek}. Consider moving the workout.` });
    }
    if (hasTravel && hasWorkout) {
      issues.push({ type: 'info', date: day.date, dayOfWeek: day.dayOfWeek,
        message: `Travel day with a workout scheduled on ${day.dayOfWeek}. Is this realistic?` });
    }
    if (day.status === 'overloaded') {
      issues.push({ type: 'warning', date: day.date, dayOfWeek: day.dayOfWeek,
        message: `${day.dayOfWeek} looks overloaded (${day.totalLoad} load units). Consider deferring something.` });
    }
  });

  return issues.slice(0, 4);
}

// ── Recovery window detection ─────────────────────────────────────────────────

export function findRecoveryWindows(store) {
  const week = getWeekOverview(store);
  return week.filter(d => d.totalLoad <= 2 && !d.isToday).map(d => ({
    date: d.date,
    dayOfWeek: d.dayOfWeek,
    suggestion: 'Good recovery day — low schedule load',
  }));
}

// ── Full schedule analysis ────────────────────────────────────────────────────

export function analyseSchedule(store) {
  const week        = getWeekOverview(store);
  const deadlines   = getUpcomingDeadlines(store);
  const workout     = suggestWorkoutTime(store);
  const mealPrep    = suggestMealPrepTime(store);
  const collisions  = detectCollisions(store);
  const recovery    = findRecoveryWindows(store);

  const busyDays    = week.filter(d => d.status === 'busy' || d.status === 'overloaded').length;
  const overloaded  = week.filter(d => d.status === 'overloaded').length;

  const insights = [];
  if (overloaded > 0)       insights.push({ type: 'warning', text: `${overloaded} overloaded day${overloaded > 1 ? 's' : ''} this week. Protect your recovery.` });
  if (deadlines.length > 0) insights.push({ type: 'urgent',  text: `${deadlines.length} deadline${deadlines.length > 1 ? 's' : ''} coming up in the next 2 weeks.` });
  if (recovery.length > 2)  insights.push({ type: 'success', text: `${recovery.length} light days this week — use one for meal prep or deep work.` });
  if (busyDays >= 5)        insights.push({ type: 'warning', text: 'Packed week ahead. Guard your sleep and nutrition.' });

  return {
    week,
    deadlines,
    workoutSuggestion:  workout,
    mealPrepSuggestion: mealPrep,
    collisions,
    recoveryWindows:    recovery,
    insights,
    busyDays,
    overloadedDays: overloaded,
  };
}
