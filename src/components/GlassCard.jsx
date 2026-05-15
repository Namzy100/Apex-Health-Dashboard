import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = '',
  glow,
  hover = false,
  onClick,
  delay = 0,
  animate = true,
  style = {},
  ...props
}) {
  const glowStyle =
    glow === 'amber'
      ? { boxShadow: '0 0 40px rgba(245,158,11,0.15), 0 0 0 1px rgba(245,158,11,0.12), 0 8px 32px rgba(0,0,0,0.5)' }
      : glow === 'emerald'
      ? { boxShadow: '0 0 30px rgba(16,185,129,0.15), 0 0 0 1px rgba(16,185,129,0.1), 0 8px 32px rgba(0,0,0,0.5)' }
      : { boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.4)' };

  const Comp = animate ? motion.div : 'div';
  const animProps = animate
    ? {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] },
      }
    : {};

  return (
    <Comp
      className={`glass rounded-2xl ${hover || onClick ? 'cursor-pointer transition-all duration-200 hover:bg-white/[0.07] hover:border-amber-500/20' : ''} ${className}`}
      style={{ ...glowStyle, ...style }}
      onClick={onClick}
      {...animProps}
      {...props}
    >
      {children}
    </Comp>
  );
}
