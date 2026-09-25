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
    suitableVehicles: ['hatchback', 'sedan', 'suv'],
    spaceCategory: user?.accountCategory === 'vehicle_storage_owner' ? 'commercial_vehicle_storage' : 'standard',
    landAcres: user?.landAcres ? String(user.landAcres) : '1.0',
    monthlyStorageRate: '1500',
    hasCompoundWall: true,
    has24x7Guards: true,
    hasFloodLights: true,
  });
  const [submittingSpot, setSubmittingSpot] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const toggleVehicleFit = (vehicleId) => {
    setSpotForm(prev => {
      const current = prev.suitableVehicles || [];
      if (current.includes(vehicleId)) {
        if (current.length === 1) {
          alert('Please select at least one vehicle size that fits in this spot.');
          return prev;
        }
        return { ...prev, suitableVehicles: current.filter(v => v !== vehicleId) };
      } else {
        return { ...prev, suitableVehicles: [...current, vehicleId] };
      }
    });
  };

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

  // Delete Booking Order
  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking order?')) return;
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b._id !== bookingId));
        alert('Booking order deleted successfully.');
        fetchOwnerData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete booking.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while deleting booking.');
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
      suitableVehicles: (spot.suitableVehicles && spot.suitableVehicles.length > 0) ? spot.suitableVehicles : ['hatchback', 'sedan', 'suv'],
      spaceCategory: spot.spaceCategory || 'standard',
      landAcres: String(spot.landAcres || user?.landAcres || '1.0'),
      monthlyStorageRate: String(spot.monthlyStorageRate || '1500'),
      hasCompoundWall: spot.securityFacilities?.hasCompoundWall !== false,
      has24x7Guards: spot.securityFacilities?.has24x7Guards !== false,
      hasFloodLights: spot.securityFacilities?.hasFloodLights !== false,
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

    if (spotForm.spaceCategory === 'commercial_vehicle_storage') {
      const acres = parseFloat(spotForm.landAcres);
      if (isNaN(acres) || acres < 1.0) {
        alert('Mandatory Policy: Minimum 1.0 contiguous Acre of land is strictly required for Bank Vehicle Storage Yards.');
        return;
      }
    }

    setSubmittingSpot(true);
    try {
      const fd = new FormData();
      fd.append('title', spotForm.title);
      fd.append('address', spotForm.address);
      fd.append('city', spotForm.city);
      fd.append('location', spotForm.location || spotForm.city);
      fd.append('spaceCategory', spotForm.spaceCategory || 'standard');

      if (spotForm.spaceCategory === 'commercial_vehicle_storage') {
        const acres = parseFloat(spotForm.landAcres);
        fd.append('landAcres', acres);
        fd.append('monthlyStorageRate', Number(spotForm.monthlyStorageRate || 1500));
        fd.append('pricePerHour', Math.round(Number(spotForm.monthlyStorageRate || 1500) / 100));
        fd.append('totalSlots', Math.max(Number(spotForm.totalSlots) || 80, Math.round(acres * 80)));
        fd.append('securityFacilities', JSON.stringify({
          hasCompoundWall: spotForm.hasCompoundWall,
          has24x7Guards: spotForm.has24x7Guards,
          hasCctv: spotForm.hasCctv,
          hasFloodLights: spotForm.hasFloodLights,
          isGated: true
        }));
      } else {
        fd.append('pricePerHour', Number(spotForm.pricePerHour || 50));
        fd.append('totalSlots', Number(spotForm.totalSlots || 5));
      }

      fd.append('pricePerDay', Number(spotForm.pricePerDay || 400));
      fd.append('pricePerWeek', Number(spotForm.pricePerWeek || 2000));
      fd.append('pricePerMonth', Number(spotForm.pricePerMonth || 6000));
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
          imageUrl: '', imageFile: null, lat: 17.313, lng: 78.545, suitableVehicles: ['hatchback', 'sedan', 'suv']
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
                  Space Owner Dashboard <span className="text-xl">🅿️</span>
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
                    📑 {bookings.length} Seeker Booking(s) Received
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

            {/* Add Spot Promo Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => {
                  setEditingSpot(null);
                  setSpotForm(p => ({ ...p, spaceCategory: 'standard' }));
                  setCurrentView('add_spot');
                }}
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-6 shadow-sm cursor-pointer flex items-center justify-between gap-4 transition-all hover:shadow-md group"
              >
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    + List Hourly Parking Space
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Turn driveways & residential bays into recurring parking income
                  </p>
                </div>
                <span className="h-10 w-10 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded-2xl flex items-center justify-center text-slate-700 font-bold transition-colors shrink-0">
                  →
                </span>
              </div>

              <div
                onClick={() => {
                  setEditingSpot(null);
                  setSpotForm(p => ({
                    ...p,
                    spaceCategory: 'commercial_vehicle_storage',
                    landAcres: user?.landAcres ? String(user.landAcres) : '1.0',
                    monthlyStorageRate: '1500',
                  }));
                  setCurrentView('add_spot');
                }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 hover:border-amber-500 rounded-3xl p-6 shadow-sm cursor-pointer flex items-center justify-between gap-4 transition-all hover:shadow-md group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-black text-amber-950 group-hover:text-amber-700 transition-colors">
                      🏢 List Vehicle Storage Yard
                    </h3>
                    <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                      MIN 1 ACRE
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80">
                    Monetize 1+ Acre land for bank repossessed vehicle holding contracts
                  </p>
                </div>
                <span className="h-10 w-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center font-black transition-colors shrink-0 shadow-sm">
                  →
                </span>
              </div>
            </div>

            {/* My Parking Spots Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">My Parking & Storage Listings</h2>
                <span className="text-xs font-bold text-slate-400">{spaces.length} properties</span>
              </div>

              {loading ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">Loading your parking spots...</p>
                </div>
              ) : spaces.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                  <p className="text-4xl">🏢</p>
                  <h3 className="font-extrabold text-slate-800 text-base">No listings added yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Start earning today by listing your available parking spaces or 1+ Acre vehicle storage yards.</p>
                  <button
                    onClick={() => { setEditingSpot(null); setCurrentView('add_spot'); }}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    + Add Your First Spot
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {spaces.map(spot => {
                    const isActive = spot.isActive !== false;
                    const isCommercial = spot.spaceCategory === 'commercial_vehicle_storage';
                    const spotRate = spot.pricePerHour !== undefined ? spot.pricePerHour : (spot.hourlyRate || 40);
                    const spotSlots = spot.totalSlots || (spot.slots ? spot.slots.length : 5);
                    const spotImg = getImageUrl ? getImageUrl(spot.images?.[0] || spot.image || spot.photoUrl) : (spot.image || spot.photoUrl);

                    return (
                      <div
                        key={spot._id}
                        className={`bg-white rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow border ${
                          isCommercial ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                        }`}
                      >
                        {isCommercial && (
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-md">
                              🏢 1+ ACRE REPO STOCKYARD
                            </span>
                            <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-md">
                              📐 {spot.landAcres || 1.0} Acres
                            </span>
                          </div>
                        )}

                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="h-24 w-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                            {spotImg ? (
                              <img src={spotImg} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-2xl bg-slate-100 text-slate-400">
                                {isCommercial ? '🏢' : '🅿️'}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-black text-slate-900 text-base truncate" title={spot.title || spot.address}>
                                {spot.title || (isCommercial ? 'Vehicle Storage Yard' : 'Parking Spot')}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 font-medium truncate mt-1 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {spot.address || 'Address'}, {spot.city || 'Hyderabad'}
                            </p>
                            {isCommercial ? (
                              <p className="text-xs font-bold text-amber-950 mt-2">
                                Monthly: <span className="text-amber-600 font-black">₹{spot.monthlyStorageRate || 1500}/car</span> • ~{spotSlots} Staging Bays
                              </p>
                            ) : (
                              <p className="text-xs font-bold text-slate-700 mt-2">
                                Rate: <span className="text-blue-600 font-extrabold">₹{spotRate}/hr</span> • {spotSlots} slots {spot.hasEvCharger ? '• ⚡ EV' : ''}
                              </p>
                            )}
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
                Seeker Bookings &amp; Orders <span className="text-xl">📑</span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage reservations, verify seeker check-ins, and track earnings.</p>
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
                <p className="text-xs text-slate-400">Seeker reservations for your spaces will appear here in real time.</p>
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
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Parking Seeker</p>
                          <p className="font-extrabold text-slate-900 mt-0.5 truncate">{item.seekerName || 'Seeker'}</p>
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
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                        {item.seekerContact ? (
                          <a
                            href={`tel:${item.seekerContact}`}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call Seeker ({item.seekerContact})
                          </a>
                        ) : <div />}

                        <button
                          onClick={() => handleDeleteBooking(item._id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                          title="Delete booking order"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── VIEW 3: ADD / EDIT SPOT (MATCHING OWNER APP 1:1 WITH WEBSITE COLORS) ─ */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentView === 'add_spot' && (
          <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn pb-16">
            {/* Header with Back Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setEditingSpot(null); setCurrentView('dashboard'); }}
                className="h-10 w-10 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-xs font-bold"
              >
                ←
              </button>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {editingSpot ? 'Edit Parking Spot' : 'List New Parking Spot'}
              </h1>
            </div>

            {/* Clean White Card Container Matching Website Theme */}
            <form onSubmit={handleSpotSubmit} className="bg-white border border-slate-200 text-slate-800 rounded-3xl p-8 shadow-sm">
              {/* Category Selector Tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSpotForm(p => ({ ...p, spaceCategory: 'standard' }))}
                  className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    spotForm.spaceCategory !== 'commercial_vehicle_storage'
                      ? 'bg-blue-600 text-white font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🅿️ Standard Parking Spot
                </button>
                <button
                  type="button"
                  onClick={() => setSpotForm(p => ({ ...p, spaceCategory: 'commercial_vehicle_storage' }))}
                  className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    spotForm.spaceCategory === 'commercial_vehicle_storage'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏢 Commercial Storage Yard (1+ Acre Required)
                </button>
              </div>

              {/* Mandatory Policy Warning if Storage Yard */}
              {spotForm.spaceCategory === 'commercial_vehicle_storage' && (
                <div className="bg-amber-500/10 border-2 border-amber-400 rounded-2xl p-4 mb-6 text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">⚠️</span>
                    <span className="text-xs font-black tracking-wide uppercase text-amber-950">
                      MANDATORY POLICY REQUIREMENT FOR BANKS & REPO FLEETS
                    </span>
                  </div>
                  <p className="text-xs text-amber-950/90 leading-relaxed font-medium">
                    Commercial Vehicle Storage partner yards MUST possess a <strong className="font-extrabold underline decoration-amber-500">minimum of 1.0 contiguous Acre of land</strong>. This provides secure, authorized staging capacity for repossessed cars with perimeter fencing and security.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

              {/* 1. Spot Name / Title - full width */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  {spotForm.spaceCategory === 'commercial_vehicle_storage' ? 'Stockyard Name / Title' : 'Spot Name / Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={spotForm.spaceCategory === 'commercial_vehicle_storage' ? 'e.g. Hyderabad Mega Vehicle Holding Yard 1' : 'e.g. Covered Driveway near Metro'}
                  value={spotForm.title}
                  onChange={e => setSpotForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 2. Full Address (Complete) with Use GPS Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    Full Address (Complete)
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={locatingGps}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    📍 {locatingGps ? 'Locating...' : 'Use GPS'}
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder={spotForm.spaceCategory === 'commercial_vehicle_storage' ? 'Survey No., Ring Road Junction, Hyderabad' : 'Complete address with colony, landmark & city'}
                  value={spotForm.address}
                  onChange={e => setSpotForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
                />
              </div>

              {/* 3. City and Pincode */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      required
                      placeholder="Hyderabad"
                      value={spotForm.city}
                      onChange={e => setSpotForm(p => ({ ...p, city: e.target.value, location: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">Pincode</label>
                    <input
                      type="text"
                      required
                      placeholder="500097"
                      value={spotForm.pincode || '500097'}
                      onChange={e => setSpotForm(p => ({ ...p, pincode: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Google Maps Link (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Google Maps Link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Paste Google Maps URL or use GPS above"
                  value={spotForm.googleMapsLink}
                  onChange={e => setSpotForm(p => ({ ...p, googleMapsLink: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 5. Conditional Pricing & Capacity Section */}
              {spotForm.spaceCategory === 'commercial_vehicle_storage' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Land Area (Acres)</label>
                        <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">Min 1.0 Ac</span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        required
                        value={spotForm.landAcres}
                        onChange={e => setSpotForm(p => ({ ...p, landAcres: e.target.value }))}
                        className={`w-full px-4 py-3.5 bg-slate-50 border rounded-2xl text-sm font-black text-slate-800 focus:outline-none ${
                          parseFloat(spotForm.landAcres) < 1.0 ? 'border-rose-500 ring-2 ring-rose-100' : 'border-amber-300 focus:border-amber-500'
                        }`}
                      />
                      {parseFloat(spotForm.landAcres) < 1.0 && (
                        <p className="text-[11px] font-bold text-rose-600">Strictly 1.0 Acre minimum required!</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Monthly Rate (₹/car)</label>
                      <input
                        type="number"
                        required
                        min="100"
                        value={spotForm.monthlyStorageRate}
                        onChange={e => setSpotForm(p => ({ ...p, monthlyStorageRate: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-amber-300 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">Total Staging Capacity (Cars)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={spotForm.totalSlots}
                      onChange={e => setSpotForm(p => ({ ...p, totalSlots: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 font-semibold">Typical capacity: ~80 to 120 seized cars per acre.</p>
                  </div>

                  {/* Security Facilities Checkboxes */}
                  <div className="space-y-3 pt-2 md:col-span-2 bg-amber-50/40 border border-amber-200/80 p-5 rounded-2xl">
                    <p className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-600" /> Boundary & Security Facilities (Bank Repo Requirements)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {[
                        { key: 'hasCompoundWall', label: '🧱 Concrete Perimeter Compound Wall' },
                        { key: 'has24x7Guards', label: '👮 24/7 Security Guards on premises' },
                        { key: 'hasCctv', label: '📹 Full CCTV Camera Surveillance' },
                        { key: 'hasFloodLights', label: '💡 Perimeter Flood Lighting' },
                      ].map((sec) => (
                        <label key={sec.key} className="flex items-center gap-2.5 cursor-pointer bg-white p-3 rounded-xl border border-amber-200 hover:border-amber-400 transition-colors">
                          <input
                            type="checkbox"
                            checked={!!spotForm[sec.key]}
                            onChange={e => setSpotForm(p => ({ ...p, [sec.key]: e.target.checked }))}
                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                          />
                          <span className="text-xs font-bold text-slate-800">{sec.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">Hourly Rate (₹)</label>
                    <input
                      type="number"
                      required
                      min={5}
                      placeholder="50"
                      value={spotForm.pricePerHour}
                      onChange={e => setSpotForm(p => ({ ...p, pricePerHour: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">Total Capacity (Slots)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      placeholder="5"
                      value={spotForm.totalSlots}
                      onChange={e => setSpotForm(p => ({ ...p, totalSlots: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* 6. Cancellation & Refund Policy - full width */}
              <div className="space-y-3 pt-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛡️</span>
                  <div>
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Cancellation &amp; Refund Policy</p>
                    <p className="text-xs text-slate-500">Select refund amount seeker receives if they cancel:</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Option 1: 100% Full Refund */}
                  <div
                    onClick={() => setSpotForm(p => ({ ...p, cancellationPolicy: 'full' }))}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      spotForm.cancellationPolicy === 'full'
                        ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500 text-slate-900'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                        🟢 100% Full Refund
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Seeker receives full 100% paid amount credited to wallet
                      </p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      spotForm.cancellationPolicy === 'full' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
                    }`}>
                      {spotForm.cancellationPolicy === 'full' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Option 2: 50% Half Refund */}
                  <div
                    onClick={() => setSpotForm(p => ({ ...p, cancellationPolicy: 'half' }))}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      spotForm.cancellationPolicy === 'half'
                        ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500 text-slate-900'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                        🟡 50% Half Refund
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Seeker receives 50% refund; you keep 50% compensation
                      </p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      spotForm.cancellationPolicy === 'half' ? 'border-amber-500 bg-amber-500' : 'border-slate-300 bg-white'
                    }`}>
                      {spotForm.cancellationPolicy === 'half' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>

                  {/* Option 3: 0% No Refund */}
                  <div
                    onClick={() => setSpotForm(p => ({ ...p, cancellationPolicy: 'none' }))}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      spotForm.cancellationPolicy === 'none'
                        ? 'bg-rose-50/80 border-rose-500 ring-1 ring-rose-500 text-slate-900'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                        🔴 0% No Refund
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Strict non-refundable booking
                      </p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      spotForm.cancellationPolicy === 'none' ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'
                    }`}>
                      {spotForm.cancellationPolicy === 'none' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. Max Wallet Money Usable per Booking (₹) */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  ⚡ Max Wallet Money Usable per Booking (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={spotForm.maxWalletDiscount}
                  onChange={e => setSpotForm(p => ({ ...p, maxWalletDiscount: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <p className="text-xs text-slate-400">
                  Seekers can deduct up to ₹10 from their PlanToPark Wallet balance on each booking.
                </p>
              </div>

              {/* 8. Supported Vehicle Sizes & Types */}
              <div className="space-y-3 pt-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚗</span>
                    <div>
                      <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Vehicles Fit in this Spot</p>
                      <p className="text-xs text-slate-500">Select all car sizes that can comfortably enter and park:</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {(spotForm.suitableVehicles || []).length} of 3 Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'hatchback',
                      title: 'Hatchback',
                      icon: '🚗',
                      subtitle: 'Small cars, 4–5 seats',
                      examples: 'Swift, i20, Baleno',
                    },
                    {
                      id: 'sedan',
                      title: 'Sedan',
                      icon: '🚘',
                      subtitle: 'Separate boot/trunk, 4–5 seats',
                      examples: 'Dzire, Honda City, Verna',
                    },
                    {
                      id: 'suv',
                      title: 'SUV',
                      icon: '🚙',
                      subtitle: 'Taller, larger body, 5–7 seats',
                      examples: 'Creta, Seltos, XUV700',
                    },
                  ].map((v) => {
                    const isChecked = (spotForm.suitableVehicles || []).includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => toggleVehicleFit(v.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500 text-slate-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{v.icon}</span>
                            <div>
                              <p className="text-sm font-black text-slate-900">{v.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{v.subtitle}</p>
                            </div>
                          </div>
                          {/* Checkbox box */}
                          <div
                            className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <span className="text-xs font-black leading-none">✓</span>}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px]">
                          <span className="font-extrabold text-emerald-700">e.g.</span>
                          <span className="text-slate-500 font-medium truncate">{v.examples}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 9. EV Charger Facility Switch Toggle */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    ⚡ EV Charger Facility
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Is electric vehicle charging available?
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSpotForm(p => ({ ...p, hasEvCharger: !p.hasEvCharger }))}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      spotForm.hasEvCharger ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        spotForm.hasEvCharger ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-extrabold uppercase ${spotForm.hasEvCharger ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {spotForm.hasEvCharger ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Submit Button matching Website Colors */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submittingSpot}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-emerald-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {submittingSpot ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    editingSpot ? 'Update Parking Spot' : 'Publish Parking Listing'
                  )}
                </button>
              </div>
              </div>{/* end grid */}
            </form>
          </div>
        )}



        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── VIEW 4: PROFILE (MATCHING OWNER APP 1:1) ───────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentView === 'profile' && (
          <div className="max-w-xl mx-auto space-y-6 animate-fadeIn pb-16">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                My Profile <span className="text-xl">👤</span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Account settings &amp; partner status.</p>
            </div>

            {/* Profile Hero Card Matching Mobile Owner Profile 1:1 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-500/25 border-4 border-emerald-100 overflow-hidden">
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
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 capitalize">{user?.name || 'Space Owner'}</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{user?.email || 'owner@plantopark.com'}</p>
                {user?.contact && (
                  <p className="text-xs text-emerald-600 font-extrabold mt-1">📞 {user.contact}</p>
                )}
                <span className="inline-block mt-3 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] px-3.5 py-1 rounded-full border border-emerald-200 uppercase tracking-wider">
                  PARKING SPACE OWNER
                </span>
              </div>
            </div>

            {/* Account Quick Stats */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Account Status</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                  <p className="text-base font-black text-emerald-600">Active</p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Status</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                  <p className="text-base font-black text-emerald-600">Verified</p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Space Partner</p>
                </div>
              </div>
            </div>

            {/* Support & Legal */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Support &amp; Legal</h3>
              <div className="space-y-2.5">
                <a
                  href="tel:+918919360467"
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-slate-800 font-extrabold text-sm transition-colors block"
                >
                  <span>📞 24/7 Owner Support Desk</span>
                  <span className="text-slate-400 text-xs font-bold">Call →</span>
                </a>
                <div
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-slate-800 font-extrabold text-sm"
                >
                  <span>📜 Partner Terms &amp; Privacy Policy</span>
                  <span className="text-slate-400 text-xs font-bold">Standard</span>
                </div>
              </div>
            </div>

            {/* Sign Out Card */}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3.5 rounded-2xl text-sm shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default OwnerDashboard;
