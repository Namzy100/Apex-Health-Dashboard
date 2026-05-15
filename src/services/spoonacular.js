/**
 * Spoonacular API service — recipes and ingredient search.
 * Free tier: 150 requests/day at spoonacular.com/food-api
 * Requires: VITE_SPOONACULAR_API_KEY in .env.local
 */

const BASE = 'https://api.spoonacular.com';
const API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY || null;

function hasKey() { return !!API_KEY; }

/**
 * Search recipes by query + optional filters.
 * Returns normalized recipe objects.
 */
export async function searchSpoonacularRecipes(query, options = {}) {
  if (!API_KEY) {
    if (import.meta.env.DEV) console.warn('[Spoonacular] No API key — set VITE_SPOONACULAR_API_KEY');
    return [];
  }
  const { number = 5, diet = '', intolerances = '', maxCalories, minProtein } = options;
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      query,
      number,
      addRecipeNutrition: true,
      ...(diet && { diet }),
      ...(intolerances && { intolerances }),
      ...(maxCalories && { maxCalories }),
      ...(minProtein && { minProtein }),
    });
    const res = await fetch(`${BASE}/recipes/complexSearch?${params}`);
    if (!res.ok) throw new Error(`Spoonacular ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(normalizeSpoonacularRecipe);
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Spoonacular] Recipe search failed:', err.message);
    return [];
  }
}

/**
 * Search Spoonacular's food/grocery product database.
 */
export async function searchSpoonacularFoods(query, number = 8) {
  if (!API_KEY) return [];
  try {
    const params = new URLSearchParams({ apiKey: API_KEY, query, number });
    const res = await fetch(`${BASE}/food/products/search?${params}`);
    if (!res.ok) throw new Error(`Spoonacular ${res.status}`);
    const data = await res.json();
    return (data.products || []).map(p => ({
      id: `spoon-${p.id}`,
      name: p.title,
      brand: null,
      servingSize: '1 serving',
      calories: p.calories || 0,
      protein: p.protein ? parseFloat(p.protein) : 0,
      carbs: p.carbs ? parseFloat(p.carbs) : 0,
      fat: p.fat ? parseFloat(p.fat) : 0,
      imageUrl: p.image ? `https://spoonacular.com/productImages/${p.image}` : null,
      emoji: '🍽️',
      source: 'spoonacular',
    }));
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Spoonacular] Food search failed:', err.message);
    return [];
  }
}

/**
 * Generate a recipe using Spoonacular's recipe generation endpoint.
 * Falls back gracefully if unavailable.
 */
export async function generateRecipeFromIngredients(ingredients, options = {}) {
  if (!API_KEY) return null;
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      ingredients: Array.isArray(ingredients) ? ingredients.join(',') : ingredients,
      number: 3,
      ranking: 1,
      ignorePantry: false,
      ...(options.diet && { diet: options.diet }),
    });
    const res = await fetch(`${BASE}/recipes/findByIngredients?${params}`);
    if (!res.ok) throw new Error(`Spoonacular ${res.status}`);
    const data = await res.json();
    return data[0] ? normalizeSpoonacularRecipe(data[0]) : null;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Spoonacular] Generate failed:', err.message);
    return null;
  }
}

function normalizeSpoonacularRecipe(raw) {
  const nutrition = raw.nutrition?.nutrients || [];
  const get = (name) => nutrition.find(n => n.name === name)?.amount || 0;
  return {
    id: `spoon-recipe-${raw.id}`,
    name: raw.title || 'Recipe',
    emoji: '🍽️',
    imageUrl: raw.image || null,
    calories: Math.round(get('Calories') || raw.calories || 0),
    protein: Math.round(get('Protein') * 10) / 10,
    carbs: Math.round(get('Carbohydrates') * 10) / 10,
    fat: Math.round(get('Fat') * 10) / 10,
    prepTime: raw.readyInMinutes || 30,
    servings: raw.servings || 1,
    ingredients: (raw.extendedIngredients || raw.missedIngredients || []).map(i => i.original || i.name),
    steps: raw.analyzedInstructions?.[0]?.steps?.map(s => s.step) || [],
    usedIngredients: (raw.usedIngredients || []).map(i => i.name),
    missedIngredients: (raw.missedIngredients || []).map(i => i.name),
    source: 'spoonacular',
    sourceUrl: raw.sourceUrl || null,
  };
}

export { hasKey as spoonacularAvailable };
