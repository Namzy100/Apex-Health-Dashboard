import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Plus, X, Check, Target, Calendar, Image, FileText, Trash2 } from 'lucide-react';
import { useApexStore, getSummerPlans, saveSummerPlans } from '../store/apexStore';
import { useToast } from '../components/Toast';

const TABS = ['Goals', 'Events', 'Vision Board', 'Notes'];
const CATEGORIES = ['fitness', 'lifestyle', 'growth', 'habits'];
const CAT_META = {
  fitness: { color: '#10b981', label: '💪 Fitness' },
  lifestyle: { color: '#f59e0b', label: '✨ Lifestyle' },
  growth: { color: '#6366f1', label: '📚 Growth' },
  habits: { color: '#f97316', label: '🔥 Habits' },
};

const VISION_PLACEHOLDERS = [
  { label: 'Beach body', emoji: '🏖️', bg: 'linear-gradient(135deg, #0a1a2e, #05101a)', accent: '#38bdf8' },
  { label: 'Mountain hike', emoji: '🏔️', bg: 'linear-gradient(135deg, #1a2e1a, #0a1808)', accent: '#10b981' },
  { label: 'Dream trip', emoji: '✈️', bg: 'linear-gradient(135deg, #1a1a2e, #0a0a1a)', accent: '#6366f1' },
  { label: 'New wardrobe', emoji: '👔', bg: 'linear-gradient(135deg, #2e1a08, #1a0d05)', accent: '#f59e0b' },
  { label: 'Confidence', emoji: '💎', bg: 'linear-gradient(135deg, #2e0a1a, #1a0510)', accent: '#ec4899' },
  { label: 'Celebration', emoji: '🥂', bg: 'linear-gradient(135deg, #1a2e08, #0a1a05)', accent: '#84cc16' },
];

const QUOTES = [
  'The summer is built in the winter.',
  'Every sacrifice now is freedom later.',
  'Build the body. Build the life.',
  'This summer will be different. You made sure of it.',
  'Discipline is the highest form of self-love.',
];

function daysUntil(dateStr) {
  const diff = new Date(dateStr + 'T12:00:00') - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function SummerPlans() {
  const [store, update] = useApexStore();
  const [tab, setTab] = useState('Goals');
  const [newGoal, setNewGoal] = useState('');
  const [newGoalCat, setNewGoalCat] = useState('fitness');
  const [newEvent, setNewEvent] = useState({ title: '', date: '', emoji: '🎯', category: 'fitness' });
  const [showEventForm, setShowEventForm] = useState(false);
  const [notes, setNotes] = useState(() => getSummerPlans().notes || '');
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileRef = useRef();
  const toast = useToast();

  const plans = getSummerPlans();
  const { goals = [], events = [] } = plans;
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  const updatePlans = (patch) => {
    const current = getSummerPlans();
    saveSummerPlans({ ...current, ...patch });
    update(s => ({ ...s })); // trigger re-render
  };

  const toggleGoal = (id) => {
    updatePlans({ goals: goals.map(g => g.id === id ? { ...g, done: !g.done } : g) });
    toast(goals.find(g => g.id === id)?.done ? 'Goal unchecked' : '✅ Goal completed!', 'success');
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const goal = { id: `g-${Date.now()}`, text: newGoal.trim(), done: false, category: newGoalCat };
    updatePlans({ goals: [...goals, goal] });
    setNewGoal('');
    toast('Goal added', 'success');
  };

  const deleteGoal = (id) => {
    updatePlans({ goals: goals.filter(g => g.id !== id) });
  };

  const addEvent = () => {
    if (!newEvent.title || !newEvent.date) { toast('Add a title and date', 'warning'); return; }
    updatePlans({ events: [...events, { ...newEvent, id: `ev-${Date.now()}` }] });
    setNewEvent({ title: '', date: '', emoji: '🎯', category: 'fitness' });
    setShowEventForm(false);
    toast('Event added', 'success');
  };

  const deleteEvent = (id) => updatePlans({ events: events.filter(e => e.id !== id) });

  const handleVisionUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImages(prev => [...prev, { id: Date.now(), dataUrl: ev.target.result, label: file.name.split('.')[0] }]);
      toast('Image added to vision board', 'success');
    };
    reader.readAsDataURL(file);
  };

  const doneCount = goals.filter(g => g.done).length;
  const goalDate = new Date('2026-08-31T12:00:00');
  const daysLeft = Math.max(0, Math.ceil((goalDate - new Date()) / 86400000));

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: 220 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1208 0%, #111010 50%, #0a1a12 100%)' }} />
        <div className="absolute" style={{ top: -40, right: 60, width: 300, height: 300, background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute" style={{ bottom: -20, left: 80, width: 200, height: 200, background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)', filter: 'blur(30px)' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-2">
              <Sun size={18} style={{ color: '#f59e0b' }} />
              <p className="text-sm font-medium" style={{ color: '#a8896e' }}>Summer 2026</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: '#f5f4f2' }}>The Plan.</h1>
            <p className="text-sm italic" style={{ color: '#78716c' }}>"{quote}"</p>
          </motion.div>
        </div>
        {/* Countdown chips */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex gap-3">
          {[
            { label: 'Days left', value: daysLeft, color: '#f59e0b' },
            { label: 'Goals done', value: `${doneCount}/${goals.length}`, color: '#10b981' },
          ].map(c => (
            <div key={c.label} className="text-center p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', minWidth: 80 }}>
              <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{c.label}</p>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />
      </div>

      <div className="px-6 pb-10" style={{ marginTop: -8 }}>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: tab === t ? 'rgba(255,255,255,0.09)' : 'transparent', color: tab === t ? '#f5f4f2' : '#57534e' }}>
              {t}
            </button>
          ))}
        </div>

        {/* GOALS */}
        {tab === 'Goals' && (
          <div className="max-w-2xl">
            {/* Add goal */}
            <div className="flex gap-2 mb-4">
              <input value={newGoal} onChange={e => setNewGoal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGoal()}
                placeholder="Add a new goal..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
              <select value={newGoalCat} onChange={e => setNewGoalCat(e.target.value)}
                className="rounded-xl px-3 py-2.5 text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#78716c' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_META[c].label}</option>)}
              </select>
              <button onClick={addGoal}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Plus size={16} style={{ color: '#f59e0b' }} />
              </button>
            </div>

            {/* Category groups */}
            {CATEGORIES.map(cat => {
              const catGoals = goals.filter(g => g.category === cat);
              if (!catGoals.length) return null;
              const meta = CAT_META[cat];
              return (
                <div key={cat} className="mb-5">
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</p>
                  <div className="space-y-2">
                    {catGoals.map(goal => (
                      <motion.div key={goal.id} layout
                        className="flex items-center gap-3 px-4 py-3 rounded-xl group"
                        style={{
                          background: goal.done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${goal.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)'}`,
                        }}>
                        <button onClick={() => toggleGoal(goal.id)}
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                          style={{ background: goal.done ? '#10b981' : 'rgba(255,255,255,0.08)', border: goal.done ? 'none' : '1px solid rgba(255,255,255,0.15)' }}>
                          {goal.done && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
                        </button>
                        <p className="flex-1 text-sm" style={{ color: goal.done ? '#57534e' : '#a8a29e', textDecoration: goal.done ? 'line-through' : 'none' }}>
                          {goal.text}
                        </p>
                        <button onClick={() => deleteGoal(goal.id)}
                          className="w-6 h-6 rounded-full items-center justify-center hidden group-hover:flex"
                          style={{ background: 'rgba(239,68,68,0.1)' }}>
                          <X size={10} style={{ color: '#ef4444' }} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}

            {goals.length === 0 && (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">🎯</p>
                <p className="text-sm" style={{ color: '#57534e' }}>Add your first summer goal above</p>
              </div>
            )}
          </div>
        )}

        {/* EVENTS */}
        {tab === 'Events' && (
          <div className="max-w-2xl">
            <button onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium mb-4 transition-all"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Plus size={15} />Add Event
            </button>

            <AnimatePresence>
              {showEventForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4">
                  <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                        placeholder="Event name" className="rounded-xl px-3 py-2.5 text-sm outline-none col-span-2"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
                      <input value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                        type="date" className="rounded-xl px-3 py-2.5 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
                      <input value={newEvent.emoji} onChange={e => setNewEvent(p => ({ ...p, emoji: e.target.value }))}
                        placeholder="Emoji" className="rounded-xl px-3 py-2.5 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addEvent}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#000' }}>
                        Add Event
                      </button>
                      <button onClick={() => setShowEventForm(false)}
                        className="px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: '#78716c' }}>Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {events.sort((a, b) => a.date.localeCompare(b.date)).map((ev) => {
                const days = daysUntil(ev.date);
                return (
                  <div key={ev.id} className="flex items-center gap-4 p-4 rounded-2xl group"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="text-2xl flex-shrink-0">{ev.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>{ev.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>{ev.date}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold" style={{ color: days < 30 ? '#f59e0b' : '#a8a29e' }}>{days}</p>
                      <p className="text-xs" style={{ color: '#57534e' }}>days away</p>
                    </div>
                    <button onClick={() => deleteEvent(ev.id)}
                      className="w-7 h-7 rounded-full items-center justify-center hidden group-hover:flex flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.1)' }}>
                      <Trash2 size={11} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                );
              })}
              {events.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-3xl mb-3">📅</p>
                  <p className="text-sm" style={{ color: '#57534e' }}>No events yet. Add what you're working towards.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISION BOARD */}
        {tab === 'Vision Board' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <p className="text-sm" style={{ color: '#78716c' }}>Your visual motivation board. Upload images or tap placeholders.</p>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Plus size={12} />Upload Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleVisionUpload} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* Uploaded images */}
              {uploadedImages.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={img.dataUrl} alt={img.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 group-hover:opacity-100 opacity-0 transition-opacity flex items-end p-3"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                    <p className="text-xs font-medium" style={{ color: '#f5f4f2' }}>{img.label}</p>
                  </div>
                  <button onClick={() => setUploadedImages(p => p.filter(i => i.id !== img.id))}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center hidden group-hover:flex"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <X size={10} style={{ color: '#f5f4f2' }} />
                  </button>
                </div>
              ))}
              {/* Placeholder cards */}
              {VISION_PLACEHOLDERS.map((p) => (
                <motion.div key={p.label} whileHover={{ scale: 1.03 }}
                  className="relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer"
                  style={{ background: p.bg, border: `1px solid ${p.accent}20` }}
                  onClick={() => fileRef.current?.click()}>
                  <div className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(circle at 50% 50%, ${p.accent}15, transparent 70%)` }} />
                  <span style={{ fontSize: 36, position: 'relative' }}>{p.emoji}</span>
                  <p className="text-xs font-medium" style={{ color: p.accent, position: 'relative' }}>{p.label}</p>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl"
                    style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <p className="text-xs" style={{ color: '#f5f4f2' }}>Click to upload</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* NOTES */}
        {tab === 'Notes' && (
          <div className="max-w-2xl">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <FileText size={13} style={{ color: '#f59e0b' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Summer Notes</h3>
                <span className="text-xs ml-auto" style={{ color: '#57534e' }}>Auto-saved</span>
              </div>
              <textarea value={notes}
                onChange={e => { setNotes(e.target.value); updatePlans({ notes: e.target.value }); }}
                placeholder="What are you working towards this summer? What do you want to feel like on August 31?..."
                className="w-full px-4 py-4 text-sm outline-none resize-none"
                style={{ background: 'transparent', color: '#a8a29e', minHeight: 300, lineHeight: 1.8 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
