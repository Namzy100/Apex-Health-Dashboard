/**
 * Journal Insights — pure JS, no React.
 * Detects mood trends, burnout signals, motivation spikes,
 * keyword patterns, and generates emotional summaries.
 */

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Mood numeric values for trend analysis
const MOOD_SCORE = {
  great:    5,
  good:     4,
  okay:     3,
  bad:      2,
  terrible: 1,
};

const MOOD_EMOJI = {
  great:    '😄',
  good:     '🙂',
  okay:     '😐',
  bad:      '😕',
  terrible: '😞',
};

const MOOD_LABEL = {
  great:    'Great',
  good:     'Good',
  okay:     'Okay',
  bad:      'Low',
  terrible: 'Rough',
};

// Keywords associated with themes
const KEYWORD_THEMES = {
  stress:      ['stressed', 'anxious', 'overwhelmed', 'tired', 'exhausted', 'burned out', 'drained', 'pressure', 'anxiety'],
  motivation:  ['motivated', 'pumped', 'excited', 'energized', 'inspired', 'focused', 'determined', 'locked in'],
  productive:  ['productive', 'accomplished', 'crushed', 'got a lot done', 'efficient', 'flow state', 'deep work'],
  social:      ['friends', 'family', 'dinner', 'went out', 'hangout', 'party', 'lunch with', 'met up'],
  fitness:     ['gym', 'workout', 'ran', 'lifted', 'trained', 'cardio', 'pb', 'pr', 'personal best'],
  nutrition:   ['ate well', 'clean eating', 'protein', 'meal prep', 'cheat meal', 'junk food', 'skipped meal'],
  sleep:       ['slept', 'tired', 'rested', 'good sleep', 'bad sleep', 'insomnia', 'nap', 'woke up'],
  reflection:  ['grateful', 'thankful', 'learned', 'realize', 'thinking about', 'reflection', 'growth'],
};

function countKeywords(text, keywords) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k)).length;
}

// ── Heatmap data (30 days) ────────────────────────────────────────────────────

export function getMoodHeatmap(store, days = 30) {
  const entries = store.journalEntries || {};
  const result  = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const e = entries[d];
    result.push({
      date:      d,
      mood:      e?.mood || null,
      moodScore: e?.mood ? (MOOD_SCORE[e.mood] || null) : null,
      emoji:     e?.mood ? MOOD_EMOJI[e.mood] : null,
      hasEntry:  !!e,
    });
  }
  return result;
}

// ── Trend analysis ────────────────────────────────────────────────────────────

export function getMoodTrend(store, window = 7) {
  const entries = store.journalEntries || {};

  const scored = [];
  for (let i = 0; i < window; i++) {
    const d = daysAgo(i);
    const e = entries[d];
    if (e?.mood) scored.push({ date: d, score: MOOD_SCORE[e.mood] || 3, mood: e.mood });
  }

  if (!scored.length) return { entries: [], avgScore: null, dominantMood: null, trend: 'unknown', hasBadStreak: false };

  const avgScore = scored.reduce((s, e) => s + e.score, 0) / scored.length;

  // Dominant mood
  const counts = {};
  scored.forEach(e => { counts[e.mood] = (counts[e.mood] || 0) + 1; });
  const dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Bad streak — 3+ consecutive bad/terrible days
  let badStreak = 0;
  let hasBadStreak = false;
  for (const e of scored) {
    if (e.score <= 2) { badStreak++; if (badStreak >= 3) hasBadStreak = true; }
    else badStreak = 0;
  }

  // Trend direction — compare last 3 days vs 3 days before that
  const recent = scored.slice(0, 3);
  const prior  = scored.slice(3, 6);
  const recentAvg = recent.length ? recent.reduce((s, e) => s + e.score, 0) / recent.length : 3;
  const priorAvg  = prior.length  ? prior.reduce((s, e) => s + e.score, 0)  / prior.length  : 3;
  const delta = recentAvg - priorAvg;
  const trend = delta > 0.5 ? 'improving' : delta < -0.5 ? 'declining' : 'stable';

  return {
    entries: scored,
    avgScore: Math.round(avgScore * 10) / 10,
    dominantMood,
    dominantEmoji:  MOOD_EMOJI[dominantMood] || '😐',
    dominantLabel:  MOOD_LABEL[dominantMood] || 'Mixed',
    trend,
    hasBadStreak,
    badStreakLength: badStreak,
    daysLogged: scored.length,
  };
}

// ── Keyword analysis ──────────────────────────────────────────────────────────

export function getKeywordThemes(store, window = 14) {
  const entries = store.journalEntries || {};
  const themes  = {};

  for (let i = 0; i < window; i++) {
    const d = daysAgo(i);
    const e = entries[d];
    if (!e?.text) continue;
    Object.entries(KEYWORD_THEMES).forEach(([theme, kws]) => {
      const count = countKeywords(e.text, kws);
      if (count > 0) themes[theme] = (themes[theme] || 0) + count;
    });
  }

  return Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => ({ theme, count }));
}

// ── Burnout detection ─────────────────────────────────────────────────────────

export function detectBurnout(store) {
  const entries = store.journalEntries || {};
  const habits  = (store.habits || []).filter(h => h.active);
  const logs    = store.habitLogs || {};

  let stressDays  = 0;
  let lowMoodDays = 0;
  let lowHabitDays = 0;

  for (let i = 0; i < 14; i++) {
    const d = daysAgo(i);
    const e = entries[d];
    if (e) {
      if (e.mood && MOOD_SCORE[e.mood] <= 2) lowMoodDays++;
      if (countKeywords(e.text, KEYWORD_THEMES.stress) > 0) stressDays++;
    }
    if (habits.length) {
      const log  = logs[d] || {};
      const done = habits.filter(h => log[h.id]).length;
      if (done < habits.length * 0.4) lowHabitDays++;
    }
  }

  const riskScore = (stressDays * 3) + (lowMoodDays * 2) + (lowHabitDays * 1);
  const level = riskScore >= 20 ? 'high' : riskScore >= 10 ? 'medium' : 'low';

  return {
    riskScore,
    level,
    stressDays,
    lowMoodDays,
    lowHabitDays,
    message: level === 'high'
      ? '⚠ Burnout signals detected. Consider a lighter day and rest.'
      : level === 'medium'
      ? '🟡 Some stress signals this fortnight. Watch your recovery.'
      : null,
  };
}

// ── Full journal insights ─────────────────────────────────────────────────────

export function analyseJournal(store) {
  const entries = store.journalEntries || {};
  const heatmap = getMoodHeatmap(store, 30);
  const trend   = getMoodTrend(store, 7);
  const themes  = getKeywordThemes(store, 14);
  const burnout = detectBurnout(store);

  const today     = entries[todayStr()];
  const todayMood = today?.mood || null;

  // Consistency score
  const daysLogged30 = heatmap.filter(d => d.hasEntry).length;
  const consistency  = Math.round((daysLogged30 / 30) * 100);

  // Reflection prompt based on trends
  let reflectionPrompt = 'How are you feeling today?';
  if (trend.hasBadStreak) reflectionPrompt = 'You\'ve had a rough few days. What\'s weighing on you?';
  else if (trend.trend === 'improving') reflectionPrompt = 'Things seem to be trending up. What\'s working?';
  else if (trend.dominantMood === 'great') reflectionPrompt = 'You\'ve been on a roll. What\'s fuelling the good days?';
  else if (themes[0]?.theme === 'stress') reflectionPrompt = 'Stress has been a theme lately. What\'s one thing you can let go of?';
  else if (themes[0]?.theme === 'motivation') reflectionPrompt = 'Your energy has been high. What goal deserves that energy next?';

  return {
    today: todayMood,
    todayEmoji: MOOD_EMOJI[todayMood] || null,
    consistency,
    daysLogged30,
    heatmap,
    trend,
    themes: themes.slice(0, 4),
    burnout,
    reflectionPrompt,
    // Emotional summary sentence
    summary: trend.daysLogged === 0
      ? 'No journal entries yet this week.'
      : trend.hasBadStreak
      ? `Rough patch — ${trend.badStreakLength} low days in a row. You\'re tracking it, which matters.`
      : trend.trend === 'improving'
      ? `Mood trending up this week. ${trend.dominantEmoji} Keep the momentum.`
      : trend.avgScore >= 4
      ? `Strong week emotionally. ${trend.daysLogged} days tracked, averaging ${trend.dominantLabel}.`
      : `Mixed week. ${trend.daysLogged} days logged — ${trend.dominantEmoji} ${trend.dominantLabel} was most common.`,
  };
}
