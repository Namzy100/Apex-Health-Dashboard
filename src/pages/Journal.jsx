import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, ChevronDown, ChevronUp, Trash2, BookOpen } from 'lucide-react';
import { useApexStore } from '../store/apexStore';
import { useToast } from '../components/Toast';

const MOODS = [
  { id: 'great',    emoji: '🔥', label: 'On fire',   color: '#f59e0b' },
  { id: 'good',     emoji: '😊', label: 'Good',       color: '#10b981' },
  { id: 'okay',     emoji: '😐', label: 'Okay',       color: '#78716c' },
  { id: 'tired',    emoji: '😴', label: 'Tired',      color: '#8b5cf6' },
  { id: 'rough',    emoji: '😤', label: 'Rough',      color: '#ef4444' },
];

const TAG_OPTIONS = [
  'gym', 'nutrition', 'sleep', 'work', 'social', 'mindset',
  'progress', 'recovery', 'travel', 'ideas', 'grateful',
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── PastEntryCard ─────────────────────────────────────────────────────────────

function PastEntryCard({ dateStr, entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const mood = MOODS.find(m => m.id === entry.mood);

  return (
    <motion.div layout className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button className="w-full flex items-center gap-3 px-4 py-3" onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: 18 }}>{mood?.emoji || '📝'}</span>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-medium" style={{ color: '#a8a29e' }}>{formatDate(dateStr)}</p>
          {!expanded && (
            <p className="text-xs mt-0.5 truncate" style={{ color: '#57534e' }}>
              {entry.text?.slice(0, 60) || '—'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {entry.tags?.slice(0, 2).map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#57534e' }}>{t}</span>
          ))}
          {expanded ? <ChevronUp size={12} style={{ color: '#3d3a36' }} /> : <ChevronDown size={12} style={{ color: '#3d3a36' }} />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4 pt-1">
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#a8a29e' }}>
                {entry.text || '—'}
              </p>
              {entry.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {entry.tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#78716c' }}>{t}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => onEdit(dateStr, entry)}
                  className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#78716c' }}>
                  <Pencil size={11} /> Edit
                </button>
                <button onClick={() => onDelete(dateStr)}
                  className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Journal page ──────────────────────────────────────────────────────────────

export default function Journal() {
  const [store, update] = useApexStore();
  const toast = useToast();

  const today            = todayStr();
  const journalEntries   = store.journalEntries || {};
  const todayEntry       = journalEntries[today] || null;

  const [text,     setText]     = useState(todayEntry?.text     || '');
  const [mood,     setMood]     = useState(todayEntry?.mood     || '');
  const [tags,     setTags]     = useState(todayEntry?.tags     || []);
  const [editDate, setEditDate] = useState(null); // if editing a past entry

  // When editing a past entry, override local state
  function startEdit(dateStr, entry) {
    setEditDate(dateStr);
    setText(entry.text || '');
    setMood(entry.mood || '');
    setTags(entry.tags || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditDate(null);
    setText(todayEntry?.text || '');
    setMood(todayEntry?.mood || '');
    setTags(todayEntry?.tags || []);
  }

  function toggleTag(tag) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function handleSave() {
    if (!text.trim()) return;
    const targetDate = editDate || today;
    const entry = {
      text: text.trim(),
      mood,
      tags,
      updatedAt: new Date().toISOString(),
      createdAt: journalEntries[targetDate]?.createdAt || new Date().toISOString(),
    };
    update(s => ({
      ...s,
      journalEntries: { ...(s.journalEntries || {}), [targetDate]: entry },
    }));
    toast(editDate ? 'Entry updated' : 'Journal saved', 'success');
    if (editDate) cancelEdit();
  }

  function handleDelete(dateStr) {
    update(s => {
      const entries = { ...(s.journalEntries || {}) };
      delete entries[dateStr];
      return { ...s, journalEntries: entries };
    });
    toast('Entry deleted', 'info');
    if (editDate === dateStr) cancelEdit();
  }

  // Past entries (sorted newest first, excluding today unless editing)
  const pastDates = Object.keys(journalEntries)
    .filter(d => d !== today)
    .sort((a, b) => b.localeCompare(a));

  const isEditing = !!editDate;
  const hasChanged = isEditing
    ? (text !== (journalEntries[editDate]?.text || '') ||
       mood !== (journalEntries[editDate]?.mood || '') ||
       JSON.stringify(tags) !== JSON.stringify(journalEntries[editDate]?.tags || []))
    : (text.trim().length > 0);

  const saveLabel = isEditing ? 'Update Entry' : todayEntry ? 'Update Today' : 'Save Today';

  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-28 md:pb-10 max-w-2xl mx-auto" style={{ background: '#111010' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>Journal</h1>
          <p className="text-sm mt-0.5" style={{ color: '#57534e' }}>Reflect, process, track your inner game</p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <BookOpen size={16} style={{ color: '#06b6d4' }} />
        </div>
      </div>

      {/* Today's editor */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 mb-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isEditing ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.08)'}` }}>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>
            {isEditing ? `Editing: ${formatDate(editDate)}` : `Today — ${formatDate(today)}`}
          </p>
          {isEditing && (
            <button onClick={cancelEdit} className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#78716c' }}>
              Cancel
            </button>
          )}
        </div>

        {/* Mood */}
        <div className="flex gap-2 mb-3">
          {MOODS.map(m => (
            <button key={m.id} onClick={() => setMood(m.id === mood ? '' : m.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all"
              style={{
                background: mood === m.id ? `${m.color}18` : 'rgba(255,255,255,0.04)',
                border: mood === m.id ? `1px solid ${m.color}35` : '1px solid rgba(255,255,255,0.06)',
              }}>
              <span style={{ fontSize: 18 }}>{m.emoji}</span>
              <span style={{ fontSize: 8, color: mood === m.id ? m.color : '#3d3a36' }}>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Text */}
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="What's on your mind today? How did training go? What are you proud of?"
          rows={5}
          className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none mb-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2', lineHeight: 1.6 }} />

        {/* Tags */}
        <div className="mb-4">
          <p className="text-xs mb-2" style={{ color: '#3d3a36' }}>Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className="px-2.5 py-1 rounded-full text-xs transition-all"
                style={{
                  background: tags.includes(tag) ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                  color:      tags.includes(tag) ? '#06b6d4' : '#57534e',
                  border:     tags.includes(tag) ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={!hasChanged}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: hasChanged ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'rgba(255,255,255,0.06)', color: hasChanged ? '#000' : '#3d3a36' }}>
          {saveLabel}
        </button>
      </motion.div>

      {/* Past entries */}
      {pastDates.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: '#3d3a36' }}>PAST ENTRIES</p>
          <div className="space-y-2">
            {pastDates.map(dateStr => (
              <PastEntryCard key={dateStr} dateStr={dateStr} entry={journalEntries[dateStr]}
                onEdit={startEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {pastDates.length === 0 && !todayEntry && (
        <div className="text-center py-8">
          <p className="text-xs" style={{ color: '#3d3a36' }}>Your entries will appear here</p>
        </div>
      )}
    </div>
  );
}
