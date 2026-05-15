import { motion } from 'framer-motion';
import { Lightbulb, TrendingDown, Trophy, Zap, Target, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { weightLogs, macroLogs, stepLogs, workouts, dailyNotes, profile } from '../data/sampleData';
import GlassCard from '../components/GlassCard';

function computeInsights() {
  const insights = [];

  // Protein consistency
  const proteinHit = macroLogs.filter(d => d.protein >= profile.dailyProteinTarget).length;
  const pctProtein = Math.round((proteinHit / macroLogs.length) * 100);
  insights.push({
    icon: Trophy, accent: '#10b981', tag: 'Nutrition', trend: 'up',
    title: `${pctProtein}% protein consistency`,
    body: `You hit your ${profile.dailyProteinTarget}g protein target on ${proteinHit} of ${macroLogs.length} days tracked. ${pctProtein >= 80 ? 'Elite consistency — this is protecting your muscle during the cut.' : 'Push this above 80% to maximize muscle retention.'}`,
    value: `${pctProtein}%`,
  });

  // Calorie average
  const recentMacros = macroLogs.slice(-7);
  const avgCals = Math.round(recentMacros.reduce((s, d) => s + d.calories, 0) / recentMacros.length);
  const deficit = profile.dailyCalorieTarget - avgCals;
  insights.push({
    icon: Zap, accent: '#f97316', tag: 'Calories', trend: deficit > 0 ? 'up' : 'down',
    title: `Avg ${avgCals} kcal/day this week`,
    body: `Your 7-day calorie average is ${avgCals} kcal — ${deficit > 0 ? `${deficit} below your ${profile.dailyCalorieTarget} target. Solid deficit for fat loss.` : `${Math.abs(deficit)} above your target. Tighten the nutrition if the scale isn't moving.`}`,
    value: `${deficit > 0 ? '+' : ''}${deficit}`,
  });

  // Weight pace
  const firstWeight = weightLogs[0].weight;
  const lastWeight = weightLogs[weightLogs.length - 1].weight;
  const weeks = weightLogs.length / 7;
  const lbsPerWeek = ((firstWeight - lastWeight) / weeks).toFixed(2);
  const isIdeal = parseFloat(lbsPerWeek) >= 0.5 && parseFloat(lbsPerWeek) <= 1.5;
  insights.push({
    icon: TrendingDown, accent: isIdeal ? '#10b981' : '#f59e0b', tag: 'Weight', trend: 'up',
    title: `Losing ${lbsPerWeek} lbs/week`,
    body: `Your average loss rate over the tracked period is ${lbsPerWeek} lbs/week. ${isIdeal ? 'This is the ideal range (0.5–1.5 lbs/wk) for a lean cut — fast enough to see results, slow enough to keep muscle.' : parseFloat(lbsPerWeek) < 0.5 ? 'Slightly slower than ideal. Try adding 10 min of cardio or cutting 100 kcal from the target.' : 'Faster than ideal. Consider a refeed day to protect metabolic rate.'}`,
    value: `${lbsPerWeek}/wk`,
  });

  // Steps insight
  const highStepDays = stepLogs.filter(d => d.steps >= 10000).length;
  const stepPct = Math.round((highStepDays / stepLogs.length) * 100);
  insights.push({
    icon: Target, accent: '#eab308', tag: 'Activity', trend: stepPct > 50 ? 'up' : 'down',
    title: `${stepPct}% of days above 10k steps`,
    body: `You hit the 10k step goal on ${highStepDays} of ${stepLogs.length} days. NEAT (non-exercise activity) is one of the most powerful levers in a cut. ${stepPct >= 70 ? 'Your NEAT is excellent — keep it up.' : 'Try parking further, taking stairs, or adding a 20-min walk to boost this.'}`,
    value: `${highStepDays}/${stepLogs.length}`,
  });

  // Training frequency
  const trainedDays = workouts.length;
  insights.push({
    icon: Star, accent: '#6366f1', tag: 'Training', trend: trainedDays >= 4 ? 'up' : 'neutral',
    title: `${trainedDays} workouts logged`,
    body: `You've logged ${trainedDays} sessions in the tracked period. ${trainedDays >= 4 ? 'Training frequency is on point — 4-5 sessions per week during a cut is the sweet spot for muscle retention.' : 'Aim for 4+ sessions per week. Frequency protects muscle and keeps metabolism elevated.'}`,
    value: `${trainedDays}`,
  });

  // Adherence
  const onPlanDays = dailyNotes.filter(d => d.onPlan).length;
  const pctOnPlan = Math.round((onPlanDays / dailyNotes.length) * 100);
  insights.push({
    icon: Lightbulb, accent: '#a78bfa', tag: 'Adherence', trend: pctOnPlan >= 80 ? 'up' : 'down',
    title: `${pctOnPlan}% on-plan adherence`,
    body: `You stayed on plan ${onPlanDays} of ${dailyNotes.length} logged days. ${pctOnPlan >= 85 ? 'Exceptional discipline — this level of adherence will compound massively over 18 weeks.' : pctOnPlan >= 70 ? "Good consistency. Identify what causes off days and build a defense against it." : 'Adherence needs work. Progress is built in the plan, not around it.'}`,
    value: `${pctOnPlan}%`,
  });

  return insights;
}

const insights = computeInsights();
const latest = weightLogs[weightLogs.length - 1];
const totalLost = (profile.startWeight - latest.weight).toFixed(1);

export default function Insights() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl" style={{ background: '#07060a' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={18} style={{ color: '#f59e0b' }} />
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f4f2' }}>Insights</h1>
        </div>
        <p className="text-sm" style={{ color: '#78716c' }}>
          Data becomes wisdom. Here's what your numbers say.
        </p>
      </motion.div>

      {/* Summary bar */}
      <GlassCard className="p-5 mb-6 flex flex-wrap gap-6" glow="amber" delay={0}>
        {[
          { label: 'Days tracked', value: weightLogs.length, color: '#f59e0b' },
          { label: 'Lbs lost', value: totalLost, color: '#10b981' },
          { label: 'Workouts', value: workouts.length, color: '#6366f1' },
          { label: 'Macro days', value: macroLogs.length, color: '#f97316' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: '#57534e' }}>{s.label}</p>
            </div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: '#78716c' }}>
          <Lightbulb size={13} style={{ color: '#f59e0b' }} />
          Auto-generated from your data
        </div>
      </GlassCard>

      {/* Insights */}
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <GlassCard key={i} className="p-5 flex gap-4" delay={0.1 + i * 0.07}>
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${insight.accent}12`, border: `1px solid ${insight.accent}25` }}
              >
                <Icon size={16} style={{ color: insight.accent }} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${insight.accent}12`, color: insight.accent }}
                    >
                      {insight.tag}
                    </span>
                    {insight.trend === 'up' ? (
                      <ArrowUp size={12} style={{ color: '#10b981' }} />
                    ) : insight.trend === 'down' ? (
                      <ArrowDown size={12} style={{ color: '#ef4444' }} />
                    ) : null}
                  </div>
                  <span className="text-lg font-black" style={{ color: insight.accent }}>{insight.value}</span>
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: '#f5f4f2' }}>{insight.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#78716c' }}>{insight.body}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Motivational footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 p-6 rounded-2xl text-center"
        style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)' }}
      >
        <p className="text-base font-semibold" style={{ color: '#f5f4f2' }}>
          You've lost {totalLost} lbs. That's real. That's earned.
        </p>
        <p className="text-sm mt-1" style={{ color: '#78716c' }}>
          Keep going. The data doesn't lie — you're doing the work.
        </p>
      </motion.div>
    </div>
  );
}
