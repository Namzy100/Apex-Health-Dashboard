import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, RefreshCw } from 'lucide-react';
import { getAICoachInsight, generateAdjustmentSuggestion } from '../services/aiCoach';
import { useApexStore } from '../store/apexStore';

export default function AICoachCard({ delay = 0 }) {
  const [store] = useApexStore();
  const [insight, setInsight] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSecondary, setShowSecondary] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getAICoachInsight(store);
      setInsight(result);
      setSuggestion(generateAdjustmentSuggestion(store));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sentimentColor = {
    positive: '#10b981',
    warning:  '#f59e0b',
    neutral:  '#78716c',
    ai:       '#6366f1',
  };

  const primaryColor = sentimentColor[insight?.primary?.sentiment] || '#78716c';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(99,102,241,0.18)',
      }}>
      {/* Ambient glow */}
      <div className="absolute -top-4 -right-4 w-24 h-24 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(16px)' }} />
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />

      <div className="p-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Brain size={13} style={{ color: '#818cf8' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1', letterSpacing: '0.1em' }}>Coach</p>
          </div>
          <button onClick={load} className="opacity-40 hover:opacity-80 transition-opacity">
            <RefreshCw size={11} style={{ color: '#78716c' }} />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-2">
              {[80, 60, 40].map((w, i) => (
                <div key={i} className="h-2.5 rounded-full animate-pulse" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }} />
              ))}
            </motion.div>
          ) : insight ? (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Primary message */}
              <div className="mb-3">
                <div className="w-1 h-1 rounded-full mb-2" style={{ background: primaryColor }} />
                <p className="text-sm leading-relaxed" style={{ color: '#c9c2bb' }}>
                  {insight.primary.message}
                </p>
              </div>

              {/* Suggestion */}
              {suggestion && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: '#57534e' }}>
                    → {suggestion}
                  </p>
                </div>
              )}

              {/* Secondary insight toggle */}
              {insight.secondary && (
                <>
                  <button
                    onClick={() => setShowSecondary(p => !p)}
                    className="flex items-center gap-1 mt-3 text-xs transition-opacity hover:opacity-80"
                    style={{ color: '#57534e' }}>
                    <ChevronRight size={11} style={{ transform: showSecondary ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    {showSecondary ? 'Less' : 'More insights'}
                  </button>
                  <AnimatePresence>
                    {showSecondary && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="text-xs leading-relaxed mt-2 overflow-hidden" style={{ color: '#78716c' }}>
                        {insight.secondary.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
