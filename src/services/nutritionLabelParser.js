/**
 * Nutrition label parser service.
 * Sends an image (base64 or URL) to the backend AI endpoint,
 * extracts nutritional data, and provides a fallback to manual entry.
 */

// ── Types ────────────────────────────────────────────────────────────────────
// NutritionResult: {
//   foundLabel: boolean,
//   productName: string,
//   servingSize: string,
//   servingsPerContainer: number,
//   calories: number, protein: number, carbs: number, fat: number,
//   saturatedFat: number, sodium: number, sugar: number, fiber: number,
//   ingredients: string,
//   confidence: number,       // 0-100
//   manualFallback?: boolean, // true when AI failed and user must fill manually
//   failureReason?: string,
// }

// Empty template for manual entry
export function emptyNutritionResult(partial = {}) {
  return {
    foundLabel:           false,
    productName:          '',
    servingSize:          '1 serving',
    servingsPerContainer: 1,
    calories:             0,
    protein:              0,
    carbs:                0,
    fat:                  0,
    saturatedFat:         0,
    sodium:               0,
    sugar:                0,
    fiber:                0,
    ingredients:          '',
    confidence:           0,
    manualFallback:       true,
    ...partial,
  };
}

// ── Image helpers ────────────────────────────────────────────────────────────

/**
 * Convert a File object to a base64 string (strips the data URI prefix).
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip "data:image/jpeg;base64," prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate that the file is an image and under 10MB.
 */
export function validateImageFile(file) {
  if (!file) return { valid: false, reason: 'No file selected.' };
  if (!file.type.startsWith('image/')) return { valid: false, reason: 'File must be an image.' };
  if (file.size > 10 * 1024 * 1024) return { valid: false, reason: 'Image must be under 10 MB.' };
  return { valid: true };
}

// ── Parse via backend AI ─────────────────────────────────────────────────────

/**
 * Parse a nutrition label from an image file or base64 string.
 * Returns a NutritionResult (always — never throws).
 */
export async function parseNutritionLabel({ file, base64, imageUrl, notes = '' } = {}) {
  try {
    let b64 = base64;
    if (file && !b64) {
      b64 = await fileToBase64(file);
    }

    if (!b64 && !imageUrl) {
      return emptyNutritionResult({
        failureReason: 'No image provided. Fill in the values manually.',
        manualFallback: true,
      });
    }

    const res = await fetch('/api/ai/parse-nutrition-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: b64 || undefined,
        imageUrl:    imageUrl || undefined,
        notes,
      }),
    });

    if (!res.ok) {
      throw new Error(`API ${res.status}`);
    }

    const data = await res.json();
    const result = data.result;

    if (!result) throw new Error('No result from API');

    if (result.foundLabel === false) {
      return emptyNutritionResult({
        failureReason: result.failureReason || 'Could not extract label. Please fill in manually.',
        manualFallback: true,
        confidence: result.confidence || 0,
      });
    }

    // Normalize numbers
    return {
      foundLabel:           true,
      productName:          result.productName || '',
      servingSize:          result.servingSize || '1 serving',
      servingsPerContainer: Number(result.servingsPerContainer) || 1,
      calories:             Math.round(Number(result.calories) || 0),
      protein:              Math.round((Number(result.protein)  || 0) * 10) / 10,
      carbs:                Math.round((Number(result.carbs)    || 0) * 10) / 10,
      fat:                  Math.round((Number(result.fat)      || 0) * 10) / 10,
      saturatedFat:         Math.round((Number(result.saturatedFat) || 0) * 10) / 10,
      sodium:               Math.round(Number(result.sodium)   || 0),
      sugar:                Math.round((Number(result.sugar)   || 0) * 10) / 10,
      fiber:                Math.round((Number(result.fiber)   || 0) * 10) / 10,
      ingredients:          result.ingredients || '',
      confidence:           Number(result.confidence) || 50,
      manualFallback:       false,
    };
  } catch (err) {
    return emptyNutritionResult({
      failureReason: `Parsing unavailable: ${err.message}. Fill in values manually.`,
      manualFallback: true,
    });
  }
}

// ── Barcode lookup via backend ────────────────────────────────────────────────

/**
 * Look up a product by barcode (EAN-13, UPC-A, etc.).
 * Returns { found: boolean, product?: object }.
 */
export async function getProductByBarcode(barcode) {
  const clean = String(barcode).replace(/\D/g, '');
  if (clean.length < 6) {
    return { found: false, error: 'Barcode must be at least 6 digits.' };
  }
  try {
    const res = await fetch(`/api/barcode/${clean}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } catch (err) {
    // Fallback: try Open Food Facts directly from client (CORS allows it)
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${clean}.json`);
      const data = await r.json();
      if (data.status !== 1) return { found: false };
      const p = data.product;
      const n = p.nutriments || {};
      return {
        found: true,
        product: {
          name:        p.product_name || 'Unknown product',
          brand:       p.brands || '',
          servingSize: p.serving_size || '100g',
          calories:    Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0),
          protein:     Math.round((n.proteins_serving    || n.proteins_100g    || 0) * 10) / 10,
          carbs:       Math.round((n.carbohydrates_serving || n.carbohydrates_100g || 0) * 10) / 10,
          fat:         Math.round((n.fat_serving         || n.fat_100g         || 0) * 10) / 10,
          sodium:      Math.round((n.sodium_serving      || n.sodium_100g      || 0) * 1000),
          sugar:       Math.round((n.sugars_serving      || n.sugars_100g      || 0) * 10) / 10,
          barcode:     clean,
          imageUrl:    p.image_url || '',
        },
      };
    } catch {
      return { found: false, error: err.message };
    }
  }
}

// ── Convert NutritionResult → food entry shape ────────────────────────────────

export function nutritionResultToFood(result, { name, emoji = '🏷️', notes: foodNotes = '' } = {}) {
  return {
    id:          `label-${Date.now()}`,
    name:        name || result.productName || 'Custom food',
    emoji,
    servingSize: result.servingSize || '1 serving',
    calories:    result.calories,
    protein:     result.protein,
    carbs:       result.carbs,
    fat:         result.fat,
    sodium:      result.sodium,
    sugar:       result.sugar,
    fiber:       result.fiber,
    notes:       foodNotes,
    source:      'custom',
    barcode:     result.barcode || '',
    ingredients: result.ingredients || '',
    confidence:  result.confidence || 0,
  };
}
