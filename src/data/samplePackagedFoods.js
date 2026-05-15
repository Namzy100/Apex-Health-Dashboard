// Sample packaged/branded food database — architecture ready for Open Food Facts & USDA FDC

export const packagedFoods = [
  // ── Proteins ──────────────────────────────────────────────────
  { id: 'pkg-1', brand: 'Generic', name: 'Chicken Breast (cooked)', servingSize: '100g', servingUnit: 'g', servingGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, emoji: '🍗', category: 'protein', barcode: null, source: 'usda' },
  { id: 'pkg-2', brand: 'Generic', name: 'Eggs (Large)', servingSize: '1 egg', servingUnit: 'egg', servingGrams: 50, calories: 72, protein: 6, carbs: 0.4, fat: 5, emoji: '🥚', category: 'protein', barcode: null, source: 'usda' },
  { id: 'pkg-3', brand: 'Generic', name: 'Ground Beef 93/7 (cooked)', servingSize: '100g', servingUnit: 'g', servingGrams: 100, calories: 218, protein: 26, carbs: 0, fat: 12, emoji: '🥩', category: 'protein', barcode: null, source: 'usda' },
  { id: 'pkg-4', brand: 'Generic', name: 'Salmon Fillet (cooked)', servingSize: '100g', servingUnit: 'g', servingGrams: 100, calories: 208, protein: 20, carbs: 0, fat: 13, emoji: '🐟', category: 'protein', barcode: null, source: 'usda' },
  { id: 'pkg-5', brand: 'Generic', name: 'Paneer', servingSize: '100g', servingUnit: 'g', servingGrams: 100, calories: 265, protein: 18, carbs: 3.4, fat: 20, emoji: '🧀', category: 'protein', barcode: null, source: 'usda' },
  { id: 'pkg-6', brand: 'Generic', name: 'Tuna (canned in water)', servingSize: '100g', servingUnit: 'g', servingGrams: 100, calories: 116, protein: 26, carbs: 0, fat: 1, emoji: '🐟', category: 'protein', barcode: '00000001', source: 'usda' },
  { id: 'pkg-7', brand: 'Optimum Nutrition', name: 'Gold Standard Whey Protein', servingSize: '1 scoop (31g)', servingUnit: 'scoop', servingGrams: 31, calories: 120, protein: 24, carbs: 3, fat: 1.5, emoji: '💪', category: 'supplement', barcode: '748927024203', source: 'openfoodfacts' },
  { id: 'pkg-8', brand: 'Quest', name: 'Quest Bar - Chocolate Chip Cookie Dough', servingSize: '1 bar (60g)', servingUnit: 'bar', servingGrams: 60, calories: 200, protein: 21, carbs: 21, fat: 9, emoji: '🍫', category: 'supplement', barcode: '888849006748', source: 'openfoodfacts' },

  // ── Dairy ─────────────────────────────────────────────────────
  { id: 'pkg-9', brand: 'Chobani', name: 'Non-Fat Greek Yogurt Plain', servingSize: '1 container (170g)', servingUnit: 'container', servingGrams: 170, calories: 90, protein: 17, carbs: 6, fat: 0, emoji: '🥣', category: 'dairy', barcode: '818290014241', source: 'openfoodfacts' },
  { id: 'pkg-10', brand: 'Chobani', name: '0% Greek Yogurt - Strawberry', servingSize: '1 container (150g)', servingUnit: 'container', servingGrams: 150, calories: 120, protein: 14, carbs: 16, fat: 0, emoji: '🍓', category: 'dairy', barcode: '818290015040', source: 'openfoodfacts' },
  { id: 'pkg-11', brand: 'Fairlife', name: 'Core Power Elite Chocolate Shake', servingSize: '1 bottle (414ml)', servingUnit: 'bottle', servingGrams: 414, calories: 230, protein: 42, carbs: 7, fat: 3.5, emoji: '🥛', category: 'supplement', barcode: '850195005002', source: 'openfoodfacts' },
  { id: 'pkg-12', brand: 'Generic', name: 'Whole Milk', servingSize: '1 cup (240ml)', servingUnit: 'cup', servingGrams: 244, calories: 149, protein: 8, carbs: 12, fat: 8, emoji: '🥛', category: 'dairy', barcode: null, source: 'usda' },
  { id: 'pkg-13', brand: 'Generic', name: '2% Milk', servingSize: '1 cup (240ml)', servingUnit: 'cup', servingGrams: 244, calories: 122, protein: 8, carbs: 11.7, fat: 4.8, emoji: '🥛', category: 'dairy', barcode: null, source: 'usda' },
  { id: 'pkg-14', brand: 'Generic', name: 'Cottage Cheese (1%)', servingSize: '1/2 cup (113g)', servingUnit: 'cup', servingGrams: 113, calories: 81, protein: 14, carbs: 3, fat: 1.2, emoji: '🧀', category: 'dairy', barcode: null, source: 'usda' },

  // ── Grains / Carbs ────────────────────────────────────────────
  { id: 'pkg-15', brand: 'Generic', name: 'White Rice (cooked)', servingSize: '1 cup (186g)', servingUnit: 'cup', servingGrams: 186, calories: 242, protein: 4.4, carbs: 53, fat: 0.4, emoji: '🍚', category: 'grain', barcode: null, source: 'usda' },
  { id: 'pkg-16', brand: 'Generic', name: 'Brown Rice (cooked)', servingSize: '1 cup (195g)', servingUnit: 'cup', servingGrams: 195, calories: 216, protein: 5, carbs: 45, fat: 1.8, emoji: '🍚', category: 'grain', barcode: null, source: 'usda' },
  { id: 'pkg-17', brand: 'Quaker', name: 'Old Fashioned Oats', servingSize: '1/2 cup dry (40g)', servingUnit: 'serving', servingGrams: 40, calories: 150, protein: 5, carbs: 27, fat: 3, emoji: '🌾', category: 'grain', barcode: '030000010105', source: 'openfoodfacts' },
  { id: 'pkg-18', brand: 'Dave\'s Killer Bread', name: '21 Whole Grains Bread', servingSize: '1 slice (45g)', servingUnit: 'slice', servingGrams: 45, calories: 120, protein: 5, carbs: 22, fat: 2, emoji: '🍞', category: 'grain', barcode: '013764005102', source: 'openfoodfacts' },
  { id: 'pkg-19', brand: 'Generic', name: 'Whole Wheat Tortilla (large)', servingSize: '1 tortilla (73g)', servingUnit: 'tortilla', servingGrams: 73, calories: 210, protein: 6, carbs: 36, fat: 5, emoji: '🫓', category: 'grain', barcode: null, source: 'usda' },

  // ── Fruits & Vegetables ───────────────────────────────────────
  { id: 'pkg-20', brand: 'Generic', name: 'Banana', servingSize: '1 medium (118g)', servingUnit: 'banana', servingGrams: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, emoji: '🍌', category: 'fruit', barcode: null, source: 'usda' },
  { id: 'pkg-21', brand: 'Generic', name: 'Apple', servingSize: '1 medium (182g)', servingUnit: 'apple', servingGrams: 182, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, emoji: '🍎', category: 'fruit', barcode: null, source: 'usda' },
  { id: 'pkg-22', brand: 'Generic', name: 'Avocado (Hass)', servingSize: '1/2 fruit (68g)', servingUnit: 'half', servingGrams: 68, calories: 114, protein: 1.5, carbs: 6, fat: 10.5, emoji: '🥑', category: 'vegetable', barcode: null, source: 'usda' },
  { id: 'pkg-23', brand: 'Generic', name: 'Broccoli (raw)', servingSize: '1 cup (91g)', servingUnit: 'cup', servingGrams: 91, calories: 31, protein: 2.6, carbs: 6, fat: 0.3, emoji: '🥦', category: 'vegetable', barcode: null, source: 'usda' },
  { id: 'pkg-24', brand: 'Generic', name: 'Spinach (raw)', servingSize: '2 cups (60g)', servingUnit: 'cup', servingGrams: 60, calories: 14, protein: 1.8, carbs: 2.2, fat: 0.2, emoji: '🥬', category: 'vegetable', barcode: null, source: 'usda' },

  // ── Fats & Spreads ────────────────────────────────────────────
  { id: 'pkg-25', brand: 'Jif', name: 'Natural Peanut Butter', servingSize: '2 tbsp (32g)', servingUnit: 'tbsp', servingGrams: 32, calories: 190, protein: 8, carbs: 7, fat: 16, emoji: '🥜', category: 'fat', barcode: '051500230435', source: 'openfoodfacts' },
  { id: 'pkg-26', brand: 'Justin\'s', name: 'Almond Butter Packet', servingSize: '1 packet (32g)', servingUnit: 'packet', servingGrams: 32, calories: 190, protein: 7, carbs: 7, fat: 17, emoji: '🥜', category: 'fat', barcode: '853926002101', source: 'openfoodfacts' },
  { id: 'pkg-27', brand: 'Generic', name: 'Olive Oil', servingSize: '1 tbsp (13.5g)', servingUnit: 'tbsp', servingGrams: 13.5, calories: 119, protein: 0, carbs: 0, fat: 13.5, emoji: '🫒', category: 'fat', barcode: null, source: 'usda' },

  // ── Snacks ────────────────────────────────────────────────────
  { id: 'pkg-28', brand: 'RXBar', name: 'Chocolate Sea Salt Protein Bar', servingSize: '1 bar (52g)', servingUnit: 'bar', servingGrams: 52, calories: 210, protein: 12, carbs: 23, fat: 9, emoji: '🍫', category: 'snack', barcode: '860042000003', source: 'openfoodfacts' },
  { id: 'pkg-29', brand: 'Generic', name: 'Mixed Nuts', servingSize: '1 oz (28g)', servingUnit: 'oz', servingGrams: 28, calories: 173, protein: 5, carbs: 7.5, fat: 15, emoji: '🥜', category: 'snack', barcode: null, source: 'usda' },
  { id: 'pkg-30', brand: 'Siggi\'s', name: 'Icelandic Skyr - Plain 0%', servingSize: '1 container (150g)', servingUnit: 'container', servingGrams: 150, calories: 90, protein: 17, carbs: 6, fat: 0, emoji: '🥛', category: 'dairy', barcode: '898468001008', source: 'openfoodfacts' },
];

export const getFoodCategories = () => [...new Set(packagedFoods.map(f => f.category))];
export const getByCategory = (cat) => packagedFoods.filter(f => f.category === cat);
