import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Target, Footprints, Droplets, Flame } from 'lucide-react';
import { getDailyTotals, useApexStore } from '../store/apexStore';
import { getDailyQuote } from '../data/motivationQuotes';

export default function FocusMode({ open, onClose }) {
  const [store] = useApexStore();
  const totals   = getDailyTotals();
  const settings = store.settings || {};
  const quote    = getDailyQuote('discipline');

  const calTarget  = settings.dailyCalorieTarget  || 2100;
  const protTarget = settings.dailyProteinTarget  || 180;
  const remCal  = Math.max(0, calTarget  - totals.calories);
  const remProt = Math.max(0, protTarget - totals.protein);
  const calPct  = Math.min(Math.round((totals.calories  / calTarget)  * 100), 100);
  const protPct = Math.min(Math.round((totals.protein   / protTarget) * 100), 100);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const stats = [
    { label: 'Calories left', value: remCal, unit: 'kcal', pct: calPct, color: '#f97316', icon: Flame },
    { label: 'Protein left',  value: remProt, unit: 'g',   pct: protPct, color: '#10b981', icon: Target },
    { label: 'Cal logged',    value: totals.calories, unit: 'kcal', pct: calPct, color: '#f59e0b', icon: Zap },
    { label: 'Protein hit',   value: totals.protein,  unit: 'g',    pct: protPct, color: '#10b981', icon: Target },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{ background: 'rgba(6,4,2,0.97)', backdropFilter: 'blur(32px)' }}>

          {/* Ambient glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

          {/* Close */}
          <button onClick={onClose}
            className="absolute top-5 right-5 w-11 h-11 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80 min-touch"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <X size={16} style={{ color: '#78716c' }} />
          </button>

          <div className="text-center max-w-lg px-5 md:px-8 w-full">
            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-xs font-bold uppercase tracking-widest mb-8"
              style={{ color: '#3d3835', letterSpacing: '0.2em' }}>
              Focus Mode
            </motion.p>

            {/* Quote */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="font-black tracking-tight mb-8 md:mb-12 leading-tight"
              style={{ fontSize: 'clamp(22px,5vw,36px)', color: '#f5f4f2' }}>
              "{quote}"
            </motion.h1>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: 'Calories left',  value: remCal,         unit: 'kcal', pct: calPct,  color: '#f97316', icon: Flame    },
                { label: 'Protein left',   value: remProt,        unit: 'g',    pct: protPct, color: '#10b981', icon: Target   },
                { label: 'Calories hit',   value: totals.calories, unit: 'kcal', pct: calPct, color: '#f59e0b', icon: Zap      },
                { label: 'Protein logged', value: totals.protein,  unit: 'g',   pct: protPct, color: '#10b981', icon: Droplets },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl p-4 text-center relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
                        transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                        className="h-full" style={{ background: s.color }} />
                    </div>
                    <Icon size={16} style={{ color: s.color, margin: '0 auto 8px' }} />
                    <p className="text-2xl font-black" style={{ color: '#f5f4f2' }}>
                      {s.value}<span className="text-sm font-normal ml-1" style={{ color: '#78716c' }}>{s.unit}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#57534e' }}>{s.label}</p>
                  </div>
                );
              })}
            </motion.div>

            {/* Esc hint */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-xs" style={{ color: '#2a2825' }}>
              Press Esc to exit
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
