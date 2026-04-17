// ============================================
// PennyWise — App Layout with Navigation
// Desktop: left sidebar   Mobile: bottom nav bar
// ============================================

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, BarChart3, Target, CalendarCheck,
  Settings, LogOut, Coins,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, emoji: '🏠' },
  { to: '/analysis', label: 'Analysis', icon: BarChart3, emoji: '📊' },
  { to: '/goals', label: 'Goals', icon: Target, emoji: '🎯' },
  { to: '/weekly', label: 'Weekly', icon: CalendarCheck, emoji: '📝' },
  { to: '/settings', label: 'Settings', icon: Settings, emoji: '⚙️' },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ═══════ Desktop Sidebar ═══════ */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-border/60 p-4 pt-6 shrink-0 fixed h-screen z-30">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#01411C] flex items-center justify-center shadow-md shadow-[#01411C]/20">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">PennyWise</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                   transition-all duration-200
                   ${isActive
                     ? 'bg-[#01411C]/10 text-[#01411C] font-semibold shadow-sm'
                     : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
                   }`
                }
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors mt-4 cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </aside>

      {/* ═══════ Main Content ═══════ */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* ═══════ Mobile Bottom Nav ═══════ */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-border/60 z-30
                      flex items-center justify-around h-16 safe-bottom px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-semibold
                 transition-colors duration-200
                 ${isActive ? 'text-[#01411C]' : 'text-muted-foreground'}`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
