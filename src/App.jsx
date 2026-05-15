import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import { SyncProvider, useSyncContext } from './contexts/SyncContext';
import { useApexStore } from './store/apexStore';

// ── PWA update banner ─────────────────────────────────────────────────────────

function PWAUpdater() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const [dismissed, setDismissed] = useState(false);
  if (!needRefresh || dismissed) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[200] rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.25)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: '#f5f4f2' }}>New update available</p>
          <p className="text-xs mt-0.5" style={{ color: '#a8a29e' }}>Tap to reload with latest version</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(245,158,11,0.25)', color: '#f59e0b' }}
        >
          Update
        </button>
        <button onClick={() => setDismissed(true)} className="flex-shrink-0 text-xs" style={{ color: '#57534e' }}>
          ✕
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Cloud auto-save watcher ───────────────────────────────────────────────────
// Calls the debounced push whenever the local store object changes reference.

function StoreWatcher() {
  const [store] = useApexStore();
  const { scheduleSave } = useSyncContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scheduleSave(); }, [store]);
  return null;
}

// ── Pages ─────────────────────────────────────────────────────────────────────

import Dashboard from './pages/Dashboard';

const FoodCalories  = lazy(() => import('./pages/FoodCalories'));
const CookSomething = lazy(() => import('./pages/CookSomething'));
const WeightTracker = lazy(() => import('./pages/WeightTracker'));
const MacroTracker  = lazy(() => import('./pages/MacroTracker'));
const Activity      = lazy(() => import('./pages/Activity'));
const Lifting       = lazy(() => import('./pages/Lifting'));
const Recipes       = lazy(() => import('./pages/Recipes'));
const Calendar      = lazy(() => import('./pages/Calendar'));
const Progress      = lazy(() => import('./pages/Progress'));
const SummerPlans   = lazy(() => import('./pages/SummerPlans'));
const Insights      = lazy(() => import('./pages/Insights'));
const Settings      = lazy(() => import('./pages/Settings'));
const Import        = lazy(() => import('./pages/Import'));

function PageSkeleton() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-24 md:pb-10" style={{ background: '#111010' }}>
      <div className="animate-pulse space-y-4 max-w-3xl">
        <div className="h-8 w-48 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-4 w-64 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-32 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-48 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <SyncProvider>
        <ToastProvider>
          <div className="flex" style={{ minHeight: '100svh', background: '#111010' }}>
            <StoreWatcher />
            <Sidebar />
            <main className="flex-1 overflow-x-hidden md:ml-[220px]">
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/"         element={<Dashboard />} />
                  <Route path="/food"     element={<FoodCalories />} />
                  <Route path="/cook"     element={<CookSomething />} />
                  <Route path="/weight"   element={<WeightTracker />} />
                  <Route path="/macros"   element={<MacroTracker />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/lifting"  element={<Lifting />} />
                  <Route path="/recipes"  element={<Recipes />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/summer"   element={<SummerPlans />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/import"   element={<Import />} />
                </Routes>
              </Suspense>
            </main>
            <MobileNav />
            <PWAUpdater />
          </div>
        </ToastProvider>
      </SyncProvider>
    </BrowserRouter>
  );
}
