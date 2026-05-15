/**
 * Nutritionix service layer
 * API docs: https://trackapi.nutritionix.com/docs
 * Best source for: restaurant chains, branded foods, natural language parsing.
 *
 * To activate: set VITE_NUTRITIONIX_APP_ID and VITE_NUTRITIONIX_API_KEY in .env
 * Get keys at: https://developer.nutritionix.com/signup
 */

const BASE_URL = 'https://trackapi.nutritionix.com/v2';
const APP_ID = import.meta.env.VITE_NUTRITIONIX_APP_ID || null;
const API_KEY = import.meta.env.VITE_NUTRITIONIX_API_KEY || null;

const headers = () => ({
  'Content-Type': 'application/json',
  'x-app-id': APP_ID,
  'x-app-key': API_KEY,
});

const isConfigured = () => APP_ID && API_KEY;

/**
 * Normalize a Nutritionix food item into our app's food format.
 */
export function normalizeNutritionixFood(raw) {
  return {
    id: `nix-${raw.nix_item_id || raw.food_name}`,
    nixId: raw.nix_item_id || null,
    name: raw.food_name || raw.item_name || 'Unknown',
    brand: raw.brand_name || raw.restaurant_chain_id || null,
    restaurant: raw.brand_name || null,
    servingSize: `${raw.serving_qty} ${raw.serving_unit}`,
    servingUnit: raw.serving_unit,
    servingGrams: raw.serving_weight_grams || 100,
    calories: Math.round(raw.nf_calories || 0),
    protein: Math.round((raw.nf_protein || 0) * 10) / 10,
    carbs: Math.round((raw.nf_total_carbohydrate || 0) * 10) / 10,
    fat: Math.round((raw.nf_total_fat || 0) * 10) / 10,
    fiber: Math.round((raw.nf_dietary_fiber || 0) * 10) / 10,
    sugar: Math.round((raw.nf_sugars || 0) * 10) / 10,
    sodium: Math.round(raw.nf_sodium || 0),
    imageUrl: raw.photo?.thumb || null,
    emoji: '🍽️',
    source: 'nutritionix',
    category: raw.brand_name ? 'restaurant' : 'branded',
  };
}

/**
 * Instant search — for branded/restaurant items by keyword.
 * Returns both branded and common results.
 */
export async function searchNutritionix(query) {
  if (!isConfigured()) {
    console.warn('[Nutritionix] Not configured — set VITE_NUTRITIONIX_APP_ID and VITE_NUTRITIONIX_API_KEY');
    return { branded: [], common: [] };
  }
  try {
    const res = await fetch(
      `${BASE_URL}/search/instant?query=${encodeURIComponent(query)}&branded=true&common=true&detailed=true`,
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`Nutritionix error ${res.status}`);
    const data = await res.json();
    return {
      branded: (data.branded || []).map(normalizeNutritionixFood),
      common: (data.common || []).map(normalizeNutritionixFood),
    };
  } catch (err) {
    console.error('[Nutritionix] Search failed:', err);
    return { branded: [], common: [] };
  }
}

/**
 * Natural language food parsing — "I had 2 eggs and a banana"
 */
export async function parseNaturalLanguage(text) {
  if (!isConfigured()) return [];
  try {
    const res = await fetch(`${BASE_URL}/natural/nutrients`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ query: text }),
    });
    if (!res.ok) throw new Error(`Nutritionix NLP error ${res.status}`);
    const data = await res.json();
    return (data.foods || []).map(normalizeNutritionixFood);
  } catch (err) {
    console.error('[Nutritionix] NLP parse failed:', err);
    return [];
  }
}
