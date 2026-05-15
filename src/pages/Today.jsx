import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Target, Utensils, Dumbbell, CalendarDays, ChevronRight, Zap } from 'lucide-react';
import { useApexStore, getDailyTotals } from '../store/apexStore';
import { useNavigate } from 'react-router-dom';

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getGreeting(name) {
  const hour = new Date().getHours();
  const first = name?.split(' ')[0] || 'there';
  if (hour < 12) return `Morning, ${first} 🌅`;
  if (hour < 17) return `Afternoon, ${first} ☀️`;
  return `Evening, ${first} 🌙`;
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const CATEGORY_COLORS = {
  fitness: '#f59e0b', nutrition: '#ef4444', health: '#10b981',
  recovery: '#8b5cf6', growth: '#a78bfa', wellness: '#06b6d4', custom: '#78716c',
};

// ── HabitQuickRow ─────────────────────────────────────────────────────────────

function HabitQuickRow({ habit, done, onToggle }) {
  const color = CATEGORY_COLORS[habit.category] || '#78716c';
  return (
    <motion.button whileTap={{ scale: 0.97 }}
      onClick={() => onToggle(habit.id, !done)}
      className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-left transition-all"
      style={{
        background: done ? `${color}0d` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${done ? `${color}25` : 'rgba(255,255,255,0.06)'}`,
      }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: done ? color : 'rgba(255,255,255,0.06)' }}>
        {done
          ? <Check size={13} style={{ color: '#000' }} strokeWidth={3} />
          : <span style={{ fontSize: 13 }}>{habit.emoji}</span>}
      </div>
      <span className="text-sm flex-1" style={{ color: done ? '#a8a29e' : '#78716c',
        textDecoration: done ? 'line-through' : 'none' }}>
        {habit.name}
      </span>
      {done && <span className="text-[10px]" style={{ color }}>✓</span>}
    </motion.button>
  );
}

// ── Macro mini-card ───────────────────────────────────────────────────────────

function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px]" style={{ color: '#3d3a36' }}>{label}</span>
        <span className="text-[10px] font-medium" style={{ color }}>{value}g</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}

// ── Today page ────────────────────────────────────────────────────────────────

export default function Today() {
  const [store, update] = useApexStore();
  const navigate = useNavigate();

  const today      = todayStr();
  const settings   = store.settings || {};
  const habits     = (store.habits || []).filter(h => h.active !== false);
  const habitLogs  = store.habitLogs || {};
  const todayLog   = habitLogs[today] || {};
  const goals      = (store.goals || []).filter(g => !g.done).slice(0, 3);
  const events     = (store.calendarEvents || [])
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const totals = getDailyTotals();
  const calTarget  = settings.dailyCalorieTarget || 2100;
  const protTarget = settings.dailyProteinTarget || 180;
  const carbTarget = settings.dailyCarbTarget    || 200;
  const fatTarget  = settings.dailyFatTarget     || 65;
  const calPct     = Math.min((totals.calories / calTarget) * 100, 100);

  const doneTodayCount = habits.filter(h => todayLog[h.id]).length;
  const habitPct = habits.length > 0 ? Math.round((doneTodayCount / habits.length) * 100) : 0;

  // Last 7 days habit consistency
  const weekDates = getWeekDates();
  const weekStreak = weekDates.filter(d => {
    const log = habitLogs[d] || {};
    const dayHabits = habits.filter(h => h.active !== false);
    if (!dayHabits.length) return false;
    return dayHabits.filter(h => log[h.id]).length >= Math.ceil(dayHabits.length * 0.6);
  }).length;

  function handleToggle(habitId, value) {
    update(s => {
      const logs = { ...(s.habitLogs || {}) };
      logs[today] = { ...(logs[today] || {}), [habitId]: value };
      return { ...s, habitLogs: logs };
    });
  }

  function formatEventDate(dateStr) {
    if (dateStr === today) return 'Today';
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const DAYS_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-28 md:pb-10 max-w-2xl mx-auto" style={{ background: '#111010' }}>

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>
          {getGreeting(settings.name)}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#57534e' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Day score row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Habits', value: `${doneTodayCount}/${habits.length}`, sub: `${habitPct}%`, color: '#f59e0b', icon: Flame },
          { label: 'Calories', value: totals.calories, sub: `of ${calTarget}`, color: '#ef4444', icon: Utensils },
          { label: 'Streak', value: `${weekStreak}/7`, sub: 'days 60%+', color: '#10b981', icon: Zap },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <motion.div key={label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-3 flex flex-col gap-1"
            style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
            <Icon size={13} style={{ color }} />
            <p className="text-lg font-bold leading-none" style={{ color: '#f5f4f2' }}>{value}</p>
            <p className="text-[10px]" style={{ color: '#57534e' }}>{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Macros card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl p-4 mb-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Nutrition Today</p>
          <button onClick={() => navigate('/food')} className="text-xs flex items-center gap-1"
            style={{ color: '#57534e' }}>
            Log <ChevronRight size={10} />
          </button>
        </div>
        {/* Calorie bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: '#57534e' }}>Calories</span>
            <span className="text-xs font-bold" style={{ color: calPct >= 100 ? '#ef4444' : '#f59e0b' }}>
              {totals.calories} / {calTarget} kcal
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: calPct >= 100 ? '#ef4444' : 'linear-gradient(90deg, #f59e0b, #f97316)' }}
              animate={{ width: `${calPct}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
        <div className="flex gap-3">
          <MacroBar label="Protein" value={totals.protein} target={protTarget} color="#ef4444" />
          <MacroBar label="Carbs"   value={totals.carbs}   target={carbTarget} color="#f59e0b" />
          <MacroBar label="Fat"     value={totals.fat}     target={fatTarget}  color="#8b5cf6" />
        </div>
      </motion.div>

      {/* Habits */}
      {habits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Habits</p>
            <button onClick={() => navigate('/habits')} className="text-xs flex items-center gap-1"
              style={{ color: '#57534e' }}>
              All <ChevronRight size={10} />
            </button>
          </div>

          {/* Week dots */}
          <div className="flex gap-1.5 mb-3">
            {weekDates.map((date, i) => {
              const log = habitLogs[date] || {};
              const dayDone = habits.filter(h => log[h.id]).length;
              const pct = habits.length > 0 ? dayDone / habits.length : 0;
              const isToday = date === today;
              const isFuture = date > today;
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-0.5" style={{ opacity: isFuture ? 0.3 : 1 }}>
                  <div className="w-full rounded-md" style={{
                    height: 20,
                    background: pct >= 1 ? '#f59e0b' : pct >= 0.6 ? 'rgba(245,158,11,0.4)' : pct > 0 ? 'rgba(245,158,11,0.15)' : isToday ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: isToday ? '1px solid rgba(245,158,11,0.4)' : 'none',
                  }} />
                  <span style={{ fontSize: 7, color: isToday ? '#f59e0b' : '#3d3a36' }}>{DAYS_ABBR[i]}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            {habits.slice(0, 6).map(habit => (
              <HabitQuickRow key={habit.id} habit={habit} done={!!todayLog[habit.id]}
                onToggle={handleToggle} />
            ))}
            {habits.length > 6 && (
              <button onClick={() => navigate('/habits')} className="w-full text-center text-xs py-2"
                style={{ color: '#57534e' }}>
                +{habits.length - 6} more habits
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Goals snapshot */}
      {goals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Goals</p>
            <button onClick={() => navigate('/goals')} className="text-xs flex items-center gap-1"
              style={{ color: '#57534e' }}>
              All <ChevronRight size={10} />
            </button>
          </div>
          <div className="space-y-2.5">
            {goals.map(goal => {
              const pct = goal.progress || 0;
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs" style={{ color: '#a8a29e' }}>{goal.title}</p>
                    <span className="text-[10px] font-medium" style={{ color: '#57534e' }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #a78bfa, #7c3aed)' }}
                      animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Upcoming events */}
      {events.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Upcoming</p>
            <button onClick={() => navigate('/calendar')} className="text-xs flex items-center gap-1"
              style={{ color: '#57534e' }}>
              Calendar <ChevronRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {events.map(event => (
              <div key={event.id} className="flex items-center gap-3 py-1.5">
                <span style={{ fontSize: 20 }}>{event.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: '#a8a29e' }}>{event.title}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: event.date === today ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                    color: event.date === today ? '#f59e0b' : '#57534e' }}>
                  {formatEventDate(event.date)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {habits.length === 0 && goals.length === 0 && events.length === 0 && (
        <div className="text-center py-16">
          <p style={{ fontSize: 48 }}>⚡</p>
          <p className="mt-4 text-sm font-medium" style={{ color: '#57534e' }}>Your day starts here</p>
          <p className="text-xs mt-1 mb-6" style={{ color: '#3d3a36' }}>Set up habits and goals to see your daily command center</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/habits')} className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              Add Habits
            </button>
            <button onClick={() => navigate('/goals')} className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
              Set Goals
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
