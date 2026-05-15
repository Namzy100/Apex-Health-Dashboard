/**
 * AI service — uses VITE_OPENAI_API_KEY if set, otherwise returns smart local fallbacks.
 * For a personal offline-first app, the fallbacks are high quality enough for daily use.
 */

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || null;
const BASE = 'https://api.openai.com/v1';

async function callOpenAI(messages, model = 'gpt-4o-mini') {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 800 }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('[AI] OpenAI call failed:', err.message);
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
  { name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, servingSize: '1 cup', emoji: '🥦', source: 'local' },
  { name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: '100g', emoji: '🐟', source: 'local' },
  { name: 'Paneer', calories: 265, protein: 18, carbs: 3.4, fat: 20, servingSize: '100g', emoji: '🧀', source: 'local' },
  { name: 'Tuna (canned)', calories: 109, protein: 25, carbs: 0, fat: 1, servingSize: '100g drained', emoji: '🐟', source: 'local' },
  { name: 'Sweet Potato', calories: 103, protein: 2.3, carbs: 24, fat: 0.1, servingSize: '1 medium', emoji: '🍠', source: 'local' },
  { name: 'Cottage Cheese', calories: 110, protein: 14, carbs: 4, fat: 5, servingSize: '1/2 cup', emoji: '🧀', source: 'local' },
];

export async function parseNaturalLanguageLog(text) {
  if (!API_KEY) return localNLParse(text);

  const prompt = `The user says: "${text}"
Parse this into food items logged for a fitness tracker. Return JSON array:
[{"name":"...", "calories":0, "protein":0, "carbs":0, "fat":0, "servingSize":"...", "quantity":1, "emoji":"..."}]
Use realistic macro values. If something is unclear, make a reasonable estimate.
Return ONLY the JSON array, nothing else.`;

  const result = await callOpenAI([{ role: 'user', content: prompt }]);
  if (result) {
    try { return JSON.parse(result.trim()); } catch {}
  }
  return localNLParse(text);
}

function localNLParse(text) {
  const lower = text.toLowerCase();
  const matches = [];
  for (const food of NL_FALLBACK_FOODS) {
    const name = food.name.toLowerCase();
    if (lower.includes(name.split(' ')[0])) {
      // Extract quantity if mentioned
      const numMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:cups?|servings?|scoops?|pieces?|g|oz)?/);
      const qty = numMatch ? parseFloat(numMatch[1]) : 1;
      matches.push({ ...food, quantity: qty > 5 ? 1 : qty, id: `local-${food.name.replace(/\s+/g, '-').toLowerCase()}` });
    }
  }
  return matches.length ? matches.slice(0, 3) : [{ ...NL_FALLBACK_FOODS[0], quantity: 1, id: 'local-chicken' }];
}

// ── AI recipe builder ─────────────────────────────────────────────────────────

export async function buildRecipeFromInputs({ mood, ingredients, cuisine, mealType, timeAvailable, remainingCals, remainingProtein, remainingCarbs, remainingFat }) {
  if (API_KEY) {
    const prompt = `You are a personal nutrition coach helping someone on a fitness cut (goal: lose fat, maintain muscle).

Their macros remaining today: ${remainingCals} kcal, ${remainingProtein}g protein, ${remainingCarbs}g carbs, ${remainingFat}g fat.
Mood: ${mood || 'normal'}
Available ingredients: ${ingredients || 'common pantry staples'}
Cuisine preference: ${cuisine || 'any'}
Meal type: ${mealType || 'any'}
Time available: ${timeAvailable || '30'} minutes

Return a JSON recipe object with these exact fields:
{
  "name": "Recipe Name",
  "emoji": "🍽️",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "prepTime": 0,
  "ingredients": ["item 1", "item 2"],
  "steps": ["step 1", "step 2"],
  "whyItFits": "Short explanation of why this fits today's macros and mood",
  "extraIngredients": ["items not in pantry you need"]
}

Return ONLY valid JSON, nothing else.`;

    const result = await callOpenAI([{ role: 'user', content: prompt }]);
    if (result) {
      try { return JSON.parse(result.trim()); } catch {}
    }
  }

  return getLocalRecipeFallback({ remainingCals, remainingProtein, mealType, mood });
}

function getLocalRecipeFallback({ remainingCals, remainingProtein, mealType, mood }) {
  const FALLBACKS = [
    {
      name: 'Quick Protein Bowl',
      emoji: '🍗',
      calories: 450,
      protein: 42,
      carbs: 35,
      fat: 12,
      prepTime: 15,
      ingredients: ['Chicken breast 180g', 'Cooked rice 150g', 'Mixed vegetables', 'Soy sauce, sesame oil'],
      steps: ['Cook chicken in a pan with spices 12 min.', 'Warm rice.', 'Combine in a bowl with sauce.'],
      whyItFits: 'High protein, balanced macros — exactly what you need to hit today\'s targets.',
      extraIngredients: [],
    },
    {
      name: 'Paneer Scramble Wrap',
      emoji: '🌯',
      calories: 380,
      protein: 28,
      carbs: 30,
      fat: 16,
      prepTime: 12,
      ingredients: ['Paneer 150g crumbled', 'Whole wheat roti', 'Onion, tomato, spices', 'Greek yogurt'],
      steps: ['Sauté onion and tomato. Add crumbled paneer and spices.', 'Wrap in roti with yogurt.'],
      whyItFits: 'Great vegetarian protein source when you need a flavourful, satisfying meal.',
      extraIngredients: [],
    },
    {
      name: 'Greek Protein Power Bowl',
      emoji: '🥗',
      calories: 420,
      protein: 38,
      carbs: 28,
      fat: 15,
      prepTime: 10,
      ingredients: ['Greek yogurt 200g', 'Cucumber, tomato, olives', 'Feta cheese 30g', 'Chickpeas 100g', 'Olive oil, lemon'],
      steps: ['Combine all salad ingredients.', 'Top with a dollop of yogurt and feta.', 'Dress with olive oil and lemon.'],
      whyItFits: 'Mediterranean eating pattern — high protein, anti-inflammatory, fills you up without heaviness.',
      extraIngredients: [],
    },
  ];

  if (remainingProtein > 30) return FALLBACKS[0];
  if (mealType === 'snack') return { ...FALLBACKS[2], name: 'Greek Yogurt Protein Snack', calories: 200, protein: 22, prepTime: 2 };
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

// ── Food recommendations ──────────────────────────────────────────────────────

export async function getFoodRecommendations({ remainingCalories, remainingProtein, timeOfDay }) {
  const local = [
    { name: 'Chicken Breast', reason: `+30g protein, fits ${remainingCalories} cal budget`, emoji: '🍗', calories: 165, protein: 31 },
    { name: 'Greek Yogurt', reason: 'Quick protein hit, gut health', emoji: '🥛', calories: 100, protein: 17 },
    { name: 'Eggs', reason: 'Complete protein, fastest prep', emoji: '🥚', calories: 78, protein: 6 },
    { name: 'Tuna', reason: 'Highest protein density, no cooking needed', emoji: '🐟', calories: 109, protein: 25 },
    { name: 'Cottage Cheese', reason: 'Slow-release protein — great before bed', emoji: '🧀', calories: 110, protein: 14 },
  ];
  if (remainingProtein < 15) return local.filter(f => f.calories <= remainingCalories).slice(0, 3);
  return local.filter(f => f.calories <= Math.min(remainingCalories, 400)).slice(0, 3);
}
