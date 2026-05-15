import { motion } from 'framer-motion';
import { Lightbulb, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useApexStore } from '../store/apexStore';
import { getInsightsList, detectWeightTrend } from '../services/patternDetection';
import { useUnits } from '../hooks/useUnits';
import GlassCard from '../components/GlassCard';

const TYPE_COLOR = {
  positive: '#10b981',
  warning:  '#f59e0b',
  neutral:  '#78716c',
};

function TrendArrow({ type }) {
  if (type === 'positive') return <ArrowUp size={12} style={{ color: '#10b981' }} />;
  if (type === 'warning')  return <ArrowDown size={12} style={{ color: '#ef4444' }} />;
  return <Minus size={12} style={{ color: '#57534e' }} />;
}

export default function Insights() {
  const [store] = useApexStore();
  const { fw, wUnit, isMetric } = useUnits();
  const settings  = store.settings || {};
  const weightLogs = store.weightLogs || [];
  const workouts  = store.workouts || [];
  const foodLogs  = store.foodLogs || {};

  const insights = getInsightsList(store);
  const trend    = detectWeightTrend(store);

  const startWeight = settings.startWeight || weightLogs[0]?.weight || 0;
  const currentWeight = weightLogs[weightLogs.length - 1]?.weight || startWeight;
  const totalLostLbs = Math.max(0, parseFloat((startWeight - currentWeight).toFixed(1)));
  const totalLostDisplay = fw(totalLostLbs).value;

  const foodDays = Object.values(foodLogs).filter(day => {
    const entries = [...(day.breakfast || []), ...(day.lunch || []), ...(day.dinner || []), ...(day.snacks || [])];
    return entries.length > 0;
  }).length;

  const hasData = weightLogs.length >= 2 || foodDays >= 2;

  return (
    <div className="min-h-screen" style={{ background: '#07060a' }}>
      {/* Cinematic hero */}
      <div className="relative overflow-hidden" style={{ height: 260 }}>
        <img
          src="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=1400&q=60"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(8,6,4,0.78)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 60%, rgba(245,158,11,0.07) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 100% 100%, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, #07060a, transparent)' }} />

        <div className="absolute inset-0 flex flex-col justify-end px-4 md:px-6 pb-6 md:pb-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} style={{ color: '#f59e0b' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f59e0b', letterSpacing: '0.18em' }}>Insights</span>
            </div>
            <h1 className="font-black tracking-tight leading-none mb-2" style={{ fontSize: 'clamp(30px,7vw,46px)', color: '#f5f4f2' }}>
              Your Data,<br />Decoded.
            </h1>
            <p className="text-sm" style={{ color: '#78716c' }}>
              {hasData ? 'Patterns detected from your real logs.' : 'Log more data to unlock intelligent insights.'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6 max-w-5xl pb-24 md:pb-10">
        {/* Summary bar */}
        <GlassCard className="p-5 mb-6" glow="amber" delay={0}>
          <div className="flex flex-wrap gap-6 items-center">
            {[
              { label: 'Days tracked',        value: weightLogs.length,   color: '#f59e0b' },
              { label: `${wUnit} lost`,        value: totalLostDisplay || '—', color: '#10b981' },
              { label: 'Workouts',             value: workouts.length,    color: '#6366f1' },
              { label: 'Food days',            value: foodDays,           color: '#f97316' },
              ...(trend ? [{
                label: 'Rate/wk',
                value: Math.abs(trend.weeklyRateLbs) < 0.1
                  ? 'stable'
                  : isMetric
                    ? `${trend.weeklyRateLbs > 0 ? '+' : ''}${(trend.weeklyRateLbs * 0.453592).toFixed(2)} kg`
                    : `${trend.weeklyRateLbs > 0 ? '+' : ''}${trend.weeklyRateLbs.toFixed(1)} lbs`,
                color: trend.trend === 'declining' ? '#10b981' : trend.trend === 'rising' ? '#f97316' : '#78716c',
              }] : []),
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{s.label}</p>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: '#3d3835' }}>
              <Lightbulb size={13} style={{ color: '#f59e0b' }} />
              Live from your data
            </div>
          </div>
        </GlassCard>

        {/* Insights list */}
        {hasData && insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, i) => {
              const accent = TYPE_COLOR[insight.type] || '#78716c';
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="rounded-2xl p-5 flex gap-4"
                  style={{
                    background: insight.type === 'positive'
                      ? 'rgba(16,185,129,0.04)'
                      : insight.type === 'warning'
                        ? 'rgba(245,158,11,0.04)'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${accent}20`,
                  }}>
                  {/* Emoji icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}>
                    {insight.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${accent}15`, color: accent }}>
                          {insight.tag}
                        </span>
                        <TrendArrow type={insight.type} />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#f5f4f2' }}>{insight.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#78716c' }}>{insight.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl p-10 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-4xl mb-4">📊</p>
            <p className="text-base font-semibold mb-2" style={{ color: '#f5f4f2' }}>No patterns yet</p>
            <p className="text-sm" style={{ color: '#57534e' }}>
              Log your weight for 5+ days and track a few meals — then come back here to see what your data reveals.
            </p>
          </motion.div>
        )}

        {/* Motivational footer */}
        {totalLost > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 p-6 rounded-2xl text-center"
            style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)' }}>
            <p className="text-base font-semibold" style={{ color: '#f5f4f2' }}>
              You've lost {totalLost} lbs. That's real. That's earned.
            </p>
            <p className="text-sm mt-1" style={{ color: '#78716c' }}>
              The data doesn't lie — you're doing the work.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
