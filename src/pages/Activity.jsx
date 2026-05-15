import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Footprints, Flame, TrendingUp, CheckCircle, Wind } from 'lucide-react';
import { stepLogs, profile } from '../data/sampleData';
import GlassCard from '../components/GlassCard';

const today = stepLogs[stepLogs.length - 1];
const week = stepLogs.slice(-7);
const avgSteps = Math.round(week.reduce((s, d) => s + d.steps, 0) / week.length);
const goalDays = week.filter((d) => d.steps >= profile.dailyStepTarget).length;
const totalBurned = week.reduce((s, d) => s + d.caloriesBurned, 0);
const stepPct = Math.min((today.steps / profile.dailyStepTarget) * 100, 100);

// Circular progress helper
const CIRCUMFERENCE = 2 * Math.PI * 52;

export default function Activity() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl" style={{ background: '#07060a' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <Footprints size={18} style={{ color: '#eab308' }} />
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f4f2' }}>Activity</h1>
        </div>
        <p className="text-sm" style={{ color: '#78716c' }}>Daily goal: {profile.dailyStepTarget.toLocaleString()} steps</p>
      </motion.div>

      {/* Hero: steps ring + stats */}
      <div className="grid grid-cols-1 gap-4 mb-5 lg:grid-cols-3">
        {/* Step ring */}
        <GlassCard className="p-6 flex flex-col items-center justify-center" glow="amber" delay={0}>
          <div className="relative mb-3">
            <svg width={130} height={130} className="-rotate-90">
              <circle cx={65} cy={65} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
              <motion.circle
                cx={65} cy={65} r={52} fill="none"
                stroke="url(#stepGrad)" strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - stepPct / 100) }}
                transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
              <defs>
                <linearGradient id="stepGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
              <span className="text-2xl font-black" style={{ color: '#f59e0b' }}>
                {(today.steps / 1000).toFixed(1)}k
              </span>
              <span className="text-xs" style={{ color: '#78716c' }}>steps</span>
            </div>
          </div>
          <p className="text-sm font-medium" style={{ color: '#f5f4f2' }}>
            {today.steps >= profile.dailyStepTarget ? '🎯 Goal hit!' : `${(profile.dailyStepTarget - today.steps).toLocaleString()} to go`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>{stepPct.toFixed(0)}% of daily goal</p>
        </GlassCard>

        {/* Stats column */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Calories Burned', value: today.caloriesBurned, unit: 'kcal', icon: Flame, color: '#f97316' },
              { label: '7-Day Avg', value: `${(avgSteps / 1000).toFixed(1)}k`, unit: 'steps', icon: TrendingUp, color: '#6366f1' },
              { label: 'Goal Days', value: `${goalDays}/7`, unit: '', icon: CheckCircle, color: '#10b981' },
            ].map((c, i) => (
              <GlassCard key={c.label} className="p-4" delay={0.1 + i * 0.07}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider" style={{ color: '#57534e' }}>{c.label}</span>
                  <c.icon size={13} style={{ color: c.color }} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black" style={{ color: c.color }}>{c.value}</span>
                  {c.unit && <span className="text-xs" style={{ color: '#57534e' }}>{c.unit}</span>}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Weekly cals burned */}
          <GlassCard className="p-4 flex-1" delay={0.2}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Weekly Burn</p>
                <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>{totalBurned.toLocaleString()} kcal this week</p>
              </div>
              <Wind size={14} style={{ color: '#f97316' }} />
            </div>
            <div className="flex items-end gap-2 h-16">
              {week.map((d, i) => {
                const h = Math.max(8, (d.caloriesBurned / 700) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-sm"
                      style={{ background: 'linear-gradient(to top, #f97316, #fb923c)', opacity: 0.85 }}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
                    />
                    <span className="text-xs" style={{ color: '#57534e' }}>{d.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Steps bar chart */}
      <GlassCard className="p-5" delay={0.3}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#f5f4f2' }}>Daily Steps</h2>
            <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>{goalDays} of 7 days hit 10k goal</p>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: '#78716c' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#f59e0b' }} />
              Above goal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#374151' }} />
              Below goal
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stepLogs.map(d => ({ date: d.date.slice(5), steps: d.steps }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={30} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{ background: '#1a1814', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: '#78716c' }}
              formatter={v => [v.toLocaleString(), 'steps']}
            />
            <ReferenceLine y={profile.dailyStepTarget} stroke="rgba(245,158,11,0.3)" strokeDasharray="5 3" />
            <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
              {stepLogs.map((d, i) => (
                <Cell key={i} fill={d.steps >= profile.dailyStepTarget ? '#f59e0b' : '#292524'} fillOpacity={d.steps >= profile.dailyStepTarget ? 0.9 : 0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
