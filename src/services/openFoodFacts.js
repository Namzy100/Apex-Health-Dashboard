/**
 * Open Food Facts service layer
 * API docs: https://world.openfoodfacts.org/api/v2
 * Fully open, no API key required.
 * Great for packaged/branded foods and barcode lookups.
 */

const BASE_URL = 'https://world.openfoodfacts.org';

/**
 * Normalize an Open Food Facts product into our app's food format.
 */
export function normalizeOFFProduct(raw) {
  const n = raw.nutriments || {};
  return {
    id: `off-${raw._id || raw.code}`,
    offId: raw._id || raw.code,
    barcode: raw.code,
    name: raw.product_name_en || raw.product_name || 'Unknown Product',
    brand: raw.brands || null,
    servingSize: raw.serving_size || '100g',
    servingUnit: 'serving',
    servingGrams: parseFloat(raw.serving_quantity) || 100,
    calories: Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0),
    protein: Math.round((n['proteins_serving'] || n['proteins_100g'] || 0) * 10) / 10,
    carbs: Math.round((n['carbohydrates_serving'] || n['carbohydrates_100g'] || 0) * 10) / 10,
    fat: Math.round((n['fat_serving'] || n['fat_100g'] || 0) * 10) / 10,
    fiber: Math.round((n['fiber_serving'] || n['fiber_100g'] || 0) * 10) / 10,
    sugar: Math.round((n['sugars_serving'] || n['sugars_100g'] || 0) * 10) / 10,
    sodium: Math.round((n['sodium_serving'] || n['sodium_100g'] || 0) * 1000), // g → mg
    imageUrl: raw.image_front_small_url || null,
    emoji: '📦',
    source: 'openfoodfacts',
    category: (raw.categories_tags?.[0] || '').replace('en:', ''),
  };
}

/**
 * Search Open Food Facts by query string.
 * Uses the v2 search API.
 */
export async function searchOpenFoodFacts(query, pageSize = 10) {
  try {
    const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=_id,code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments,image_front_small_url,categories_tags`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OFF error ${res.status}`);
    const data = await res.json();
    return (data.products || []).filter(p => p.product_name || p.product_name_en).map(normalizeOFFProduct);
  } catch (err) {
    console.error('[OFF] Search failed:', err);
    return [];
  }
}

/**
 * Look up a food by barcode.
 * Returns null if not found.
 */
export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`${BASE_URL}/api/v2/product/${barcode}.json?fields=_id,code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments,image_front_small_url`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1) return null;
    return normalizeOFFProduct(data.product);
  } catch (err) {
    console.error('[OFF] Barcode lookup failed:', err);
    return null;
  }
}
