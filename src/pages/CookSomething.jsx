import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Zap, Plus, Clock, Flame, Target, X, RefreshCw } from 'lucide-react';
import { buildRecipeFromInputs } from '../services/aiService';
import { addFoodEntry, getDailyTotals, useApexStore } from '../store/apexStore';
import { useToast } from '../components/Toast';

const MOODS = ['💪 Hungry & motivated', '😴 Tired, keep it easy', '🌶️ Craving something bold', '🌱 Light and clean', '🍫 Sweet tooth', '🏋️ Post workout'];
const CUISINES = ['Any', 'Indian', 'American', 'Mediterranean', 'Asian', 'Mexican'];
const MEAL_TYPES = ['Any', 'Breakfast', 'Lunch', 'Dinner', 'Snack'];
const TIME_OPTIONS = ['10', '15', '20', '30', '45', '60'];

const EQUIPMENT = ['Stove', 'Oven', 'Air fryer', 'Microwave', 'No cooking'];

function SelectChips({ options, value, onChange, color = '#f59e0b' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isActive = value === opt || (Array.isArray(value) && value.includes(opt));
        return (
          <button key={opt} onClick={() => onChange(opt)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
              color: isActive ? color : '#57534e',
              border: `1px solid ${isActive ? `${color}30` : 'rgba(255,255,255,0.07)'}`,
            }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RecipeCard({ recipe }) {
  const protPct = Math.round((recipe.protein * 4 / recipe.calories) * 100);
  const carbPct = Math.round((recipe.carbs * 4 / recipe.calories) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>

      {/* Hero area */}
      <div className="p-6" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(249,115,22,0.04))' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-4xl">{recipe.emoji || '🍽️'}</span>
            <h2 className="text-xl font-bold mt-2" style={{ color: '#f5f4f2' }}>{recipe.name}</h2>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Clock size={12} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{recipe.prepTime} min</span>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#a8a29e', fontStyle: 'italic' }}>
          "{recipe.whyItFits}"
        </p>
      </div>

      {/* Macro strip */}
      <div className="grid grid-cols-4 divide-x px-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', divideColor: 'rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Calories', value: recipe.calories, unit: '', color: '#f97316' },
          { label: 'Protein', value: recipe.protein, unit: 'g', color: '#10b981' },
          { label: 'Carbs', value: recipe.carbs, unit: 'g', color: '#3b82f6' },
          { label: 'Fat', value: recipe.fat, unit: 'g', color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="py-3 text-center">
            <p className="text-base font-bold" style={{ color: m.color }}>{m.value}{m.unit}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: '#57534e' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Macro bar */}
      <div className="flex h-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ width: `${protPct}%`, background: '#10b981' }} />
        <div style={{ width: `${carbPct}%`, background: '#3b82f6' }} />
        <div style={{ flex: 1, background: '#f59e0b' }} />
      </div>

      <div className="p-5">
        {/* Ingredients */}
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#57534e' }}>Ingredients</h3>
        <ul className="space-y-1.5 mb-5">
          {(recipe.ingredients || []).map((ing, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#a8a29e' }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#f59e0b' }} />
              {ing}
            </li>
          ))}
        </ul>

        {recipe.extraIngredients?.length > 0 && (
          <div className="mb-5 p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#f97316' }}>Also need:</p>
            {recipe.extraIngredients.map((ing, i) => (
              <p key={i} className="text-xs" style={{ color: '#a8a29e' }}>• {ing}</p>
            ))}
          </div>
        )}

        {/* Steps */}
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#57534e' }}>Steps</h3>
        <ol className="space-y-3 mb-6">
          {(recipe.steps || []).map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#a8a29e' }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        {/* CTA */}
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
      <button onClick={handle} disabled={added}
        className="flex-1 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        style={{ background: added ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #f59e0b, #f97316)', color: added ? '#10b981' : '#000' }}>
        {added ? <><span>✓</span>Added!</> : <><Plus size={14} />Add to Today</>}
      </button>
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

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: 220 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1208 0%, #111010 50%, #0a100d 100%)' }} />
        <div className="absolute" style={{ top: -40, right: 80, width: 300, height: 300, background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute" style={{ bottom: -20, left: 80, width: 200, height: 200, background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)', filter: 'blur(30px)' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-2">
              <ChefHat size={20} style={{ color: '#f59e0b' }} />
              <span className="text-sm font-medium" style={{ color: '#a8896e' }}>AI-powered</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: '#f5f4f2' }}>What are we cooking, Naman?</h1>
            <p className="text-sm" style={{ color: '#78716c' }}>Tell Apex your mood and what's in the kitchen.</p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />
      </div>

      <div className="px-6 pb-10" style={{ marginTop: -8 }}>

        {/* Remaining macros context */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-4 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
          <Zap size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <p className="text-xs flex-1" style={{ color: '#a8896e' }}>
            <span style={{ color: '#f5f4f2', fontWeight: 600 }}>{remaining.calories} kcal</span> left today ·{' '}
            <span style={{ color: '#10b981', fontWeight: 600 }}>{remaining.protein}g protein</span> to hit target ·{' '}
            Apex will cook around these numbers.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left: Input panel */}
          <div className="col-span-1 space-y-5">

            {/* Mood */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#57534e' }}>Your Mood</p>
              <SelectChips options={MOODS} value={mood} onChange={v => setMood(mood === v ? '' : v)} />
            </div>

            {/* Ingredients */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#57534e' }}>What's in the kitchen?</p>
              <textarea value={ingredients} onChange={e => setIngredients(e.target.value)}
                placeholder="chicken, rice, broccoli, olive oil..."
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }} />
            </div>

            {/* Cuisine */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#57534e' }}>Cuisine</p>
              <SelectChips options={CUISINES} value={cuisine} onChange={setCuisine} color="#6366f1" />
            </div>

            {/* Meal type */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#57534e' }}>Meal Type</p>
              <SelectChips options={MEAL_TYPES} value={mealType} onChange={setMealType} color="#10b981" />
            </div>

            {/* Time */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#57534e' }}>Time Available (min)</p>
              <SelectChips options={TIME_OPTIONS} value={time} onChange={setTime} color="#f97316" />
            </div>

            {/* Generate */}
            <button onClick={handleGenerate} disabled={loading}
              className="w-full rounded-2xl py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                color: loading ? '#57534e' : '#000',
                boxShadow: loading ? 'none' : '0 8px 32px rgba(245,158,11,0.3)',
              }}>
              {loading ? (
                <><RefreshCw size={15} className="animate-spin" />Building your recipe...</>
              ) : (
                <><ChefHat size={15} />Build Recipe</>
              )}
            </button>
          </div>

          {/* Right: Result */}
          <div className="col-span-2">
            <AnimatePresence mode="wait">
              {!recipe && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center rounded-2xl"
                  style={{ height: 400, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                  <ChefHat size={40} style={{ color: '#3d3a36', marginBottom: 16 }} />
                  <p className="text-sm font-medium" style={{ color: '#57534e' }}>Your recipe will appear here</p>
                  <p className="text-xs mt-2 text-center max-w-xs" style={{ color: '#3d3a36' }}>
                    Fill in your mood, ingredients, and preferences, then hit Build Recipe.
                  </p>
                </motion.div>
              )}
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center rounded-2xl gap-4"
                  style={{ height: 400, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <ChefHat size={24} style={{ color: '#f59e0b' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Building your recipe...</p>
                    <p className="text-xs mt-1" style={{ color: '#78716c' }}>Calculating macros and steps</p>
                  </div>
                  <div className="flex gap-1">
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
