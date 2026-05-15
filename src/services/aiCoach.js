import { detectWeightTrend, detectProteinConsistency, detectWeekendCalorieDelta } from './patternDetection';

function getDayTotals(dayLog) {
  const entries = [
    ...(dayLog?.breakfast || []),
    ...(dayLog?.lunch     || []),
    ...(dayLog?.dinner    || []),
    ...(dayLog?.snacks    || []),
  ];
  return entries.reduce(
    (s, f) => ({ calories: s.calories + (f.calories || 0) * (f.quantity || 1), protein: s.protein + (f.protein || 0) * (f.quantity || 1) }),
    { calories: 0, protein: 0 }
  );
}

export function analyzeNutritionPatterns(store) {
  const logs = store.foodLogs || {};
  const settings = store.settings || {};
  const proteinTarget = settings.dailyProteinTarget || 180;
  const calTarget = settings.dailyCalorieTarget || 2100;

  const recentDays = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayLog = logs[key];
    if (!dayLog) continue;
    const totals = getDayTotals(dayLog);
    if (totals.calories > 0 || totals.protein > 0) {
      recentDays.push({ date: key, ...totals });
    }
  }

  if (!recentDays.length) return null;

  const avgProtein = recentDays.reduce((s, d) => s + d.protein, 0) / recentDays.length;
  const avgCal = recentDays.reduce((s, d) => s + d.calories, 0) / recentDays.length;
  const lowProteinDays = recentDays.filter(d => d.protein < proteinTarget * 0.85).length;
  const overCalDays = recentDays.filter(d => d.calories > calTarget * 1.1).length;

  return { avgProtein, avgCal, lowProteinDays, overCalDays, daysLogged: recentDays.length, proteinTarget, calTarget };
}

export function analyzeTrainingPatterns(store) {
  const workouts = store.workouts || [];
  const recent = workouts.filter(w => {
    const daysAgo = (Date.now() - new Date(w.date + 'T00:00:00').getTime()) / 86400000;
    return daysAgo <= 14;
  });
  return {
    totalRecent: recent.length,
    lastWorkout: recent[recent.length - 1]?.date || null,
    perWeek: parseFloat((recent.length / 2).toFixed(1)),
  };
}

export function detectConsistencyStreak(store) {
  const logs = store.weightLogs || [];
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (logs.find(l => l.date === d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  return streak;
}

export function generateDailyCoachMessage(store) {
  const nutrition = analyzeNutritionPatterns(store);
  const training  = analyzeTrainingPatterns(store);
  const streak    = detectConsistencyStreak(store);
  const weightLogs = store.weightLogs || [];
  const settings   = store.settings || {};
  const weightTrend = detectWeightTrend(store);
  const insights = [];

  // Weight trend
  if (weightTrend) {
    if (weightTrend.trend === 'declining') {
      insights.push({ type: 'weight_down', message: `Weight trending at ${weightTrend.weeklyRateStr}. The protocol is working — stay consistent.`, sentiment: 'positive' });
    } else if (weightTrend.trend === 'rising') {
      insights.push({ type: 'weight_up', message: 'Weight has trended up over 14 days. Audit the evening meals and weekend intake first.', sentiment: 'warning' });
    } else {
      insights.push({ type: 'weight_stable', message: 'Weight has been stable for two weeks. Consider tightening the deficit by 100–150 kcal to break the plateau.', sentiment: 'neutral' });
    }
  }

  // Total progress
  if (weightLogs.length >= 7) {
    const start = settings.startWeight || weightLogs[0]?.weight || 0;
    const current = weightLogs[weightLogs.length - 1]?.weight || start;
    const lost = parseFloat((start - current).toFixed(1));
    if (lost >= 5) {
      insights.push({ type: 'milestone', message: `Down ${lost} lbs from day one. That's real, earned progress — not luck.`, sentiment: 'positive' });
    }
  }

  // Protein
  if (nutrition) {
    if (nutrition.lowProteinDays >= 3) {
      insights.push({ type: 'low_protein', message: `Protein missed target ${nutrition.lowProteinDays} of the last 7 days. Front-load protein in the morning — it's the single highest-leverage habit right now.`, sentiment: 'warning' });
    } else if (nutrition.avgProtein >= nutrition.proteinTarget * 0.92) {
      insights.push({ type: 'good_protein', message: `Averaging ${Math.round(nutrition.avgProtein)}g protein this week — above 90% of target. Muscle is protected.`, sentiment: 'positive' });
    }
    if (nutrition.overCalDays >= 2) {
      insights.push({ type: 'over_cals', message: `Calories exceeded target ${nutrition.overCalDays} days this week. Tighten the evening window — that's where most overages happen.`, sentiment: 'warning' });
    }
  }

  // Training
  if (training.totalRecent === 0) {
    insights.push({ type: 'no_training', message: 'No training logged in 2 weeks. One session resets the pattern — even a 30-minute lift counts.', sentiment: 'warning' });
  } else if (training.perWeek >= 3.5) {
    insights.push({ type: 'good_training', message: `${training.totalRecent} sessions in 2 weeks — ${training.perWeek}/week. Training frequency is where it needs to be.`, sentiment: 'positive' });
  }

  // Streak
  if (streak >= 14) {
    insights.push({ type: 'streak', message: `${streak}-day tracking streak. Consistency at this level is what separates people who transform from people who try.`, sentiment: 'positive' });
  } else if (streak === 0) {
    insights.push({ type: 'no_streak', message: "Log today's weight to restart your streak. The streak is the habit. The habit is the result.", sentiment: 'neutral' });
  }

  if (!insights.length) {
    insights.push({ type: 'general', message: 'Keep logging. The data builds your story — and right now, it looks like you\'re doing the work.', sentiment: 'positive' });
  }

  const warning  = insights.find(i => i.sentiment === 'warning');
  const positive = insights.find(i => i.sentiment === 'positive');
  const primary  = warning || positive || insights[0];
  const secondary = insights.find(i => i !== primary) || null;

  return { primary, secondary, all: insights };
}

export function generateAdjustmentSuggestion(store) {
  const nutrition = analyzeNutritionPatterns(store);
  const settings = store.settings || {};
  if (!nutrition) return "Start logging your meals to get personalized suggestions.";

  if (nutrition.lowProteinDays >= 3) {
    const gap = Math.round((settings.dailyProteinTarget || 180) - nutrition.avgProtein);
    return `Add ${gap}g more protein per day. Greek yogurt (17g), chicken breast (31g), or a protein shake (25g) will get you there.`;
  }
  if (nutrition.overCalDays >= 2) return "Cut the late-night snacks first — that's where most overages happen. Evening hunger usually means protein was too low earlier.";
  if (nutrition.avgProtein >= (settings.dailyProteinTarget || 180) * 0.9) return "Protein is dialed in. Focus on keeping total calories tight and training consistently.";
  return "You're executing the protocol. Trust the process — the numbers don't lie.";
}

export async function getAICoachInsight(store) {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) return generateDailyCoachMessage(store);

  const weightLogs = store.weightLogs || [];
  const settings = store.settings || {};
  const nutrition = analyzeNutritionPatterns(store);
  const trend = detectWeightTrend(store);
  const streak = detectConsistencyStreak(store);

  const context = [
    `Athlete: ${settings.name || 'Naman'}, cutting from ${settings.startWeight}lbs to ${settings.goalWeight}lbs by ${settings.goalDate}.`,
    `Current weight: ${weightLogs[weightLogs.length - 1]?.weight || 'unknown'}lbs.`,
    `Protein target: ${settings.dailyProteinTarget}g/day. Cal target: ${settings.dailyCalorieTarget}kcal.`,
    nutrition ? `Recent avg: ${Math.round(nutrition.avgProtein)}g protein, ${Math.round(nutrition.avgCal)}kcal. Low protein days: ${nutrition.lowProteinDays}/7.` : '',
    trend ? `Weight trend: ${trend.weeklyRateStr}.` : '',
    `Tracking streak: ${streak} days.`,
  ].filter(Boolean).join(' ');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an elite performance coach. Give ONE concise, intelligent coaching insight (1-2 sentences max). Calm, disciplined, supportive. No emojis. No fluff. Direct and specific.' },
          { role: 'user', content: context },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const message = data.choices?.[0]?.message?.content?.trim();
    if (message) return { primary: { message, sentiment: 'positive', type: 'ai' }, secondary: null, all: [{ message }] };
  } catch {}

  return generateDailyCoachMessage(store);
}
