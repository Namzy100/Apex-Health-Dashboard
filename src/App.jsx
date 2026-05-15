import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';

// Eagerly loaded — tiny, always needed
import Dashboard from './pages/Dashboard';

// Lazy-loaded — heavy pages, split into separate chunks
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

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="flex" style={{ minHeight: '100svh', background: '#111010' }}>
          <Sidebar />
          <main className="flex-1 overflow-x-hidden md:ml-[220px]">
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/"        element={<Dashboard />} />
                <Route path="/food"    element={<FoodCalories />} />
                <Route path="/cook"    element={<CookSomething />} />
                <Route path="/weight"  element={<WeightTracker />} />
                <Route path="/macros"  element={<MacroTracker />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/lifting" element={<Lifting />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/summer"  element={<SummerPlans />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </main>
          <MobileNav />
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
