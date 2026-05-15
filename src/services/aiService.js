/**
 * AI service — routes through backend (/api/ai/*) first for security.
 * Falls back to direct VITE_OPENAI_API_KEY call if backend is unavailable.
 * Falls back to local NLP / hardcoded recipes if no key is set anywhere.
 *
 * Route hierarchy:
 *   1. POST /api/ai/log  or  /api/ai/recipe  (backend, OpenAI key stays server-side)
 *   2. Direct OpenAI fetch using VITE_OPENAI_API_KEY (dev only, if set)
 *   3. Local heuristic / hardcoded fallback
 */

const BACKEND = '/api/ai';
const VITE_KEY = import.meta.env.VITE_OPENAI_API_KEY || null;
const DEV = import.meta.env.DEV;

// ── Backend helper ────────────────────────────────────────────────────────────

async function callBackend(path, body) {
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    return await res.json();
  } catch (err) {
    if (DEV) console.warn(`[AI] Backend ${path} failed:`, err.message);
    return null;
  }
}

// ── Direct OpenAI fallback (dev, if VITE_OPENAI_API_KEY is set) ───────────────

async function callOpenAIDirect(messages, maxTokens = 800) {
  if (!VITE_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${VITE_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.7, max_tokens: maxTokens }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    if (DEV) console.warn('[AI] Direct OpenAI failed:', err.message);
    return null;
  }
}

// ── Natural language food log ─────────────────────────────────────────────────

const NL_FALLBACK_FOODS = [
  { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: '100g', emoji: '🍗', source: 'local' },
  { name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 1.8, servingSize: '1 cup', emoji: '🍚', source: 'local' },
  { name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 0.7, servingSize: '170g', emoji: '🥛', source: 'local' },
  { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, servingSize: '1 medium', emoji: '🍌', source: 'local' },
  { name: 'Egg', calories: 78, protein: 6, carbs: 0.6, fat: 5.3, servingSize: '1 large', emoji: '🥚', source: 'local' },
  { name: 'Avocado', calories: 120, protein: 1.5, carbs: 6.4, fat: 11, servingSize: '1/2 medium', emoji: '🥑', source: 'local' },
  { name: 'Oatmeal', calories: 166, protein: 5.9, carbs: 28, fat: 3.6, servingSize: '1 cup cooked', emoji: '🥣', source: 'local' },
  { name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14, servingSize: '28g', emoji: '🥜', source: 'local' },
  { name: 'Whey Protein Shake', calories: 130, protein: 25, carbs: 5, fat: 2, servingSize: '1 scoop', emoji: '🥤', source: 'local' },
  { name: 'Black Coffee', calories: 2, protein: 0.3, carbs: 0, fat: 0, servingSize: '8 fl oz', emoji: '☕', source: 'local' },
  { name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, servingSize: '1 cup', emoji: '🥦', source: 'local' },
  { name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: '100g', emoji: '🐟', source: 'local' },
  { name: 'Paneer', calories: 265, protein: 18, carbs: 3.4, fat: 20, servingSize: '100g', emoji: '🧀', source: 'local' },
  { name: 'Tuna (canned)', calories: 109, protein: 25, carbs: 0, fat: 1, servingSize: '100g drained', emoji: '🐟', source: 'local' },
  { name: 'Sweet Potato', calories: 103, protein: 2.3, carbs: 24, fat: 0.1, servingSize: '1 medium', emoji: '🍠', source: 'local' },
  { name: 'Cottage Cheese', calories: 110, protein: 14, carbs: 4, fat: 5, servingSize: '1/2 cup', emoji: '🧀', source: 'local' },
  { name: 'Milk', calories: 149, protein: 8, carbs: 12, fat: 8, servingSize: '1 cup (240ml)', emoji: '🥛', source: 'local' },
  { name: 'Turkey Breast', calories: 60, protein: 12, carbs: 0, fat: 0.5, servingSize: '2 oz', emoji: '🦃', source: 'local' },
  { name: 'White Rice', calories: 242, protein: 4.4, carbs: 53, fat: 0.4, servingSize: '1 cup cooked', emoji: '🍚', source: 'local' },
  { name: 'Peanut Butter', calories: 190, protein: 8, carbs: 7, fat: 16, servingSize: '2 tbsp', emoji: '🥜', source: 'local' },
];

export async function parseNaturalLanguageLog(text) {
  // 1. Try backend route
  const backendResult = await callBackend('/log', { text });
  if (backendResult?.foods?.length) return backendResult.foods;

  // 2. Try direct OpenAI (dev fallback)
  if (VITE_KEY) {
    const prompt = `Parse "${text}" into food items for a fitness tracker.
Return JSON array: [{"name":"...","calories":0,"protein":0,"carbs":0,"fat":0,"servingSize":"...","quantity":1,"emoji":"..."}]
Use realistic USDA macro values. Return ONLY the JSON array.`;
    const content = await callOpenAIDirect([{ role: 'user', content: prompt }]);
    if (content) {
      try { return JSON.parse(content.trim()); } catch {}
    }
  }

  // 3. Local heuristic fallback
  return localNLParse(text);
}

function localNLParse(text) {
  const lower = text.toLowerCase();
  const matches = [];
  for (const food of NL_FALLBACK_FOODS) {
    const name = food.name.toLowerCase();
    if (lower.includes(name.split(' ')[0]) || lower.includes(name)) {
      const numMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:cups?|servings?|scoops?|pieces?|g|oz|shots?)?/);
      const qty = numMatch ? parseFloat(numMatch[1]) : 1;
      matches.push({ ...food, quantity: qty > 10 ? 1 : qty, id: `local-${food.name.replace(/\s+/g, '-').toLowerCase()}` });
    }
  }
  return matches.length ? matches.slice(0, 4) : [{ ...NL_FALLBACK_FOODS[0], quantity: 1, id: 'local-chicken' }];
}

// ── AI recipe builder ─────────────────────────────────────────────────────────

export async function buildRecipeFromInputs(params) {
  // 1. Try backend route (secure — OpenAI key stays server-side)
  const backendResult = await callBackend('/recipe', params);
  if (backendResult?.recipe) return backendResult.recipe;

  // 2. Try direct OpenAI (dev fallback if VITE key is set)
  if (VITE_KEY) {
    const { mood, ingredients, cuisine, mealType, timeAvailable, remainingCals, remainingProtein, remainingCarbs, remainingFat, dietaryPreference, spiceLevel, vibe } = params;
    const prompt = `You are a personal nutrition coach on a fitness cut.
Macros remaining: ${remainingCals}kcal, ${remainingProtein}g protein, ${remainingCarbs}g carbs, ${remainingFat}g fat.
Mood: ${mood || 'normal'} | Vibe: ${vibe || ''} | Cuisine: ${cuisine || 'any'} | Meal: ${mealType || 'any'}
Time: ${timeAvailable || 30}min | Diet: ${dietaryPreference || 'none'} | Spice: ${spiceLevel || 'medium'}
Ingredients: ${ingredients || 'common pantry staples'}

Return ONLY this JSON:
{"name":"...","emoji":"...","calories":0,"protein":0,"carbs":0,"fat":0,"prepTime":0,"vibeDescription":"...","ingredients":[],"steps":[],"whyItFits":"...","extraIngredients":[],"confidenceScore":80}`;
    const content = await callOpenAIDirect([{ role: 'user', content: prompt }], 1000);
    if (content) {
      try { return JSON.parse(content.trim().replace(/^```json?\n?/, '').replace(/```$/, '')); } catch {}
    }
  }

  // 3. Local fallback
  return getLocalRecipeFallback(params);
}

function getLocalRecipeFallback({ remainingProtein, mealType, mood, vibe, cuisine }) {
  const FALLBACKS = [
    {
      name: 'Quick Protein Bowl',
      emoji: '🍗',
      calories: 450, protein: 42, carbs: 35, fat: 12, prepTime: 15,
      vibeDescription: 'Clean, fuelling, gets the job done.',
      ingredients: ['Chicken breast 180g', 'Cooked rice 150g', 'Mixed vegetables', 'Soy sauce, sesame oil'],
      steps: ['Cook chicken in a pan with spices 12 min.', 'Warm rice.', 'Combine in a bowl with sauce.'],
      whyItFits: 'High protein, balanced macros — exactly what you need to hit today\'s targets.',
      extraIngredients: [], confidenceScore: 75,
    },
    {
      name: 'Paneer Scramble Wrap',
      emoji: '🌯',
      calories: 380, protein: 28, carbs: 30, fat: 16, prepTime: 12,
      vibeDescription: 'Warm, spiced, satisfying without being heavy.',
      ingredients: ['Paneer 150g crumbled', 'Whole wheat roti', 'Onion, tomato, spices', 'Greek yogurt'],
      steps: ['Sauté onion and tomato. Add crumbled paneer and spices.', 'Wrap in roti with yogurt.'],
      whyItFits: 'Great vegetarian protein when you need a flavourful, satisfying meal.',
      extraIngredients: [], confidenceScore: 72,
    },
    {
      name: 'Greek Protein Power Bowl',
      emoji: '🥗',
      calories: 420, protein: 38, carbs: 28, fat: 15, prepTime: 10,
      vibeDescription: 'Light, Mediterranean, no-cook simplicity.',
      ingredients: ['Greek yogurt 200g', 'Cucumber, tomato, olives', 'Feta cheese 30g', 'Chickpeas 100g', 'Olive oil, lemon'],
      steps: ['Combine all salad ingredients.', 'Top with yogurt and feta.', 'Dress with olive oil and lemon.'],
      whyItFits: 'Mediterranean eating — high protein, anti-inflammatory, fills you up without heaviness.',
      extraIngredients: [], confidenceScore: 70,
    },
    {
      name: 'Egg & Avocado Toast',
      emoji: '🥑',
      calories: 320, protein: 18, carbs: 28, fat: 16, prepTime: 8,
      vibeDescription: 'Cosy, satisfying, ready in under 10 minutes.',
      ingredients: ['2 eggs', '2 slices whole wheat bread', '1/2 avocado', 'Salt, pepper, red pepper flakes'],
      steps: ['Toast the bread.', 'Scramble or fry eggs.', 'Mash avocado on toast and top with eggs.'],
      whyItFits: 'Quick complete protein with healthy fats — perfect for breakfast or a light meal.',
      extraIngredients: [], confidenceScore: 78,
    },
  ];

  if (cuisine === 'Indian' || (ingredients || '').toLowerCase().includes('paneer')) return FALLBACKS[1];
  if ((mood || '').includes('Light') || (vibe || '').includes('light')) return FALLBACKS[2];
  if (remainingProtein > 35) return FALLBACKS[0];
  if (mealType === 'Breakfast') return FALLBACKS[3];
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

// ── Food recommendations ──────────────────────────────────────────────────────

export async function getFoodRecommendations({ remainingCalories, remainingProtein }) {
  const local = [
    { name: 'Chicken Breast', reason: `+31g protein, ~${Math.min(165, remainingCalories)} cal left`, emoji: '🍗', calories: 165, protein: 31 },
    { name: 'Greek Yogurt', reason: 'Quick 17g protein hit, gut health', emoji: '🥛', calories: 100, protein: 17 },
    { name: 'Eggs', reason: 'Complete protein, fastest prep', emoji: '🥚', calories: 78, protein: 6 },
    { name: 'Tuna', reason: 'Highest protein density, no cooking', emoji: '🐟', calories: 109, protein: 25 },
    { name: 'Cottage Cheese', reason: 'Slow-release protein, great before bed', emoji: '🧀', calories: 110, protein: 14 },
    { name: 'Black Coffee', reason: 'Zero calories, boost before training', emoji: '☕', calories: 2, protein: 0 },
  ];
  if (remainingProtein < 15) return local.filter(f => f.calories <= remainingCalories).slice(0, 3);
  return local.filter(f => f.calories <= Math.min(remainingCalories, 400)).slice(0, 4);
}
