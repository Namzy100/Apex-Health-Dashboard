import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Zap, Plus, Clock, Flame, Target, X, RefreshCw, Sparkles } from 'lucide-react';
import { buildRecipeFromInputs } from '../services/aiService';
import { addFoodEntry, getDailyTotals, useApexStore } from '../store/apexStore';
import { useToast } from '../components/Toast';

const MOODS = ['💪 Hungry & motivated', '😴 Tired, keep it easy', '🌶️ Craving something bold', '🌱 Light and clean', '🍫 Sweet tooth', '🏋️ Post workout'];
const CUISINES = ['Any', 'Indian', 'American', 'Mediterranean', 'Asian', 'Mexican'];
const MEAL_TYPES = ['Any', 'Breakfast', 'Lunch', 'Dinner', 'Snack'];
const TIME_OPTIONS = ['10', '15', '20', '30', '45', '60'];

function SelectChips({ options, value, onChange, color = '#f59e0b' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isActive = value === opt || (Array.isArray(value) && value.includes(opt));
        return (
          <motion.button key={opt} onClick={() => onChange(opt)}
            whileHover={{ y: -1 }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
              color: isActive ? color : '#57534e',
              border: `1px solid ${isActive ? `${color}35` : 'rgba(255,255,255,0.07)'}`,
              boxShadow: isActive ? `0 0 12px ${color}20` : 'none',
            }}>
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

function RecipeCard({ recipe }) {
  const protPct = Math.round((recipe.protein * 4 / recipe.calories) * 100);
  const carbPct = Math.round((recipe.carbs * 4 / recipe.calories) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.18)' }}>

      {/* Hero */}
      <div className="relative p-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.05))' }}>
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)', filter: 'blur(20px)' }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.25), transparent)' }} />
        <div className="relative flex items-start justify-between mb-3">
          <div>
            <span style={{ fontSize: 44 }}>{recipe.emoji || '🍽️'}</span>
            <h2 className="text-xl font-black mt-2 tracking-tight" style={{ color: '#f5f4f2' }}>{recipe.name}</h2>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock size={12} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>{recipe.prepTime} min</span>
          </div>
        </div>
        <p className="relative text-sm leading-relaxed" style={{ color: '#a8a29e', fontStyle: 'italic' }}>
          "{recipe.whyItFits}"
        </p>
      </div>

      {/* Macro strip */}
      <div className="grid grid-cols-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Calories', value: recipe.calories, unit: '', color: '#f97316' },
          { label: 'Protein', value: recipe.protein, unit: 'g', color: '#10b981' },
          { label: 'Carbs', value: recipe.carbs, unit: 'g', color: '#3b82f6' },
          { label: 'Fat', value: recipe.fat, unit: 'g', color: '#f59e0b' },
        ].map((m, i) => (
          <div key={m.label} className="py-3 text-center" style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <p className="text-base font-black" style={{ color: m.color }}>{m.value}{m.unit}</p>
            <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#57534e' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Macro ratio bar */}
      <div className="flex h-1">
        <div style={{ width: `${protPct}%`, background: '#10b981' }} />
        <div style={{ width: `${carbPct}%`, background: '#3b82f6' }} />
        <div style={{ flex: 1, background: '#f59e0b' }} />
      </div>

      <div className="p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#3d3a36' }}>Ingredients</h3>
        <ul className="space-y-2 mb-6">
          {(recipe.ingredients || []).map((ing, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: '#a8a29e' }}>
              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#f59e0b', opacity: 0.7 }} />
              {ing}
            </li>
          ))}
        </ul>

        {recipe.extraIngredients?.length > 0 && (
          <div className="mb-6 p-3.5 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#f97316' }}>Also need:</p>
            {recipe.extraIngredients.map((ing, i) => (
              <p key={i} className="text-xs mt-1" style={{ color: '#a8a29e' }}>• {ing}</p>
            ))}
          </div>
        )}

        <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#3d3a36' }}>Steps</h3>
        <ol className="space-y-3.5 mb-6">
          {(recipe.steps || []).map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#a8a29e' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <AddToTodayButton recipe={recipe} />
      </div>
    </motion.div>
  );
}

function AddToTodayButton({ recipe }) {
  const [meal, setMeal] = useState('dinner');
  const [added, setAdded] = useState(false);
  const toast = useToast();

  const handle = () => {
    addFoodEntry({
      id: `cook-${Date.now()}`,
      name: recipe.name,
      emoji: recipe.emoji || '🍽️',
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      servingSize: '1 serving',
      source: 'cook',
    }, meal, 1);
    setAdded(true);
    toast(`${recipe.emoji || '🍽️'} ${recipe.name} added to ${meal}`, 'success');
    setTimeout(() => setAdded(false), 3000);
  };

  return (
    <div className="flex gap-2">
      <select value={meal} onChange={e => setMeal(e.target.value)}
        className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }}>
        <option value="breakfast">Breakfast</option>
        <option value="lunch">Lunch</option>
        <option value="dinner">Dinner</option>
        <option value="snacks">Snacks</option>
      </select>
      <motion.button onClick={handle} disabled={added}
        whileHover={!added ? { scale: 1.02 } : {}}
        className="flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
        style={{
          background: added ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #f59e0b, #f97316)',
          color: added ? '#10b981' : '#000',
          boxShadow: added ? 'none' : '0 4px 20px rgba(245,158,11,0.3)',
        }}>
        {added ? <><span>✓</span> Added!</> : <><Plus size={14} /> Add to Today</>}
      </motion.button>
    </div>
  );
}

export default function CookSomething() {
  const [store] = useApexStore();
  const [mood, setMood] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [cuisine, setCuisine] = useState('Any');
  const [mealType, setMealType] = useState('Any');
  const [time, setTime] = useState('30');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const toast = useToast();

  const totals = getDailyTotals();
  const settings = store.settings;
  const remaining = {
    calories: Math.max(0, (settings.dailyCalorieTarget || 2100) - totals.calories),
    protein: Math.max(0, (settings.dailyProteinTarget || 180) - totals.protein),
    carbs: Math.max(0, ((settings.dailyCarbTarget || 200)) - totals.carbs),
    fat: Math.max(0, (settings.dailyFatTarget || 65) - totals.fat),
  };

  const handleGenerate = async () => {
    setLoading(true);
    setRecipe(null);
    try {
      const result = await buildRecipeFromInputs({
        mood,
        ingredients,
        cuisine: cuisine === 'Any' ? '' : cuisine,
        mealType: mealType === 'Any' ? '' : mealType,
        timeAvailable: time,
        remainingCals: remaining.calories,
        remainingProtein: remaining.protein,
        remainingCarbs: remaining.carbs,
        remainingFat: remaining.fat,
      });
      setRecipe(result);
    } catch (e) {
      toast('Something went wrong. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* ── Cinematic Hero ── */}
      <div className="relative overflow-hidden" style={{ height: 'clamp(220px, 32vw, 300px)' }}>
        {/* Background food image */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=60)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
        }} />
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(7,5,3,0.82)' }} />
        {/* Warm orange tint */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, transparent 55%)' }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
        {/* Grain */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: 0.04,
        }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />

        {/* Text */}
        <div className="absolute inset-0 flex flex-col justify-center px-5 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <ChefHat size={16} style={{ color: '#f59e0b' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a8896e', letterSpacing: '0.14em' }}>AI-powered chef</span>
            </div>
            <h1 className="font-black tracking-tight leading-[1.05] mb-2" style={{ fontSize: 'clamp(26px,5.5vw,46px)', color: '#f5f4f2' }}>
              What are we cooking,{' '}
              <span style={{ color: '#f59e0b' }}>{settings.name || 'Naman'}?</span>
            </h1>
            <p className="text-xs md:text-sm" style={{ color: '#78716c' }}>
              Tell Apex your mood and what's in the kitchen.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-24 md:pb-10" style={{ marginTop: -8 }}>

        {/* Remaining macros bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-4 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.13)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Zap size={15} style={{ color: '#f59e0b' }} />
          </div>
          <p className="text-xs flex-1" style={{ color: '#a8896e' }}>
            <span style={{ color: '#f5f4f2', fontWeight: 700 }}>{remaining.calories} kcal</span> left today ·{' '}
            <span style={{ color: '#10b981', fontWeight: 700 }}>{remaining.protein}g protein</span> still to hit ·{' '}
            <span style={{ color: '#78716c' }}>Apex will build around these numbers.</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">

          {/* ── Input panel ── */}
          <div className="md:col-span-1 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#3d3a36' }}>Your Mood</p>
              <SelectChips options={MOODS} value={mood} onChange={v => setMood(mood === v ? '' : v)} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#3d3a36' }}>What's in the kitchen?</p>
              <textarea value={ingredients} onChange={e => setIngredients(e.target.value)}
                placeholder="chicken, rice, broccoli, olive oil..."
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#3d3a36' }}>Cuisine</p>
              <SelectChips options={CUISINES} value={cuisine} onChange={setCuisine} color="#6366f1" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#3d3a36' }}>Meal Type</p>
              <SelectChips options={MEAL_TYPES} value={mealType} onChange={setMealType} color="#10b981" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: '#3d3a36' }}>Time Available (min)</p>
              <SelectChips options={TIME_OPTIONS} value={time} onChange={setTime} color="#f97316" />
            </div>

            <motion.button onClick={handleGenerate} disabled={loading}
              whileHover={!loading ? { scale: 1.02 } : {}}
              className="w-full rounded-2xl py-4 text-sm font-black flex items-center justify-center gap-2 transition-colors"
              style={{
                background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                color: loading ? '#57534e' : '#000',
                boxShadow: loading ? 'none' : '0 8px 32px rgba(245,158,11,0.35)',
                letterSpacing: '0.02em',
              }}>
              {loading ? (
                <><RefreshCw size={15} className="animate-spin" /> Building your recipe...</>
              ) : (
                <><ChefHat size={15} /> Build Recipe</>
              )}
            </motion.button>
          </div>

          {/* ── Result panel ── */}
          <div className="md:col-span-2">
            <AnimatePresence mode="wait">
              {!recipe && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="relative flex flex-col items-center justify-center rounded-2xl overflow-hidden"
                  style={{ height: 420, border: '1px solid rgba(255,255,255,0.07)' }}>
                  {/* Background image */}
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=60)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.1) saturate(0.6)',
                  }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #111010 0%, transparent 55%)' }} />
                  <div className="relative text-center px-10">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                      style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <ChefHat size={28} style={{ color: '#f59e0b' }} />
                    </div>
                    <p className="text-base font-bold mb-2" style={{ color: '#78716c' }}>Your recipe will appear here</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#3d3a36' }}>
                      Pick your mood, list what's in the kitchen,<br />and hit Build Recipe. Macro-perfect, every time.
                    </p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center rounded-2xl gap-5"
                  style={{ height: 420, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  {/* Animated glow */}
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(245,158,11,0.15)', boxShadow: '0 0 40px rgba(245,158,11,0.2)' }}>
                    <ChefHat size={28} style={{ color: '#f59e0b' }} />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Building your recipe...</p>
                    <p className="text-xs mt-1.5" style={{ color: '#78716c' }}>Calculating macros and steps</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 rounded-full"
                        style={{ background: '#f59e0b' }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {recipe && !loading && (
                <motion.div key="recipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <RecipeCard recipe={recipe} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
