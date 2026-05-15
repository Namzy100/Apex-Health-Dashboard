/**
 * Social recipe import — detect platform, attempt extraction, parse with AI.
 * Technical reality: Instagram, TikTok, YouTube Shorts block scraping.
 * When only a link is provided for a blocked platform, we fail gracefully
 * and guide the user to paste the caption/text manually.
 */

// ── Platform registry ─────────────────────────────────────────────────────────

export const PLATFORM_INFO = {
  instagram: { name: 'Instagram',  emoji: '📸', color: '#e1306c', canScrape: false },
  tiktok:    { name: 'TikTok',     emoji: '🎵', color: '#fe2c55', canScrape: false },
  youtube:   { name: 'YouTube',    emoji: '▶️',  color: '#ff0000', canScrape: false },
  twitter:   { name: 'X / Twitter',emoji: '✖',  color: '#1da1f2', canScrape: false },
  pinterest: { name: 'Pinterest',  emoji: '📌', color: '#bd081c', canScrape: false },
  web:       { name: 'Web',        emoji: '🌐', color: '#78716c', canScrape: true  },
  manual:    { name: 'Manual',     emoji: '✍️',  color: '#a78bfa', canScrape: false },
  unknown:   { name: 'Source',     emoji: '🔗', color: '#57534e', canScrape: false },
};

// ── detectPlatform ────────────────────────────────────────────────────────────

export function detectPlatform(url) {
  if (!url?.trim()) return 'unknown';
  const u = url.toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  if (u.includes('tiktok.com') || u.includes('vm.tiktok.com'))  return 'tiktok';
  if (u.includes('youtube.com') || u.includes('youtu.be'))      return 'youtube';
  if (u.includes('twitter.com') || u.includes('x.com'))         return 'twitter';
  if (u.includes('pinterest.com'))                               return 'pinterest';
  if (u.startsWith('http'))                                      return 'web';
  return 'unknown';
}

export function getPlatformInfo(platform) {
  return PLATFORM_INFO[platform] || PLATFORM_INFO.unknown;
}

// ── Failure helper ────────────────────────────────────────────────────────────

function failResult(reason, platform = 'unknown', url = '') {
  return {
    foundRecipe: false,
    failureReason: reason,
    platform,
    sourceUrl: url,
    confidence: 0,
  };
}

// ── extractSocialRecipe — main entry point ────────────────────────────────────

export async function extractSocialRecipe({ url = '', text = '', notes = '', userMacros = null } = {}) {
  const platform = detectPlatform(url);
  const hasText  = text.trim().length > 20;
  const hasUrl   = url.trim().length > 5;

  // No text AND link is from a blocked platform → fail gracefully
  if (!hasText) {
    if (!hasUrl) {
      return failResult('No recipe text provided. Paste the caption, comments, or recipe text.');
    }
    const info = PLATFORM_INFO[platform];
    if (!info?.canScrape) {
      const platformName = info?.name || 'This platform';
      return failResult(
        `${platformName} blocks automatic scraping. Copy the caption or description and paste it below.`,
        platform,
        url,
      );
    }
    // Web platform: try a best-effort fetch via backend
    return failResult(
      'No recipe text provided. Paste the page text or caption below.',
      platform,
      url,
    );
  }

  // We have text — parse with AI regardless of URL
  return parseRecipeFromText(text, { url, platform, notes, userMacros });
}

// ── parseRecipeFromText — calls backend AI ────────────────────────────────────

export async function parseRecipeFromText(text, { url = '', platform = 'unknown', notes = '', userMacros = null } = {}) {
  try {
    const res = await fetch('/api/ai/import-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:          text.slice(0, 4000),
        url:           url || '',
        platform:      platform || 'unknown',
        notes:         notes || '',
        userMacroGoals: userMacros || null,
      }),
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const raw = data.recipe;

    // Backend signalled no recipe found
    if (raw.foundRecipe === false) {
      return failResult(
        raw.failureReason || 'No recipe ingredients or steps found in the text.',
        platform,
        url,
      );
    }

    return normalizeRecipe(raw, { url, platform });
  } catch (err) {
    return failResult(
      `Parsing failed: ${err.message}`,
      platform,
      url,
    );
  }
}

// ── normalizeRecipe ───────────────────────────────────────────────────────────

export function normalizeRecipe(raw, { url = '', platform = 'unknown' } = {}) {
  return {
    foundRecipe:  true,
    name:         raw.name || 'Untitled Recipe',
    emoji:        raw.emoji || '🍽️',
    calories:     Number(raw.calories) || 0,
    protein:      Number(raw.protein)  || 0,
    carbs:        Number(raw.carbs)    || 0,
    fat:          Number(raw.fat)      || 0,
    servings:     Number(raw.servings) || 1,
    prepTime:     Number(raw.prepTime) || 0,
    cookTime:     Number(raw.cookTime) || 0,
    ingredients:  Array.isArray(raw.ingredients) ? raw.ingredients : [],
    steps:        Array.isArray(raw.steps) ? raw.steps : [],
    tags:         Array.isArray(raw.tags) ? raw.tags : [],
    cuisine:      raw.cuisine  || '',
    mealType:     raw.mealType || '',
    notes:        raw.notes    || '',
    confidence:   Number(raw.confidence) || 50,
    sourceUrl:    url || raw.sourceUrl || '',
    platform,
    importedAt:   new Date().toISOString(),
  };
}

// ── validateRecipe ────────────────────────────────────────────────────────────

export function validateRecipe(recipe) {
  if (!recipe?.foundRecipe)        return { valid: false, reason: recipe?.failureReason || 'No recipe' };
  if (!recipe.name)                return { valid: false, reason: 'Recipe name missing' };
  if (!recipe.ingredients?.length) return { valid: false, reason: 'No ingredients found' };
  return { valid: true };
}

// ── formatRecipeForApex — convert to apexStore saved-recipe shape ─────────────

export function formatRecipeForApex(recipe) {
  return {
    id:             `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name:           recipe.name,
    emoji:          recipe.emoji,
    calories:       recipe.calories,
    protein:        recipe.protein,
    carbs:          recipe.carbs,
    fat:            recipe.fat,
    servings:       recipe.servings,
    prepTime:       recipe.prepTime,
    cookTime:       recipe.cookTime,
    ingredients:    recipe.ingredients,
    steps:          recipe.steps,
    tags:           recipe.tags,
    cuisine:        recipe.cuisine,
    mealType:       recipe.mealType,
    notes:          recipe.notes,
    confidence:     recipe.confidence,
    sourceUrl:      recipe.sourceUrl,
    sourcePlatform: recipe.platform,
    importedAt:     recipe.importedAt || new Date().toISOString(),
    tried:          false,
    isFavorite:     false,
  };
}
