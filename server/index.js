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
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
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

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`Apex API server listening on :${PORT}`));
