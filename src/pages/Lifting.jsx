import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { workouts, prs } from '../data/sampleData';
import { Dumbbell, Trophy, ChevronDown, ChevronUp, Clock, Zap, BarChart2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const MUSCLE_COLORS = {
  'Chest / Triceps': { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' },
  'Back / Biceps': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
  'Legs': { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  'Shoulders / Traps': { color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)' },
  'Arms': { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
};

function WorkoutCard({ workout, index }) {
  const [open, setOpen] = useState(index === 0);
  const style = MUSCLE_COLORS[workout.muscleGroup] || { color: '#78716c', bg: 'rgba(120,113,108,0.1)', border: 'rgba(120,113,108,0.2)' };
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);
  const totalVolume = workout.exercises.reduce((t, ex) =>
    t + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Color bar */}
        <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: style.color }} />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: '#f5f4f2' }}>{workout.muscleGroup}</p>
          <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>
            {workout.date} · {totalSets} sets · {totalVolume.toLocaleString()} lbs
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
          >
            {workout.muscleGroup.split(' / ')[0]}
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: '#57534e' }}>
            <Clock size={11} />
            {workout.duration}m
          </div>
          {open ? <ChevronUp size={15} style={{ color: '#57534e' }} /> : <ChevronDown size={15} style={{ color: '#57534e' }} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="p-4 space-y-4">
              {workout.exercises.map((ex) => (
                <div key={ex.name}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#78716c' }}>
                    {ex.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ex.sets.map((set, i) => (
                      <div
                        key={i}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#d4cfc9', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        {set.weight > 0 ? `${set.weight} × ${set.reps}` : `BW × ${set.reps}`}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {workout.notes && (
                <p
                  className="text-xs italic mt-2"
                  style={{ color: '#78716c', borderLeft: '2px solid rgba(245,158,11,0.3)', paddingLeft: 10 }}
                >
                  "{workout.notes}"
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Lifting() {
  const splitCount = workouts.reduce((acc, w) => {
    acc[w.muscleGroup] = (acc[w.muscleGroup] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl" style={{ background: '#07060a' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell size={18} style={{ color: '#6366f1' }} />
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f4f2' }}>Lifting</h1>
        </div>
        <p className="text-sm" style={{ color: '#78716c' }}>
          Track strength, volume, and PRs during your cut.
        </p>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Sessions', value: workouts.length, icon: Dumbbell, color: '#6366f1', sub: 'logged' },
          { label: 'This Week', value: workouts.filter(w => {
            const d = new Date(w.date);
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
            return d >= weekStart;
          }).length, icon: Zap, color: '#f59e0b', sub: 'workouts' },
          { label: 'PRs', value: prs.length, icon: Trophy, color: '#eab308', sub: 'tracked' },
        ].map((c, i) => (
          <GlassCard key={c.label} className="p-4" delay={i * 0.07}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider" style={{ color: '#57534e' }}>{c.label}</span>
              <c.icon size={13} style={{ color: c.color }} />
            </div>
            <span className="text-2xl font-black" style={{ color: c.color }}>{c.value}</span>
            <p className="text-xs" style={{ color: '#57534e' }}>{c.sub}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Workouts */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#57534e' }}>Recent Workouts</h2>
          {workouts.map((w, i) => <WorkoutCard key={w.id} workout={w} index={i} />)}
        </div>

        {/* PRs + split */}
        <div className="space-y-4">
          {/* PRs */}
          <GlassCard className="p-4" delay={0.2}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} style={{ color: '#eab308' }} />
              <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Personal Records</h2>
            </div>
            <div className="space-y-3">
              {prs.map((pr) => (
                <div key={pr.exercise} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#f5f4f2' }}>{pr.exercise}</p>
                    <p className="text-xs" style={{ color: '#57534e' }}>{pr.date}</p>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-lg text-sm font-black"
                    style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}
                  >
                    {pr.weight} lbs
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Muscle split */}
          <GlassCard className="p-4" delay={0.25}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={14} style={{ color: '#6366f1' }} />
              <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Split</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(splitCount).map(([muscle, count]) => {
                const style = MUSCLE_COLORS[muscle] || { color: '#78716c' };
                const maxCount = Math.max(...Object.values(splitCount));
                return (
                  <div key={muscle}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: '#a8a29e' }}>{muscle}</span>
                      <span className="text-xs font-bold" style={{ color: style.color }}>{count}×</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        style={{ background: style.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Motivation */}
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}
          >
            <p className="text-sm font-medium" style={{ color: '#a5b4fc' }}>
              "Strength maintained during a cut is strength earned forever."
            </p>
            <p className="text-xs mt-2" style={{ color: '#4338ca' }}>Keep lifting heavy. Protect the muscle.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
