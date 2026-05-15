import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useApexStore, getDailyTotals, getDailyCheckin, saveDailyCheckin } from '../store/apexStore';

const BLOCKS = [
  {
    id: 'morning', label: 'Morning', time: '6am – 11am', emoji: '🌅',
    items: [
      { id: 'weigh_in',       label: 'Weigh in',          emoji: '⚖️', auto: 'weight' },
      { id: 'breakfast',      label: 'Log breakfast',      emoji: '🥣', auto: 'breakfast' },
      { id: 'hydration',      label: 'Start hydration',    emoji: '💧' },
      { id: 'morning_walk',   label: 'Morning movement',   emoji: '🚶' },
    ],
  },
  {
    id: 'afternoon', label: 'Afternoon', time: '11am – 5pm', emoji: '☀️',
    items: [
      { id: 'lunch',          label: 'Log lunch',          emoji: '🍗', auto: 'lunch' },
      { id: 'training',       label: 'Training session',   emoji: '🏋️' },
      { id: 'steps_mid',      label: 'Steps check-in',     emoji: '👟' },
      { id: 'protein_mid',    label: 'Hit 50% protein',    emoji: '🥩', auto: 'protein_half' },
    ],
  },
  {
    id: 'evening', label: 'Evening', time: '5pm – 9pm', emoji: '🌆',
    items: [
      { id: 'dinner',         label: 'Log dinner',         emoji: '🍽️', auto: 'dinner' },
      { id: 'steps_goal',     label: '10k steps',          emoji: '🎯', auto: 'steps_10k' },
      { id: 'cal_review',     label: 'Review calories',    emoji: '📊' },
    ],
  },
  {
    id: 'night', label: 'Night', time: '9pm – 12am', emoji: '🌙',
    items: [
      { id: 'protein_done',   label: 'Protein target hit', emoji: '💪', auto: 'protein_done' },
      { id: 'sleep_prep',     label: 'Sleep by 11pm',      emoji: '😴' },
      { id: 'reflect',        label: 'Day reflection',      emoji: '📝' },
    ],
  },
];

function getActiveBlock() {
  const h = new Date().getHours();
  if (h < 11) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

export default function DailyTimeline({ className = '' }) {
  const [store] = useApexStore();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [checkin, setCheckin] = useState(() => getDailyCheckin(todayStr));
  const timeline = checkin.timeline || {};
  const [openBlock, setOpenBlock] = useState(getActiveBlock);

  const totals = getDailyTotals(todayStr);
  const weightLogged = !!(store.weightLogs || []).find(l => l.date === todayStr);
  const settings = store.settings || {};

  // Auto-derive completion from real data
  function isAutoComplete(item) {
    if (!item.auto) return false;
    switch (item.auto) {
      case 'weight':       return weightLogged;
      case 'breakfast':    return ((store.foodLogs?.[todayStr]?.breakfast) || []).length > 0;
      case 'lunch':        return ((store.foodLogs?.[todayStr]?.lunch)     || []).length > 0;
      case 'dinner':       return ((store.foodLogs?.[todayStr]?.dinner)    || []).length > 0;
      case 'protein_half': return totals.protein >= (settings.dailyProteinTarget || 180) * 0.5;
      case 'protein_done': return totals.protein >= (settings.dailyProteinTarget || 180) * 0.9;
      case 'steps_10k':   return false; // no step tracking in store yet
      default:             return false;
    }
  }

  const isDone = (item) => isAutoComplete(item) || !!timeline[item.id];

  const toggle = (itemId) => {
    const updated = { ...checkin, timeline: { ...timeline, [itemId]: !timeline[itemId] } };
    setCheckin(updated);
    saveDailyCheckin(todayStr, updated);
  };

  const activeBlock = getActiveBlock();

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold" style={{ color: '#f5f4f2' }}>Today's Timeline</h2>
        <p className="text-xs" style={{ color: '#57534e' }}>
          {BLOCKS.flatMap(b => b.items).filter(i => isDone(i)).length} / {BLOCKS.flatMap(b => b.items).length} complete
        </p>
      </div>

      <div className="space-y-1.5">
        {BLOCKS.map((block) => {
          const blockDone = block.items.filter(i => isDone(i)).length;
          const isActive = block.id === activeBlock;
          const isOpen = openBlock === block.id;

          return (
            <div key={block.id} className="rounded-xl overflow-hidden"
              style={{
                background: isActive ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)'}`,
              }}>
              {/* Block header */}
              <button
                onClick={() => setOpenBlock(isOpen ? null : block.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5">
                <span style={{ fontSize: 14 }}>{block.emoji}</span>
                <span className="text-xs font-semibold flex-1 text-left"
                  style={{ color: isActive ? '#f5f4f2' : '#78716c' }}>{block.label}</span>
                <span className="text-xs" style={{ color: '#57534e' }}>{block.time}</span>
                <span className="text-xs font-semibold ml-1"
                  style={{ color: blockDone === block.items.length ? '#10b981' : '#57534e' }}>
                  {blockDone}/{block.items.length}
                </span>
                <ChevronDown size={12} style={{
                  color: '#57534e',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }} />
              </button>

              {/* Items */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="px-3 pb-2.5 space-y-1">
                      {block.items.map((item) => {
                        const done = isDone(item);
                        const auto = isAutoComplete(item);
                        return (
                          <motion.button key={item.id}
                            onClick={() => !auto && toggle(item.id)}
                            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors"
                            style={{
                              background: done ? 'rgba(16,185,129,0.06)' : 'transparent',
                              cursor: auto ? 'default' : 'pointer',
                            }}>
                            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                background: done ? '#10b981' : 'rgba(255,255,255,0.06)',
                                border: done ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: done ? '0 0 6px rgba(16,185,129,0.3)' : 'none',
                              }}>
                              {done && <Check size={8} strokeWidth={3} style={{ color: '#fff' }} />}
                            </div>
                            <span style={{ fontSize: 12 }}>{item.emoji}</span>
                            <span className="text-xs flex-1"
                              style={{ color: done ? '#4d4844' : '#78716c', textDecoration: done ? 'line-through' : 'none' }}>
                              {item.label}
                            </span>
                            {auto && done && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>auto</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
