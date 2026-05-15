import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Clipboard, Loader2, Check, X, ChevronRight,
  Flame, Beef, Wheat, Droplet, Clock, Users,
  Trash2, ExternalLink, Link, FileText, AlertCircle,
  Sparkles, Save,
} from 'lucide-react';
import {
  extractSocialRecipe, formatRecipeForApex, detectPlatform, getPlatformInfo,
} from '../services/socialRecipeImport';
import { saveImportedRecipe, getImportedRecipes, deleteImportedRecipe } from '../store/apexStore';
import { useToast } from '../components/Toast';

// ── Platform badge ────────────────────────────────────────────────────────────

function PlatformBadge({ platform }) {
  const info = getPlatformInfo(platform);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${info.color}22`, color: info.color }}>
      {info.emoji} {info.name}
    </span>
  );
}

// ── Macro row ─────────────────────────────────────────────────────────────────

function MacroRow({ cal, protein, carbs, fat }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-3">
      {[
        { val: cal,           label: 'kcal',    color: '#f59e0b' },
        { val: `${protein}g`, label: 'protein', color: '#ef4444' },
        { val: `${carbs}g`,   label: 'carbs',   color: '#3b82f6' },
        { val: `${fat}g`,     label: 'fat',     color: '#8b5cf6' },
      ].map(({ val, label, color }) => (
        <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-sm font-bold" style={{ color }}>{val}</p>
          <p className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: '#57534e' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Saved recipe card ─────────────────────────────────────────────────────────

function SavedRecipeCard({ recipe, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div layout className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <span style={{ fontSize: 28 }}>{recipe.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate" style={{ color: '#f5f4f2' }}>{recipe.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <PlatformBadge platform={recipe.sourcePlatform || 'manual'} />
              <span className="text-[10px]" style={{ color: '#57534e' }}>
                {recipe.calories} cal · {recipe.protein}g P
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button whileTap={{ scale: 0.85 }}
              onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}
              className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <MacroRow cal={recipe.calories} protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
              <div className="flex items-center gap-4 pt-1">
                {(recipe.prepTime + recipe.cookTime) > 0 && (
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
                  <p className="text-[10px] uppercase tracking-widest mb-1.5 font-semibold" style={{ color: '#57534e' }}>Process</p>
                  <ol className="space-y-1">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: '#a8a29e' }}>
                        <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{i + 1}</span>
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

// ── Success result card ───────────────────────────────────────────────────────

function RecipeResult({ recipe, onSave, onDiscard }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <span style={{ fontSize: 32 }}>{recipe.emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base leading-tight" style={{ color: '#f5f4f2' }}>{recipe.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <PlatformBadge platform={recipe.platform} />
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: recipe.confidence >= 75 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color:      recipe.confidence >= 75 ? '#10b981' : '#f59e0b',
                }}>
                {recipe.confidence}% confidence
              </span>
            </div>
          </div>
        </div>
        <MacroRow cal={recipe.calories} protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
        <div className="flex items-center gap-4 mt-3">
          {(recipe.prepTime + recipe.cookTime) > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#78716c' }}>
              <Clock size={11} /> {recipe.prepTime + recipe.cookTime} min
            </span>
          )}
          <span className="flex items-center gap-1 text-xs" style={{ color: '#78716c' }}>
            <Users size={11} /> {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
          </span>
        </div>
        {recipe.ingredients?.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: '#57534e' }}>Ingredients</p>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#a8a29e' }}>
                  <span style={{ color: '#57534e', marginTop: 2 }}>·</span> {ing}
                </li>
              ))}
            </ul>
          </div>
        )}
        {recipe.steps?.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: '#57534e' }}>Process</p>
            <ol className="space-y-1.5">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-xs flex gap-2" style={{ color: '#a8a29e' }}>
                  <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {recipe.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#78716c' }}>{tag}</span>
            ))}
          </div>
        )}
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs mt-3" style={{ color: '#f59e0b' }}>
            <ExternalLink size={11} /> View original
          </a>
        )}
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <motion.button whileTap={{ scale: 0.95 }} onClick={onSave}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#000' }}>
          <Save size={14} /> Save Recipe
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onDiscard}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#78716c' }}>
          <X size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Failure card ──────────────────────────────────────────────────────────────

function FailureResult({ result, platform, onTryCaption, onDiscard }) {
  const info = getPlatformInfo(platform);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.04)' }}>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.12)' }}>
            <AlertCircle size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#f5f4f2' }}>Recipe not found in the reel</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#78716c' }}>
              {result.failureReason}
            </p>
          </div>
        </div>
        <div className="space-y-1.5 mb-4">
          {[
            { icon: FileText, label: 'Paste the caption or description text below' },
            { icon: Link,     label: 'Try a different link or paste the direct URL' },
            { icon: Sparkles, label: 'Manually paste the recipe ingredients and steps' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 p-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Icon size={12} style={{ color: '#57534e', flexShrink: 0 }} />
              <p className="text-xs" style={{ color: '#78716c' }}>{label}</p>
            </div>
          ))}
        </div>
        {platform !== 'manual' && platform !== 'unknown' && (
          <div className="p-3 rounded-xl mb-4"
            style={{ background: `${info.color}10`, border: `1px solid ${info.color}25` }}>
            <p className="text-[10px] leading-relaxed" style={{ color: '#78716c' }}>
              <strong style={{ color: info.color }}>{info.emoji} {info.name}</strong> doesn&apos;t allow scraping.
              Open the reel, copy the full caption, and paste it in the text box.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onTryCaption}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
            Paste Caption Instead
          </button>
          <button onClick={onDiscard}
            className="px-4 py-2.5 rounded-xl text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#57534e' }}>
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Example texts ─────────────────────────────────────────────────────────────

const EXAMPLES = [
  { label: 'Protein Bowl', text: `High Protein Chicken Rice Bowl 🍗\n\nIngredients:\n- 200g chicken breast\n- 1 cup brown rice\n- 1 cup broccoli\n- 2 tbsp soy sauce, 1 tsp sesame oil\n\nSteps:\n1. Season chicken, pan-fry 12 min\n2. Steam broccoli 5 min\n3. Plate and drizzle sauce\n\n520 cal | 48g protein | 45g carbs | 11g fat. Serves 1.` },
  { label: 'Paneer Tikka', text: `Quick Paneer Tikka (Air Fryer) 🧀\nServes 2 | 25 min\n\nIngredients: 250g paneer, 3 tbsp greek yogurt, 1 tsp cumin, 1 tsp coriander, 1 tsp turmeric, 1 tsp garam masala, lemon juice, salt\n\nSteps:\n1. Mix yogurt + spices\n2. Coat paneer, marinate 15 min\n3. Air fry 200°C 12 min\n\n~310 cal, 22g protein` },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Import() {
  const [mode, setMode]   = useState('link');
  const [url, setUrl]     = useState('');
  const [text, setText]   = useState('');
  const [status, setStatus]           = useState('idle');
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [failResult, setFailResult]     = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [tab, setTab] = useState('import');
  const { showToast } = useToast();

  const detectedPlatform = detectPlatform(url);
  const platformInfo     = getPlatformInfo(detectedPlatform);

  useEffect(() => { setSavedRecipes(getImportedRecipes()); }, []);

  async function handlePasteButton() {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) return;
      if (t.startsWith('http') && !t.includes('\n')) {
        setUrl(t); setMode('link');
      } else {
        setText(t); setMode('caption');
      }
    } catch {}
  }

  async function handleParse() {
    setStatus('parsing'); setParsedRecipe(null); setFailResult(null);
    const result = await extractSocialRecipe({
      url:  url.trim(),
      text: text.trim(),
    });
    if (result.foundRecipe) { setParsedRecipe(result); setStatus('done'); }
    else                    { setFailResult(result);   setStatus('failed'); }
  }

  function handleSave() {
    if (!parsedRecipe) return;
    saveImportedRecipe(formatRecipeForApex(parsedRecipe));
    setSavedRecipes(getImportedRecipes());
    showToast(`"${parsedRecipe.name}" saved`, 'success');
    setUrl(''); setText(''); setParsedRecipe(null); setStatus('idle'); setTab('saved');
  }

  function handleDiscard() { setParsedRecipe(null); setFailResult(null); setStatus('idle'); }
  function handleDelete(id) { deleteImportedRecipe(id); setSavedRecipes(getImportedRecipes()); showToast('Removed', 'info'); }

  const canParse = status !== 'parsing' && (url.trim().length > 5 || text.trim().length > 20);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 pb-28 md:pb-10 max-w-2xl mx-auto" style={{ background: '#111010' }}>

      {/* Hero */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.2))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Download size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#f5f4f2' }}>Save Recipes from Reels</h1>
            <p className="text-xs" style={{ color: '#57534e' }}>Paste a link, caption, or recipe text — AI parses the rest</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[{ id: 'import', label: 'Import' }, { id: 'saved', label: `Saved (${savedRecipes.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'rgba(245,158,11,0.12)' : 'transparent',
              color:      tab === t.id ? '#f59e0b' : '#57534e',
              border:     tab === t.id ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {tab === 'import' && (
          <motion.div key="import" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} className="space-y-4">

            {/* Mode selector */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {[
                { id: 'link',    label: '🔗 Paste Link' },
                { id: 'caption', label: '📋 Paste Caption' },
              ].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: mode === m.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color:      mode === m.id ? '#f5f4f2' : '#57534e',
                    border:     mode === m.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Link mode */}
            {mode === 'link' && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: '#78716c' }}>Reel / Post URL</label>
                    {detectedPlatform !== 'unknown' && url && <PlatformBadge platform={detectedPlatform} />}
                  </div>
                  <div className="flex gap-2">
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                      placeholder="https://instagram.com/p/… or TikTok, YouTube…"
                      className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${url ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`, color: '#f5f4f2' }} />
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handlePasteButton}
                      className="flex items-center gap-1 text-xs px-3 py-2.5 rounded-xl flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Clipboard size={12} /> Paste
                    </motion.button>
                  </div>
                  {url && detectedPlatform !== 'web' && detectedPlatform !== 'unknown' && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-3 rounded-xl flex items-start gap-2"
                      style={{ background: `${platformInfo.color}0d`, border: `1px solid ${platformInfo.color}22` }}>
                      <span style={{ fontSize: 13 }}>{platformInfo.emoji}</span>
                      <p className="text-[10px] leading-relaxed" style={{ color: '#78716c' }}>
                        <strong style={{ color: platformInfo.color }}>{platformInfo.name}</strong> blocks automatic scraping.
                        For best results, paste the caption below too.
                      </p>
                    </motion.div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78716c' }}>
                    Caption / description <span style={{ color: '#3d3a36' }}>(paste for best results)</span>
                  </label>
                  <textarea value={text} onChange={e => setText(e.target.value)}
                    placeholder="Open the reel → tap ··· → Copy → paste here…"
                    rows={4} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none leading-relaxed"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${text.length > 20 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`, color: '#f5f4f2', fontFamily: 'inherit' }} />
                </div>
              </div>
            )}

            {/* Caption mode */}
            {mode === 'caption' && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: '#78716c' }}>Recipe text / caption</label>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handlePasteButton}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Clipboard size={11} /> Paste
                    </motion.button>
                  </div>
                  <textarea value={text} onChange={e => setText(e.target.value)}
                    placeholder={`Paste caption, recipe text, or comments here…\n\nWorks with:\n• Instagram / TikTok captions\n• Recipe blog text\n• Any copied recipe`}
                    rows={9} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none leading-relaxed"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${text.length > 20 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`, color: '#f5f4f2', fontFamily: 'inherit' }} />
                  {text.length > 0 && (
                    <p className="text-[10px] text-right mt-1" style={{ color: '#3d3a36' }}>{text.length} chars</p>
                  )}
                </div>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="Source URL (optional)"
                  className="w-full px-3.5 py-2 rounded-xl text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#a8a29e' }} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#3d3a36' }}>Try:</span>
                  {EXAMPLES.map(ex => (
                    <motion.button key={ex.label} whileTap={{ scale: 0.93 }} onClick={() => setText(ex.text)}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#78716c', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {ex.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Parse button */}
            <motion.button whileTap={{ scale: 0.97 }} disabled={!canParse} onClick={handleParse}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: canParse ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.06)', color: canParse ? '#000' : '#3d3a36' }}>
              {status === 'parsing'
                ? <><Loader2 size={16} className="animate-spin" /> Scanning for recipe…</>
                : <><Sparkles size={15} /> Parse Recipe</>}
            </motion.button>

            <AnimatePresence>
              {status === 'done' && parsedRecipe && (
                <RecipeResult key="res" recipe={parsedRecipe} onSave={handleSave} onDiscard={handleDiscard} />
              )}
              {status === 'failed' && failResult && (
                <FailureResult key="fail" result={failResult} platform={detectedPlatform}
                  onTryCaption={() => { setMode('caption'); setStatus('idle'); setFailResult(null); }}
                  onDiscard={handleDiscard} />
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
                <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>Import from any social media caption or recipe text</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab('import')}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                  Import a recipe
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs mb-2" style={{ color: '#57534e' }}>{savedRecipes.length} saved</p>
                {savedRecipes.map(r => <SavedRecipeCard key={r.id} recipe={r} onDelete={handleDelete} />)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
