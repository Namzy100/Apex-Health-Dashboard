import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, X, Plus, Flame, ChefHat, Filter } from 'lucide-react';
import { recipeLibrary, CUISINE_FILTERS, MEAL_TYPE_FILTERS } from '../data/recipeData';
import { addFoodEntry, getDailyTotals } from '../store/apexStore';
import { useToast } from '../components/Toast';

const MACRO_FILTERS = [
  { label: 'All', fn: () => true },
  { label: '< 400 cal', fn: r => r.calories < 400 },
  { label: 'High Protein (35g+)', fn: r => r.protein >= 35 },
  { label: 'Quick (≤ 15 min)', fn: r => r.prepTime + r.cookTime <= 15 },
  { label: 'Meal Prep', fn: r => r.tags.includes('meal-prep') },
];

function RecipeImage({ recipe, className, style }) {
  const [err, setErr] = useState(false);
  return !err ? (
    <img src={recipe.imageUrl} alt={recipe.name} className={className} style={style}
      onError={() => setErr(true)} />
  ) : (
    <div className={className} style={{ ...style, background: recipe.imageGradient }}>
      <div className="absolute inset-0 flex items-center justify-center" style={{
        background: `radial-gradient(circle at 40% 50%, ${recipe.imageAccent}30, transparent 65%)`,
      }}>
        <span style={{ fontSize: 48 }}>{recipe.emoji}</span>
      </div>
    </div>
  );
}

function MacroChip({ label, value, unit, color }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold" style={{ color }}>{value}{unit}</p>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: '#57534e' }}>{label}</p>
    </div>
  );
}

function RecipeModal({ recipe, onClose, onAddToToday }) {
  const [meal, setMeal] = useState('lunch');
  const protPct = Math.round((recipe.protein * 4 / recipe.calories) * 100);
  const carbPct = Math.round((recipe.carbs * 4 / recipe.calories) * 100);
  const fatPct = 100 - protPct - carbPct;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden relative"
        style={{ background: '#1a1816', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-52 overflow-hidden">
          <RecipeImage recipe={recipe} className="w-full h-full object-cover absolute inset-0" style={{}} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1a1816 0%, transparent 60%)' }} />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <X size={14} style={{ color: '#f5f4f2' }} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${recipe.imageAccent}22`, color: recipe.imageAccent, border: `1px solid ${recipe.imageAccent}30` }}>{recipe.cuisine}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#78716c' }}>{recipe.mealType}</span>
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#f5f4f2' }}>{recipe.name}</h2>
          </div>
        </div>

        <div className="p-5">
          {/* Macro strip */}
          <div className="flex items-center justify-between p-3 rounded-2xl mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <MacroChip label="Calories" value={recipe.calories} unit="" color="#f97316" />
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <MacroChip label="Protein" value={recipe.protein} unit="g" color="#10b981" />
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <MacroChip label="Carbs" value={recipe.carbs} unit="g" color="#3b82f6" />
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <MacroChip label="Fat" value={recipe.fat} unit="g" color="#f59e0b" />
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="text-center">
              <Clock size={14} style={{ color: '#57534e', margin: '0 auto 2px' }} />
              <p className="text-base font-bold" style={{ color: '#f5f4f2' }}>{recipe.prepTime + recipe.cookTime}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#57534e' }}>min</p>
            </div>
          </div>

          {/* Macro ratio bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mb-4">
            <div style={{ width: `${protPct}%`, background: '#10b981' }} />
            <div style={{ width: `${carbPct}%`, background: '#3b82f6' }} />
            <div style={{ width: `${fatPct}%`, background: '#f59e0b' }} />
          </div>

          {/* Why it fits */}
          <p className="text-sm mb-5 leading-relaxed" style={{ color: '#a8a29e', fontStyle: 'italic' }}>
            "{recipe.macroFit}"
          </p>

          {/* Ingredients */}
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#57534e' }}>Ingredients</h3>
          <ul className="space-y-1.5 mb-5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#a8a29e' }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: recipe.imageAccent }} />
                {ing}
              </li>
            ))}
          </ul>

          {/* Steps */}
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#57534e' }}>Steps</h3>
          <ol className="space-y-2 mb-6">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#a8a29e' }}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: `${recipe.imageAccent}18`, color: recipe.imageAccent }}>{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          {/* Add to today */}
          <div className="flex gap-2">
            <select value={meal} onChange={e => setMeal(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snacks">Snacks</option>
            </select>
            <button onClick={() => { onAddToToday(recipe, meal); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#000' }}>
              <Plus size={15} />
              Add to Today
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Recipes() {
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [mealType, setMealType] = useState('All');
  const [macroFilter, setMacroFilter] = useState(0);
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  const filtered = recipeLibrary.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some(t => t.includes(search.toLowerCase()));
    const matchCuisine = cuisine === 'All' || r.cuisine === cuisine;
    const matchMeal = mealType === 'All' || r.mealType === mealType;
    const matchMacro = MACRO_FILTERS[macroFilter].fn(r);
    return matchSearch && matchCuisine && matchMeal && matchMacro;
  });

  const handleAddToToday = (recipe, meal) => {
    const food = {
      id: recipe.id,
      name: recipe.name,
      emoji: recipe.emoji,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      servingSize: `1 serving`,
      source: 'recipe',
    };
    addFoodEntry(food, meal, 1);
    toast(`${recipe.emoji} ${recipe.name} added to ${meal}`, 'success');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1208 0%, #111010 50%, #0d1a10 100%)' }} />
        <div className="absolute" style={{ top: -40, right: 100, width: 280, height: 280, background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute" style={{ bottom: -20, left: 60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)', filter: 'blur(30px)' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-2">
              <ChefHat size={18} style={{ color: '#f59e0b' }} />
              <p className="text-sm font-medium" style={{ color: '#a8896e' }}>Your recipe library</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: '#f5f4f2' }}>Cook Something Good.</h1>
            <p className="text-sm" style={{ color: '#78716c' }}>{recipeLibrary.length} recipes · All macro-optimized for your cut</p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12" style={{ background: 'linear-gradient(to bottom, transparent, #111010)' }} />
      </div>

      <div className="px-6 pb-10" style={{ marginTop: -8 }}>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#57534e' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes, cuisines, ingredients..."
            className="w-full rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }} />
          {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X size={13} style={{ color: '#57534e' }} /></button>}
        </div>

        {/* Filters row */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {/* Cuisine */}
          <div className="flex gap-1.5 flex-shrink-0">
            {CUISINE_FILTERS.map(c => (
              <button key={c} onClick={() => setCuisine(c)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: cuisine === c ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                  color: cuisine === c ? '#f59e0b' : '#57534e',
                  border: `1px solid ${cuisine === c ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {c}
              </button>
            ))}
          </div>
          <div className="w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
          {/* Meal type */}
          <div className="flex gap-1.5 flex-shrink-0">
            {MEAL_TYPE_FILTERS.map(m => (
              <button key={m} onClick={() => setMealType(m)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: mealType === m ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                  color: mealType === m ? '#10b981' : '#57534e',
                  border: `1px solid ${mealType === m ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {m}
              </button>
            ))}
          </div>
          <div className="w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
          {/* Macro */}
          <div className="flex gap-1.5 flex-shrink-0">
            {MACRO_FILTERS.map((f, i) => (
              <button key={f.label} onClick={() => setMacroFilter(i)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: macroFilter === i ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                  color: macroFilter === i ? '#3b82f6' : '#57534e',
                  border: `1px solid ${macroFilter === i ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs mb-4" style={{ color: '#57534e' }}>{filtered.length} recipes found</p>

        {/* Recipe grid */}
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((recipe, i) => {
              const [imgErr, setImgErr] = useState(false);
              const protPct = Math.round((recipe.protein * 4 / recipe.calories) * 100);

              return (
                <motion.div
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                  onClick={() => setSelected(recipe)}
                  className="rounded-2xl overflow-hidden cursor-pointer group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    {!imgErr ? (
                      <img src={recipe.imageUrl} alt={recipe.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgErr(true)} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: recipe.imageGradient }}>
                        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 40% 50%, ${recipe.imageAccent}30, transparent 65%)` }} />
                        <span style={{ fontSize: 56, position: 'relative' }}>{recipe.emoji}</span>
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />

                    {/* Tags */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${recipe.imageAccent}22`, color: recipe.imageAccent, backdropFilter: 'blur(8px)', border: `1px solid ${recipe.imageAccent}30` }}>
                        {recipe.mealType}
                      </span>
                      {recipe.tags.includes('quick') && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(0,0,0,0.5)', color: '#a8a29e', backdropFilter: 'blur(8px)' }}>
                          ⚡ Quick
                        </span>
                      )}
                    </div>

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-sm font-bold mb-1" style={{ color: '#f5f4f2' }}>{recipe.name}</h3>
                      <div className="flex items-center gap-3 text-xs" style={{ color: '#a8a29e' }}>
                        <span className="flex items-center gap-1"><Flame size={10} style={{ color: '#f97316' }} />{recipe.calories}</span>
                        <span className="flex items-center gap-1" style={{ color: '#10b981' }}>●{recipe.protein}g P</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{recipe.prepTime + recipe.cookTime}m</span>
                      </div>
                    </div>

                    {/* Macro ratio bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                      <div style={{ width: `${protPct}%`, background: '#10b981' }} />
                      <div style={{ width: `${Math.round((recipe.carbs * 4 / recipe.calories) * 100)}%`, background: '#3b82f6' }} />
                      <div style={{ flex: 1, background: '#f59e0b' }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#57534e' }}>
                          {t.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleAddToToday(recipe, 'lunch'); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.15)' }}
                    >
                      <Plus size={13} style={{ color: '#f59e0b' }} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm font-medium" style={{ color: '#57534e' }}>No recipes match those filters</p>
            <button onClick={() => { setSearch(''); setCuisine('All'); setMealType('All'); setMacroFilter(0); }}
              className="mt-3 text-xs" style={{ color: '#f59e0b' }}>Clear filters</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)} onAddToToday={handleAddToToday} />}
      </AnimatePresence>
    </div>
  );
}
