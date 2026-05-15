import React from 'react';

// Unique gradient/filter IDs scoped to avoid collisions when rendered multiple times
let _idCounter = 0;
function useStableId(prefix) {
  const ref = React.useRef(null);
  if (ref.current === null) {
    ref.current = `${prefix}-${++_idCounter}`;
  }
  return ref.current;
}

// ─── Core SVG mark ───────────────────────────────────────────────────────────

export function ApexMark({ size = 32 }) {
  const gradId = useStableId('apex-grad');
  const glowId = useStableId('apex-glow');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Apex mark"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="20"
          y1="6"
          x2="20"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>

        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient glow behind the full A shape */}
      <path
        d="M6 32 L20 6 L34 32"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.18"
        filter={`url(#${glowId})`}
      />

      {/* Main A strokes */}
      <path
        d="M6 32 L20 6 L34 32"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Crossbar */}
      <path
        d="M13 22 L27 22"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── App-icon box ─────────────────────────────────────────────────────────────

export function ApexIconBox({ size = 40 }) {
  const bgGradId = useStableId('apex-box-bg');
  const innerGlowId = useStableId('apex-box-glow');
  const radius = Math.round(size * 0.22);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'linear-gradient(135deg, #1a1814, #0f0e0c)',
        border: '1px solid rgba(245,158,11,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Subtle top-left inner glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '60%',
          height: '60%',
          background:
            'radial-gradient(ellipse at 0% 0%, rgba(245,158,11,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <ApexMark size={Math.round(size * 0.7)} />
    </div>
  );
}

// ─── Wordmark: icon + "APEX" ──────────────────────────────────────────────────

export function ApexWordmark({ size = 32 }) {
  const fontSize = Math.round(size * 0.5);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.3) }}>
      <ApexMark size={size} />
      <span
        style={{
          fontWeight: 800,
          fontSize,
          letterSpacing: '0.15em',
          color: '#f5f4f2',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        APEX
      </span>
    </div>
  );
}

// ─── Full stacked logo: icon + "Apex" + "Personal OS" ─────────────────────────

function ApexFull({ size = 32 }) {
  const titleSize = Math.round(size * 0.5);
  const subSize = Math.round(size * 0.3);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.3) }}>
      <ApexMark size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: titleSize,
            letterSpacing: '0.15em',
            color: '#f5f4f2',
            userSelect: 'none',
          }}
        >
          APEX
        </span>
        <span
          style={{
            fontWeight: 500,
            fontSize: subSize,
            letterSpacing: '0.05em',
            color: '#57534e',
            userSelect: 'none',
          }}
        >
          Personal OS
        </span>
      </div>
    </div>
  );
}

// ─── Default export: unified ApexLogo ─────────────────────────────────────────

export default function ApexLogo({ size = 32, showText = false, variant = 'icon' }) {
  if (variant === 'wordmark') return <ApexWordmark size={size} />;
  if (variant === 'full') return <ApexFull size={size} />;
  // 'icon' variant — honour showText for backwards compat
  if (showText) return <ApexWordmark size={size} />;
  return <ApexMark size={size} />;
}
