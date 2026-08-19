import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Bell, ChevronDown, User, LogOut, Search, BookOpen,
  Clock, Heart, MessageSquare, LayoutDashboard, Menu, X,
  MapPin, Car
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Dropdown states — all start CLOSED
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const isSeeker = user?.role === 'seeker';

  // Seeker-specific navigation links that appear in the top bar (Matches Seeker App)
  const seekerLinks = [
    { label: 'Discover', view: null, icon: <Search className="h-4 w-4" /> },
    { label: 'Bookings', view: 'bookings', icon: <BookOpen className="h-4 w-4" /> },
    { label: 'Wallet', view: 'wallet', icon: <Wallet className="h-4 w-4" /> },
    { label: 'Profile', view: 'profile', icon: <User className="h-4 w-4" /> },
  ];

  // Build URL for seeker tab link
  const seekerLinkHref = (view) =>
    view ? `/seeker/dashboard?view=${view}` : '/seeker/dashboard';

  // Check if seeker tab is currently active
  const isSeekerLinkActive = (view) => {
    if (!location.pathname.startsWith('/seeker/dashboard')) return false;
    const currentView = searchParams.get('view');
    if (view === null) return !currentView || currentView === 'discover' || currentView === 'find_parking' || currentView === 'dashboard';
    return currentView === view;
  };

  // Sample notifications (in production, fetch from API / context)
  const notifications = [
    { id: 1, text: 'Your booking at Indiranagar spot has been confirmed', time: '5m ago', read: false },
    { id: 2, text: 'Payment of ₹450 processed successfully', time: '1h ago', read: false },
    { id: 3, text: 'New parking space available near your area', time: '3h ago', read: true },
  ];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-stretch justify-between h-[60px]">

        {/* ── LOGO ──────────────────────────────────────────────────────── */}
        <Link
          to={user ? `/${user.role}/dashboard` : '/'}
          className="flex items-center gap-2 pr-5 mr-2 border-r border-slate-100 shrink-0"
        >
          {/* Icon badge */}
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white font-black text-base leading-none">P</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-[15px] text-slate-800 tracking-tight">
              Planto<span className="text-emerald-500">park</span>
            </span>
            <span className="text-[8.5px] uppercase tracking-widest text-slate-400 font-semibold -mt-0.5">
              Smart Park. Smart Earn.
            </span>
          </div>
        </Link>

        {/* ── SEEKER NAV LINKS (desktop) ─────────────────────────────── */}
        {isSeeker && (
          <div className="hidden md:flex items-stretch gap-0">
            {seekerLinks.map((link) => {
              const active = isSeekerLinkActive(link.view);
              return (
                <Link
                  key={link.label}
                  to={seekerLinkHref(link.view)}
                  className={`relative flex items-center px-4 text-sm font-medium transition-colors ${
                    active
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500 rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── PUBLIC links (not logged in) ──────────────────────────── */}
        {!user && (
          <div className="hidden md:flex items-center gap-2 ml-4">
            <Link to="/" className={`px-4 py-2 rounded-xl text-[15px] font-bold transition-all ${location.pathname === '/' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
              Home
            </Link>
            <Link to="/about" className={`px-4 py-2 rounded-xl text-[15px] font-bold transition-all ${location.pathname === '/about' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
              About Us
            </Link>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── RIGHT SECTION ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              {/* Role badge pill */}
              <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                user.role === 'seeker'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : user.role === 'owner'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {user.role === 'seeker' ? 'I want parking' : user.role === 'owner' ? 'I have parking' : 'Admin'}
              </span>

              {/* ── NOTIFICATION BELL ─────────────────────────────────── */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
                  className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-black leading-none">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(320px,90vw)] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fadeIn">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-slate-50 ${!n.read ? 'bg-emerald-50/20' : ''}`}
                        >
                          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed ${n.read ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
                              {n.text}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-slate-100 text-center bg-slate-50/50">
                      <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── PROFILE DROPDOWN ──────────────────────────────────── */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-slate-200 hover:border-emerald-300 hover:bg-slate-50 transition-all"
                  aria-label="Profile menu"
                >
                  {/* Avatar circle with initial */}
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-slate-700">
                    {user.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fadeIn">
                    {/* User info header */}
                    <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        user.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        user.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {user.status === 'verified' ? '✓ Verified Account' :
                         user.status === 'pending' ? '⏳ Pending Approval' : '✗ Rejected'}
                      </span>
                    </div>

                    {/* Profile link (seeker only) */}
                    {isSeeker && (
                      <Link
                        to="/seeker/dashboard?view=profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        My Profile
                      </Link>
                    )}

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors border-t border-slate-100"
                    >
                      <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                        <LogOut className="h-3.5 w-3.5 text-rose-400" />
                      </div>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger (seeker only — admin/owner don't show Navbar) */}
              {isSeeker && (
                <button
                  onClick={() => setMobileOpen(v => !v)}
                  className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                  aria-label="Menu"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}
            </>
          ) : (
            /* Not logged in */
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-slate-600 hover:text-slate-900 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm whitespace-nowrap"
              >
                Get Started
              </Link>
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE SEEKER NAV DRAWER ─────────────────────────────────────── */}
      {mobileOpen && isSeeker && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 shadow-lg">
          {seekerLinks.map((link) => {
            const active = isSeekerLinkActive(link.view);
            return (
              <Link
                key={link.label}
                to={seekerLinkHref(link.view)}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className={active ? 'text-emerald-500' : 'text-slate-400'}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
          <Link
            to="/seeker/dashboard?view=profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <User className="h-4 w-4 text-slate-400" />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors border-t border-slate-100 mt-2 pt-3"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}

      {/* ── MOBILE PUBLIC NAV DRAWER ─────────────────────────────────────── */}
      {mobileOpen && !user && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 shadow-lg">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${location.pathname === '/' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/50'}`}
          >
            Home
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${location.pathname === '/about' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/50'}`}
          >
            About Us
          </Link>
          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 border-t border-slate-100 mt-2 pt-3"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            Register Free
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
