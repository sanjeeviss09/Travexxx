import React from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../supabase';
import {
  LayoutDashboard, LogOut, Truck, Settings, Users,
  Bell, Car, MapPin, ClipboardList, AlertCircle, ChevronRight,
  X, CheckCheck, Menu
} from 'lucide-react';

const API = window.location.origin.includes('5173') ? 'http://localhost:5000/api' : '/api';

export default function DashboardLayout() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = React.useState([]);
  const [toast, setToast] = React.useState(null);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const notifRef = React.useRef(null);
  const sidebarRef = React.useRef(null);

  const unreadCount = notifications.filter(n => !n.read_status).length;

  const fetchNotifications = React.useCallback(async () => {
    if (!user.id) return;
    try {
      const res = await axios.get(`${API}/bookings/notifications?user_id=${user.id}`);
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('Failed to fetch notifications:', e.message);
    }
  }, [user.id]);

  React.useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Supabase Realtime
  React.useEffect(() => {
    if (!user.id) return;
    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const newNotif = payload.new;
        setNotifications(prev => [newNotif, ...prev]);
        setToast(newNotif.message);
        setTimeout(() => setToast(null), 5000);
      }).subscribe();
    const updateChannel = supabase.channel('realtime_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
      }).subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(updateChannel); };
  }, [user.id]);

  // Close notification dropdown on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    if (showNotifications) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

  // Close sidebar on outside click (mobile)
  React.useEffect(() => {
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) setSidebarOpen(false);
    };
    if (sidebarOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sidebarOpen]);

  // Close sidebar on route change (mobile)
  React.useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (!token) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read_status);
    await Promise.all(unread.map(n => axios.patch(`${API}/bookings/notifications/${n.id}/read`).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
  };

  const handleMarkOneRead = async (id) => {
    await axios.patch(`${API}/bookings/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
  };

  const handleClearAll = async () => {
    await axios.delete(`${API}/bookings/notifications/clear?user_id=${user.id}`).catch(() => {});
    setNotifications([]);
    setShowNotifications(false);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const employeeNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Book Transport', path: '/book', icon: Truck },
    { name: 'My Bookings', path: '/my-bookings', icon: ClipboardList },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];
  const adminNav = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Employees', path: '/admin/employees', icon: Users },
    { name: 'Vehicles', path: '/admin/vehicles', icon: Car },
    { name: 'Drivers', path: '/admin/drivers', icon: Truck },
    { name: 'Bookings', path: '/admin/bookings', icon: ClipboardList },
    { name: 'Ext. Requests', path: '/admin/external', icon: AlertCircle },
    { name: 'Routes', path: '/admin/routes', icon: MapPin },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isAdmin = user.role === 'ADMIN';
  const navItems = isAdmin ? adminNav : employeeNav;
  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };
  const currentTitle = [...employeeNav, ...adminNav].find(i => isActive(i.path))?.name || 'Revexy';

  // Mobile bottom nav items (max 5 for mobile)
  const mobileNav = isAdmin
    ? [
        { name: 'Overview', path: '/admin', icon: LayoutDashboard },
        { name: 'Vehicles', path: '/admin/vehicles', icon: Car },
        { name: 'Bookings', path: '/admin/bookings', icon: ClipboardList },
        { name: 'Routes', path: '/admin/routes', icon: MapPin },
        { name: 'More', path: null, icon: Menu, action: () => setSidebarOpen(true) },
      ]
    : [
        { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Book', path: '/book', icon: Truck },
        { name: 'Trips', path: '/my-bookings', icon: ClipboardList },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700/60 flex-shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-black text-gray-900 dark:text-white leading-none tracking-tight">Revexy</h1>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 font-medium tracking-wide uppercase">Transport Platform</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className={`px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 ${
          isAdmin
            ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50'
        }`}>
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-sm ${
            isAdmin ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            {user.name?.[0] || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${
              isAdmin ? 'text-violet-500 dark:text-violet-400' : 'text-blue-500 dark:text-blue-400'
            }`}>{isAdmin ? 'Admin' : 'Employee'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link key={item.name} to={item.path}
              className={`sidebar-link ${active ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.name}
              </div>
              {active && <ChevronRight className="h-3 w-3 opacity-50 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-700/60 flex-shrink-0">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900 transition-colors duration-300">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 bg-white dark:bg-slate-800/90 shadow-sm border-r border-gray-100 dark:border-slate-700/60 transition-colors duration-300" style={{ width: 260, minHeight: '100vh' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          {/* Drawer */}
          <div ref={sidebarRef} className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Topbar ── */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm px-4 lg:px-8 py-3 lg:py-4 flex justify-between items-center sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white leading-tight">{currentTitle}</h2>
              <p className="text-[11px] text-gray-400 dark:text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              <div className={`absolute top-12 right-0 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden transition-all duration-200 transform origin-top-right ${
                showNotifications ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
              }`}>
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-between items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && <span className="text-[11px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">{unreadCount} new</span>}
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline whitespace-nowrap">
                        <CheckCheck className="h-3 w-3" /> Mark read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={handleClearAll} className="text-[11px] text-gray-400 hover:text-red-500 font-semibold whitespace-nowrap transition-colors">
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-8 w-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 dark:text-slate-500">No notifications yet</p>
                    </div>
                  ) : notifications.slice(0, 10).map(n => (
                    <div key={n.id} onClick={() => handleMarkOneRead(n.id)}
                      className={`p-3.5 border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${!n.read_status ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {!n.read_status && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                        <div className={`flex-1 min-w-0 ${n.read_status ? 'pl-4' : ''}`}>
                          <p className={`text-xs leading-relaxed ${!n.read_status ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-300'}`}>
                            {n.message}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{formatTime(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-center">
                  <button onClick={() => { setShowNotifications(false); fetchNotifications(); }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden sm:block h-7 w-px bg-gray-200 dark:bg-slate-700" />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{user.name}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">{user.role}</p>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-auto relative">
          {/* Real-time Toast */}
          {toast && (
            <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[100] toast-enter">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30">
                <div className="bg-white/20 p-1.5 rounded-xl flex-shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold flex-1 leading-relaxed">{toast}</p>
                <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-t border-gray-200/60 dark:border-slate-700/60 shadow-xl">
          <div className="grid grid-cols-4 h-16 px-1">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const active = item.path ? isActive(item.path) : false;
              if (item.action) {
                return (
                  <button key={item.name} onClick={item.action}
                    className="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-slate-500">
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">{item.name}</span>
                  </button>
                );
              }
              return (
                <Link key={item.name} to={item.path}
                  className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                    active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                  }`}
                >
                  <div className={`relative p-1.5 rounded-xl transition-all ${
                    active ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}>
                    <Icon className="h-5 w-5" />
                    {item.name === 'Home' && unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
