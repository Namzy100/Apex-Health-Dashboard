export const ACHIEVEMENTS = [
  {
    id: 'first_log',
    name: 'First Step',
    description: 'Logged your first meal',
    emoji: '🥗',
    category: 'nutrition',
    rarity: 'common',
    check: (store) => Object.keys(store.foodLogs || {}).length > 0,
  },
  {
    id: 'first_weight',
    name: 'Weighed In',
    description: 'Logged your first weight entry',
    emoji: '⚖️',
    category: 'consistency',
    rarity: 'common',
    check: (store) => (store.weightLogs || []).length > 0,
  },
  {
    id: 'streak_3',
    name: 'Three-Day Lock',
    description: 'Weighed in 3 days in a row',
    emoji: '🔥',
    category: 'consistency',
    rarity: 'common',
    check: (store) => {
      const logs = store.weightLogs || [];
      for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (!logs.find(l => l.date === d.toISOString().slice(0, 10))) return false;
      }
      return true;
    },
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Weighed in 7 days in a row',
    emoji: '⚡',
    category: 'consistency',
    rarity: 'rare',
    check: (store) => {
      const logs = store.weightLogs || [];
      if (logs.length < 7) return false;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (!logs.find(l => l.date === d.toISOString().slice(0, 10))) return false;
      }
      return true;
    },
  },
  {
    id: 'streak_14',
    name: 'Two-Week Lock-In',
    description: '14 consecutive days tracked',
    emoji: '💎',
    category: 'consistency',
    rarity: 'epic',
    check: (store) => {
      const logs = store.weightLogs || [];
      if (logs.length < 14) return false;
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (!logs.find(l => l.date === d.toISOString().slice(0, 10))) return false;
      }
      return true;
    },
  },
  {
    id: 'lost_5lbs',
    name: 'First 5',
    description: 'Lost your first 5 lbs',
    emoji: '📉',
    category: 'progress',
    rarity: 'rare',
    check: (store) => {
      const start = store.settings?.startWeight || 0;
      const logs = store.weightLogs || [];
      if (!logs.length || !start) return false;
      return (start - logs[logs.length - 1].weight) >= 5;
    },
  },
  {
    id: 'lost_10lbs',
    name: 'Down 10',
    description: 'Lost 10 lbs from starting weight',
    emoji: '🏆',
    category: 'progress',
    rarity: 'legendary',
    check: (store) => {
      const start = store.settings?.startWeight || 0;
      const logs = store.weightLogs || [];
      if (!logs.length || !start) return false;
      return (start - logs[logs.length - 1].weight) >= 10;
    },
  },
  {
    id: 'protein_3days',
    name: 'Protein Streak',
    description: 'Hit protein goal 3 days running',
    emoji: '💪',
    category: 'nutrition',
    rarity: 'rare',
    check: (store) => {
      const target = store.settings?.dailyProteinTarget || 180;
      for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const log = store.foodLogs?.[key] || {};
        const total = [...(log.breakfast || []), ...(log.lunch || []), ...(log.dinner || []), ...(log.snacks || [])]
          .reduce((s, f) => s + (f.protein || 0) * (f.quantity || 1), 0);
        if (total < target * 0.9) return false;
      }
      return true;
    },
  },
  {
    id: 'meals_logged_20',
    name: 'Fuel Master',
    description: 'Logged 20+ food entries',
    emoji: '🍽️',
    category: 'nutrition',
    rarity: 'rare',
    check: (store) => {
      let count = 0;
      for (const day of Object.values(store.foodLogs || {})) {
        for (const meal of Object.values(day)) {
          if (Array.isArray(meal)) count += meal.length;
        }
      }
      return count >= 20;
    },
  },
  {
    id: 'workouts_5',
    name: 'Iron Discipline',
    description: 'Completed 5 workouts',
    emoji: '🏋️',
    category: 'training',
    rarity: 'rare',
    check: (store) => (store.workouts || []).length >= 5,
  },
  {
    id: 'first_progress_photo',
    name: 'Documented',
    description: 'Added your first progress photo',
    emoji: '📸',
    category: 'transformation',
    rarity: 'common',
    check: (store) => (store.progressPhotos || []).length > 0,
  },
  {
    id: 'weight_logs_14',
    name: 'Fortnight',
    description: 'Weighed in 14+ times total',
    emoji: '📅',
    category: 'consistency',
    rarity: 'epic',
    check: (store) => (store.weightLogs || []).length >= 14,
  },
];

export const RARITY_META = {
  common:    { color: '#78716c', label: 'Common',    glow: 'rgba(120,113,108,0.2)' },
  rare:      { color: '#3b82f6', label: 'Rare',      glow: 'rgba(59,130,246,0.25)' },
  epic:      { color: '#8b5cf6', label: 'Epic',      glow: 'rgba(139,92,246,0.3)'  },
  legendary: { color: '#f59e0b', label: 'Legendary', glow: 'rgba(245,158,11,0.35)' },
};

export function checkAchievements(store) {
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(store) }));
}

export function getUnlockedAchievements(store) {
  return ACHIEVEMENTS.filter(a => a.check(store));
}

export function getNextAchievement(store) {
  return ACHIEVEMENTS.find(a => !a.check(store)) || null;
}

export function getRecentMilestone(store) {
  const unlocked = getUnlockedAchievements(store);
  return unlocked[unlocked.length - 1] || null;
}
