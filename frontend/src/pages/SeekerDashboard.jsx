import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SpacesMap from '../components/SpacesMap';
import {
  Car, Clock, DollarSign, CreditCard, CheckCircle,
  MapPin, Calendar, XCircle, User, Star,
  Search, Heart, AlertTriangle, Layers, ChevronRight,
  Wallet, Phone, TrendingUp, Activity, Map, List, Navigation, Loader2
} from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const getVehicleTypeLabel = (type) => {
  const mapping = {
    '2-wheeler': '2-Wheelers (Bike/Scooter)',
    '4-wheeler': '4-Wheelers (Sedan/Hatchback)',
    'large-car': 'Large Cars (SUV/MUV)',
    'heavy-vehicle': 'Heavy Vehicles (Truck/Van)',
  };
  return mapping[type] || type;
};

const getShortVehicleTypeLabel = (type) => {
  const mapping = {
    '2-wheeler': '2-Wheeler',
    '4-wheeler': '4-Wheeler',
    'large-car': 'SUV/MUV',
    'heavy-vehicle': 'Heavy',
  };
  return mapping[type] || type;
};

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'checked_in':
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-300 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          🟢 CHECKED-IN
        </span>
      );
    case 'paid':
      return (
        <span className="inline-flex items-center bg-sky-50 text-sky-700 text-xs font-black px-2.5 py-1 rounded-full border border-sky-300 shadow-sm">
          🎟️ RESERVED
        </span>
      );
    case 'allotted':
      return (
        <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-black px-2.5 py-1 rounded-full border border-blue-300 shadow-sm">
          🅿️ ALLOTTED
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-300">
          ✓ COMPLETED
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-300">
          🚫 CANCELLED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center bg-amber-50 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-300">
          {status || 'Pending'}
        </span>
      );
  }
};

const SeekerDashboard = () => {
  const { token, user, setUser, API_URL, logout, getImageUrl } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive currentView from URL
  const currentView = searchParams.get('view') || 'dashboard';
  const setCurrentView = (view) => {
    if (view === 'dashboard' || !view) {
      setSearchParams({});
    } else {
      setSearchParams({ view });
    }
    // Clear transient UI states when switching tabs
    setSelectedSpace(null);
    setPayingBooking(null);
    setReviewBooking(null);
    setExtendingBooking(null);
    setNavigatingSpace(null);
    setRouteDetails(null);
  };

  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [useWallet, setUseWallet] = useState(true);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);
  const [pinnedLocationName, setPinnedLocationName] = useState('Almasguda, Hyderabad');
  const [locatingGps, setLocatingGps] = useState(false);
  const [customAreaInput, setCustomAreaInput] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'active', 'past'
  const [cancellationGraceMinutes, setCancellationGraceMinutes] = useState(10);

  // Transient UI states (overlays)
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [navigatingSpace, setNavigatingSpace] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [payingBooking, setPayingBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [extendingBooking, setExtendingBooking] = useState(null);
  const [extendHours, setExtendHours] = useState(1);
  const [extendError, setExtendError] = useState('');
  const [extendLoading, setExtendLoading] = useState(false);
  const [expiringBookings, setExpiringBookings] = useState([]);

  // New Booking form (Autofilled with current user account details)
  const [form, setForm] = useState({ 
    vehicleNumber: user?.vehicles?.[0]?.plateNumber || '', 
    vehicleType: user?.vehicles?.[0]?.vehicleType?.toLowerCase() || 'hatchback',
    seekerName: user?.name || '', 
    seekerContact: user?.contact || user?.phone || '', 
    hours: '2', 
    days: '1',
    months: '1',
    startTime: '', 
    slotId: '', 
    bookingType: 'hourly' 
  });
  const [bookingAvailableSlots, setBookingAvailableSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });

  // Review form
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Complaint ticket form
  const [compSubject, setCompSubject] = useState('');
  const [compDescription, setCompDescription] = useState('');

  // Profile setup forms
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', contact: user?.contact || '', password: '', profileImage: user?.profileImage || '', driverLicenseNumber: user?.driverLicenseNumber || '', driverLicenseImage: user?.driverLicenseImage || '' });
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState('4-wheeler');
  const [newModel, setNewModel] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEv, setFilterEv] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(null); // null (All), 1, 5, 10, 15, 20 km
  const [spaceCategoryFilter, setSpaceCategoryFilter] = useState(
    user?.accountCategory === 'bank_finance_seeker' ? 'commercial_vehicle_storage' : 'all'
  );
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [mapView, setMapView] = useState(false);
  const [userLat, setUserLat] = useState(17.313);
  const [userLng, setUserLng] = useState(78.545);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeRadius, setNearMeRadius] = useState(5); // km
  const [activeSpaceId, setActiveSpaceId] = useState(null); // card ↔ map pin hover sync
  const [showSeekerSupportModal, setShowSeekerSupportModal] = useState(false);
  const [supportContacts, setSupportContacts] = useState({
    supportPhone: '+91 8919360467',
    supportEmail: 'plantopark@gmail.com',
    supportWhatsapp: '+91 8919360467',
    supportHours: '24/7 Dedicated Support Desk',
  });

  // Live Navigation & Simulation States
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(5); // coordinates ticked per second (1x to 20x)
  const [arrived, setArrived] = useState(false);
  const [originalRouteDetails, setOriginalRouteDetails] = useState(null);
  const simulationActiveRef = useRef(false);

  const fetchData = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [rB, rA, rS, rC] = await Promise.all([
        fetch(`${API_URL}/bookings/my-bookings`, { headers: h }),
        fetch(`${API_URL}/analytics/seeker`, { headers: h }),
        fetch(`${API_URL}/spaces?search=${searchQuery}`, { headers: h }),
        fetch(`${API_URL}/complaints/my-complaints`, { headers: h }),
      ]);
      if (rB.ok) setBookings(await rB.json());
      if (rA.ok) setAnalytics(await rA.json());
      if (rS.ok) setSpaces(await rS.json());
      if (rC.ok) setComplaints(await rC.json());

      try {
        const supportRes = await fetch(`${API_URL}/settings/support`);
        if (supportRes.ok) {
          const sData = await supportRes.json();
          setSupportContacts(prev => ({ ...prev, ...sData }));
        }
      } catch (sErr) {}

      const rP = await fetch(`${API_URL}/auth/profile`, { headers: h });
      if (rP.ok) {
        const uData = await rP.json();
        setFavorites(uData.favorites || []);
        if (uData.walletBalance !== undefined) {
          setWalletBalance(uData.walletBalance);
        }
        if (uData.walletTransactions && uData.walletTransactions.length > 0) {
          setWalletTransactions(uData.walletTransactions);
        }
      }

      fetch(`${API_URL}/settings/cancellation-rules`)
        .then(r => r.json())
        .then(d => { if (d && d.postCheckInGraceMinutes) setCancellationGraceMinutes(d.postCheckInGraceMinutes); })
        .catch(() => {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bookSpaceId = params.get('bookSpace');
    if (bookSpaceId && token) {
      fetch(`${API_URL}/spaces/${bookSpaceId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          setSelectedSpace(data);
          const now = new Date().toISOString().slice(0, 16);
          setForm(p => ({ ...p, seekerName: user?.name || '', seekerContact: user?.contact || '', startTime: now, bookingType: 'hourly', hours: '1' }));
          setSearchParams({ view: 'find_parking' });
        });
    }
    fetchData();
  }, [location.search, token, searchQuery]);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        seekerName: prev.seekerName || user.name || '',
        seekerContact: prev.seekerContact || user.contact || user.phone || '',
        vehicleNumber: prev.vehicleNumber || user.vehicles?.[0]?.plateNumber || '',
      }));
      if (user.accountCategory === 'bank_finance_seeker') {
        setSpaceCategoryFilter('commercial_vehicle_storage');
      }
    }
  }, [user, selectedSpace]);

  const resetToRealLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => console.log('Error getting position on reset:', err),
        { enableHighAccuracy: true }
      );
    }
  };

  const closeNavigation = () => {
    setNavigatingSpace(null);
    setSimulationActive(false);
    simulationActiveRef.current = false;
    setSimulationPaused(false);
    setSimIndex(0);
    setArrived(false);
    setOriginalRouteDetails(null);
    resetToRealLocation();
  };

  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!simulationActiveRef.current) {
            setUserLat(pos.coords.latitude);
            setUserLng(pos.coords.longitude);
          }
        },
        (err) => console.log('Geolocation watch error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Simulation Loop Hook
  useEffect(() => {
    if (!simulationActive || simulationPaused || !originalRouteDetails?.path || originalRouteDetails.path.length === 0) {
      return;
    }

    const path = originalRouteDetails.path;
    const totalDistance = originalRouteDetails.distance;
    const totalDuration = originalRouteDetails.duration;
    const steps = originalRouteDetails.steps || [];

    // Parse step boundaries and instructions
    let currentBoundary = 0;
    const parsedSteps = steps.map(step => {
      const start = currentBoundary;
      const end = currentBoundary + (step.distance || 0);
      currentBoundary = end;

      let text = step.maneuver?.instruction || '';
      if (!text) {
        let action = (step.maneuver?.modifier || step.maneuver?.type || 'proceed').toLowerCase();
        const road = step.name || 'road';
        if (action === 'uturn') action = 'make a U-turn';
        else if (action === 'left') action = 'turn left';
        else if (action === 'right') action = 'turn right';
        else if (action === 'slight left') action = 'slight turn left';
        else if (action === 'slight right') action = 'slight turn right';
        else if (action === 'sharp left') action = 'turn sharp left';
        else if (action === 'sharp right') action = 'turn sharp right';
        else action = `continue ${action}`;
        text = `${action} onto ${road}`;
      }
      return { start, end, text };
    });

    const interval = setInterval(() => {
      setSimIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= path.length) {
          clearInterval(interval);
          setSimulationActive(false);
          simulationActiveRef.current = false;
          setArrived(true);
          return path.length - 1;
        }

        const point = path[nextIndex];
        setUserLat(point.lat);
        setUserLng(point.lng);

        // Update routeDetails HUD values based on path progress
        const ratio = nextIndex / (path.length - 1);
        const remainingDistance = Math.max(0, totalDistance * (1 - ratio));
        const remainingDuration = Math.max(0, totalDuration * (1 - ratio));

        // Find active step based on distance traveled
        const distanceTraveled = totalDistance * ratio;
        const activeStep = parsedSteps.find(s => distanceTraveled >= s.start && distanceTraveled <= s.end) || parsedSteps[parsedSteps.length - 1];

        let currentInstruction = 'Proceed to destination';
        if (activeStep) {
          const stepRemaining = Math.max(0, activeStep.end - distanceTraveled);
          if (activeStep.text.toLowerCase().includes('arrive') || activeStep.text.toLowerCase().includes('destination')) {
            currentInstruction = `In ${Math.round(stepRemaining)} meters, you will arrive at your destination`;
          } else {
            currentInstruction = `In ${Math.round(stepRemaining)} meters, ${activeStep.text}`;
          }
        }

        setRouteDetails((prev) => ({
          ...prev,
          distance: remainingDistance,
          duration: remainingDuration,
          instruction: currentInstruction,
        }));

        return nextIndex;
      });
    }, 1000 / simulationSpeed);

    return () => clearInterval(interval);
  }, [simulationActive, simulationPaused, originalRouteDetails, simulationSpeed]);

  useEffect(() => {
    const checkExpiring = () => {
      const activePaid = bookings.filter(b => ['paid', 'checked_in', 'allotted'].includes(b.status) && b.endTime);
      const now = new Date();
      const expiring = activePaid.filter(b => {
        const end = new Date(b.endTime);
        const diffMs = end.getTime() - now.getTime();
        return diffMs > 0 && diffMs <= 15 * 60 * 1000;
      });
      setExpiringBookings(expiring);
    };

    checkExpiring();
    const interval = setInterval(checkExpiring, 15000);
    return () => clearInterval(interval);
  }, [bookings]);

  // Dynamically query available slots for the selected space and time window
  useEffect(() => {
    const getSlots = async () => {
      if (!selectedSpace) {
        setBookingAvailableSlots([]);
        return;
      }

      // Default fallback slots from selected space or 5 generic slots
      const defaultSlots = (selectedSpace.slots && selectedSpace.slots.length > 0)
        ? selectedSpace.slots.map(s => ({ slotId: s.slotId, isAvailable: s.isAvailable }))
        : [
            { slotId: 'Slot-1', isAvailable: true },
            { slotId: 'Slot-2', isAvailable: true },
            { slotId: 'Slot-3', isAvailable: true },
            { slotId: 'Slot-4', isAvailable: true },
            { slotId: 'Slot-5', isAvailable: true },
          ];

      const effectiveStartTime = form.startTime || new Date().toISOString();
      const effectiveHours = form.hours || '1';

      setFetchingSlots(true);
      try {
        const res = await fetch(
          `${API_URL}/spaces/${selectedSpace._id}/available-slots-by-time?startTime=${encodeURIComponent(effectiveStartTime)}&hours=${effectiveHours}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const slotsList = Array.isArray(data) ? data : (data.slots && Array.isArray(data.slots)) ? data.slots : defaultSlots;
          setBookingAvailableSlots(slotsList);
          const free = slotsList.filter(s => s.isAvailable);
          if (free.length > 0) {
            setForm(prev => {
              // If current slot is not available or empty, auto-select first free slot
              const currentStillFree = free.some(s => s.slotId === prev.slotId);
              return { ...prev, slotId: currentStillFree ? prev.slotId : free[0].slotId };
            });
          } else {
            setForm(prev => ({ ...prev, slotId: '' }));
          }
        } else {
          setBookingAvailableSlots(defaultSlots);
          const free = defaultSlots.filter(s => s.isAvailable);
          if (free.length > 0) setForm(prev => ({ ...prev, slotId: free[0].slotId }));
        }
      } catch (e) {
        console.error('Error getting slots:', e);
        setBookingAvailableSlots(defaultSlots);
        const free = defaultSlots.filter(s => s.isAvailable);
        if (free.length > 0) setForm(prev => ({ ...prev, slotId: free[0].slotId }));
      }
      setFetchingSlots(false);
    };
    getSlots();
  }, [selectedSpace, form.startTime, form.hours, token, API_URL]);

  const triggerRazorpayPayment = async (booking) => {
    if (!booking || !booking._id) return;
    setPayLoading(true);

    try {
      await loadRazorpayScript();

      const orderRes = await fetch(`${API_URL}/bookings/${booking._id}/razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        alert(errData.message || 'Failed to initialize payment order');
        setPayLoading(false);
        return;
      }

      const orderData = await orderRes.json();
      const { orderId, amount, currency, keyId } = orderData;

      if (!window.Razorpay) {
        alert('Razorpay payment gateway SDK is loading. Please try again.');
        setPayLoading(false);
        return;
      }

      let isPaymentCompleted = false;

      // Real Razorpay checkout flow
      const options = {
        key: keyId || 'rzp_live_TidhMuvoj4fV3b',
        amount: amount,
        currency: currency || 'INR',
        name: 'PlantoPark Safe P2P',
        description: `Booking Reference: ${booking._id}`,
        order_id: orderId,
        handler: async function (response) {
          isPaymentCompleted = true;
          try {
            const verifyRes = await fetch(`${API_URL}/bookings/${booking._id}/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                isMock: false
              })
            });

            if (verifyRes.ok) {
              setPayingBooking(null);
              setSelectedSpace(null);
              await fetchData();
              setCurrentView('bookings');
              alert('🎉 Payment successful! Your parking slot is officially confirmed.');
            } else {
              const errData = await verifyRes.json();
              alert(errData.message || 'Payment signature verification failed.');
            }
          } catch (verErr) {
            console.error('Verification error:', verErr);
          } finally {
            setPayLoading(false);
          }
        },
        prefill: {
          name: user?.name || booking?.seekerName || '',
          email: user?.email || '',
          contact: user?.contact || booking?.seekerContact || ''
        },
        theme: {
          color: '#10b981'
        },
        modal: {
          ondismiss: async function () {
            setPayLoading(false);
            if (!isPaymentCompleted) {
              try {
                await fetch(`${API_URL}/bookings/${booking._id}/cancel`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${token}` }
                });
              } catch (e) {}
              fetchData();
            }
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error('Razorpay Error:', error);
      alert('An error occurred while launching Razorpay payment gateway.');
      setPayLoading(false);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('spaceId', selectedSpace._id);
      fd.append('vehicleNumber', form.vehicleNumber || 'TS07WJ2099');
      fd.append('vehicleType', form.vehicleType || 'hatchback');
      fd.append('seekerName', form.seekerName || user?.name || 'Seeker');
      fd.append('seekerContact', form.seekerContact || user?.contact || '9989551305');
      
      let actualHours = Number(form.hours || 1);
      if (form.bookingType === 'daily') actualHours = Number(form.days || 1) * 24;
      else if (form.bookingType === 'monthly') actualHours = Number(form.months || 1) * 24 * 30;

      fd.append('hours', actualHours);
      fd.append('startTime', form.startTime || new Date().toISOString());
      if (form.slotId) fd.append('slotId', form.slotId);
      fd.append('bookingType', form.bookingType || 'hourly');
      fd.append('useWalletBalance', useWallet);
      if (form.driverImageFile) fd.append('driverImageFile', form.driverImageFile);

      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        const createdBooking = data.booking || data;
        fetchData();
        if (createdBooking.status === 'paid' || data.finalPayableAmount === 0) {
          alert('🎉 Booking confirmed and paid with PlanToPark Wallet!');
          setSelectedSpace(null);
          setCurrentView('bookings');
        } else {
          // Immediately trigger the official Razorpay payment gateway environment!
          triggerRazorpayPayment(createdBooking);
        }
      } else {
        alert(data.message || 'Booking creation failed');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to connect. Please try again.');
    }
    setLoading(false);
  };

  const handleNavigate = (space) => {
    if (!space) return;
    setNavigatingSpace(space);
    if (!userLat || !userLng) {
      if (space.coordinates?.lat && space.coordinates?.lng) {
        setUserLat(space.coordinates.lat - 0.02);
        setUserLng(space.coordinates.lng - 0.02);
      } else {
        setUserLat(12.9716);
        setUserLng(77.5946);
      }
    }
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!extendingBooking) return;
    setExtendError('');
    setExtendLoading(true);

    try {
      // 1. Request Razorpay extension order from backend
      const res = await fetch(`${API_URL}/bookings/${extendingBooking._id}/extend-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ extendHours: Number(extendHours) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setExtendError(data.message || 'Cannot extend booking at this time.');
        setExtendLoading(false);
        return;
      }

      const { orderData, additionalAmount } = data;
      const targetBooking = extendingBooking;
      const selectedHours = Number(extendHours);

      // 2. Ensure Razorpay SDK is ready
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      // 3. Open Razorpay Checkout Sheet
      const options = {
        key: orderData?.keyId || 'rzp_live_TidhMuvoj4fV3b',
        amount: orderData?.amount || Math.round(additionalAmount * 100),
        currency: orderData?.currency || 'INR',
        name: 'PlantoPark Safe P2P',
        description: `Extend Slot ${targetBooking.slotId || 'Slot-1'} by ${selectedHours} hr(s)`,
        order_id: orderData?.orderId,
        handler: async function (response) {
          try {
            setExtendLoading(true);
            const verifyRes = await fetch(`${API_URL}/bookings/${targetBooking._id}/extend-verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                extendHours: selectedHours,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                isMock: false
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setExtendingBooking(null);
              setExtendHours(1);
              await fetchData();
              alert(`🎉 Parking Pass Extended Successfully!\n\nYour slot ${targetBooking.slotId || 'Slot-1'} is extended by +${selectedHours} hr(s).\nPayment of ₹${Number(additionalAmount).toFixed(2)} received.`);
            } else {
              setExtendError(verifyData.message || 'Payment verification failed.');
            }
          } catch (verErr) {
            console.error('Extend verification error:', verErr);
            alert('Extension payment completed. Updating your booking pass...');
            await fetchData();
            setExtendingBooking(null);
          } finally {
            setExtendLoading(false);
          }
        },
        prefill: {
          name: user?.name || targetBooking.seekerName || '',
          email: user?.email || '',
          contact: user?.contact || targetBooking.seekerContact || ''
        },
        theme: {
          color: '#10b981'
        },
        modal: {
          ondismiss: function () {
            setExtendLoading(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error('Error extending booking:', err);
      setExtendError('Failed to initiate payment gateway. Please try again.');
      setExtendLoading(false);
    }
  };

  const handlePay = async (e) => {
    if (e) e.preventDefault();
    if (payingBooking) {
      triggerRazorpayPayment(payingBooking);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ spaceId: reviewBooking.spaceId._id, rating, comment: reviewComment }),
    });
    if (res.ok) {
      alert('Thank you! Your review has been posted.');
      setReviewBooking(null);
      setReviewComment('');
      setCurrentView('dashboard');
      fetchData();
    }
  };

  const handleCheckIn = async (booking) => {
    const spotTitle = booking.spaceId?.title || 'the parking spot';
    const slot = booking.slotId || 'assigned slot';
    if (!window.confirm(`🅿️ Check In to Parking Spot\n\nHave you arrived at ${spotTitle} (Slot: ${slot})?\n\nChecking in starts your dynamic parking timer and notifies the space owner that your vehicle is parked.\n\nClick OK to check in now.`)) return;
    try {
      const res = await fetch(`${API_URL}/bookings/${booking._id}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert('🅿️ Checked In Successfully! Your dynamic parking timer is now running.');
        fetchData();
      } else {
        alert(data.message || 'Check-in failed');
      }
    } catch (err) {
      alert('Network error during check-in: ' + err.message);
    }
  };

  const handleCancel = async (bookingOrId) => {
    const booking = typeof bookingOrId === 'object' ? bookingOrId : bookings.find(b => b._id === bookingOrId);
    const bookingId = booking?._id || bookingOrId;
    const isCheckedIn = Boolean(booking?.isCheckedIn) || booking?.status === 'checked_in';

    if (isCheckedIn) {
      const checkInDate = booking?.checkInTime || booking?.startTime;
      if (checkInDate) {
        const elapsed = (Date.now() - new Date(checkInDate).getTime()) / (1000 * 60);
        if (elapsed > cancellationGraceMinutes) {
          alert(`⚠️ Cancellation Window Closed\n\nCancellation is only permitted within ${cancellationGraceMinutes} minutes of check-in. Your parking session is active.\n\nPlease click "Check Out" when departing.`);
          return;
        }
      }
    }

    const amount = Number(booking?.totalAmount || 0) + Number(booking?.walletAmountUsed || 0);
    const refundPct = !isCheckedIn ? '100%' : '20%';
    const refundEstimated = !isCheckedIn ? amount : Number((amount * 0.20).toFixed(2));
    const refundDetails = isCheckedIn 
      ? `Because you have already checked in, 20% (₹${refundEstimated}) will be refunded back to your PlanToPark wallet (80% retained for space owner/platform).\n\n(Grace Period: ${cancellationGraceMinutes} minutes after check-in)`
      : `Before check-in, 100% full refund (₹${refundEstimated}) will be credited back to your PlanToPark wallet.`;
    
    if (!window.confirm(`Cancel Reservation\n\nStandard Platform Refund: ${refundPct}\n${refundDetails}\n\nDo you want to confirm cancellation?`)) return;

    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.message || `Booking cancelled. ${data.refundAmount ? `₹${data.refundAmount} refunded to your wallet.` : ''}`);
        fetchData();
      } else {
        alert(data.message || 'Cancellation failed');
      }
    } catch (err) {
      alert('Network error while cancelling booking');
    }
  };

  const handleComplete = async (bookingOrId) => {
    const booking = typeof bookingOrId === 'object' ? bookingOrId : bookings.find(b => b._id === bookingOrId);
    const bookingId = booking?._id || bookingOrId;
    const spotTitle = booking?.spaceId?.title || 'this spot';
    const slot = booking?.slotId || 'assigned slot';
    if (!window.confirm(`🚪 Check Out of Parking Spot\n\nAre you ready to check out from ${spotTitle} (Slot: ${slot})?\n\nThis will release the spot for other parking seekers.\n\nClick OK to confirm check-out.`)) return;
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.message || 'Checked out successfully. Slot is now released! 👋');
        fetchData();
      } else {
        alert(data.message || 'Could not complete checkout');
      }
    } catch (err) {
      alert('Network error during check-out');
    }
  };

  const handleToggleFavorite = async (spaceId) => {
    const res = await fetch(`${API_URL}/auth/favorites/${spaceId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) fetchData();
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject: compSubject, description: compDescription }),
    });
    if (res.ok) {
      alert('Support ticket raised. Admin will assist shortly.');
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
    if (res.ok) {
      const updated = await res.json();
      if (setUser && updated) {
        setUser(prev => ({ ...prev, ...updated }));
      }
      setProfileImgError(false);
      alert('Profile updated successfully! 📸');
      setShowEditProfileModal(false);
      fetchData();
    } else {
      alert('Failed to update profile');
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plateNumber: newPlate, vehicleType: newType, model: newModel }),
    });
    if (res.ok) {
      alert('Vehicle registered!');
      setNewPlate('');
      setNewModel('');
      fetchData();
    }
  };

  const handleDeleteVehicle = async (vId) => {
    const res = await fetch(`${API_URL}/auth/vehicles/${vId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) fetchData();
  };

  const POPULAR_LOCATIONS = [
    { name: 'Almasguda, Hyderabad', lat: 17.313, lng: 78.545 },
    { name: 'Hitech City, Hyderabad', lat: 17.443, lng: 78.377 },
    { name: 'Banjara Hills, Hyderabad', lat: 17.415, lng: 78.435 },
    { name: 'Madhapur, Hyderabad', lat: 17.448, lng: 78.390 },
    { name: 'Gachibowli, Hyderabad', lat: 17.440, lng: 78.348 },
    { name: 'Jubilee Hills, Hyderabad', lat: 17.431, lng: 78.407 },
    { name: 'Kondapur, Hyderabad', lat: 17.468, lng: 78.361 },
    { name: 'Secunderabad Station', lat: 17.434, lng: 78.501 },
  ];

  const handleUseGps = () => {
    setLocatingGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, {
              headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();

            let detailedAddress = '';
            if (data && data.address) {
              const a = data.address;
              const parts = [];

              // 1. Plot / House / Building / Landmark / Shop / Amenity
              const premise = a.house_number || a.house_name || a.building || a.landmark || a.amenity || a.shop || a.office || a.isolated_dwelling;
              if (premise) parts.push(premise);

              // 2. Street / Road / Lane / Colony
              const road = a.road || a.street || a.residential || a.pedestrian || a.path || a.lane || a.footway;
              if (road && !parts.includes(road)) parts.push(road);

              // 3. Neighbourhood / Colony / Block
              const neighbourhood = a.neighbourhood || a.quarter || a.hamlet;
              if (neighbourhood && !parts.includes(neighbourhood)) parts.push(neighbourhood);

              // 4. Suburb / Area / Locality
              const suburb = a.suburb || a.locality || a.subdistrict;
              if (suburb && !parts.includes(suburb)) parts.push(suburb);

              // 5. Mandal / County / City District / Zone
              const county = a.county || a.city_district || a.district;
              if (county && !parts.includes(county) && county !== a.city) parts.push(county);

              // 6. City / Town / Municipality
              const city = a.city || a.town || a.municipality || a.state_district;
              if (city && !parts.includes(city)) parts.push(city);

              // 7. State
              if (a.state && !parts.includes(a.state)) parts.push(a.state);

              // 8. Postcode / PIN Code
              if (a.postcode && !parts.includes(a.postcode)) parts.push(a.postcode);

              if (parts.length >= 2) {
                detailedAddress = parts.join(', ');
              }
            }

            if (!detailedAddress && data && data.display_name) {
              detailedAddress = data.display_name.replace(/,\s*(India|IN)$/i, '').trim();
            }

            // Fallback to client reverse geocode if needed
            if (!detailedAddress) {
              try {
                const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
                const bdcData = await bdcRes.json();
                if (bdcData) {
                  const bdcParts = [];
                  if (bdcData.locality) bdcParts.push(bdcData.locality);
                  if (bdcData.city && !bdcParts.includes(bdcData.city)) bdcParts.push(bdcData.city);
                  if (bdcData.principalSubdivision && !bdcParts.includes(bdcData.principalSubdivision)) bdcParts.push(bdcData.principalSubdivision);
                  if (bdcData.postcode && !bdcParts.includes(bdcData.postcode)) bdcParts.push(bdcData.postcode);
                  if (bdcParts.length > 0) detailedAddress = bdcParts.join(', ');
                }
              } catch (bdcErr) {}
            }

            setPinnedLocationName(detailedAddress ? `🎯 ${detailedAddress}` : `🎯 GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          } catch (e) {
            setPinnedLocationName(`🎯 GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          } finally {
            setLocatingGps(false);
            setShowPinModal(false);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          alert('Could not detect GPS location automatically. Please check your browser location permissions or choose an area from the search list.');
          setLocatingGps(false);
          setShowPinModal(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setLocatingGps(false);
      setShowPinModal(false);
    }
  };

  const handleSelectPresetLocation = (loc) => {
    setUserLat(loc.lat);
    setUserLng(loc.lng);
    setPinnedLocationName(`📍 ${loc.name}`);
    setShowPinModal(false);
  };

  const handleCustomAreaSearch = (e) => {
    if (e) e.preventDefault();
    if (!customAreaInput.trim()) return;
    setPinnedLocationName(`📍 ${customAreaInput.trim()}`);
    setSearchQuery(customAreaInput.trim());
    setShowPinModal(false);
  };

  const mapSrc = (address) =>
    `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const activeBookings = bookings.filter(b => ['paid', 'checked_in', 'allotted'].includes(b.status));
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
  const totalSpent = analytics?.totalSpent || 0;

  // Geocoding distance calculation helper (Haversine Formula)
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth radius in KM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 0.1 ? 0.1 : Math.round(dist * 10) / 10;
  };

  // Dynamically filtered spaces based on search, EV filter, radius, and distance
  const displaySpaces = spaces
    .map(space => {
      const sLat = space.coordinates?.lat || space.lat;
      const sLng = space.coordinates?.lng || space.lng;
      const dist = calculateDistanceKm(userLat || 17.313, userLng || 78.545, sLat, sLng);
      return {
        ...space,
        calculatedDist: dist !== null ? dist : 999,
        distBadge: dist !== null ? `${dist} km away` : 'Nearby',
      };
    })
    .sort((a, b) => (a.calculatedDist || 999) - (b.calculatedDist || 999))
    .filter(item => {
      if (item.isActive === false) return false;
      if (selectedRadius !== null && item.calculatedDist !== null && item.calculatedDist > selectedRadius) {
        return false;
      }
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q));

      const matchesEv = filterEv ? item.hasEvCharger : true;
      const matchesCategory =
        spaceCategoryFilter === 'all'
          ? true
          : (item.spaceCategory || 'standard') === spaceCategoryFilter;
      return matchesSearch && matchesEv && matchesCategory;
    });

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER — no sidebar, full-width layout
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Expiring Bookings Alert Banner */}
        {expiringBookings.length > 0 && expiringBookings.map(eb => {
          const end = new Date(eb.endTime);
          const diffMin = Math.ceil((end.getTime() - new Date().getTime()) / 60000);
          return (
            <div key={eb._id} className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-pulse">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">🚨 Parking Session Expiring Soon!</h4>
                  <p className="text-xs text-rose-600 mt-0.5 font-medium">
                    Your slot <strong className="font-mono text-rose-800">{eb.slotId}</strong> at <strong>{eb.spaceId?.address}</strong> expires in <strong className="text-sm font-black">{diffMin} mins</strong>. Please extend your booking or check out now.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setExtendingBooking(eb); setExtendError(''); setExtendHours(1); }}
                  className="bg-rose-650 hover:bg-rose-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition-colors shadow-sm bg-rose-600"
                >
                  Extend Booking
                </button>
                <button
                  onClick={() => handleComplete(eb._id)}
                  className="bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 font-extrabold px-3.5 py-2 rounded-xl text-xs transition-colors"
                >
                  Check Out
                </button>
              </div>
            </div>
          );
        })}

        {/* ── VIEW: DASHBOARD / DISCOVER (SEEKER APP 1:1) ───────────────── */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {selectedSpace ? (
              /* ── EXACT SEEKER APP MATCHING SPOT DETAILS & RESERVATION VIEW ── */
              <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
                {/* Back button */}
                <button
                  onClick={() => setSelectedSpace(null)}
                  className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-xs transition-colors cursor-pointer"
                >
                  ← Back to Discover Spots
                </button>

                {/* 1. SPOT BANNER & LIVE BADGES */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] bg-slate-100 border border-slate-100">
                    <img
                      src={getImageUrl ? getImageUrl(selectedSpace.images?.[0] || selectedSpace.image || selectedSpace.photoUrl) : (selectedSpace.image || selectedSpace.photoUrl)}
                      alt={selectedSpace.title || selectedSpace.address}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {selectedSpace.spaceCategory === 'commercial_vehicle_storage' ? (
                        <>
                          <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md shadow uppercase tracking-wider">
                            🏢 1+ ACRE REPO STOCKYARD
                          </span>
                          <span className="bg-slate-900/90 text-amber-300 font-black text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md shadow uppercase tracking-wider">
                            📐 {selectedSpace.landAcres || 1.0} Contiguous Acres
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="bg-emerald-600/95 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md shadow uppercase tracking-wider">
                            🛡️ VERIFIED PARKING
                          </span>
                          {selectedSpace.hasEvCharger && (
                            <span className="bg-blue-600/95 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md shadow uppercase tracking-wider">
                              ⚡ EV CHARGING
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Pricing Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        {selectedSpace.title || selectedSpace.address}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {selectedSpace.address || selectedSpace.location}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      {selectedSpace.spaceCategory === 'commercial_vehicle_storage' ? (
                        <>
                          <p className="text-2xl font-black text-amber-600">
                            ₹{selectedSpace.monthlyStorageRate || 2500}<span className="text-xs font-bold text-slate-400">/car/mo</span>
                          </p>
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-1 border border-amber-200">
                            🟢 {bookingAvailableSlots.filter(s => s.isAvailable).length} of {bookingAvailableSlots.length || selectedSpace.totalSlots || 5} Repo Bays Free
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-black text-emerald-600">
                            ₹{selectedSpace.pricePerHour || 50}<span className="text-xs font-bold text-slate-400">/hr</span>
                          </p>
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-1 border border-emerald-200">
                            🟢 {bookingAvailableSlots.filter(s => s.isAvailable).length} of {bookingAvailableSlots.length || selectedSpace.totalSlots || 5} Slots Free
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stockyard Security Checklist if commercial */}
                  {selectedSpace.spaceCategory === 'commercial_vehicle_storage' && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                      <p className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        🛡️ Stockyard Security &amp; Repossession Infrastructure (Min 1+ Acre)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className={`p-2 rounded-xl border font-bold text-center ${selectedSpace.securityFacilities?.hasCompoundWall ? 'bg-white border-amber-300 text-amber-900' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          🧱 {selectedSpace.securityFacilities?.hasCompoundWall ? 'Compound Wall' : 'No Wall'}
                        </div>
                        <div className={`p-2 rounded-xl border font-bold text-center ${selectedSpace.securityFacilities?.has24x7Guards ? 'bg-white border-amber-300 text-amber-900' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          👮 {selectedSpace.securityFacilities?.has24x7Guards ? '24/7 Guards' : 'No Guards'}
                        </div>
                        <div className={`p-2 rounded-xl border font-bold text-center ${selectedSpace.securityFacilities?.hasCctv ? 'bg-white border-amber-300 text-amber-900' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          📹 {selectedSpace.securityFacilities?.hasCctv ? 'CCTV Network' : 'No CCTV'}
                        </div>
                        <div className={`p-2 rounded-xl border font-bold text-center ${selectedSpace.securityFacilities?.hasFloodLights ? 'bg-white border-amber-300 text-amber-900' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          💡 {selectedSpace.securityFacilities?.hasFloodLights ? 'Floodlights' : 'No Floodlights'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Supported Vehicle Sizes & Types Overview Card */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        🚗 Vehicles That Fit in This Spot
                      </p>
                      <span className="text-[11px] font-bold text-slate-400">Capacity Fit Guide</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'hatchback', name: 'Hatchback', icon: '🚗', desc: 'Small cars (Swift, i20, Baleno)' },
                        { id: 'sedan', name: 'Sedan', icon: '🚘', desc: 'Midsize cars (Dzire, City, Verna)' },
                        { id: 'suv', name: 'SUV', icon: '🚙', desc: 'Large cars (Creta, Seltos, XUV700)' },
                        { id: '2-wheeler', name: '2-Wheeler', icon: '🏍️', desc: 'Bikes & Scooters (Activa, Pulsar, Splendor)' },
                      ].map((v) => {
                        const fits = !selectedSpace.suitableVehicles ||
                          selectedSpace.suitableVehicles.length === 0 ||
                          (v.id === '2-wheeler'
                            ? selectedSpace.suitableVehicles.includes('2-wheeler')
                            : (selectedSpace.suitableVehicles.includes('4-wheeler') || selectedSpace.suitableVehicles.includes(v.id)));
                        return (
                          <div
                            key={v.id}
                            className={`flex items-center justify-between p-2.5 rounded-2xl border transition-colors ${
                              fits
                                ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xl shrink-0">{v.icon}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate leading-tight">{v.name}</p>
                                <p className="text-[10px] text-slate-400 truncate leading-tight">{v.desc}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                              fits ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {fits ? '✓ FITS' : '✕ NO'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Button */}
                  <div className="pt-2 border-t border-slate-100 flex gap-2">
                    <a
                      href={selectedSpace.googleMapsLink || `https://maps.google.com/?q=${encodeURIComponent(selectedSpace.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation className="h-3.5 w-3.5 text-blue-600" />
                      Open Google Maps Navigation
                    </a>
                  </div>
                </div>

                {/* 2. RESERVATION DETAILS CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <h3 className="text-lg font-black text-slate-900">Reservation Details</h3>

                  <form onSubmit={handleBookSubmit} className="space-y-6">
                    {/* Driver & Contact Details (Autofilled from Account) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                          Driver &amp; Contact Details
                        </label>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ✓ Auto-Filled from Account
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Driver / Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Akhil Kumar"
                            value={form.seekerName}
                            onChange={e => setForm(p => ({ ...p, seekerName: e.target.value }))}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number / Contact</label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +91 99895 51305"
                            value={form.seekerContact}
                            onChange={e => setForm(p => ({ ...p, seekerContact: e.target.value }))}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Plate Number */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                        Vehicle Plate Number
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={form.vehicleNumber}
                          onChange={e => {
                            const chosenPlate = e.target.value;
                            const matchedV = user?.vehicles?.find(v => v.plateNumber === chosenPlate);
                            let matchedType = form.vehicleType;
                            if (matchedV) {
                              const vt = (matchedV.vehicleType || matchedV.type || '').toLowerCase();
                              if (vt.includes('2') || vt.includes('bike') || vt.includes('scooter')) matchedType = '2-wheeler';
                              else if (vt.includes('sedan')) matchedType = 'sedan';
                              else if (vt.includes('suv')) matchedType = 'suv';
                              else if (vt.includes('hatchback')) matchedType = 'hatchback';
                            }
                            setForm(p => ({ ...p, vehicleNumber: chosenPlate, vehicleType: matchedType }));
                          }}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="" disabled>Select from Saved Vehicles</option>
                          {user?.vehicles?.map(v => (
                            <option key={v._id} value={v.plateNumber}>{v.plateNumber} ({v.model || v.vehicleType})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="e.g. TS 08 EA 5678"
                          value={form.vehicleNumber}
                          onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 uppercase focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Your Vehicle Type / Size (Matches Seeker App 1:1) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                          Your Vehicle Type / Size
                        </label>
                        <span className="text-[11px] font-bold text-slate-400">
                          Select size to verify fit
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'hatchback', label: 'Hatchback', icon: '🚗', desc: 'Swift, i20, Baleno' },
                          { id: 'sedan', label: 'Sedan', icon: '🚘', desc: 'Dzire, City, Verna' },
                          { id: 'suv', label: 'SUV', icon: '🚙', desc: 'Creta, Seltos, XUV' },
                          { id: '2-wheeler', label: '2-Wheeler', icon: '🏍️', desc: 'Bikes & Scooters' },
                        ].map((vt) => {
                          const isSelected = (form.vehicleType || 'hatchback') === vt.id;
                          const fits = vt.id === '2-wheeler'
                            ? (!selectedSpace.suitableVehicles || selectedSpace.suitableVehicles.length === 0 || selectedSpace.suitableVehicles.includes('2-wheeler'))
                            : (!selectedSpace.suitableVehicles || selectedSpace.suitableVehicles.length === 0 || selectedSpace.suitableVehicles.includes('4-wheeler') || selectedSpace.suitableVehicles.includes(vt.id));
                          
                          return (
                            <button
                              key={vt.id}
                              type="button"
                              onClick={() => setForm(p => ({ ...p, vehicleType: vt.id }))}
                              className={`p-3 rounded-2xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              } ${!fits ? 'opacity-70 border-rose-200' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xl">{vt.icon}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  fits ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {fits ? '✓ Fits' : '⚠️ Tight'}
                                </span>
                              </div>
                              <p className={`text-xs font-black mt-2 ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                {vt.label}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {vt.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Multi-Tier Duration & Pricing (Matches Seeker App 1:1) */}
                    {(() => {
                      const hourlyRate = selectedSpace.pricePerHour !== undefined ? selectedSpace.pricePerHour : (selectedSpace.hourlyRate || 40);
                      const dailyRate = selectedSpace.pricePerDay || (hourlyRate * 8);
                      const monthlyRate = selectedSpace.pricePerMonth || (hourlyRate * 8 * 25);

                      let rawTotalPrice = hourlyRate;
                      let baseRateCalculationText = '';

                      if (form.bookingType === 'hourly') {
                        const hrs = Math.max(1, Number(form.hours || 2));
                        rawTotalPrice = hrs * hourlyRate;
                        baseRateCalculationText = `₹${hourlyRate} × ${hrs} hr${hrs > 1 ? 's' : ''} = ₹${rawTotalPrice}`;
                      } else if (form.bookingType === 'daily') {
                        const days = Math.max(1, Number(form.days || 1));
                        rawTotalPrice = days * dailyRate;
                        baseRateCalculationText = `₹${dailyRate} × ${days} day${days > 1 ? 's' : ''} = ₹${rawTotalPrice}`;
                      } else if (form.bookingType === 'monthly') {
                        const months = Math.max(1, Number(form.months || 1));
                        rawTotalPrice = months * monthlyRate;
                        baseRateCalculationText = `₹${monthlyRate} × ${months} mo${months > 1 ? 's' : ''} = ₹${rawTotalPrice}`;
                      }

                      const maxDiscount = Number(selectedSpace.maxWalletDiscount ?? 10);
                      const discount = (useWallet && maxDiscount > 0) ? Math.min(walletBalance, maxDiscount, rawTotalPrice) : 0;
                      const finalTotal = Math.max(0, rawTotalPrice - discount);

                      return (
                        <>
                          {/* Duration Mode Switcher */}
                          <div className="space-y-2">
                            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                              Select Booking Duration Mode
                            </label>
                            <div className="grid grid-cols-3 gap-2.5">
                              {[
                                { id: 'hourly', label: '⏱️ Hourly', rateText: `₹${hourlyRate}/hr` },
                                { id: 'daily', label: '📅 1 Day Flat', rateText: `₹${dailyRate}` },
                                { id: 'monthly', label: '🗓️ 1 Month', rateText: `₹${monthlyRate}` },
                              ].map((plan) => {
                                const isSelected = (form.bookingType || 'hourly') === plan.id;
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, bookingType: plan.id }))}
                                    className={`p-3 rounded-2xl border text-center transition-all ${
                                      isSelected
                                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <p className={`text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                      {plan.label}
                                    </p>
                                    <p className={`text-[11px] font-bold mt-0.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                                      {plan.rateText}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Interactive +/- Stepper Duration Control */}
                          {form.bookingType === 'hourly' && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700">⏱️ Parking Duration (Hours)</span>
                                <span className="text-xs font-black text-emerald-600">₹{hourlyRate}/hr</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, hours: String(Math.max(1, Number(p.hours || 1) - 1)) }))}
                                  disabled={Number(form.hours || 1) <= 1}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  −
                                </button>
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-2.5 text-center">
                                  <p className="text-base font-black text-slate-900 leading-tight">
                                    {form.hours || 1} {Number(form.hours || 1) === 1 ? 'Hour' : 'Hours'}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    ₹{Number(form.hours || 1) * hourlyRate} Total Base
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, hours: String(Math.min(24, Number(p.hours || 1) + 1)) }))}
                                  disabled={Number(form.hours || 1) >= 24}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  +
                                </button>
                              </div>
                              {/* Quick Hours Presets */}
                              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                {[1, 2, 4, 8, 12, 24].map((hr) => (
                                  <button
                                    key={hr}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, hours: String(hr) }))}
                                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black border transition-all ${
                                      Number(form.hours || 1) === hr
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {hr}h
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {form.bookingType === 'daily' && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700">📅 Parking Duration (Days)</span>
                                <span className="text-xs font-black text-emerald-600">₹{dailyRate}/day</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, days: String(Math.max(1, Number(p.days || 1) - 1)) }))}
                                  disabled={Number(form.days || 1) <= 1}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  −
                                </button>
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-2.5 text-center">
                                  <p className="text-base font-black text-slate-900 leading-tight">
                                    {form.days || 1} {Number(form.days || 1) === 1 ? 'Day' : 'Days'}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    ₹{Number(form.days || 1) * dailyRate} Total Base
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, days: String(Math.min(30, Number(p.days || 1) + 1)) }))}
                                  disabled={Number(form.days || 1) >= 30}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  +
                                </button>
                              </div>
                              {/* Quick Days Presets */}
                              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                {[1, 2, 3, 5, 7, 15].map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, days: String(d) }))}
                                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black border transition-all ${
                                      Number(form.days || 1) === d
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {d}d
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {form.bookingType === 'monthly' && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700">🗓️ Parking Duration (Months)</span>
                                <span className="text-xs font-black text-emerald-600">₹{monthlyRate}/mo</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, months: String(Math.max(1, Number(p.months || 1) - 1)) }))}
                                  disabled={Number(form.months || 1) <= 1}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  −
                                </button>
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-2.5 text-center">
                                  <p className="text-base font-black text-slate-900 leading-tight">
                                    {form.months || 1} {Number(form.months || 1) === 1 ? 'Month' : 'Months'}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    ₹{Number(form.months || 1) * monthlyRate} Total Base
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, months: String(Math.min(12, Number(p.months || 1) + 1)) }))}
                                  disabled={Number(form.months || 1) >= 12}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  +
                                </button>
                              </div>
                              {/* Quick Months Presets */}
                              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                {[1, 2, 3, 6, 12].map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, months: String(m) }))}
                                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black border transition-all ${
                                      Number(form.months || 1) === m
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {m}m
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PlanToPark Wallet Money Deduction Card */}
                          {walletBalance > 0 && maxDiscount > 0 && (
                            <div
                              onClick={() => setUseWallet(p => !p)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                useWallet
                                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${
                                  useWallet ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  ⚡
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900">
                                    Use PlanToPark Wallet (-₹{discount})
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    Available Balance: ₹{Number(walletBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} • Max ₹{maxDiscount} usable
                                  </p>
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-black ${
                                useWallet ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white'
                              }`}>
                                {useWallet && '✓'}
                              </div>
                            </div>
                          )}

                          {/* Live Price Breakdown Box */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 text-xs">
                            <div className="flex justify-between text-slate-600 font-medium">
                              <span>Base Rate</span>
                              <span className="font-bold text-slate-800">{baseRateCalculationText}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-emerald-600 font-bold">
                                <span>⚡ Wallet Money Applied</span>
                                <span>- ₹{Number(discount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-600 font-medium">
                              <span>Platform Convenience Fee</span>
                              <span className="font-bold text-slate-800">₹0 (Free)</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-black text-slate-900">
                              <span>Total Payable</span>
                              <span className="text-2xl font-black text-emerald-600">₹{finalTotal}</span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            type="submit"
                            disabled={loading || payLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-emerald-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {loading || payLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                            ) : (
                              finalTotal === 0 ? 'Confirm with Wallet • Free' : `Confirm & Pay • ₹${finalTotal}`
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </form>
                </div>
              </div>
            ) : (
              /* ── DISCOVER MAIN SCREEN (SEEKER APP 1:1) ── */
              <div className="space-y-5">
                {/* 1. Pinned Location Banner */}
                <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-emerald-500/20">
                      📍
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Pinned Search Location</p>
                      <p className="text-sm font-extrabold text-slate-900 break-words line-clamp-2" title={pinnedLocationName}>{pinnedLocationName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUseGps}
                      disabled={locatingGps}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      🎯 {locatingGps ? 'Locating...' : 'GPS Detect'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPinModal(true)}
                      className="bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-700 font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Change Pin 📍
                    </button>
                  </div>
                </div>

                {/* 2. Seeker App Search & Filter Header */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <Search className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search city, area, landmark, or spot name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-grow bg-transparent text-xs sm:text-sm font-semibold focus:outline-none text-slate-800"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* EV Filter Toggle */}
                    <button
                      type="button"
                      onClick={() => setFilterEv(p => !p)}
                      className={`px-4 py-3 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 ${
                        filterEv
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ⚡ EV Only
                    </button>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Map className="h-3.5 w-3.5" /> Map View
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <List className="h-3.5 w-3.5" /> List View
                      </button>
                    </div>
                  </div>

                  {/* Space Category Tabs (Standard vs Commercial Repo Stockyards) */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Category:</span>
                    {[
                      { id: 'all', label: '🌐 All Spaces' },
                      { id: 'standard', label: '🅿️ Standard Parking' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSpaceCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                          spaceCategoryFilter === cat.id
                            ? cat.id === 'commercial_vehicle_storage'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                              : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Bank & Auto Finance Banner if applicable */}
                  {user?.accountCategory === 'bank_finance_seeker' && (
                    <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white p-3.5 rounded-2xl border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🏦</span>
                        <div>
                          <p className="font-black text-cyan-200">
                            Bank &amp; Auto Finance Repossession Portal ({user.organizationName || 'Fleet Operations'})
                          </p>
                          <p className="text-[11px] text-slate-300">
                            Filtering for secured vehicle stockyards with <strong>minimum 1.0 contiguous acre</strong>, compound walls, 24/7 armed guards, and floodlights.
                          </p>
                        </div>
                      </div>
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                        1+ Acre Yards Only
                      </span>
                    </div>
                  )}

                  {/* Radius Distance Filter Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Radius:</span>
                    {[
                      { label: '🌐 All', value: null },
                      { label: '🎯 1 km', value: 1 },
                      { label: '🎯 5 km', value: 5 },
                      { label: '🎯 10 km', value: 10 },
                      { label: '🎯 15 km', value: 15 },
                      { label: '🎯 20 km', value: 20 },
                      { label: '🎯 25 km', value: 25 },
                    ].map(r => (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => setSelectedRadius(r.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border shrink-0 ${
                          selectedRadius === r.value
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Interactive Leaflet Map View */}
                {viewMode === 'map' && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm overflow-hidden space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Map className="h-4 w-4 text-emerald-600" /> Interactive Live Parking Map
                      </p>
                      <span className="text-[11px] font-bold text-slate-400">
                        {displaySpaces.length} verified spots plotted
                      </span>
                    </div>
                    <div className="h-[420px] rounded-2xl overflow-hidden border border-slate-200 relative">
                      <SpacesMap
                        spaces={displaySpaces}
                        userLat={userLat || 17.313}
                        userLng={userLng || 78.545}
                        activeSpaceId={activeSpaceId}
                        onBook={(space) => {
                          setSelectedSpace(space);
                          const now = new Date().toISOString().slice(0, 16);
                          setForm(p => ({ ...p, seekerName: user?.name || '', seekerContact: user?.contact || '', startTime: now, bookingType: 'hourly', hours: '1' }));
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 4. Seeker App 1:1 Spot Cards Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900">
                      Nearby Verified Parking Spots ({displaySpaces.length})
                    </h3>
                  </div>

                  {displaySpaces.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
                      <p className="text-base font-black text-slate-700">No parking spots found within selected radius.</p>
                      <p className="text-xs text-slate-400">Try expanding your radius filter or resetting the search.</p>
                      <button
                        type="button"
                        onClick={() => { setSelectedRadius(null); setSearchQuery(''); setFilterEv(false); }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all"
                      >
                        Reset Filters (Show All Spots)
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {displaySpaces.map(space => {
                        const freeSlots = space.slots?.filter(s => s.isAvailable).length ?? space.totalSlots ?? 5;
                        const isFull = freeSlots <= 0;
                        const spotImg = getImageUrl ? getImageUrl(space.images?.[0] || space.image || space.photoUrl) : (space.image || space.photoUrl);
                        const sLat = space.coordinates?.lat || space.lat;
                        const sLng = space.coordinates?.lng || space.lng;
                        const isStorage = space.spaceCategory === 'commercial_vehicle_storage';
                        return (
                          <div
                            key={space._id}
                            className={`rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group p-5 space-y-4 ${
                              isStorage
                                ? 'bg-gradient-to-b from-amber-50/50 via-white to-white border-2 border-amber-300/80 shadow-amber-500/10 ring-1 ring-amber-200'
                                : 'bg-white border border-slate-200'
                            }`}
                          >
                            <div>
                              {/* Photo */}
                              <div className="relative aspect-[16/10] bg-slate-100 rounded-2xl overflow-hidden mb-4">
                                <img
                                  src={spotImg}
                                  alt={space.title || space.address}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                  {isStorage ? (
                                    <>
                                      <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                                        🏢 1+ ACRE REPO STOCKYARD
                                      </span>
                                      <span className="bg-slate-900/90 text-amber-300 font-black text-[9px] px-2 py-1 rounded-full uppercase tracking-wider shadow">
                                        📐 {space.landAcres || 1.0} ACRES
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="bg-emerald-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                                        VERIFIED OWNER SPOT
                                      </span>
                                      {space.hasEvCharger && (
                                        <span className="bg-blue-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                                          ⚡ EV CHARGING
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md text-emerald-400 font-black text-sm px-3 py-1 rounded-xl shadow">
                                  {isStorage ? (
                                    <>
                                      <span className="text-amber-400">₹{space.monthlyStorageRate || 2500}</span>
                                      <span className="text-[10px] text-slate-300 font-normal">/car/mo</span>
                                    </>
                                  ) : (
                                    <>
                                      ₹{space.pricePerHour || 50}<span className="text-[10px] text-slate-300 font-normal">/hr</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Title & Address */}
                              <div className="space-y-1">
                                <h4 className="font-black text-slate-900 text-lg leading-snug truncate">
                                  {space.title || space.address}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 truncate">
                                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                  {space.address || space.location}
                                </p>
                              </div>

                              {/* Security & Commercial Facilities */}
                              {isStorage ? (
                                <div className="space-y-2 pt-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] px-2.5 py-0.5 rounded-lg">
                                      📐 {space.landAcres || 1.0} Contiguous Acres
                                    </span>
                                    {space.securityFacilities?.hasCompoundWall && (
                                      <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-lg">
                                        🧱 Compound Wall
                                      </span>
                                    )}
                                    {space.securityFacilities?.has24x7Guards && (
                                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-lg">
                                        👮 24/7 Security
                                      </span>
                                    )}
                                    {space.securityFacilities?.hasCctv && (
                                      <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-lg">
                                        📹 CCTV
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-amber-800 font-semibold bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                                    🏦 Dedicated secured stockyard for bank repossession fleets &amp; asset storage.
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {/* Pills Row (Matching Mobile App 1:1) */}
                                  <div className="flex items-center gap-2 pt-3 flex-wrap">
                                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1">
                                      🎯 {space.calculatedDist} km away
                                    </span>
                                    <span className="bg-slate-100 text-slate-600 font-bold text-[11px] px-2.5 py-1 rounded-xl">
                                      🚗 4-wheeler
                                    </span>
                                    <span className={`font-bold text-[11px] px-2.5 py-1 rounded-xl ${
                                      !isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {!isFull ? '🟢 Easy Availability' : '🔴 Full'}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-slate-400 italic pt-2">
                                    Helps users decide before traveling.
                                  </p>
                                </>
                              )}
                            </div>

                            {/* Footer (Real-Time Capacity & Book Button) */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {isStorage ? 'Repossession Capacity' : 'Real-Time Capacity'}
                                </p>
                                <p className={`text-xs font-black mt-0.5 ${!isFull ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {!isFull ? `🟢 ${freeSlots} of ${space.totalSlots || 5} Bays Free` : '🚫 Full'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSpace(space);
                                  const now = new Date().toISOString().slice(0, 16);
                                  setForm(p => ({ ...p, seekerName: user?.name || '', seekerContact: user?.contact || '', startTime: now, bookingType: isStorage ? 'monthly' : 'hourly', hours: '1' }));
                                }}
                                disabled={isFull}
                                className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                  !isFull
                                    ? isStorage
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-amber-500/25'
                                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {!isFull ? (isStorage ? 'Reserve Yard Bay →' : 'Book Spot →') : 'Full'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: FIND PARKING ──────────────────────────────────────────── */}
        {currentView === 'find_parking' && (
          <div className="space-y-5">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Find Parking</h1>
              <p className="text-slate-500 text-sm mt-0.5">Search and book available parking spaces near you.</p>
            </div>

            {selectedSpace ? (
              /* ── EXACT SEEKER APP MATCHING SPOT DETAILS & RESERVATION VIEW ── */
              <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
                {/* Back button */}
                <button
                  onClick={() => setSelectedSpace(null)}
                  className="flex items-center gap-2 text-sm font-extrabold text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  ← Back to Parking Spots
                </button>

                {/* 1. SPOT BANNER CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="relative h-48 sm:h-56 w-full rounded-2xl overflow-hidden border border-slate-100">
                    <img
                      src={getImageUrl ? getImageUrl(selectedSpace.images?.[0] || selectedSpace.image) : (selectedSpace.images?.[0] || selectedSpace.image)}
                      alt={selectedSpace.address}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`${selectedSpace.spaceCategory === 'commercial_vehicle_storage' || user?.accountCategory === 'bank_finance_seeker' ? 'bg-amber-500/90' : 'bg-emerald-500/90'} backdrop-blur text-white text-[11px] font-black px-3 py-1 rounded-full tracking-wider uppercase shadow-md`}>
                        {selectedSpace.spaceCategory === 'commercial_vehicle_storage' || user?.accountCategory === 'bank_finance_seeker' ? '🏢 1+ ACRE REPO STOCKYARD' : 'VERIFIED PARKING'}
                      </span>
                      {selectedSpace.hasEvCharger && selectedSpace.spaceCategory !== 'commercial_vehicle_storage' && user?.accountCategory !== 'bank_finance_seeker' && (
                        <span className="bg-amber-500/90 backdrop-blur text-white text-[11px] font-black px-3 py-1 rounded-full tracking-wider uppercase shadow-md">
                          ⚡ EV CHARGING
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {selectedSpace.title || selectedSpace.address}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5 mt-1.5">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      {selectedSpace.address}, {selectedSpace.location || selectedSpace.city || 'Hyderabad'}
                    </p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      Rate: <span className={`${selectedSpace.spaceCategory === 'commercial_vehicle_storage' ? 'text-amber-600' : 'text-emerald-600'} font-black text-base`}>
                        {selectedSpace.spaceCategory === 'commercial_vehicle_storage'
                          ? `₹${selectedSpace.monthlyStorageRate || 2500}/car/month`
                          : `₹${selectedSpace.pricePerHour || 40}/hour`}
                      </span>
                    </p>
                  </div>

                  {/* Real-Time Slot Capacity Box */}
                  {(() => {
                    const freeCount = bookingAvailableSlots.filter(s => s.isAvailable).length;
                    const totalCount = bookingAvailableSlots.length || selectedSpace.totalSlots || 5;
                    return (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">🅿️ Real-Time Capacity:</span>
                        <span className={`text-xs font-extrabold ${freeCount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {freeCount > 0 ? `🟢 ${freeCount} of ${totalCount} Slots Free` : '🔴 All Slots Currently Booked'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Live Turn-by-Turn GPS Navigation Button */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedSpace.coordinates?.lat || 17.3850},${selectedSpace.coordinates?.lng || 78.4867}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl flex items-center gap-4 transition-all shadow-md group"
                  >
                    <span className="text-2xl">🧭</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition-colors">
                        Open Live Turn-by-Turn GPS Navigation
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Get instant driving directions on Google Maps</p>
                    </div>
                    <span className="text-lg text-slate-400 group-hover:text-white transition-colors">→</span>
                  </a>

                  {/* Amenities & Features */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Amenities &amp; Features</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl text-center">
                        🛡️ 24/7 CCTV
                      </div>
                      <div className="bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl text-center">
                        🔒 Gated Guarded
                      </div>
                      {selectedSpace.spaceCategory === 'commercial_vehicle_storage' || user?.accountCategory === 'bank_finance_seeker' ? (
                        <>
                          <div className="bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl text-center">
                            🧱 Compound Wall
                          </div>
                          <div className="bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl text-center">
                            💡 Floodlights
                          </div>
                        </>
                      ) : (
                        <>
                          {selectedSpace.hasEvCharger ? (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-2 rounded-xl text-center">
                              ⚡ Fast Charger
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl text-center">
                              ⚡ Fast Charger
                            </div>
                          )}
                          <div className="bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl text-center">
                            ☂️ Covered Parking
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. RESERVATION DETAILS CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <h3 className="text-lg font-black text-slate-900">Reservation Details</h3>

                  <form onSubmit={handleBookSubmit} className="space-y-6">
                    {/* Vehicle Plate Number */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                        Vehicle Plate Number
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={form.vehicleNumber}
                          onChange={e => {
                            const chosenPlate = e.target.value;
                            const matchedV = user?.vehicles?.find(v => v.plateNumber === chosenPlate);
                            let matchedType = form.vehicleType;
                            if (matchedV) {
                              const vt = (matchedV.vehicleType || matchedV.type || '').toLowerCase();
                              if (vt.includes('2') || vt.includes('bike') || vt.includes('scooter')) matchedType = '2-wheeler';
                              else if (vt.includes('sedan')) matchedType = 'sedan';
                              else if (vt.includes('suv')) matchedType = 'suv';
                              else if (vt.includes('hatchback')) matchedType = 'hatchback';
                            }
                            setForm(p => ({ ...p, vehicleNumber: chosenPlate, vehicleType: matchedType }));
                          }}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="" disabled>Select from Saved Vehicles</option>
                          {user?.vehicles?.map(v => (
                            <option key={v._id} value={v.plateNumber}>{v.plateNumber} ({v.model || v.vehicleType})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="e.g. TS 08 EA 5678"
                          value={form.vehicleNumber}
                          onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 uppercase focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Your Vehicle Type / Size (Matches Seeker App 1:1) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                          Your Vehicle Type / Size
                        </label>
                        <span className="text-[11px] font-bold text-slate-400">
                          Select size to verify fit
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'hatchback', label: 'Hatchback', icon: '🚗', desc: 'Swift, i20, Baleno' },
                          { id: 'sedan', label: 'Sedan', icon: '🚘', desc: 'Dzire, City, Verna' },
                          { id: 'suv', label: 'SUV', icon: '🚙', desc: 'Creta, Seltos, XUV' },
                          { id: '2-wheeler', label: '2-Wheeler', icon: '🏍️', desc: 'Bikes & Scooters' },
                        ].map((vt) => {
                          const isSelected = (form.vehicleType || 'hatchback') === vt.id;
                          const fits = vt.id === '2-wheeler'
                            ? (!selectedSpace.suitableVehicles || selectedSpace.suitableVehicles.length === 0 || selectedSpace.suitableVehicles.includes('2-wheeler'))
                            : (!selectedSpace.suitableVehicles || selectedSpace.suitableVehicles.length === 0 || selectedSpace.suitableVehicles.includes('4-wheeler') || selectedSpace.suitableVehicles.includes(vt.id));
                          
                          return (
                            <button
                              key={vt.id}
                              type="button"
                              onClick={() => setForm(p => ({ ...p, vehicleType: vt.id }))}
                              className={`p-3 rounded-2xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              } ${!fits ? 'opacity-70 border-rose-200' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xl">{vt.icon}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  fits ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {fits ? '✓ Fits' : '⚠️ Tight'}
                                </span>
                              </div>
                              <p className={`text-xs font-black mt-2 ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                {vt.label}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {vt.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Multi-Tier Duration & Pricing (Matches Seeker App 1:1) */}
                    {(() => {
                      const hourlyRate = selectedSpace.pricePerHour !== undefined ? selectedSpace.pricePerHour : (selectedSpace.hourlyRate || 40);
                      const dailyRate = selectedSpace.pricePerDay || (hourlyRate * 8);
                      const monthlyRate = selectedSpace.pricePerMonth || (hourlyRate * 8 * 25);

                      let rawTotalPrice = hourlyRate;
                      let baseRateCalculationText = '';

                      if (form.bookingType === 'hourly') {
                        const hrs = Math.max(1, Number(form.hours || 2));
                        rawTotalPrice = hrs * hourlyRate;
                        baseRateCalculationText = `₹${hourlyRate} × ${hrs} hr${hrs > 1 ? 's' : ''} = ₹${rawTotalPrice}`;
                      } else if (form.bookingType === 'daily') {
                        const days = Math.max(1, Number(form.days || 1));
                        rawTotalPrice = days * dailyRate;
                        baseRateCalculationText = `₹${dailyRate} × ${days} day${days > 1 ? 's' : ''} = ₹${rawTotalPrice}`;
                      } else if (form.bookingType === 'monthly') {
                        const months = Math.max(1, Number(form.months || 1));
                        rawTotalPrice = months * monthlyRate;
                        baseRateCalculationText = `₹${monthlyRate} × ${months} mo${months > 1 ? 's' : ''} = ₹${rawTotalPrice}`;
                      }

                      const maxDiscount = Number(selectedSpace.maxWalletDiscount ?? 10);
                      const discount = (useWallet && maxDiscount > 0) ? Math.min(walletBalance, maxDiscount, rawTotalPrice) : 0;
                      const finalTotal = Math.max(0, rawTotalPrice - discount);

                      return (
                        <>
                          {/* Duration Mode Switcher */}
                          <div className="space-y-2">
                            <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                              Select Booking Duration Mode
                            </label>
                            <div className="grid grid-cols-3 gap-2.5">
                              {[
                                { id: 'hourly', label: '⏱️ Hourly', rateText: `₹${hourlyRate}/hr` },
                                { id: 'daily', label: '📅 1 Day Flat', rateText: `₹${dailyRate}` },
                                { id: 'monthly', label: '🗓️ 1 Month', rateText: `₹${monthlyRate}` },
                              ].map((plan) => {
                                const isSelected = (form.bookingType || 'hourly') === plan.id;
                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, bookingType: plan.id }))}
                                    className={`p-3 rounded-2xl border text-center transition-all ${
                                      isSelected
                                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <p className={`text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                      {plan.label}
                                    </p>
                                    <p className={`text-[11px] font-bold mt-0.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                                      {plan.rateText}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Interactive +/- Stepper Duration Control */}
                          {form.bookingType === 'hourly' && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700">⏱️ Parking Duration (Hours)</span>
                                <span className="text-xs font-black text-emerald-600">₹{hourlyRate}/hr</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, hours: String(Math.max(1, Number(p.hours || 1) - 1)) }))}
                                  disabled={Number(form.hours || 1) <= 1}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  −
                                </button>
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-2.5 text-center">
                                  <p className="text-base font-black text-slate-900 leading-tight">
                                    {form.hours || 1} {Number(form.hours || 1) === 1 ? 'Hour' : 'Hours'}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    ₹{Number(form.hours || 1) * hourlyRate} Total Base
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, hours: String(Math.min(24, Number(p.hours || 1) + 1)) }))}
                                  disabled={Number(form.hours || 1) >= 24}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  +
                                </button>
                              </div>
                              {/* Quick Hours Presets */}
                              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                {[1, 2, 4, 8, 12, 24].map((hr) => (
                                  <button
                                    key={hr}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, hours: String(hr) }))}
                                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black border transition-all ${
                                      Number(form.hours || 1) === hr
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {hr}h
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {form.bookingType === 'daily' && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700">📅 Parking Duration (Days)</span>
                                <span className="text-xs font-black text-emerald-600">₹{dailyRate}/day</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, days: String(Math.max(1, Number(p.days || 1) - 1)) }))}
                                  disabled={Number(form.days || 1) <= 1}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  −
                                </button>
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-2.5 text-center">
                                  <p className="text-base font-black text-slate-900 leading-tight">
                                    {form.days || 1} {Number(form.days || 1) === 1 ? 'Day' : 'Days'}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    ₹{Number(form.days || 1) * dailyRate} Total Base
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, days: String(Math.min(30, Number(p.days || 1) + 1)) }))}
                                  disabled={Number(form.days || 1) >= 30}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  +
                                </button>
                              </div>
                              {/* Quick Days Presets */}
                              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                {[1, 2, 3, 5, 7, 15].map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, days: String(d) }))}
                                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black border transition-all ${
                                      Number(form.days || 1) === d
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {d}d
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {form.bookingType === 'monthly' && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-slate-700">🗓️ Parking Duration (Months)</span>
                                <span className="text-xs font-black text-emerald-600">₹{monthlyRate}/mo</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, months: String(Math.max(1, Number(p.months || 1) - 1)) }))}
                                  disabled={Number(form.months || 1) <= 1}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  −
                                </button>
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-2.5 text-center">
                                  <p className="text-base font-black text-slate-900 leading-tight">
                                    {form.months || 1} {Number(form.months || 1) === 1 ? 'Month' : 'Months'}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-400">
                                    ₹{Number(form.months || 1) * monthlyRate} Total Base
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setForm(p => ({ ...p, months: String(Math.min(12, Number(p.months || 1) + 1)) }))}
                                  disabled={Number(form.months || 1) >= 12}
                                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-xl hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                                >
                                  +
                                </button>
                              </div>
                              {/* Quick Months Presets */}
                              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                {[1, 2, 3, 6, 12].map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, months: String(m) }))}
                                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black border transition-all ${
                                      Number(form.months || 1) === m
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {m}m
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PlanToPark Wallet Money Deduction Card */}
                          {walletBalance > 0 && maxDiscount > 0 && (
                            <div
                              onClick={() => setUseWallet(p => !p)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                useWallet
                                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${
                                  useWallet ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  ⚡
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900">
                                    Use PlanToPark Wallet (-₹{discount})
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    Available Balance: ₹{Number(walletBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} • Max ₹{maxDiscount} usable
                                  </p>
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-black ${
                                useWallet ? 'bg-emerald-500 text-white' : 'border border-slate-300 bg-white'
                              }`}>
                                {useWallet && '✓'}
                              </div>
                            </div>
                          )}

                          {/* Live Price Breakdown Box */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2.5 text-xs">
                            <div className="flex justify-between text-slate-600 font-medium">
                              <span>Base Rate</span>
                              <span className="font-bold text-slate-800">{baseRateCalculationText}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-emerald-600 font-bold">
                                <span>⚡ Wallet Money Applied</span>
                                <span>- ₹{Number(discount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-600 font-medium">
                              <span>Platform Convenience Fee</span>
                              <span className="font-bold text-slate-800">₹0 (Free)</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-black text-slate-900">
                              <span>Total Payable</span>
                              <span className="text-2xl font-black text-emerald-600">₹{finalTotal}</span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            type="submit"
                            disabled={loading || payLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-emerald-500/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {loading || payLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                            ) : (
                              finalTotal === 0 ? 'Confirm with Wallet • Free' : `Confirm & Pay • ₹${finalTotal}`
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </form>
                </div>
              </div>
            ) : (
              /* ── SPLIT PANEL: LIST + MAP ──────────────────────────────── */
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search by city, area, landmark, or spot name…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-grow bg-transparent text-sm focus:outline-none text-slate-800 font-semibold"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* EV Filter Toggle */}
                  <button
                    type="button"
                    onClick={() => setFilterEv(p => !p)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 shadow-sm ${
                      filterEv
                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⚡ EV Only
                  </button>

                  {/* Near Me GPS button */}
                  <button
                    type="button"
                    onClick={handleUseGps}
                    disabled={locatingGps}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors shadow-sm whitespace-nowrap cursor-pointer"
                  >
                    {locatingGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    {locatingGps ? 'Locating...' : 'Near Me'}
                  </button>
                </div>

                {/* Category Switcher Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Category:</span>
                  {[
                    { id: 'all', label: '🌐 All Spaces' },
                    { id: 'standard', label: '🅿️ Standard Parking' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSpaceCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer ${
                        spaceCategoryFilter === cat.id
                          ? cat.id === 'commercial_vehicle_storage'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                            : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Bank Banner */}
                {user?.accountCategory === 'bank_finance_seeker' && (
                  <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white p-3.5 rounded-2xl border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🏦</span>
                      <div>
                        <p className="font-black text-cyan-200">
                          Bank &amp; Auto Finance Repossession Fleet Access
                        </p>
                        <p className="text-[11px] text-slate-300">
                          Showing certified 1+ Acre commercial stockyards with security guards, high perimeter compound walls &amp; 24/7 CCTV surveillance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radius Distance Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Radius:</span>
                  {[
                    { label: '🌐 All', value: null },
                    { label: '🎯 1 km', value: 1 },
                    { label: '🎯 2 km', value: 2 },
                    { label: '🎯 5 km', value: 5 },
                    { label: '🎯 10 km', value: 10 },
                    { label: '🎯 15 km', value: 15 },
                    { label: '🎯 20 km', value: 20 },
                    { label: '🎯 25 km', value: 25 },
                  ].map(r => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => setSelectedRadius(r.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border shrink-0 cursor-pointer ${
                        selectedRadius === r.value
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                  <span className="text-xs text-emerald-600 font-extrabold ml-auto shrink-0">
                    {displaySpaces.length} spots matched
                  </span>
                </div>

                {/* ── SPLIT PANEL ─────────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: '580px' }}>

                  {/* LEFT — scrollable card list */}
                  <div className="lg:w-[420px] xl:w-[460px] shrink-0 space-y-3 lg:overflow-y-auto lg:max-h-[600px] lg:pr-1">
                    {displaySpaces.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-3 bg-white rounded-2xl border border-slate-200 p-8">
                        <MapPin className="h-10 w-10 text-slate-300" />
                        <p className="font-extrabold text-slate-700">No parking spaces matched your filters.</p>
                        <p className="text-xs text-slate-400">Try selecting "🌐 All" radius or clearing your search.</p>
                        <button
                          onClick={() => { setSelectedRadius(null); setSearchQuery(''); setFilterEv(false); }}
                          className="mt-2 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl"
                        >
                          Reset All Filters
                        </button>
                      </div>
                    ) : displaySpaces.map(space => {
                      const freeSlots = space.slots?.filter(s => s.isAvailable).length ?? space.totalSlots ?? 5;
                      const isFav     = favorites.includes(space._id);
                      const isActive  = activeSpaceId === space._id;
                      const spotImg   = getImageUrl ? getImageUrl(space.images?.[0] || space.image || space.photoUrl) : (space.image || space.photoUrl);
                      const sLat      = space.coordinates?.lat || space.lat;
                      const sLng      = space.coordinates?.lng || space.lng;
                      const isStorage = space.spaceCategory === 'commercial_vehicle_storage';
                      return (
                        <div
                          key={space._id}
                          onMouseEnter={() => setActiveSpaceId(space._id)}
                          onMouseLeave={() => setActiveSpaceId(null)}
                          onClick={() => sLat && setActiveSpaceId(space._id)}
                          className={`rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-all duration-200 ${
                            isActive
                              ? isStorage
                                ? 'border-amber-400 shadow-amber-100 shadow-md ring-2 ring-amber-300'
                                : 'border-emerald-400 shadow-emerald-100 shadow-md ring-2 ring-emerald-200'
                              : isStorage
                              ? 'border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/40 via-white to-white hover:border-amber-400 hover:shadow-md'
                              : 'bg-white border border-slate-200 hover:shadow-md hover:border-slate-300'
                          }`}
                        >
                          <div className="flex gap-0">
                            {/* Image */}
                            <div className="relative shrink-0 w-32 sm:w-36">
                              <img src={spotImg} alt={space.title || 'Parking Spot'} className="h-full w-full object-cover min-h-[110px]" />
                              {isStorage ? (
                                <span className="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow">
                                  🏢 1+ ACRE YARD
                                </span>
                              ) : freeSlots > 0 ? (
                                <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">
                                  AVAILABLE
                                </span>
                              ) : null}
                              <button
                                onClick={e => { e.stopPropagation(); handleToggleFavorite(space._id); }}
                                className="absolute top-2 right-2 h-7 w-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                              >
                                <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                              </button>
                            </div>

                            {/* Details */}
                            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                              <div className="space-y-1">
                                <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate">{space.title || space.address}</h4>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                  <span className="truncate">{space.address || space.location}</span>
                                </p>
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  {isStorage ? (
                                    <>
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                        📐 {space.landAcres || 1.0} Acres
                                      </span>
                                      <span className="text-[9px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                        {space.distBadge || 'Nearby'}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${freeSlots > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                        {freeSlots > 0 ? `${freeSlots} Free` : 'Full'}
                                      </span>
                                      <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                        {space.distBadge || 'Nearby'}
                                      </span>
                                    </>
                                  )}
                                  {sLat && (
                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${sLat},${sLng}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="text-[9px] font-black bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-pointer"
                                      title="Open GPS Navigation"
                                    >
                                      🧭 Directions
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-3">
                                <div>
                                  {isStorage ? (
                                    <>
                                      <span className="text-base font-black text-amber-600">₹{space.monthlyStorageRate || 2500}</span>
                                      <span className="text-xs text-slate-400 font-semibold">/car/mo</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-base font-black text-emerald-600">₹{space.pricePerHour || 50}</span>
                                      <span className="text-xs text-slate-400 font-semibold">/hr</span>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedSpace(space);
                                    const now = new Date().toISOString().slice(0,16);
                                    setForm(p => ({ ...p, seekerName: user?.name||'', seekerContact: user?.contact||'', startTime: now, bookingType: isStorage ? 'monthly' : 'hourly', hours: '1' }));
                                  }}
                                  disabled={freeSlots === 0}
                                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                                    freeSlots > 0
                                      ? isStorage
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-xs'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  {freeSlots > 0 ? (isStorage ? 'Reserve Bay →' : 'Book Now →') : 'Full'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* RIGHT — sticky map */}
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative" style={{ minHeight: '400px' }}>
                    <div className="sticky top-4 h-full" style={{ minHeight: '560px' }}>
                      <SpacesMap
                        spaces={displaySpaces}
                        userLat={userLat || 17.313}
                        userLng={userLng || 78.545}
                        activeSpaceId={activeSpaceId}
                        height="100%"
                        onBook={(space) => {
                          setSelectedSpace(space);
                          const now = new Date().toISOString().slice(0,16);
                          setForm(p => ({ ...p, seekerName: user?.name||'', seekerContact: user?.contact||'', startTime: now, bookingType: 'hourly', hours: '1' }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        {/* ── VIEW: BOOKINGS ───────────────────────────────────────────────── */}
        {currentView === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>🎟️</span> My Reservations
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">Active & past digital parking passes with live session controls.</p>
              </div>

              {/* Filter Tabs matching Seeker App */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setBookingFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    bookingFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({bookings.length})
                </button>
                <button
                  onClick={() => setBookingFilter('active')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    bookingFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active ({activeBookings.length})
                </button>
                <button
                  onClick={() => setBookingFilter('past')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    bookingFilter === 'past'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Past ({pastBookings.length})
                </button>
              </div>
            </div>

            {/* Passes Grid */}
            {(() => {
              const displayed = bookingFilter === 'active'
                ? activeBookings
                : bookingFilter === 'past'
                ? pastBookings
                : bookings;

              if (displayed.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl">
                      🅿️
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-lg">
                      {bookingFilter === 'active' ? 'No Active Reservations' : 'No Parking Passes Found'}
                    </h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
                      {bookingFilter === 'active'
                        ? 'You do not have any active or parked sessions right now. Book a spot to start parking.'
                        : 'You haven’t made any parking reservations yet. Find nearby spaces and reserve your spot.'}
                    </p>
                    <button
                      onClick={() => setCurrentView('find_parking')}
                      className="mt-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl text-xs shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                      Find a Spot Now →
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {displayed.map((b) => {
                    const isCancelled = b.status === 'cancelled';
                    const isCompleted = b.status === 'completed';
                    const isCheckedIn = !isCancelled && !isCompleted && (Boolean(b.isCheckedIn) || b.status === 'checked_in');
                    const isPaid = !isCancelled && (b.paymentStatus === 'paid' || b.status === 'paid' || isCheckedIn || isCompleted);
                    const slot = b.slotId || 'Slot-1';
                    const refundAmt = b.refundAmount || 0;
                    const space = b.spaceId;

                    return (
                      <div
                        key={b._id}
                        className={`bg-white rounded-3xl border shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden group ${
                          isCheckedIn
                            ? 'border-emerald-300 ring-2 ring-emerald-400/20'
                            : isPaid
                            ? 'border-sky-200'
                            : isCancelled
                            ? 'border-slate-200 bg-slate-50/50 opacity-90'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Header: Pass Tag & Status Badge */}
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <span>🎟️</span> DIGITAL PARKING PASS
                            </span>
                            <StatusBadge status={b.status} />
                          </div>

                          {/* Spot Title & Address */}
                          <div>
                            <h3
                              className="font-black text-slate-900 text-lg tracking-tight group-hover:text-emerald-600 transition-colors truncate"
                              title={space?.title || 'Parking Space'}
                            >
                              {space?.title || space?.address || 'Parking Property'}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1 truncate">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {space?.address || 'Location Address'}, {space?.city || 'Hyderabad'}
                            </p>
                          </div>

                          {/* Big Slot Highlight / Refund Box matching Seeker App */}
                          <div
                            className={`rounded-2xl p-3.5 border flex items-center justify-between ${
                              isCancelled
                                ? 'bg-slate-50 border-slate-200'
                                : isCheckedIn
                                ? 'bg-emerald-50/80 border-emerald-200'
                                : isPaid
                                ? 'bg-sky-50/80 border-sky-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div>
                              <p
                                className={`text-[10px] font-black uppercase tracking-wider ${
                                  isCancelled
                                    ? refundAmt > 0
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                                    : isCheckedIn
                                    ? 'text-emerald-700'
                                    : 'text-sky-700'
                                }`}
                              >
                                {isPaid
                                  ? 'ALLOTTED SLOT'
                                  : isCancelled
                                  ? refundAmt > 0
                                    ? 'REFUND CREDITED TO WALLET'
                                    : 'RESERVATION CANCELLED'
                                  : 'RESERVATION STATUS'}
                              </p>
                              <p
                                className={`text-xl font-black font-mono mt-0.5 ${
                                  isCancelled
                                    ? refundAmt > 0
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                                    : isCheckedIn
                                    ? 'text-emerald-800'
                                    : 'text-sky-800'
                                }`}
                              >
                                {isPaid
                                  ? `🅿️ ${slot}`
                                  : isCancelled
                                  ? refundAmt > 0
                                    ? `💸 ₹${refundAmt} Refunded`
                                    : 'Cancelled'
                                  : 'Payment Incomplete'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Duration</span>
                              <span className="text-sm font-extrabold text-slate-800">
                                {b.bookingType === 'daily'
                                  ? '1 Day Flat'
                                  : b.bookingType === 'monthly'
                                  ? '1 Month Pass'
                                  : `${b.hours || 1} hr(s)`}
                              </span>
                            </div>
                          </div>

                          {/* Pre-Check-in Arrival Notice Card with Check-In CTA */}
                          {isPaid && !isCheckedIn && !isCompleted && !isCancelled && (
                            <div className="bg-sky-50/90 border-2 border-sky-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
                              <div className="min-w-0">
                                <p className="font-black text-sky-900 text-xs flex items-center gap-1.5">
                                  <span>📍</span> Slot Reserved - No Timer Decay!
                                </p>
                                <p className="text-[11px] text-sky-700 mt-0.5 leading-snug">
                                  Travel without timer running. Click Check-In when you arrive at the spot.
                                </p>
                              </div>
                              <button
                                onClick={() => handleCheckIn(b)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                              >
                                🅿️ Check-In
                              </button>
                            </div>
                          )}

                          {/* Post-Check-in Active Parking Timer Banner matching Seeker App */}
                          {isCheckedIn && !isCompleted && !isCancelled && (
                            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-3.5 shadow-sm space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  🟢 Vehicle Parked • Dynamic Timer Running
                                </p>
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md">
                                  Slot: {slot}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium border-t border-emerald-200/80 pt-2">
                                <span>
                                  Checked In: <strong className="font-bold">{new Date(b.checkInTime || b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                </span>
                                {b.endTime && (
                                  <span>
                                    Valid Until: <strong className="font-bold">{new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Cancelled Notice Card */}
                          {isCancelled && (
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs flex items-center justify-between">
                              <div>
                                <p className="font-black text-rose-900 flex items-center gap-1.5">
                                  <span>🚫</span> Reservation Cancelled
                                </p>
                                <p className="text-[11px] text-rose-700 mt-0.5">
                                  {refundAmt > 0
                                    ? `₹${refundAmt} refunded to your PlanToPark wallet. Slot released.`
                                    : 'This slot reservation was cancelled and released.'}
                                </p>
                              </div>
                              {refundAmt > 0 && (
                                <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                                  +₹{refundAmt}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Meta Info 2x2 Grid */}
                          <div className="grid grid-cols-2 gap-3 bg-slate-50/80 rounded-2xl p-3 border border-slate-100 text-xs">
                            <div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">🚗 VEHICLE</p>
                              <p className="mt-1 font-mono font-black text-slate-800 text-sm uppercase">
                                {b.vehicleNumber || 'TS07WJ2099'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">⏱️ PLAN / DURATION</p>
                              <p className="mt-1 font-black text-slate-800 text-xs">
                                {b.bookingType === 'daily'
                                  ? '1 Day Flat'
                                  : b.bookingType === 'monthly'
                                  ? '1 Month Pass'
                                  : `${b.hours || 1} hr(s)`}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">💰 TOTAL FEE</p>
                              <p className="mt-1 font-black text-emerald-600 text-sm">
                                ₹{(b.totalAmount || 0) + (b.walletAmountUsed || 0)}
                                {b.walletAmountUsed > 0 && (
                                  <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">WALLET</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">🕒 SESSION START</p>
                              <p className="mt-1 font-black text-slate-700 text-xs">
                                {new Date(b.checkInTime || b.startTime || b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Row matching Seeker App */}
                        <div className="border-t border-slate-100 mt-5 pt-4 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Check In Button (if paid and not checked in) */}
                            {isPaid && !isCheckedIn && !isCompleted && !isCancelled && (
                              <button
                                onClick={() => handleCheckIn(b)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                              >
                                🅿️ Check In
                              </button>
                            )}

                            {/* Check Out Button (if checked in) */}
                            {isCheckedIn && !isCompleted && !isCancelled && (
                              <button
                                onClick={() => handleComplete(b)}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                              >
                                🚪 Check Out
                              </button>
                            )}

                            {/* Extend Button */}
                            {isPaid && !isCompleted && !isCancelled && (
                              <button
                                onClick={() => { setExtendingBooking(b); setExtendError(''); setExtendHours(1); }}
                                className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-black px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                              >
                                ⏳ Extend
                              </button>
                            )}

                            {/* Invoice Button */}
                            {isPaid && (
                              <button
                                onClick={() => navigate(`/invoice/${b._id}`)}
                                className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 font-black px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                              >
                                🧾 Invoice
                              </button>
                            )}

                            {/* Cancel Button */}
                            {isPaid && !isCancelled && !isCompleted && (() => {
                              const isCheckedIn = Boolean(b.isCheckedIn) || b.status === 'checked_in';
                              if (isCheckedIn) {
                                const checkInDate = b.checkInTime || b.startTime;
                                const elapsed = checkInDate ? (Date.now() - new Date(checkInDate).getTime()) / (1000 * 60) : 0;
                                if (elapsed > cancellationGraceMinutes) {
                                  return null;
                                }
                                const minsLeft = Math.max(1, Math.ceil(cancellationGraceMinutes - elapsed));
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleCancel(b)}
                                    className="bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-black px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                                    title={`Cancel within ${minsLeft} minutes for 20% partial refund`}
                                  >
                                    Cancel ({minsLeft}m left)
                                  </button>
                                );
                              }
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(b)}
                                  className="bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-black px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              );
                            })()}
                          </div>

                          {/* Navigation Buttons */}
                          {space && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                onClick={() => handleNavigate(space)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                              >
                                <Navigation className="h-3.5 w-3.5" /> In-App Nav
                              </button>
                              <button
                                onClick={() => {
                                  const c = space.coordinates;
                                  const dest = (c && c.lat && c.lng) ? `${c.lat},${c.lng}` : encodeURIComponent(space.address || 'Hyderabad');
                                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                              >
                                <Map className="h-3.5 w-3.5" /> Maps
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Past & Completed Bookings History Log */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Completed & Past Bookings</h3>
                  <p className="text-xs text-slate-400">Past completed and cancelled parking sessions with invoices.</p>
                </div>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).length} history
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
                    <tr>
                      <th className="px-6 py-3">Property</th>
                      <th className="px-6 py-3">Vehicle</th>
                      <th className="px-6 py-3">Slot</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Fee Paid</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Invoice & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).length === 0 ? (
                      <tr><td colSpan="8" className="text-center py-12 text-slate-400 font-medium">No past parking history yet.</td></tr>
                    ) : bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).map(b => (
                      <tr key={b._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-800 truncate max-w-[200px]">{b.spaceId?.title || b.spaceId?.address || 'Parking Property'}</td>
                        <td className="px-6 py-4 font-mono text-xs uppercase font-bold">{b.vehicleNumber}</td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">{b.slotId || '—'}</span>
                        </td>
                        <td className="px-6 py-4">{b.hours} hrs</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          ₹{(b.totalAmount || 0) + (b.walletAmountUsed || 0)}
                          {b.walletAmountUsed > 0 && <span className="ml-1 text-[10px] text-emerald-600 font-extrabold">💳</span>}
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(b.createdAt || b.startTime).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => navigate(`/invoice/${b._id}`)} 
                            className="text-blue-600 hover:text-blue-700 font-extrabold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
                          >
                            🧾 Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: HISTORY ────────────────────────────────────────────────── */}
        {currentView === 'history' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">History</h1>
              <p className="text-slate-500 text-sm mt-0.5">Past completed and cancelled parking sessions.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Parking History Log</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
                    <tr>
                      <th className="px-6 py-3">Property</th>
                      <th className="px-6 py-3">Vehicle</th>
                      <th className="px-6 py-3">Slot</th>
                      <th className="px-6 py-3">Hours</th>
                      <th className="px-6 py-3">Fee Paid</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-12 text-slate-400">No parking history yet.</td></tr>
                    ) : bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).map(b => (
                      <tr key={b._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-800 truncate max-w-[160px]">{b.spaceId?.address || 'Property Deleted'}</td>
                        <td className="px-6 py-4 font-mono text-xs uppercase font-bold">{b.vehicleNumber}</td>
                        <td className="px-6 py-4 font-mono text-xs">{b.slotId || '—'}</td>
                        <td className="px-6 py-4">{b.hours} hrs</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          ₹{(b.totalAmount || 0) + (b.walletAmountUsed || 0)}
                          {b.walletAmountUsed > 0 && <span className="ml-1 text-[10px] text-emerald-600 font-extrabold">💳</span>}
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          {(b.paymentStatus === 'paid' || b.invoiceId) && (
                            <button onClick={() => navigate(`/invoice/${b._id}`)} className="text-blue-600 hover:underline font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
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
          </div>
        )}

        {/* ── VIEW: FAVOURITES ─────────────────────────────────────────────── */}
        {currentView === 'favourites' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Favourites</h1>
              <p className="text-slate-500 text-sm mt-0.5">Your starred parking spaces for quick booking.</p>
            </div>
            {spaces.filter(s => favorites.includes(s._id)).length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                <Heart className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold">No favourited spaces yet.</p>
                <button onClick={() => setCurrentView('find_parking')} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">
                  Browse parking spaces →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {spaces.filter(s => favorites.includes(s._id)).map(space => {
                  const freeSlots = space.slots?.filter(sl => sl.isAvailable).length || 0;
                  return (
                    <div key={space._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative">
                      <img
                        src={getImageUrl ? getImageUrl(space.images?.[0] || space.image) : (space.images?.[0] || space.image)}
                        alt={space.title || space.address || ''}
                        className="w-full h-36 object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button onClick={() => handleToggleFavorite(space._id)} className="absolute top-3 right-3 h-8 w-8 bg-white/90 rounded-full flex items-center justify-center text-rose-500 shadow border hover:scale-110 transition-transform">
                        <Heart className="h-4 w-4 fill-rose-500" />
                      </button>
                      <div className="p-4 space-y-3">
                        <div>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{space.location}</span>
                          <h4 className="font-bold text-slate-900 truncate mt-1">{space.address}</h4>
                          <p className="text-slate-400 text-xs mt-0.5">₹{space.pricePerHour}/hr · {freeSlots} slots free</p>
                        </div>
                        <button
                          onClick={() => { setSelectedSpace(space); setCurrentView('find_parking'); }}
                          disabled={freeSlots === 0}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${freeSlots > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                          {freeSlots > 0 ? 'Book Now' : 'Fully Booked'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: COMPLAINTS ─────────────────────────────────────────────── */}
        {currentView === 'complaints' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Support & Complaints</h1>
              <p className="text-slate-500 text-sm mt-0.5">Raise a support ticket and track your previous requests.</p>
            </div>
            {/* New ticket form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-1">Raise Support Ticket</h3>
              <p className="text-xs text-slate-400 mb-5">Issues with booking, checkout, or parking host? We're here to help.</p>
              <form onSubmit={handleComplaintSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Subject</label>
                  <input type="text" required value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="e.g. Host was unavailable at checkout"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                  <textarea required value={compDescription} onChange={e => setCompDescription(e.target.value)} placeholder="Describe your issue in detail..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 h-24 resize-none" />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm">
                  Submit Ticket
                </button>
              </form>
            </div>

            {/* Previous tickets */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Ticket History</h3>
              </div>
              <div className="p-6 space-y-4">
                {complaints.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-6">No tickets raised yet.</p>
                ) : complaints.map(c => (
                  <div key={c._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">{c.subject}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${c.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs bg-white p-2.5 rounded-lg border border-slate-100">{c.description}</p>
                    {c.reply && (
                      <div className="mt-2.5 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-xs">
                        <span className="font-bold text-emerald-700 uppercase text-[9px] block mb-0.5">Admin Response</span>
                        <p className="text-slate-700">"{c.reply}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: WALLET ─────────────────────────────────────────────────── */}
        {currentView === 'wallet' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">PlanToPark Wallet</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage your digital balance, auto-discounts, and instant checkout credits.</p>
            </div>

            {/* Wallet Balance Hero Card */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-200 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    ⚡ Instant Booking Credits
                  </span>
                  <div className="h-10 w-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl">
                    💳
                  </div>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Available Refund &amp; Wallet Balance</p>
                  <h2 className="text-4xl sm:text-5xl font-black mt-1">₹{Number(walletBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h2>
                  <p className="text-xs text-emerald-200 mt-2 font-medium">
                    ✓ Auto-credited upon reservation cancellation &amp; usable for future parking bookings.
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Key Perks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg mb-3">
                  ⚡
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Instant 1-Click Pay</h4>
                <p className="text-xs text-slate-400 mt-1">Pay using your refund credits directly without payment gateway redirection.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg mb-3">
                  🛡️
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Auto Discount</h4>
                <p className="text-xs text-slate-400 mt-1">Automatically applies your refund credits toward any parking reservation.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg mb-3">
                  🔄
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Direct Cancellation Refunds</h4>
                <p className="text-xs text-slate-400 mt-1">Immediate credit restoration back to your balance when you cancel a booking.</p>
              </div>
            </div>

            {/* Wallet Activity History */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Wallet Ledger &amp; Cancellation Refunds</h3>
                  <p className="text-xs text-slate-400">Complete record of deductions and cancellation credits.</p>
                </div>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                  {walletTransactions.length} Records
                </span>
              </div>
              <div className="p-6 space-y-3">
                {walletTransactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-3xl mb-2">💳</p>
                    <p className="text-sm font-bold text-slate-700">No Wallet Transactions Yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      When you cancel a reservation, your refunded amount will automatically be credited here to use for future bookings.
                    </p>
                  </div>
                ) : (
                  walletTransactions.map((tx, idx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <div key={tx._id || idx} className="flex items-start gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/70 transition-colors">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          isCredit ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {isCredit ? '+' : '−'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900 leading-snug">{tx.description || (isCredit ? 'Cancellation Refund Credit' : 'Parking Wallet Deduction')}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {tx.date ? new Date(tx.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent transaction'}
                          </p>
                        </div>
                        <span className={`font-mono font-black text-sm shrink-0 ${
                          isCredit ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {isCredit ? `+₹${Number(tx.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `−₹${Number(tx.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: PROFILE (MATCHING SEEKER MOBILE APP 1:1) ─────────────── */}
        {currentView === 'profile' && (
          <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn pb-16">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Profile</h1>
              <p className="text-slate-500 text-sm mt-0.5">Account Settings &amp; Vehicle Info</p>
            </div>

            {/* 1. Main Profile Hero Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center space-y-4">
              {/* Avatar with Camera Badge */}
              <div className="relative group cursor-pointer" onClick={() => setShowEditProfileModal(true)}>
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-4xl font-black border-4 border-emerald-400 overflow-hidden shadow-xl shadow-emerald-600/25">
                  {user?.profileImage && user.profileImage.length > 5 && !profileImgError ? (
                    <img
                      src={user.profileImage.startsWith('data:') ? user.profileImage : (getImageUrl ? getImageUrl(user.profileImage) : user.profileImage)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => setProfileImgError(true)}
                    />
                  ) : (
                    <span>{(user?.name || 'A').trim().charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 h-9 w-9 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md text-sm transition-transform group-hover:scale-110">
                  📷
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 capitalize tracking-tight">
                  {user?.name || 'Parking Seeker'}
                </h2>
                <p className="text-slate-400 text-sm font-medium mt-0.5">{user?.email || 'seeker@example.com'}</p>
                <p className="text-slate-600 text-xs font-bold mt-1">📞 {user?.contact || user?.phone || '9989551305'}</p>
              </div>

              {/* Role Tag */}
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-black text-[11px] px-4 py-1.5 rounded-full border border-emerald-200 tracking-wider uppercase">
                PARKING SEEKER
              </div>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                ✏️ Edit Profile Details
              </button>
            </div>

            {/* 2. Saved Vehicle Details Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">Saved Vehicle Details</h3>
                <button
                  type="button"
                  onClick={() => setShowAddVehicleForm(p => !p)}
                  className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200"
                >
                  {showAddVehicleForm ? 'Cancel' : '+ Add Vehicle'}
                </button>
              </div>

              {/* Primary Vehicle Item */}
              {user?.vehicles && user.vehicles.length > 0 ? (
                <div className="space-y-3">
                  {user.vehicles.map((v, idx) => (
                    <div
                      key={v._id || idx}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        idx === 0 ? 'bg-slate-50 border-emerald-200' : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-xs">
                          {v.vehicleType === '2-wheeler' ? '🏍️' : '🚗'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm uppercase tracking-wider">{v.plateNumber}</span>
                            {idx === 0 && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {v.model || 'Standard'} • {getVehicleTypeLabel(v.vehicleType)} • Active Parking License
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(v._id)}
                        className="text-xs font-extrabold text-rose-500 hover:text-rose-700 px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border bg-slate-50 border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl">
                      🚗
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm uppercase">TS 07 AB 1234</span>
                        <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                          PRIMARY
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">Car • Active Parking License</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expandable Add Vehicle Form */}
              {showAddVehicleForm && (
                <form onSubmit={handleAddVehicle} className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3 mt-4">
                  <h4 className="text-xs font-black text-emerald-900 uppercase">Register New Vehicle</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="License Plate (e.g. TS 08 EA 5678)"
                      value={newPlate}
                      onChange={e => setNewPlate(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 uppercase focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Model (e.g. Hyundai i20)"
                      value={newModel}
                      onChange={e => setNewModel(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="4-wheeler">4-Wheelers / Standard Cars (Sedan/Hatchback)</option>
                    <option value="2-wheeler">2-Wheelers (Bike / Scooter)</option>
                    <option value="large-car">Large Cars (SUV / MUV)</option>
                    <option value="heavy-vehicle">Heavy Vehicles (Truck / Van)</option>
                  </select>
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-colors"
                  >
                    Save Vehicle
                  </button>
                </form>
              )}
            </div>

            {/* 3. Account Overview Stats Grid */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900">Account Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                  <p className="text-sm font-black text-emerald-600">Active</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Status</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                  <p className="text-sm font-black text-blue-600">Verified</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Account</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                  <p className="text-sm font-black text-emerald-600">₹{Number(walletBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Wallet</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                  <p className="text-sm font-black text-slate-900">{bookings.length}</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">Bookings</p>
                </div>
              </div>
            </div>

            {/* 4. Support & Legal */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-3">
              <h3 className="text-base font-black text-slate-900">Support &amp; Legal</h3>
              <button
                type="button"
                onClick={() => setShowSeekerSupportModal(true)}
                className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>
                  {user?.accountCategory === 'bank_finance_seeker'
                    ? '🏦 24/7 Bank & Fleet Support Desk'
                    : '📞 24/7 Customer Support Desk'}
                </span>
                <span className="text-blue-600 font-bold">Contact →</span>
              </button>
              <Link
                to="/terms"
                className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between transition-colors block"
              >
                <span>
                  {user?.accountCategory === 'bank_finance_seeker'
                    ? '🏦 Terms & Conditions for Bank & Auto Finance'
                    : '🚗 Terms & Conditions for Parking Seeker'}
                </span>
                <span className="text-emerald-600 font-extrabold">30 Clauses →</span>
              </Link>
            </div>

            {/* 5. Sign Out Button */}
            <button
              type="button"
              onClick={logout}
              className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-black py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* ── SEEKER SUPPORT DESK MODAL ── */}
        {showSeekerSupportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowSeekerSupportModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>

              <div className="mb-4">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                  OFFICIAL HELPDESK
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  ✉️ Customer Support Desk
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official PlanToPark Support • Email assistance for bookings, slots, and inquiries.
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <a
                  href={`mailto:${supportContacts.supportEmail || 'plantopark@gmail.com'}?subject=Customer%20Support%20Request`}
                  className="flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl text-indigo-950 font-bold text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✉️</span>
                    <div>
                      <div className="text-[10px] text-indigo-600 uppercase font-extrabold">Official Support Email</div>
                      <div className="text-sm font-black">
                        {supportContacts.supportEmail || 'plantopark@gmail.com'}
                      </div>
                    </div>
                  </div>
                  <span className="text-indigo-600 font-black">Email →</span>
                </a>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-700 font-medium border border-slate-200/80 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">⏱️ Expected Response Time</div>
                <div>{supportContacts.supportResponseNote || 'Contact us through email. If you have any query, response will be received within 24 to 48 hours.'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT PROFILE MODAL ───────────────────────────────────────────── */}
        {showEditProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-7 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
              >
                <XCircle className="h-6 w-6" />
              </button>

              <h3 className="text-xl font-black text-slate-900 mb-1">Edit Profile Details</h3>
              <p className="text-slate-400 text-xs mb-6">Update your account information, contact, and security settings.</p>

              <form onSubmit={async (e) => {
                await handleProfileSubmit(e);
                setShowEditProfileModal(false);
                fetchData();
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={profileForm.contact}
                    onChange={e => setProfileForm(p => ({ ...p, contact: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Profile Photo (Base64 / File)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setProfileForm(p => ({ ...p, profileImage: reader.result }));
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    New Password <span className="text-slate-400 normal-case font-normal">(leave blank to keep unchanged)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={profileForm.password}
                    onChange={e => setProfileForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl text-sm shadow-md transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── PAYMENT OVERLAY MODAL ─────────────────────────────────────────── */}
      {payingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setPayingBooking(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <XCircle className="h-6 w-6" />
            </button>
            <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 text-center mb-1">Complete Payment</h3>
            <p className="text-slate-400 text-sm text-center mb-5">Secure checkout for slot: <strong className="text-emerald-600">{payingBooking.slotId}</strong></p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Slot charge</span>
                <span className="font-semibold text-slate-900">₹{payingBooking.totalAmount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Platform fee (10%)</span>
                <span className="text-slate-400">₹{(payingBooking.totalAmount * 0.1).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                <span className="text-slate-700">You Pay</span>
                <span className="text-emerald-600 text-lg">₹{payingBooking.totalAmount}</span>
              </div>
            </div>
            <form onSubmit={handlePay} className="space-y-4">
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Clicking pay will open a secure checkout window where you can complete payment via UPI, Cards, Netbanking, or Wallets.
              </p>
              <button type="submit" disabled={payLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl text-sm shadow-md disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {payLoading
                  ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Launching Gateway...</>
                  : `Pay ₹${payingBooking.totalAmount} with Razorpay`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ──────────────────────────────────────────────────── */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setReviewBooking(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <XCircle className="h-6 w-6" />
            </button>
            <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 text-center mb-1">Write a Review</h3>
            <p className="text-slate-400 text-sm text-center mb-5">Rate your experience at <strong className="text-slate-700">{reviewBooking.spaceId?.address}</strong></p>
            <form onSubmit={handleReviewSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button key={val} type="button" onClick={() => setRating(val)} className="hover:scale-110 transition-transform">
                      <Star className={`h-8 w-8 ${val <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Comments</label>
                <textarea required value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="How was the parking space? Safety, cleanliness, host helpfulness..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 h-24 resize-none" />
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3.5 rounded-xl text-sm shadow transition-colors">
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EXTENSION MODAL ────────────────────────────────────────────────── */}
      {extendingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setExtendingBooking(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700">
              <XCircle className="h-6 w-6" />
            </button>
            <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border">
              <Clock className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 text-center mb-1">Extend Parking Duration</h3>
            <p className="text-slate-400 text-sm text-center mb-5">Current Slot: <strong className="text-indigo-600">{extendingBooking.slotId}</strong></p>

            {extendError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl mb-5 text-xs font-semibold leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{extendError}</span>
              </div>
            )}

            <form onSubmit={handleExtendSubmit} className="space-y-5 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hours to Extend</label>
                <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-200 rounded-2xl p-2">
                  <button
                    type="button"
                    onClick={() => setExtendHours(prev => Math.max(1, prev - 1))}
                    disabled={extendHours <= 1}
                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-2xl flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-black text-slate-900 block tracking-tight">
                      {extendHours} {extendHours === 1 ? 'Hour' : 'Hours'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      +{(extendHours * 60)} mins
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtendHours(prev => Math.min(24, prev + 1))}
                    disabled={extendHours >= 24}
                    className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-2 mt-2.5">
                  {[1, 2, 3, 4, 6].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtendHours(h)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        extendHours === h
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
                Extension fee: <strong className="text-slate-800">₹{(extendHours * (extendingBooking.spaceId?.pricePerHour || 0)).toFixed(0)}</strong> · Extension is only permitted if the slot remains unoccupied during the extended time window.
              </div>
              <button
                type="submit"
                disabled={extendLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl text-sm shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {extendLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <span>💳 Pay ₹{(extendHours * (extendingBooking.spaceId?.pricePerHour || 0)).toFixed(0)} with Razorpay</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── LIVE NAVIGATION MODAL (RAPIDO/SWIGGY STYLE) ───────────────────── */}
      {navigatingSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col" style={{ height: '85vh', maxHeight: '680px' }}>
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Live Route Navigation</h3>
                  <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[280px] sm:max-w-md">Dest: {navigatingSpace.address}</p>
                </div>
              </div>
              <button onClick={closeNavigation} className="text-slate-400 hover:text-white transition-colors bg-slate-800/80 p-1.5 rounded-full">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 relative bg-slate-100">
              {routeDetails && (
                <div className="absolute top-4 left-4 right-4 z-20 bg-slate-900/95 backdrop-blur text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                    <Navigation className="h-5 w-5 text-white transform rotate-45 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Next Maneuver</p>
                    <p className="font-extrabold text-sm sm:text-base text-white mt-0.5">{routeDetails.instruction || 'Proceed to destination'}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-emerald-400 font-extrabold">
                      <span>⏱️ {Math.round(routeDetails.duration / 60)} mins remaining</span>
                      <span>·</span>
                      <span>🚗 {(routeDetails.distance / 1000).toFixed(1)} km left</span>
                    </div>
                  </div>
                </div>
              )}
              {navigatingSpace.coordinates?.lat && navigatingSpace.coordinates?.lng ? (
                <SpacesMap
                  spaces={[navigatingSpace]}
                  userLat={userLat}
                  userLng={userLng}
                  activeSpaceId={navigatingSpace._id}
                  height="100%"
                  onRouteUpdate={(details) => {
                    setRouteDetails(details);
                    if (details && !simulationActiveRef.current) {
                      setOriginalRouteDetails(details);
                      setSimIndex(0);
                    }
                  }}
                  simulationActive={simulationActive}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  No map coordinates set for this space.
                </div>
              )}

              {/* Arrived Modal Overlay */}
              {arrived && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-30 flex items-center justify-center p-6">
                  <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100 transform scale-100 transition-all duration-300">
                    <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-2">🎉 Arrived at Destination!</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6">
                      You have arrived at <strong className="text-slate-800">{navigatingSpace.address}</strong>.<br />
                      Your reserved slot is <strong className="text-emerald-600 font-mono text-sm">{activeBookings.find(b => b.spaceId?._id === navigatingSpace._id)?.slotId || 'A1'}</strong>.
                    </p>
                    <button
                      onClick={() => {
                        setArrived(false);
                        closeNavigation();
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-sm shadow-md transition-colors"
                    >
                      Park Now & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
              {/* Progress Bar */}
              {simulationActive && originalRouteDetails?.path && (
                <div className="w-full">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase mb-1">
                    <span>Route Progress</span>
                    <span>{Math.round((simIndex / (originalRouteDetails.path.length - 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 relative overflow-hidden border border-slate-300">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${(simIndex / (originalRouteDetails.path.length - 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  {simulationActive ? (
                    <>
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                      <span className="font-extrabold text-indigo-700">🚘 Drive Simulation Active</span>
                      <span className="text-slate-400 font-semibold">· speed: {simulationSpeed} ticks/s</span>
                    </>
                  ) : arrived ? (
                    <>
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-extrabold text-emerald-700">🎉 Arrived at Destination</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      <span className="font-bold">Live Tracking GPS Enabled</span>
                      <span className="text-slate-400 font-semibold">· auto-updating coordinates</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Simulation Controls */}
                  {!simulationActive && !arrived && originalRouteDetails?.path && (
                    <button
                      onClick={() => {
                        setSimulationActive(true);
                        simulationActiveRef.current = true;
                        setSimulationPaused(false);
                        setSimIndex(0);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Car className="h-3.5 w-3.5" /> Start Simulation
                    </button>
                  )}

                  {simulationActive && (
                    <>
                      <button
                        onClick={() => setSimulationPaused(!simulationPaused)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs shadow-sm transition-colors"
                      >
                        {simulationPaused ? '▶️ Resume' : '⏸️ Pause'}
                      </button>
                      <button
                        onClick={() => {
                          setSimulationActive(false);
                          simulationActiveRef.current = false;
                          setSimIndex(0);
                          resetToRealLocation();
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs shadow-sm transition-colors"
                      >
                        ⏹️ Stop
                      </button>
                      <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
                        <span className="text-slate-400 font-bold uppercase text-[9px]">Speed:</span>
                        <select
                          value={simulationSpeed}
                          onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                          className="bg-white border-0 font-bold text-slate-700 focus:outline-none cursor-pointer text-xs"
                        >
                          <option value="2">1x (Slow)</option>
                          <option value="5">2x (Normal)</option>
                          <option value="12">5x (Fast)</option>
                          <option value="25">10x (Turbo)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {arrived && (
                    <button
                      onClick={() => {
                        setArrived(false);
                        setSimIndex(0);
                        resetToRealLocation();
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold px-3 py-2 rounded-xl text-xs transition-colors"
                    >
                      🔄 Reset Simulation
                    </button>
                  )}

                  <button
                    onClick={closeNavigation}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-sm transition-colors"
                  >
                    Close Navigation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── PIN LOCATION MODAL (MATCHING SEEKER APP 1:1) ───────────────── */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-7 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
            >
              <XCircle className="h-6 w-6" />
            </button>

            {/* Header */}
            <div className="mb-5">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>📍</span> Pin Your Location
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Pin where you need parking so we can show you the nearest spots!
              </p>
            </div>

            <div className="space-y-5">
              {/* GPS Locate Button */}
              <button
                type="button"
                onClick={handleUseGps}
                disabled={locatingGps}
                className="w-full p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 rounded-2xl flex items-center gap-4 transition-all text-left group cursor-pointer shadow-xs"
              >
                <div className="h-11 w-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-emerald-500/20">
                  🎯
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {locatingGps ? 'Detecting your real-time GPS location...' : 'Use Current GPS Location'}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 font-medium mt-0.5">
                    Auto-detect &amp; pin your exact neighborhood
                  </p>
                </div>
                <span className="text-emerald-600 font-extrabold text-sm">→</span>
              </button>

              {/* Custom Area Search */}
              <div>
                <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Or Search Specific Area / Landmark
                </p>
                <form onSubmit={handleCustomAreaSearch} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter city, area, or landmark (e.g. Almasguda)..."
                    value={customAreaInput}
                    onChange={e => setCustomAreaInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Pin
                  </button>
                </form>
              </div>

              {/* Popular Parking Hotspots */}
              <div>
                <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2.5">
                  Popular Parking Hotspots
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_LOCATIONS.map((loc) => {
                    const isSelected = pinnedLocationName.includes(loc.name.split(',')[0]);
                    return (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleSelectPresetLocation(loc)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        📍 {loc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeekerDashboard;
