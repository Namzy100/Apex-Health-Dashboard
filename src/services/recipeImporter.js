/**
 * Recipe Importer — parse social media captions, comments, or raw recipe text
 * into structured Apex recipe objects.
 *
 * Import pipeline:
 *   1. cleanSocialCaption(text)        — strip hashtags, @mentions, ad copy
 *   2. POST /api/ai/import-recipe      — backend AI parse (best quality)
 *   3. localRecipeParse(text)          — regex fallback (works offline)
 *   4. normalizeImportedRecipe(raw)    — standardize shape
 *   5. estimateRecipeMacros(recipe)    — if AI didn't return macros
 *   6. saveImportedRecipe(recipe)      — persist to store
 */

const BACKEND = '/api/ai';
const DEV = import.meta.env.DEV;

// ── Platform detection ────────────────────────────────────────────────────────

const PLATFORM_PATTERNS = [
  { platform: 'instagram', re: /instagram\.com|instagr\.am/i },
  { platform: 'tiktok',    re: /tiktok\.com|vm\.tiktok/i },
  { platform: 'youtube',   re: /youtube\.com|youtu\.be/i },
  { platform: 'twitter',   re: /twitter\.com|x\.com/i },
  { platform: 'pinterest', re: /pinterest\.com/i },
];

export const PLATFORM_META = {
  instagram: { label: 'Instagram', emoji: '📸', color: '#e1306c' },
  tiktok:    { label: 'TikTok',    emoji: '🎵', color: '#ff0050' },
  youtube:   { label: 'YouTube',   emoji: '▶️',  color: '#ff0000' },
  twitter:   { label: 'Twitter/X', emoji: '𝕏',   color: '#1da1f2' },
  pinterest: { label: 'Pinterest', emoji: '📌', color: '#e60023' },
  website:   { label: 'Website',   emoji: '🌐', color: '#6366f1' },
  manual:    { label: 'Manual',    emoji: '✍️',  color: '#57534e' },
};

export function detectSourcePlatform(url) {
  if (!url || !url.trim()) return 'manual';
  for (const { platform, re } of PLATFORM_PATTERNS) {
    if (re.test(url)) return platform;
  }
  return 'website';
}

// ── Caption cleaning ──────────────────────────────────────────────────────────

export function cleanSocialCaption(text) {
  if (!text) return '';
  return text
    .replace(/#{1,}\w+/g, '')             // strip hashtags
    .replace(/@\w+/g, '')                 // strip @mentions
    .replace(/https?:\/\/\S+/g, '')       // strip URLs
    .replace(/[🔥💯✨🙌👍❤️]+/g, '')    // strip common filler emojis (keep food ones)
    .replace(/^(follow|like|save|comment|subscribe|tap the link|link in bio).*/gim, '')
    .replace(/\n{3,}/g, '\n\n')           // normalise excessive blank lines
    .trim();
}

// ── Macro estimation (ingredient-based heuristic) ────────────────────────────

const INGREDIENT_MACRO_HINTS = [
  { re: /chicken breast/i,    cal: 165, p: 31, c: 0,  f: 3.6, unit: 100 },
  { re: /ground beef|mince/i, cal: 250, p: 26, c: 0,  f: 17,  unit: 100 },
  { re: /salmon/i,            cal: 208, p: 20, c: 0,  f: 13,  unit: 100 },
  { re: /egg/i,               cal: 72,  p: 6,  c: 0.4,f: 5,   unit: 1 },
  { re: /rice/i,              cal: 242, p: 4,  c: 53, f: 0.4, unit: 1 },
  { re: /oat/i,               cal: 150, p: 5,  c: 27, f: 3,   unit: 1 },
  { re: /greek yogurt/i,      cal: 100, p: 17, c: 6,  f: 0.7, unit: 1 },
  { re: /paneer/i,            cal: 265, p: 18, c: 3,  f: 20,  unit: 100 },
  { re: /pasta/i,             cal: 220, p: 8,  c: 43, f: 1.3, unit: 1 },
  { re: /avocado/i,           cal: 160, p: 2,  c: 9,  f: 15,  unit: 1 },
];

export function estimateRecipeMacros(recipe) {
  const text = [...(recipe.ingredients || []), recipe.name || ''].join(' ').toLowerCase();
  let cal = 0, p = 0, c = 0, f = 0, matched = 0;

  for (const hint of INGREDIENT_MACRO_HINTS) {
    if (hint.re.test(text)) {
      cal += hint.cal; p += hint.p; c += hint.c; f += hint.f;
      matched++;
    }
  }

  if (matched === 0) {
    // Generic fallback: 400 cal, 30g protein for a "recipe"
    return { calories: 400, protein: 30, carbs: 35, fat: 14 };
  }

  const servings = recipe.servings || 1;
  return {
    calories: Math.round(cal / servings),
    protein:  Math.round(p   / servings * 10) / 10,
    carbs:    Math.round(c   / servings * 10) / 10,
    fat:      Math.round(f   / servings * 10) / 10,
  };
}

// ── Normalize imported recipe ─────────────────────────────────────────────────

export function normalizeImportedRecipe(raw, opts = {}) {
  const { sourceUrl = '', originalText = '', platform = 'manual', userNotes = '' } = opts;

  const macros = (raw.calories && raw.calories > 0)
    ? { calories: raw.calories, protein: raw.protein || 0, carbs: raw.carbs || 0, fat: raw.fat || 0 }
    : estimateRecipeMacros(raw);

  return {
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name:         raw.name || 'Imported Recipe',
    emoji:        raw.emoji || '🍽️',
    sourceUrl,
    sourcePlatform: platform,
    originalText,
    image:        raw.image || raw.imageUrl || null,
    ingredients:  Array.isArray(raw.ingredients) ? raw.ingredients : [],
    steps:        Array.isArray(raw.steps) ? raw.steps : [],
    servings:     raw.servings || 1,
    prepTime:     raw.prepTime || raw.prep_time || 0,
    cookTime:     raw.cookTime || raw.cook_time || 0,
    calories:     macros.calories,
    protein:      macros.protein,
    carbs:        macros.carbs,
    fat:          macros.fat,
    cuisine:      raw.cuisine || 'Unknown',
    mealType:     raw.mealType || raw.meal_type || 'Any',
    tags:         raw.tags || [],
    notes:        userNotes || raw.notes || '',
    confidence:   raw.confidence || raw.confidenceScore || 60,
    tried:        false,
    favorite:     false,
    savedAt:      new Date().toISOString(),
  };
}

// ── Local regex parser (offline fallback) ─────────────────────────────────────

export function localRecipeParse(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Heuristic: first non-empty line or line before "Ingredients" is the title
  const titleLine = lines.find(l => l.length > 3 && l.length < 80 && !/ingredient|step|direction|instruction/i.test(l));

  // Find ingredients block
  const ingIdx = lines.findIndex(l => /ingredient/i.test(l));
  const stepIdx = lines.findIndex(l => /step|direction|instruction|method|how to/i.test(l));

  const ingredientLines = ingIdx >= 0
    ? lines.slice(ingIdx + 1, stepIdx > ingIdx ? stepIdx : ingIdx + 20)
    : lines.filter(l => /^\d|^[-•*]|^\s*\d+[\.\)]/.test(l)).slice(0, 15);

  const stepLines = stepIdx >= 0
    ? lines.slice(stepIdx + 1, stepIdx + 20)
    : [];

  // Extract prep time hint
  const timeMatch = text.match(/(\d+)\s*(?:to\s*\d+\s*)?(?:minutes?|mins?|hours?|hrs?)/i);
  const prepTime = timeMatch ? parseInt(timeMatch[1]) : 20;

  // Extract servings
  const servingsMatch = text.match(/serves?\s*(\d+)|(\d+)\s*servings?/i);
  const servings = servingsMatch ? parseInt(servingsMatch[1] || servingsMatch[2]) : 2;

  return {
    name:        titleLine || 'Imported Recipe',
    ingredients: ingredientLines.map(l => l.replace(/^[-•*\d.\)]\s*/, '').trim()).filter(l => l.length > 2),
    steps:       stepLines.map(l => l.replace(/^(?:step\s*)?\d+[.\):]?\s*/i, '').trim()).filter(l => l.length > 5),
    prepTime,
    servings,
    confidence:  40,
  };
}

// ── Main parse function ───────────────────────────────────────────────────────

/**
 * Parse recipe text using backend AI, with local regex fallback.
 * Returns a normalized recipe object.
 */
export async function parseRecipeText(text, opts = {}) {
  const { url = '', notes = '', userMacroGoals = {}, dietaryPreferences = '' } = opts;
  const cleaned = cleanSocialCaption(text);

  if (DEV) console.log('[RecipeImporter] Parsing text:', cleaned.slice(0, 80) + '…');

  // 1. Try backend AI route
  try {
    const res = await fetch(`${BACKEND}/import-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleaned,
        url,
        notes,
        userMacroGoals,
        dietaryPreferences,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.recipe) {
        if (DEV) console.log('[RecipeImporter] AI parse success, confidence:', data.recipe.confidence);
        return normalizeImportedRecipe(data.recipe, {
          sourceUrl: url,
          originalText: text,
          platform: detectSourcePlatform(url),
          userNotes: notes,
        });
      }
    }
  } catch (err) {
    if (DEV) console.warn('[RecipeImporter] Backend failed, using local parse:', err.message);
  }

  // 2. Local regex fallback
  const local = localRecipeParse(cleaned);
  return normalizeImportedRecipe(local, {
    sourceUrl: url,
    originalText: text,
    platform: detectSourcePlatform(url),
    userNotes: notes,
  });
}
