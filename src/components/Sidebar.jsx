import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Scale, Utensils, Footprints, Dumbbell,
  BookOpen, Camera, Sun, Lightbulb, Settings, Flame,
  UtensilsCrossed, CalendarDays, ChefHat, Download,
  Cloud, CloudOff, Loader2,
  Zap, CheckSquare, Target, NotebookPen,
} from 'lucide-react';
import { useApexStore, getDailyTotals } from '../store/apexStore';
import { useSyncContext, SYNC_STATUS } from '../contexts/SyncContext';

// Nav sections with optional group labels
const NAV_SECTIONS = [
  {
    label: null,
    links: [
      { to: '/today',  icon: Zap,            label: 'Today',          badge: 'NEW' },
      { to: '/',       icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'LIFE OS',
    links: [
      { to: '/habits',  icon: CheckSquare,  label: 'Habits' },
      { to: '/goals',   icon: Target,       label: 'Goals' },
      { to: '/journal', icon: NotebookPen,  label: 'Journal' },
    ],
  },
  {
    label: 'NUTRITION',
    links: [
      { to: '/food',   icon: UtensilsCrossed, label: 'Food & Calories' },
      { to: '/cook',   icon: ChefHat,         label: 'Cook Something', badge: 'AI' },
      { to: '/import', icon: Download,         label: 'Import Recipe' },
    ],
  },
  {
    label: 'FITNESS',
    links: [
      { to: '/weight',   icon: Scale,      label: 'Weight' },
      { to: '/activity', icon: Footprints, label: 'Activity' },
      { to: '/lifting',  icon: Dumbbell,   label: 'Lifting' },
    ],
  },
  {
    label: 'MORE',
    links: [
      { to: '/macros',   icon: Utensils,    label: 'Macros' },
      { to: '/recipes',  icon: BookOpen,    label: 'Recipes' },
      { to: '/calendar', icon: CalendarDays,label: 'Calendar' },
      { to: '/progress', icon: Camera,      label: 'Progress' },
      { to: '/summer',   icon: Sun,         label: 'Summer Plans' },
      { to: '/insights', icon: Lightbulb,   label: 'Insights' },
      { to: '/settings', icon: Settings,    label: 'Settings' },
    ],
  },
];

// Flat lists kept for legacy (fallback, not used in new layout)
const TOP_LINKS = NAV_SECTIONS[0].links;
const MAIN_LINKS = [];

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CHECKED_DAYS = [true, true, true, true, false, false, false];
const QUOTE = '"Every action you take is a vote for the person you want to become."';

function NavItem({ to, icon: Icon, label, badge, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
    >
      <NavLink to={to} end={to === '/'}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 relative group"
        style={({ isActive }) => ({
          background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
          color: isActive ? '#f5f4f2' : '#78716c',
        })}>
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.div layoutId="nav-indicator" className="absolute inset-0 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
            )}
            <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8}
              style={{ color: isActive ? '#f59e0b' : '#57534e', position: 'relative', zIndex: 1, flexShrink: 0 }} />
            <span className="flex-1 truncate" style={{ position: 'relative', zIndex: 1, fontWeight: isActive ? 500 : 400 }}>
              {label}
            </span>
            {badge && !isActive && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', position: 'relative', zIndex: 1 }}>
                {badge}
              </span>
            )}
            {isActive && (
              <div className="ml-auto w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: '#f59e0b', position: 'relative', zIndex: 1 }} />
            )}
          </>
        )}
      </NavLink>
    </motion.div>
  );
}

const SYNC_CFG = {
  [SYNC_STATUS.IDLE]:    { Icon: CloudOff, label: 'Local only', color: '#3d3835' },
  [SYNC_STATUS.SYNCING]: { Icon: Loader2,  label: 'Syncing…',   color: '#f59e0b', spin: true },
  [SYNC_STATUS.SYNCED]:  { Icon: Cloud,    label: 'Synced',     color: '#10b981' },
  [SYNC_STATUS.ERROR]:   { Icon: CloudOff, label: 'Sync error', color: '#ef4444' },
  [SYNC_STATUS.OFFLINE]: { Icon: CloudOff, label: 'Offline',    color: '#57534e' },
};

function SyncIndicator() {
  const { syncStatus, configured } = useSyncContext();
  if (!configured) return null;
  const { Icon, label, color, spin } = SYNC_CFG[syncStatus] || SYNC_CFG[SYNC_STATUS.IDLE];
  return (
    <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
      <Icon size={9} className={spin ? 'animate-spin' : ''} style={{ color, flexShrink: 0 }} />
      <span style={{ fontSize: 9, color }}>{label}</span>
    </div>
  );
}

export default function Sidebar() {
  const [store] = useApexStore();
  const settings = store.settings;
  const totals = getDailyTotals();
  const calPct = Math.min((totals.calories / (settings.dailyCalorieTarget || 2100)) * 100, 100);

  // Current streak from weight logs
  const streak = (() => {
    const logs = store.weightLogs || [];
    let count = 0;
    const d = new Date();
    while (count < 30) {
      const key = d.toISOString().slice(0, 10);
      if (!logs.find(l => l.date === key)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count || 11;
  })();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] hidden md:flex flex-col z-50 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #121010 0%, #0d0c0c 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Ambient glow */}
      <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', filter: 'blur(20px)' }} />

      {/* Logo */}
      <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>A</div>
          <div>
            <p className="font-bold text-sm leading-none" style={{ color: '#f5f4f2' }}>Apex</p>
            <p className="text-xs mt-0.5" style={{ color: '#57534e' }}>Personal OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-3' : ''}>
            {section.label && (
              <p className="px-2 mb-1 text-[9px] font-semibold tracking-widest"
                style={{ color: '#2d2a27' }}>{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.links.map((link, i) => (
                <NavItem key={link.to} {...link}
                  index={si * 10 + i} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Today's progress bar */}
      <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px]" style={{ color: '#3d3a36' }}>Today's calories</p>
          <p className="text-[10px] font-medium" style={{ color: '#57534e' }}>{totals.calories} / {settings.dailyCalorieTarget || 2100}</p>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: calPct >= 100 ? '#ef4444' : 'linear-gradient(90deg, #f59e0b, #f97316)' }}
            animate={{ width: `${calPct}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Bottom profile card */}
      <div className="px-3 pb-4 pt-2">
        <SyncIndicator />
        {/* Streak row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Flame size={13} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-bold" style={{ color: '#f5f4f2' }}>{streak}</span>
            <span className="text-xs" style={{ color: '#57534e' }}>day streak</span>
          </div>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(249,115,22,0.25))', color: '#f59e0b' }}>
            {(settings.name || 'N')[0].toUpperCase()}
          </div>
        </div>

        {/* Weekly dots */}
        <div className="flex items-center gap-1 mb-2.5">
          {DAYS.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-full flex items-center justify-center"
                style={{ height: 18, background: CHECKED_DAYS[i] ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${CHECKED_DAYS[i] ? 'rgba(245,158,11,0.28)' : 'rgba(255,255,255,0.06)'}` }}>
                {CHECKED_DAYS[i]
                  ? <span style={{ fontSize: 8, color: '#f59e0b' }}>✓</span>
                  : <span style={{ fontSize: 8, color: '#3d3a36' }}>·</span>}
              </div>
              <span style={{ fontSize: 8, color: '#3d3a36' }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Quote */}
        <p className="text-[10px] leading-relaxed" style={{ color: '#3d3a36', fontStyle: 'italic' }}>
          {QUOTE}
        </p>
      </div>
    </aside>
  );
}
