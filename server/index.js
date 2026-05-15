import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

// Load .env.local too — Vite uses it, Node doesn't by default
const __dir = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dir, '..', '.env.local');
try {
  const raw = readFileSync(envLocal, 'utf-8');
  for (const line of raw.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
} catch {}

const app = express();
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  // Production: set ALLOWED_ORIGIN env var or allow all same-origin (handled by Vercel routing)
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin requests (no Origin header) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, true); // Allow all in production — Vercel routing is the gatekeeper
  },
}));
app.use(express.json({ limit: '1mb' }));

// ── /api/status ─────────────────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
  res.json({
    usda:        process.env.VITE_USDA_API_KEY        ? 'connected' : 'missing',
    spoonacular: process.env.VITE_SPOONACULAR_API_KEY ? 'connected' : 'missing',
    openai:      process.env.OPENAI_API_KEY            ? 'connected' : 'missing',
    nutritionix: process.env.VITE_NUTRITIONIX_API_KEY ? 'connected' : 'missing',
  });
});

// ── Shared OpenAI helper ─────────────────────────────────────────────────────
async function callOpenAI(messages, model = 'gpt-4o-mini', maxTokens = 900) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.status);
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// ── POST /api/ai/log — natural language food parsing ─────────────────────────
app.post('/api/ai/log', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  const prompt = `Parse this food description into JSON for a fitness tracker.
User says: "${text}"

Return a JSON array of food items. Each item:
{ "name": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "servingSize": "...", "quantity": 1, "emoji": "..." }

Rules:
- Use realistic USDA-accurate macro values
- If a quantity is mentioned (e.g. "2 eggs"), set quantity accordingly
- servingSize should be natural (e.g. "1 large egg", "100g", "1 cup")
- emoji should match the food
- If unclear, make a reasonable estimate
- Return ONLY valid JSON array, nothing else`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }]);
    const parsed = JSON.parse(content.trim());
    res.json({ foods: Array.isArray(parsed) ? parsed : [parsed] });
  } catch (err) {
    console.error('[AI/log]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/recipe — build recipe from constraints ──────────────────────
app.post('/api/ai/recipe', async (req, res) => {
  const {
    mood, ingredients, cuisine, mealType, timeAvailable,
    remainingCals, remainingProtein, remainingCarbs, remainingFat,
    dietaryPreference, spiceLevel, equipment, vibe,
    recentFoods, savedMeals, userPreferences,
  } = req.body || {};

  const prompt = `You are a personal nutrition coach helping someone on a fitness cut (goal: lose fat, maintain muscle).

MACRO BUDGET REMAINING TODAY:
- Calories: ${remainingCals || '?'} kcal
- Protein: ${remainingProtein || '?'}g
- Carbs: ${remainingCarbs || '?'}g
- Fat: ${remainingFat || '?'}g

USER PREFERENCES:
- Mood: ${mood || 'normal'}
- Craving / Vibe: ${vibe || 'not specified'}
- Cuisine: ${cuisine || 'any'}
- Meal type: ${mealType || 'any'}
- Dietary notes: ${dietaryPreference || 'none'}
- Spice level: ${spiceLevel || 'medium'}
- Equipment available: ${equipment || 'stovetop, oven'}
- Time available: ${timeAvailable || '30'} minutes
- Ingredients at home: ${ingredients || 'common pantry staples'}
${recentFoods?.length ? `- Recently ate: ${recentFoods.slice(0, 5).map(f => f.name).join(', ')}` : ''}
${userPreferences?.avoidFoods?.length ? `- Avoids: ${userPreferences.avoidFoods.join(', ')}` : ''}

Build a recipe that fits within the macro budget and matches the user's preferences.

Return ONLY this exact JSON (no markdown, no extra text):
{
  "name": "Recipe Name",
  "emoji": "🍽️",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "prepTime": 0,
  "vibeDescription": "One-sentence atmospheric description of the dish",
  "ingredients": ["item with quantity 1", "item 2"],
  "steps": ["step 1", "step 2"],
  "whyItFits": "Why this fits today's macros and mood",
  "extraIngredients": ["any items not in pantry"],
  "confidenceScore": 85
}`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }], 'gpt-4o-mini', 1000);
    const cleaned = content.trim().replace(/^```json?\n?/, '').replace(/```$/, '').trim();
    const recipe = JSON.parse(cleaned);
    res.json({ recipe });
  } catch (err) {
    console.error('[AI/recipe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/import-recipe — parse social caption → structured recipe ─────
app.post('/api/ai/import-recipe', async (req, res) => {
  const { text, url, platform, notes, userMacroGoals } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  const prompt = `You are a recipe parser. Your job is to extract a recipe ONLY if the text clearly contains actual recipe content (ingredients + preparation steps).

SOURCE: ${platform || 'unknown'} ${url ? `(${url})` : ''}

TEXT:
"""
${text.slice(0, 4000)}
"""

${notes ? `User notes: ${notes}` : ''}
${userMacroGoals ? `User macro goals: ${JSON.stringify(userMacroGoals)}` : ''}

CRITICAL RULES:
1. If the text contains real recipe ingredients AND preparation steps → extract and return foundRecipe: true
2. If the text is just a video link, a title only, a caption without ingredients, or too vague → return foundRecipe: false with a clear failureReason
3. NEVER hallucinate a recipe. If ingredients and steps are not present, do not invent them.
4. If macros are stated in the text, use them. If not stated but ingredients are clear, estimate using USDA values.

If foundRecipe is TRUE, return ONLY this JSON:
{
  "foundRecipe": true,
  "name": "Recipe name",
  "emoji": "🍽️",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "servings": 1,
  "prepTime": 0,
  "cookTime": 0,
  "ingredients": ["ingredient with quantity"],
  "steps": ["step 1", "step 2"],
  "cuisine": "Indian/Italian/American/etc or Unknown",
  "mealType": "Breakfast/Lunch/Dinner/Snack/Any",
  "tags": ["high-protein", "quick", "meal-prep"],
  "notes": "any useful tip from the original",
  "confidence": 80
}

If foundRecipe is FALSE, return ONLY this JSON:
{
  "foundRecipe": false,
  "failureReason": "Brief explanation of why no recipe was found",
  "confidence": 0
}

Confidence scoring (only when foundRecipe is true):
- 90+: macros explicitly stated in text
- 70-89: clear ingredients list, macros estimated
- 40-69: partial ingredients, vague amounts
- <40: very uncertain`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }], 'gpt-4o-mini', 1400);
    const cleaned = content.trim().replace(/^```json?\n?/, '').replace(/```$/, '').trim();
    const recipe = JSON.parse(cleaned);
    res.json({ recipe });
  } catch (err) {
    console.error('[AI/import-recipe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/recipe-suggestions — return 3-5 recipe options ───────────────
app.post('/api/ai/recipe-suggestions', async (req, res) => {
  const {
    mood, ingredients, cuisine, mealType, timeAvailable,
    remainingCals, remainingProtein, remainingCarbs, remainingFat,
    dietaryPreference, spiceLevel, equipment, vibe,
    recentFoods, userPreferences, count = 4,
  } = req.body || {};

  const prompt = `You are a personal nutrition coach helping someone on a fitness cut (goal: lose fat, maintain muscle).

MACRO BUDGET REMAINING TODAY:
- Calories: ${remainingCals || '?'} kcal
- Protein: ${remainingProtein || '?'}g
- Carbs: ${remainingCarbs || '?'}g
- Fat: ${remainingFat || '?'}g

USER PREFERENCES:
- Mood: ${mood || 'normal'}
- Craving / Vibe: ${vibe || 'not specified'}
- Cuisine: ${cuisine || 'any'}
- Meal type: ${mealType || 'any'}
- Dietary notes: ${dietaryPreference || 'none'}
- Spice level: ${spiceLevel || 'medium'}
- Equipment available: ${equipment || 'stovetop, oven'}
- Time available: ${timeAvailable || '30'} minutes
- Ingredients at home: ${ingredients || 'common pantry staples'}
${recentFoods?.length ? `- Recently ate: ${recentFoods.slice(0, 5).map(f => f.name).join(', ')}` : ''}
${userPreferences?.avoidFoods?.length ? `- Avoids: ${userPreferences.avoidFoods.join(', ')}` : ''}

Generate exactly ${count} distinct recipe options that fit within the macro budget. Make them meaningfully different from each other (different protein sources, cuisines, or styles).

Return ONLY this JSON array (no markdown):
[
  {
    "name": "Recipe Name",
    "emoji": "🍽️",
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "prepTime": 0,
    "vibeDescription": "One-sentence atmospheric description",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "steps": ["step 1", "step 2"],
    "whyItFits": "Why this fits today's macros and mood",
    "extraIngredients": [],
    "confidenceScore": 85,
    "tags": ["high-protein", "quick"]
  }
]`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }], 'gpt-4o-mini', 2000);
    const cleaned = content.trim().replace(/^```json?\n?/, '').replace(/```$/, '').trim();
    const recipes = JSON.parse(cleaned);
    res.json({ recipes: Array.isArray(recipes) ? recipes : [recipes] });
  } catch (err) {
    console.error('[AI/recipe-suggestions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/coach — AI coaching insight ─────────────────────────────────
app.post('/api/ai/coach', async (req, res) => {
  const { context } = req.body || {};
  if (!context) return res.status(400).json({ error: 'context required' });

  const prompt = `You are a motivating, data-driven fitness coach for someone on a summer cut.
Context: ${JSON.stringify(context)}
Give ONE concise, specific, actionable coaching insight (2-3 sentences max).
Be direct, encouraging, data-aware. No fluff. No generic advice.`;

  try {
    const content = await callOpenAI([{ role: 'user', content: prompt }], 'gpt-4o-mini', 200);
    res.json({ insight: content });
  } catch (err) {
    console.error('[AI/coach]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/parse-nutrition-label — OCR nutrition facts from image ───────
app.post('/api/ai/parse-nutrition-label', async (req, res) => {
  const { imageBase64, imageUrl, notes } = req.body || {};
  if (!imageBase64 && !imageUrl) {
    return res.status(400).json({ error: 'imageBase64 or imageUrl required' });
  }

  const imageContent = imageBase64
    ? { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
    : { type: 'image_url', image_url: { url: imageUrl } };

  const prompt = `You are a nutrition label OCR expert. Extract the nutritional information from this image of a nutrition facts label.

Return ONLY this JSON (no markdown, no extra text):
{
  "foundLabel": true,
  "productName": "Product name if visible, or empty string",
  "servingSize": "serving size text e.g. '1 cup (240ml)'",
  "servingsPerContainer": 1,
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "saturatedFat": 0,
  "sodium": 0,
  "sugar": 0,
  "fiber": 0,
  "ingredients": "ingredients text if visible, or empty string",
  "confidence": 80
}

If this is NOT a nutrition label image, return:
{
  "foundLabel": false,
  "failureReason": "Brief reason"
}

Confidence: 90+ if all values clearly visible, 70-89 if most values clear, 40-69 if partially visible, <40 if very unclear.
Always return numbers (not strings) for nutritional values.`;

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');

    const res2 = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt + (notes ? `\n\nUser notes: ${notes}` : '') },
              imageContent,
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.1,
      }),
    });

    if (!res2.ok) {
      const err = await res2.text().catch(() => res2.status);
      throw new Error(`OpenAI ${res2.status}: ${err}`);
    }

    const data = await res2.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.trim().replace(/^```json?\n?/, '').replace(/```$/, '').trim();
    const result = JSON.parse(cleaned);
    res.json({ result });
  } catch (err) {
    console.error('[AI/parse-nutrition-label]', err.message);
    // Graceful degradation — return empty template for manual fill
    res.json({
      result: {
        foundLabel: false,
        failureReason: `Extraction failed: ${err.message}. Please fill in the values manually.`,
        manualFallback: true,
      },
    });
  }
});

// ── POST /api/ai/barcode-lookup — Open Food Facts barcode ────────────────────
app.get('/api/barcode/:code', async (req, res) => {
  const { code } = req.params;
  if (!code || !/^\d{6,14}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid barcode format' });
  }
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    if (!r.ok) throw new Error('OFF API error');
    const data = await r.json();
    if (data.status !== 1 || !data.product) {
      return res.json({ found: false });
    }
    const p = data.product;
    const n = p.nutriments || {};
    res.json({
      found: true,
      product: {
        name:        p.product_name || p.product_name_en || 'Unknown',
        brand:       p.brands || '',
        servingSize: p.serving_size || '100g',
        calories:    Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0),
        protein:     Math.round((n.proteins_serving    || n.proteins_100g    || 0) * 10) / 10,
        carbs:       Math.round((n.carbohydrates_serving || n.carbohydrates_100g || 0) * 10) / 10,
        fat:         Math.round((n.fat_serving         || n.fat_100g         || 0) * 10) / 10,
        sodium:      Math.round((n.sodium_serving      || n.sodium_100g      || 0) * 1000) / 1000,
        sugar:       Math.round((n.sugars_serving      || n.sugars_100g      || 0) * 10) / 10,
        barcode:     code,
        imageUrl:    p.image_url || '',
      },
    });
  } catch (err) {
    console.error('[barcode]', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`Apex API server listening on :${PORT}`));
