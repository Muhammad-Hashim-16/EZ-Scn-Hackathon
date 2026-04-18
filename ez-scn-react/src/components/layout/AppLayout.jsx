// ============================================
// PennyWise — App Layout with Navigation
// Desktop: left sidebar   Mobile: bottom nav bar
// Wraps all protected pages in LifeHoursProvider
// ============================================

import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LifeHoursProvider } from '@/context/LifeHoursContext';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, BarChart3, Target, CalendarCheck,
  Settings, LogOut, Coins, ChevronLeft, ChevronRight,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SIDEBAR_KEY = 'pw_sidebar_collapsed';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, emoji: '🏠' },
  { to: '/analysis', label: 'Analysis', icon: BarChart3, emoji: '📊' },
  { to: '/goals', label: 'Goals', icon: Target, emoji: '🎯' },
  { to: '/weekly', label: 'Weekly', icon: CalendarCheck, emoji: '📝' },
  { to: '/settings', label: 'Settings', icon: Settings, emoji: '⚙️' },
];

export default function AppLayout() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [hourlyWage, setHourlyWage] = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
  });

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }

  // Fetch hourly wage once at layout level so all pages share it
  useEffect(() => {
    async function fetchWage() {
      try {
        const res = await fetch(`${API_URL}/api/analysis/quick-health`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && data.hourly_wage) {
          setHourlyWage(data.hourly_wage);
        }
      } catch {
        // fallback to 0
      }
    }
    if (accessToken) fetchWage();
  }, [accessToken]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';
  const mainMargin = collapsed ? 'lg:ml-[72px]' : 'lg:ml-64';

  return (
    <LifeHoursProvider hourlyWage={hourlyWage}>
      <div className="flex min-h-screen bg-background">
        {/* ═══════ Desktop Sidebar ═══════ */}
        <aside className={`hidden lg:flex flex-col ${sidebarWidth} bg-white border-r border-border/60 shrink-0 fixed h-screen z-30
                           transition-all duration-200 ease-in-out ${collapsed ? 'p-2 pt-6' : 'p-4 pt-6'}`}>

          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border border-border/60
                        bg-gray-50 hover:bg-gray-100 text-muted-foreground hover:text-foreground
                        transition-colors duration-150 cursor-pointer mb-4
                        ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Brand */}
          <Link to="/dashboard" className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-3'} mb-8 cursor-pointer`}>
            <div className="w-9 h-9 rounded-xl bg-[#01411C] flex items-center justify-center shadow-md shadow-[#01411C]/20 shrink-0">
              <Coins className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-foreground tracking-tight whitespace-nowrap overflow-hidden">PennyWise</span>
            )}
          </Link>

          {/* Nav links */}
          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-medium
                     transition-all duration-200
                     ${isActive
                       ? 'bg-[#01411C]/10 text-[#01411C] font-semibold shadow-sm'
                       : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
                     }`
                  }
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-medium
                       text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors mt-4 cursor-pointer`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">Sign Out</span>}
          </button>
        </aside>

        {/* ═══════ Main Content ═══════ */}
        <main className={`flex-1 ${mainMargin} pb-20 lg:pb-0 min-h-screen transition-all duration-200 ease-in-out`}>
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
    </LifeHoursProvider>
  );
}
