import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Dumbbell,
  Flame,
  Zap,
  Calendar,
  Waves,
  Target,
  Minus,
  Plus,
} from 'lucide-react';
import { completeOnboarding, saveHabit, saveGoal } from '../store/apexStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#111010',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)',
  primary: '#f5f4f2',
  muted: '#78716c',
  dimmer: '#57534e',
  amber: '#f59e0b',
  orange: '#f97316',
};

const FOCUS_AREAS = [
  { id: 'fitness',      label: 'Fitness',       emoji: '🏋️', desc: 'Build strength & endurance' },
  { id: 'fat_loss',     label: 'Fat Loss',       emoji: '🔥', desc: 'Cut smart, protect muscle' },
  { id: 'muscle',       label: 'Muscle Gain',    emoji: '💪', desc: 'Progressive overload & protein' },
  { id: 'habits',       label: 'Habits',         emoji: '✅', desc: 'Build non-negotiable systems' },
  { id: 'productivity', label: 'Productivity',   emoji: '⚡', desc: 'Deep work & output' },
  { id: 'wellness',     label: 'Wellness',       emoji: '🧘', desc: 'Recovery & mental clarity' },
  { id: 'travel',       label: 'Travel',         emoji: '✈️', desc: 'Stay consistent on the move' },
  { id: 'study',        label: 'Study / Work',   emoji: '📚', desc: 'Learning & career growth' },
];

const GOAL_OPTIONS = [
  'Cut to my goal weight',
  'Build visible muscle',
  'Build elite daily habits',
  'Improve mental clarity & mood',
  'Stay consistent while traveling',
  'Achieve peak productivity',
];

const ALL_HABITS = [
  { id: 'gym',        name: 'Gym',             emoji: '🏋️', categories: ['fitness', 'fat_loss', 'muscle'] },
  { id: 'steps',      name: '10k Steps',       emoji: '👟', categories: ['fitness', 'fat_loss', 'wellness'] },
  { id: 'water',      name: 'Drink 3L',        emoji: '💧', categories: ['fitness', 'wellness', 'fat_loss'] },
  { id: 'protein',    name: 'Hit Protein',     emoji: '🥩', categories: ['muscle', 'fat_loss', 'fitness'] },
  { id: 'sleep',      name: 'Sleep by 11pm',   emoji: '😴', categories: ['wellness', 'habits', 'productivity'] },
  { id: 'read',       name: 'Read 20min',      emoji: '📚', categories: ['study', 'habits', 'productivity'] },
  { id: 'meditate',   name: 'Meditate',        emoji: '🧘', categories: ['wellness', 'habits'] },
  { id: 'nojunk',     name: 'No Junk Food',    emoji: '🚫', categories: ['fat_loss', 'fitness', 'habits'] },
  { id: 'journal',    name: 'Journal',         emoji: '✍️', categories: ['wellness', 'habits', 'productivity'] },
  { id: 'coldshower', name: 'Cold Shower',     emoji: '🧊', categories: ['wellness', 'fitness', 'habits'] },
];

const SCHEDULE_STYLES = [
  { id: 'structured', label: 'Structured', desc: 'Time-blocked, every hour planned',  icon: '📅' },
  { id: 'flexible',   label: 'Flexible',   desc: 'Loose framework, adapt as needed',  icon: '🌊' },
  { id: 'minimal',    label: 'Minimal',    desc: 'Just the essentials, nothing extra', icon: '🎯' },
];

const ROUTINE_STYLES = [
  { id: 'early_bird', label: 'Early Bird', desc: '5–7am starts, morning workouts', icon: '🌅' },
  { id: 'night_owl',  label: 'Night Owl',  desc: 'Late nights, evening training',  icon: '🌙' },
  { id: 'flexible',   label: 'Flexible',   desc: 'Adapts to the day',              icon: '🔄' },
];

const UNIT_OPTIONS = [
  { id: 'imperial', label: 'Imperial', desc: 'lbs, miles' },
  { id: 'metric',   label: 'Metric',   desc: 'kg, km' },
];

function trainingLabel(days) {
  if (days <= 2) return 'Active Recovery';
  if (days <= 4) return 'Standard';
  if (days <= 6) return 'High Performance';
  return 'Elite';
}

function sixMonthsFromNow() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

// ── Animation Variants ────────────────────────────────────────────────────────

function slideVariants(direction) {
  return {
    initial:  { x: direction > 0 ? '60%' : '-60%', opacity: 0 },
    animate:  { x: 0, opacity: 1 },
    exit:     { x: direction > 0 ? '-60%' : '60%', opacity: 0 },
  };
}

const spring = { type: 'spring', stiffness: 300, damping: 30 };

// ── Reusable UI Pieces ────────────────────────────────────────────────────────

function CTAButton({ onClick, disabled, children }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      style={{
        width: '100%',
        padding: '16px 24px',
        borderRadius: '16px',
        background: disabled
          ? 'rgba(245,158,11,0.25)'
          : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        color: disabled ? 'rgba(0,0,0,0.4)' : '#000',
        fontWeight: 700,
        fontSize: '16px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.02em',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {children}
    </motion.button>
  );
}

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 20 : 6,
            background: i <= current ? COLORS.amber : COLORS.dimmer,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ height: 6, borderRadius: 3 }}
        />
      ))}
    </div>
  );
}

function ScreenWrapper({ children, style = {} }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: COLORS.bg,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function InnerContainer({ children }) {
  return (
    <div style={{ width: '100%', maxWidth: '512px', padding: '0 24px' }}>
      {children}
    </div>
  );
}

function ScreenTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: '24px',
        fontWeight: 700,
        color: COLORS.primary,
        margin: '0 0 8px 0',
        lineHeight: 1.2,
      }}
    >
      {children}
    </h2>
  );
}

function ScreenSubtitle({ children }) {
  return (
    <p style={{ fontSize: '14px', color: COLORS.muted, margin: '0 0 28px 0' }}>
      {children}
    </p>
  );
}

// ── Individual Screens ────────────────────────────────────────────────────────

function WelcomeScreen({ onNext }) {
  return (
    <ScreenWrapper
      style={{
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-5%',
          right: '-5%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ textAlign: 'center', padding: '0 32px', maxWidth: '600px', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div
            style={{
              fontSize: '11px',
              letterSpacing: '0.3em',
              color: COLORS.amber,
              fontWeight: 600,
              marginBottom: '24px',
              textTransform: 'uppercase',
            }}
          >
            Personal Operating System
          </div>

          <h1
            style={{
              fontSize: 'clamp(64px, 12vw, 96px)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              margin: '0 0 24px 0',
              lineHeight: 0.9,
              background: 'linear-gradient(135deg, #f5f4f2 0%, #78716c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            APEX
          </h1>

          <p
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: COLORS.primary,
              marginBottom: '16px',
            }}
          >
            Your Personal Operating System
          </p>

          <p
            style={{
              fontSize: '15px',
              color: COLORS.muted,
              lineHeight: 1.6,
              maxWidth: '380px',
              margin: '0 auto 48px',
            }}
          >
            Track everything. Optimize everything. Become the person you're building.
          </p>

          <div style={{ maxWidth: '320px', margin: '0 auto' }}>
            <CTAButton onClick={onNext}>
              Begin Setup
              <ChevronRight size={18} />
            </CTAButton>
          </div>
        </motion.div>
      </div>
    </ScreenWrapper>
  );
}

function FocusAreasScreen({ value = [], onChange }) {
  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div>
      <ScreenTitle>What are you optimizing for?</ScreenTitle>
      <ScreenSubtitle>Select everything that applies — you can change this later.</ScreenSubtitle>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        {FOCUS_AREAS.map((area) => {
          const selected = value.includes(area.id);
          return (
            <motion.button
              key={area.id}
              onClick={() => toggle(area.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: selected ? 'rgba(245,158,11,0.1)' : COLORS.card,
                border: `1px solid ${selected ? COLORS.amber : COLORS.border}`,
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              {selected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    color: COLORS.amber,
                  }}
                >
                  <CheckCircle2 size={16} />
                </div>
              )}
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{area.emoji}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.primary, marginBottom: '4px' }}>
                {area.label}
              </div>
              <div style={{ fontSize: '12px', color: COLORS.muted, lineHeight: 1.4 }}>{area.desc}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function GoalScreen({ value = { selected: '', custom: '' }, onChange }) {
  return (
    <div>
      <ScreenTitle>What's your #1 goal right now?</ScreenTitle>
      <ScreenSubtitle>Pick the one that matters most at this moment.</ScreenSubtitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {GOAL_OPTIONS.map((goal) => {
          const selected = value.selected === goal;
          return (
            <motion.button
              key={goal}
              onClick={() => onChange({ ...value, selected: goal })}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: selected ? 'rgba(245,158,11,0.1)' : COLORS.card,
                border: `1px solid ${selected ? COLORS.amber : COLORS.border}`,
                borderRadius: '14px',
                padding: '16px 20px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <span style={{ fontSize: '15px', color: selected ? COLORS.primary : COLORS.muted, fontWeight: selected ? 600 : 400 }}>
                {goal}
              </span>
              {selected && <CheckCircle2 size={18} color={COLORS.amber} />}
            </motion.button>
          );
        })}
      </div>

      <div style={{ marginBottom: '28px' }}>
        <textarea
          placeholder="Or describe it in your own words…"
          value={value.custom}
          onChange={(e) => onChange({ ...value, custom: e.target.value })}
          rows={3}
          style={{
            width: '100%',
            background: COLORS.card,
            border: `1px solid ${value.custom ? COLORS.amber : COLORS.border}`,
            borderRadius: '14px',
            padding: '14px 16px',
            color: COLORS.primary,
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
        />
      </div>
    </div>
  );
}

function StarterHabitsScreen({ focusAreas = [], value = [], onChange }) {
  // Sort habits: relevant first
  const sorted = [...ALL_HABITS].sort((a, b) => {
    const aRel = a.categories.some((c) => focusAreas.includes(c));
    const bRel = b.categories.some((c) => focusAreas.includes(c));
    if (aRel && !bRel) return -1;
    if (!aRel && bRel) return 1;
    return 0;
  });

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div>
      <ScreenTitle>Choose your non-negotiables</ScreenTitle>
      <ScreenSubtitle>These become your daily habits inside Apex.</ScreenSubtitle>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '28px',
        }}
      >
        {sorted.map((habit) => {
          const selected = value.includes(habit.id);
          const relevant = habit.categories.some((c) => focusAreas.includes(c));
          return (
            <motion.button
              key={habit.id}
              onClick={() => toggle(habit.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: selected ? 'rgba(245,158,11,0.1)' : COLORS.card,
                border: `1px solid ${selected ? COLORS.amber : relevant ? 'rgba(245,158,11,0.25)' : COLORS.border}`,
                borderRadius: '14px',
                padding: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              {selected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    color: COLORS.amber,
                  }}
                >
                  <CheckCircle2 size={14} />
                </div>
              )}
              <span style={{ fontSize: '20px' }}>{habit.emoji}</span>
              <span style={{ fontSize: '13px', fontWeight: selected ? 600 : 400, color: selected ? COLORS.primary : COLORS.muted }}>
                {habit.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleStyleScreen({ value, onChange }) {
  return (
    <div>
      <ScreenTitle>How do you like your days?</ScreenTitle>
      <ScreenSubtitle>This shapes how Apex organizes your time.</ScreenSubtitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {SCHEDULE_STYLES.map((style) => {
          const selected = value === style.id;
          return (
            <motion.button
              key={style.id}
              onClick={() => onChange(style.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: selected ? 'rgba(245,158,11,0.1)' : COLORS.card,
                border: `1px solid ${selected ? COLORS.amber : COLORS.border}`,
                borderRadius: '18px',
                padding: '20px 22px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <span style={{ fontSize: '28px' }}>{style.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: selected ? COLORS.primary : COLORS.muted, marginBottom: '4px' }}>
                  {style.label}
                </div>
                <div style={{ fontSize: '13px', color: COLORS.dimmer }}>{style.desc}</div>
              </div>
              {selected && <CheckCircle2 size={20} color={COLORS.amber} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function NutritionScreen({ value, onChange }) {
  const update = (key, val) => onChange({ ...value, [key]: val });

  return (
    <div>
      <ScreenTitle>Nutrition Setup</ScreenTitle>
      <ScreenSubtitle>Set your daily targets — these sync with your macro tracker.</ScreenSubtitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {/* Calories */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '12px', fontWeight: 500 }}>
            Daily Calorie Target
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.button
              onClick={() => update('calories', Math.max(1000, value.calories - 50))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary }}
            >
              <Minus size={16} />
            </motion.button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: 700, color: COLORS.amber }}>{value.calories}</span>
              <span style={{ fontSize: '14px', color: COLORS.muted, marginLeft: '6px' }}>kcal</span>
            </div>
            <motion.button
              onClick={() => update('calories', Math.min(5000, value.calories + 50))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary }}
            >
              <Plus size={16} />
            </motion.button>
          </div>
        </div>

        {/* Protein */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '12px', fontWeight: 500 }}>
            Daily Protein Target
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.button
              onClick={() => update('protein', Math.max(50, value.protein - 5))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary }}
            >
              <Minus size={16} />
            </motion.button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: 700, color: COLORS.orange }}>{value.protein}</span>
              <span style={{ fontSize: '14px', color: COLORS.muted, marginLeft: '6px' }}>g</span>
            </div>
            <motion.button
              onClick={() => update('protein', Math.min(400, value.protein + 5))}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary }}
            >
              <Plus size={16} />
            </motion.button>
          </div>
        </div>

        {/* Track Macros Toggle */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: COLORS.primary, marginBottom: '2px' }}>
              Track macros?
            </div>
            <div style={{ fontSize: '13px', color: COLORS.muted }}>Log carbs & fats alongside protein</div>
          </div>
          <motion.button
            onClick={() => update('trackMacros', !value.trackMacros)}
            whileTap={{ scale: 0.92 }}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              background: value.trackMacros
                ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                : 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.25s',
              flexShrink: 0,
            }}
          >
            <motion.div
              animate={{ x: value.trackMacros ? 26 : 2 }}
              transition={spring}
              style={{
                position: 'absolute',
                top: '3px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </motion.button>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: COLORS.dimmer, textAlign: 'center', marginBottom: '28px' }}>
        You can change these any time in Settings.
      </p>
    </div>
  );
}

function TrainingFrequencyScreen({ value, onChange }) {
  const label = trainingLabel(value);
  return (
    <div>
      <ScreenTitle>How often do you train?</ScreenTitle>
      <ScreenSubtitle>Used to plan your weekly schedule and recovery days.</ScreenSubtitle>

      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '20px',
          padding: '32px 24px',
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '64px', fontWeight: 900, color: COLORS.amber, lineHeight: 1, marginBottom: '8px' }}>
          {value}
        </div>
        <div style={{ fontSize: '16px', color: COLORS.muted, marginBottom: '4px' }}>
          {value === 1 ? 'day' : 'days'} per week
        </div>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: '99px',
            background: 'rgba(245,158,11,0.15)',
            border: `1px solid rgba(245,158,11,0.3)`,
            fontSize: '13px',
            fontWeight: 600,
            color: COLORS.amber,
            marginTop: '8px',
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '28px',
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <motion.button
            key={d}
            onClick={() => onChange(d)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              flex: 1,
              aspectRatio: '1',
              borderRadius: '12px',
              background: value === d ? 'linear-gradient(135deg, #f59e0b, #f97316)' : COLORS.card,
              border: `1px solid ${value === d ? 'transparent' : COLORS.border}`,
              color: value === d ? '#000' : COLORS.muted,
              fontWeight: value === d ? 700 : 400,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {d}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function UnitsScreen({ value, onChange }) {
  return (
    <div>
      <ScreenTitle>Your preference</ScreenTitle>
      <ScreenSubtitle>Choose how Apex displays measurements for you.</ScreenSubtitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
        {UNIT_OPTIONS.map((opt) => {
          const selected = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: selected ? 'rgba(245,158,11,0.1)' : COLORS.card,
                border: `1px solid ${selected ? COLORS.amber : COLORS.border}`,
                borderRadius: '20px',
                padding: '28px 20px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                {opt.id === 'imperial' ? '🇺🇸' : '🌍'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: selected ? COLORS.primary : COLORS.muted, marginBottom: '6px' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: '13px', color: COLORS.dimmer }}>{opt.desc}</div>
              {selected && (
                <div style={{ marginTop: '12px', color: COLORS.amber }}>
                  <CheckCircle2 size={20} style={{ margin: '0 auto' }} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function DailyRoutineScreen({ value, onChange }) {
  return (
    <div>
      <ScreenTitle>When do you come alive?</ScreenTitle>
      <ScreenSubtitle>Apex will suggest optimal times for training and focus work.</ScreenSubtitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {ROUTINE_STYLES.map((style) => {
          const selected = value === style.id;
          return (
            <motion.button
              key={style.id}
              onClick={() => onChange(style.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: selected ? 'rgba(245,158,11,0.1)' : COLORS.card,
                border: `1px solid ${selected ? COLORS.amber : COLORS.border}`,
                borderRadius: '18px',
                padding: '20px 22px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <span style={{ fontSize: '28px' }}>{style.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: selected ? COLORS.primary : COLORS.muted, marginBottom: '4px' }}>
                  {style.label}
                </div>
                <div style={{ fontSize: '13px', color: COLORS.dimmer }}>{style.desc}</div>
              </div>
              {selected && <CheckCircle2 size={20} color={COLORS.amber} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <span style={{ fontSize: '13px', color: COLORS.muted }}>{label}</span>
      <span style={{ fontSize: '13px', color: COLORS.primary, fontWeight: 500, maxWidth: '55%', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

function FinishScreen({ answers, onFinish }) {
  const goalText = answers.goalCustom || answers.goalSelected || 'Not set';
  const focusText = answers.focusAreas?.length
    ? FOCUS_AREAS.filter((f) => answers.focusAreas.includes(f.id)).map((f) => f.emoji + ' ' + f.label).join(', ')
    : '—';
  const habitsText = answers.habits?.length
    ? ALL_HABITS.filter((h) => answers.habits.includes(h.id)).map((h) => h.emoji + ' ' + h.name).join(', ')
    : '—';
  const scheduleText = SCHEDULE_STYLES.find((s) => s.id === answers.scheduleStyle)?.label || '—';
  const routineText = ROUTINE_STYLES.find((r) => r.id === answers.routineStyle)?.label || '—';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ fontSize: '48px', marginBottom: '12px' }}
        >
          ✅
        </motion.div>
        <ScreenTitle>You're all set.</ScreenTitle>
        <p style={{ fontSize: '14px', color: COLORS.muted, margin: 0 }}>
          Your personalized Apex is ready.
        </p>
      </div>

      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ fontSize: '12px', letterSpacing: '0.1em', color: COLORS.amber, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
          Your Setup
        </div>
        <SummaryRow label="Focus Areas" value={focusText} />
        <SummaryRow label="#1 Goal" value={goalText} />
        <SummaryRow label="Daily Habits" value={`${answers.habits?.length || 0} selected`} />
        <SummaryRow label="Schedule Style" value={scheduleText} />
        <SummaryRow label="Calories" value={`${answers.calories} kcal`} />
        <SummaryRow label="Protein" value={`${answers.protein}g`} />
        <SummaryRow label="Training" value={`${answers.trainingDays}x/week`} />
        <SummaryRow label="Units" value={answers.units === 'imperial' ? 'Imperial (lbs)' : 'Metric (kg)'} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0 0',
          }}
        >
          <span style={{ fontSize: '13px', color: COLORS.muted }}>Routine</span>
          <span style={{ fontSize: '13px', color: COLORS.primary, fontWeight: 500 }}>{routineText}</span>
        </div>
      </div>

      <CTAButton onClick={onFinish}>
        Enter Apex →
      </CTAButton>
    </div>
  );
}

// ── Main Onboarding Component ─────────────────────────────────────────────────

const TOTAL_STEPS = 10;

const defaultAnswers = {
  focusAreas: [],
  goalSelected: '',
  goalCustom: '',
  habits: [],
  scheduleStyle: '',
  calories: 2100,
  protein: 180,
  trackMacros: false,
  trainingDays: 4,
  units: 'imperial',
  routineStyle: '',
};

function isStepValid(step, answers) {
  switch (step) {
    case 0: return true; // welcome, no input
    case 1: return answers.focusAreas.length > 0;
    case 2: return answers.goalSelected !== '' || answers.goalCustom.trim() !== '';
    case 3: return answers.habits.length > 0;
    case 4: return answers.scheduleStyle !== '';
    case 5: return true; // nutrition always valid (has defaults)
    case 6: return true; // training always valid (has default)
    case 7: return answers.units !== '';
    case 8: return answers.routineStyle !== '';
    case 9: return true; // finish screen
    default: return false;
  }
}

export default function Onboarding({ onComplete }) {
  const [step, setStep]       = useState(0);
  const [direction, setDir]   = useState(1);
  const [answers, setAnswers] = useState(defaultAnswers);

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDir(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDir(-1);
      setStep((s) => s - 1);
    }
  };

  const updateAnswers = (patch) => setAnswers((prev) => ({ ...prev, ...patch }));

  const handleFinish = () => {
    // 1. Save habits
    const selectedHabits = ALL_HABITS.filter((h) => answers.habits.includes(h.id));
    selectedHabits.forEach((habit) => {
      saveHabit({
        id: `h-${habit.id}`,
        name: habit.name,
        emoji: habit.emoji,
        category: 'fitness',
        color: COLORS.amber,
        targetType: 'bool',
        active: true,
      });
    });

    // 2. Save goal
    const goalTitle = answers.goalCustom.trim() || answers.goalSelected;
    if (goalTitle) {
      saveGoal({
        id: 'onboard-goal-1',
        category: 'fitness',
        title: goalTitle,
        progress: 0,
        targetDate: sixMonthsFromNow(),
        done: false,
      });
    }

    // 3. Complete onboarding
    const data = {
      focusAreas: answers.focusAreas,
      scheduleStyle: answers.scheduleStyle,
      trainingFrequency: answers.trainingDays,
      routineStyle: answers.routineStyle,
      units: answers.units,
      dailyCalorieTarget: answers.calories,
      dailyProteinTarget: answers.protein,
      trackMacros: answers.trackMacros,
    };
    completeOnboarding(data);

    // 4. Call parent
    onComplete?.();
  };

  const valid = isStepValid(step, answers);

  const variants = slideVariants(direction);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Welcome screen — full viewport, no chrome */}
      {step === 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key="welcome"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <WelcomeScreen onNext={goNext} />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Steps 1–9 — with progress bar and nav */}
      {step > 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top nav bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 0',
              maxWidth: '512px',
              width: '100%',
              margin: '0 auto',
              boxSizing: 'border-box',
            }}
          >
            <motion.button
              onClick={goBack}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                padding: '4px 0',
              }}
            >
              <ArrowLeft size={16} />
              Back
            </motion.button>

            <ProgressDots total={TOTAL_STEPS} current={step} />

            <div style={{ width: '52px' }} /> {/* spacer */}
          </div>

          {/* Screen content */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={spring}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    maxWidth: '512px',
                    width: '100%',
                    margin: '0 auto',
                    padding: '28px 24px 0',
                    boxSizing: 'border-box',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {step === 1 && (
                    <FocusAreasScreen
                      value={answers.focusAreas}
                      onChange={(v) => updateAnswers({ focusAreas: v })}
                    />
                  )}
                  {step === 2 && (
                    <GoalScreen
                      value={{ selected: answers.goalSelected, custom: answers.goalCustom }}
                      onChange={(v) => updateAnswers({ goalSelected: v.selected, goalCustom: v.custom })}
                    />
                  )}
                  {step === 3 && (
                    <StarterHabitsScreen
                      focusAreas={answers.focusAreas}
                      value={answers.habits}
                      onChange={(v) => updateAnswers({ habits: v })}
                    />
                  )}
                  {step === 4 && (
                    <ScheduleStyleScreen
                      value={answers.scheduleStyle}
                      onChange={(v) => updateAnswers({ scheduleStyle: v })}
                    />
                  )}
                  {step === 5 && (
                    <NutritionScreen
                      value={{ calories: answers.calories, protein: answers.protein, trackMacros: answers.trackMacros }}
                      onChange={(v) => updateAnswers({ calories: v.calories, protein: v.protein, trackMacros: v.trackMacros })}
                    />
                  )}
                  {step === 6 && (
                    <TrainingFrequencyScreen
                      value={answers.trainingDays}
                      onChange={(v) => updateAnswers({ trainingDays: v })}
                    />
                  )}
                  {step === 7 && (
                    <UnitsScreen
                      value={answers.units}
                      onChange={(v) => updateAnswers({ units: v })}
                    />
                  )}
                  {step === 8 && (
                    <DailyRoutineScreen
                      value={answers.routineStyle}
                      onChange={(v) => updateAnswers({ routineStyle: v })}
                    />
                  )}
                  {step === 9 && (
                    <FinishScreen answers={answers} onFinish={handleFinish} />
                  )}

                  {/* CTA — only for steps 1–8 (step 9 has its own inline button) */}
                  {step < 9 && (
                    <div style={{ paddingBottom: '32px', marginTop: 'auto', paddingTop: '16px' }}>
                      <CTAButton onClick={goNext} disabled={!valid}>
                        {step === 8 ? 'Review Setup' : 'Continue'}
                        {valid && step < 8 && <ChevronRight size={18} />}
                      </CTAButton>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
