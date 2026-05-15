function getDayEntries(dayLog) {
  return [
    ...(dayLog?.breakfast || []),
    ...(dayLog?.lunch || []),
    ...(dayLog?.dinner || []),
    ...(dayLog?.snacks || []),
  ];
}

function getDayTotals(dayLog) {
  const entries = getDayEntries(dayLog);
  return entries.reduce(
    (s, f) => ({
      calories: s.calories + (f.calories || 0) * (f.quantity || 1),
      protein:  s.protein  + (f.protein  || 0) * (f.quantity || 1),
    }),
    { calories: 0, protein: 0 }
  );
}

export function detectWeekendCalorieDelta(store) {
  const logs = store.foodLogs || {};
  const weekday = [], weekend = [];

  for (const [date, log] of Object.entries(logs)) {
    const dow = new Date(date + 'T12:00:00').getDay();
    const entries = getDayEntries(log);
    if (!entries.length) continue;
    const { calories } = getDayTotals(log);
    if (dow === 0 || dow === 6) weekend.push(calories);
    else weekday.push(calories);
  }

  if (!weekday.length || !weekend.length) return null;
  const avgWeekday = Math.round(weekday.reduce((s, v) => s + v, 0) / weekday.length);
  const avgWeekend = Math.round(weekend.reduce((s, v) => s + v, 0) / weekend.length);
  const deltaPct = Math.round(((avgWeekend - avgWeekday) / (avgWeekday || 1)) * 100);
  return { avgWeekday, avgWeekend, deltaPct };
}

export function detectProteinConsistency(store) {
  const logs = store.foodLogs || {};
  const target = store.settings?.dailyProteinTarget || 180;
  let hit = 0, total = 0;

  for (const log of Object.values(logs)) {
    if (!getDayEntries(log).length) continue;
    const { protein } = getDayTotals(log);
    total++;
    if (protein >= target * 0.9) hit++;
  }

  if (!total) return null;
  return { hitDays: hit, totalDays: total, rate: Math.round((hit / total) * 100) };
}

export function detectWeightTrend(store) {
  const logs = store.weightLogs || [];
  if (logs.length < 5) return null;

  const recent = logs.slice(-14);
  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((s, l) => s + l.weight, 0) / n;

  let num = 0, den = 0;
  recent.forEach((l, i) => {
    num += (i - xMean) * (l.weight - yMean);
    den += (i - xMean) ** 2;
  });

  const slope = den === 0 ? 0 : num / den;
  const weeklyRate = slope * 7;

  // weeklyRateLbs is the canonical lbs/wk value — callers convert for display
  return {
    slope,
    weeklyRate: parseFloat(weeklyRate.toFixed(2)),
    weeklyRateLbs: parseFloat(weeklyRate.toFixed(2)),
    trend: slope < -0.05 ? 'declining' : slope > 0.05 ? 'rising' : 'stable',
    weeklyRateStr: Math.abs(weeklyRate) < 0.1
      ? 'stable'
      : `${weeklyRate > 0 ? '+' : ''}${weeklyRate.toFixed(1)} lbs/wk`,
  };
}

export function detectCalorieTrend(store) {
  const logs = store.foodLogs || {};
  const days = Object.entries(logs)
    .filter(([, log]) => getDayEntries(log).length)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  if (days.length < 4) return null;

  const recent4 = days.slice(-4).map(([, l]) => getDayTotals(l).calories);
  const older = days.slice(0, -4).map(([, l]) => getDayTotals(l).calories);
  const recentAvg = recent4.reduce((s, v) => s + v, 0) / recent4.length;
  const olderAvg = older.reduce((s, v) => s + v, 0) / (older.length || 1);

  return { recentAvg: Math.round(recentAvg), olderAvg: Math.round(olderAvg), delta: Math.round(recentAvg - olderAvg) };
}

export function getInsightsList(store) {
  const insights = [];
  const weekendDelta = detectWeekendCalorieDelta(store);
  const proteinCon   = detectProteinConsistency(store);
  const weightTrend  = detectWeightTrend(store);
  const calTrend     = detectCalorieTrend(store);
  const settings     = store.settings || {};
  const logs         = store.weightLogs || [];
  const isMetric     = settings.units === 'metric';

  // Build unit-aware rate string from raw lbs/wk value
  const rateStr = (trend) => {
    if (!trend || Math.abs(trend.weeklyRateLbs) < 0.1) return 'stable';
    if (isMetric) {
      const kgWk = (trend.weeklyRateLbs * 0.453592).toFixed(2);
      return `${trend.weeklyRateLbs > 0 ? '+' : ''}${kgWk} kg/wk`;
    }
    return trend.weeklyRateStr;
  };

  const fwLost = (lbs) => {
    if (isMetric) return `${(lbs * 0.453592).toFixed(1)} kg`;
    return `${lbs} lbs`;
  };

  if (weightTrend) {
    if (weightTrend.trend === 'declining') {
      insights.push({ id: 'wt_down', type: 'positive', icon: '📉', tag: 'Weight', title: 'Downward Trend', text: `Weight trending at ${rateStr(weightTrend)}. The deficit is working — stay the course.` });
    } else if (weightTrend.trend === 'rising') {
      insights.push({ id: 'wt_up', type: 'warning', icon: '📈', tag: 'Weight', title: 'Trend Reversed', text: `Weight trending up ${rateStr(weightTrend)} over 14 days. Review evening meals and weekend intake.` });
    } else {
      insights.push({ id: 'wt_stable', type: 'neutral', icon: '➡️', tag: 'Weight', title: 'Weight Plateaued', text: `Weight has been stable for 14 days. Try adding 10 min cardio or dropping 100 kcal from target.` });
    }
  }

  if (proteinCon) {
    if (proteinCon.rate >= 80) {
      insights.push({ id: 'pro_good', type: 'positive', icon: '💪', tag: 'Protein', title: `${proteinCon.rate}% Protein Consistency`, text: `Hitting protein target on ${proteinCon.hitDays}/${proteinCon.totalDays} logged days. Elite level — this is protecting muscle during the cut.` });
    } else if (proteinCon.rate < 55 && proteinCon.totalDays >= 5) {
      insights.push({ id: 'pro_low', type: 'warning', icon: '⚠️', tag: 'Protein', title: 'Protein Gap Detected', text: `Only at target ${proteinCon.rate}% of days (${proteinCon.hitDays}/${proteinCon.totalDays}). Add a high-protein first meal to anchor the day.` });
    } else {
      insights.push({ id: 'pro_mid', type: 'neutral', icon: '🥩', tag: 'Protein', title: `${proteinCon.rate}% Protein Rate`, text: `Hitting protein goal ${proteinCon.hitDays} of ${proteinCon.totalDays} days. Push this above 80% to maximize muscle retention on the cut.` });
    }
  }

  if (weekendDelta) {
    if (weekendDelta.deltaPct > 12) {
      insights.push({ id: 'wknd_spike', type: 'warning', icon: '📅', tag: 'Pattern', title: `Weekend +${weekendDelta.deltaPct}% Calories`, text: `Weekends average ${weekendDelta.avgWeekend} kcal vs ${weekendDelta.avgWeekday} on weekdays. Tighten Friday and Saturday night meals.` });
    } else if (Math.abs(weekendDelta.deltaPct) <= 8) {
      insights.push({ id: 'wknd_good', type: 'positive', icon: '✅', tag: 'Pattern', title: 'Consistent Weekends', text: `Weekend and weekday calories are nearly identical. Behavioral consistency like this is rare — and it shows on the scale.` });
    }
  }

  if (calTrend && Math.abs(calTrend.delta) > 100) {
    if (calTrend.delta < -100) {
      insights.push({ id: 'cal_down', type: 'positive', icon: '📊', tag: 'Calories', title: 'Calories Trending Down', text: `Recent 4-day average (${calTrend.recentAvg} kcal) is ${Math.abs(calTrend.delta)} kcal lower than the prior period. Deficit tightening.` });
    } else {
      insights.push({ id: 'cal_up', type: 'warning', icon: '📊', tag: 'Calories', title: 'Calories Creeping Up', text: `Recent 4-day average (${calTrend.recentAvg} kcal) is ${calTrend.delta} kcal higher than the prior period. Watch the trend.` });
    }
  }

  const totalDays = logs.length;
  if (totalDays >= 7) {
    const lostLbs = ((settings.startWeight || logs[0]?.weight || 0) - logs[logs.length - 1].weight);
    if (lostLbs > 0) {
      const lostStr = fwLost(lostLbs.toFixed(1));
      insights.push({ id: 'total_prog', type: 'positive', icon: '🏆', tag: 'Progress', title: `${lostStr} Total`, text: `Down ${lostStr} across ${totalDays} tracked days. Every single logged day contributed to that number.` });
    }
  }

  return insights;
}
