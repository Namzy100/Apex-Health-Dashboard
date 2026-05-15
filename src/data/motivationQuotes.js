export const QUOTE_LIBRARY = {
  discipline: [
    "Discipline is the highest form of self-love.",
    "The cost of discipline is always less than the cost of regret.",
    "Your future self is built entirely by what you do today.",
    "Discipline compounds. Every rep, every meal, every day.",
    "Do it tired. Do it uncomfortable. Do it anyway.",
    "Hard choices, easy life. Easy choices, hard life.",
    "The price of excellence is paid in advance. You're paying it.",
  ],
  consistency: [
    "One good day at a time.",
    "Consistency beats intensity. Every time.",
    "Show up. That's the whole game.",
    "You don't rise to your goals — you fall to your systems.",
    "Small actions. Relentless repetition. Unrecognizable results.",
    "The days you don't feel like it are the most important days.",
    "Miss one day, you notice. Miss two, your body notices.",
  ],
  training: [
    "Every workout is a deposit into your future self.",
    "The iron never lies.",
    "Fatigue makes cowards of us all. Push through it.",
    "Progress is made in the reps you almost skip.",
    "Your body is a reflection of your standards.",
    "Train like the summer is coming. Because it is.",
  ],
  nutrition: [
    "You can't out-train a bad diet.",
    "Every meal is a choice. Make it count.",
    "Protein first. Always.",
    "What you eat in private shows in public.",
    "The deficit is the strategy. Stick to the strategy.",
    "Fuel the performance. Starve the excuses.",
  ],
  confidence: [
    "You're becoming harder to stop.",
    "The work speaks for itself.",
    "Quiet confidence is the loudest statement.",
    "Build the physique. Build the mindset. Build the life.",
    "This version of you is just the beginning.",
    "Keep stacking wins. They compound.",
  ],
  transformation: [
    "The summer is built in the winter.",
    "Every sacrifice now is freedom later.",
    "Build the body. Build the life.",
    "This summer will be different. You made sure of it.",
    "Momentum is building. Don't stop now.",
    "You're not just losing weight. You're building someone.",
  ],
  summerArc: [
    "August 31 will come. The question is who you'll be when it does.",
    "The person you want to be is 1% closer today.",
    "Your summer arc is being written right now.",
    "Lean, confident, ready. That's the mission.",
    "Every logged day is a page in the story.",
  ],
};

const ALL_QUOTES = Object.values(QUOTE_LIBRARY).flat();

export function getDailyQuote(category = null) {
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').reduce((s, n) => s + parseInt(n), 0);
  if (category && QUOTE_LIBRARY[category]) {
    const pool = QUOTE_LIBRARY[category];
    return pool[seed % pool.length];
  }
  return ALL_QUOTES[seed % ALL_QUOTES.length];
}

export function getContextualQuote(store) {
  const logs = store.weightLogs || [];
  const hour = new Date().getHours();

  // Time-based weighting
  if (hour < 9) return getDailyQuote('discipline');
  if (hour >= 21) return getDailyQuote('consistency');

  // Data-based weighting
  if (logs.length >= 14) {
    const recent7 = logs.slice(-7).reduce((s, l) => s + l.weight, 0) / 7;
    const older7 = logs.slice(-14, -7);
    if (older7.length >= 3) {
      const olderAvg = older7.reduce((s, l) => s + l.weight, 0) / older7.length;
      if (recent7 < olderAvg) return getDailyQuote('transformation');
    }
  }

  const categories = ['discipline', 'consistency', 'confidence', 'transformation'];
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').reduce((s, n) => s + parseInt(n), 0);
  return getDailyQuote(categories[seed % categories.length]);
}

export function getContextualSubline(store, streak, remaining) {
  const logs = store.weightLogs || [];
  const settings = store.settings || {};
  const lost = ((settings.startWeight || 185) - (logs[logs.length - 1]?.weight || settings.startWeight || 185)).toFixed(1);
  const hour = new Date().getHours();

  const lines = [];

  if (parseFloat(lost) > 0) lines.push(`Down ${lost} lbs since day one.`);
  if (streak >= 14) lines.push(`${streak}-day tracking streak. Exceptional.`);
  else if (streak >= 7) lines.push(`${streak} days straight. Momentum is real.`);
  else if (streak >= 3) lines.push(`${streak} days running. Keep it going.`);

  if (remaining?.protein > 80) lines.push(`${remaining.protein}g protein still to hit today.`);
  else if (remaining?.protein < 20 && remaining?.protein >= 0) lines.push('Protein target almost locked in.');

  if (hour < 10 && lines.length === 0) lines.push('Make today count.');
  if (hour >= 20 && lines.length === 0) lines.push('Finish the day strong.');

  return lines[0] || 'You\'re becoming harder to stop.';
}
