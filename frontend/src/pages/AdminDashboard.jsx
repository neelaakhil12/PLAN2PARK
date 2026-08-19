import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Users, MapPin, Car, DollarSign, TrendingUp, UserCheck,
  UserX, CheckCircle, XCircle, Activity, Layers, BarChart3,
  Bell, ChevronDown, Calendar, Search, LogOut, Settings,
  AlertTriangle, ShieldAlert, Heart, ClipboardList, HelpCircle, Star, MessageSquare,
  Menu, X, Send, Tag, Sparkles, Megaphone
} from 'lucide-react';
import Invoice from './Invoice';

const AdminDashboard = () => {
  const { token, logout, API_URL, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active section from URL pathname
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1];
  // Default to 'overview' when on /admin/dashboard or /admin/dashboard/overview
  const currentView = (lastSegment === 'dashboard' || lastSegment === 'overview' || !lastSegment)
    ? 'overview'
    : lastSegment;

  const [analytics, setAnalytics] = useState(null);
  const [revenueStartDate, setRevenueStartDate] = useState('');
  const [revenueEndDate, setRevenueEndDate] = useState('');
  const [revenueReport, setRevenueReport] = useState(null);
  const [ownerSummaries, setOwnerSummaries] = useState([]);
  const [payoutOwnerId, setPayoutOwnerId] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotPrefixes, setSlotPrefixes] = useState({});
  const [resolvingId, setResolvingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [bellOpen, setBellOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterSpaceId, setFilterSpaceId] = useState('');
  const [promoBroadcasts, setPromoBroadcasts] = useState([]);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('');
  const [promoAudience, setPromoAudience] = useState('seeker');
  const [promoValidUntil, setPromoValidUntil] = useState('');
  const [broadcastingPromo, setBroadcastingPromo] = useState(false);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close bell dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-close sidebar on small screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [rAnal, rUsers, rSpaces, rBookings, rComplaints, rReviews] = await Promise.all([
        fetch(`${API_URL}/analytics/admin`, { headers }),
        fetch(`${API_URL}/auth/admin/users`, { headers }),
        fetch(`${API_URL}/spaces/pending`, { headers }),
        fetch(`${API_URL}/bookings/admin-bookings`, { headers }), // lists bookings
        fetch(`${API_URL}/complaints`, { headers }),
        fetch(`${API_URL}/reviews`, { headers }),
      ]);
      let userList = [];
      let spaceList = [];
      let bookingList = [];
      if (rAnal.ok) setAnalytics(await rAnal.json());
      if (rUsers.ok) {
        const data = await rUsers.json();
        setUsers(data);
        userList = data;
      }
      if (rSpaces.ok) {
        const data = await rSpaces.json();
        setSpaces(data);
        spaceList = data;
      }
      if (rBookings.ok) {
        const data = await rBookings.json();
        setBookings(data);
        bookingList = data;
      }
      if (rComplaints.ok) setComplaints(await rComplaints.json());
      if (rReviews.ok) setReviews(await rReviews.json());

      // Generate actual live dynamic notifications based on real DB records
      const dynamicNotifs = [];

      // 1. Pending Approvals (Users)
      userList.forEach(u => {
        if (u.status === 'pending') {
          dynamicNotifs.push({
            id: `u-${u._id}`,
            text: `Approval required for user registration: ${u.name} (${u.role === 'owner' ? 'Host' : 'Seeker'})`,
            time: new Date(u.createdAt).toLocaleDateString(),
            read: false
          });
        }
      });

      // 2. Pending Approvals (Parking Spaces)
      spaceList.forEach(s => {
        if (s.status === 'pending') {
          dynamicNotifs.push({
            id: `s-${s._id}`,
            text: `Approval required for new parking space listing: ${s.address}`,
            time: 'Needs Prefix',
            read: false
          });
        }
      });

      // 3. Paid Bookings (Confirmations)
      bookingList.forEach(b => {
        if (b.status === 'paid') {
          dynamicNotifs.push({
            id: `b-paid-${b._id}`,
            text: `Booking Details Confirmed: Payment of ₹${b.totalAmount} verified for slot ${b.slotId || 'A-1'} (${b.seekerName})`,
            time: new Date(b.createdAt).toLocaleDateString(),
            read: true
          });
        } else if (b.status === 'pending_approval') {
          dynamicNotifs.push({
            id: `b-pend-${b._id}`,
            text: `Awaiting Host Allotment: Booking request from ${b.seekerName} for spot ${b.spaceId?.address || 'Parking space'}`,
            time: new Date(b.createdAt).toLocaleDateString(),
            read: false
          });
        }
      });

      // Default mock notifications if DB is empty
      if (dynamicNotifs.length === 0) {
        dynamicNotifs.push({ id: 'mock-1', text: 'All system checks verified. Zero pending notifications.', time: 'Just now', read: true });
      }

      setNotifications(dynamicNotifs);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const fetchRevenueData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const repRes = await fetch(`${API_URL}/bookings/revenue-report?startDate=${revenueStartDate}&endDate=${revenueEndDate}`, { headers });
      if (repRes.ok) {
        setRevenueReport(await repRes.json());
      }
      const ownRes = await fetch(`${API_URL}/bookings/owner-revenue-summary`, { headers });
      if (ownRes.ok) {
        setOwnerSummaries(await ownRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentView === 'revenue' && token) {
      fetchRevenueData();
    }
    if (currentView === 'promotions' && token) {
      fetchPromotions();
    }
  }, [currentView, revenueStartDate, revenueEndDate, token]);

  const handlePayoutSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) return alert('Please enter a valid payout amount');
    setPayoutLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings/payout-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ownerId: payoutOwnerId,
          amount: Number(payoutAmount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Payout recorded successfully');
        setPayoutOwnerId(null);
        setPayoutAmount('');
        fetchRevenueData();
      } else {
        alert(data.message || 'Payout recording failed');
      }
    } catch (e) {
      console.error(e);
      alert('Error recording payout');
    }
    setPayoutLoading(false);
  };

  const handleUserVerify = async (userId, status) => {
    const res = await fetch(`${API_URL}/auth/admin/users/${userId}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { alert(`User status updated to ${status}`); fetchData(); }
  };

  const handleSpaceApprove = async (spaceId, status) => {
    const prefix = slotPrefixes[spaceId] || 'Slot-';
    const res = await fetch(`${API_URL}/spaces/${spaceId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, slotPrefix: prefix }),
    });
    if (res.ok) { alert(`Space listing approved successfully!`); fetchData(); }
  };

  const handleResolveComplaint = async (id) => {
    const res = await fetch(`${API_URL}/complaints/${id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reply: replyText, status: 'resolved' }),
    });
    if (res.ok) { alert('Complaint ticket marked resolved.'); setResolvingId(null); setReplyText(''); fetchData(); }
  };

  const fetchPromotions = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/admin/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPromoBroadcasts(data.broadcasts || []);
      }
    } catch (e) {
      console.log('Error loading promo broadcasts', e);
    }
  };

  const handleBroadcastPromo = async (e) => {
    e.preventDefault();
    if (!promoTitle || !promoMessage) {
      alert('Please provide Title and Message for the broadcast');
      return;
    }
    setBroadcastingPromo(true);
    try {
      const res = await fetch(`${API_URL}/notifications/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: promoTitle,
          message: promoMessage,
          promoCode,
          discountPercent: promoDiscount,
          targetRole: promoAudience,
          validUntil: promoValidUntil || 'Limited Time Offer',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('🎉 Promotional offer broadcasted successfully to all users!');
        setPromoTitle('');
        setPromoMessage('');
        setPromoCode('');
        setPromoDiscount('');
        setPromoValidUntil('');
        fetchPromotions();
      } else {
        alert(data.message || 'Failed to broadcast');
      }
    } catch (err) {
      alert('Error broadcasting notification: ' + err.message);
    } finally {
      setBroadcastingPromo(false);
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Delete this promotional broadcast?')) return;
    try {
      const res = await fetch(`${API_URL}/notifications/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPromoBroadcasts(prev => prev.filter(p => p._id !== id));
      }
    } catch (e) {
      console.log('Error deleting promo', e);
    }
  };

  // SVG Line Chart builder for Bookings & Revenue
  const renderSVGLineChart = () => {
    if (!analytics || !analytics.chartData) return null;
    const { bookings: bData, revenue: rData, labels } = analytics.chartData;
    const maxVal = Math.max(...rData, 100);
    const height = 180;
    const width = 500;
    const points = rData.map((val, idx) => {
      const x = (idx / (rData.length - 1)) * (width - 60) + 30;
      const y = height - (val / maxVal) * (height - 40) - 20;
      return `${x},${y}`;
    }).join(' ');

    const bPoints = bData.map((val, idx) => {
      const maxB = Math.max(...bData, 5);
      const x = (idx / (bData.length - 1)) * (width - 60) + 30;
      const y = height - (val / maxB) * (height - 40) - 20;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <line key={i} x1="30" y1={height - r * (height - 40) - 20} x2={width - 30} y2={height - r * (height - 40) - 20} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        {/* Bookings path (Green) */}
        <polyline fill="none" stroke="#10b981" strokeWidth="3" points={bPoints} strokeLinecap="round" strokeLinejoin="round" />
        {/* Revenue path (Blue) */}
        <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
        {/* Labels */}
        {labels.map((lbl, idx) => {
          const x = (idx / (labels.length - 1)) * (width - 60) + 30;
          return <text key={idx} x={x} y={height - 2} textAnchor="middle" className="text-[9px] fill-slate-400 font-bold">{lbl}</text>;
        })}
      </svg>
    );
  };

  // SVG Pie Chart builder for Parking Status distribution
  const renderSVGPieChart = () => {
    if (!analytics || !analytics.parkingDistribution) return null;
    const { available, booked, blocked, inactive } = analytics.parkingDistribution;
    const total = available + booked + blocked + inactive || 10;
    
    // Simple pie chart visual arcs using dasharray
    const pAvailable = (available / total) * 100;
    const pBooked = (booked / total) * 100;
    const pBlocked = (blocked / total) * 100;
    const pInactive = (inactive / total) * 100;

    return (
      <div className="relative h-44 w-44 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4.2" />
          
          {/* Available circle (Green) */}
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4.2"
            strokeDasharray={`${pAvailable} ${100 - pAvailable}`} strokeDashoffset="0" />
          
          {/* Booked circle (Blue) */}
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4.2"
            strokeDasharray={`${pBooked} ${100 - pBooked}`} strokeDashoffset={-pAvailable} />

          {/* Blocked circle (Amber) */}
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f59e0b" strokeWidth="4.2"
            strokeDasharray={`${pBlocked} ${100 - pBlocked}`} strokeDashoffset={-(pAvailable + pBooked)} />

          {/* Inactive circle (Rose) */}
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f43f5e" strokeWidth="4.2"
            strokeDasharray={`${pInactive} ${100 - pInactive}`} strokeDashoffset={-(pAvailable + pBooked + pBlocked)} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xl font-black text-slate-800">{total}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Slots</span>
        </div>
      </div>
    );
  };

  // Section title map for topbar
  const sectionTitles = {
    overview: 'Dashboard Overview',
    users: 'Users Management',
    owners: 'Place Owners Verifications',
    spaces: 'Parking Spaces',
    bookings: 'Platform Bookings',
    revenue: 'Revenue Reports',
    complaints: 'Complaints',
    reviews: 'Support Reviews',
    notifications: 'Notifications',
    promotions: 'Promotional Offers & Push Broadcasts',
  };

  const menuItems = [
    { id: 'overview', path: '/admin/dashboard', label: 'Dashboard', icon: <Layers className="h-4.5 w-4.5" /> },
    { id: 'promotions', path: '/admin/promotions', label: '📢 Promotional Offers', icon: <Megaphone className="h-4.5 w-4.5 text-amber-400" /> },
    { id: 'users', path: '/admin/users', label: 'Users Management', icon: <Users className="h-4.5 w-4.5" /> },
    { id: 'owners', path: '/admin/owners', label: 'Place Owners verifications', icon: <UserCheck className="h-4.5 w-4.5" /> },
    { id: 'spaces', path: '/admin/spaces', label: 'Parking Spaces', icon: <MapPin className="h-4.5 w-4.5" /> },
    { id: 'bookings', path: '/admin/bookings', label: 'Platform Bookings', icon: <Car className="h-4.5 w-4.5" /> },
    { id: 'revenue', path: '/admin/revenue', label: 'Revenue & Invoices', icon: <DollarSign className="h-4.5 w-4.5" /> },
    { id: 'complaints', path: '/admin/complaints', label: 'Complaints', icon: <AlertTriangle className="h-4.5 w-4.5" /> },
    { id: 'reviews', path: '/admin/reviews', label: 'Support Reviews', icon: <MessageSquare className="h-4.5 w-4.5" /> },
    { id: 'notifications', path: '/admin/notifications', label: 'Notifications', icon: <Bell className="h-4.5 w-4.5" /> },
  ];  return (
    <div className="h-screen w-screen bg-slate-50 flex font-sans overflow-hidden">

      {/* ─── MOBILE BACKDROP ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Invoice Modal Overlay */}
      {viewingInvoiceId && (
        <Invoice inlineBookingId={viewingInvoiceId} onClose={() => setViewingInvoiceId(null)} />
      )}

      {/* ─── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside
        className={`bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 w-64 fixed inset-y-0 left-0 transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-in-out z-30 flex flex-col border-r border-slate-800/60 shadow-2xl`}
      >
        {/* Logo */}
        <div className="h-16 px-4 border-b border-slate-800/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-lg shadow-amber-500/30">P</div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-black text-white text-sm tracking-tight truncate">PLANTO<span className="text-amber-400">PARK</span></span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Admin Portal</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden h-7 w-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            aria-label="Close Sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {menuItems.map(item => {
            const isActive = currentView === item.id;
            const badgeCount = item.id === 'spaces'
              ? spaces.length
              : item.id === 'users'
              ? users.filter(u => u.status === 'pending').length
              : item.id === 'notifications'
              ? unreadCount
              : 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}>{item.icon}</span>
                <span className="truncate flex-1 text-left">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={`shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center leading-none ${
                    isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white animate-pulse'
                  }`}>{badgeCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-slate-800/60 shrink-0">
          <div className="px-3 py-2 mb-1">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Logged in as</p>
            <p className="text-xs font-bold text-slate-300 truncate mt-0.5">{user?.name || 'Super Admin'}</p>
          </div>
          <button
            onClick={() => { logout(); window.location.href = '/admin/login'; }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN WRAPPER ─────────────────────────────────────────────────── */}
      <div className={`flex-grow min-w-0 h-screen flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="h-9 w-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0 border border-slate-200"
              aria-label="Toggle Sidebar"
            >
              {sidebarOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
            <h2 className="font-black text-slate-800 text-sm sm:text-base capitalize truncate leading-none">
              {sectionTitles[currentView] || 'Dashboard Overview'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notification Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(prev => !prev)}
                className="relative h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 top-11 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <span className="font-black text-slate-800 text-sm">Notifications</span>
                      {unreadCount > 0 && <span className="ml-2 text-[9px] text-red-500 font-bold">{unreadCount} unread</span>}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                        className="text-[10px] text-amber-600 font-bold hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-6">No notifications</p>
                    ) : notifications.map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-amber-50/50' : ''}`}
                        onClick={() => setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))}
                      >
                        <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.read ? 'bg-slate-200' : 'bg-red-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug ${n.read ? 'text-slate-500' : 'text-slate-800 font-semibold'}`}>{n.text}</p>
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5 inline-block">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                    <button
                      onClick={() => { setBellOpen(false); navigate('/admin/notifications'); }}
                      className="text-xs text-amber-600 font-bold hover:underline"
                    >
                      View All Notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{user?.name || 'Super Admin'}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Admin</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black text-sm">
                {(user?.name?.[0] || 'A').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* ── VIEW: PROMOTIONAL OFFERS & PUSH BROADCASTS ─────────────────── */}
              {currentView === 'promotions' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-amber-500" />
                        Promotional Offers & Push Broadcasts
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">Broadcast discounts, coupon codes, and special parking alerts directly to Seeker app users.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Compose Broadcast Form */}
                    <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900">Create New Offer Broadcast</h3>
                      </div>

                      <form onSubmit={handleBroadcastPromo} className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Campaign Title *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 🎉 Weekend 20% OFF Special!"
                            value={promoTitle}
                            onChange={(e) => setPromoTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Message / Notification Text *</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="e.g. Book your spot today and get an instant 20% discount on all Hyderabad parking spaces!"
                            value={promoMessage}
                            onChange={(e) => setPromoMessage(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Promo Code</label>
                            <input
                              type="text"
                              placeholder="e.g. PARK20"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Discount %</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="e.g. 20"
                              value={promoDiscount}
                              onChange={(e) => setPromoDiscount(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Audience</label>
                            <select
                              value={promoAudience}
                              onChange={(e) => setPromoAudience(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                            >
                              <option value="seeker">Seeker App Users</option>
                              <option value="owner">Space Owners</option>
                              <option value="all">All Registered Users</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Validity Text</label>
                            <input
                              type="text"
                              placeholder="e.g. Valid this Sunday"
                              value={promoValidUntil}
                              onChange={(e) => setPromoValidUntil(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={broadcastingPromo}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-3 rounded-xl text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {broadcastingPromo ? 'Broadcasting Offer...' : '🚀 Broadcast to All Seeker Users'}
                        </button>
                      </form>
                    </div>

                    {/* Sent Broadcasts History */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                            <Tag className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-black text-slate-900">Active & Past Broadcast Offers</h3>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">{promoBroadcasts.length} Campaigns</span>
                      </div>

                      {promoBroadcasts.length === 0 ? (
                        <div className="py-16 text-center">
                          <Megaphone className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-xs text-slate-400 font-bold">No promotional campaigns broadcasted yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                          {promoBroadcasts.map((promo) => (
                            <div key={promo._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors relative">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9px] font-black uppercase">
                                      {promo.targetRole}
                                    </span>
                                    {promo.promoCode && (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black">
                                        🎟️ {promo.promoCode} {promo.discountPercent ? `(${promo.discountPercent}% OFF)` : ''}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {new Date(promo.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-black text-slate-800">{promo.title}</h4>
                                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{promo.message}</p>
                                </div>
                                <button
                                  onClick={() => handleDeletePromo(promo._id)}
                                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Delete campaign"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW: DASHBOARD OVERVIEW ────────────────────────────────────────── */}
              {currentView === 'overview' && analytics && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {[
                      { title: 'Total Users', value: analytics.users?.total || 0, pct: '+12.5% vs last month', icon: <Users className="h-5 w-5 text-emerald-500" />, color: 'bg-emerald-50' },
                      { title: 'Vehicle Owners', value: analytics.users?.seekers || 0, pct: '+10.3% vs last month', icon: <Car className="h-5 w-5 text-blue-500" />, color: 'bg-blue-50' },
                      { title: 'Place Owners', value: analytics.users?.owners || 0, pct: '+8.7% vs last month', icon: <Layers className="h-5 w-5 text-amber-500" />, color: 'bg-amber-50' },
                      { title: 'Total Parkings', value: analytics.spaces?.total || 0, pct: '+11.2% vs last month', icon: <MapPin className="h-5 w-5 text-indigo-500" />, color: 'bg-indigo-50' },
                      { title: 'Total Bookings', value: analytics.bookings?.total || 0, pct: '+13.6% vs last month', icon: <ClipboardList className="h-5 w-5 text-teal-500" />, color: 'bg-teal-50' },
                      { title: 'Total Revenue', value: `₹${analytics.finances?.totalRevenue || 0}`, pct: '+15.4% vs last month', icon: <DollarSign className="h-5 w-5 text-rose-500" />, color: 'bg-rose-50', highlight: true },
                    ].map((stat, i) => (
                      <div key={i} className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative ${stat.highlight ? 'ring-1 ring-rose-200 bg-gradient-to-tr from-white to-rose-50/10' : ''}`}>
                        <div className={`h-9 w-9 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
                        <p className="text-sm font-bold text-slate-400 leading-tight uppercase tracking-wider text-[10px]">{stat.title}</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{stat.value}</p>
                        <p className="text-[9px] text-emerald-600 font-bold mt-1.5 flex items-center gap-0.5">{stat.pct}</p>
                      </div>
                    ))}
                  </div>

                  {/* Graphs Panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Line Chart */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-extrabold text-slate-800">Bookings &amp; Revenue Trend</h3>
                          <p className="text-slate-400 text-xs mt-0.5">Platform volume analytics (last 10 days)</p>
                        </div>
                        <div className="flex gap-4 text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Bookings</span>
                          <span className="flex items-center gap-1.5 text-blue-600"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Revenue (₹)</span>
                        </div>
                      </div>
                      <div className="h-44 flex items-end justify-center w-full">
                        {renderSVGLineChart()}
                      </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-800">Parking Status</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Realtime platform-wide slot distribution</p>
                      </div>
                      <div className="py-4">
                        {renderSVGPieChart()}
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold border-t border-slate-100 pt-4">
                        <div className="text-emerald-500">Available<br /><span className="text-slate-700 font-black text-xs">{analytics.parkingDistribution?.available || 0}</span></div>
                        <div className="text-blue-500">Booked<br /><span className="text-slate-700 font-black text-xs">{analytics.parkingDistribution?.booked || 0}</span></div>
                        <div className="text-amber-500">Blocked<br /><span className="text-slate-700 font-black text-xs">{analytics.parkingDistribution?.blocked || 0}</span></div>
                        <div className="text-rose-500">Inactive<br /><span className="text-slate-700 font-black text-xs">{analytics.parkingDistribution?.inactive || 0}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row Dashboard Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { title: 'Pending Verifications', count: users.filter(u => u.status === 'pending').length, color: 'border-blue-200 text-blue-600 bg-blue-50/30', view: 'users' },
                      { title: 'Active Complaints', count: complaints.filter(c => c.status !== 'resolved').length, color: 'border-amber-200 text-amber-600 bg-amber-50/30', view: 'complaints' },
                      { title: 'Parkings Awaiting Approval', count: spaces.length, color: 'border-indigo-200 text-indigo-600 bg-indigo-50/30', view: 'spaces' },
                      { title: "Today's Revenue Payouts", count: `₹${analytics.finances?.todayRevenue || 0}`, color: 'border-emerald-200 text-emerald-600 bg-emerald-50/30', view: 'revenue' },
                      { title: 'Cancelled Bookings', count: analytics.bookings?.cancelled || 0, color: 'border-rose-200 text-rose-500 bg-rose-50/30', view: 'bookings' },
                    ].map((card, idx) => (
                      <div key={idx} className={`border rounded-2xl p-5 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-0.5 cursor-pointer ${card.color}`} onClick={() => navigate(`/admin/dashboard/${card.view}`)}>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 leading-tight">{card.title}</p>
                          <p className="text-2xl font-black mt-1.5">{card.count}</p>
                        </div>
                        <ChevronDown className="h-5 w-5 -rotate-90 opacity-40" />
                      </div>
                    ))}
                  </div>

                  {/* Recent Bookings List */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-extrabold text-slate-800">Recent Booking Log</h3>
                      <button onClick={() => navigate('/admin/dashboard/bookings')} className="text-xs text-emerald-600 font-bold hover:underline">View All Platform Bookings →</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase">
                          <tr>
                            <th className="px-6 py-3.5">Seeker Name</th>
                            <th className="px-6 py-3.5">Vehicle plate</th>
                            <th className="px-6 py-3.5">Allotted Spot</th>
                            <th className="px-6 py-3.5">Duration</th>
                            <th className="px-6 py-3.5">Fee Paid</th>
                            <th className="px-6 py-3.5">Admin Commission (10%)</th>
                            <th className="px-6 py-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {analytics.recentBookings?.length === 0 ? (
                            <tr><td colSpan="7" className="text-center py-8 text-slate-400">No recent bookings.</td></tr>
                          ) : analytics.recentBookings?.map(b => (
                            <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-slate-800 font-bold">{b.seekerName}</td>
                              <td className="px-6 py-4 font-mono font-bold text-slate-600 text-xs uppercase">{b.vehicleNumber}</td>
                              <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{b.spaceId?.address || 'Deleted Space'}</td>
                              <td className="px-6 py-4 text-slate-500">{b.hours} hrs</td>
                              <td className="px-6 py-4 font-bold text-slate-900">₹{b.totalAmount}</td>
                              <td className="px-6 py-4 font-bold text-emerald-600">₹{b.adminCommission}</td>
                              <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ── VIEW: USERS MANAGEMENT ─────────────────────────────────── */}
              {currentView === 'users' && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fadeIn">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-lg">Platform User Directory</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Approve seeker vehicle owners and place host registrations.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-400 text-xs uppercase">
                        <tr>
                          <th className="px-6 py-3">User Details</th>
                          <th className="px-6 py-3">Phone</th>
                          <th className="px-6 py-3">System Role</th>
                          <th className="px-6 py-3">Mail Verified</th>
                          <th className="px-6 py-3">Current Status</th>
                          <th className="px-6 py-3">Registered date</th>
                          <th className="px-6 py-3">Verify actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {users.length === 0 ? (
                          <tr><td colSpan="7" className="text-center py-10 text-slate-400">No registered users.</td></tr>
                        ) : users.map(u => (
                          <tr key={u._id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {u.profileImage ? (
                                  <img src={u.profileImage} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase border border-slate-200 shrink-0">
                                    {u.name?.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-slate-900">{u.name}</p>
                                  <p className="text-xs text-slate-400">{u.email}</p>
                                  {u.driverLicenseImage && (
                                    <a href={u.driverLicenseImage} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-0.5 inline-block">
                                      View License
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{u.contact}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${u.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{u.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              {u.isEmailVerified 
                                ? <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Verified</span>
                                : <span className="text-amber-500 text-xs font-bold">Pending OTP</span>
                              }
                            </td>
                            <td className="px-6 py-4"><StatusBadge status={u.status} /></td>
                            <td className="px-6 py-4 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              {u.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <button onClick={() => handleUserVerify(u._id, 'verified')} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">Approve</button>
                                  <button onClick={() => handleUserVerify(u._id, 'rejected')} className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">Reject</button>
                                </div>
                              ) : <span className="text-slate-300 text-xs">Reviewed</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── VIEW: PLACE OWNERS VERIFICATIONS ───────────────────────── */}
              {currentView === 'owners' && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fadeIn">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-lg">Host Verification Panel</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Filter of place hosts awaiting manual business or owner checks.</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {users.filter(u => u.role === 'owner').map(owner => (
                        <div key={owner._id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-bold text-slate-800 text-base">{owner.name}</h4>
                              <StatusBadge status={owner.status} />
                            </div>
                            <p className="text-slate-500 text-sm">{owner.email}</p>
                            <p className="text-slate-500 text-sm">Contact: {owner.contact}</p>
                            <p className="text-[10px] text-slate-400 mt-2">Registered: {new Date(owner.createdAt).toLocaleString()}</p>
                          </div>
                          {owner.status === 'pending' && (
                            <div className="flex gap-2 border-t border-slate-200/50 pt-4 mt-4">
                              <button onClick={() => handleUserVerify(owner._id, 'verified')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs">Approve Host</button>
                              <button onClick={() => handleUserVerify(owner._id, 'rejected')} className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-2 rounded-xl text-xs border border-rose-200">Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW: PARKING SPACES APPROVALS ─────────────────────────── */}
              {currentView === 'spaces' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg">Awaiting Parking Approvals</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Define slot prefixes and assign numbers to verify listings.</p>
                    </div>
                  </div>
                  {spaces.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                      <CheckCircle className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-bold">No parking space listings awaiting approval.</p>
                    </div>
                  ) : spaces.map(space => (
                    <div key={space._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                      <img src={space.image} alt="space photo" className="w-full md:w-56 h-48 md:h-auto object-cover border-r border-slate-100" />
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-100">{space.location}</span>
                            <span className="text-rose-500 font-bold text-sm">₹{space.pricePerHour}/hr</span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-lg">{space.address}</h4>
                          <p className="text-slate-400 text-xs mt-1">Host: <strong className="text-slate-600">{space.ownerId?.name}</strong> ({space.ownerId?.email})</p>
                          <p className="text-slate-500 text-xs mt-2">Slots Count: <strong className="text-slate-800">{space.totalSlots}</strong> slots</p>
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-4 items-center">
                          <div className="w-full sm:w-44">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Slot ID Prefix</label>
                            <input
                              type="text"
                              placeholder="e.g. MADA-"
                              value={slotPrefixes[space._id] || ''}
                              onChange={e => setSlotPrefixes(p => ({ ...p, [space._id]: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                            <button onClick={() => handleSpaceApprove(space._id, 'approved')} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"><CheckCircle className="h-4 w-4" /> Approve &amp; Launch</button>
                            <button onClick={() => handleSpaceApprove(space._id, 'rejected')} className="flex-1 sm:flex-none bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 font-bold px-4 py-2 rounded-xl text-xs"><XCircle className="h-4 w-4 inline mr-1" /> Reject</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── VIEW: PLATFORM BOOKINGS ────────────────────────────────── */}
              {currentView === 'bookings' && (() => {
                const filteredBookings = bookings.filter(b => {
                  const matchDate = filterDate ? new Date(b.createdAt).toISOString().split('T')[0] === filterDate : true;
                  const matchSpace = filterSpaceId ? b.spaceId?._id === filterSpaceId : true;
                  return matchDate && matchSpace;
                });
                
                const uniqueSpaces = Array.from(new Map(bookings.filter(b => b.spaceId).map(b => [b.spaceId._id, b.spaceId])).values());

                return (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fadeIn">
                    <div className="px-6 py-5 border-b border-slate-150 flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg">Unified Platform Booking Log</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Logs of active, completed, and cancelled vehicle slots across the marketplace.</p>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full shrink-0">
                        Total {filteredBookings.length} booking records
                      </span>
                    </div>

                    {/* Filter Panel */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex flex-wrap gap-4 items-center">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Date</label>
                        <input
                          type="date"
                          value={filterDate}
                          onChange={e => setFilterDate(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 cursor-pointer text-slate-700"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Filter by Parking Space</label>
                        <select
                          value={filterSpaceId}
                          onChange={e => setFilterSpaceId(e.target.value)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 cursor-pointer text-slate-750 max-w-xs"
                        >
                          <option value="">All Parking Spaces</option>
                          {uniqueSpaces.map(sp => (
                            <option key={sp._id} value={sp._id}>{sp.address}</option>
                          ))}
                        </select>
                      </div>
                      {(filterDate || filterSpaceId) && (
                        <button
                          onClick={() => { setFilterDate(''); setFilterSpaceId(''); }}
                          className="mt-4 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-3">Commuter</th>
                            <th className="px-6 py-3">Vehicle Plate</th>
                            <th className="px-6 py-3">Parking Spot Address</th>
                            <th className="px-6 py-3">Allotted Slot</th>
                            <th className="px-6 py-3">Duration (Fee)</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Transaction Split</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredBookings.length === 0 ? (
                            <tr><td colSpan="8" className="text-center py-12 text-slate-400">No matching booking logs found.</td></tr>
                          ) : filteredBookings.map(b => (
                            <tr key={b._id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900">{b.seekerName}</p>
                                <p className="text-[10px] text-slate-400">{b.seekerContact}</p>
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-slate-655 text-xs uppercase">{b.vehicleNumber}</td>
                              <td className="px-6 py-4 text-slate-500 truncate max-w-[160px]">
                                <p className="font-bold text-slate-800">{b.spaceId?.address || 'Address Deleted'}</p>
                                <p className="text-[10px] text-slate-450">{b.spaceId?.location || 'Location'}</p>
                              </td>
                              <td className="px-6 py-4">
                                {b.slotId 
                                  ? <span className="bg-emerald-50 text-emerald-750 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">{b.slotId}</span>
                                  : <span className="text-amber-500 font-semibold italic text-xs">Unallotted</span>
                                }
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-slate-600">{b.hours} hrs</p>
                                <p className="text-xs font-bold text-slate-900">₹{b.totalAmount}</p>
                              </td>
                              <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                              <td className="px-6 py-4 text-xs font-bold">
                                <p className="text-emerald-600">Admin (10%): ₹{b.adminCommission || (b.totalAmount * 0.1).toFixed(0)}</p>
                                <p className="text-slate-450 mt-0.5">Host (90%): ₹{b.ownerEarnings || (b.totalAmount * 0.9).toFixed(0)}</p>
                              </td>
                              <td className="px-6 py-4 text-slate-400 text-xs font-medium">{new Date(b.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right">
                                {(b.paymentStatus === 'paid' || b.invoiceId) && (
                                  <button onClick={() => setViewingInvoiceId(b._id)} className="text-blue-600 hover:underline font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                    Invoice
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* ── VIEW: REVENUE REPORTS ─────────────────────────────────── */}
              {currentView === 'revenue' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Date Range Selector */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="text-left">
                      <h3 className="font-extrabold text-slate-800 text-base">Date-Filtered Revenue Report</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Select a start and end date range to dynamically update platform earnings.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">From Date</span>
                        <input
                          type="date"
                          value={revenueStartDate}
                          onChange={(e) => setRevenueStartDate(e.target.value)}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">To Date</span>
                        <input
                          type="date"
                          value={revenueEndDate}
                          onChange={(e) => setRevenueEndDate(e.target.value)}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                        />
                      </div>
                      {(revenueStartDate || revenueEndDate) && (
                        <button
                          onClick={() => {
                            setRevenueStartDate('');
                            setRevenueEndDate('');
                          }}
                          className="mt-4 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          Clear Date Filters
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Transaction Volume</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">
                        ₹{revenueReport ? revenueReport.summary.totalRevenue : (analytics?.finances?.totalRevenue || 0)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Total payments processed by seekers</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm border-emerald-250 bg-emerald-50/10 text-left">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Admin Commission (10%)</p>
                      <p className="text-3xl font-black text-emerald-600 mt-2">
                        ₹{revenueReport ? revenueReport.summary.adminCommission : (analytics?.finances?.totalCommission || 0)}
                      </p>
                      <p className="text-xs text-emerald-500 mt-1">Net platform operating revenue</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Host Share Generated (90%)</p>
                      <p className="text-3xl font-black text-slate-800 mt-2">
                        ₹{revenueReport ? revenueReport.summary.ownerEarnings : (analytics?.finances?.totalOwnerPayout || 0)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Earned by driveway hosts</p>
                    </div>
                  </div>

                  {/* Owner Revenue & Payout Ledger */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between text-left">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg">Host Revenue &amp; Payout Ledger</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Track total host earnings generated (90%), payouts released, and pending balances owed.</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-3">Host / Owner</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Generated Revenue (90%)</th>
                            <th className="px-6 py-3">Paid by Admin</th>
                            <th className="px-6 py-3">Pending Balance</th>
                            <th className="px-6 py-3">Bank Info</th>
                            <th className="px-6 py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {ownerSummaries.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-10 text-slate-400">No host accounts registered.</td></tr>
                          ) : ownerSummaries.map((os) => (
                            <tr key={os.ownerId} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900">{os.name}</p>
                                <p className="text-[10px] text-slate-400">{os.email}</p>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500">{os.contact}</td>
                              <td className="px-6 py-4 font-black text-slate-900">₹{os.totalEarnings}</td>
                              <td className="px-6 py-4 font-semibold text-emerald-600">₹{os.paidAmount}</td>
                              <td className="px-6 py-4 font-black text-amber-600">₹{os.owedAmount}</td>
                              <td className="px-6 py-4 text-xs text-slate-500">
                                {os.bankAccountDetails?.accountNumber ? (
                                  <div>
                                    <p className="font-bold text-slate-700">{os.bankAccountDetails.bankName}</p>
                                    <p className="font-mono">{os.bankAccountDetails.accountNumber}</p>
                                    <p className="font-mono text-[10px]">{os.bankAccountDetails.ifscCode}</p>
                                    <p className="text-[10px] uppercase">{os.bankAccountDetails.accountName}</p>
                                  </div>
                                ) : (
                                  <span className="italic text-slate-400">Not provided</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => {
                                    setPayoutOwnerId(os.ownerId);
                                    setPayoutAmount(os.owedAmount.toString());
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                >
                                  Record Payout
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Transaction Records */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-slate-100 text-left">
                      <h3 className="font-extrabold text-slate-800 text-lg">Detailed Transaction Records</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {revenueStartDate || revenueEndDate
                          ? 'Ledger records matching the selected date range filter.'
                          : 'Real-time ledger entries showing all processed seeker booking payments.'}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-3">Reference ID</th>
                            <th className="px-6 py-3">Paid By (Commuter)</th>
                            <th className="px-6 py-3">Destination (Parking Space)</th>
                            <th className="px-6 py-3">Total Paid</th>
                            <th className="px-6 py-3">Admin Cut (10%)</th>
                            <th className="px-6 py-3">Host Share (90%)</th>
                            <th className="px-6 py-3">Transaction ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {(() => {
                            const txs = revenueReport ? revenueReport.records : bookings.filter((b) => b.status === 'paid' || b.status === 'completed');
                            if (txs.length === 0) {
                              return <tr><td colSpan="8" className="text-center py-10 text-slate-400">No payment transaction records found.</td></tr>;
                            }
                            return txs.map((b) => (
                              <tr key={b._id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-mono text-xs text-slate-500 uppercase">{b._id.slice(-8)}</td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-900">{b.seekerName}</p>
                                  <p className="text-[10px] text-slate-400">{b.seekerContact}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800 truncate max-w-[160px]">{b.spaceId?.address || 'Address Deleted'}</p>
                                  <p className="text-[10px] text-slate-400">{b.spaceId?.location || 'Location'}</p>
                                </td>
                                <td className="px-6 py-4 font-black text-slate-900">₹{b.totalAmount}</td>
                                <td className="px-6 py-4 text-emerald-650 font-bold">₹{b.adminCommission || (b.totalAmount * 0.1).toFixed(2)}</td>
                                <td className="px-6 py-4 text-slate-650 font-bold">₹{b.ownerEarnings || (b.totalAmount * 0.9).toFixed(2)}</td>
                                <td className="px-6 py-4 font-mono text-[10px] text-slate-400 uppercase truncate max-w-[100px]">{b.transactionReference || 'simulated_cash'}</td>
                                <td className="px-6 py-4 text-slate-400 text-xs">{new Date(b.createdAt).toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                  <button onClick={() => setViewingInvoiceId(b._id)} className="text-blue-600 hover:underline font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                    View
                                  </button>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ── VIEW: COMPLAINTS ───────────────────────────────────────── */}
              {currentView === 'complaints' && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fadeIn">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-lg">Complaints &amp; Support Tickets</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Read, review, reply, and resolve customer complaints raised on the platform.</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {complaints.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 font-bold">No active support ticket logs.</p>
                    ) : complaints.map(c => (
                      <div key={c._id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold text-slate-800 text-base">{c.subject}</h4>
                              <p className="text-xs text-slate-400">Raised by: <strong className="text-slate-600">{c.userName}</strong> ({c.userRole})</p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                              c.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : c.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{c.status}</span>
                          </div>
                          <p className="text-slate-600 text-sm mt-3 bg-white border border-slate-200 rounded-xl p-3">{c.description}</p>
                          {c.reply && (
                            <div className="mt-3 bg-emerald-50/30 border border-emerald-100 rounded-xl p-3">
                              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Admin Resolution Reply</p>
                              <p className="text-slate-700 text-sm mt-1">{c.reply}</p>
                            </div>
                          )}
                        </div>

                        {c.status !== 'resolved' && (
                          <div className="mt-4 border-t border-slate-200/50 pt-4">
                            {resolvingId === c._id ? (
                              <div className="space-y-3">
                                <textarea
                                  placeholder="Type response resolution message..."
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl text-sm p-3 focus:outline-none focus:border-emerald-500 h-20"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleResolveComplaint(c._id)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs">Resolve Ticket</button>
                                  <button onClick={() => setResolvingId(null)} className="text-slate-500 text-xs hover:underline">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setResolvingId(c._id)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs">Reply &amp; Resolve</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── VIEW: SUPPORT REVIEWS ──────────────────────────────────── */}
              {currentView === 'reviews' && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fadeIn">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-lg">Customer Reviews Log</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Logs of star ratings and text reviews submitted by commuters for parking services.</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {reviews.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 font-bold">No customer reviews submitted yet.</p>
                    ) : reviews.map(r => (
                      <div key={r._id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{r.spaceId?.address || 'Parking Space'}</h4>
                              <p className="text-[10px] text-slate-400">Reviewed by: <strong className="text-slate-600">{r.seekerName}</strong></p>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: r.rating }).map((_, idx) => (
                                <Star key={idx} className="h-4 w-4 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm italic mt-2 bg-white border border-slate-100 rounded-xl p-3">"{r.comment}"</p>
                          <p className="text-[9px] text-slate-400 text-right mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── VIEW: NOTIFICATIONS ────────────────────────────────────── */}
              {currentView === 'notifications' && (() => {
                const getNotifMeta = (id) => {
                  if (id.startsWith('u-'))       return { label: 'User Approval',    color: 'bg-blue-50 text-blue-600 border-blue-200',    dot: 'bg-blue-500' };
                  if (id.startsWith('s-'))       return { label: 'Space Approval',   color: 'bg-indigo-50 text-indigo-600 border-indigo-200', dot: 'bg-indigo-500' };
                  if (id.startsWith('b-paid-'))  return { label: 'Payment Confirmed', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' };
                  if (id.startsWith('b-pend-'))  return { label: 'Awaiting Allotment', color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500' };
                  return                           { label: 'System',                color: 'bg-slate-50 text-slate-500 border-slate-200',   dot: 'bg-slate-400' };
                };
                return (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-lg">Live Notification Centre</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Real-time alerts from user registrations, space listings, and booking payments.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-bold text-slate-400">{notifications.filter(n => !n.read).length} unread</span>
                          {notifications.some(n => !n.read) && (
                            <button
                              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors"
                            >
                              Mark All Read
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Type Filter Pills */}
                      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex gap-2 flex-wrap">
                        {['All', 'User Approval', 'Space Approval', 'Payment Confirmed', 'Awaiting Allotment'].map(tag => (
                          <span key={tag} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 cursor-default">{tag}</span>
                        ))}
                      </div>

                      <div className="divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="py-16 text-center">
                            <Bell className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-bold">All clear — no notifications right now.</p>
                          </div>
                        ) : notifications.map(n => {
                          const meta = getNotifMeta(n.id);
                          return (
                            <div
                              key={n.id}
                              onClick={() => setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))}
                              className={`px-6 py-4 flex items-start gap-4 cursor-pointer transition-colors ${!n.read ? 'bg-amber-50/30 hover:bg-amber-50' : 'hover:bg-slate-50'}`}
                            >
                              {/* Type dot indicator */}
                              <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${meta.dot}`} />

                              {/* Text */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${meta.color}`}>{meta.label}</span>
                                  {!n.read && <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">● New</span>}
                                </div>
                                <p className={`text-sm leading-snug ${n.read ? 'text-slate-500' : 'text-slate-800 font-semibold'}`}>{n.text}</p>
                                <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">{n.time}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}
        </main>
      </div>

      {/* ── RECORD PAYOUT MODAL ───────────────────────────────────────────── */}
      {payoutOwnerId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative text-left">
            <button onClick={() => setPayoutOwnerId(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <XCircle className="h-6 w-6" />
            </button>
            <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1">Record Owner Payout</h3>
            <p className="text-slate-400 text-xs mb-5">Manually record a processed bank/cash payout. This will reduce the host's pending balance.</p>
            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Payout Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={payoutLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl text-sm shadow transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {payoutLoading ? 'Recording...' : 'Record Payout'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-rose-50 text-rose-600 border-rose-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    allotted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    completed: 'bg-slate-100 text-slate-500 border-slate-200',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-rose-50 text-rose-500 border-rose-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${styles[status] || 'bg-slate-100 text-slate-500'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

export { StatusBadge };
export default AdminDashboard;
