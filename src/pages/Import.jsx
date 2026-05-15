import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Download, Clipboard, Loader2, Check, X, ChevronRight,
  Flame, Beef, Wheat, Droplet, Clock, Users,
  Trash2, ExternalLink,
} from 'lucide-react';
import { parseRecipeText, PLATFORM_META } from '../services/recipeImporter';
import { saveImportedRecipe, getImportedRecipes, deleteImportedRecipe } from '../store/apexStore';
import { useToast } from '../components/Toast';

const EXAMPLE_PASTES = [
  {
    label: 'High Protein Bowl',
    text: `High Protein Chicken Rice Bowl 🍗

Ingredients:
- 200g chicken breast
- 1 cup cooked brown rice
- 1 cup broccoli
- 2 tbsp soy sauce
- 1 tsp sesame oil
- Salt, pepper, garlic powder

Steps:
1. Season chicken with salt, pepper, garlic powder
2. Pan-fry chicken 12 min until cooked through
3. Steam broccoli 5 min
4. Plate rice, chicken, broccoli, drizzle sauce

Macros per serving: 520 cal | 48g protein | 45g carbs | 11g fat
Serves 1. Prep 5 min, cook 20 min.`,
  },
  {
    label: 'Paneer Tikka',
    text: `Quick Paneer Tikka (Air Fryer) 🧀

Serves 2 | 25 min

Ingredients:
- 250g paneer, cubed
- 3 tbsp greek yogurt
- 1 tsp each: cumin, coriander, turmeric, garam masala
- 1 tbsp lemon juice, salt

Steps:
1. Mix yogurt and spices for marinade
2. Coat paneer, marinate 15 min
3. Air fry 200°C for 12 min, flip halfway

Approx 310 cal per serving, 22g protein`,
  },
];

function PlatformBadge({ platform }) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.manual;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${meta.color}20`, color: meta.color }}>
      {meta.emoji} {meta.label}
    </span>
  );
}

function MacroRow({ cal, protein, carbs, fat }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-3">
      {[
        { icon: Flame, val: cal, label: 'kcal', color: '#f59e0b' },
        { icon: Beef, val: `${protein}g`, label: 'protein', color: '#ef4444' },
        { icon: Wheat, val: `${carbs}g`, label: 'carbs', color: '#3b82f6' },
        { icon: Droplet, val: `${fat}g`, label: 'fat', color: '#8b5cf6' },
      ].map(({ icon: Icon, val, label, color }) => (
        <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-sm font-bold" style={{ color }}>{val}</p>
          <p className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: '#57534e' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function ImportedRecipeCard({ recipe, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div layout className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 28 }}>{recipe.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate" style={{ color: '#f5f4f2' }}>{recipe.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <PlatformBadge platform={recipe.sourcePlatform} />
              <span className="text-[10px]" style={{ color: '#57534e' }}>
                {recipe.calories} cal · {recipe.protein}g P
              </span>
              {recipe.tried && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  Tried
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
              className="p-1.5 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <Trash2 size={13} />
            </motion.button>
            <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
              <ChevronRight size={14} style={{ color: '#57534e' }} />
            </motion.div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <MacroRow cal={recipe.calories} protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />

              <div className="flex items-center gap-4 pt-1">
                {recipe.prepTime > 0 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#78716c' }}>
                    <Clock size={11} /> {recipe.prepTime + recipe.cookTime} min
                  </span>
                )}
                {recipe.servings > 1 && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#78716c' }}>
                    <Users size={11} /> {recipe.servings} servings
                  </span>
                )}
              </div>

              {recipe.ingredients?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-1.5 font-semibold" style={{ color: '#57534e' }}>Ingredients</p>
                  <ul className="space-y-0.5">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#a8a29e' }}>
                        <span style={{ color: '#57534e', marginTop: 2 }}>·</span> {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recipe.steps?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-1.5 font-semibold" style={{ color: '#57534e' }}>Steps</p>
                  <ol className="space-y-1">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: '#a8a29e' }}>
                        <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}>
                  <ExternalLink size={11} /> View original
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Import() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | parsing | done | error
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [tab, setTab] = useState('import'); // import | saved
  const textareaRef = useRef(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setSavedRecipes(getImportedRecipes());
  }, []);

  // Auto-detect paste
  async function handlePaste(e) {
    const pasted = e.clipboardData?.getData('text');
    if (pasted && pasted.length > 20) {
      setText(pasted);
    }
  }

  async function handlePasteButton() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText(t);
    } catch {}
  }

  async function handleParse() {
    if (!text.trim()) return;
    setStatus('parsing');
    setParsedRecipe(null);
    try {
      const recipe = await parseRecipeText(text, { url });
      setParsedRecipe(recipe);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      showToast('Failed to parse recipe. Try again.', 'error');
    }
  }

  function handleSave() {
    if (!parsedRecipe) return;
    saveImportedRecipe(parsedRecipe);
    setSavedRecipes(getImportedRecipes());
    showToast(`"${parsedRecipe.name}" saved to your vault`, 'success');
    setText('');
    setUrl('');
    setParsedRecipe(null);
    setStatus('idle');
    setTab('saved');
  }

  function handleDelete(id) {
    deleteImportedRecipe(id);
    setSavedRecipes(getImportedRecipes());
    showToast('Recipe removed', 'info');
  }

  function useExample(ex) {
    setText(ex.text);
    textareaRef.current?.focus();
  }

  const charCount = text.length;

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 pb-28 md:pb-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.2))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Download size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#f5f4f2' }}>Import Recipe</h1>
            <p className="text-xs" style={{ color: '#57534e' }}>Paste from Instagram, TikTok, anywhere</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { id: 'import', label: 'Import New' },
          { id: 'saved', label: `Saved (${savedRecipes.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'rgba(245,158,11,0.12)' : 'transparent',
              color: tab === t.id ? '#f59e0b' : '#57534e',
              border: tab === t.id ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'import' && (
          <motion.div key="import" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {/* URL field */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#78716c' }}>
                Source URL (optional)
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f5f4f2' }}
              />
            </div>

            {/* Main textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: '#78716c' }}>Recipe text or caption</label>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handlePasteButton}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Clipboard size={11} /> Paste
                </motion.button>
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste the recipe caption, comment, or text here…

Works great with:
• Instagram / TikTok captions
• Recipe comments and descriptions
• Any recipe text you copy"
                rows={10}
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${text.length > 20 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  color: '#f5f4f2',
                  fontFamily: 'inherit',
                }}
              />
              {charCount > 0 && (
                <p className="text-[10px] text-right mt-1" style={{ color: '#3d3a36' }}>{charCount} chars</p>
              )}
            </div>

            {/* Example buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#3d3a36' }}>Try example:</span>
              {EXAMPLE_PASTES.map(ex => (
                <motion.button key={ex.label} whileTap={{ scale: 0.93 }} onClick={() => useExample(ex)}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#78716c', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {ex.label}
                </motion.button>
              ))}
            </div>

            {/* Parse button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={text.trim().length < 10 || status === 'parsing'}
              onClick={handleParse}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                background: text.trim().length >= 10
                  ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                  : 'rgba(255,255,255,0.06)',
                color: text.trim().length >= 10 ? '#000' : '#3d3a36',
              }}>
              {status === 'parsing'
                ? <><Loader2 size={16} className="animate-spin" /> Parsing with AI…</>
                : <><Download size={15} /> Parse Recipe</>
              }
            </motion.button>

            {/* Parsed result */}
            <AnimatePresence>
              {parsedRecipe && status === 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span style={{ fontSize: 32 }}>{parsedRecipe.emoji}</span>
                      <div className="flex-1">
                        <h2 className="font-bold text-base" style={{ color: '#f5f4f2' }}>{parsedRecipe.name}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <PlatformBadge platform={parsedRecipe.sourcePlatform} />
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: parsedRecipe.confidence >= 75 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: parsedRecipe.confidence >= 75 ? '#10b981' : '#f59e0b' }}>
                            {parsedRecipe.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    </div>

                    <MacroRow cal={parsedRecipe.calories} protein={parsedRecipe.protein} carbs={parsedRecipe.carbs} fat={parsedRecipe.fat} />

                    <div className="flex items-center gap-4 mt-3">
                      {(parsedRecipe.prepTime + parsedRecipe.cookTime) > 0 && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#78716c' }}>
                          <Clock size={11} /> {parsedRecipe.prepTime + parsedRecipe.cookTime} min
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#78716c' }}>
                        <Users size={11} /> {parsedRecipe.servings} serving{parsedRecipe.servings !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {parsedRecipe.ingredients?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: '#57534e' }}>Ingredients</p>
                        <ul className="space-y-1">
                          {parsedRecipe.ingredients.map((ing, i) => (
                            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#a8a29e' }}>
                              <span style={{ color: '#57534e', marginTop: 2 }}>·</span> {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {parsedRecipe.steps?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: '#57534e' }}>Steps</p>
                        <ol className="space-y-1.5">
                          {parsedRecipe.steps.map((step, i) => (
                            <li key={i} className="text-xs flex gap-2" style={{ color: '#a8a29e' }}>
                              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {parsedRecipe.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {parsedRecipe.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#78716c' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save / Discard */}
                  <div className="flex gap-2 px-4 pb-4">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#000' }}>
                      <Check size={14} /> Save to Vault
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => { setParsedRecipe(null); setStatus('idle'); }}
                      className="px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#78716c' }}>
                      <X size={14} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {tab === 'saved' && (
          <motion.div key="saved" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {savedRecipes.length === 0 ? (
              <div className="text-center py-16">
                <p style={{ fontSize: 48 }}>📥</p>
                <p className="mt-3 font-medium text-sm" style={{ color: '#57534e' }}>No saved recipes yet</p>
                <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>Import your first recipe from any social media caption</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab('import')}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                  Import a recipe
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs mb-4" style={{ color: '#57534e' }}>{savedRecipes.length} recipe{savedRecipes.length !== 1 ? 's' : ''} saved</p>
                {savedRecipes.map(recipe => (
                  <ImportedRecipeCard key={recipe.id} recipe={recipe} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
