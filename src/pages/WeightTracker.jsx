import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { TrendingDown, Target, Scale, Calendar, Trophy } from 'lucide-react';
import { profile, weightLogs } from '../data/sampleData';
import GlassCard from '../components/GlassCard';

const latest = weightLogs[weightLogs.length - 1];
const weekAvg = (weightLogs.slice(-7).reduce((s, d) => s + d.weight, 0) / 7).toFixed(1);
const totalLost = (profile.startWeight - latest.weight).toFixed(1);
const toGoal = (latest.weight - profile.goalWeight).toFixed(1);
const pctDone = ((totalLost / (profile.startWeight - profile.goalWeight)) * 100).toFixed(0);

const daysLeft = Math.max(0, Math.ceil((new Date(profile.goalDate) - new Date()) / 86400000));
const lbsPerWeekNeeded = daysLeft > 0
  ? ((latest.weight - profile.goalWeight) / (daysLeft / 7)).toFixed(2)
  : '0';

const chartData = weightLogs.map((d, i) => {
  const slice = weightLogs.slice(Math.max(0, i - 6), i + 1);
  const avg = (slice.reduce((s, x) => s + x.weight, 0) / slice.length).toFixed(1);
  return { date: d.date.slice(5), weight: d.weight, avg: parseFloat(avg) };
});

const milestones = [
  { label: '−5 lbs', weight: profile.startWeight - 5, reached: totalLost >= 5 },
  { label: '−10 lbs', weight: profile.startWeight - 10, reached: totalLost >= 10 },
  { label: '50% done', weight: profile.startWeight - (profile.startWeight - profile.goalWeight) / 2, reached: pctDone >= 50 },
  { label: 'Goal!', weight: profile.goalWeight, reached: false },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
      <p style={{ color: '#78716c' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.dataKey === 'weight' ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
          {p.dataKey === 'weight' ? '' : '7d avg: '}{p.value} lbs
        </p>
      ))}
    </div>
  );
};

export default function WeightTracker() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl" style={{ background: '#07060a' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={18} style={{ color: '#f59e0b' }} />
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f4f2' }}>Weight Tracker</h1>
        </div>
        <p className="text-sm" style={{ color: '#78716c' }}>
          {profile.startWeight} lbs → {profile.goalWeight} lbs goal · {pctDone}% complete
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
        {[
          { label: 'Current', value: latest.weight, unit: 'lbs', icon: Scale, color: '#f59e0b', glow: 'amber' },
          { label: 'Lost Total', value: totalLost, unit: 'lbs', icon: TrendingDown, color: '#10b981', glow: 'emerald' },
          { label: 'To Goal', value: toGoal, unit: 'lbs', icon: Target, color: '#f97316' },
          { label: 'Days Left', value: daysLeft, unit: 'days', sub: `Need ${lbsPerWeekNeeded} lbs/wk`, icon: Calendar, color: '#eab308' },
        ].map((c, i) => (
          <GlassCard key={c.label} className="p-4 relative overflow-hidden" glow={c.glow} delay={i * 0.07}>
            <div
              className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${c.color}18 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
            />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider" style={{ color: '#57534e' }}>{c.label}</span>
              <c.icon size={13} style={{ color: c.color }} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black" style={{ color: c.color }}>{c.value}</span>
              <span className="text-sm" style={{ color: '#57534e' }}>{c.unit}</span>
            </div>
            {c.sub && <p className="text-xs mt-1" style={{ color: '#57534e' }}>{c.sub}</p>}
          </GlassCard>
        ))}
      </div>

      {/* Main chart */}
      <GlassCard className="p-5 mb-4" delay={0.25}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold" style={{ color: '#f5f4f2' }}>Daily Weight + 7-Day Average</h2>
            <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>Trending steadily downward — keep it up.</p>
          </div>
          <div className="flex gap-4 text-xs" style={{ color: '#78716c' }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 rounded" style={{ background: '#f59e0b' }} />
              Daily
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 rounded" style={{ background: '#10b981' }} />
              7-day avg
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#57534e', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#57534e', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={profile.goalWeight}
              stroke="rgba(239,68,68,0.4)"
              strokeDasharray="5 3"
              label={{ value: 'Goal', fill: '#ef4444', fontSize: 10, position: 'insideRight' }}
            />
            <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2, fill: '#f59e0b', strokeWidth: 0 }} />
            <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Milestones */}
        <GlassCard className="p-5" delay={0.3}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={15} style={{ color: '#f59e0b' }} />
            <h3 className="font-bold text-sm" style={{ color: '#f5f4f2' }}>Milestones</h3>
          </div>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: m.reached ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                    border: m.reached ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {m.reached && <span style={{ fontSize: 10 }}>✓</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: m.reached ? '#10b981' : '#a8a29e' }}>{m.label}</span>
                    <span className="text-xs" style={{ color: '#57534e' }}>{m.weight} lbs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress to goal */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex justify-between text-xs mb-2" style={{ color: '#78716c' }}>
              <span>Progress to goal</span>
              <span>{pctDone}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pctDone}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: 'linear-gradient(90deg, #f59e0b, #10b981)' }}
              />
            </div>
          </div>
        </GlassCard>

        {/* Recent entries */}
        <GlassCard className="p-5" delay={0.35}>
          <h3 className="font-bold text-sm mb-4" style={{ color: '#f5f4f2' }}>Recent Entries</h3>
          <div className="space-y-0">
            {weightLogs.slice(-10).reverse().map((entry, i) => {
              const prev = weightLogs[weightLogs.length - 1 - i - 1];
              const delta = prev ? (entry.weight - prev.weight) : null;
              return (
                <div
                  key={entry.date}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < 9 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <span className="text-xs" style={{ color: '#78716c' }}>{entry.date}</span>
                  <span className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>{entry.weight} lbs</span>
                  {delta != null && (
                    <span
                      className="text-xs font-medium w-12 text-right"
                      style={{ color: delta < 0 ? '#10b981' : delta > 0 ? '#ef4444' : '#78716c' }}
                    >
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
