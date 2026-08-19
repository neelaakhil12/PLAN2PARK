import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { StatusBadge } from './AdminDashboard';
import MapPicker from '../components/MapPicker';
import {
  Plus, Trash2, Edit2, DollarSign, Car, Clock,
  Layers, MapPin, CheckCircle, XCircle, Settings,
  LogOut, Star, MessageSquare, User, Bell, Map, Calendar, Eye,
  Menu, X, Phone, Mail, Navigation, Loader2, Camera, ShieldCheck,
  Zap, FileText, Check, AlertCircle, RefreshCw
} from 'lucide-react';
import Invoice from './Invoice';

const OwnerDashboard = () => {
  const { token, API_URL, logout, user, setUser, getImageUrl } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view: 'dashboard', 'orders', 'add_spot', 'profile'
  const currentView = searchParams.get('view') || 'dashboard';
  const setCurrentView = (v) => setSearchParams({ view: v });

  // Data states
  const [spaces, setSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'paid', 'pending'

  // Edit / Active space state
  const [editingSpot, setEditingSpot] = useState(null);
  const [profileImgError, setProfileImgError] = useState(false);

  // Add / Edit Spot Form
  const [spotForm, setSpotForm] = useState({
    title: '',
    address: '',
    city: 'Hyderabad',
    location: 'Hyderabad',
    googleMapsLink: '',
    totalSlots: '5',
    pricePerHour: '50',
    pricePerDay: '400',
    pricePerWeek: '2000',
    pricePerMonth: '6000',
    maxWalletDiscount: '10',
    cancellationPolicy: 'full',
    hasEvCharger: false,
    hasCctv: false,
    isCovered: false,
    imageUrl: '',
    imageFile: null,
    lat: 17.313,
    lng: 78.545,
    suitableVehicles: ['4-wheeler']
  });
  const [submittingSpot, setSubmittingSpot] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  // Profile Form (including Bank Details)
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    contact: user?.contact || '',
    email: user?.email || '',
    profileImage: user?.profileImage || '',
    bankAccountDetails: {
      accountName: user?.bankAccountDetails?.accountName || '',
      accountNumber: user?.bankAccountDetails?.accountNumber || '',
      ifscCode: user?.bankAccountDetails?.ifscCode || '',
      bankName: user?.bankAccountDetails?.bankName || ''
    }
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  // Fetch all owner data from AWS backend
  const fetchOwnerData = async () => {
    if (!token) return;
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [spacesRes, analyticsRes, bookingsRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/spaces/owner/my-spaces`, { headers: h }),
        fetch(`${API_URL}/analytics/owner`, { headers: h }),
        fetch(`${API_URL}/bookings/owner-bookings`, { headers: h }),
        fetch(`${API_URL}/auth/profile`, { headers: h })
      ]);

      if (spacesRes.ok) {
        const spacesData = await spacesRes.json();
        setSpots(Array.isArray(spacesData) ? spacesData : spacesData.spaces || []);
      }

      let calculatedEarnings = 0;
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const bList = Array.isArray(bookingsData) ? bookingsData : [];
        setBookings(bList);
        calculatedEarnings = bList.reduce((sum, b) => {
          const earn = (b.ownerEarnings !== undefined && b.ownerEarnings !== null)
            ? Number(b.ownerEarnings)
            : (b.paymentStatus === 'paid' ? Number(b.totalAmount || 0) : 0);
          return sum + (isNaN(earn) ? 0 : earn);
        }, 0);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        const backendEarnings = Number(analyticsData.earnings || 0);
        setAnalytics(analyticsData);
        setTotalEarnings(calculatedEarnings > 0 ? calculatedEarnings : backendEarnings);
      } else {
        setTotalEarnings(calculatedEarnings);
      }

      if (profileRes.ok) {
        const uData = await profileRes.json();
        if (setUser) setUser(prev => ({ ...prev, ...uData }));
        setProfileForm({
          name: uData.name || '',
          contact: uData.contact || '',
          email: uData.email || '',
          profileImage: uData.profileImage || '',
          bankAccountDetails: {
            accountName: uData.bankAccountDetails?.accountName || '',
            accountNumber: uData.bankAccountDetails?.accountNumber || '',
            ifscCode: uData.bankAccountDetails?.ifscCode || '',
            bankName: uData.bankAccountDetails?.bankName || ''
          }
        });
      }
    } catch (err) {
      console.error('Owner data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, [token, location.search]);

  // Active / Offline Switch Toggle handler
  const handleToggleStatus = async (spotId, currentActiveState) => {
    const newActiveState = !currentActiveState;

    // Optimistic UI update
    setSpots(prev => prev.map(s => s._id === spotId ? { ...s, isActive: newActiveState } : s));

    try {
      const res = await fetch(`${API_URL}/spaces/${spotId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: newActiveState }),
      });
      if (!res.ok) {
        fetchOwnerData(); // Revert on failure
      }
    } catch (err) {
      console.error('Error toggling spot status:', err);
      fetchOwnerData();
    }
  };

  // Delete Spot handler
  const handleDeleteSpot = async (spotId, spotTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${spotTitle || 'this parking space'}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/spaces/${spotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Parking space deleted successfully.');
        fetchOwnerData();
      } else {
        const err = await res.json();
        alert(err.message || 'Could not delete spot');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting spot.');
    }
  };

  // Edit Spot button action (populate form and switch view)
  const handleStartEdit = (spot) => {
    setEditingSpot(spot);
    setSpotForm({
      title: spot.title || '',
      address: spot.address || '',
      city: spot.city || 'Hyderabad',
      location: spot.location || spot.city || 'Hyderabad',
      googleMapsLink: spot.locationLink || spot.googleMapsLink || '',
      totalSlots: String(spot.totalSlots || (spot.slots ? spot.slots.length : 5)),
      pricePerHour: String(spot.pricePerHour !== undefined ? spot.pricePerHour : (spot.hourlyRate || 50)),
      pricePerDay: String(spot.pricePerDay || 400),
      pricePerWeek: String(spot.pricePerWeek || 2000),
      pricePerMonth: String(spot.pricePerMonth || 6000),
      maxWalletDiscount: String(spot.maxWalletDiscount ?? 10),
      cancellationPolicy: spot.cancellationPolicy || 'full',
      hasEvCharger: !!spot.hasEvCharger,
      hasCctv: !!spot.hasCctv,
      isCovered: !!spot.isCovered,
      imageUrl: spot.image || '',
      imageFile: null,
      lat: spot.coordinates?.lat || spot.lat || 17.313,
      lng: spot.coordinates?.lng || spot.lng || 78.545,
      suitableVehicles: spot.suitableVehicles || ['4-wheeler']
    });
    setCurrentView('add_spot');
  };

  // GPS detect for add spot
  const handleDetectGps = () => {
    setLocatingGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            const city = data.address?.city || data.address?.town || data.address?.state_district || 'Hyderabad';
            setSpotForm(p => ({ ...p, lat, lng, address: addr, city, location: city }));
          } catch (e) {
            setSpotForm(p => ({ ...p, lat, lng, address: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})` }));
          } finally {
            setLocatingGps(false);
          }
        },
        () => {
          alert('Could not retrieve GPS location.');
          setLocatingGps(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocatingGps(false);
    }
  };

  // Submit Add / Edit Spot Form
  const handleSpotSubmit = async (e) => {
    e.preventDefault();
    if (!spotForm.title.trim()) {
      alert('Please enter a parking space title.');
      return;
    }
    if (!spotForm.address.trim()) {
      alert('Please enter or pin an address.');
      return;
    }

    setSubmittingSpot(true);
    try {
      const fd = new FormData();
      fd.append('title', spotForm.title);
      fd.append('address', spotForm.address);
      fd.append('city', spotForm.city);
      fd.append('location', spotForm.location || spotForm.city);
      fd.append('pricePerHour', Number(spotForm.pricePerHour || 50));
      fd.append('pricePerDay', Number(spotForm.pricePerDay || 400));
      fd.append('pricePerWeek', Number(spotForm.pricePerWeek || 2000));
      fd.append('pricePerMonth', Number(spotForm.pricePerMonth || 6000));
      fd.append('totalSlots', Number(spotForm.totalSlots || 5));
      fd.append('maxWalletDiscount', Number(spotForm.maxWalletDiscount ?? 10));
      fd.append('cancellationPolicy', spotForm.cancellationPolicy || 'full');
      fd.append('hasEvCharger', spotForm.hasEvCharger);
      fd.append('hasCctv', spotForm.hasCctv);
      fd.append('isCovered', spotForm.isCovered);
      fd.append('lat', spotForm.lat);
      fd.append('lng', spotForm.lng);
      fd.append('suitableVehicles', JSON.stringify(spotForm.suitableVehicles));
      
      if (spotForm.imageFile) {
        fd.append('image', spotForm.imageFile);
      } else if (spotForm.imageUrl) {
        fd.append('imageUrl', spotForm.imageUrl);
      }

      const url = editingSpot ? `${API_URL}/spaces/${editingSpot._id}` : `${API_URL}/spaces`;
      const method = editingSpot ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      const resData = await res.json();
      if (res.ok) {
        alert(editingSpot ? '🎉 Parking space updated successfully!' : '🎉 Parking space listed successfully!');
        setEditingSpot(null);
        setSpotForm({
          title: '', address: '', city: 'Hyderabad', location: 'Hyderabad', googleMapsLink: '',
          totalSlots: '5', pricePerHour: '50', pricePerDay: '400', pricePerWeek: '2000', pricePerMonth: '6000',
          maxWalletDiscount: '10', cancellationPolicy: 'full', hasEvCharger: false, hasCctv: false, isCovered: false,
          imageUrl: '', imageFile: null, lat: 17.313, lng: 78.545, suitableVehicles: ['4-wheeler']
        });
        await fetchOwnerData();
        setCurrentView('dashboard');
      } else {
        alert(resData.message || 'Failed to save space.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting space.');
    } finally {
      setSubmittingSpot(false);
    }
  };

  // Profile update handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        if (setUser) setUser(prev => ({ ...prev, ...data }));
        alert('🎉 Profile & Bank details updated successfully! 💾');
      } else {
        alert(data.message || 'Failed to update profile');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while saving profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password update handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: passwordForm.newPassword })
      });
      if (res.ok) {
        alert('Password changed successfully! 🔒');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to change password.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPassword(false);
    }
  };

  // Filter bookings for Orders view
  const filteredBookings = bookings.filter((b) => {
    if (orderFilter === 'paid') return b.paymentStatus === 'paid' || b.status === 'paid';
    if (orderFilter === 'pending') return b.paymentStatus === 'unpaid' || b.status === 'allotted' || b.status === 'pending_approval';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-800">
      
      {/* ── TOP SECONDARY BAR / VIEW TABS ─────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'orders', label: `📑 Orders (${bookings.length})` },
              { id: 'add_spot', label: editingSpot ? '✏️ Edit Spot' : '➕ Add Spot' },
              { id: 'profile', label: '👤 Profile' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentView(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all shrink-0 cursor-pointer ${
                  currentView === tab.id
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setRefreshing(true); fetchOwnerData(); }}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-black text-emerald-800">
              <span>Earnings:</span>
              <span className="text-emerald-700 font-mono">₹{Number(totalEarnings).toFixed(2).replace(/\.00$/, '')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── VIEW 1: DASHBOARD (MATCHING OWNER APP 1:1) ────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Space Owner Hub <span className="text-xl">🅿️</span>
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">Welcome back, <span className="font-bold text-slate-800 capitalize">{user?.name || 'Owner'}</span>. Manage your spots & earnings.</p>
              </div>
              <button
                onClick={() => { setEditingSpot(null); setCurrentView('add_spot'); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" /> List New Spot
              </button>
            </div>

            {/* 3 Metric Cards matching Mobile App 1:1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Earnings */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <p className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                  ₹{Number(totalEarnings).toFixed(2).replace(/\.00$/, '')}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                  Total Earnings (100% Payout)
                </p>
              </div>

              {/* Total Orders */}
              <div
                onClick={() => setCurrentView('orders')}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-6 shadow-sm cursor-pointer transition-all hover:shadow-md group"
              >
                <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">
                  {bookings.length}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 group-hover:text-emerald-700 transition-colors flex items-center gap-1">
                  Total Orders →
                </p>
              </div>

              {/* Listed Spots */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <p className="text-3xl sm:text-4xl font-black text-blue-600 font-mono">
                  {spaces.length}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                  Listed Spots
                </p>
              </div>
            </div>

            {/* Live Booking Orders Alert Banner */}
            {bookings.length > 0 && (
              <div
                onClick={() => setCurrentView('orders')}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg shadow-emerald-600/20 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:scale-[1.01] transition-transform"
              >
                <div className="min-w-0">
                  <p className="font-black text-base flex items-center gap-2">
                    📑 {bookings.length} Driver Booking(s) Received
                  </p>
                  <p className="text-xs text-emerald-100 font-medium mt-0.5 truncate">
                    Latest: {bookings[0]?.vehicleNumber || 'Vehicle'} • Slot {bookings[0]?.slotId || '1'} • ₹{bookings[0]?.totalAmount || 0}
                  </p>
                </div>
                <span className="bg-white/20 text-white font-extrabold text-xs px-4 py-2 rounded-xl shrink-0 self-start sm:self-auto">
                  View Orders →
                </span>
              </div>
            )}

            {/* Add Spot Promo Banner */}
            <div
              onClick={() => { setEditingSpot(null); setCurrentView('add_spot'); }}
              className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-6 shadow-sm cursor-pointer flex items-center justify-between gap-4 transition-all hover:shadow-md group"
            >
              <div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  + List New Parking Space
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Turn your driveways, vacant plots, and commercial spots into recurring income
                </p>
              </div>
              <span className="h-10 w-10 bg-slate-100 group-hover:bg-emerald-500 group-hover:text-white rounded-2xl flex items-center justify-center text-slate-700 font-bold transition-colors">
                →
              </span>
            </div>

            {/* My Parking Spots Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">My Parking Spots</h2>
                <span className="text-xs font-bold text-slate-400">{spaces.length} properties</span>
              </div>

              {loading ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                  <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">Loading your parking spots...</p>
                </div>
              ) : spaces.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                  <p className="text-4xl">🏢</p>
                  <h3 className="font-extrabold text-slate-800 text-base">No parking spots added yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Start earning today by listing your available parking spaces.</p>
                  <button
                    onClick={() => { setEditingSpot(null); setCurrentView('add_spot'); }}
                    className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    + Add Your First Spot
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {spaces.map(spot => {
                    const isActive = spot.isActive !== false;
                    const spotRate = spot.pricePerHour !== undefined ? spot.pricePerHour : (spot.hourlyRate || 40);
                    const spotSlots = spot.totalSlots || (spot.slots ? spot.slots.length : 5);
                    const spotImg = getImageUrl ? getImageUrl(spot.images?.[0] || spot.image || spot.photoUrl) : (spot.image || spot.photoUrl);

                    return (
                      <div
                        key={spot._id}
                        className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="h-24 w-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                            {spotImg ? (
                              <img src={spotImg} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-2xl bg-slate-100 text-slate-400">
                                🅿️
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-black text-slate-900 text-base truncate" title={spot.title || spot.address}>
                                {spot.title || 'Parking Spot'}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate mt-1 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {spot.address || 'Address'}, {spot.city || 'Hyderabad'}
                            </p>
                            <p className="text-xs font-bold text-slate-700 mt-2">
                              Rate: <span className="text-emerald-600 font-extrabold">₹{spotRate}/hr</span> • {spotSlots} slots {spot.hasEvCharger ? '• ⚡ EV' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Active / Offline Switch Toggle & Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          {/* Interactive Toggle */}
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(spot._id, isActive)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-extrabold ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {isActive ? 'Active (Live)' : 'Offline'}
                            </span>
                          </div>

                          {/* Edit / Delete Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEdit(spot)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSpot(spot._id, spot.title)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── VIEW 2: ORDERS / BOOKINGS (MATCHING OWNER APP 1:1) ────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentView === 'orders' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Driver Bookings &amp; Orders <span className="text-xl">📑</span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage reservations, verify driver check-ins, and track earnings.</p>
            </div>

            {/* Summary Card matching Mobile App */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 text-white shadow-xl shadow-emerald-600/20 grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl sm:text-4xl font-black font-mono">
                  ₹{Number(totalEarnings).toFixed(2).replace(/\.00$/, '')}
                </p>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mt-1">
                  Total Earnings (100% Payout)
                </p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono">
                  {bookings.length}
                </p>
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mt-1">
                  Total Orders
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: `All (${bookings.length})` },
                { id: 'paid', label: `Paid & Confirmed (${bookings.filter(b => b.paymentStatus === 'paid' || b.status === 'paid').length})` },
                { id: 'pending', label: `Pending / Allotted (${bookings.filter(b => b.status === 'allotted' || b.status === 'pending_approval').length})` },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shrink-0 cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Bookings List Cards (Matching Seeker / Owner Pass 1:1) */}
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Loading booking orders...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                <p className="text-4xl">📑</p>
                <h3 className="font-extrabold text-slate-800 text-base">No booking orders found</h3>
                <p className="text-xs text-slate-400">Driver reservations for your spaces will appear here in real time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredBookings.map(item => {
                  const isPaid = item.paymentStatus === 'paid' || item.status === 'paid';
                  const isCancelled = item.status === 'cancelled';
                  const isCompleted = item.status === 'completed';
                  const space = item.spaceId;
                  const slot = item.slotId || 'Slot-1';

                  return (
                    <div
                      key={item._id}
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow relative"
                    >
                      {/* Pass Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          🎟️ DIGITAL PARKING PASS
                        </span>
                        <StatusBadge status={item.status} />
                      </div>

                      {/* Big Slot Highlight */}
                      <div className={`p-3.5 rounded-2xl border text-center ${
                        isPaid
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                          : isCancelled
                          ? 'bg-slate-100 border-slate-200 text-slate-500'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {isPaid ? 'YOUR ASSIGNED SLOT' : 'RESERVATION STATUS'}
                        </p>
                        <p className="text-lg font-black font-mono mt-0.5">
                          {isPaid ? `🅿️ ${slot}` : item.status.toUpperCase()}
                        </p>
                      </div>

                      {/* Spot Details */}
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{space?.title || 'Parking Space'}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {space?.address || 'Address'}, {space?.city || 'Hyderabad'}
                        </p>
                      </div>

                      {/* Meta Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Driver</p>
                          <p className="font-extrabold text-slate-900 mt-0.5 truncate">{item.seekerName || 'Driver'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Vehicle</p>
                          <p className="font-mono font-extrabold text-slate-900 mt-0.5 uppercase">{item.vehicleNumber || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Paid Amount</p>
                          <p className="font-black text-emerald-600 mt-0.5">₹{item.totalAmount || 0}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {item.seekerContact && (
                          <a
                            href={`tel:${item.seekerContact}`}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call Driver ({item.seekerContact})
                          </a>
                        )}

                        <button
                          onClick={() => navigate(`/invoice/${item._id}`)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" /> Invoice
                        </button>

                        {space?.coordinates && (
                          <button
                            onClick={() => {
                              const dest = `${space.coordinates.lat},${space.coordinates.lng}`;
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Navigation className="h-3.5 w-3.5" /> Navigation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── VIEW 3: ADD / EDIT SPOT (MATCHING OWNER APP 1:1) ──────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentView === 'add_spot' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {editingSpot ? 'Edit Parking Space' : 'List New Parking Space'} <span className="text-xl">➕</span>
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">Turn your vacant space into recurring income on the PlanToPark network.</p>
              </div>
              {editingSpot && (
                <button
                  type="button"
                  onClick={() => { setEditingSpot(null); setCurrentView('dashboard'); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-200 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Form Card */}
            <form onSubmit={handleSpotSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

              {/* 1. Title & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Spot Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DM ggb or Prime Driveway"
                    value={spotForm.title}
                    onChange={e => setSpotForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad"
                    value={spotForm.city}
                    onChange={e => setSpotForm(p => ({ ...p, city: e.target.value, location: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 2. Address with GPS Detect */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    Full Property Address *
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={locatingGps}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 cursor-pointer flex items-center gap-1"
                  >
                    {locatingGps ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                    {locatingGps ? 'Locating...' : '🎯 Detect My GPS Location'}
                  </button>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Chaitanya Hills, Almasguda, BN Reddy Nagar, Hyderabad, Telangana"
                  value={spotForm.address}
                  onChange={e => setSpotForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 3. Pricing Matrix */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Pricing Matrix (₹ INR)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400">Hourly (₹/hr) *</span>
                    <input
                      type="number"
                      required
                      min={5}
                      value={spotForm.pricePerHour}
                      onChange={e => setSpotForm(p => ({ ...p, pricePerHour: e.target.value }))}
                      className="w-full px-3 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400">Daily (₹/day)</span>
                    <input
                      type="number"
                      min={20}
                      value={spotForm.pricePerDay}
                      onChange={e => setSpotForm(p => ({ ...p, pricePerDay: e.target.value }))}
                      className="w-full px-3 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400">Weekly (₹/wk)</span>
                    <input
                      type="number"
                      min={100}
                      value={spotForm.pricePerWeek}
                      onChange={e => setSpotForm(p => ({ ...p, pricePerWeek: e.target.value }))}
                      className="w-full px-3 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400">Monthly (₹/mo)</span>
                    <input
                      type="number"
                      min={500}
                      value={spotForm.pricePerMonth}
                      onChange={e => setSpotForm(p => ({ ...p, pricePerMonth: e.target.value }))}
                      className="w-full px-3 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Total Slots & Visual Slots Preview */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Total Parking Slots Capacity (1 to 20)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={spotForm.totalSlots}
                    onChange={e => setSpotForm(p => ({ ...p, totalSlots: e.target.value }))}
                    className="w-28 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-slate-800 text-center focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {Array.from({ length: Math.min(20, Math.max(1, Number(spotForm.totalSlots || 1))) }, (_, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                        Slot-{i + 1}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Max Wallet Discount Allowed & Cancellation Policy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Max Seeker Wallet Discount Allowed (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={spotForm.maxWalletDiscount}
                    onChange={e => setSpotForm(p => ({ ...p, maxWalletDiscount: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default is ₹10 off from digital wallet credits.</p>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Cancellation Refund Policy
                  </label>
                  <select
                    value={spotForm.cancellationPolicy}
                    onChange={e => setSpotForm(p => ({ ...p, cancellationPolicy: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="full">100% Full Refund</option>
                    <option value="half">50% Half Refund</option>
                    <option value="none">0% Non-Refundable</option>
                  </select>
                </div>
              </div>

              {/* 6. Amenities */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Spot Amenities &amp; Features
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={spotForm.hasEvCharger}
                      onChange={e => setSpotForm(p => ({ ...p, hasEvCharger: e.target.checked }))}
                      className="h-4 w-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-extrabold text-slate-800">⚡ EV Charging</span>
                  </label>
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={spotForm.hasCctv}
                      onChange={e => setSpotForm(p => ({ ...p, hasCctv: e.target.checked }))}
                      className="h-4 w-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-extrabold text-slate-800">📹 CCTV Camera</span>
                  </label>
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={spotForm.isCovered}
                      onChange={e => setSpotForm(p => ({ ...p, isCovered: e.target.checked }))}
                      className="h-4 w-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-extrabold text-slate-800">🛡️ Covered / Gated</span>
                  </label>
                </div>
              </div>

              {/* 7. Image Upload */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Spot Photo (Upload File or Image URL)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setSpotForm(p => ({ ...p, imageFile: e.target.files[0] }));
                      }
                    }}
                    className="text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  <input
                    type="url"
                    placeholder="Or enter direct image URL"
                    value={spotForm.imageUrl}
                    onChange={e => setSpotForm(p => ({ ...p, imageUrl: e.target.value }))}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingSpot}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingSpot ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  editingSpot ? 'Update Parking Space →' : 'List Parking Space →'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── VIEW 4: PROFILE & BANK DETAILS (MATCHING OWNER APP 1:1) ───────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentView === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-16">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Space Owner Profile <span className="text-xl">👤</span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage your account settings, payout bank details, and security.</p>
            </div>

            {/* Profile Hero Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/25 border-4 border-blue-200 overflow-hidden">
                {user?.profileImage && user.profileImage.length > 5 && !profileImgError ? (
                  <img
                    src={user.profileImage.startsWith('data:') ? user.profileImage : (getImageUrl ? getImageUrl(user.profileImage) : user.profileImage)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setProfileImgError(true)}
                  />
                ) : (
                  <span>{(user?.name || 'O').trim().charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 capitalize">{user?.name || 'Parking Owner'}</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{user?.email || 'owner@plantopark.com'} • {user?.contact || '+91 8919360467'}</p>
                <span className="inline-block mt-2 bg-blue-50 text-blue-700 font-extrabold text-[11px] px-3 py-1 rounded-full border border-blue-200">
                  Verified Space Owner
                </span>
              </div>
            </div>

            {/* Bank Account Details Form */}
            <form onSubmit={handleProfileSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  🏦 Bank Account Details for Payouts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Where your driver reservation fees are deposited.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Harish Kumar"
                    value={profileForm.bankAccountDetails.accountName}
                    onChange={e => setProfileForm(p => ({
                      ...p,
                      bankAccountDetails: { ...p.bankAccountDetails, accountName: e.target.value }
                    }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50100234567890"
                    value={profileForm.bankAccountDetails.accountNumber}
                    onChange={e => setProfileForm(p => ({
                      ...p,
                      bankAccountDetails: { ...p.bankAccountDetails, accountNumber: e.target.value }
                    }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0001234"
                    value={profileForm.bankAccountDetails.ifscCode}
                    onChange={e => setProfileForm(p => ({
                      ...p,
                      bankAccountDetails: { ...p.bankAccountDetails, ifscCode: e.target.value.toUpperCase() }
                    }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 uppercase font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank"
                    value={profileForm.bankAccountDetails.bankName}
                    onChange={e => setProfileForm(p => ({
                      ...p,
                      bankAccountDetails: { ...p.bankAccountDetails, bankName: e.target.value }
                    }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-400 mb-3">Owner Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={profileForm.contact}
                      onChange={e => setProfileForm(p => ({ ...p, contact: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : '💾 Save Bank & Profile Details'}
              </button>
            </form>

            {/* Change Password Card */}
            <form onSubmit={handlePasswordSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900">🔒 Security &amp; Change Password</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="bg-slate-900 hover:bg-black text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-sm transition-all cursor-pointer"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            {/* Sign Out Card */}
            <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-rose-900 text-sm">Sign Out of Space Owner Portal</h4>
                <p className="text-xs text-rose-600 mt-0.5">Securely log out of this device.</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OwnerDashboard;
