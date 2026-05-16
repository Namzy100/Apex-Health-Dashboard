import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Clock, Star, Copy, Zap, Loader2,
  PenLine, ScanLine, Barcode, Camera, ChevronRight, Save,
} from 'lucide-react';
import {
  useApexStore, addFoodEntry, removeFoodEntry, getFoodLog,
  getDailyTotals, getRecentFoods, getSavedMeals, copyYesterdayMeals,
  saveCustomFood, getCustomFoods,
} from '../store/apexStore';
import { searchAllFoods, SOURCE_META } from '../services/foodSearch';
import { parseNaturalLanguageLog } from '../services/aiService';
import {
  parseNutritionLabel, getProductByBarcode,
  nutritionResultToFood, validateImageFile, emptyNutritionResult,
} from '../services/nutritionLabelParser';
import { useToast } from '../components/Toast';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_META = {
  breakfast: { label: 'Breakfast', emoji: '🌅', color: '#f59e0b' },
  lunch:     { label: 'Lunch',     emoji: '☀️',  color: '#10b981' },
  dinner:    { label: 'Dinner',    emoji: '🌙',  color: '#6366f1' },
  snacks:    { label: 'Snacks',    emoji: '🍎',  color: '#f97316' },
};
const TABS = ['Quick Add', 'Saved Meals', 'Recent', 'AI Log', 'Custom', 'Scan'];

function MacroRing({ pct, color, size = 36, stroke = 3 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct, 1))}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

function SourceBadge({ source }) {
  const meta = SOURCE_META[source];
  if (!meta) return null;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
      style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
      {meta.label}
    </span>
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
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all md:opacity-0 md:group-hover:opacity-100 min-touch"
          style={{ background: 'rgba(239,68,68,0.15)' }}>
          <X size={13} style={{ color: '#ef4444' }} />
        </button>
      </div>
    </motion.div>
  );
}

function SearchResult({ food, activeMeal, onAdd }) {
  const [qty, setQty] = useState(1);
  const calories = Math.round((food.calories || 0) * qty);
  const protein  = Math.round((food.protein  || 0) * qty * 10) / 10;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]">
      <span className="text-2xl flex-shrink-0">{food.emoji || '🍽️'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium truncate" style={{ color: '#f5f4f2' }}>{food.name}</p>
          <SourceBadge source={food.source} />
        </div>
        <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>
          {food.brand || food.restaurant || ''}{(food.brand || food.restaurant) ? ' · ' : ''}
          {food.servingSize} · {calories} cal · {protein}g P
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setQty(q => Math.max(0.5, Math.round((q - 0.5) * 2) / 2))}
            className="px-2.5 py-1.5 text-sm transition-colors hover:bg-white/5 min-touch" style={{ color: '#78716c' }}>−</button>
          <span className="text-xs font-semibold px-2" style={{ color: '#f5f4f2', minWidth: 28, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(q => Math.round((q + 0.5) * 2) / 2)}
            className="px-2.5 py-1.5 text-sm transition-colors hover:bg-white/5 min-touch" style={{ color: '#78716c' }}>+</button>
        </div>
        <motion.button onClick={() => onAdd(food, qty)} whileTap={{ scale: 0.88 }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all min-touch"
          style={{ background: 'rgba(245,158,11,0.2)' }}>
          <Plus size={14} style={{ color: '#f59e0b' }} />
        </motion.button>
      </div>
    </motion.div>
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
        <motion.button onClick={() => onAdd(meal)} whileTap={{ scale: 0.96 }}
          className="w-full rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-touch"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.18)' }}>
          <Plus size={12} />Add to {MEAL_META[activeMeal]?.label}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── NumField — compact number input ───────────────────────────────────────────
function NumField({ label, value, onChange, unit = 'g', color = '#78716c' }) {
  return (
    <div className="flex-1">
      <p className="text-[10px] mb-1" style={{ color: '#57534e' }}>{label}</p>
      <div className="relative">
        <input type="number" inputMode="decimal" value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full px-2.5 py-2 rounded-lg text-sm outline-none text-right pr-6"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Custom Food Modal ─────────────────────────────────────────────────────────
function CustomFoodModal({ onClose, onAdd, activeMeal = 'breakfast', prefill = null }) {
  const [name,        setName]        = useState(prefill?.name || '');
  const [emoji,       setEmoji]       = useState(prefill?.emoji || '🍽️');
  const [servingSize, setServingSize] = useState(prefill?.servingSize || '1 serving');
  const [calories,    setCalories]    = useState(prefill?.calories ?? '');
  const [protein,     setProtein]     = useState(prefill?.protein  ?? '');
  const [carbs,       setCarbs]       = useState(prefill?.carbs    ?? '');
  const [fat,         setFat]         = useState(prefill?.fat      ?? '');
  const [sodium,      setSodium]      = useState(prefill?.sodium   ?? '');
  const [notes,       setNotes]       = useState(prefill?.notes    || '');
  const [barcode,     setBarcode]     = useState(prefill?.barcode  || '');
  const [saveReusable, setSaveReusable] = useState(true);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const toast = useToast();

  const isValid = name.trim().length > 0 && (calories !== '' && Number(calories) >= 0);

  const lookupBarcode = async () => {
    if (!barcode.trim()) return;
    setBarcodeLoading(true);
    const result = await getProductByBarcode(barcode.trim());
    setBarcodeLoading(false);
    if (result.found && result.product) {
      const p = result.product;
      setName(p.name || name);
      setServingSize(p.servingSize || servingSize);
      setCalories(p.calories || calories);
      setProtein(p.protein || protein);
      setCarbs(p.carbs || carbs);
      setFat(p.fat || fat);
      setSodium(p.sodium || sodium);
      toast('Product found via barcode ✓', 'success');
    } else {
      toast('Product not found. Fill in manually.', 'info');
    }
  };

  const handleAdd = () => {
    const food = {
      id:          `custom-${Date.now()}`,
      name:        name.trim(),
      emoji,
      servingSize: servingSize || '1 serving',
      calories:    Number(calories) || 0,
      protein:     Number(protein)  || 0,
      carbs:       Number(carbs)    || 0,
      fat:         Number(fat)      || 0,
      sodium:      Number(sodium)   || 0,
      notes:       notes.trim(),
      barcode:     barcode.trim(),
      source:      'custom',
    };
    if (saveReusable) saveCustomFood(food);
    onAdd(food);
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <motion.div className="relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '92svh' }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <PenLine size={15} style={{ color: '#f59e0b' }} />
            <h2 className="font-bold text-sm" style={{ color: '#f5f4f2' }}>Add Custom Food</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={14} style={{ color: '#78716c' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Name + emoji */}
          <div className="flex gap-2">
            <input value={emoji} onChange={e => setEmoji(e.target.value)}
              className="w-14 text-center py-2.5 rounded-xl text-xl outline-none flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }}
              maxLength={2} />
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Food name *"
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />
          </div>

          {/* Serving size */}
          <input value={servingSize} onChange={e => setServingSize(e.target.value)}
            placeholder="Serving size (e.g. 1 cup, 100g)"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />

          {/* Macros */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#57534e' }}>Nutrition facts (per serving)</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="col-span-2">
                <NumField label="Calories *" value={calories} onChange={setCalories} unit="kcal" color="#f97316" />
              </div>
            </div>
            <div className="flex gap-2">
              <NumField label="Protein"  value={protein} onChange={setProtein} unit="g" color="#f59e0b" />
              <NumField label="Carbs"    value={carbs}   onChange={setCarbs}   unit="g" color="#10b981" />
              <NumField label="Fat"      value={fat}     onChange={setFat}     unit="g" color="#3b82f6" />
            </div>
            <div className="flex gap-2 mt-2">
              <NumField label="Sodium (optional)"  value={sodium} onChange={setSodium} unit="mg" color="#8b5cf6" />
            </div>
          </div>

          {/* Notes */}
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />

          {/* Barcode */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: '#57534e' }}>Barcode (optional)</p>
            <div className="flex gap-2">
              <input value={barcode} onChange={e => setBarcode(e.target.value)}
                placeholder="Enter barcode number"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f4f2' }} />
              <button onClick={lookupBarcode} disabled={!barcode.trim() || barcodeLoading}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all"
                style={{ background: barcode.trim() ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: barcode.trim() ? '#f59e0b' : '#3d3a36' }}>
                {barcodeLoading ? <Loader2 size={12} className="animate-spin" /> : <><Barcode size={12} />Lookup</>}
              </button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: '#3d3a36' }}>Camera scanning coming soon — enter manually for now</p>
          </div>

          {/* Save as reusable */}
          <button onClick={() => setSaveReusable(r => !r)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all"
            style={{ background: saveReusable ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${saveReusable ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: saveReusable ? '#f59e0b' : 'rgba(255,255,255,0.08)' }}>
              {saveReusable && <Save size={11} style={{ color: '#000' }} />}
            </div>
            <span className="text-sm" style={{ color: saveReusable ? '#f5f4f2' : '#78716c' }}>Save as reusable food</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={handleAdd} disabled={!isValid}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
            style={{ background: isValid ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.06)', color: isValid ? '#000' : '#3d3a36' }}>
            Add to {MEAL_META[activeMeal]?.label || 'meal'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Label Scanner component ───────────────────────────────────────────────────
function LabelScanner({ activeMeal, onAdd }) {
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [parsing,      setParsing]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [editResult,   setEditResult]   = useState(null);
  const [barcodeVal,   setBarcodeVal]   = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleFile = (file) => {
    const { valid, reason } = validateImageFile(file);
    if (!valid) { toast(reason, 'error'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setEditResult(null);
  };

  const handleParse = async () => {
    if (!imageFile) return;
    setParsing(true);
    const r = await parseNutritionLabel({ file: imageFile });
    setParsing(false);
    setResult(r);
    setEditResult({ ...r });
    if (r.foundLabel) {
      toast(`Extracted with ${r.confidence}% confidence — review below`, 'success');
    } else {
      toast(r.failureReason || 'Could not extract. Fill in manually.', 'info');
    }
  };

  const handleBarcodeLookup = async () => {
    if (!barcodeVal.trim()) return;
    setBarcodeLoading(true);
    const r = await getProductByBarcode(barcodeVal.trim());
    setBarcodeLoading(false);
    if (r.found && r.product) {
      const p = r.product;
      const nr = emptyNutritionResult({
        foundLabel: true,
        productName: p.name,
        servingSize: p.servingSize,
        calories: p.calories, protein: p.protein,
        carbs: p.carbs, fat: p.fat, sodium: p.sodium,
        sugar: p.sugar, confidence: 90,
        barcode: barcodeVal.trim(),
      });
      setResult(nr); setEditResult({ ...nr });
      toast(`Found: ${p.name}`, 'success');
    } else {
      toast('Not found. Try a different code or add manually.', 'info');
    }
  };

  const handleAddToDay = (saveFood) => {
    if (!editResult) return;
    const food = nutritionResultToFood(editResult, {
      name: editResult.productName || 'Scanned food',
      emoji: '🏷️',
    });
    if (saveFood) saveCustomFood(food);
    onAdd(food, 1);
    setImageFile(null); setImagePreview(''); setResult(null); setEditResult(null);
    toast(`${food.name} added to ${MEAL_META[activeMeal]?.label}`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="flex items-center gap-2 mb-2">
          <ScanLine size={15} style={{ color: '#8b5cf6' }} />
          <p className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>Nutrition Label Scanner</p>
        </div>
        <p className="text-xs" style={{ color: '#57534e' }}>
          Take or upload a photo of a nutrition facts label. AI will extract the values for you.
          Always review before saving.
        </p>
      </div>

      {/* Barcode fallback */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <Barcode size={13} style={{ color: '#f59e0b' }} />
          <p className="text-xs font-semibold" style={{ color: '#a8a29e' }}>Or enter barcode number</p>
        </div>
        <div className="flex gap-2">
          <input value={barcodeVal} onChange={e => setBarcodeVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
            placeholder="e.g. 049000000443"
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
          <button onClick={handleBarcodeLookup} disabled={!barcodeVal.trim() || barcodeLoading}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            style={{ background: barcodeVal.trim() ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: barcodeVal.trim() ? '#f59e0b' : '#3d3a36' }}>
            {barcodeLoading ? <Loader2 size={12} className="animate-spin" /> : 'Look up'}
          </button>
        </div>
      </div>

      {/* Image upload */}
      <div>
        {imagePreview ? (
          <div className="relative rounded-2xl overflow-hidden mb-3" style={{ maxHeight: 260 }}>
            <img src={imagePreview} alt="Label" className="w-full object-contain"
              style={{ maxHeight: 260, background: '#0a0a0a' }} />
            <button onClick={() => { setImageFile(null); setImagePreview(''); setResult(null); setEditResult(null); }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)' }}>
              <X size={13} style={{ color: '#f5f4f2' }} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-2xl py-12 flex flex-col items-center gap-3 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
            <Camera size={28} style={{ color: '#3d3a36' }} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: '#57534e' }}>Upload nutrition label photo</p>
              <p className="text-xs mt-0.5" style={{ color: '#3d3a36' }}>JPEG · PNG · HEIC · Max 10MB</p>
            </div>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {imageFile && !result && (
        <button onClick={handleParse} disabled={parsing}
          className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}>
          {parsing ? <><Loader2 size={16} className="animate-spin" />Extracting…</> : <><ScanLine size={16} />Extract Nutrition Facts</>}
        </button>
      )}

      {/* Review extracted data */}
      {editResult && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-sm font-semibold flex-1" style={{ color: '#f5f4f2' }}>Review &amp; Edit</p>
            {editResult.confidence > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: editResult.confidence >= 70 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color:      editResult.confidence >= 70 ? '#10b981' : '#f59e0b',
                }}>
                {editResult.confidence}% confidence
              </span>
            )}
          </div>
          {!editResult.foundLabel && (
            <div className="px-4 py-2.5 text-xs" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              ⚠ {editResult.failureReason || 'Could not extract automatically. Fill in manually.'}
            </div>
          )}
          <div className="p-4 space-y-3">
            <input value={editResult.productName || ''} onChange={e => setEditResult(r => ({ ...r, productName: e.target.value }))}
              placeholder="Product name"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
            <input value={editResult.servingSize || ''} onChange={e => setEditResult(r => ({ ...r, servingSize: e.target.value }))}
              placeholder="Serving size"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
            <div className="flex gap-2">
              <NumField label="Calories" value={editResult.calories} onChange={v => setEditResult(r => ({ ...r, calories: v }))} unit="kcal" color="#f97316" />
              <NumField label="Protein"  value={editResult.protein}  onChange={v => setEditResult(r => ({ ...r, protein: v }))}  unit="g"    color="#f59e0b" />
            </div>
            <div className="flex gap-2">
              <NumField label="Carbs" value={editResult.carbs} onChange={v => setEditResult(r => ({ ...r, carbs: v }))} unit="g" color="#10b981" />
              <NumField label="Fat"   value={editResult.fat}   onChange={v => setEditResult(r => ({ ...r, fat: v }))}   unit="g" color="#3b82f6" />
              <NumField label="Sodium" value={editResult.sodium} onChange={v => setEditResult(r => ({ ...r, sodium: v }))} unit="mg" color="#8b5cf6" />
            </div>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={() => handleAddToDay(true)}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#000' }}>
              Save & Add to {MEAL_META[activeMeal]?.label}
            </button>
            <button onClick={() => handleAddToDay(false)}
              className="px-3 py-3 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#57534e' }}>
              Add only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FoodCalories() {
  const [store, update] = useApexStore();
  const [activeMeal, setActiveMeal] = useState('breakfast');
  const [activeTab, setActiveTab]   = useState('Quick Add');
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [searchPhase, setSearchPhase] = useState('idle'); // idle | searching | done
  const [remoteCount, setRemoteCount] = useState(0);
  const [nlQuery, setNlQuery]       = useState('');
  const [nlLoading, setNlLoading]   = useState(false);
  const [log, setLog]               = useState(getFoodLog());
  const [fabVisible, setFabVisible] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const toast    = useToast();
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const settings = store.settings;
  const targets  = {
    calories: settings.dailyCalorieTarget,
    protein:  settings.dailyProteinTarget,
    carbs:    settings.dailyCarbTarget || 200,
    fat:      settings.dailyFatTarget  || 65,
  };
  const totals    = getDailyTotals();
  const calPct    = totals.calories / targets.calories;
  const pPct      = totals.protein  / targets.protein;
  const cPct      = totals.carbs    / targets.carbs;
  const fPct      = totals.fat      / targets.fat;
  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein:  Math.max(0, targets.protein  - totals.protein),
  };

  const refreshLog = () => setLog(getFoodLog());

  // Debounced search — instant local, async remote after 350ms
  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearchPhase('idle'); return; }

    setSearchPhase('searching');
    const savedMeals  = getSavedMeals();
    const recentFoods = getRecentFoods();
    const customFoods = getCustomFoods();

    await searchAllFoods(q, {
      savedMeals,
      recentFoods,
      customFoods,
      remote: true,
      onProgress: ({ phase, done, count }) => {
        if (phase === 'local') {
          // Instant local results — show immediately
          searchAllFoods(q, { savedMeals, recentFoods, customFoods, remote: false, onProgress: () => {} })
            .then(localOnly => setResults(localOnly));
        }
        if (done) {
          setSearchPhase('done');
          setRemoteCount(count);
        }
      },
    }).then(all => {
      setResults(all);
    });
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearchPhase('idle'); return; }
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  // FAB — show when search input is scrolled out of view
  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setFabVisible(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scrollToSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => searchRef.current?.focus(), 300);
  };

  const handleAdd = (food, qty = 1) => {
    addFoodEntry(food, activeMeal, qty);
    refreshLog();
    setQuery('');
    setResults([]);
    setSearchPhase('idle');
    toast(`${food.emoji || '✅'} ${food.name} logged`, 'success');
  };

  const handleRemove = (entryId) => {
    removeFoodEntry(entryId, activeMeal);
    refreshLog();
    toast('Entry removed', 'info');
  };

  const handleAddSavedMeal = (meal) => {
    meal.items.forEach(item => addFoodEntry(
      { ...item, id: `saved-${item.name}`, emoji: meal.emoji || '🍽️', servingSize: item.servingSize || '1 serving', source: 'saved' },
      activeMeal, 1,
    ));
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
      toast(`✨ ${foods.length} item${foods.length > 1 ? 's' : ''} logged`, 'success');
    } catch {
      toast('Could not parse that. Try again.', 'error');
    } finally {
      setNlLoading(false);
    }
  };

  const handleCopyYesterday = () => {
    copyYesterdayMeals();
    refreshLog();
    toast("Yesterday's meals copied", 'success');
  };

  const mealEntries  = log[activeMeal] || [];
  const mealCal      = mealEntries.reduce((s, e) => s + e.calories, 0);
  const savedMeals   = getSavedMeals();
  const recents      = getRecentFoods().slice(0, 15);
  const customFoods  = getCustomFoods();
  const showDropdown = query.trim().length > 0;

  // Status text shown below search in dropdown
  const searchStatus = () => {
    if (searchPhase === 'searching') return 'Searching USDA & Open Food Facts…';
    if (searchPhase === 'done' && results.length === 0) return null;
    if (searchPhase === 'done' && remoteCount > 0) return `${results.length} results across all sources`;
    return null;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>

      {/* Sticky FAB — mobile only */}
      <AnimatePresence>
        {fabVisible && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={scrollToSearch}
            className="fixed z-40 md:hidden flex items-center justify-center rounded-full shadow-2xl"
            style={{
              bottom: 'calc(4.5rem + max(0px, env(safe-area-inset-bottom)))',
              right: '1.25rem', width: 52, height: 52,
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              boxShadow: '0 8px 32px rgba(245,158,11,0.45)',
            }}>
            <Plus size={22} style={{ color: '#000' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-4 md:px-6 pt-8 pb-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#57534e' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>Food & Calories</h1>
        </motion.div>
      </div>

      {/* Macro summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mx-4 md:mx-6 mb-5 rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs" style={{ color: '#57534e' }}>Today's calories</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight" style={{ color: '#f5f4f2' }}>{totals.calories}</span>
              <span className="text-sm" style={{ color: '#57534e' }}>/ {targets.calories}</span>
            </div>
          </div>
          <div className="flex gap-3 md:gap-5 items-center">
            {[
              { label: 'Protein', value: totals.protein, target: targets.protein, unit: 'g', color: '#f59e0b', pct: pPct },
              { label: 'Carbs',   value: totals.carbs,   target: targets.carbs,   unit: 'g', color: '#10b981', pct: cPct },
              { label: 'Fat',     value: totals.fat,     target: targets.fat,     unit: 'g', color: '#3b82f6', pct: fPct },
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
          <motion.div className="h-full rounded-full"
            style={{ background: calPct > 1 ? '#ef4444' : 'linear-gradient(90deg, #f59e0b, #f97316)' }}
            animate={{ width: `${Math.min(calPct * 100, 100)}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs" style={{ color: calPct > 1 ? '#ef4444' : '#57534e' }}>
            {calPct > 1
              ? `${totals.calories - targets.calories} kcal over target`
              : `${remaining.calories} kcal · ${remaining.protein}g protein remaining`}
          </p>
          <motion.button onClick={handleCopyYesterday} whileTap={{ scale: 0.93 }}
            className="flex items-center gap-1 text-xs transition-colors min-touch" style={{ color: '#57534e' }}>
            <Copy size={10} />Copy yesterday
          </motion.button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="px-4 md:px-6 mb-4 relative z-30">
        <div className="relative">
          {searchPhase === 'searching'
            ? <Loader2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: '#f59e0b' }} />
            : <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#57534e' }} />}
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search any food — coffee, eggs, paneer…"
            className="w-full rounded-2xl pl-10 pr-10 py-3.5 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${searchPhase === 'searching' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`, color: '#f5f4f2', transition: 'border-color 0.2s' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setSearchPhase('idle'); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 min-touch">
              <X size={13} style={{ color: '#57534e' }} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
              style={{ background: '#1c1a18', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', maxHeight: 420, overflowY: 'auto' }}>

              {/* Meal selector + status */}
              <div className="px-4 py-2.5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: '#1c1a18', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  {searchPhase === 'searching' && (
                    <span className="text-xs animate-pulse" style={{ color: '#f59e0b' }}>Searching…</span>
                  )}
                  {searchStatus() && searchPhase === 'done' && (
                    <span className="text-xs" style={{ color: '#3d3a36' }}>{searchStatus()}</span>
                  )}
                </div>
                <select value={activeMeal} onChange={e => setActiveMeal(e.target.value)}
                  className="text-xs rounded-lg px-2 py-1 outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#f5f4f2', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {MEALS.map(m => <option key={m} value={m}>{MEAL_META[m].label}</option>)}
                </select>
              </div>

              {results.length === 0 && searchPhase !== 'searching' ? (
                <div className="py-8 text-center px-4">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-sm" style={{ color: '#57534e' }}>No results for "{query}"</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: '#3d3a36' }}>Try a different keyword or use AI Log to describe it</p>
                  <button
                    onClick={() => { setQuery(''); setResults([]); setSearchPhase('idle'); setShowCustomModal(true); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <PenLine size={12} />Create custom food
                  </button>
                </div>
              ) : results.map(food => (
                <SearchResult key={food.id} food={food} activeMeal={activeMeal} onAdd={handleAdd} />
              ))}

              {/* Remote searching indicator at bottom */}
              {searchPhase === 'searching' && results.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <Loader2 size={11} className="animate-spin flex-shrink-0" style={{ color: '#f59e0b' }} />
                  <p className="text-xs" style={{ color: '#3d3a36' }}>Searching USDA & Open Food Facts…</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Meal selector */}
      <div className="px-4 md:px-6 mb-5">
        <div className="grid grid-cols-4 gap-2">
          {MEALS.map(meal => {
            const meta  = MEAL_META[meal];
            const cal   = (log[meal] || []).reduce((s, e) => s + e.calories, 0);
            const isAct = activeMeal === meal;
            return (
              <motion.button key={meal} onClick={() => setActiveMeal(meal)} whileTap={{ scale: 0.95 }}
                className="rounded-xl py-3.5 px-2 text-center transition-all min-touch"
                style={{
                  background: isAct ? `${meta.color}15` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isAct ? `${meta.color}30` : 'rgba(255,255,255,0.06)'}`,
                }}>
                <div className="text-lg mb-1">{meta.emoji}</div>
                <div className="text-xs font-medium" style={{ color: isAct ? meta.color : '#57534e' }}>{meta.label}</div>
                {cal > 0 && <div className="text-[10px] mt-0.5" style={{ color: isAct ? `${meta.color}80` : '#3d3a36' }}>{cal} cal</div>}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 md:px-6 pb-24 md:pb-10">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.04)', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 min-touch"
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
                <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>Search above or try "coffee", "eggs", "chicken"</p>
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
                Describe what you ate in plain text. Macros are estimated automatically.
              </p>
              <div className="flex gap-2">
                <input value={nlQuery} onChange={e => setNlQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNLLog()}
                  placeholder="I just had..."
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#f5f4f2' }} />
                <motion.button onClick={handleNLLog} disabled={nlLoading || !nlQuery.trim()} whileTap={{ scale: 0.95 }}
                  className="px-4 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all min-touch"
                  style={{ background: nlQuery.trim() ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.06)', color: nlQuery.trim() ? '#000' : '#57534e' }}>
                  {nlLoading ? <Loader2 size={14} className="animate-spin" /> : <><Zap size={14} />Log</>}
                </motion.button>
              </div>
            </div>
            <div className="space-y-2">
              {['2 scrambled eggs with toast', 'Black coffee', 'Chicken rice bowl', 'Protein shake post workout', 'Greek yogurt and berries'].map(ex => (
                <motion.button key={ex} onClick={() => setNlQuery(ex)} whileTap={{ scale: 0.98 }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all min-touch"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#78716c' }}>
                  "{ex}"
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Custom */}
        {activeTab === 'Custom' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>My Custom Foods</h3>
                <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>Foods you've saved for quick reuse</p>
              </div>
              <motion.button onClick={() => setShowCustomModal(true)} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-touch"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Plus size={13} />Add new
              </motion.button>
            </div>

            {customFoods.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-4xl mb-3">🏷️</p>
                <p className="text-sm font-medium mb-1" style={{ color: '#57534e' }}>No custom foods saved yet</p>
                <p className="text-xs mb-5" style={{ color: '#3d3a36' }}>
                  Add foods that aren't in the database — home-cooked meals, restaurant favourites, supplements.
                </p>
                <motion.button onClick={() => setShowCustomModal(true)} whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#000' }}>
                  <PenLine size={14} />Create first custom food
                </motion.button>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {customFoods.map(food => (
                    <motion.div key={food.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <span className="text-2xl flex-shrink-0">{food.emoji || '🏷️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#f5f4f2' }}>{food.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>
                          {food.servingSize} · {food.calories} cal · {food.protein}g P · {food.carbs}g C · {food.fat}g F
                        </p>
                      </div>
                      <motion.button onClick={() => handleAdd(food, 1)} whileTap={{ scale: 0.88 }}
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all min-touch"
                        style={{ background: 'rgba(245,158,11,0.15)' }}>
                        <Plus size={15} style={{ color: '#f59e0b' }} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <p className="text-center text-xs pt-2 pb-1" style={{ color: '#3d3a36' }}>{customFoods.length} custom food{customFoods.length !== 1 ? 's' : ''} saved</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: Scan */}
        {activeTab === 'Scan' && (
          <LabelScanner activeMeal={activeMeal} onAdd={handleAdd} />
        )}
      </div>

      {/* Custom Food Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <CustomFoodModal
            activeMeal={activeMeal}
            onClose={() => setShowCustomModal(false)}
            onAdd={(food) => handleAdd(food, 1)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
