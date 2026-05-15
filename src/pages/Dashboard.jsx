import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Flame, Target, Footprints, TrendingDown, Camera,
  Check, Zap, Sun, ChefHat, ChevronRight, Maximize2,
  X, Scale, Utensils, Download, Plus, BarChart3,
  ArrowRight, Droplets, Trophy, Activity,
} from 'lucide-react';
import {
  useApexStore, getDailyTotals, getDailyCheckin, saveDailyCheckin,
  addWeightEntry,
} from '../store/apexStore';
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

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function BottomSheet({ open, onClose, title, emoji, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          <motion.div
            key="sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{ maxHeight: '88svh' }}
          >
            <div className="rounded-t-3xl flex flex-col overflow-hidden"
              style={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '88svh', boxShadow: '0 -24px 80px rgba(0,0,0,0.6)' }}>
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2.5">
                  {emoji && <span style={{ fontSize: 22 }}>{emoji}</span>}
                  <h2 className="font-bold text-base" style={{ color: '#f5f4f2' }}>{title}</h2>
                </div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <X size={14} style={{ color: '#78716c' }} />
                </motion.button>
              </div>
              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 p-5 pb-sheet">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Macro bar (shared) ───────────────────────────────────────────────────────

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

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ title, value, unit, sub, icon: Icon, iconColor, sparkData, barPct, ring, delay, onTap }) {
  return (
    <motion.button
      onClick={onTap}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.96 }}
      transition={{ delay: delay ?? 0, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden text-left w-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
        cursor: onTap ? 'pointer' : 'default',
      }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
      {onTap && (
        <div className="absolute top-3 right-3">
          <ChevronRight size={12} style={{ color: '#3d3835' }} />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#57534e', letterSpacing: '0.06em' }}>{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight leading-tight" style={{ color: '#f5f4f2' }}>{value}</span>
            {unit && <span className="text-xs" style={{ color: '#78716c' }}>{unit}</span>}
          </div>
          {sub && <p className="text-[10px] mt-0.5 leading-tight" style={{ color: '#57534e' }}>{sub}</p>}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}20` }}>
            <Icon size={14} style={{ color: iconColor }} />
          </div>
        )}
        {ring != null && (
          <svg width={44} height={44} className="flex-shrink-0">
            <circle cx={22} cy={22} r={18} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3.5} />
            <circle cx={22} cy={22} r={18} fill="none" stroke="#f59e0b" strokeWidth={3.5}
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - ring / 100)}`}
              strokeLinecap="round" transform="rotate(-90 22 22)" />
            <text x={22} y={26} textAnchor="middle" fill="#f59e0b" fontSize={9} fontWeight="700">{ring}%</text>
          </svg>
        )}
      </div>
      {sparkData && sparkData.length > 1 && (
        <div style={{ height: 32, marginTop: 2 }}>
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
        <div className="mt-0.5">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" style={{ background: iconColor || '#f59e0b' }}
              initial={{ width: 0 }} animate={{ width: `${Math.min(barPct, 100)}%` }}
              transition={{ delay: (delay ?? 0) + 0.3, duration: 0.7, ease: 'easeOut' }} />
          </div>
        </div>
      )}
    </motion.button>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActionBtn({ icon: Icon, label, color, onClick }) {
  return (
    <motion.button whileTap={{ scale: 0.91 }} onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 min-touch"
      style={{ width: 72 }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: '#57534e' }}>{label}</span>
    </motion.button>
  );
}

// ─── Quick Log Weight Sheet ───────────────────────────────────────────────────

function LogWeightSheet({ open, onClose }) {
  const [val, setVal] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const w = parseFloat(val);
    if (!w || w < 50 || w > 500) return;
    addWeightEntry(new Date().toISOString().slice(0, 10), w);
    setSaved(true);
    setTimeout(() => { setSaved(false); setVal(''); onClose(); }, 900);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Weight" emoji="⚖️">
      <p className="text-xs mb-4" style={{ color: '#57534e' }}>Enter today's weight in lbs (imperial)</p>
      <input
        type="number"
        inputMode="decimal"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="e.g. 178.5"
        className="w-full rounded-2xl px-4 py-4 text-2xl font-bold text-center outline-none mb-4"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }}
        autoFocus
      />
      <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
        disabled={!val || saved}
        className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
        style={{
          background: saved ? 'rgba(16,185,129,0.2)' : val ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.06)',
          color: saved ? '#10b981' : val ? '#000' : '#3d3835',
        }}>
        {saved ? <><Check size={16} />Saved!</> : 'Save Weight'}
      </motion.button>
    </BottomSheet>
  );
}

// ─── Weight Detail Sheet ──────────────────────────────────────────────────────

function WeightDetailSheet({ open, onClose, weightLogs, settings, units }) {
  const navigate = useNavigate();
  const latestLbs = weightLogs[weightLogs.length - 1]?.weight || settings.startWeight;
  const lostLbs = (settings.startWeight || 185) - latestLbs;
  const goalLbs = settings.goalWeight || 165;
  const toGoLbs = Math.max(0, latestLbs - goalLbs);
  const pct = Math.min(100, Math.round((lostLbs / ((settings.startWeight || 185) - goalLbs)) * 100));
  const sparkData = weightLogs.slice(-14).map(d => ({ v: d.weight, date: d.date.slice(5) }));

  return (
    <BottomSheet open={open} onClose={onClose} title="Weight Progress" emoji="⚖️">
      {/* Big stat */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Current', val: formatWeight(latestLbs, units).value, unit: formatWeight(latestLbs, units).unit, color: '#f59e0b' },
          { label: 'Lost', val: `−${units === 'metric' ? (lostLbs * 0.453592).toFixed(1) : lostLbs.toFixed(1)}`, unit: units === 'metric' ? 'kg' : 'lbs', color: '#10b981' },
          { label: 'To Go', val: units === 'metric' ? (toGoLbs * 0.453592).toFixed(1) : toGoLbs.toFixed(1), unit: units === 'metric' ? 'kg' : 'lbs', color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.val}<span className="text-xs font-normal ml-0.5">{s.unit}</span></p>
            <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: '#57534e' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress to goal */}
      <div className="mb-5">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs" style={{ color: '#78716c' }}>Progress to goal</span>
          <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #10b981)' }}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>

      {/* Mini chart */}
      {sparkData.length > 1 && (
        <div className="mb-5 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: '#57534e' }}>Last 14 days</p>
          <div style={{ height: 80 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="wgd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#3d3835', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#3d3835', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={2} fill="url(#wgd)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onClose(); navigate('/weight'); }}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
        Full Weight Tracker <ArrowRight size={14} />
      </motion.button>
    </BottomSheet>
  );
}

// ─── Calories Detail Sheet ────────────────────────────────────────────────────

function CaloriesSheet({ open, onClose, totals, targets, donutData, donutTotal }) {
  const navigate = useNavigate();
  const remaining = Math.max(0, targets.calories - totals.calories);
  const pct = Math.min(100, Math.round((totals.calories / targets.calories) * 100));

  return (
    <BottomSheet open={open} onClose={onClose} title="Today's Calories" emoji="🔥">
      <div className="flex items-center gap-4 mb-5">
        <div style={{ width: 100, height: 100, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="cal" cx="50%" cy="50%"
                innerRadius={32} outerRadius={46} strokeWidth={0} startAngle={90} endAngle={-270}>
                {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <p className="text-3xl font-black" style={{ color: '#f97316' }}>{totals.calories}</p>
          <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>of {targets.calories} kcal target</p>
          <p className="text-sm font-semibold mt-2" style={{ color: remaining > 200 ? '#10b981' : '#f59e0b' }}>
            {remaining} kcal remaining
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <MacroBar label="Protein" current={totals.protein} target={targets.protein} color="#f59e0b" />
        <MacroBar label="Carbs"   current={totals.carbs}   target={targets.carbs}   color="#10b981" />
        <MacroBar label="Fat"     current={totals.fat}     target={targets.fat}     color="#3b82f6" />
      </div>

      {/* Macro % breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {donutData.map((d, i) => (
          <div key={d.name} className="rounded-xl p-2.5 text-center"
            style={{ background: `${DONUT_COLORS[i]}12`, border: `1px solid ${DONUT_COLORS[i]}22` }}>
            <p className="text-base font-bold" style={{ color: DONUT_COLORS[i] }}>{Math.round(d.cal / donutTotal * 100)}%</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#57534e' }}>{d.name}</p>
          </div>
        ))}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onClose(); navigate('/food'); }}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
        Log Food <ArrowRight size={14} />
      </motion.button>
    </BottomSheet>
  );
}

// ─── Macros Sheet ─────────────────────────────────────────────────────────────

function MacrosSheet({ open, onClose, totals, targets }) {
  const navigate = useNavigate();
  return (
    <BottomSheet open={open} onClose={onClose} title="Macro Breakdown" emoji="🥩">
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Protein', val: totals.protein, target: targets.protein, color: '#f59e0b', unit: 'g' },
          { label: 'Carbs', val: totals.carbs, target: targets.carbs, color: '#10b981', unit: 'g' },
          { label: 'Fat', val: totals.fat, target: targets.fat, color: '#3b82f6', unit: 'g' },
        ].map(m => (
          <div key={m.label} className="rounded-2xl p-3 text-center"
            style={{ background: `${m.color}10`, border: `1px solid ${m.color}20` }}>
            <p className="text-2xl font-black" style={{ color: m.color }}>{m.val}<span className="text-xs font-normal">{m.unit}</span></p>
            <p className="text-[10px] mt-0.5" style={{ color: '#57534e' }}>{m.label}</p>
            <p className="text-[10px] mt-1" style={{ color: '#3d3835' }}>of {m.target}g</p>
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(m.val / m.target * 100))}%`, background: m.color }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center mb-5" style={{ color: '#57534e' }}>
        {Math.max(0, targets.protein - totals.protein)}g protein left to hit your target
      </p>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onClose(); navigate('/macros'); }}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
        Full Macro Tracker <ArrowRight size={14} />
      </motion.button>
    </BottomSheet>
  );
}

// ─── Steps Sheet ──────────────────────────────────────────────────────────────

function StepsSheet({ open, onClose, steps }) {
  const navigate = useNavigate();
  const goal = 10000;
  const pct = Math.min(100, Math.round((steps / goal) * 100));
  const circ = 2 * Math.PI * 52;

  return (
    <BottomSheet open={open} onClose={onClose} title="Activity" emoji="👟">
      <div className="flex flex-col items-center mb-6">
        <svg width={130} height={130} className="mb-3">
          <circle cx={65} cy={65} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
          <motion.circle cx={65} cy={65} r={52} fill="none" stroke="#3b82f6" strokeWidth={8}
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (circ * pct / 100) }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round" transform="rotate(-90 65 65)" />
          <text x={65} y={60} textAnchor="middle" fill="#f5f4f2" fontSize={22} fontWeight="900">{steps.toLocaleString()}</text>
          <text x={65} y={78} textAnchor="middle" fill="#57534e" fontSize={11}>steps</text>
        </svg>
        <p className="text-sm font-semibold" style={{ color: pct >= 100 ? '#10b981' : '#3b82f6' }}>
          {pct >= 100 ? '🎉 Goal crushed!' : `${goal - steps} steps to go`}
        </p>
      </div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onClose(); navigate('/activity'); }}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
        Activity Log <ArrowRight size={14} />
      </motion.button>
    </BottomSheet>
  );
}

// ─── Streak Sheet ─────────────────────────────────────────────────────────────

function StreakSheet({ open, onClose, streak, weightLogs }) {
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, logged: !!weightLogs.find(l => l.date === key), day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1) };
  });

  return (
    <BottomSheet open={open} onClose={onClose} title="Consistency Streak" emoji="🔥">
      <div className="text-center mb-5">
        <p className="text-6xl font-black" style={{ color: '#f59e0b' }}>{streak || 11}</p>
        <p className="text-sm mt-1" style={{ color: '#78716c' }}>days in a row</p>
      </div>
      <div className="flex gap-2 justify-center mb-5">
        {last14.map(d => (
          <div key={d.key} className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: d.logged ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${d.logged ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
              {d.logged && <Check size={10} strokeWidth={3} style={{ color: '#f59e0b' }} />}
            </div>
            <span className="text-[9px]" style={{ color: '#3d3835' }}>{d.day}</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <p className="text-xs leading-relaxed text-center" style={{ color: '#a8896e', fontStyle: 'italic' }}>
          "Every day you show up is a vote for the person you're becoming."
        </p>
      </div>
    </BottomSheet>
  );
}

// ─── Fullscreen Chart Sheet ───────────────────────────────────────────────────

function FullChartSheet({ open, onClose, weightLogs }) {
  const data = weightLogs.slice(-30).map(d => ({ date: d.date.slice(5), weight: d.weight }));

  return (
    <BottomSheet open={open} onClose={onClose} title="Weight Trend" emoji="📈">
      <p className="text-xs mb-3" style={{ color: '#57534e' }}>Last 30 days</p>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="wGradFS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#3d3835', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#3d3835', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1714', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, color: '#f5f4f2', fontSize: 12 }}
              labelStyle={{ color: '#78716c' }}
            />
            <Area type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2.5} fill="url(#wGradFS)" dot={false} activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </BottomSheet>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [store] = useApexStore();
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [focusOpen, setFocusOpen]   = useState(false);
  const [activeSheet, setActiveSheet] = useState(null); // 'weight' | 'logweight' | 'calories' | 'macros' | 'steps' | 'streak' | 'chart'
  const [checkin, setCheckin]       = useState(() => getDailyCheckin(todayStr));
  const gamePlan = checkin.gamePlan || {};

  const settings = store.settings || {};
  const targets = {
    calories: settings.dailyCalorieTarget || 2100,
    protein:  settings.dailyProteinTarget || 180,
    carbs:    settings.dailyCarbTarget    || 200,
    fat:      settings.dailyFatTarget     || 65,
  };

  const totals     = getDailyTotals(todayStr);
  const weightLogs = store.weightLogs || [];
  const latestWeightLbs = weightLogs[weightLogs.length - 1]?.weight || settings.startWeight;
  const lostLbs = (settings.startWeight || 185) - latestWeightLbs;

  const units = settings.units || 'imperial';
  const wtDisplay = formatWeight(latestWeightLbs, units);
  const latestWeight = wtDisplay.value;
  const weightUnitLabel = wtDisplay.unit;
  const lost = units === 'metric' ? (lostLbs * 0.453592).toFixed(1) : lostLbs.toFixed(1);

  const todayMacros    = macroLogs[macroLogs.length - 1] || {};
  const todayCalories  = totals.calories > 0 ? totals.calories : (todayMacros.calories || 1850);
  const todayProtein   = totals.protein  > 0 ? totals.protein  : (todayMacros.protein  || 165);
  const todayCarbs     = totals.carbs    > 0 ? totals.carbs    : (todayMacros.carbs    || 155);
  const todayFat       = totals.fat      > 0 ? totals.fat      : (todayMacros.fat      || 50);
  const steps          = todayMacros.steps || 7843;

  const displayTotals = { calories: todayCalories, protein: todayProtein, carbs: todayCarbs, fat: todayFat };

  const sparkWeightData  = weightLogs.slice(-10).map(d => ({ v: d.weight }));
  const weeklyAvgCal     = Math.round(macroLogs.slice(-7).reduce((s, d) => s + d.calories, 0) / 7);
  const weeklyAvgProtein = Math.round(macroLogs.slice(-7).reduce((s, d) => s + (d.protein || 0), 0) / 7);

  const donutData = [
    { name: 'Protein', cal: todayProtein * 4 },
    { name: 'Carbs',   cal: todayCarbs * 4 },
    { name: 'Fat',     cal: todayFat * 9 },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.cal, 0) || 1;

  const goalDate   = new Date((settings.goalDate || '2026-08-31') + 'T12:00:00');
  const daysLeft   = Math.max(0, Math.ceil((goalDate - new Date()) / 86400000));
  const remaining  = { calories: Math.max(0, targets.calories - todayCalories), protein: Math.max(0, targets.protein - todayProtein) };
  const completedCount = GAME_PLAN.filter(t => gamePlan[t.id]).length;
  const streak     = detectConsistencyStreak(store);
  const milestone  = getRecentMilestone(store);

  const hour    = new Date().getHours();
  const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const quote   = getContextualQuote(store);
  const subline = getContextualSubline(store, streak, remaining);

  const open  = (sheet) => setActiveSheet(sheet);
  const close = () => setActiveSheet(null);

  const toggleCheck = (id) => {
    const updated = { ...checkin, gamePlan: { ...gamePlan, [id]: !gamePlan[id] } };
    setCheckin(updated);
    saveDailyCheckin(todayStr, updated);
  };

  return (
    <div style={{ minHeight: '100svh', background: '#111010' }}>
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      {/* ── Modals ── */}
      <WeightDetailSheet open={activeSheet === 'weight'}   onClose={close} weightLogs={weightLogs} settings={settings} units={units} />
      <CaloriesSheet     open={activeSheet === 'calories'} onClose={close} totals={displayTotals} targets={targets} donutData={donutData} donutTotal={donutTotal} />
      <MacrosSheet       open={activeSheet === 'macros'}   onClose={close} totals={displayTotals} targets={targets} />
      <StepsSheet        open={activeSheet === 'steps'}    onClose={close} steps={steps} />
      <StreakSheet        open={activeSheet === 'streak'}   onClose={close} streak={streak} weightLogs={weightLogs} />
      <FullChartSheet    open={activeSheet === 'chart'}    onClose={close} weightLogs={weightLogs} />
      <LogWeightSheet    open={activeSheet === 'logweight'} onClose={close} />

      {/* ── Cinematic Hero — compact on mobile ── */}
      <div className="relative overflow-hidden" style={{ height: 'clamp(160px, 30svh, 280px)' }}>
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=60)',
          backgroundSize: 'cover', backgroundPosition: 'center 40%',
        }} />
        <div className="absolute inset-0" style={{ background: 'rgba(8,6,4,0.82)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.14) 0%, transparent 55%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />

        {/* Focus Mode toggle */}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          onClick={() => setFocusOpen(true)}
          className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold min-touch"
          style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', color: '#57534e' }}>
          <Maximize2 size={11} />Focus
        </motion.button>

        <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-widest mb-1.5 hidden sm:block" style={{ color: '#a8896e' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="font-black tracking-tight leading-[1.05] mb-1" style={{ fontSize: 'clamp(22px,5.5vw,44px)', color: '#f5f4f2' }}>
              {greeting},<br />
              <span style={{ color: '#f59e0b' }}>{settings.name || 'Naman'}.</span>
            </h1>
            <p className="text-xs md:text-sm" style={{ color: '#78716c' }}>{subline}</p>
            <p className="text-xs italic hidden sm:block mt-0.5" style={{ color: '#3d3835' }}>"{quote}"</p>
          </motion.div>
        </div>

        {/* Days left + lost badges */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 flex gap-1.5 md:gap-3">
          {[
            { label: 'Days left', value: daysLeft, color: '#f59e0b' },
            { label: `${weightUnitLabel} lost`, value: `−${lost}`, color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="text-center px-2.5 py-2 md:px-5 md:py-4 rounded-xl md:rounded-2xl"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
              <p className="font-black" style={{ fontSize: 'clamp(15px,3.5vw,28px)', color: s.color }}>{s.value}</p>
              <p className="text-[8px] md:text-[11px] mt-0.5 uppercase tracking-wider" style={{ color: '#57534e' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />
      </div>

      {/* ── Main content ── */}
      <div className="px-4 md:px-6 pb-nav md:pb-10" style={{ marginTop: -12 }}>

        {/* ── Quick Actions strip ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="flex gap-3 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <QuickActionBtn icon={Utensils}  label="Log Meal"     color="#f59e0b" onClick={() => navigate('/food')} />
          <QuickActionBtn icon={Scale}     label="Log Weight"   color="#10b981" onClick={() => open('logweight')} />
          <QuickActionBtn icon={ChefHat}   label="Cook"         color="#f97316" onClick={() => navigate('/cook')} />
          <QuickActionBtn icon={Download}  label="Import"       color="#8b5cf6" onClick={() => navigate('/import')} />
          <QuickActionBtn icon={Footprints} label="Activity"    color="#3b82f6" onClick={() => navigate('/activity')} />
        </motion.div>

        {/* ── Stat cards grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-5">
          <StatCard title="Weight"      value={latestWeight} unit={weightUnitLabel} sub={`−${lost} ${weightUnitLabel} lost`}
            icon={TrendingDown} iconColor="#f59e0b" sparkData={sparkWeightData} delay={0.05} onTap={() => open('weight')} />
          <StatCard title="Calories"    value={todayCalories} unit="kcal" sub={`${remaining.calories} left`}
            icon={Flame} iconColor="#f97316" barPct={(todayCalories / targets.calories) * 100} delay={0.1} onTap={() => open('calories')} />
          <StatCard title="Protein"     value={todayProtein} unit="g" sub={`Target: ${targets.protein}g`}
            icon={Target} iconColor="#10b981" barPct={(todayProtein / targets.protein) * 100} delay={0.15} onTap={() => open('macros')} />
          <StatCard title="Steps"       value={steps.toLocaleString()} unit="" sub="Goal: 10,000"
            icon={Footprints} iconColor="#3b82f6" barPct={(steps / 10000) * 100} delay={0.2} onTap={() => open('steps')} />
          <StatCard title="Consistency" value="" sub="This week" ring={92} delay={0.25} onTap={() => open('streak')} />
          <StatCard title="Streak"      value={streak || 11} unit="days" sub="in a row" icon={Flame} iconColor="#f59e0b" delay={0.3} onTap={() => open('streak')} />
        </div>

        {/* ── Body grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">

          {/* Left: 2 cols */}
          <div className="md:col-span-2 flex flex-col gap-4 md:gap-5">

            {/* Game Plan */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="rounded-2xl p-4 md:p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Today's Game Plan</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>
                    {completedCount === GAME_PLAN.length ? '🔥 All done.' : `${completedCount}/${GAME_PLAN.length} complete`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 64, background: 'rgba(255,255,255,0.06)' }}>
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
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleCheck(task.id)}
                    className="w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl text-left min-touch"
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
              className="rounded-2xl p-4 md:p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <DailyTimeline />
            </motion.div>

            {/* Nutrition Overview */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.4 }}
              className="rounded-2xl p-4 md:p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Nutrition Overview</h2>
                <div className="flex gap-3 md:gap-5">
                  {[{ label: '7-day avg', value: weeklyAvgCal, unit: 'kcal' },
                    { label: 'avg protein', value: weeklyAvgProtein, unit: 'g' }].map(s => (
                    <div key={s.label} className="text-right">
                      <p className="text-[9px] md:text-[10px] uppercase tracking-wide" style={{ color: '#57534e' }}>{s.label}</p>
                      <p className="text-xs md:text-sm font-bold" style={{ color: '#f5f4f2' }}>
                        {s.value}<span className="text-xs font-normal ml-0.5" style={{ color: '#78716c' }}>{s.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mobile: stack, Desktop: side-by-side */}
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="cal" cx="50%" cy="50%"
                        innerRadius={32} outerRadius={46} strokeWidth={0} startAngle={90} endAngle={-270}>
                        {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-3">
                  <MacroBar label="Protein" current={todayProtein} target={targets.protein} color="#f59e0b" />
                  <MacroBar label="Carbs"   current={todayCarbs}   target={targets.carbs}   color="#10b981" />
                  <MacroBar label="Fat"     current={todayFat}     target={targets.fat}     color="#3b82f6" />
                </div>
              </div>
            </motion.div>

            {/* Weight Trend — tap to fullscreen */}
            <motion.button
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.53, duration: 0.4 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => open('chart')}
              className="rounded-2xl p-4 md:p-5 relative overflow-hidden w-full text-left"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)' }} />
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Weight Trend</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>Tap to expand</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#a8896e', border: '1px solid rgba(245,158,11,0.15)' }}>14 days</span>
                  <BarChart3 size={14} style={{ color: '#3d3835' }} />
                </div>
              </div>
              <div style={{ height: 140 }}>
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
            </motion.button>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4 md:gap-5">

            {/* AI Coach card */}
            <AICoachCard delay={0.38} />

            {/* Daily Insight */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              className="rounded-2xl p-4 md:p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(245,158,11,0.1) 0%, rgba(249,115,22,0.05) 60%, rgba(255,255,255,0.03) 100%)',
                border: '1px solid rgba(245,158,11,0.18)',
              }}>
              <div className="absolute -top-6 -right-6 w-28 h-28 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)', filter: 'blur(16px)' }} />
              <div className="flex items-center gap-2 mb-3">
                <Sun size={13} style={{ color: '#f59e0b' }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#a8896e' }}>Daily Insight</p>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: '#c9c2bb', fontStyle: 'italic' }}>
                "Averaging{' '}
                <span style={{ color: '#f59e0b', fontStyle: 'normal', fontWeight: 700 }}>{weeklyAvgCal} kcal/day</span>
                {' '}— a{' '}
                <span style={{ color: '#10b981', fontStyle: 'normal', fontWeight: 700 }}>{Math.max(0, (settings.tdee || 2600) - weeklyAvgCal)} kcal</span>
                {' '}deficit."
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
              className="rounded-2xl p-4 md:p-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
              <h2 className="text-sm font-bold mb-3 md:mb-4" style={{ color: '#f5f4f2' }}>Today's Macros</h2>
              <div className="space-y-3">
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
                <div className="flex items-center gap-2.5">
                  <span style={{ fontSize: 22 }}>{milestone.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
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
            <motion.button
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              transition={{ delay: 0.58, duration: 0.4 }}
              onClick={() => navigate('/cook')}
              className="rounded-2xl overflow-hidden relative w-full text-left"
              style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=60)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'brightness(0.22) saturate(1.4)',
              }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(249,115,22,0.1))' }} />
              <div className="relative p-4 md:p-5">
                <ChefHat size={20} style={{ color: '#f59e0b', marginBottom: 8 }} />
                <h3 className="text-sm font-bold mb-1" style={{ color: '#f5f4f2' }}>What's for dinner?</h3>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: '#78716c' }}>
                  {remaining.protein > 20 ? `${remaining.protein}g protein left. ` : ''}
                  Let AI build the perfect recipe.
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#f59e0b' }}>
                  <Zap size={11} />Cook Something <ChevronRight size={12} />
                </div>
              </div>
            </motion.button>

            {/* Progress Pics */}
            <motion.button
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              transition={{ delay: 0.64, duration: 0.4 }}
              onClick={() => navigate('/progress')}
              className="rounded-2xl p-4 relative overflow-hidden w-full text-left"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Camera size={13} style={{ color: '#10b981' }} />
                <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Progress Pics</h2>
              </div>
              <div className="rounded-xl h-16 flex flex-col items-center justify-center gap-1.5"
                style={{ background: 'rgba(16,185,129,0.04)', border: '1px dashed rgba(16,185,129,0.15)' }}>
                <Camera size={16} style={{ color: '#2d5045' }} />
                <p className="text-xs" style={{ color: '#2d5045' }}>Document your transformation →</p>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
