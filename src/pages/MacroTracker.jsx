import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Flame, Beef, Wheat, Droplets, Cookie } from 'lucide-react';
import { macroLogs, profile } from '../data/sampleData';
import GlassCard from '../components/GlassCard';

const today = macroLogs[macroLogs.length - 1];
const week = macroLogs.slice(-7);
const avgCals = Math.round(week.reduce((s, d) => s + d.calories, 0) / week.length);
const avgProtein = Math.round(week.reduce((s, d) => s + d.protein, 0) / week.length);
const proteinHitDays = week.filter((d) => d.protein >= profile.dailyProteinTarget).length;
const calPct = Math.min((today.calories / profile.dailyCalorieTarget) * 100, 100);
const protPct = Math.min((today.protein / profile.dailyProteinTarget) * 100, 100);

const pieData = [
  { name: 'Protein', value: today.protein * 4, color: '#10b981', raw: today.protein, unit: 'g' },
  { name: 'Carbs', value: today.carbs * 4, color: '#6366f1', raw: today.carbs, unit: 'g' },
  { name: 'Fat', value: today.fat * 9, color: '#f97316', raw: today.fat, unit: 'g' },
];
const totalKcal = pieData.reduce((s, d) => s + d.value, 0);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      <p style={{ color: payload[0].payload.fill || '#f5f4f2', fontWeight: 600 }}>{payload[0].value} kcal</p>
    </div>
  );
};

export default function MacroTracker() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl" style={{ background: '#07060a' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <Flame size={18} style={{ color: '#f97316' }} />
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f4f2' }}>Macros</h1>
        </div>
        <p className="text-sm" style={{ color: '#78716c' }}>
          Target: {profile.dailyCalorieTarget} kcal · {profile.dailyProteinTarget}g protein
        </p>
      </motion.div>

      {/* Today's big macro display */}
      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
        {[
          { label: 'Calories', value: today.calories, unit: 'kcal', icon: Flame, color: '#f97316', pct: calPct, target: profile.dailyCalorieTarget },
          { label: 'Protein', value: today.protein, unit: 'g', icon: Beef, color: '#10b981', pct: protPct, target: profile.dailyProteinTarget },
          { label: 'Carbs', value: today.carbs, unit: 'g', icon: Wheat, color: '#6366f1', target: 200 },
          { label: 'Fat', value: today.fat, unit: 'g', icon: Cookie, color: '#eab308', target: 65 },
        ].map((c, i) => (
          <GlassCard key={c.label} className="p-4 relative overflow-hidden" delay={i * 0.07}>
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{ background: `radial-gradient(ellipse at top right, ${c.color}0d, transparent 60%)` }}
            />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider" style={{ color: '#57534e' }}>{c.label}</span>
              <c.icon size={13} style={{ color: c.color }} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black" style={{ color: c.color }}>{c.value}</span>
              <span className="text-sm" style={{ color: '#57534e' }}>{c.unit}</span>
            </div>
            <p className="text-xs mt-0.5 mb-2" style={{ color: '#57534e' }}>of {c.target}</p>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((c.value / c.target) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                style={{ background: c.color }}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
        {/* Calorie chart */}
        <GlassCard className="p-5 lg:col-span-2" delay={0.25}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm" style={{ color: '#f5f4f2' }}>Calories by Day</h2>
              <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>7-day avg: {avgCals} kcal</p>
            </div>
            <div
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              Target {profile.dailyCalorieTarget}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={macroLogs.slice(-14).map(d => ({ date: d.date.slice(5), calories: d.calories }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} domain={[1600, 2400]} width={38} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                {macroLogs.slice(-14).map((d, i) => (
                  <Cell key={i} fill={d.calories <= profile.dailyCalorieTarget ? '#f97316' : '#ef4444'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Macro pie */}
        <GlassCard className="p-5 flex flex-col" delay={0.3}>
          <h2 className="font-bold text-sm mb-3" style={{ color: '#f5f4f2' }}>Today's Split</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} dataKey="value" strokeWidth={0} paddingAngle={2}>
                  {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 w-full mt-1">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span style={{ color: '#a8a29e' }}>{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: d.color, fontWeight: 600 }}>{d.raw}g</span>
                    <span style={{ color: '#57534e' }}>{((d.value / totalKcal) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Protein consistency */}
      <GlassCard className="p-5" delay={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#f5f4f2' }}>Protein Consistency</h2>
            <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>
              Hit target {proteinHitDays}/{week.length} days · avg {avgProtein}g
            </p>
          </div>
          <div
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background: proteinHitDays >= 5 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: proteinHitDays >= 5 ? '#10b981' : '#f59e0b',
              border: `1px solid ${proteinHitDays >= 5 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
            }}
          >
            {Math.round((proteinHitDays / week.length) * 100)}% hit rate
          </div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={macroLogs.slice(-14).map(d => ({ date: d.date.slice(5), protein: d.protein }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} domain={[130, 210]} width={35} />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#1a1814', border: 'none', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: '#78716c' }} itemStyle={{ color: '#10b981' }} formatter={v => [`${v}g`]} />
            <Bar dataKey="protein" radius={[4, 4, 0, 0]}>
              {macroLogs.slice(-14).map((d, i) => (
                <Cell key={i} fill={d.protein >= profile.dailyProteinTarget ? '#10b981' : '#374151'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: '#57534e' }}>
          <div className="w-3 h-1.5 rounded-full" style={{ background: '#10b981' }} />
          <span>Hit target ({profile.dailyProteinTarget}g+)</span>
          <div className="w-3 h-1.5 rounded-full ml-3" style={{ background: '#374151' }} />
          <span>Below target</span>
        </div>
      </GlassCard>

      {/* Water */}
      <GlassCard className="p-5 mt-4" delay={0.4}>
        <div className="flex items-center gap-2 mb-4">
          <Droplets size={15} style={{ color: '#38bdf8' }} />
          <h2 className="font-bold text-sm" style={{ color: '#f5f4f2' }}>Water Intake</h2>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-3xl font-black" style={{ color: '#38bdf8' }}>{today.water}</span>
            <span className="text-sm ml-1" style={{ color: '#57534e' }}>L today</span>
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((today.water / 3.5) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{ background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: '#57534e' }}>{today.water} / 3.5 L target</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
