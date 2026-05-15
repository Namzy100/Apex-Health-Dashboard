/**
 * Macro calculation utilities.
 * All math related to serving sizes, targets, deficits, recommendations.
 */

/**
 * Scale a food's macros by quantity (multiplier of base serving).
 */
export function calculateServingMacros(food, quantity = 1) {
  return {
    calories: Math.round(food.calories * quantity),
    protein: Math.round(food.protein * quantity * 10) / 10,
    carbs: Math.round(food.carbs * quantity * 10) / 10,
    fat: Math.round(food.fat * quantity * 10) / 10,
    sodium: food.sodium ? Math.round(food.sodium * quantity) : null,
  };
}

/**
 * Calculate remaining macros vs daily targets.
 */
export function getRemainingMacros(totals, targets) {
  return {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fat: Math.max(0, targets.fat - totals.fat),
    caloriesOver: Math.max(0, totals.calories - targets.calories),
  };
}

/**
 * Calculate macro percentages vs targets (0-1 scale, capped at 1.2).
 */
export function getMacroPcts(totals, targets) {
  return {
    calories: Math.min(totals.calories / targets.calories, 1.2),
    protein: Math.min(totals.protein / targets.protein, 1.2),
    carbs: Math.min(totals.carbs / (targets.carbs || 200), 1.2),
    fat: Math.min(totals.fat / (targets.fat || 65), 1.2),
  };
}

/**
 * Calculate caloric deficit based on TDEE and consumed calories.
 */
export function calcDeficit(tdee, consumed) {
  return tdee - consumed;
}

/**
 * Get the macro split as percentages of total calories.
 */
export function getMacroSplit(protein, carbs, fat) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((protein * 4 / total) * 100),
    carbs: Math.round((carbs * 4 / total) * 100),
    fat: Math.round((fat * 9 / total) * 100),
  };
}

/**
 * Estimate calories from macros.
 */
export function estimateCalories(protein, carbs, fat) {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

/**
 * Smart food recommendations based on remaining macros.
 */
export function getSmartRecommendations(remaining, allFoods) {
  const recs = [];

  if (remaining.protein > 20) {
    recs.push({
      reason: `You need ${remaining.protein}g more protein today`,
      priority: 'protein',
      foods: allFoods.filter(f => f.protein >= 15 && f.calories <= 350).slice(0, 3),
    });
  }

  if (remaining.calories > 300 && remaining.carbs > 30) {
    recs.push({
      reason: `${remaining.calories} kcal left — good carb window`,
      priority: 'carbs',
      foods: allFoods.filter(f => f.carbs >= 20 && f.protein >= 5).slice(0, 3),
    });
  }

  if (remaining.calories < 200 && remaining.protein > 10) {
    recs.push({
      reason: 'Low calories left — go for high-protein, low-calorie options',
      priority: 'efficient',
      foods: allFoods.filter(f => f.calories < 200 && f.protein >= 15).slice(0, 3),
    });
  }

  return recs;
}

/**
 * Calculate weekly average for a macro field.
 */
export function weeklyAverage(logs, field) {
  if (!logs.length) return 0;
  return Math.round(logs.reduce((s, d) => s + (d[field] || 0), 0) / logs.length);
}

/**
 * Format serving description.
 */
export function formatServing(food, quantity = 1) {
  if (quantity === 1) return food.servingSize;
  const sizeNum = parseFloat(food.servingSize);
  if (isNaN(sizeNum)) return `${quantity}× ${food.servingSize}`;
  const unit = food.servingSize.replace(/[\d.]+\s*/, '');
  return `${(sizeNum * quantity).toFixed(0)}${unit}`;
}
