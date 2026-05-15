import { motion } from 'framer-motion';

// ── Color helper (also exported for external use) ─────────────────────────────

export function scoreColor(score) {
  if (score >= 80) return '#10b981'; // emerald
  if (score >= 60) return '#f59e0b'; // amber
  return '#f97316';                  // orange
}

// ── Size config ───────────────────────────────────────────────────────────────

const SIZE_MAP = {
  sm: { px: 80,  stroke: 4,  fontSize: 18, labelSize: 9  },
  md: { px: 120, stroke: 6,  fontSize: 28, labelSize: 11 },
  lg: { px: 160, stroke: 8,  fontSize: 38, labelSize: 13 },
};

// ── MomentumRing ──────────────────────────────────────────────────────────────

export default function MomentumRing({
  score,
  label = 'momentum',
  size = 'md',
  showBreakdown = false,
  breakdown = null,
}) {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;
  const radius = (cfg.px - cfg.stroke * 2) / 2;
  const cx = cfg.px / 2;
  const cy = cfg.px / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score ?? 0));
  const fillOffset = circumference - (clampedScore / 100) * circumference;
  const color = scoreColor(clampedScore);

  const breakdownItems = breakdown
    ? [
        { label: 'Habits',    score: breakdown.habits?.score    ?? 0 },
        { label: 'Nutrition', score: breakdown.nutrition?.score ?? 0 },
        { label: 'Training',  score: breakdown.training?.score  ?? 0 },
        { label: 'Journal',   score: breakdown.journal?.score   ?? 0 },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: cfg.px, height: cfg.px }}>
        <svg
          width={cfg.px}
          height={cfg.px}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
        >
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={cfg.stroke}
          />
          {/* Animated fill */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: fillOffset }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{
              fontSize: cfg.fontSize,
              fontWeight: 700,
              color,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(clampedScore)}
          </motion.span>
          <span
            style={{
              fontSize: cfg.labelSize,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Breakdown pills */}
      {showBreakdown && breakdown && breakdownItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            width: '100%',
          }}
        >
          {breakdownItems.map((item) => {
            const pillColor = scoreColor(item.score);
            return (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  padding: '6px 4px',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: pillColor,
                    background: `${pillColor}18`,
                    border: `1px solid ${pillColor}30`,
                    borderRadius: 4,
                    padding: '1px 5px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {Math.round(item.score)}
                </span>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
