import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Flame, Target, Footprints, TrendingDown, Camera,
  Check, Zap, Sun, ChefHat, ChevronRight, Maximize2,
} from 'lucide-react';
import { useApexStore, getDailyTotals, getDailyCheckin, saveDailyCheckin } from '../store/apexStore';
import { macroLogs } from '../data/sampleData';
import { formatWeight } from '../utils/unitConversions';
import { getContextualQuote, getContextualSubline } from '../data/motivationQuotes';
import { getRecentMilestone, RARITY_META } from '../data/achievements';
import { detectConsistencyStreak } from '../services/aiCoach';
import AICoachCard from '../components/AICoachCard';
import DailyTimeline from '../components/DailyTimeline';
import FocusMode from '../components/FocusMode';

const GAME_PLAN = [
  { id: 'workout', label: 'Complete workout', emoji: '🏋️' },
  { id: 'steps',   label: 'Hit 10k steps',    emoji: '👟' },
  { id: 'water',   label: 'Drink 3L water',   emoji: '💧' },
  { id: 'protein', label: 'Hit protein target',emoji: '🥩' },
  { id: 'sleep',   label: 'Sleep by 11pm',    emoji: '😴' },
];

const DONUT_COLORS = ['#f59e0b', '#10b981', '#3b82f6'];

function StatCard({ title, value, unit, sub, icon: Icon, iconColor, sparkData, barPct, ring, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      transition={{ delay: delay ?? 0, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden cursor-default"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#57534e', letterSpacing: '0.06em' }}>{title}</p>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-3xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>{value}</span>
            {unit && <span className="text-sm" style={{ color: '#78716c' }}>{unit}</span>}
          </div>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{sub}</p>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20` }}>
            <Icon size={16} style={{ color: iconColor }} />
          </div>
        )}
        {ring != null && (
          <svg width={46} height={46} className="flex-shrink-0">
            <circle cx={23} cy={23} r={19} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
            <circle cx={23} cy={23} r={19} fill="none" stroke="#f59e0b" strokeWidth={4}
              strokeDasharray={`${2 * Math.PI * 19}`}
              strokeDashoffset={`${2 * Math.PI * 19 * (1 - ring / 100)}`}
              strokeLinecap="round" transform="rotate(-90 23 23)" />
            <text x={23} y={27} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight="700">{ring}%</text>
          </svg>
        )}
      </div>
      {sparkData && sparkData.length > 1 && (
        <div style={{ height: 38, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sg-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
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
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" style={{ background: iconColor || '#f59e0b' }}
              initial={{ width: 0 }} animate={{ width: `${Math.min(barPct, 100)}%` }}
              transition={{ delay: (delay ?? 0) + 0.3, duration: 0.7, ease: 'easeOut' }} />
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
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [store] = useApexStore();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [focusOpen, setFocusOpen] = useState(false);
  const [checkin, setCheckin] = useState(() => getDailyCheckin(todayStr));
  const gamePlan = checkin.gamePlan || {};

  const settings = store.settings || {};
  const targets = {
    calories: settings.dailyCalorieTarget  || 2100,
    protein:  settings.dailyProteinTarget  || 180,
    carbs:    settings.dailyCarbTarget     || 200,
    fat:      settings.dailyFatTarget      || 65,
  };

  const totals     = getDailyTotals(todayStr);
  const weightLogs = store.weightLogs || [];
  const latestWeightLbs = weightLogs[weightLogs.length - 1]?.weight || settings.startWeight;
  const lostLbs = (settings.startWeight || 185) - latestWeightLbs;

  const units = settings.units || 'imperial';
  const wtDisplay = formatWeight(latestWeightLbs, units);
  const latestWeight = wtDisplay.value;
  const weightUnitLabel = wtDisplay.unit;
  const lost = units === 'metric'
    ? (lostLbs * 0.453592).toFixed(1)
    : lostLbs.toFixed(1);

  const todayMacros    = macroLogs[macroLogs.length - 1] || {};
  const todayCalories  = totals.calories > 0 ? totals.calories : (todayMacros.calories || 1850);
  const todayProtein   = totals.protein  > 0 ? totals.protein  : (todayMacros.protein  || 165);
  const todayCarbs     = totals.carbs    > 0 ? totals.carbs    : (todayMacros.carbs    || 155);
  const todayFat       = totals.fat      > 0 ? totals.fat      : (todayMacros.fat      || 50);
  const steps          = todayMacros.steps || 7843;

  const sparkWeightData  = weightLogs.slice(-10).map(d => ({ v: d.weight }));
  const weeklyAvgCal     = Math.round(macroLogs.slice(-7).reduce((s, d) => s + d.calories, 0) / 7);
  const weeklyAvgProtein = Math.round(macroLogs.slice(-7).reduce((s, d) => s + (d.protein || 0), 0) / 7);

  const donutData  = [
    { name: 'Protein', cal: todayProtein * 4 },
    { name: 'Carbs',   cal: todayCarbs * 4 },
    { name: 'Fat',     cal: todayFat * 9 },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.cal, 0) || 1;

  const goalDate     = new Date((settings.goalDate || '2026-08-31') + 'T12:00:00');
  const daysLeft     = Math.max(0, Math.ceil((goalDate - new Date()) / 86400000));
  const remaining    = { calories: Math.max(0, targets.calories - todayCalories), protein: Math.max(0, targets.protein - todayProtein) };
  const completedCount = GAME_PLAN.filter(t => gamePlan[t.id]).length;
  const streak       = detectConsistencyStreak(store);
  const milestone    = getRecentMilestone(store);

  // Dynamic greeting
  const hour    = new Date().getHours();
  const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const quote    = getContextualQuote(store);
  const subline  = getContextualSubline(store, streak, remaining);

  const toggleCheck = (id) => {
    const updated = { ...checkin, gamePlan: { ...gamePlan, [id]: !gamePlan[id] } };
    setCheckin(updated);
    saveDailyCheckin(todayStr, updated);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      {/* ── Cinematic Hero ── */}
      <div className="relative overflow-hidden" style={{ height: 'clamp(240px, 35vw, 320px)' }}>
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=60)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }} />
        <div className="absolute inset-0" style={{ background: 'rgba(8,6,4,0.8)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.14) 0%, transparent 55%, rgba(249,115,22,0.05) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.04,
        }} />

        {/* Focus Mode toggle */}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          onClick={() => setFocusOpen(true)}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 min-touch"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', color: '#57534e' }}>
          <Maximize2 size={11} />Focus
        </motion.button>

        <div className="absolute inset-0 flex flex-col justify-center px-5 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 md:mb-3 hidden sm:block" style={{ color: '#a8896e', letterSpacing: '0.14em' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="font-black tracking-tight leading-[1.05] mb-1.5" style={{ fontSize: 'clamp(28px,6vw,48px)', color: '#f5f4f2' }}>
              {greeting},<br />
              <span style={{ color: '#f59e0b' }}>{settings.name || 'Naman'}.</span>
            </h1>
            <p className="text-xs md:text-sm mb-1" style={{ color: '#78716c' }}>{subline}</p>
            <p className="text-xs italic hidden sm:block" style={{ color: '#3d3835' }}>"{quote}"</p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex gap-2 md:gap-3">
          {[
            { label: 'Days left',              value: daysLeft,  color: '#f59e0b' },
            { label: `${weightUnitLabel} lost`, value: `−${lost}`, color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="text-center px-3 py-2.5 md:px-5 md:py-4 rounded-2xl" style={{
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
            }}>
              <p className="font-black" style={{ fontSize: 'clamp(18px,4vw,30px)', color: s.color }}>{s.value}</p>
              <p className="text-[9px] md:text-[11px] mt-0.5 uppercase tracking-wider" style={{ color: '#57534e' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-28" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />
      </div>

      <div className="px-4 md:px-6 pb-24 md:pb-10" style={{ marginTop: -24 }}>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatCard title="Weight"   value={latestWeight} unit={weightUnitLabel} sub={`−${lost} ${weightUnitLabel} lost`}
            icon={TrendingDown} iconColor="#f59e0b" sparkData={sparkWeightData} delay={0.05} />
          <StatCard title="Calories" value={todayCalories} unit="kcal" sub={`${remaining.calories} kcal left`}
            icon={Flame} iconColor="#f97316" barPct={(todayCalories / targets.calories) * 100} delay={0.1} />
          <StatCard title="Protein"  value={todayProtein} unit="g" sub={`Target: ${targets.protein}g`}
            icon={Target} iconColor="#10b981" barPct={(todayProtein / targets.protein) * 100} delay={0.15} />
          <StatCard title="Steps"    value={steps.toLocaleString()} unit="" sub="Goal: 10,000"
            icon={Footprints} iconColor="#3b82f6" barPct={(steps / 10000) * 100} delay={0.2} />
          <StatCard title="Consistency" value="" sub="This week" ring={92} delay={0.25} />
          <StatCard title="Streak"   value={streak || 11} unit="" sub="days in a row" icon={Flame} iconColor="#f59e0b" delay={0.3} />
        </div>

        {/* ── Body grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Left: 2 cols */}
          <div className="md:col-span-2 flex flex-col gap-5">

            {/* Game Plan */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Today's Game Plan</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>
                    {completedCount === GAME_PLAN.length
                      ? '🔥 All done. You earned it.'
                      : `${completedCount}/${GAME_PLAN.length} complete · Keep stacking wins.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #f59e0b, #10b981)' }}
                      animate={{ width: `${(completedCount / GAME_PLAN.length) * 100}%` }}
                      transition={{ duration: 0.4 }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                    {Math.round((completedCount / GAME_PLAN.length) * 100)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {GAME_PLAN.map((task, i) => (
                  <motion.button key={task.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    onClick={() => toggleCheck(task.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all min-touch"
                    style={{
                      background: gamePlan[task.id] ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${gamePlan[task.id] ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    <motion.div
                      animate={{ scale: gamePlan[task.id] ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 0.25 }}
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: gamePlan[task.id] ? '#10b981' : 'rgba(255,255,255,0.06)',
                        border: gamePlan[task.id] ? 'none' : '1px solid rgba(255,255,255,0.12)',
                        boxShadow: gamePlan[task.id] ? '0 0 10px rgba(16,185,129,0.4)' : 'none',
                      }}>
                      {gamePlan[task.id] && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
                    </motion.div>
                    <span className="text-sm flex-1" style={{
                      color: gamePlan[task.id] ? '#4d4844' : '#a8a29e',
                      textDecoration: gamePlan[task.id] ? 'line-through' : 'none',
                    }}>
                      {task.emoji} {task.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Daily Timeline */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.4 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <DailyTimeline />
            </motion.div>

            {/* Nutrition Overview */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.4 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Nutrition Overview</h2>
                <div className="flex gap-5">
                  {[{ label: '7-day avg cal', value: weeklyAvgCal, unit: 'kcal' },
                    { label: 'avg protein',   value: weeklyAvgProtein, unit: 'g' }].map(s => (
                    <div key={s.label} className="text-right">
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: '#57534e' }}>{s.label}</p>
                      <p className="text-sm font-bold" style={{ color: '#f5f4f2' }}>
                        {s.value}<span className="text-xs font-normal ml-0.5" style={{ color: '#78716c' }}>{s.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div style={{ width: 116, height: 116, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="cal" cx="50%" cy="50%"
                        innerRadius={36} outerRadius={52} strokeWidth={0} startAngle={90} endAngle={-270}>
                        {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3.5">
                  <MacroBar label="Protein" current={todayProtein} target={targets.protein} color="#f59e0b" />
                  <MacroBar label="Carbs"   current={todayCarbs}   target={targets.carbs}   color="#10b981" />
                  <MacroBar label="Fat"     current={todayFat}     target={targets.fat}     color="#3b82f6" />
                </div>
                <div className="flex flex-col gap-3 flex-shrink-0">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                      <div>
                        <p className="text-[10px]" style={{ color: '#a8a29e' }}>{d.name}</p>
                        <p className="text-xs font-semibold" style={{ color: '#f5f4f2' }}>{Math.round(d.cal / donutTotal * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Weight Trend */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.53, duration: 0.4 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)' }} />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Weight Trend</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>Built through consistency.</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#a8896e', border: '1px solid rgba(245,158,11,0.15)' }}>Last 14 days</span>
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightLogs.slice(-14).map(d => ({ date: d.date.slice(5), weight: d.weight }))}
                    margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#3d3835', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#3d3835', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1a1714', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, color: '#f5f4f2', fontSize: 12 }}
                      labelStyle={{ color: '#78716c' }}
                    />
                    <Area type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2.5} fill="url(#wGrad)" dot={false} activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-5">

            {/* AI Coach card */}
            <AICoachCard delay={0.38} />

            {/* Daily Insight */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(245,158,11,0.1) 0%, rgba(249,115,22,0.05) 60%, rgba(255,255,255,0.03) 100%)',
                border: '1px solid rgba(245,158,11,0.18)',
              }}>
              <div className="absolute -top-6 -right-6 w-28 h-28 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)', filter: 'blur(16px)' }} />
              <div className="flex items-center gap-2 mb-3">
                <Sun size={13} style={{ color: '#f59e0b' }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#a8896e', letterSpacing: '0.1em' }}>Daily Insight</p>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#c9c2bb', fontStyle: 'italic' }}>
                "Averaging{' '}
                <span style={{ color: '#f59e0b', fontStyle: 'normal', fontWeight: 700 }}>{weeklyAvgCal} kcal/day</span>
                {' '}— a{' '}
                <span style={{ color: '#10b981', fontStyle: 'normal', fontWeight: 700 }}>{Math.max(0, (settings.tdee || 2600) - weeklyAvgCal)} kcal</span>
                {' '}deficit. Right on track."
              </p>
              <div className="pt-3" style={{ borderTop: '1px solid rgba(245,158,11,0.1)' }}>
                <p className="text-xs leading-relaxed" style={{ color: '#57534e', fontStyle: 'italic' }}>
                  "Discipline compounds. One good day at a time."
                </p>
              </div>
            </motion.div>

            {/* Today's Macros */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <h2 className="text-sm font-bold mb-4" style={{ color: '#f5f4f2' }}>Today's Macros</h2>
              <div className="space-y-3.5">
                <MacroBar label="Protein" current={todayProtein} target={targets.protein} color="#f59e0b" />
                <MacroBar label="Carbs"   current={todayCarbs}   target={targets.carbs}   color="#10b981" />
                <MacroBar label="Fat"     current={todayFat}     target={targets.fat}     color="#3b82f6" />
              </div>
            </motion.div>

            {/* Recent Milestone */}
            {milestone && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.54, duration: 0.4 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, ${RARITY_META[milestone.rarity].glow} 0%, rgba(255,255,255,0.03) 100%)`,
                  border: `1px solid ${RARITY_META[milestone.rarity].color}30`,
                }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${RARITY_META[milestone.rarity].color}40, transparent)` }} />
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ fontSize: 18 }}>{milestone.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold" style={{ color: '#f5f4f2' }}>{milestone.name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{ background: `${RARITY_META[milestone.rarity].color}20`, color: RARITY_META[milestone.rarity].color }}>
                        {RARITY_META[milestone.rarity].label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{milestone.description}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Cook Something CTA */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, transition: { duration: 0.18 } }}
              transition={{ delay: 0.58, duration: 0.4 }}
              className="rounded-2xl overflow-hidden relative"
              style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=60)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.22) saturate(1.4)',
              }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(249,115,22,0.1))' }} />
              <div className="relative p-5">
                <ChefHat size={22} style={{ color: '#f59e0b', marginBottom: 10 }} />
                <h3 className="text-sm font-bold mb-1.5" style={{ color: '#f5f4f2' }}>What's for dinner?</h3>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: '#78716c' }}>
                  {remaining.protein > 20 ? `${remaining.protein}g protein left to hit. ` : ''}
                  Let AI build the perfect recipe.
                </p>
                <a href="/cook" className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#f59e0b' }}>
                  <Zap size={11} />Cook Something <ChevronRight size={12} />
                </a>
              </div>
            </motion.div>

            {/* Progress Pics */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.64, duration: 0.4 }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Camera size={13} style={{ color: '#10b981' }} />
                <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Progress Pics</h2>
              </div>
              <div className="rounded-xl h-20 flex flex-col items-center justify-center gap-1.5"
                style={{ background: 'rgba(16,185,129,0.04)', border: '1px dashed rgba(16,185,129,0.15)' }}>
                <Camera size={18} style={{ color: '#2d5045' }} />
                <p className="text-xs" style={{ color: '#2d5045' }}>Document your transformation</p>
                <a href="/progress" className="text-xs font-semibold" style={{ color: '#4a7c5c' }}>Upload photo →</a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
