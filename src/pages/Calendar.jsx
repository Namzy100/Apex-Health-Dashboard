import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, Check } from 'lucide-react';
import { weightLogs, macroLogs } from '../data/sampleData';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildLogMap() {
  const map = {};
  weightLogs.forEach(d => { map[d.date] = { ...map[d.date], weight: d.weight }; });
  macroLogs.forEach(d => { map[d.date] = { ...map[d.date], calories: d.calories, protein: d.protein }; });
  return map;
}

const logMap = buildLogMap();

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(now.toISOString().slice(0, 10));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0, 10);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedData = logMap[selected];

  const streak = (() => {
    let count = 0;
    const d = new Date(todayStr);
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (!logMap[key]) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  return (
    <div style={{ minHeight: '100vh', background: '#111010' }}>
      <div className="px-6 pt-8 pb-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#57534e' }}>Your journey</p>
          <h1 className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: '#f5f4f2' }}>Calendar</h1>
          <p className="text-sm" style={{ color: '#57534e' }}>Every logged day is a win.</p>
        </motion.div>
      </div>

      <div className="px-6 pb-10">
        <div className="grid grid-cols-3 gap-5">

          {/* Calendar */}
          <div className="col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>

              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/5">
                  <ChevronLeft size={16} style={{ color: '#78716c' }} />
                </button>
                <h2 className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>
                  {MONTHS[month]} {year}
                </h2>
                <button onClick={nextMonth} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/5">
                  <ChevronRight size={16} style={{ color: '#78716c' }} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center py-1">
                    <span className="text-[10px] font-medium" style={{ color: '#57534e' }}>{d}</span>
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const hasLog = !!logMap[dateStr];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selected;
                  const isFuture = dateStr > todayStr;

                  return (
                    <button key={dateStr} onClick={() => !isFuture && setSelected(dateStr)}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all"
                      style={{
                        background: isSelected ? 'rgba(245,158,11,0.15)' : isToday ? 'rgba(255,255,255,0.06)' : 'transparent',
                        border: isSelected ? '1px solid rgba(245,158,11,0.3)' : isToday ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                        cursor: isFuture ? 'default' : 'pointer',
                        opacity: isFuture ? 0.3 : 1,
                      }}>
                      <span className="text-xs font-medium" style={{
                        color: isSelected ? '#f59e0b' : isToday ? '#f5f4f2' : '#a8a29e',
                      }}>
                        {day}
                      </span>
                      {hasLog && !isFuture && (
                        <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isSelected ? '#f59e0b' : '#10b981' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Days Logged', value: Object.keys(logMap).length, icon: Check, color: '#10b981' },
                { label: 'Streak', value: `${streak}d`, icon: Flame, color: '#f59e0b' },
                { label: 'This Month', value: Object.keys(logMap).filter(k => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length, icon: Check, color: '#3b82f6' },
              ].map((s, i) => (
                <motion.div key={s.label}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.35 }}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}18` }}>
                    <s.icon size={15} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#57534e' }}>{s.label}</p>
                    <p className="text-xl font-bold" style={{ color: '#f5f4f2' }}>{s.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Day detail */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
              className="rounded-2xl p-5 sticky top-6"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs mb-1" style={{ color: '#57534e' }}>
                {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#f5f4f2' }}>Day Summary</h3>

              {selectedData ? (
                <div className="space-y-3">
                  {selectedData.calories != null && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#f97316' }} />
                        <span className="text-xs" style={{ color: '#a8a29e' }}>Calories</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>{selectedData.calories}</span>
                    </div>
                  )}
                  {selectedData.protein != null && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                        <span className="text-xs" style={{ color: '#a8a29e' }}>Protein</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>{selectedData.protein}g</span>
                    </div>
                  )}
                  {selectedData.weight != null && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                        <span className="text-xs" style={{ color: '#a8a29e' }}>Weight</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#f5f4f2' }}>{selectedData.weight} lbs</span>
                    </div>
                  )}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-full flex items-center justify-center gap-2 py-2 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <Check size={12} style={{ color: '#10b981' }} />
                      <span className="text-xs font-medium" style={{ color: '#10b981' }}>Day logged</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm" style={{ color: '#57534e' }}>
                    {selected > todayStr ? 'Future date' : 'Nothing logged'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#3d3a36' }}>
                    {selected <= todayStr ? 'Log your food and weight to see data' : ''}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
