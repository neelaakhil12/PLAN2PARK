import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { StatusBadge } from './AdminDashboard';
import MapPicker from '../components/MapPicker';
import {
  Plus, Trash2, Edit2, DollarSign, Car, Clock,
  Layers, MapPin, CheckCircle, XCircle, Settings,
  LogOut, Star, MessageSquare, User, Bell, Map, Calendar, Eye,
  Menu, X, Phone, Mail
} from 'lucide-react';
import Invoice from './Invoice';

const OwnerDashboard = () => {
  const { token, API_URL, logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active section from URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1];
  const section = (lastSegment === 'dashboard' || lastSegment === 'overview' || location.pathname === '/owner/dashboard')
    ? 'overview'
    : lastSegment || 'overview';

  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState({});
  const [availableSlotsByBooking, setAvailableSlotsByBooking] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);

  // Complaint Form
  const [compSubject, setCompSubject] = useState('');
  const [compDescription, setCompDescription] = useState('');

  // Space Listing Form
  const [form, setForm] = useState({
    address: '', location: '', googleMapsLink: '', totalSlots: '', pricePerHour: '', pricePerDay: '', pricePerWeek: '', pricePerMonth: '', imageUrl: '', imageFile: null,
    lat: null, lng: null, suitableVehicles: ['4-wheeler']
  });
  const [locating, setLocating] = useState(false);

  const processCoordsWithMapboxWeb = async (latitude, longitude) => {
    try {
      const mbToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
      if (!mbToken) return;
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mbToken}&types=poi,address,neighborhood,locality,place&limit=5`);
      const data = await res.json();

      if (data && data.features && data.features.length > 0) {
        let detectedPlot = '';
        let detectedArea = '';
        let detectedLandmark = '';
        let detectedCity = 'Hyderabad';

        data.features.forEach((feat) => {
          if (feat.place_type.includes('poi') && !detectedLandmark) {
            detectedLandmark = feat.text;
          } else if (feat.place_type.includes('address') && !detectedPlot) {
            detectedPlot = feat.address ? `Plot No. ${feat.address}` : feat.text;
          } else if (feat.place_type.includes('neighborhood') && !detectedArea) {
            detectedArea = feat.text;
          } else if (feat.place_type.includes('locality') || feat.place_type.includes('place')) {
            if (!detectedCity || detectedCity === 'Hyderabad') detectedCity = feat.text;
          }
        });

        const topFeature = data.features[0];
        const context = topFeature.context || [];

        const placeCtx = context.find((c) => c.id.startsWith('place') || c.id.startsWith('locality'));
        if (placeCtx) detectedCity = placeCtx.text;

        const neighCtx = context.find((c) => c.id.startsWith('neighborhood') || c.id.startsWith('district'));
        if (neighCtx && !detectedArea) detectedArea = neighCtx.text;

        if (!detectedPlot && topFeature.address) detectedPlot = `Plot No. ${topFeature.address}`;
        if (!detectedArea) detectedArea = topFeature.text || 'Chaitanya Hills, BN Reddy Nagar';

        const compiled = [
          detectedPlot || 'Plot No. 42',
          detectedArea,
          detectedLandmark ? `Near ${detectedLandmark}` : '',
          detectedCity,
          '500097'
        ].filter(Boolean).join(', ');

        const googlePlaceUrl = `https://www.google.com/maps/place/${encodeURIComponent(compiled || topFeature.place_name)}/@${latitude},${longitude},17z`;

        setForm(p => ({
          ...p,
          address: compiled || topFeature.place_name,
          location: detectedCity,
          googleMapsLink: googlePlaceUrl,
          lat: latitude,
          lng: longitude
        }));
        alert('📍 Mapbox Location Locked! Address and Google Maps place link auto-filled.');
      }
    } catch (e) {
      const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      setForm(p => ({ ...p, googleMapsLink: mapsUrl, lat: latitude, lng: longitude }));
    }
  };

  const handleLocateMe = async () => {
    setLocating(true);
    let latVal = 17.3850;
    let lngVal = 78.4867;

    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 4000,
              maximumAge: 60000,
            });
          });
          if (pos && pos.coords) {
            latVal = pos.coords.latitude;
            lngVal = pos.coords.longitude;
          }
        } catch (geoErr) {
          try {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            if (ipData && ipData.latitude && ipData.longitude) {
              latVal = ipData.latitude;
              lngVal = ipData.longitude;
            }
          } catch (e) {
            // fallback
          }
        }
      }

      await processCoordsWithMapboxWeb(latVal, lngVal);
    } catch (err) {
      console.error('Locate error:', err);
    } finally {
      setLocating(false);
    }
  };

  const extractPlaceFromUrl = (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return null;
    const cleanUrl = urlStr.trim();
    let placeName = '';
    let lat = null;
    let lng = null;

    const placeMatch = cleanUrl.match(/\/(?:place|search)\/([^/@?]+)/);
    if (placeMatch && placeMatch[1]) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
      } catch (e) {
        placeName = placeMatch[1].replace(/\+/g, ' ').trim();
      }
    }

    if (!placeName) {
      const qMatch = cleanUrl.match(/[?&]q=([^&]+)/);
      if (qMatch && qMatch[1] && !/^-?\d+\.\d+,-?\d+\.\d+$/.test(qMatch[1].trim())) {
        try {
          const text = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
          if (!/^[\d\.\s,-]+$/.test(text)) {
            placeName = text;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (placeName && /^[\d\.\s,-]+$/.test(placeName)) {
      placeName = '';
    }

    const atMatch = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qCoords = cleanUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    } else if (qCoords) {
      lat = parseFloat(qCoords[1]);
      lng = parseFloat(qCoords[2]);
    }

    return { placeName, lat, lng };
  };

  const handleLocationLinkChange = async (url) => {
    setForm(p => ({ ...p, googleMapsLink: url }));
    if (!url || url.trim().length < 5) return;

    // Instant client-side address auto-fill
    const parsed = extractPlaceFromUrl(url);
    if (parsed) {
      setForm(p => ({
        ...p,
        address: parsed.placeName || p.address,
        lat: parsed.lat || p.lat,
        lng: parsed.lng || p.lng,
      }));
    }

    try {
      const res = await fetch(`${API_URL}/spaces/parse-maps-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.address) {
        setForm(p => ({
          ...p,
          address: data.address,
          location: data.city || p.location || 'Hyderabad',
          lat: data.lat || p.lat,
          lng: data.lng || p.lng,
        }));
      }
    } catch (e) {
      console.error('Error parsing maps link:', e);
    }
  };

  // Profile update form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    contact: user?.contact || '',
    password: '',
    bankAccountDetails: user?.bankAccountDetails || { accountNumber: '', ifscCode: '', bankName: '', accountName: '' }
  });

  const fetchData = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [rS, rB, rA, rR, rC] = await Promise.all([
        fetch(`${API_URL}/spaces/my-spaces`, { headers: h }),
        fetch(`${API_URL}/bookings/owner-bookings`, { headers: h }),
        fetch(`${API_URL}/analytics/owner`, { headers: h }),
        fetch(`${API_URL}/reviews/owner`, { headers: h }),
        fetch(`${API_URL}/complaints/my-complaints`, { headers: h }),
      ]);
      if (rS.ok) setSpaces(await rS.json());
      if (rB.ok) setBookings(await rB.json());
      if (rA.ok) setAnalytics(await rA.json());
      if (rR.ok) setReviews(await rR.json());
      if (rC.ok) setComplaints(await rC.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
  }, [token]);

  // Auto-close sidebar on small screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch available slots dynamically for pending bookings
  useEffect(() => {
    const fetchSlots = async () => {
      const pendingApproval = bookings.filter(b => b.status === 'pending_approval');
      const slotsMapping = {};
      await Promise.all(
        pendingApproval.map(async (b) => {
          try {
            const res = await fetch(`${API_URL}/bookings/${b._id}/available-slots`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              slotsMapping[b._id] = data.filter(s => s.isAvailable);
            }
          } catch (e) {
            console.error('Error fetching slots for booking:', b._id, e);
          }
        })
      );
      setAvailableSlotsByBooking(slotsMapping);
    };
    if (bookings.length > 0) {
      fetchSlots();
    }
  }, [bookings, token, API_URL]);

  const resetForm = () => {
    setForm({ address: '', location: '', googleMapsLink: '', totalSlots: '', pricePerHour: '', pricePerDay: '', pricePerWeek: '', pricePerMonth: '', imageUrl: '', imageFile: null, lat: null, lng: null, suitableVehicles: ['4-wheeler'] });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('address', form.address);
      fd.append('location', form.location);
      if (form.googleMapsLink) fd.append('googleMapsLink', form.googleMapsLink);
      fd.append('totalSlots', form.totalSlots);
      fd.append('pricePerHour', form.pricePerHour);
      fd.append('pricePerDay', form.pricePerDay);
      if (form.pricePerWeek) fd.append('pricePerWeek', form.pricePerWeek);
      if (form.pricePerMonth) fd.append('pricePerMonth', form.pricePerMonth);
      if (form.imageUrl) fd.append('imageUrl', form.imageUrl);
      if (form.imageFile) fd.append('imageFile', form.imageFile);
      if (form.lat) fd.append('lat', form.lat);
      if (form.lng) fd.append('lng', form.lng);
      fd.append('suitableVehicles', JSON.stringify(form.suitableVehicles || ['4-wheeler']));

      const url    = editingId ? `${API_URL}/spaces/${editingId}` : `${API_URL}/spaces`;
      const method = editingId ? 'PUT' : 'POST';

      const res  = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();

      if (res.ok) {
        alert(editingId ? 'Space updated successfully!' : 'New space listing created and is now active!');
        resetForm();
        fetchData();
        navigate('/owner/listings');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this space listing?')) return;
    const res = await fetch(`${API_URL}/spaces/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) { alert('Space deleted successfully'); fetchData(); }
  };

  const handleEditInit = (space) => {
    setEditingId(space._id);
    setForm({
      address: space.address,
      location: space.location,
      googleMapsLink: space.googleMapsLink || '',
      totalSlots: space.totalSlots,
      pricePerHour: space.pricePerHour,
      pricePerDay: space.pricePerDay,
      pricePerWeek: space.pricePerWeek || '',
      pricePerMonth: space.pricePerMonth || '',
      imageUrl: space.image,
      imageFile: null,
      lat: space.coordinates?.lat || null,
      lng: space.coordinates?.lng || null,
      suitableVehicles: space.suitableVehicles || ['4-wheeler'],
    });
    navigate('/owner/parkingspace');
  };

  const handleAllot = async (bookingId) => {
    const slotId = selectedSlots[bookingId];
    if (!slotId) return alert('Please select a slot for allotment.');
    const res = await fetch(`${API_URL}/bookings/${bookingId}/allot`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slotId }),
    });
    if (res.ok) { alert('Slot allotted successfully!'); fetchData(); }
    else { const d = await res.json(); alert(d.message); }
  };

  const handleComplete = async (id) => {
    const res = await fetch(`${API_URL}/bookings/${id}/complete`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { alert('Booking marked completed. Slot released!'); fetchData(); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this customer booking request?')) return;
    const res = await fetch(`${API_URL}/bookings/${id}/cancel`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { alert('Booking request cancelled.'); fetchData(); }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject: compSubject, description: compDescription }),
    });
    if (res.ok) {
      alert('Support ticket raised successfully. Admin will review soon.');
      setCompSubject('');
      setCompDescription('');
      fetchData();
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profileForm),
    });
    if (res.ok) { alert('Profile updated successfully!'); }
    else alert('Failed to update profile');
  };

  // SVG Chart for Host Weekly Earnings
  const renderSVGEarningsChart = () => {
    if (!analytics || !analytics.chartData) return null;
    const { earnings, labels } = analytics.chartData;
    const maxVal = Math.max(...earnings, 100);
    const height = 180;
    const width = 500;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {labels.map((lbl, idx) => {
          const val = earnings[idx] || 0;
          const colWidth = 35;
          const x = (idx / (labels.length - 1)) * (width - 80) + 40;
          const colHeight = (val / maxVal) * (height - 60);
          const y = height - colHeight - 25;

          return (
            <g key={idx} className="group">
              {/* Bar (gradient effect) */}
              <rect x={x - colWidth / 2} y={y} width={colWidth} height={colHeight} fill="#3b82f6" rx="6" className="hover:fill-emerald-500 transition-colors" />
              {/* Tooltip value */}
              <text x={x} y={y - 6} textAnchor="middle" className="text-[10px] font-black fill-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">₹{val}</text>
              {/* Label */}
              <text x={x} y={height - 5} textAnchor="middle" className="text-[9px] fill-slate-400 font-bold">{lbl}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const pendingBookingsCount = bookings.filter(b => b.status === 'pending_approval').length;

  const menuItems = [
    { id: 'overview', path: '/owner/dashboard', label: 'Dashboard', icon: <Layers className="h-4.5 w-4.5" /> },
    { id: 'parkingspace', path: '/owner/parkingspace', label: editingId ? 'Edit Space' : 'Add Parking Space', icon: <Plus className="h-4.5 w-4.5" /> },
    { id: 'listings', path: '/owner/listings', label: 'My Listing Space', icon: <MapPin className="h-4.5 w-4.5" /> },
    { id: 'bookings', path: '/owner/bookings', label: 'Customer Bookings & Invoices', icon: <Car className="h-4.5 w-4.5" />, badge: pendingBookingsCount },
    { id: 'earnings', path: '/owner/earnings', label: 'Earnings Trackers', icon: <DollarSign className="h-4.5 w-4.5" /> },
    { id: 'reviews', path: '/owner/reviews', label: 'Reviews', icon: <MessageSquare className="h-4.5 w-4.5" /> },
    { id: 'complaints', path: '/owner/complaints', label: 'Supports & Complaints', icon: <XCircle className="h-4.5 w-4.5" /> },
    { id: 'profile', path: '/owner/profile', label: 'Profile Setup', icon: <User className="h-4.5 w-4.5" /> },
  ];

  // Section label for topbar
  const activMenuItem = menuItems.find(m => m.id === section);
  const sectionLabel = activMenuItem ? activMenuItem.label : section.replace('-', ' ');

  return (
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
        className={`bg-indigo-950 text-slate-300 w-64 fixed inset-y-0 left-0 transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-300 ease-in-out z-30 flex flex-col border-r border-indigo-900 shadow-2xl`}
      >
        {/* Logo */}
        <div className="h-16 px-4 border-b border-indigo-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 bg-green-500 rounded-xl flex items-center justify-center font-bold text-white text-base shrink-0">P</div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-extrabold text-white text-sm tracking-tight truncate">PLANTO<span className="text-green-400">PARK</span></span>
              <span className="text-[9px] text-indigo-400 font-semibold truncate">Smart Parking</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden h-7 w-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-900 rounded-lg transition-colors shrink-0"
            aria-label="Close Sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {menuItems.map(item => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id !== 'add-parking') resetForm();
                  navigate(item.path);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-150 whitespace-nowrap text-left ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-450 hover:bg-indigo-900 hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className={`shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white animate-pulse'
                  }`}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-indigo-900 shrink-0">
          <button
            onClick={() => { logout(); window.location.href = '/owner/login'; }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
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
            <h2 className="font-extrabold text-slate-800 text-sm sm:text-base capitalize truncate leading-none">
              {sectionLabel} Panel
            </h2>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* User notification status alert */}
            {user?.status === 'pending' && (

              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl animate-pulse">
                ⏳ Awaiting Admin Approval
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
              >
                <Bell className="h-4.5 w-4.5 text-slate-600" />
                {pendingBookingsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                    {pendingBookingsCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">Notifications</span>
                    {pendingBookingsCount > 0 && (
                      <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingBookingsCount} pending</span>
                    )}
                  </div>
                  <div className="p-3 max-h-64 overflow-y-auto">
                    {pendingBookingsCount === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-4">No pending notifications</p>
                    ) : (
                      <div className="space-y-2">
                        {bookings.filter(b => b.status === 'pending_approval').slice(0, 5).map(b => (
                          <div key={b._id} className="flex items-start gap-2.5 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                            <div className="h-7 w-7 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Car className="h-3.5 w-3.5 text-amber-700" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{b.seekerName}</p>
                              <p className="text-[10px] text-slate-400">Awaiting slot allotment · {b.vehicleNumber}</p>
                            </div>
                          </div>
                        ))}
                        {pendingBookingsCount > 5 && (
                          <p className="text-[10px] text-slate-400 text-center pt-1">+{pendingBookingsCount - 5} more pending</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100">
                    <button
                      onClick={() => { setNotifOpen(false); navigate('/owner/bookings'); }}
                      className="w-full text-center text-xs font-bold text-blue-600 hover:underline"
                    >
                      View all bookings →
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile badge */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">I have parking</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600 font-bold uppercase">
                {user?.name?.charAt(0) || 'H'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center min-h-[45vh]">
              <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">

              {/* ── VIEW: OVERVIEW (PLACE OWNER OVERVIEW) ────────────────── */}
              {section === 'overview' && analytics && (
                <div className="space-y-8">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { title: 'Properties Listed', value: analytics.spacesCount || 0, icon: <Layers className="h-5 w-5 text-blue-500" />, color: 'bg-blue-50' },
                      { title: 'Total Slots Layout', value: analytics.slots?.total || 0, icon: <MapPin className="h-5 w-5 text-indigo-500" />, color: 'bg-indigo-50' },
                      { title: 'Occupancy Rate', value: `${analytics.slots?.occupancyRate}%` || '0%', icon: <Car className="h-5 w-5 text-teal-500" />, color: 'bg-teal-50', sub: `${analytics.slots?.occupied} taken` },
                      { title: 'Total Generated (90%)', value: `₹${analytics.earnings || 0}`, icon: <DollarSign className="h-5 w-5 text-emerald-500" />, color: 'bg-emerald-50' },
                      { title: 'Paid by Admin', value: `₹${analytics.paidAmount || 0}`, icon: <CheckCircle className="h-5 w-5 text-blue-600" />, color: 'bg-blue-50', sub: 'Credited' },
                      { title: 'Pending Payout', value: `₹${analytics.owedAmount || 0}`, icon: <Clock className="h-5 w-5 text-amber-500" />, color: 'bg-amber-50', highlight: true, sub: 'Owed' },
                    ].map((stat, i) => (
                      <div key={i} className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-left ${stat.highlight ? 'ring-1 ring-amber-200 bg-gradient-to-tr from-white to-amber-50/10' : ''}`}>
                        <div className={`h-8 w-8 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{stat.value}</p>
                        {stat.sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{stat.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Graph Panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Line Chart */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-extrabold text-slate-800">Earnings Overview</h3>
                          <p className="text-slate-400 text-xs mt-0.5">Daily owner earnings tracker (last 7 days)</p>
                        </div>
                        <span className="text-xs font-semibold text-blue-600 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Owner Earnings (₹)</span>
                      </div>
                      <div className="h-44 w-full flex items-end justify-center">
                        {renderSVGEarningsChart()}
                      </div>
                    </div>

                    {/* Properties Summary list */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-800">My Properties</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Live status summary</p>
                      </div>
                      <div className="space-y-3 mt-4 overflow-y-auto max-h-48">
                        {spaces.slice(0, 3).map(s => (
                          <div key={s._id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold">
                            <img src={s.image} alt="" className="w-12 h-10 object-cover rounded-lg" />
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-800 font-bold truncate">{s.address}</p>
                              <p className="text-slate-400 text-[10px] truncate">{s.location}</p>
                            </div>
                            <StatusBadge status={s.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Bookings Table */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-extrabold text-slate-800">Recent Customer Bookings</h3>
                      <button onClick={() => navigate('/owner/bookings')} className="text-xs text-blue-600 font-bold hover:underline">View Bookings Tab →</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold">
                          <tr>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Vehicle Plate</th>
                            <th className="px-6 py-3">Property</th>
                            <th className="px-6 py-3">Allotted Slot</th>
                            <th className="px-6 py-3">Payout Payout</th>
                            <th className="px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {bookings.slice(0, 5).map(b => (
                            <tr key={b._id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-800">{b.seekerName}</p>
                                <p className="text-[10px] text-slate-400">{b.seekerContact}</p>
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-600 text-xs uppercase">{b.vehicleNumber}</td>
                              <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{b.spaceId?.address || 'Property Address'}</td>
                              <td className="px-6 py-4">
                                {b.slotId ? <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold">{b.slotId}</span> : <span className="text-amber-500 italic text-xs">Awaiting</span>}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900">₹{(b.totalAmount * 0.9).toFixed(0)}</td>
                              <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ── VIEW: ADD / EDIT PARKING SPACE ─────────────────────────── */}
              {(section === 'add-parking' || section === 'parkingspace') && (
                <div className="glass-card rounded-2xl border border-slate-200 bg-white p-8 max-w-2xl mx-auto shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900 mb-1">{editingId ? 'Edit Parking Listing' : 'List New Parking Spot'}</h2>
                  <p className="text-slate-400 text-xs mb-6">Listed spots go live instantly and are immediately available for booking.</p>
                  
                  <form onSubmit={handleSubmit} className="space-y-5 text-left">
                    {/* MAP PICKER */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">📍 Pin Your Parking Location on Map</label>
                      <p className="text-xs text-slate-400 mb-3">Search for your address or click on the map to drop a pin. The address fields will auto-fill.</p>
                      <MapPicker
                        initialLat={form.lat}
                        initialLng={form.lng}
                        initialAddress={form.address}
                        initialLocation={form.location}
                        onChange={({ lat, lng, address, location }) => {
                          setForm(p => ({ ...p, lat, lng, address, location }));
                        }}
                      />
                    </div>

                    {/* Address & Location Link */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-700">Address & Location</label>
                        <button
                          type="button"
                          onClick={handleLocateMe}
                          disabled={locating}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
                        >
                          {locating ? (
                            <>
                              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Locating...
                            </>
                          ) : (
                            <>📍 Locate Me (Auto-Fill Address)</>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">City / Region</label>
                          <input type="text" required value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Hyderabad, Telangana"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-400 text-sm transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Full Address</label>
                          <input type="text" required value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="e.g. 562, 12th Main Rd, Jubilee Hills"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-400 text-sm transition-all" />
                        </div>
                      </div>

                      {/* Manual Location Link Paste Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-500">Google Maps / Location Link (Manual Paste Option)</label>
                          <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                        </div>
                        <input
                          type="url"
                          value={form.googleMapsLink || ''}
                          onChange={e => handleLocationLinkChange(e.target.value)}
                          placeholder="e.g. https://maps.app.goo.gl/... or paste location link"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-400 text-sm transition-all"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                          💡 Click <strong>Locate Me</strong> to auto-fill your current address & maps link, or paste a Google Maps link manually if listing a space at another location.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Slots</label>
                        <input type="number" required min="1" value={form.totalSlots} onChange={e => setForm(p => ({ ...p, totalSlots: e.target.value }))} placeholder="10"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400 text-sm transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rate/Hour (₹)</label>
                        <input type="number" required min="1" value={form.pricePerHour} onChange={e => setForm(p => ({ ...p, pricePerHour: e.target.value }))} placeholder="40"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400 text-sm transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rate/Day (₹)</label>
                        <input type="number" required min="1" value={form.pricePerDay} onChange={e => setForm(p => ({ ...p, pricePerDay: e.target.value }))} placeholder="300"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400 text-sm transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rate/Week (₹)</label>
                        <input type="number" value={form.pricePerWeek} onChange={e => setForm(p => ({ ...p, pricePerWeek: e.target.value }))} placeholder="1800"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400 text-sm transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rate/Month (₹)</label>
                        <input type="number" value={form.pricePerMonth} onChange={e => setForm(p => ({ ...p, pricePerMonth: e.target.value }))} placeholder="7000"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-400 text-sm transition-all" />
                      </div>
                    </div>

                    {/* Suitable Vehicle Types */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">🚗 Suitable Vehicle Types</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                        {[
                          { key: '2-wheeler', label: '2-Wheelers (Bike / Scooter)' },
                          { key: '4-wheeler', label: '4-Wheelers / Standard Cars (Sedan/Hatchback)' },
                          { key: 'large-car', label: 'Large Cars (SUV / MUV)' },
                          { key: 'heavy-vehicle', label: 'Heavy Vehicles (Truck / Van)' }
                        ].map(vt => {
                          const checked = form.suitableVehicles?.includes(vt.key) || false;
                          return (
                            <label key={vt.key} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  let list = [...(form.suitableVehicles || [])];
                                  if (e.target.checked) {
                                    list.push(vt.key);
                                  } else {
                                    list = list.filter(v => v !== vt.key);
                                  }
                                  setForm(p => ({ ...p, suitableVehicles: list }));
                                }}
                                className="rounded text-blue-600 focus:ring-blue-400 h-4 w-4"
                              />
                              {vt.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Image picker */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">Space Photo File</label>
                      {editingId && form.imageUrl && !form.imageFile && (
                        <img src={form.imageUrl} alt="current" className="w-full h-32 object-cover rounded-xl border" />
                      )}
                      {form.imageFile && (
                        <div className="relative">
                          <img src={URL.createObjectURL(form.imageFile)} alt="new preview" className="w-full h-32 object-cover rounded-xl border border-blue-400" />
                          <button type="button" onClick={() => setForm(p => ({ ...p, imageFile: null }))} className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">Remove</button>
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-xl cursor-pointer transition-all">
                        <span className="text-xs text-slate-500 font-bold">Click to upload image file</span>
                        <span className="text-[10px] text-slate-400 mt-1">Uploaded directly to Cloudinary</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files[0];
                          if (file) setForm(p => ({ ...p, imageFile: file, imageUrl: '' }));
                        }} />
                      </label>
                      <input type="text" value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value, imageFile: null }))} placeholder="Or paste image URL"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-700" />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10">
                        {editingId ? 'Update Listing Details' : 'Submit Property Space'}
                      </button>
                      <button type="button" onClick={() => { resetForm(); navigate('/owner/dashboard/listings'); }} className="px-6 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── VIEW: MY LISTING SPACE ─────────────────────────────────── */}
              {section === 'listings' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg">My Listed Properties</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Manage details and delete spaces</p>
                    </div>
                    <button onClick={() => navigate('/owner/dashboard/add-parking')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs">Add New Parking Space</button>
                  </div>
                  {spaces.length === 0 ? (
                    <div className="bg-white border border-slate-200 p-16 text-center rounded-3xl shadow-sm">
                      <p className="text-slate-400">No properties listed yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {spaces.map(s => (
                        <div key={s._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row">
                          <img src={s.image} alt="" className="w-full sm:w-44 h-40 sm:h-auto object-cover border-r border-slate-100" />
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full">{s.location}</span>
                                <StatusBadge status={s.status} />
                              </div>
                              <h4 className="font-bold text-slate-900 truncate text-base">{s.address}</h4>
                              <p className="text-slate-400 text-xs mt-1">Hourly rate: <strong className="text-slate-700">₹{s.pricePerHour}</strong> · Daily: <strong className="text-slate-700">₹{s.pricePerDay}</strong></p>
                              <p className="text-slate-400 text-xs mt-1">Slots count: <strong>{s.totalSlots}</strong></p>
                            </div>
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                              <button onClick={() => handleEditInit(s)} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-blue-100"><Edit2 className="h-3.5 w-3.5" /> Edit Space</button>
                              <button onClick={() => handleDelete(s._id)} className="flex-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── VIEW: CUSTOMER BOOKINGS ────────────────────────────────── */}
              {section === 'bookings' && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-lg">Customer Bookings &amp; Allotments</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Select space slots and allot booking positions to commuters.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase">
                        <tr>
                          <th className="px-6 py-3">Customer</th>
                          <th className="px-6 py-3">Vehicle Plate</th>
                          <th className="px-6 py-3">Property</th>
                          <th className="px-6 py-3">Hours</th>
                          <th className="px-6 py-3">Net Payout (90%)</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Allot Slot Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {bookings.length === 0 ? (
                          <tr><td colSpan="7" className="text-center py-10 text-slate-400">No booking requests found.</td></tr>
                        ) : bookings.map(b => {
                          const space = b.spaceId;
                          const freeSlots = availableSlotsByBooking[b._id] || [];
                          return (
                            <tr key={b._id} onClick={() => setSelectedBooking(b)} className={`cursor-pointer hover:bg-slate-100 transition-colors ${b.bookingType === 'monthly' ? 'bg-purple-50/50' : ''}`}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {b.driverImage ? (
                                    <img src={b.driverImage} alt="Driver" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase border border-slate-200">
                                      {b.seekerName?.charAt(0) || 'D'}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-slate-900">{b.seekerName}</p>
                                    <p className="text-xs text-slate-400">{b.seekerContact}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-600 font-bold uppercase text-xs">{b.vehicleNumber}</td>
                              <td className="px-6 py-4 text-slate-500 truncate max-w-[145px]">{space?.address || '—'}</td>
                              <td className="px-6 py-4 text-slate-500">
                                {b.bookingType === 'monthly' ? (
                                  <span className="text-purple-600 font-bold">
                                    Monthly <br/><span className="text-[10px]">{Math.max(0, Math.ceil((new Date(b.startTime).getTime() + (b.hours || 720) * 3600000 - new Date().getTime()) / (1000 * 3600 * 24)))} days left</span>
                                  </span>
                                ) : (
                                  `${b.hours} hrs`
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-950">₹{(b.totalAmount * 0.9).toFixed(0)}</td>
                              <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                              <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {b.status === 'pending_approval' && (
                                  <div className="flex items-center gap-2">
                                    {freeSlots.length === 0 ? (
                                      <span className="text-rose-500 text-xs font-bold">Fully Booked</span>
                                    ) : (
                                      <>
                                        <select onChange={e => setSelectedSlots(p => ({ ...p, [b._id]: e.target.value }))} defaultValue=""
                                          className="bg-white border border-slate-200 rounded-lg text-xs py-1.5 px-2 focus:outline-none focus:border-blue-400">
                                          <option value="" disabled>Select Slot</option>
                                          {freeSlots.map(s => <option key={s.slotId} value={s.slotId}>{s.slotId}</option>)}
                                        </select>
                                        <button onClick={() => handleAllot(b._id)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs">Allot Slot</button>
                                      </>
                                    )}
                                    <button onClick={() => handleCancel(b._id)} className="bg-rose-50 border border-rose-200 text-rose-600 font-bold px-3 py-1.5 rounded-lg text-xs">Reject</button>
                                  </div>
                                )}
                                {b.status === 'paid' && (
                                  <div className="flex items-center gap-3">
                                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-xl text-xs font-bold font-mono">{b.slotId}</span>
                                    {b.bookingType !== 'monthly' && (
                                      <button onClick={() => handleComplete(b._id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs">Check Out / Complete</button>
                                    )}
                                  </div>
                                )}
                                {b.status === 'allotted' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl font-mono font-bold">Slot {b.slotId} · Awaiting Pay</span>
                                    <button onClick={() => handleCancel(b._id)} className="bg-rose-50 border border-rose-200 text-rose-600 font-bold px-3 py-1.5 rounded-lg text-xs">Reject</button>
                                  </div>
                                )}
                                {['completed','cancelled'].includes(b.status) && <span className="text-slate-300 text-xs">Archived</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── VIEW: EARNINGS TRACKERS ────────────────────────────────── */}
              {section === 'earnings' && analytics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Earned (Net 90%)</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">₹{analytics.earnings || 0}</p>
                      <p className="text-xs text-slate-400 mt-1">Processed from verified slot reservations</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm border-blue-200 bg-blue-50/10">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Pending Payouts</p>
                      <p className="text-3xl font-black text-blue-600 mt-2">₹{(analytics.earnings * 0.15).toFixed(0)}</p>
                      <p className="text-xs text-blue-500 mt-1">Transferred every Saturday morning</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Occupancy rate</p>
                      <p className="text-3xl font-black text-slate-800 mt-2">{analytics.slots?.occupancyRate}%</p>
                      <p className="text-xs text-slate-400 mt-1">Slot fill rate across approved spaces</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-lg">Payout Ledger Log</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Logs of individual customer slot payments released to you.</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {bookings.filter(b => b.paymentStatus === 'paid').map(b => (
                          <div key={b._id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold">
                            <div>
                              <p className="text-slate-800 font-bold">{b.seekerName} · Slot: {b.slotId}</p>
                              <p className="text-[10px] text-slate-400">{new Date(b.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 text-[10px]">Commuter Fee: ₹{b.totalAmount}</p>
                              <p className="text-emerald-600 font-black mt-0.5">Your Split: ₹{b.ownerEarnings}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW: REVIEWS ──────────────────────────────────────────── */}
              {section === 'reviews' && (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-lg">My Parking Reviews</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Customer feedback and star ratings received for your parking spaces.</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {reviews.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 font-bold">No customer reviews logs found.</p>
                    ) : reviews.map(r => (
                      <div key={r._id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{r.spaceId?.address}</h4>
                              <p className="text-[10px] text-slate-400">Reviewed by: {r.seekerName}</p>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: r.rating }).map((_, idx) => (
                                <Star key={idx} className="h-4 w-4 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm italic mt-3 bg-white border border-slate-100 rounded-xl p-3">"{r.comment}"</p>
                          <p className="text-[9px] text-slate-400 text-right mt-1.5">{new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── VIEW: COMPLAINTS ───────────────────────────────────────── */}
              {section === 'complaints' && (
                <div className="space-y-6">
                  {/* File a complaint form */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-xl mx-auto">
                    <h3 className="font-extrabold text-slate-800 mb-1">Raise Support Ticket</h3>
                    <p className="text-xs text-slate-400 mb-5">Have issues with payments or customers? Report to system admin.</p>
                    <form onSubmit={handleComplaintSubmit} className="space-y-4 text-left">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Ticket Subject</label>
                        <input type="text" required value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="e.g. Payment split delay or Seeker vehicle overstayed"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Description details</label>
                        <textarea required value={compDescription} onChange={e => setCompDescription(e.target.value)} placeholder="Provide full details here..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 h-24" />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition-colors">Submit Ticket</button>
                    </form>
                  </div>

                  {/* Previous complaints list */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100">
                      <h3 className="font-bold text-slate-800">Raised Tickets History</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {complaints.length === 0 ? (
                        <p className="text-slate-400 text-center py-6 text-xs">No ticket history found.</p>
                      ) : complaints.map(c => (
                        <div key={c._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-800 text-sm">{c.subject}</h4>
                            <span className="text-xs uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{c.status}</span>
                          </div>
                          <p className="text-slate-600 text-xs bg-white p-2.5 rounded-lg border border-slate-100">{c.description}</p>
                          {c.reply && (
                            <div className="mt-2.5 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-xs text-slate-700">
                              <span className="font-bold text-emerald-700 uppercase text-[9px] block">Admin Response</span>
                              <p className="mt-0.5">"{c.reply}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW: PROFILE SETUP ────────────────────────────────────── */}
              {section === 'profile' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-md mx-auto">
                  <h3 className="font-extrabold text-slate-800 text-lg mb-1">Host Profile Settings</h3>
                  <p className="text-xs text-slate-400 mb-6">Manage name, contact mobile, or set new security password.</p>
                  
                  <form onSubmit={handleProfileSubmit} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Host Name</label>
                      <input type="text" required value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Phone contact</label>
                      <input type="text" required value={profileForm.contact} onChange={e => setProfileForm(p => ({ ...p, contact: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">New Password (leave empty to keep same)</label>
                      <input type="password" value={profileForm.password} onChange={e => setProfileForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-3">Bank Details (For Payouts)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Bank Name</label>
                          <input type="text" value={profileForm.bankAccountDetails?.bankName} onChange={e => setProfileForm(p => ({ ...p, bankAccountDetails: { ...p.bankAccountDetails, bankName: e.target.value } }))} placeholder="SBI"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Account Holder</label>
                          <input type="text" value={profileForm.bankAccountDetails?.accountName} onChange={e => setProfileForm(p => ({ ...p, bankAccountDetails: { ...p.bankAccountDetails, accountName: e.target.value } }))} placeholder="Name as per bank"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Account Number</label>
                          <input type="text" value={profileForm.bankAccountDetails?.accountNumber} onChange={e => setProfileForm(p => ({ ...p, bankAccountDetails: { ...p.bankAccountDetails, accountNumber: e.target.value } }))} placeholder="XXXX..."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">IFSC Code</label>
                          <input type="text" value={profileForm.bankAccountDetails?.ifscCode} onChange={e => setProfileForm(p => ({ ...p, bankAccountDetails: { ...p.bankAccountDetails, ifscCode: e.target.value } }))} placeholder="SBIN000XXXX"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 uppercase" />
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-colors shadow">Update Profile Settings</button>
                  </form>
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* Driver Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden relative transform transition-all border border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 backdrop-blur-sm">
                  <User className="h-6 w-6 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight">Driver Profile</h3>
                  <p className="text-slate-400 text-xs font-mono font-medium mt-0.5">REF: {selectedBooking._id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="relative z-10 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors border border-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-8 space-y-8">
              {/* Profile & Contact Section */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-shrink-0">
                  {(selectedBooking.seekerId?.profileImage || selectedBooking.driverImage) ? (
                    <img src={selectedBooking.seekerId?.profileImage || selectedBooking.driverImage} alt="Driver" className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-extrabold text-3xl uppercase border border-slate-200 shadow-sm">
                      {selectedBooking.seekerName?.charAt(0) || 'D'}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <h4 className="font-black text-2xl text-slate-900 tracking-tight">{selectedBooking.seekerName}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="bg-blue-50 p-1.5 rounded-md border border-blue-100">
                        <Phone className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-semibold text-slate-700">{selectedBooking.seekerContact || 'Contact not provided'}</span>
                    </div>
                    {selectedBooking.seekerEmail && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="bg-blue-50 p-1.5 rounded-md border border-blue-100">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-semibold text-slate-700 truncate">{selectedBooking.seekerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
                {/* Property Detail */}
                <div className="flex items-start gap-3 border-b border-slate-200/60 pb-4">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <MapPin className="h-4.5 w-4.5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Property Location</p>
                    <p className="font-bold text-sm text-slate-800">{selectedBooking.spaceId?.address || 'Address Not Found'}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedBooking.spaceId?.location || ''}</p>
                  </div>
                </div>

                {/* Booking Amount & Date */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200/60 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Net Payout</p>
                      <p className="font-black text-emerald-700 text-base">₹{selectedBooking.totalAmount ? (selectedBooking.totalAmount * 0.9).toFixed(0) : '0'}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total Bill: ₹{selectedBooking.totalAmount}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <Calendar className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Date & Duration</p>
                      <p className="font-bold text-slate-800 text-sm">
                        {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{selectedBooking.bookingType === 'monthly' ? 'Monthly Plan' : `${selectedBooking.hours} Hours`}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle & Status */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Registered Vehicle</p>
                    <p className="font-mono font-black text-lg text-slate-900 bg-yellow-100/60 px-3 py-1 rounded-xl border border-yellow-200 inline-block shadow-sm">
                      {selectedBooking.vehicleNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Current Status</p>
                    <div className="inline-block mt-1">
                      <StatusBadge status={selectedBooking.status} />
                    </div>
                  </div>
                </div>

                {/* Driving License Image */}
                {selectedBooking.seekerId?.driverLicenseImage && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Driving License (Seeker Profile)</p>
                    <a href={selectedBooking.seekerId.driverLicenseImage} target="_blank" rel="noopener noreferrer">
                      <img src={selectedBooking.seekerId.driverLicenseImage} alt="Driving License" className="w-full max-h-48 object-contain rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 bg-white" />
                    </a>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 flex gap-3">
                {(selectedBooking.paymentStatus === 'paid' || selectedBooking.invoiceId) && (
                  <button onClick={() => setViewingInvoiceId(selectedBooking._id)} className="flex-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-600 font-bold py-3.5 rounded-xl transition-all shadow-sm">
                    View Invoice
                  </button>
                )}
                <button onClick={() => setSelectedBooking(null)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md">
                  Close Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
