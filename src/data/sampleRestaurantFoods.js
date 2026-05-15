// Sample restaurant food database — architecture ready for Nutritionix API swap

export const restaurantFoods = [
  // ── Chick-fil-A ──────────────────────────────────────────────
  { id: 'cfa-1', restaurant: 'Chick-fil-A', name: 'Grilled Chicken Nuggets (8 ct)', servingSize: '3.2 oz', servingUnit: 'serving', calories: 140, protein: 25, carbs: 2, fat: 3.5, sodium: 540, emoji: '🍗', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'cfa-2', restaurant: 'Chick-fil-A', name: 'Grilled Chicken Sandwich', servingSize: '6.5 oz', servingUnit: 'sandwich', calories: 310, protein: 30, carbs: 36, fat: 5, sodium: 710, emoji: '🥪', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'cfa-3', restaurant: 'Chick-fil-A', name: 'Waffle Potato Fries (Medium)', servingSize: '4.1 oz', servingUnit: 'serving', calories: 400, protein: 4, carbs: 55, fat: 18, sodium: 340, emoji: '🍟', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'cfa-4', restaurant: 'Chick-fil-A', name: 'Spicy Deluxe Chicken Sandwich', servingSize: '7.5 oz', servingUnit: 'sandwich', calories: 450, protein: 29, carbs: 49, fat: 17, sodium: 1280, emoji: '🥪', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'cfa-5', restaurant: 'Chick-fil-A', name: 'Greek Yogurt Parfait', servingSize: '5.1 oz', servingUnit: 'cup', calories: 270, protein: 9, carbs: 48, fat: 5, sodium: 105, emoji: '🥣', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'cfa-6', restaurant: 'Chick-fil-A', name: 'Cobb Salad (no dressing)', servingSize: '12.3 oz', servingUnit: 'salad', calories: 460, protein: 43, carbs: 12, fat: 27, sodium: 1230, emoji: '🥗', source: 'nutritionix', lastUpdated: '2026-01' },

  // ── Chipotle ──────────────────────────────────────────────────
  { id: 'chip-1', restaurant: 'Chipotle', name: 'Chicken Burrito Bowl (no rice, no beans)', servingSize: '14 oz', servingUnit: 'bowl', calories: 380, protein: 44, carbs: 14, fat: 17, sodium: 1340, emoji: '🥗', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'chip-2', restaurant: 'Chipotle', name: 'Steak Bowl with Brown Rice', servingSize: '18 oz', servingUnit: 'bowl', calories: 640, protein: 41, carbs: 72, fat: 20, sodium: 1480, emoji: '🍚', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'chip-3', restaurant: 'Chipotle', name: 'Chicken Soft Tacos (2)', servingSize: '9 oz', servingUnit: '2 tacos', calories: 430, protein: 30, carbs: 46, fat: 14, sodium: 960, emoji: '🌮', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'chip-4', restaurant: 'Chipotle', name: 'Sofritas Bowl (Vegan)', servingSize: '16 oz', servingUnit: 'bowl', calories: 440, protein: 22, carbs: 52, fat: 16, sodium: 1120, emoji: '🥙', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'chip-5', restaurant: 'Chipotle', name: 'Chips & Guacamole', servingSize: '7 oz', servingUnit: 'serving', calories: 570, protein: 7, carbs: 72, fat: 30, sodium: 860, emoji: '🥑', source: 'nutritionix', lastUpdated: '2026-01' },

  // ── Subway ────────────────────────────────────────────────────
  { id: 'sub-1', restaurant: 'Subway', name: '6" Oven Roasted Chicken on 9-Grain Wheat', servingSize: '6 inch', servingUnit: 'sub', calories: 280, protein: 23, carbs: 40, fat: 4.5, sodium: 580, emoji: '🥖', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'sub-2', restaurant: 'Subway', name: 'Footlong Turkey Breast on 9-Grain Wheat', servingSize: '12 inch', servingUnit: 'sub', calories: 500, protein: 36, carbs: 82, fat: 8, sodium: 1410, emoji: '🥖', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'sub-3', restaurant: 'Subway', name: 'Rotisserie Chicken Salad Bowl', servingSize: '13.5 oz', servingUnit: 'bowl', calories: 280, protein: 29, carbs: 16, fat: 11, sodium: 780, emoji: '🥗', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'sub-4', restaurant: 'Subway', name: '6" Tuna on Italian', servingSize: '6 inch', servingUnit: 'sub', calories: 480, protein: 20, carbs: 41, fat: 26, sodium: 820, emoji: '🥪', source: 'nutritionix', lastUpdated: '2026-01' },

  // ── McDonald's ────────────────────────────────────────────────
  { id: 'mcd-1', restaurant: "McDonald's", name: 'McDouble', servingSize: '5.8 oz', servingUnit: 'burger', calories: 390, protein: 23, carbs: 34, fat: 19, sodium: 850, emoji: '🍔', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'mcd-2', restaurant: "McDonald's", name: 'Grilled Chicken Sandwich', servingSize: '6.7 oz', servingUnit: 'sandwich', calories: 380, protein: 37, carbs: 42, fat: 7, sodium: 820, emoji: '🥪', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'mcd-3', restaurant: "McDonald's", name: 'Egg McMuffin', servingSize: '4.9 oz', servingUnit: 'sandwich', calories: 310, protein: 17, carbs: 30, fat: 13, sodium: 730, emoji: '🥚', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'mcd-4', restaurant: "McDonald's", name: 'Medium Fries', servingSize: '4 oz', servingUnit: 'serving', calories: 320, protein: 4, carbs: 44, fat: 15, sodium: 400, emoji: '🍟', source: 'nutritionix', lastUpdated: '2026-01' },

  // ── Starbucks ─────────────────────────────────────────────────
  { id: 'sbux-1', restaurant: 'Starbucks', name: 'Protein Box - Eggs & Cheddar', servingSize: '5.6 oz', servingUnit: 'box', calories: 460, protein: 27, carbs: 35, fat: 23, sodium: 960, emoji: '🥚', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'sbux-2', restaurant: 'Starbucks', name: 'Grande Latte (2% milk)', servingSize: '16 fl oz', servingUnit: 'drink', calories: 190, protein: 11, carbs: 19, fat: 7, sodium: 170, emoji: '☕', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'sbux-3', restaurant: 'Starbucks', name: 'Chicken & Quinoa Protein Bowl', servingSize: '8.9 oz', servingUnit: 'bowl', calories: 420, protein: 27, carbs: 47, fat: 14, sodium: 760, emoji: '🥗', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'sbux-4', restaurant: 'Starbucks', name: 'Impossible Breakfast Sandwich', servingSize: '5.4 oz', servingUnit: 'sandwich', calories: 430, protein: 25, carbs: 47, fat: 15, sodium: 720, emoji: '🥪', source: 'nutritionix', lastUpdated: '2026-01' },

  // ── Taco Bell ─────────────────────────────────────────────────
  { id: 'tb-1', restaurant: 'Taco Bell', name: 'Grilled Chicken Burrito', servingSize: '6.8 oz', servingUnit: 'burrito', calories: 440, protein: 26, carbs: 56, fat: 12, sodium: 1190, emoji: '🌯', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'tb-2', restaurant: 'Taco Bell', name: 'Power Menu Bowl - Chicken', servingSize: '12.2 oz', servingUnit: 'bowl', calories: 470, protein: 26, carbs: 48, fat: 19, sodium: 1140, emoji: '🍚', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'tb-3', restaurant: 'Taco Bell', name: 'Crunchy Taco', servingSize: '3 oz', servingUnit: 'taco', calories: 170, protein: 8, carbs: 13, fat: 9, sodium: 300, emoji: '🌮', source: 'nutritionix', lastUpdated: '2026-01' },

  // ── Panda Express ─────────────────────────────────────────────
  { id: 'panda-1', restaurant: 'Panda Express', name: 'Grilled Teriyaki Chicken', servingSize: '5.7 oz', servingUnit: 'serving', calories: 300, protein: 36, carbs: 12, fat: 13, sodium: 530, emoji: '🍗', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'panda-2', restaurant: 'Panda Express', name: 'Steamed Brown Rice', servingSize: '8.1 oz', servingUnit: 'serving', calories: 420, protein: 9, carbs: 86, fat: 5, sodium: 20, emoji: '🍚', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'panda-3', restaurant: 'Panda Express', name: 'String Bean Chicken Breast', servingSize: '5.6 oz', servingUnit: 'serving', calories: 190, protein: 14, carbs: 13, fat: 9, sodium: 770, emoji: '🫛', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'panda-4', restaurant: 'Panda Express', name: 'Orange Chicken', servingSize: '5.4 oz', servingUnit: 'serving', calories: 490, protein: 25, carbs: 51, fat: 22, sodium: 820, emoji: '🍊', source: 'nutritionix', lastUpdated: '2026-01' },
  { id: 'panda-5', restaurant: 'Panda Express', name: 'Super Greens', servingSize: '7.8 oz', servingUnit: 'serving', calories: 90, protein: 6, carbs: 11, fat: 3, sodium: 430, emoji: '🥦', source: 'nutritionix', lastUpdated: '2026-01' },
];

export const getRestaurants = () => [...new Set(restaurantFoods.map(f => f.restaurant))];
export const getByRestaurant = (name) => restaurantFoods.filter(f => f.restaurant === name);
