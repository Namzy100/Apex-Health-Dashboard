import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Clock, Star, Copy, Mic, Zap, ChevronDown, Check } from 'lucide-react';
import {
  useApexStore, addFoodEntry, removeFoodEntry, getFoodLog,
  getDailyTotals, getRecentFoods, getSavedMeals, copyYesterdayMeals,
} from '../store/apexStore';
import { searchLocalFoods } from '../services/localFoodDatabase';
import { parseNaturalLanguageLog } from '../services/aiService';
import { useToast } from '../components/Toast';
import { profile } from '../data/sampleData';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_META = {
  breakfast: { label: 'Breakfast', emoji: '🌅', color: '#f59e0b' },
  lunch: { label: 'Lunch', emoji: '☀️', color: '#10b981' },
  dinner: { label: 'Dinner', emoji: '🌙', color: '#6366f1' },
  snacks: { label: 'Snacks', emoji: '🍎', color: '#f97316' },
};

const TABS = ['Quick Add', 'Saved Meals', 'Recent', 'AI Log'];

function MacroRing({ pct, color, size = 36, stroke = 3 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct, 1))}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function FoodEntryRow({ entry, onRemove }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl group"
      style={{ background: 'rgba(255,255,255,0.025)' }}>
      <span className="text-xl flex-shrink-0">{entry.food?.emoji || '🍽️'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#f5f4f2' }}>{entry.food?.name || 'Food'}</p>
        <p className="text-xs" style={{ color: '#57534e' }}>
          {entry.quantity !== 1 ? `${entry.quantity}× ` : ''}{entry.food?.servingSize || '1 serving'} · {entry.calories} cal
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs font-medium" style={{ color: '#a8a29e' }}>{entry.protein}g P</span>
        <button onClick={() => onRemove(entry.id)}
          className="w-6 h-6 rounded-full items-center justify-center hidden group-hover:flex transition-all"
          style={{ background: 'rgba(239,68,68,0.15)' }}>
          <X size={11} style={{ color: '#ef4444' }} />
        </button>
      </div>
    </motion.div>
  );
}

function SearchResult({ food, activeMeal, onAdd }) {
  const [qty, setQty] = useState(1);
  const calories = Math.round((food.calories || 0) * qty);
  const protein = Math.round((food.protein || 0) * qty * 10) / 10;

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
      <span className="text-2xl flex-shrink-0">{food.emoji || '🍽️'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#f5f4f2' }}>{food.name}</p>
        <p className="text-xs" style={{ color: '#57534e' }}>
          {food.brand || food.restaurant || ''}{(food.brand || food.restaurant) ? ' · ' : ''}{food.servingSize} · {calories} cal · {protein}g P
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setQty(q => Math.max(0.5, Math.round((q - 0.5) * 2) / 2))}
            className="px-2.5 py-1.5 text-sm transition-colors hover:bg-white/5" style={{ color: '#78716c' }}>−</button>
          <span className="text-xs font-semibold px-2" style={{ color: '#f5f4f2', minWidth: 28, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(q => Math.round((q + 0.5) * 2) / 2)}
            className="px-2.5 py-1.5 text-sm transition-colors hover:bg-white/5" style={{ color: '#78716c' }}>+</button>
        </div>
        <button onClick={() => onAdd(food, qty)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(245,158,11,0.2)' }}>
          <Plus size={14} style={{ color: '#f59e0b' }} />
        </button>
      </div>
    </div>
  );
}

function SavedMealCard({ meal, activeMeal, onAdd }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {meal.imageUrl && !imgErr ? (
        <div className="relative h-28 overflow-hidden">
          <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
          <div className="absolute bottom-2 left-3">
            <p className="text-sm font-bold" style={{ color: '#f5f4f2' }}>{meal.name}</p>
          </div>
        </div>
      ) : (
        <div className="h-16 flex items-center gap-3 px-4" style={{ background: 'rgba(245,158,11,0.06)' }}>
          <span className="text-2xl">{meal.emoji}</span>
          <p className="text-sm font-bold" style={{ color: '#f5f4f2' }}>{meal.name}</p>
          {meal.isFavorite && <Star size={12} style={{ color: '#f59e0b', marginLeft: 'auto' }} />}
        </div>
      )}
      <div className="p-3">
        <div className="flex gap-3 mb-3 text-xs" style={{ color: '#78716c' }}>
          <span style={{ color: '#f97316' }}>{meal.totalCalories} cal</span>
          <span style={{ color: '#10b981' }}>{meal.totalProtein}g P</span>
          <span>{meal.totalCarbs}g C · {meal.totalFat}g F</span>
        </div>
        <button onClick={() => onAdd(meal)}
          className="w-full rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.18)' }}>
          <Plus size={12} />Add to {MEAL_META[activeMeal]?.label}
        </button>
      </div>
    </motion.div>
  );
}

export default function FoodCalories() {
  const [store, update] = useApexStore();
  const [activeMeal, setActiveMeal] = useState('breakfast');
  const [activeTab, setActiveTab] = useState('Quick Add');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [log, setLog] = useState(getFoodLog());
  const toast = useToast();
  const searchRef = useRef(null);

  const settings = store.settings;
  const targets = {
    calories: settings.dailyCalorieTarget,
    protein: settings.dailyProteinTarget,
    carbs: settings.dailyCarbTarget || 200,
    fat: settings.dailyFatTarget || 65,
  };

  const totals = getDailyTotals();
  const calPct = totals.calories / targets.calories;
  const pPct = totals.protein / targets.protein;
  const cPct = totals.carbs / targets.carbs;
  const fPct = totals.fat / targets.fat;
  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
  };

  const refreshLog = () => setLog(getFoodLog());

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setResults(searchLocalFoods(query, 20));
  }, [query]);

  const handleAdd = (food, qty = 1) => {
    addFoodEntry(food, activeMeal, qty);
    refreshLog();
    setQuery('');
    setResults([]);
    toast(`${food.emoji || '✅'} ${food.name} logged`, 'success');
  };

  const handleRemove = (entryId) => {
    removeFoodEntry(entryId, activeMeal);
    refreshLog();
    toast('Entry removed', 'info');
  };

  const handleAddSavedMeal = (meal) => {
    meal.items.forEach(item => {
      addFoodEntry({ ...item, id: `saved-${item.name}`, emoji: meal.emoji || '🍽️', servingSize: item.servingSize || '1 serving', source: 'saved' }, activeMeal, 1);
    });
    refreshLog();
    toast(`${meal.emoji} ${meal.name} added`, 'success');
  };

  const handleNLLog = async () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    try {
      const foods = await parseNaturalLanguageLog(nlQuery);
      foods.forEach(f => addFoodEntry({
        ...f,
        id: f.id || `nl-${Date.now()}-${f.name}`,
        servingSize: f.servingSize || '1 serving',
        source: 'ai',
      }, activeMeal, f.quantity || 1));
      refreshLog();
      setNlQuery('');
      toast(`✨ ${foods.length} item${foods.length > 1 ? 's' : ''} logged from text`, 'success');
    } catch (e) {
      toast('Could not parse that. Try again.', 'error');
    } finally {
      setNlLoading(false);
    }
  };

  const handleCopyYesterday = () => {
    copyYesterdayMeals();
    refreshLog();
    toast('Yesterday\'s meals copied to today', 'success');
  };

  const mealEntries = log[activeMeal] || [];
  const mealCal = mealEntries.reduce((s, e) => s + e.calories, 0);
  const savedMeals = getSavedMeals();
  const recents = getRecentFoods().slice(0, 15);
  const showDropdown = query.trim().length > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#57534e' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>Food & Calories</h1>
        </motion.div>
      </div>

      {/* Macro summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mx-6 mb-5 rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs" style={{ color: '#57534e' }}>Today's calories</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>{totals.calories}</span>
              <span className="text-sm" style={{ color: '#57534e' }}>/ {targets.calories}</span>
            </div>
          </div>
          <div className="flex gap-5 items-center">
            {[
              { label: 'Protein', value: totals.protein, target: targets.protein, unit: 'g', color: '#f59e0b', pct: pPct },
              { label: 'Carbs', value: totals.carbs, target: targets.carbs, unit: 'g', color: '#10b981', pct: cPct },
              { label: 'Fat', value: totals.fat, target: targets.fat, unit: 'g', color: '#3b82f6', pct: fPct },
            ].map(m => (
              <div key={m.label} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <MacroRing pct={m.pct} color={m.color} size={40} stroke={3} />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: m.color }}>
                    {Math.round(m.pct * 100)}%
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: '#57534e' }}>{m.label}</span>
                <span className="text-xs font-semibold" style={{ color: '#a8a29e' }}>{m.value}{m.unit}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full" style={{ background: calPct > 1 ? '#ef4444' : 'linear-gradient(90deg, #f59e0b, #f97316)' }}
            animate={{ width: `${Math.min(calPct * 100, 100)}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs" style={{ color: calPct > 1 ? '#ef4444' : '#57534e' }}>
            {calPct > 1 ? `${totals.calories - targets.calories} kcal over target` : `${remaining.calories} kcal · ${remaining.protein}g protein remaining`}
          </p>
          <button onClick={handleCopyYesterday} className="flex items-center gap-1 text-xs transition-colors" style={{ color: '#57534e' }}>
            <Copy size={10} />Copy yesterday
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="px-6 mb-4 relative z-30">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#57534e' }} />
          <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="What did you eat, Naman?"
            className="w-full rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />
          {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X size={13} style={{ color: '#57534e' }} /></button>}
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-6 right-6 top-full mt-2 rounded-2xl overflow-hidden z-50"
              style={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', maxHeight: 380, overflowY: 'auto' }}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: '#57534e' }}>Adding to</p>
                <select value={activeMeal} onChange={e => setActiveMeal(e.target.value)}
                  className="text-xs rounded-lg px-2 py-1 outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f4f2', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {MEALS.map(m => <option key={m} value={m}>{MEAL_META[m].label}</option>)}
                </select>
              </div>
              {results.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: '#57534e' }}>No results for "{query}"</p>
                  <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>Try a different keyword</p>
                </div>
              ) : results.map(food => (
                <SearchResult key={food.id} food={food} activeMeal={activeMeal} onAdd={handleAdd} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Meal selector */}
      <div className="px-6 mb-5">
        <div className="grid grid-cols-4 gap-2">
          {MEALS.map(meal => {
            const meta = MEAL_META[meal];
            const cal = (log[meal] || []).reduce((s, e) => s + e.calories, 0);
            const isActive = activeMeal === meal;
            return (
              <button key={meal} onClick={() => setActiveMeal(meal)}
                className="rounded-xl py-3 px-2 text-center transition-all"
                style={{
                  background: isActive ? `${meta.color}15` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? `${meta.color}30` : 'rgba(255,255,255,0.06)'}`,
                }}>
                <div className="text-lg mb-1">{meta.emoji}</div>
                <div className="text-xs font-medium" style={{ color: isActive ? meta.color : '#57534e' }}>{meta.label}</div>
                {cal > 0 && <div className="text-[10px] mt-0.5" style={{ color: isActive ? `${meta.color}80` : '#3d3a36' }}>{cal} cal</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 pb-10">

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === tab ? 'rgba(255,255,255,0.09)' : 'transparent',
                color: activeTab === tab ? '#f5f4f2' : '#57534e',
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* TAB: Quick Add */}
        {activeTab === 'Quick Add' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <span>{MEAL_META[activeMeal].emoji}</span>
                <h3 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>{MEAL_META[activeMeal].label}</h3>
                <span className="text-xs" style={{ color: '#57534e' }}>{mealEntries.length} items</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#a8a29e' }}>{mealCal} cal</span>
            </div>
            {mealEntries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">{MEAL_META[activeMeal].emoji}</p>
                <p className="text-sm" style={{ color: '#57534e' }}>Nothing logged for {MEAL_META[activeMeal].label.toLowerCase()}</p>
                <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>Search above to add foods</p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="p-2 space-y-1">
                  {mealEntries.map(entry => (
                    <FoodEntryRow key={entry.id} entry={entry} onRemove={handleRemove} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        )}

        {/* TAB: Saved Meals */}
        {activeTab === 'Saved Meals' && (
          <div>
            {savedMeals.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">🍱</p>
                <p className="text-sm" style={{ color: '#57534e' }}>No saved meals yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {savedMeals.map(meal => (
                  <SavedMealCard key={meal.id} meal={meal} activeMeal={activeMeal} onAdd={handleAddSavedMeal} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Recent */}
        {activeTab === 'Recent' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: '#57534e' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Recent Foods</h3>
              </div>
            </div>
            {recents.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: '#57534e' }}>Foods you log appear here</p>
              </div>
            ) : recents.map(food => (
              <SearchResult key={food.id} food={food} activeMeal={activeMeal} onAdd={handleAdd} />
            ))}
          </div>
        )}

        {/* TAB: AI Log */}
        {activeTab === 'AI Log' && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} style={{ color: '#f59e0b' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>AI Natural Language Log</h3>
              </div>
              <p className="text-xs mb-4" style={{ color: '#78716c' }}>
                Just describe what you ate. "2 eggs and toast" · "Chipotle chicken bowl" · "Protein shake with banana"
              </p>
              <div className="flex gap-2">
                <input value={nlQuery} onChange={e => setNlQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNLLog()}
                  placeholder="I just had..."
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
                <button onClick={handleNLLog} disabled={nlLoading || !nlQuery.trim()}
                  className="px-4 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
                  style={{ background: nlQuery.trim() ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.06)', color: nlQuery.trim() ? '#000' : '#57534e' }}>
                  {nlLoading ? '...' : <><Zap size={14} />Log</>}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {['2 scrambled eggs with toast', 'Chicken rice bowl', 'Greek yogurt and berries', 'Protein shake post workout'].map(ex => (
                <button key={ex} onClick={() => setNlQuery(ex)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#78716c' }}>
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
