/**
 * QuickCalorieEntry — floating speed-logger.
 * Opens as a compact overlay; parses natural text like "200 cal chicken"
 * and logs directly to today's food log in < 5 seconds.
 *
 * Usage: <QuickCalorieEntry />   (drop anywhere in App shell)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Zap, ChevronDown } from 'lucide-react';
import { addFoodEntry } from '../store/apexStore';

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Protein shake', emoji: '🥤', calories: 160, protein: 30, carbs: 6,  fat: 3  },
  { label: 'Banana',        emoji: '🍌', calories: 90,  protein: 1,  carbs: 23, fat: 0  },
  { label: 'Rice (1 cup)',  emoji: '🍚', calories: 205, protein: 4,  carbs: 44, fat: 0  },
  { label: 'Chicken 100g', emoji: '🍗', calories: 165, protein: 31, carbs: 0,  fat: 4  },
  { label: 'Greek yogurt',  emoji: '🥛', calories: 100, protein: 17, carbs: 7,  fat: 1  },
  { label: 'Almonds 30g',  emoji: '🥜', calories: 173, protein: 6,  carbs: 6,  fat: 15 },
];

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

function guessCurrentMeal() {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snacks';
}

// ── Natural language parser ───────────────────────────────────────────────────
// Handles: "200 cal chicken breast" | "chicken breast 200" | "protein shake 30p 160"
function parseNaturalText(text) {
  if (!text.trim()) return null;
  const t = text.toLowerCase();

  let calories = null;
  let protein  = null;
  let name     = text.trim();

  // Extract calorie mentions: "200cal", "200 cal", "200 kcal", "cal 200"
  const calMatch =
    t.match(/(\d+)\s*(?:cal(?:orie)?s?|kcal)/) ||
    t.match(/(?:cal(?:orie)?s?|kcal)\s*(\d+)/);
  if (calMatch) {
    calories = parseInt(calMatch[1], 10);
    name = text.replace(calMatch[0], '').trim();
  }

  // Extract protein: "30p", "30g protein", "protein 30g"
  const protMatch =
    t.match(/(\d+)\s*g?\s*(?:protein|pro\b|p\b)/) ||
    t.match(/(?:protein|pro)\s*(\d+)\s*g?/);
  if (protMatch) {
    protein = parseInt(protMatch[1], 10);
    name = name.replace(protMatch[0], '').trim();
  }

  // If no calorie found but there's a standalone number, treat as calories
  if (calories === null) {
    const numMatch = text.match(/\b(\d{2,4})\b/);
    if (numMatch) {
      calories = parseInt(numMatch[1], 10);
      name = text.replace(numMatch[0], '').trim();
    }
  }

  // Clean up name
  name = name.replace(/\s{2,}/g, ' ').replace(/^[-,\s]+|[-,\s]+$/g, '').trim();
  if (!name) name = text.trim();

  if (!calories && !name) return null;

  return {
    name: name || 'Quick entry',
    calories: calories || 0,
    protein:  protein  || 0,
    carbs:    0,
    fat:      0,
    servingSize: '1 serving',
    source: 'manual',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuickCalorieEntry() {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [meal, setMeal]       = useState(guessCurrentMeal);
  const [logged, setLogged]   = useState(false);
  const [lastEntry, setLast]  = useState(null);
  const [showMeal, setShowMeal] = useState(false);
  const inputRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setText('');
      setLogged(false);
      setLast(null);
      setMeal(guessCurrentMeal());
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const parsed = parseNaturalText(text);

  const commit = useCallback((food) => {
    const entry = addFoodEntry(food, meal);
    setLast({ ...food, meal });
    setLogged(true);
    setText('');
    // Auto-close after brief success flash
    setTimeout(() => setOpen(false), 1200);
  }, [meal]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!parsed) return;
    commit(parsed);
  };

  const handlePreset = (preset) => {
    commit(preset);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="fixed z-40 flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm shadow-lg"
        style={{
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          color: '#0c0a08',
          boxShadow: '0 4px 20px rgba(245,158,11,0.45)',
        }}
        aria-label="Quick calorie entry"
      >
        <Plus size={16} strokeWidth={2.5} />
        Log calories
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              className="fixed z-50 w-full max-w-md rounded-2xl p-5"
              style={{
                bottom: 80,
                left: '50%',
                x: '-50%',
                background: '#1a1814',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              }}
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={16} style={{ color: '#f59e0b' }} />
                  <span className="font-semibold text-sm" style={{ color: '#f5f4f2' }}>
                    Quick Log
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 transition-colors"
                  style={{ color: '#57534e' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Success flash */}
              <AnimatePresence>
                {logged && lastEntry && (
                  <motion.div
                    className="flex items-center gap-2 rounded-xl px-4 py-3 mb-3"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="text-base">✅</span>
                    <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                      Logged {lastEntry.calories} cal to {MEAL_LABELS[lastEntry.meal]}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='e.g. "200 cal chicken" or "protein shake 30p"'
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: '#0f0e0c',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#f5f4f2',
                  }}
                />
                <button
                  type="submit"
                  disabled={!parsed}
                  className="rounded-xl px-4 py-3 text-sm font-semibold transition-opacity"
                  style={{
                    background: parsed ? 'linear-gradient(135deg, #f59e0b, #f97316)' : '#2d2a27',
                    color: parsed ? '#0c0a08' : '#57534e',
                    opacity: parsed ? 1 : 0.6,
                  }}
                >
                  Log
                </button>
              </form>

              {/* Parsed preview */}
              <AnimatePresence>
                {parsed && (
                  <motion.div
                    className="flex items-center gap-3 rounded-xl px-3 py-2 mb-3 text-xs"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <span className="font-medium flex-1" style={{ color: '#f5f4f2' }}>{parsed.name}</span>
                    {parsed.calories > 0 && (
                      <span style={{ color: '#f59e0b' }}>{parsed.calories} cal</span>
                    )}
                    {parsed.protein > 0 && (
                      <span style={{ color: '#10b981' }}>{parsed.protein}g protein</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Meal selector */}
              <div className="relative mb-4">
                <button
                  type="button"
                  onClick={() => setShowMeal(v => !v)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs"
                  style={{
                    background: '#0f0e0c',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#78716c',
                  }}
                >
                  <span>Logging to: <span style={{ color: '#f5f4f2' }}>{MEAL_LABELS[meal]}</span></span>
                  <ChevronDown size={12} />
                </button>

                <AnimatePresence>
                  {showMeal && (
                    <motion.div
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                      style={{ background: '#0f0e0c', border: '1px solid rgba(255,255,255,0.08)' }}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      {MEALS.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { setMeal(m); setShowMeal(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/5"
                          style={{ color: m === meal ? '#f59e0b' : '#a8a29e' }}
                        >
                          {MEAL_LABELS[m]}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Presets */}
              <p className="text-[10px] font-semibold tracking-widest mb-2" style={{ color: '#2d2a27' }}>
                QUICK PRESETS
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 text-center transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: '#0f0e0c',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-xl leading-none">{preset.emoji}</span>
                    <span className="text-[10px] leading-tight" style={{ color: '#a8a29e' }}>
                      {preset.label}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: '#f59e0b' }}>
                      {preset.calories} cal
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
