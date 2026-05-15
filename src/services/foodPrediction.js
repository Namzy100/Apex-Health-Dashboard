function getMealFrequencies(store) {
  const logs = store.foodLogs || {};
  const freq = {};

  for (const dayLog of Object.values(logs)) {
    for (const [meal, entries] of Object.entries(dayLog)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const key = (entry.name || '').toLowerCase().trim();
        if (!key) continue;
        if (!freq[key]) freq[key] = { count: 0, data: entry, meals: {} };
        freq[key].count++;
        freq[key].meals[meal] = (freq[key].meals[meal] || 0) + 1;
      }
    }
  }

  return freq;
}

export function getPredictedMeals(mealSlot, store, limit = 3) {
  const freq = getMealFrequencies(store);
  return Object.values(freq)
    .filter(v => (v.meals[mealSlot] || 0) > 0)
    .sort((a, b) => (b.meals[mealSlot] || 0) - (a.meals[mealSlot] || 0))
    .slice(0, limit)
    .map(v => v.data);
}

export function getTopFoods(store, limit = 5) {
  const freq = getMealFrequencies(store);
  return Object.values(freq)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(v => v.data);
}

export function getQuickAddSuggestions(store) {
  const hour = new Date().getHours();
  let slot;
  if (hour < 10) slot = 'breakfast';
  else if (hour < 14) slot = 'lunch';
  else if (hour < 18) slot = 'snacks';
  else slot = 'dinner';

  const predictions = getPredictedMeals(slot, store, 3);
  return { slot, predictions };
}

export function getSlotLabel(slot) {
  return { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' }[slot] || slot;
}

export function getSuggestionPrompt(slot) {
  return {
    breakfast: 'Add your usual breakfast again?',
    lunch: 'Repeat yesterday\'s lunch?',
    snacks: 'Log a quick snack?',
    dinner: 'What\'s for dinner?',
  }[slot] || 'Quick add?';
}
