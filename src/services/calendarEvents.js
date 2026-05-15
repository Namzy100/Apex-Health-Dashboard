/**
 * Calendar event helpers — thin wrappers around apexStore's calendar functions.
 * All events are stored in apex.data.calendarEvents.
 *
 * Event shape:
 *   { id, title, date, type, emoji, notes?, color?, data? }
 *
 * Types: 'meal' | 'workout' | 'recipe' | 'progress' | 'plan' | 'checkin' | 'reminder'
 */

import { addCalendarEvent, deleteCalendarEvent, getCalendarEvents } from '../store/apexStore';

const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function addMealToCalendar(meal, date = todayStr()) {
  return addCalendarEvent({
    id: uid(),
    title: meal.name,
    date,
    type: 'meal',
    emoji: meal.emoji || '🍽️',
    color: '#f59e0b',
    notes: `${meal.totalCalories || meal.calories || 0} cal · ${meal.totalProtein || meal.protein || 0}g protein`,
    data: { mealId: meal.id },
  });
}

export function addWorkoutToCalendar(workout, date = todayStr()) {
  return addCalendarEvent({
    id: uid(),
    title: workout.title || workout.muscleGroup || 'Workout',
    date,
    type: 'workout',
    emoji: '🏋️',
    color: '#10b981',
    notes: workout.notes || '',
    data: { workoutId: workout.id },
  });
}

export function addRecipeToCalendar(recipe, date = todayStr()) {
  return addCalendarEvent({
    id: uid(),
    title: recipe.name,
    date,
    type: 'recipe',
    emoji: recipe.emoji || '🍽️',
    color: '#f97316',
    notes: `${recipe.calories} cal · ${recipe.protein}g protein · ${recipe.prepTime || '?'} min`,
    data: { recipeId: recipe.id },
  });
}

export function addProgressPicReminderToCalendar(date = todayStr()) {
  return addCalendarEvent({
    id: uid(),
    title: 'Progress Photo',
    date,
    type: 'progress',
    emoji: '📸',
    color: '#a78bfa',
    notes: 'Time to document the transformation.',
  });
}

export function addSummerPlanToCalendar(plan, date) {
  return addCalendarEvent({
    id: uid(),
    title: plan.title || plan.name || 'Summer Plan',
    date: date || plan.date || todayStr(),
    type: 'plan',
    emoji: plan.emoji || '☀️',
    color: '#eab308',
    notes: plan.notes || plan.description || '',
    data: { planId: plan.id },
  });
}

export function addReminderToCalendar(title, date, emoji = '🔔', notes = '') {
  return addCalendarEvent({
    id: uid(),
    title,
    date,
    type: 'reminder',
    emoji,
    color: '#38bdf8',
    notes,
  });
}

export { deleteCalendarEvent, getCalendarEvents };
