import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ChefHat, Download, Settings } from 'lucide-react';

const TABS = [
  { to: '/',        icon: LayoutDashboard, label: 'Home' },
  { to: '/food',    icon: UtensilsCrossed, label: 'Food' },
  { to: '/cook',    icon: ChefHat,         label: 'Cook' },
  { to: '/import',  icon: Download,        label: 'Import' },
  { to: '/settings',icon: Settings,        label: 'Settings' },
];

export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'rgba(14,12,10,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex flex-col items-center gap-0.5 flex-1 py-1"
            style={({ isActive }) => ({ color: isActive ? '#f59e0b' : '#57534e' })}
          >
            {({ isActive }) => (
              <>
                <div
                  className="flex items-center justify-center rounded-xl transition-all"
                  style={{
                    width: 40,
                    height: 32,
                    background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
