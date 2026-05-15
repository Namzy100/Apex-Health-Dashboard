import { motion, AnimatePresence } from 'framer-motion';
import { saveWeeklyReview } from '../store/apexStore';

// ── Local helper: generate weekly review from store ───────────────────────────

function generateWeeklyReview(store) {
  // Determine Mon–Sun of last week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun…6=Sat
  // Last Monday
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) + 6));
  // Last Sunday
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const toStr = (d) => d.toISOString().slice(0, 10);
  const weekStart = toStr(lastMonday);
  const weekEnd   = toStr(lastSunday);

  // Build array of date strings for the week
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + i);
    weekDates.push(toStr(d));
  }

  // ── Habits ────────────────────────────────────────────────────────────────
  const activeHabits = (store.habits || []).filter(h => h.active);
  const habitLogs    = store.habitLogs || {};
  const habitsTotal  = activeHabits.length * 7;
  let habitsCompleted = 0;

  // Per-habit completion counts for best/weakest
  const habitCompletion = {}; // habitId -> daysCompleted
  activeHabits.forEach(h => { habitCompletion[h.id] = 0; });

  weekDates.forEach(date => {
    const log = habitLogs[date] || {};
    activeHabits.forEach(h => {
      if (log[h.id]) {
        habitsCompleted++;
        habitCompletion[h.id] = (habitCompletion[h.id] || 0) + 1;
      }
    });
  });

  const habitsPct = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;

  // Best and weakest habit
  let bestHabit     = null;
  let weakestHabit  = null;

  if (activeHabits.length > 0) {
    const sorted = [...activeHabits].sort(
      (a, b) => (habitCompletion[b.id] || 0) - (habitCompletion[a.id] || 0),
    );
    bestHabit    = sorted[0]?.name ?? null;
    weakestHabit = sorted[sorted.length - 1]?.name ?? null;
    // If all equal, differentiate name only if they differ
    if (bestHabit === weakestHabit && sorted.length > 1) {
      weakestHabit = sorted[sorted.length - 1]?.name ?? null;
    }
  }

  // ── Workouts ──────────────────────────────────────────────────────────────
  const workouts      = store.workouts || [];
  const workoutsCount = workouts.filter(w => w.date && weekDates.includes(w.date)).length;

  // ── Food logs ─────────────────────────────────────────────────────────────
  const foodLogs = store.foodLogs || {};
  let totalCalories = 0;
  let totalProtein  = 0;
  let foodDays      = 0;

  weekDates.forEach(date => {
    const log = foodLogs[date];
    if (!log) return;
    const entries = Object.values(log).flat();
    const dayCals   = entries.reduce((s, e) => s + (e.calories || 0), 0);
    const dayProt   = entries.reduce((s, e) => s + (e.protein  || 0), 0);
    if (dayCals > 0 || dayProt > 0) {
      totalCalories += dayCals;
      totalProtein  += dayProt;
      foodDays++;
    }
  });

  const avgCalories = foodDays > 0 ? Math.round(totalCalories / foodDays) : 0;
  const avgProtein  = foodDays > 0 ? Math.round(totalProtein  / foodDays) : 0;

  // ── Journal ───────────────────────────────────────────────────────────────
  const journalEntries = store.journalEntries || {};
  const MOOD_MAP = {
    great: { label: 'Great', emoji: '😄' },
    good:  { label: 'Good',  emoji: '🙂' },
    okay:  { label: 'Okay',  emoji: '😐' },
    bad:   { label: 'Bad',   emoji: '😞' },
    terrible: { label: 'Rough', emoji: '😣' },
  };

  let journalDays   = 0;
  const moodCounts  = {};

  weekDates.forEach(date => {
    const entry = journalEntries[date];
    if (!entry) return;
    journalDays++;
    if (entry.mood) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }
  });

  let dominantMoodKey = null;
  let dominantMoodCount = 0;
  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > dominantMoodCount) { dominantMoodCount = count; dominantMoodKey = mood; }
  });
  const dominantMood = dominantMoodKey
    ? `${MOOD_MAP[dominantMoodKey]?.emoji ?? ''} ${MOOD_MAP[dominantMoodKey]?.label ?? dominantMoodKey}`
    : '— None';

  // ── Goals ─────────────────────────────────────────────────────────────────
  const goals         = (store.goals || []).filter(g => !g.done);
  const goalsProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length)
    : 0;

  // ── Momentum ──────────────────────────────────────────────────────────────
  const momentumLog = store.momentumLog || {};
  const momentumValues = weekDates
    .map(date => momentumLog[date]?.score)
    .filter(s => s != null);
  const momentumAvg = momentumValues.length > 0
    ? Math.round(momentumValues.reduce((s, v) => s + v, 0) / momentumValues.length)
    : 0;

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = [];
  if (habitsPct < 60) recommendations.push('Rebuild habit consistency — aim for 70%+ next week.');
  if (habitsPct >= 80) recommendations.push('Elite habit compliance. Protect that streak ruthlessly.');
  if (workoutsCount < 3) recommendations.push('Get 3+ training sessions in next week — block calendar time now.');
  if (workoutsCount >= 4) recommendations.push('Strong training week. Prioritise sleep for recovery.');
  if (avgProtein < (store.settings?.dailyProteinTarget || 180) * 0.85) {
    recommendations.push('Protein is lagging — add a shake or a chicken source at every meal.');
  }
  if (journalDays < 4) recommendations.push('Journal at least 5 days this week — even one sentence counts.');
  if (momentumAvg < 55) recommendations.push('Momentum is low. Reset with one perfect 24-hour block.');
  // Ensure exactly 3
  const defaultRecs = [
    'Stay consistent — small wins stack into big results.',
    'Focus on the controllables: sleep, nutrition, movement.',
    'Review your goals and make one concrete action toward each.',
  ];
  while (recommendations.length < 3) {
    const rec = defaultRecs[recommendations.length];
    if (rec) recommendations.push(rec);
    else break;
  }

  return {
    weekStart,
    weekEnd,
    habitsCompleted,
    habitsTotal,
    habitsPct,
    workoutsCount,
    avgCalories,
    avgProtein,
    journalDays,
    dominantMood,
    goalsProgress,
    bestHabit,
    weakestHabit,
    momentumAvg,
    recommendations: recommendations.slice(0, 3),
    generatedAt: new Date().toISOString(),
  };
}

// ── Color helper ──────────────────────────────────────────────────────────────

function ringColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#f97316';
}

// ── Circular SVG progress ring ────────────────────────────────────────────────

function CircularRing({ score }) {
  const size  = 140;
  const stroke = 10;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillOffset    = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = ringColor(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: fillOffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontSize: 40,
              fontWeight: 800,
              color,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {score}
          </motion.span>
        </div>
      </div>
      <span
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 500,
        }}
      >
        avg momentum
      </span>
    </div>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function StatCell({ icon, label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
      }}
    >
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'rgba(255,255,255,0.05)',
        marginLeft: -24,
        marginRight: -24,
      }}
    />
  );
}

// ── WeeklyReview ──────────────────────────────────────────────────────────────

export default function WeeklyReview({ onClose, store }) {
  const review = generateWeeklyReview(store);

  const {
    weekStart,
    weekEnd,
    habitsPct,
    workoutsCount,
    avgProtein,
    avgCalories,
    journalDays,
    dominantMood,
    goalsProgress,
    bestHabit,
    weakestHabit,
    momentumAvg,
    recommendations,
  } = review;

  const handleSave = () => {
    saveWeeklyReview(review);
    onClose?.();
  };

  // Format display date range
  const fmtDate = (str) => {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const weekLabel = `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Sheet */}
        <motion.div
          key="sheet"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#1a1916',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: 20,
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            // Mobile: slides up from bottom via transform already handled by framer
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
                Weekly Review
              </h2>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                Week of {weekLabel}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              ✕
            </button>
          </div>

          <Divider />

          {/* Hero momentum ring */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 8 }}>
            <CircularRing score={momentumAvg} />
          </div>

          <Divider />

          {/* Stat grid 2x3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCell icon="🏋️" label="Workouts"  value={`${workoutsCount} sessions`} />
            <StatCell icon="✅" label="Habits"    value={`${habitsPct}% done`} />
            <StatCell icon="🥩" label="Protein"   value={avgProtein > 0 ? `${avgProtein}g/day` : '—'} />
            <StatCell icon="🔥" label="Calories"  value={avgCalories > 0 ? `${avgCalories}/day` : '—'} />
            <StatCell icon="✍️" label="Journal"   value={`${journalDays} days`} />
            <StatCell icon="😊" label="Mood"      value={dominantMood} />
          </div>

          <Divider />

          {/* Best & weakest habit */}
          <div>
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Habit Highlights
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Best */}
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Best Habit
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18, color: '#10b981' }}>✓</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>
                    {bestHabit ?? '—'}
                  </span>
                </div>
              </div>
              {/* Weakest */}
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 10, color: '#f87171', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Needs Work
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16, color: '#f87171' }}>⚠</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>
                    {weakestHabit ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Divider />

          {/* Goals progress bar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Goals Progress
              </h3>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: ringColor(goalsProgress),
                }}
              >
                {goalsProgress}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 100,
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalsProgress}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${ringColor(goalsProgress)}, ${ringColor(goalsProgress)}cc)`,
                  borderRadius: 100,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5, display: 'block' }}>
              Average across active goals
            </span>
          </div>

          <Divider />

          {/* Recommendations */}
          <div>
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Recommendations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.12)',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ color: '#f59e0b', fontSize: 14, marginTop: 1, flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.45, fontWeight: 450 }}>
                    {rec}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* Footer actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '13px 20px',
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                border: 'none',
                borderRadius: 12,
                color: '#000',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              Save Review
            </motion.button>
            <button
              onClick={onClose}
              style={{
                padding: '13px 16px',
                background: 'transparent',
                border: 'none',
                borderRadius: 12,
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
