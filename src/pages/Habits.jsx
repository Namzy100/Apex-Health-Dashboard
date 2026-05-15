import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Trash2, Flame, X, Pencil } from 'lucide-react';
import { useApexStore, getHabits, saveHabit, deleteHabit, getHabitLog, setHabitLog } from '../store/apexStore';
import { useToast } from '../components/Toast';

const CATEGORIES = ['fitness', 'nutrition', 'health', 'recovery', 'growth', 'wellness', 'custom'];
const CATEGORY_COLORS = {
  fitness:   '#f59e0b',
  nutrition: '#ef4444',
  health:    '#10b981',
  recovery:  '#8b5cf6',
  growth:    '#a78bfa',
  wellness:  '#06b6d4',
  custom:    '#78716c',
};

const DAYS_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function HabitRow({ habit, log, onToggle, onEdit, onDelete }) {
  const weekDates = getWeekDates();
  const todayDate = todayStr();
  const done      = log[todayDate]?.[habit.id];
  const color     = CATEGORY_COLORS[habit.category] || '#78716c';
  const weekDone  = weekDates.filter(d => log[d]?.[habit.id]).length;

  return (
    <motion.div layout className="rounded-2xl p-4"
      style={{
        background: done ? `${color}0d` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${done ? `${color}28` : 'rgba(255,255,255,0.07)'}`,
      }}>
      <div className="flex items-center gap-3">
        {/* Check button */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => onToggle(habit.id, !done)}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: done ? color : 'rgba(255,255,255,0.06)', border: done ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
          {done
            ? <Check size={16} style={{ color: '#000' }} strokeWidth={3} />
            : <span style={{ fontSize: 16 }}>{habit.emoji}</span>}
        </motion.button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight" style={{ color: done ? '#f5f4f2' : '#a8a29e' }}>
            {habit.name}
          </p>
          {/* Week dots */}
          <div className="flex items-center gap-1 mt-1.5">
            {weekDates.map((date, i) => {
              const isToday = date === todayDate;
              const wasDone = log[date]?.[habit.id];
              return (
                <div key={date}
                  className="flex flex-col items-center gap-0.5"
                  style={{ opacity: date > todayDate ? 0.3 : 1 }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{
                      background: wasDone ? color : isToday ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                      border: isToday && !wasDone ? `1px solid ${color}50` : 'none',
                    }}>
                    {wasDone && <Check size={8} style={{ color: '#000' }} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 7, color: isToday ? color : '#3d3a36' }}>{DAYS_ABBR[i]}</span>
                </div>
              );
            })}
            <span className="ml-1 text-[10px]" style={{ color: '#3d3a36' }}>{weekDone}/7</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
            style={{ background: `${color}18`, color }}>
            {habit.category}
          </span>
          <button onClick={() => onEdit(habit)}
            className="p-1.5 rounded-lg ml-1" style={{ background: 'rgba(255,255,255,0.05)', color: '#57534e' }}>
            <Pencil size={11} />
          </button>
          <button onClick={() => onDelete(habit.id)}
            className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AddEditModal({ habit, onSave, onClose }) {
  const [name,     setName]     = useState(habit?.name     || '');
  const [emoji,    setEmoji]    = useState(habit?.emoji    || '✅');
  const [category, setCategory] = useState(habit?.category || 'custom');

  const isValid = name.trim().length > 0;

  return (
    <motion.div key="modal-bd" className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose} />
      <motion.div className="relative w-full max-w-sm rounded-3xl p-5 space-y-4"
        style={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.1)' }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color: '#f5f4f2' }}>{habit ? 'Edit Habit' : 'New Habit'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={14} style={{ color: '#78716c' }} />
          </button>
        </div>

        <div className="flex gap-3">
          <input value={emoji} onChange={e => setEmoji(e.target.value)}
            className="w-16 text-center py-2.5 rounded-xl text-xl outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }}
            maxLength={2} />
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Habit name"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: '#57534e' }}>Category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => {
              const col = CATEGORY_COLORS[cat];
              return (
                <button key={cat} onClick={() => setCategory(cat)}
                  className="px-3 py-1 rounded-full text-xs capitalize transition-all"
                  style={{
                    background: category === cat ? `${col}28` : 'rgba(255,255,255,0.05)',
                    color:      category === cat ? col : '#78716c',
                    border:     category === cat ? `1px solid ${col}45` : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={() => { if (isValid) onSave({ name: name.trim(), emoji, category }); }}
          disabled={!isValid}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: isValid ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.06)', color: isValid ? '#000' : '#3d3a36' }}>
          {habit ? 'Save Changes' : 'Add Habit'}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Habits() {
  const [store, update] = useApexStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const habits   = store.habits  || [];
  const habitLogs = store.habitLogs || {};
  const today    = todayStr();
  const todayLog = habitLogs[today] || {};

  const activeHabits   = habits.filter(h => h.active !== false);
  const inactiveHabits = habits.filter(h => h.active === false);

  const todayDone  = activeHabits.filter(h => todayLog[h.id]).length;
  const todayTotal = activeHabits.length;
  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  function handleToggle(habitId, value) {
    update(s => {
      const logs = { ...(s.habitLogs || {}) };
      logs[today] = { ...(logs[today] || {}), [habitId]: value };
      return { ...s, habitLogs: logs };
    });
  }

  function handleSaveHabit({ name, emoji, category }) {
    const id = editingHabit?.id || `h-${Date.now()}`;
    const existing = habits.find(h => h.id === id);
    const newHabit = { ...(existing || {}), id, name, emoji, category, targetType: 'bool', active: true };
    update(s => {
      const hs = s.habits || [];
      const idx = hs.findIndex(h => h.id === id);
      return { ...s, habits: idx >= 0 ? hs.map((h, i) => i === idx ? newHabit : h) : [...hs, newHabit] };
    });
    toast(editingHabit ? 'Habit updated' : 'Habit added', 'success');
    setShowModal(false); setEditingHabit(null);
  }

  function handleDelete(id) {
    update(s => ({ ...s, habits: (s.habits || []).filter(h => h.id !== id) }));
    toast('Habit removed', 'info');
  }

  function handleEdit(habit) { setEditingHabit(habit); setShowModal(true); }

  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-28 md:pb-10 max-w-2xl mx-auto" style={{ background: '#111010' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>Habits</h1>
          <p className="text-sm mt-0.5" style={{ color: '#57534e' }}>Daily rituals that compound into results</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingHabit(null); setShowModal(true); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Plus size={18} style={{ color: '#f59e0b' }} />
        </motion.button>
      </div>

      {/* Today progress */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 mb-5"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame size={16} style={{ color: '#f59e0b' }} />
            <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Today</p>
          </div>
          <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>{todayDone}/{todayTotal}</p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: '#57534e' }}>
          {pct === 100 ? '🔥 All done. Exceptional.' : pct >= 50 ? 'Keep going — more than halfway there.' : 'Start checking in.'}
        </p>
      </motion.div>

      {/* Active habits */}
      {activeHabits.length > 0 ? (
        <div className="space-y-2.5 mb-6">
          {activeHabits.map((habit, i) => (
            <motion.div key={habit.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <HabitRow habit={habit} log={habitLogs} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p style={{ fontSize: 40 }}>✅</p>
          <p className="mt-3 text-sm" style={{ color: '#57534e' }}>No habits yet</p>
          <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>Add your first daily ritual</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowModal(true)}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
            Add habit
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <AddEditModal habit={editingHabit} onSave={handleSaveHabit} onClose={() => { setShowModal(false); setEditingHabit(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
