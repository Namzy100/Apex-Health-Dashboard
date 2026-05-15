/**
 * USDA FoodData Central service layer
 * API docs: https://fdc.nal.usda.gov/api-guide.html
 * Supports: Foundation Foods, FNDDS, Standard Reference Legacy, Branded Foods
 *
 * To activate: set VITE_USDA_API_KEY in .env
 * Get a free key at: https://fdc.nal.usda.gov/api-key-signup.html
 */

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const API_KEY = import.meta.env.VITE_USDA_API_KEY || null;

/**
 * Normalize a raw FDC food object into our app's food format.
 */
export function normalizeFdcFood(raw) {
  const nutrients = raw.foodNutrients || [];
  const get = (id) => {
    const n = nutrients.find(n => n.nutrientId === id || n.nutrient?.id === id);
    return n ? (n.value ?? n.amount ?? 0) : 0;
  };

  return {
    id: `fdc-${raw.fdcId}`,
    fdcId: raw.fdcId,
    name: raw.description || raw.lowercaseDescription || 'Unknown',
    brand: raw.brandOwner || raw.brandName || null,
    servingSize: raw.servingSize ? `${raw.servingSize}${raw.servingSizeUnit || 'g'}` : '100g',
    servingUnit: raw.servingSizeUnit || 'g',
    servingGrams: raw.servingSize || 100,
    calories: Math.round(get(1008) || get(2047)),    // Energy
    protein: Math.round(get(1003) * 10) / 10,        // Protein
    carbs: Math.round(get(1005) * 10) / 10,           // Carbohydrate
    fat: Math.round(get(1004) * 10) / 10,             // Total Fat
    fiber: Math.round(get(1079) * 10) / 10,           // Fiber
    sugar: Math.round(get(2000) * 10) / 10,           // Sugars
    sodium: Math.round(get(1093)),                    // Sodium (mg)
    emoji: '🥗',
    source: 'usda',
    category: raw.foodCategory?.description?.toLowerCase() || 'food',
  };
}

/**
 * Search USDA FoodData Central.
 * Falls back gracefully if API key is not set.
 */
export async function searchFoodDataCentral(query, pageSize = 10) {
  if (!API_KEY) {
    console.warn('[FDC] No API key set — USDA search disabled. Set VITE_USDA_API_KEY in .env');
    return [];
  }
  try {
    const res = await fetch(`${BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${API_KEY}`);
    if (!res.ok) throw new Error(`FDC error ${res.status}`);
    const data = await res.json();
    return (data.foods || []).map(normalizeFdcFood);
  } catch (err) {
    console.error('[FDC] Search failed:', err);
    return [];
  }
}

/**
 * Get full food detail by FDC ID.
 */
export async function getFoodDetailFDC(fdcId) {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE_URL}/food/${fdcId}?api_key=${API_KEY}`);
    if (!res.ok) throw new Error(`FDC error ${res.status}`);
    const data = await res.json();
    return normalizeFdcFood(data);
  } catch (err) {
    console.error('[FDC] Get detail failed:', err);
    return null;
  }
}
