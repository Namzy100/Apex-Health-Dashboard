import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Flame, Target, Footprints, TrendingDown, Camera,
  Plus, Check, Zap, Star, Sun, ChefHat, ChevronRight,
} from 'lucide-react';
import { useApexStore, getDailyTotals, getDailyCheckin, saveDailyCheckin } from '../store/apexStore';
import { macroLogs } from '../data/sampleData';

const GAME_PLAN = [
  { id: 'workout', label: 'Complete workout', emoji: '🏋️' },
  { id: 'steps', label: 'Hit 10k steps', emoji: '👟' },
  { id: 'water', label: 'Drink 3L water', emoji: '💧' },
  { id: 'protein', label: 'Hit protein target', emoji: '🥩' },
  { id: 'sleep', label: 'Sleep by 11pm', emoji: '😴' },
];

const DONUT_COLORS = ['#f59e0b', '#10b981', '#3b82f6'];

function StatCard({ title, value, unit, sub, icon: Icon, iconColor, sparkData, barPct, ring, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: '#57534e' }}>{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>{value}</span>
            {unit && <span className="text-sm" style={{ color: '#78716c' }}>{unit}</span>}
          </div>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{sub}</p>}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}18` }}>
            <Icon size={15} style={{ color: iconColor }} />
          </div>
        )}
        {ring != null && (
          <svg width={44} height={44} className="flex-shrink-0">
            <circle cx={22} cy={22} r={18} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
            <circle cx={22} cy={22} r={18} fill="none" stroke="#f59e0b" strokeWidth={4}
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - ring / 100)}`}
              strokeLinecap="round" transform="rotate(-90 22 22)" />
            <text x={22} y={26} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight="700">{ring}%</text>
          </svg>
        )}
      </div>
      {sparkData && (
        <div style={{ height: 36, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sg-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={1.5} fill={`url(#sg-${title})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {barPct != null && (
        <div className="mt-1">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" style={{ background: iconColor || '#f59e0b' }}
              initial={{ width: 0 }} animate={{ width: `${Math.min(barPct, 100)}%` }}
              transition={{ delay: (delay ?? 0) + 0.3, duration: 0.6, ease: 'easeOut' }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MacroBar({ label, current, target, color }) {
  const pct = Math.min((current / (target || 1)) * 100, 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium" style={{ color: '#a8a29e' }}>{label}</span>
        <span className="text-xs" style={{ color: '#57534e' }}>{current}g / {target}g</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [store] = useApexStore();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [checkin, setCheckin] = useState(() => getDailyCheckin(todayStr));
  const gamePlan = checkin.gamePlan || {};

  const settings = store.settings;
  const targets = {
    calories: settings.dailyCalorieTarget,
    protein: settings.dailyProteinTarget,
    carbs: settings.dailyCarbTarget || 200,
    fat: settings.dailyFatTarget || 65,
  };

  // Real data from store
  const totals = getDailyTotals(todayStr);
  const weightLogs = store.weightLogs || [];
  const latestWeight = weightLogs[weightLogs.length - 1]?.weight || settings.startWeight;
  const lost = (settings.startWeight - latestWeight).toFixed(1);

  // Fall back to sample macro logs for charts
  const todayMacros = macroLogs[macroLogs.length - 1] || {};
  const todayCalories = totals.calories > 0 ? totals.calories : (todayMacros.calories || 1850);
  const todayProtein = totals.protein > 0 ? totals.protein : (todayMacros.protein || 165);
  const todayCarbs = totals.carbs > 0 ? totals.carbs : (todayMacros.carbs || 155);
  const todayFat = totals.fat > 0 ? totals.fat : (todayMacros.fat || 50);
  const steps = todayMacros.steps || 7843;

  const sparkWeightData = weightLogs.slice(-10).map(d => ({ v: d.weight }));
  const weeklyAvgCal = Math.round(macroLogs.slice(-7).reduce((s, d) => s + d.calories, 0) / 7);
  const weeklyAvgProtein = Math.round(macroLogs.slice(-7).reduce((s, d) => s + (d.protein || 0), 0) / 7);

  const donutData = [
    { name: 'Protein', cal: todayProtein * 4 },
    { name: 'Carbs', cal: todayCarbs * 4 },
    { name: 'Fat', cal: todayFat * 9 },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.cal, 0) || 1;

  const goalDate = new Date(settings.goalDate + 'T12:00:00');
  const daysLeft = Math.max(0, Math.ceil((goalDate - new Date()) / 86400000));
  const remaining = { calories: Math.max(0, targets.calories - todayCalories), protein: Math.max(0, targets.protein - todayProtein) };
  const completedCount = GAME_PLAN.filter(t => gamePlan[t.id]).length;

  const toggleCheck = (id) => {
    const updated = { ...checkin, gamePlan: { ...gamePlan, [id]: !gamePlan[id] } };
    setCheckin(updated);
    saveDailyCheckin(todayStr, updated);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Cinematic Hero */}
      <div className="relative overflow-hidden" style={{ height: 240 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1208 0%, #111010 45%, #0a0d10 100%)' }} />
        <div className="absolute" style={{ top: -60, right: 60, width: 320, height: 320, background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute" style={{ bottom: -40, left: 100, width: 200, height: 200, background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 65%)', filter: 'blur(30px)' }} />

        {/* SVG Mountain Scene */}
        <svg className="absolute right-0 bottom-0" width={480} height={240} viewBox="0 0 480 240" fill="none" style={{ opacity: 0.5 }}>
          <defs>
            <radialGradient id="sunG" cx="300" cy="85" r="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={300} cy={85} rx={70} ry={70} fill="url(#sunG)" />
          <circle cx={300} cy={90} r={16} fill="#f59e0b" opacity="0.75" />
          <circle cx={300} cy={90} r={10} fill="#fbbf24" />
          <path d="M0 190 L60 125 L120 162 L180 95 L240 142 L300 75 L360 122 L420 88 L480 130 L480 240 L0 240Z" fill="#1a1208" opacity="0.85" />
          <path d="M0 215 L80 158 L160 192 L240 138 L320 178 L400 148 L480 186 L480 240 L0 240Z" fill="#131010" />
          <g transform="translate(95, 138)">
            <line x1={0} y1={40} x2={-7} y2={68} stroke="#0d0b0b" strokeWidth={5} strokeLinecap="round" />
            <line x1={0} y1={40} x2={7} y2={68} stroke="#0d0b0b" strokeWidth={5} strokeLinecap="round" />
            <line x1={0} y1={16} x2={0} y2={40} stroke="#0d0b0b" strokeWidth={6} strokeLinecap="round" />
            <line x1={0} y1={26} x2={-15} y2={10} stroke="#0d0b0b" strokeWidth={4} strokeLinecap="round" />
            <line x1={0} y1={26} x2={15} y2={10} stroke="#0d0b0b" strokeWidth={4} strokeLinecap="round" />
            <circle cx={0} cy={8} r={8} fill="#0d0b0b" />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#a8896e' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: '#f5f4f2' }}>
              Good morning, {settings.name || 'Naman'}.
            </h1>
            <p className="text-sm" style={{ color: '#78716c' }}>
              {daysLeft} days to Aug 31 · {lost} lbs down · You've got this.
            </p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />
      </div>

      <div className="px-6 pb-10" style={{ marginTop: -20 }}>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard title="Weight" value={latestWeight} unit="lbs" sub={`−${lost} lbs lost`}
            icon={TrendingDown} iconColor="#f59e0b" sparkData={sparkWeightData} delay={0.05} />
          <StatCard title="Calories" value={todayCalories} unit="kcal"
            sub={`${remaining.calories} kcal left`}
            icon={Flame} iconColor="#f97316" barPct={(todayCalories / targets.calories) * 100} delay={0.1} />
          <StatCard title="Protein" value={todayProtein} unit="g" sub={`Target: ${targets.protein}g`}
            icon={Target} iconColor="#10b981" barPct={(todayProtein / targets.protein) * 100} delay={0.15} />
          <StatCard title="Steps" value={steps.toLocaleString()} unit="" sub="Goal: 10,000"
            icon={Footprints} iconColor="#3b82f6" barPct={(steps / 10000) * 100} delay={0.2} />
          <StatCard title="Consistency" value="" sub="This week" ring={92} delay={0.25} />
          <StatCard title="Streak" value={11} unit="" sub="days in a row" icon={Flame} iconColor="#f59e0b" delay={0.3} />
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-3 gap-5">

          {/* Left — 2 cols */}
          <div className="col-span-2 flex flex-col gap-5">

            {/* Game Plan */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Today's Game Plan</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{completedCount}/{GAME_PLAN.length} complete</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #f59e0b, #10b981)' }}
                    animate={{ width: `${(completedCount / GAME_PLAN.length) * 100}%` }}
                    transition={{ duration: 0.4 }} />
                </div>
              </div>
              <div className="space-y-2">
                {GAME_PLAN.map((task, i) => (
                  <motion.button key={task.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    onClick={() => toggleCheck(task.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: gamePlan[task.id] ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${gamePlan[task.id] ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: gamePlan[task.id] ? '#10b981' : 'rgba(255,255,255,0.06)', border: gamePlan[task.id] ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                      {gamePlan[task.id] && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
                    </div>
                    <span className="text-sm flex-1" style={{ color: gamePlan[task.id] ? '#57534e' : '#a8a29e', textDecoration: gamePlan[task.id] ? 'line-through' : 'none' }}>
                      {task.emoji} {task.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Nutrition Overview */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Nutrition Overview</h2>
                <div className="flex gap-5">
                  {[{ label: '7-day avg cal', value: weeklyAvgCal, unit: 'kcal' },
                    { label: 'avg protein', value: weeklyAvgProtein, unit: 'g' }].map(s => (
                    <div key={s.label} className="text-right">
                      <p className="text-[10px]" style={{ color: '#57534e' }}>{s.label}</p>
                      <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>
                        {s.value}<span className="text-xs font-normal ml-0.5" style={{ color: '#78716c' }}>{s.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="cal" cx="50%" cy="50%"
                        innerRadius={34} outerRadius={50} strokeWidth={0} startAngle={90} endAngle={-270}>
                        {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  <MacroBar label="Protein" current={todayProtein} target={targets.protein} color="#f59e0b" />
                  <MacroBar label="Carbs" current={todayCarbs} target={targets.carbs} color="#10b981" />
                  <MacroBar label="Fat" current={todayFat} target={targets.fat} color="#3b82f6" />
                </div>
                <div className="flex flex-col gap-2.5 flex-shrink-0">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i] }} />
                      <div>
                        <p className="text-[10px]" style={{ color: '#a8a29e' }}>{d.name}</p>
                        <p className="text-xs font-medium" style={{ color: '#f5f4f2' }}>{Math.round(d.cal / donutTotal * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Weight Trend */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Weight Trend</h2>
                <span className="text-xs" style={{ color: '#57534e' }}>Last 14 days</span>
              </div>
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightLogs.slice(-14).map(d => ({ date: d.date.slice(5), weight: d.weight }))}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#57534e', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f5f4f2', fontSize: 12 }} labelStyle={{ color: '#78716c' }} />
                    <Area type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} fill="url(#wGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">

            {/* Insight / motivation */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.4 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sun size={13} style={{ color: '#f59e0b' }} />
                <p className="text-xs font-medium" style={{ color: '#a8896e' }}>Daily insight</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#d4cfc9', fontStyle: 'italic' }}>
                "Averaging <span style={{ color: '#f59e0b' }}>{weeklyAvgCal} kcal/day</span> —
                a <span style={{ color: '#10b981' }}>{Math.max(0, (settings.tdee || 2600) - weeklyAvgCal)}</span> kcal deficit keeping you on track."
              </p>
            </motion.div>

            {/* Macro bars */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#f5f4f2' }}>Today's Macros</h2>
              <div className="space-y-3">
                <MacroBar label="Protein" current={todayProtein} target={targets.protein} color="#f59e0b" />
                <MacroBar label="Carbs" current={todayCarbs} target={targets.carbs} color="#10b981" />
                <MacroBar label="Fat" current={todayFat} target={targets.fat} color="#3b82f6" />
              </div>
            </motion.div>

            {/* Cook Something CTA */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.05))', border: '1px solid rgba(245,158,11,0.15)' }}>
              <ChefHat size={20} style={{ color: '#f59e0b', marginBottom: 8 }} />
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#f5f4f2' }}>What's for dinner?</h3>
              <p className="text-xs mb-3" style={{ color: '#78716c' }}>
                {remaining.protein > 20 ? `You need ${remaining.protein}g more protein. ` : ''}
                Let AI build you a perfect recipe.
              </p>
              <a href="/cook" className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#f59e0b' }}>
                <Zap size={12} />Cook Something <ChevronRight size={12} />
              </a>
            </motion.div>

            {/* Progress Pics preview */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.56, duration: 0.4 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera size={13} style={{ color: '#10b981' }} />
                  <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Progress Pics</h2>
                </div>
              </div>
              <div className="rounded-xl h-20 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <div className="text-center">
                  <Camera size={16} style={{ color: '#3d3a36', margin: '0 auto 4px' }} />
                  <a href="/progress" className="text-xs" style={{ color: '#3d3a36' }}>Upload photo →</a>
                </div>
              </div>
            </motion.div>

            {/* Recommended */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Recommended</h2>
                <Star size={13} style={{ color: '#f59e0b' }} />
              </div>
              {[
                { name: 'Greek Yogurt', cal: 100, protein: '17g', emoji: '🥛', bg: 'rgba(16,185,129,0.08)' },
                { name: 'Chicken Breast', cal: 165, protein: '31g', emoji: '🍗', bg: 'rgba(245,158,11,0.07)' },
                { name: 'Eggs', cal: 78, protein: '6g', emoji: '🥚', bg: 'rgba(249,115,22,0.07)' },
              ].map(f => (
                <div key={f.name} className="flex items-center gap-3 py-2 rounded-xl px-2 mb-1"
                  style={{ background: f.bg }}>
                  <span className="text-lg">{f.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: '#f5f4f2' }}>{f.name}</p>
                    <p className="text-xs" style={{ color: '#78716c' }}>{f.cal} cal · {f.protein} P</p>
                  </div>
                  <Plus size={12} style={{ color: '#57534e' }} />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
