import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Dashboard from './pages/Dashboard';
import WeightTracker from './pages/WeightTracker';
import MacroTracker from './pages/MacroTracker';
import Activity from './pages/Activity';
import Lifting from './pages/Lifting';
import Recipes from './pages/Recipes';
import Progress from './pages/Progress';
import SummerPlans from './pages/SummerPlans';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import FoodCalories from './pages/FoodCalories';
import Calendar from './pages/Calendar';
import CookSomething from './pages/CookSomething';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="flex" style={{ minHeight: '100svh', background: '#111010' }}>
          <Sidebar />
          <main className="flex-1 overflow-x-hidden md:ml-[220px]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/food" element={<FoodCalories />} />
              <Route path="/cook" element={<CookSomething />} />
              <Route path="/weight" element={<WeightTracker />} />
              <Route path="/macros" element={<MacroTracker />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/lifting" element={<Lifting />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/summer" element={<SummerPlans />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <MobileNav />
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
