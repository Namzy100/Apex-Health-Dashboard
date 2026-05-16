import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Pencil, CheckCircle2, Circle, Target, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { useApexStore } from '../store/apexStore';
import { useToast } from '../components/Toast';

const CATEGORIES = [
  { id: 'fitness',   label: 'Fitness',   emoji: '💪', color: '#f59e0b' },
  { id: 'career',    label: 'Career',    emoji: '💼', color: '#3b82f6' },
  { id: 'social',    label: 'Social',    emoji: '🤝', color: '#10b981' },
  { id: 'financial', label: 'Financial', emoji: '💰', color: '#eab308' },
  { id: 'travel',    label: 'Travel',    emoji: '✈️',  color: '#06b6d4' },
  { id: 'growth',    label: 'Growth',    emoji: '📚', color: '#a78bfa' },
  { id: 'personal',  label: 'Personal',  emoji: '🌱', color: '#f97316' },
];

function getCatInfo(id) {
  return CATEGORIES.find(c => c.id === id) || { label: id, emoji: '🎯', color: '#78716c' };
}

// ── Goal templates ────────────────────────────────────────────────────────────

const GOAL_TEMPLATES = [
  {
    title: 'Lose 10 lbs',
    description: 'Hit a daily calorie deficit and track weight weekly',
    category: 'fitness', emoji: '⚖️',
    targetWeeks: 12,
  },
  {
    title: 'Build visible muscle',
    description: 'Train 4× per week and hit protein targets daily',
    category: 'fitness', emoji: '💪',
    targetWeeks: 16,
  },
  {
    title: 'Run a 5K',
    description: 'Train 3× per week, building up distance each week',
    category: 'fitness', emoji: '🏃',
    targetWeeks: 8,
  },
  {
    title: 'Read 12 books',
    description: 'One book per month — 30 mins of reading daily',
    category: 'growth', emoji: '📚',
    targetWeeks: 52,
  },
  {
    title: 'Save $10,000',
    description: 'Automate monthly transfers and cut discretionary spend',
    category: 'financial', emoji: '💰',
    targetWeeks: 26,
  },
  {
    title: 'Get a promotion',
    description: 'Lead a key project, build visibility with leadership',
    category: 'career', emoji: '🚀',
    targetWeeks: 24,
  },
  {
    title: 'Morning routine',
    description: 'Wake up at 6am, journal, workout — every weekday',
    category: 'personal', emoji: '🌅',
    targetWeeks: 8,
  },
  {
    title: 'Travel to Japan',
    description: 'Plan and book the trip, budget ¥200k',
    category: 'travel', emoji: '✈️',
    targetWeeks: 20,
  },
  {
    title: 'Meditate daily',
    description: '10 minutes of mindfulness every morning',
    category: 'personal', emoji: '🧘',
    targetWeeks: 8,
  },
  {
    title: 'Quit sugar for 30 days',
    description: 'No added sugar — build the habit from scratch',
    category: 'fitness', emoji: '🚫',
    targetWeeks: 4,
  },
  {
    title: 'Launch side project',
    description: 'Ship an MVP, get first 10 users',
    category: 'career', emoji: '🛠️',
    targetWeeks: 12,
  },
  {
    title: 'Cold shower streak',
    description: '30 consecutive days of cold showers',
    category: 'personal', emoji: '🧊',
    targetWeeks: 5,
  },
];

function weeksFromNow(weeks) {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

// ── TemplatesModal ────────────────────────────────────────────────────────────

function TemplatesModal({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const filtered = GOAL_TEMPLATES.filter(t => {
    const matchCat = catFilter === 'all' || t.category === catFilter;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />
      <motion.div className="relative w-full max-w-md rounded-3xl flex flex-col"
        style={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '80vh' }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: '#f59e0b' }} />
            <h3 className="font-bold text-base" style={{ color: '#f5f4f2' }}>Goal Templates</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={14} style={{ color: '#78716c' }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-3.5 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }}
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[{ id: 'all', label: 'All', emoji: '⚡' }, ...CATEGORIES].map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              className="px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                background: catFilter === c.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                color: catFilter === c.id ? '#f59e0b' : '#78716c',
                border: catFilter === c.id ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
              }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="overflow-y-auto px-5 pb-5 space-y-2">
          {filtered.map((t, i) => {
            const cat = getCatInfo(t.category);
            return (
              <motion.button
                key={i}
                onClick={() => onSelect(t)}
                className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none mt-0.5 flex-shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: '#f5f4f2' }}>{t.title}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: '#57534e' }}>{t.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: `${cat.color}18`, color: cat.color }}>
                        {cat.emoji} {cat.label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: '#3d3a36' }}>
                        <Clock size={9} />
                        ~{t.targetWeeks} weeks
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: '#3d3a36' }} className="mt-1 flex-shrink-0" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete, onToggle, onProgressChange }) {
  const cat   = getCatInfo(goal.category);
  const days  = daysUntil(goal.targetDate);
  const pct   = Math.min(Math.max(goal.progress || 0, 0), 100);

  return (
    <motion.div layout className="rounded-2xl p-4"
      style={{
        background: goal.done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${goal.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)'}`,
        opacity: goal.done ? 0.7 : 1,
      }}>

      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <button onClick={() => onToggle(goal.id, !goal.done)}
          className="mt-0.5 flex-shrink-0 transition-all">
          {goal.done
            ? <CheckCircle2 size={20} style={{ color: '#10b981' }} />
            : <Circle size={20} style={{ color: '#3d3a36' }} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight"
            style={{ color: goal.done ? '#57534e' : '#f5f4f2', textDecoration: goal.done ? 'line-through' : 'none' }}>
            {goal.title}
          </p>
          {goal.description && (
            <p className="text-xs mt-0.5 leading-snug" style={{ color: '#57534e' }}>{goal.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(goal)}
            className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#57534e' }}>
            <Pencil size={11} />
          </button>
          <button onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Category + deadline */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: `${cat.color}18`, color: cat.color }}>
          {cat.emoji} {cat.label}
        </span>
        {days !== null && (
          <span className="text-[10px]" style={{ color: days < 7 ? '#ef4444' : days < 30 ? '#f59e0b' : '#3d3a36' }}>
            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
          </span>
        )}
      </div>

      {/* Progress bar + scrubber */}
      {!goal.done && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px]" style={{ color: '#3d3a36' }}>Progress</span>
            <span className="text-[10px] font-medium" style={{ color: cat.color }}>{pct}%</span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden mb-2"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${cat.color}99, ${cat.color})` }}
              animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>
          <input type="range" min={0} max={100} value={pct}
            onChange={e => onProgressChange(goal.id, Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: cat.color, background: 'transparent' }} />
        </div>
      )}
    </motion.div>
  );
}

// ── AddEditModal ─────────────────────────────────────────────────────────────

function AddEditModal({ goal, prefill, onSave, onClose }) {
  const [title,       setTitle]       = useState(goal?.title || prefill?.title || '');
  const [description, setDescription] = useState(goal?.description || prefill?.description || '');
  const [category,    setCategory]    = useState(goal?.category || prefill?.category || 'fitness');
  const [targetDate,  setTargetDate]  = useState(goal?.targetDate || (prefill?.targetWeeks ? weeksFromNow(prefill.targetWeeks) : ''));
  const [progress,    setProgress]    = useState(goal?.progress ?? 0);

  const isValid = title.trim().length > 0;
  const cat = getCatInfo(category);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />
      <motion.div className="relative w-full max-w-sm rounded-3xl p-5 space-y-4"
        style={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.1)' }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>

        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color: '#f5f4f2' }}>{goal ? 'Edit Goal' : 'New Goal'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={14} style={{ color: '#78716c' }} />
          </button>
        </div>

        {/* Title */}
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What do you want to achieve?"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />

        {/* Description */}
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Why does this matter? (optional)"
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />

        {/* Category */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: '#57534e' }}>Category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className="px-2.5 py-1 rounded-full text-xs transition-all"
                style={{
                  background: category === c.id ? `${c.color}22` : 'rgba(255,255,255,0.05)',
                  color:      category === c.id ? c.color : '#78716c',
                  border:     category === c.id ? `1px solid ${c.color}40` : '1px solid rgba(255,255,255,0.07)',
                }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target date */}
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: '#57534e' }}>Target date (optional)</p>
          <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: targetDate ? '#f5f4f2' : '#57534e',
              colorScheme: 'dark' }} />
        </div>

        {/* Progress */}
        {goal && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium" style={{ color: '#57534e' }}>Current progress</p>
              <span className="text-xs font-bold" style={{ color: cat.color }}>{progress}%</span>
            </div>
            <input type="range" min={0} max={100} value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full" style={{ accentColor: cat.color }} />
          </div>
        )}

        <button onClick={() => { if (isValid) onSave({ title: title.trim(), description: description.trim(), category, targetDate, progress }); }}
          disabled={!isValid}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: isValid ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.06)', color: isValid ? '#000' : '#3d3a36' }}>
          {goal ? 'Save Changes' : 'Add Goal'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Goals page ────────────────────────────────────────────────────────────────

export default function Goals() {
  const [store, update] = useApexStore();
  const toast = useToast();
  const [showModal, setShowModal]         = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingGoal, setEditingGoal]     = useState(null);
  const [prefillData, setPrefillData]     = useState(null);
  const [filter, setFilter]               = useState('all');

  const goals = store.goals || [];

  const activeGoals   = goals.filter(g => !g.done);
  const completedGoals = goals.filter(g => g.done);

  const filteredActive = filter === 'all'
    ? activeGoals
    : activeGoals.filter(g => g.category === filter);

  const avgProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((s, g) => s + (g.progress || 0), 0) / activeGoals.length)
    : 0;

  function handleSave({ title, description, category, targetDate, progress }) {
    const id = editingGoal?.id || `goal-${Date.now()}`;
    const existing = goals.find(g => g.id === id);
    const newGoal = {
      ...(existing || {}),
      id, title, description, category, targetDate,
      progress: editingGoal ? progress : (existing?.progress ?? 0),
      milestones: existing?.milestones || [],
      done: existing?.done || false,
    };
    update(s => {
      const gs = s.goals || [];
      const idx = gs.findIndex(g => g.id === id);
      return { ...s, goals: idx >= 0 ? gs.map((g, i) => i === idx ? newGoal : g) : [...gs, newGoal] };
    });
    toast(editingGoal ? 'Goal updated' : 'Goal added', 'success');
    setShowModal(false); setEditingGoal(null);
  }

  function handleDelete(id) {
    update(s => ({ ...s, goals: (s.goals || []).filter(g => g.id !== id) }));
    toast('Goal removed', 'info');
  }

  function handleToggle(id, done) {
    update(s => ({
      ...s,
      goals: (s.goals || []).map(g => g.id === id ? { ...g, done, progress: done ? 100 : g.progress } : g),
    }));
    if (done) toast('Goal completed! 🎉', 'success');
  }

  function handleProgressChange(id, progress) {
    update(s => ({
      ...s,
      goals: (s.goals || []).map(g => g.id === id ? { ...g, progress } : g),
    }));
  }

  function handleEdit(goal) { setEditingGoal(goal); setPrefillData(null); setShowModal(true); }

  function handleTemplateSelect(template) {
    setShowTemplates(false);
    setEditingGoal(null);
    setPrefillData(template);
    setShowModal(true);
  }

  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-28 md:pb-10 max-w-2xl mx-auto" style={{ background: '#111010' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>Goals</h1>
          <p className="text-sm mt-0.5" style={{ color: '#57534e' }}>Long-term targets that define your trajectory</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            <Sparkles size={12} />
            Templates
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => { setEditingGoal(null); setPrefillData(null); setShowModal(true); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <Plus size={18} style={{ color: '#a78bfa' }} />
          </motion.button>
        </div>
      </div>

      {/* Overview card */}
      {activeGoals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-5"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color: '#a78bfa' }} />
              <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Overall Progress</p>
            </div>
            <p className="text-sm font-bold" style={{ color: '#a78bfa' }}>{avgProgress}%</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #a78bfa, #7c3aed)' }}
              initial={{ width: 0 }} animate={{ width: `${avgProgress}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs" style={{ color: '#57534e' }}>{activeGoals.length} active • {completedGoals.length} completed</p>
            {completedGoals.length > 0 && (
              <span className="text-xs" style={{ color: '#10b981' }}>✓ {completedGoals.length} done</span>
            )}
          </div>
        </motion.div>
      )}

      {/* Category filter */}
      {activeGoals.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => setFilter('all')}
            className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              background: filter === 'all' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
              color: filter === 'all' ? '#a78bfa' : '#57534e',
              border: filter === 'all' ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.07)',
            }}>
            All
          </button>
          {CATEGORIES.filter(c => activeGoals.some(g => g.category === c.id)).map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                background: filter === c.id ? `${c.color}22` : 'rgba(255,255,255,0.05)',
                color: filter === c.id ? c.color : '#57534e',
                border: filter === c.id ? `1px solid ${c.color}40` : '1px solid rgba(255,255,255,0.07)',
              }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Active goals */}
      {filteredActive.length > 0 ? (
        <div className="space-y-3 mb-6">
          {filteredActive.map((goal, i) => (
            <motion.div key={goal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <GoalCard goal={goal} onEdit={handleEdit} onDelete={handleDelete}
                onToggle={handleToggle} onProgressChange={handleProgressChange} />
            </motion.div>
          ))}
        </div>
      ) : activeGoals.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ fontSize: 40 }}>🎯</p>
          <p className="mt-3 text-sm" style={{ color: '#57534e' }}>No goals yet</p>
          <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>Define what you're working toward</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowTemplates(true)}
              className="px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Sparkles size={13} />
              Browse templates
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setPrefillData(null); setShowModal(true); }}
              className="px-5 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
              Custom goal
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: '#57534e' }}>No {filter} goals</p>
          <button onClick={() => setFilter('all')} className="text-xs mt-2" style={{ color: '#a78bfa' }}>
            Show all <ChevronRight size={10} className="inline" />
          </button>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: '#3d3a36' }}>COMPLETED</p>
          <div className="space-y-2.5">
            {completedGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={handleDelete}
                onToggle={handleToggle} onProgressChange={handleProgressChange} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showTemplates && (
          <TemplatesModal
            onSelect={handleTemplateSelect}
            onClose={() => setShowTemplates(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <AddEditModal goal={editingGoal} prefill={prefillData} onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingGoal(null); setPrefillData(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
