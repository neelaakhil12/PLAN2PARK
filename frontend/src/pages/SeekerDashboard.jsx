import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
    case 'paid':
      return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">✓ Paid</span>;
    case 'allotted':
      return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">🅿️ Allotted</span>;
    case 'completed':
      return <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200">Completed</span>;
    case 'cancelled':
      return <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">Cancelled</span>;
    default:
      return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">{status || 'Pending'}</span>;
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
  const [walletBalance, setWalletBalance] = useState(150);
  const [useWallet, setUseWallet] = useState(true);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);
  const [pinnedLocationName, setPinnedLocationName] = useState('Almasguda, Hyderabad');
  const [locatingGps, setLocatingGps] = useState(false);
  const [customAreaInput, setCustomAreaInput] = useState('');

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

  // New Booking form
  const [form, setForm] = useState({ vehicleNumber: '', seekerName: '', seekerContact: '', hours: '1', startTime: '', slotId: '', bookingType: 'hourly' });
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
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [mapView, setMapView] = useState(false);
  const [userLat, setUserLat] = useState(17.313);
  const [userLng, setUserLng] = useState(78.545);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeRadius, setNearMeRadius] = useState(5); // km
  const [activeSpaceId, setActiveSpaceId] = useState(null); // card ↔ map pin hover sync

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

      const rP = await fetch(`${API_URL}/auth/profile`, { headers: h });
      if (rP.ok) {
        const uData = await rP.json();
        setFavorites(uData.favorites || []);
        if (uData.walletBalance !== undefined) {
          setWalletBalance(uData.walletBalance);
        }
      }
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
      const activePaid = bookings.filter(b => b.status === 'paid' && b.endTime);
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

      // Real Razorpay checkout flow
      const options = {
        key: keyId || 'rzp_test_TRbpfgVeLqTOdb',
        amount: amount,
        currency: currency || 'INR',
        name: 'PlantoPark Safe P2P',
        description: `Booking Reference: ${booking._id}`,
        order_id: orderId,
        handler: async function (response) {
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
              alert('🎉 Razorpay Payment successful! Your slot is confirmed.');
              setPayingBooking(null);
              setSelectedSpace(null);
              setCurrentView('bookings');
              fetchData();
            } else {
              const errData = await verifyRes.json();
              alert(errData.message || 'Payment signature verification failed.');
            }
          } catch (verErr) {
            console.error('Verification error:', verErr);
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
          ondismiss: function () {
            setPayLoading(false);
            setCurrentView('bookings');
            fetchData();
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error('Razorpay Error:', error);
      alert('An error occurred while launching Razorpay payment gateway.');
    }
    setPayLoading(false);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!form.slotId) {
      alert('Please select an available parking slot to book.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('spaceId', selectedSpace._id);
      fd.append('vehicleNumber', form.vehicleNumber || 'TS07WJ2099');
      fd.append('seekerName', form.seekerName || user?.name || 'Seeker');
      fd.append('seekerContact', form.seekerContact || user?.contact || '9989551305');
      fd.append('hours', Number(form.hours || 1));
      fd.append('startTime', form.startTime || new Date().toISOString());
      fd.append('slotId', form.slotId);
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
    setExtendError('');
    setExtendLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings/${extendingBooking._id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ extendHours: Number(extendHours) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Booking extended successfully!');
        setExtendingBooking(null);
        setExtendHours(1);
        fetchData();
      } else {
        setExtendError(data.message || 'Failed to extend booking');
      }
    } catch (err) {
      console.error(err);
      setExtendError('Connection error. Please try again.');
    }
    setExtendLoading(false);
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

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking request?')) return;
    const res = await fetch(`${API_URL}/bookings/${id}/cancel`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { alert('Booking cancelled.'); fetchData(); }
  };

  const handleComplete = async (id) => {
    const res = await fetch(`${API_URL}/bookings/${id}/complete`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { alert('Check-out completed. Thank you!'); fetchData(); }
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
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            const areaName = data.address
              ? (data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.city_district || data.address.city || 'Current Area')
              : 'Current GPS Location';
            setPinnedLocationName(`🎯 ${areaName}`);
          } catch (e) {
            setPinnedLocationName(`🎯 GPS Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
          } finally {
            setLocatingGps(false);
            setShowPinModal(false);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setUserLat(17.313);
          setUserLng(78.545);
          setPinnedLocationName('🎯 Almasguda, Hyderabad');
          setLocatingGps(false);
          setShowPinModal(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
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

  const activeBookings = bookings.filter(b => b.status === 'paid');
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
      return matchesSearch && matchesEv;
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
                      <span className="bg-emerald-600/95 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md shadow uppercase tracking-wider">
                        🛡️ VERIFIED PARKING
                      </span>
                      {selectedSpace.hasEvCharger && (
                        <span className="bg-blue-600/95 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full backdrop-blur-md shadow uppercase tracking-wider">
                          ⚡ EV CHARGING
                        </span>
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
                      <p className="text-2xl font-black text-emerald-600">
                        ₹{selectedSpace.pricePerHour || 50}<span className="text-xs font-bold text-slate-400">/hr</span>
                      </p>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mt-1 border border-emerald-200">
                        🟢 {bookingAvailableSlots.filter(s => s.isAvailable).length} of {bookingAvailableSlots.length || selectedSpace.totalSlots || 5} Slots Free
                      </span>
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
                    {/* Vehicle Plate Number */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                        Vehicle Plate Number
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={form.vehicleNumber}
                          onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))}
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

                    {/* Vehicle Type Switcher */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                        Vehicle Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, bookingType: 'hourly' }))}
                          className="py-3 px-4 rounded-2xl text-xs font-extrabold border transition-all bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                        >
                          🚗 4-Wheeler (Car)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, bookingType: 'hourly' }))}
                          className="py-3 px-4 rounded-2xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                        >
                          🏍️ 2-Wheeler (Bike)
                        </button>
                      </div>
                    </div>

                    {/* Parking Duration (Hours) Pills */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                        Parking Duration (Hours)
                      </label>
                      <div className="grid grid-cols-4 gap-2.5">
                        {['1', '2', '4', '8'].map(hr => (
                          <button
                            key={hr}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, hours: hr }))}
                            className={`py-3 rounded-2xl text-xs font-black transition-all border ${
                              form.hours === hr
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {hr} hr{hr !== '1' ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Select Parking Slot */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                          Select Parking Slot
                        </label>
                        {fetchingSlots && (
                          <span className="text-[11px] font-bold text-slate-400 animate-pulse">Checking live slot availability...</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {bookingAvailableSlots.map(s => {
                          const isSelected = form.slotId === s.slotId;
                          return (
                            <button
                              key={s.slotId}
                              type="button"
                              disabled={!s.isAvailable}
                              onClick={() => setForm(p => ({ ...p, slotId: s.slotId }))}
                              className={`py-3 px-2 rounded-2xl text-xs font-black transition-all border text-center ${
                                !s.isAvailable
                                  ? 'bg-rose-50 border-rose-300 text-rose-400 cursor-not-allowed select-none opacity-85'
                                  : isSelected
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25 scale-105'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700'
                              }`}
                            >
                              <span className="text-sm font-black">{s.slotId}</span>
                              {!s.isAvailable ? (
                                <span className="block text-[9px] font-black text-rose-600 mt-1 uppercase tracking-wider">🚫 Booked</span>
                              ) : isSelected ? (
                                <span className="block text-[9px] font-black text-emerald-100 mt-1 uppercase tracking-wider">✓ Selected</span>
                              ) : (
                                <span className="block text-[9px] font-black text-emerald-600 mt-1 uppercase tracking-wider">🟢 Free</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PlanToPark Wallet Money Deduction Card */}
                    {(() => {
                      const price = selectedSpace.pricePerHour || 50;
                      const hrs = Number(form.hours || 1);
                      const baseTotal = price * hrs;
                      const maxDiscount = Number(selectedSpace.maxWalletDiscount ?? 10);
                      const discount = (useWallet && maxDiscount > 0) ? Math.min(walletBalance, maxDiscount, baseTotal) : 0;
                      const finalTotal = Math.max(0, baseTotal - discount);

                      return (
                        <>
                          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">👛</span>
                                <div>
                                  <p className="text-xs font-black text-emerald-950">PlanToPark Wallet Balance</p>
                                  <p className="text-[11px] text-emerald-700 font-bold">₹{walletBalance} available</p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={useWallet}
                                  onChange={e => setUseWallet(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                            {useWallet && discount > 0 && (
                              <p className="text-[11px] font-bold text-emerald-800 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-100">
                                ✨ ₹{discount} wallet discount automatically applied!
                              </p>
                            )}
                          </div>

                          {/* Price Breakdown */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-500 font-medium">
                              <span>Parking Fee ({hrs} hr{hrs > 1 ? 's' : ''} × ₹{price})</span>
                              <span className="font-bold text-slate-800">₹{baseTotal}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-emerald-600 font-bold">
                                <span>Wallet Discount Applied</span>
                                <span>- ₹{discount}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-500 font-medium">
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
                      <p className="text-sm font-extrabold text-slate-900 truncate">{pinnedLocationName}</p>
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

                        return (
                          <div
                            key={space._id}
                            className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group p-5 space-y-4"
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
                                  <span className="bg-emerald-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                                    VERIFIED OWNER SPOT
                                  </span>
                                  {space.hasEvCharger && (
                                    <span className="bg-blue-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                                      ⚡ EV CHARGING
                                    </span>
                                  )}
                                </div>
                                <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md text-emerald-400 font-black text-sm px-3 py-1 rounded-xl shadow">
                                  ₹{space.pricePerHour || 50}<span className="text-[10px] text-slate-300 font-normal">/hr</span>
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
                            </div>

                            {/* Footer (Real-Time Capacity & Book Button) */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Real-Time Capacity</p>
                                <p className={`text-xs font-black mt-0.5 ${!isFull ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {!isFull ? `🟢 ${freeSlots} of ${space.totalSlots || 5} Slots Free` : '🚫 Full'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSpace(space);
                                  const now = new Date().toISOString().slice(0, 16);
                                  setForm(p => ({ ...p, seekerName: user?.name || '', seekerContact: user?.contact || '', startTime: now, bookingType: 'hourly', hours: '1' }));
                                }}
                                disabled={isFull}
                                className={`px-5 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                  !isFull
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {!isFull ? 'Book Spot →' : 'Full'}
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
                      src={selectedSpace.image || 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=1200'}
                      alt={selectedSpace.address}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="bg-emerald-500/90 backdrop-blur text-white text-[11px] font-black px-3 py-1 rounded-full tracking-wider uppercase shadow-md">
                        VERIFIED PARKING
                      </span>
                      {selectedSpace.hasEvCharger && (
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
                      Rate: <span className="text-emerald-600 font-black text-base">₹{selectedSpace.pricePerHour || 40}/hour</span>
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
                          onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))}
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

                    {/* Vehicle Type Switcher */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                        Vehicle Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, bookingType: 'hourly' }))}
                          className="py-3 px-4 rounded-2xl text-xs font-extrabold border transition-all bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                        >
                          🚗 4-Wheeler (Car)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, bookingType: 'hourly' }))}
                          className="py-3 px-4 rounded-2xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                        >
                          🏍️ 2-Wheeler (Bike)
                        </button>
                      </div>
                    </div>

                    {/* Parking Duration (Hours) Pills */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                        Parking Duration (Hours)
                      </label>
                      <div className="grid grid-cols-4 gap-2.5">
                        {['1', '2', '4', '8'].map(hr => (
                          <button
                            key={hr}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, hours: hr }))}
                            className={`py-3 rounded-2xl text-xs font-black transition-all border ${
                              form.hours === hr
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {hr} hr{hr !== '1' ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Select Parking Slot */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                          Select Parking Slot
                        </label>
                        {fetchingSlots && (
                          <span className="text-[11px] font-bold text-slate-400 animate-pulse">Checking live slot availability...</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {bookingAvailableSlots.map(s => {
                          const isSelected = form.slotId === s.slotId;
                          return (
                            <button
                              key={s.slotId}
                              type="button"
                              disabled={!s.isAvailable}
                              onClick={() => setForm(p => ({ ...p, slotId: s.slotId }))}
                              className={`py-3 px-2 rounded-2xl text-xs font-black transition-all border text-center ${
                                !s.isAvailable
                                  ? 'bg-rose-50 border-rose-300 text-rose-400 cursor-not-allowed select-none opacity-85'
                                  : isSelected
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25 scale-105'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700'
                              }`}
                            >
                              <span className="text-sm font-black">{s.slotId}</span>
                              {!s.isAvailable ? (
                                <span className="block text-[9px] font-black text-rose-600 mt-1 uppercase tracking-wider">🚫 Booked</span>
                              ) : isSelected ? (
                                <span className="block text-[9px] font-black text-emerald-100 mt-1 uppercase tracking-wider">✓ Selected</span>
                              ) : (
                                <span className="block text-[9px] font-black text-emerald-600 mt-1 uppercase tracking-wider">🟢 Free</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PlanToPark Wallet Money Deduction Card */}
                    {(() => {
                      const hourlyRate = selectedSpace.pricePerHour || 40;
                      const rawTotal = Number(form.hours || 1) * hourlyRate;
                      const maxWallet = selectedSpace.maxWalletDiscount !== undefined ? Number(selectedSpace.maxWalletDiscount) : 10;
                      const discount = (useWallet && walletBalance > 0 && maxWallet > 0) ? Math.min(walletBalance, maxWallet, rawTotal) : 0;
                      const finalTotal = Math.max(0, rawTotal - discount);

                      return (
                        <>
                          {walletBalance > 0 && maxWallet > 0 && (
                            <div
                              onClick={() => setUseWallet(p => !p)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                useWallet
                                  ? 'bg-emerald-50/70 border-emerald-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-base ${
                                  useWallet ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  ⚡
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900">
                                    Use PlanToPark Wallet (-₹{discount})
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Available Balance: ₹{walletBalance}.00 • Max ₹{maxWallet} usable
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

                          {/* Price Breakdown Box */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between text-slate-600">
                              <span>Base Rate</span>
                              <span className="font-bold text-slate-800">₹{hourlyRate} × {form.hours} hrs = ₹{rawTotal}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex items-center justify-between text-emerald-600 font-bold">
                                <span>⚡ Wallet Money Applied</span>
                                <span className="font-black">- ₹{discount}.00</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-slate-600">
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

                      return (
                        <div
                          key={space._id}
                          onMouseEnter={() => setActiveSpaceId(space._id)}
                          onMouseLeave={() => setActiveSpaceId(null)}
                          onClick={() => sLat && setActiveSpaceId(space._id)}
                          className={`bg-white border rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-all duration-200 ${
                            isActive
                              ? 'border-emerald-400 shadow-emerald-100 shadow-md ring-2 ring-emerald-200'
                              : 'border-slate-200 hover:shadow-md hover:border-slate-300'
                          }`}
                        >
                          <div className="flex gap-0">
                            {/* Image */}
                            <div className="relative shrink-0 w-32 sm:w-36">
                              <img src={spotImg} alt={space.title || 'Parking Spot'} className="h-full w-full object-cover min-h-[110px]" />
                              {freeSlots > 0 && (
                                <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">
                                  AVAILABLE
                                </span>
                              )}
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
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${freeSlots > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                                    {freeSlots > 0 ? `${freeSlots} Free` : 'Full'}
                                  </span>
                                  <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                    {space.distBadge || 'Nearby'}
                                  </span>
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
                                  <span className="text-base font-black text-emerald-600">₹{space.pricePerHour || 50}</span>
                                  <span className="text-xs text-slate-400 font-semibold">/hr</span>
                                </div>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedSpace(space);
                                    const now = new Date().toISOString().slice(0,16);
                                    setForm(p => ({ ...p, seekerName: user?.name||'', seekerContact: user?.contact||'', startTime: now, bookingType: 'hourly', hours: '1' }));
                                  }}
                                  disabled={freeSlots === 0}
                                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                                    freeSlots > 0
                                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  {freeSlots > 0 ? 'Book Now →' : 'Full'}
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
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">My Bookings</h1>
              <p className="text-slate-500 text-sm mt-0.5">Active and upcoming parking reservations.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Active Reservations</h3>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{activeBookings.length} active</span>
              </div>
              <div className="bg-slate-50 border-t border-slate-100">
                {activeBookings.length === 0 ? (
                  <div className="text-center py-16 px-6 text-slate-400 bg-white">
                    <p className="font-semibold text-sm">No active reservations found.</p>
                    <button 
                      onClick={() => setCurrentView('find_parking')} 
                      className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors"
                    >
                      Find a Spot →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    {activeBookings.map(b => (
                      <div key={b._id} className={`rounded-3xl border shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden group ${
                          b.bookingType === 'monthly' ? 'bg-blue-50/60 border-blue-200' :
                          b.status === 'paid' ? 'bg-emerald-50/60 border-emerald-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                        
                        <div className="space-y-4">
                          {/* Header: Address & Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-slate-900 text-base tracking-tight truncate group-hover:text-emerald-600 transition-colors" title={b.spaceId?.address}>
                                {b.spaceId?.address || 'Parking Property'}
                              </h4>
                              <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1 truncate">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {b.spaceId?.location || 'Unknown Location'}
                              </p>
                            </div>
                            <div className="shrink-0">
                              <StatusBadge status={b.status} />
                            </div>
                          </div>

                          {/* Info Grid details */}
                          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100/80 text-xs">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Allotted Slot</p>
                              <p className="mt-1 font-mono font-extrabold text-slate-800 text-sm">
                                {b.slotId ? (
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg text-[11px] border border-emerald-200">
                                    {b.slotId}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 italic">Pending Host</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vehicle Plate</p>
                              <p className="mt-1 font-mono font-extrabold text-slate-800 text-sm uppercase">
                                {b.vehicleNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Duration</p>
                              {b.bookingType === 'monthly' ? (
                                <>
                                  <p className="mt-1 font-extrabold text-purple-700">Monthly Pack</p>
                                  <p className="text-[10px] text-purple-500 font-bold">
                                    {Math.max(0, Math.ceil((new Date(b.startTime).getTime() + (b.hours || 720) * 3600000 - new Date().getTime()) / (1000 * 3600 * 24)))} Days left
                                  </p>
                                </>
                              ) : (
                                <p className="mt-1 font-extrabold text-slate-700">
                                  {b.hours} hours
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduled Start</p>
                              <p className="mt-1 font-extrabold text-slate-700">
                                {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Amount & Action buttons */}
                        <div className="flex items-center justify-between border-t border-slate-100 mt-5 pt-4 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Fee</p>
                            <p className="text-xl font-black text-slate-900 mt-0.5">₹{b.totalAmount}</p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.status === 'allotted' && (
                              <button 
                                onClick={() => setPayingBooking(b)} 
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-md shadow-emerald-500/10 transition-all hover:-translate-y-0.5"
                              >
                                <CreditCard className="h-3.5 w-3.5" /> Pay Now
                              </button>
                            )}

                            {b.status === 'paid' && (
                              <>
                                <button 
                                  onClick={() => navigate(`/invoice/${b._id}`)} 
                                  className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 font-bold px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5"
                                >
                                  Invoice
                                </button>
                                {b.bookingType !== 'monthly' && (
                                  <button 
                                    onClick={() => handleComplete(b._id)} 
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-extrabold px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5"
                                  >
                                    Check Out
                                  </button>
                                )}
                                <button 
                                  onClick={() => { setExtendingBooking(b); setExtendError(''); setExtendHours(1); }} 
                                  className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5"
                                >
                                  Extend
                                </button>
                              </>
                            )}

                            {b.status === 'pending_approval' && (
                              <button 
                                onClick={() => handleCancel(b._id)} 
                                className="bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-bold px-3 py-2 rounded-xl text-xs transition-all hover:-translate-y-0.5"
                              >
                                Cancel
                              </button>
                            )}

                            {b.spaceId && (
                              <>
                                <button 
                                  onClick={() => handleNavigate(b.spaceId)} 
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/10 transition-all hover:-translate-y-0.5"
                                >
                                  <Navigation className="h-3.5 w-3.5" /> In-App Nav
                                </button>
                                <button 
                                  onClick={() => {
                                    const c = b.spaceId.coordinates;
                                    const dest = (c && c.lat && c.lng) ? `${c.lat},${c.lng}` : encodeURIComponent(b.spaceId.address);
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-all hover:-translate-y-0.5"
                                >
                                  <Map className="h-3.5 w-3.5" /> Google Maps
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                        <td className="px-6 py-4 font-bold text-slate-900">₹{b.totalAmount}</td>
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
                      <img src={space.image} alt="" className="w-full h-36 object-cover" />
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
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Available Balance</p>
                  <h2 className="text-4xl sm:text-5xl font-black mt-1">₹{walletBalance || 150}.00</h2>
                  <p className="text-xs text-emerald-200 mt-2 font-medium">
                    ✓ Automatically applicable on all parking spots up to host-configured limit (e.g. ₹10 off).
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
                <p className="text-xs text-slate-400 mt-1">No OTP delays or gateway redirect wait times when paying full amount.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg mb-3">
                  🛡️
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Auto Discount</h4>
                <p className="text-xs text-slate-400 mt-1">Automatically knocks off fees on verified parking host properties.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg mb-3">
                  🔄
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Direct Refunds</h4>
                <p className="text-xs text-slate-400 mt-1">Immediate credit restoration back to your balance on booking cancellations.</p>
              </div>
            </div>

            {/* Wallet Activity History */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Wallet Transactions</h3>
                <span className="text-xs font-bold text-emerald-600">Active</span>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                    +
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800">Welcome Signup Credit</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Automated registration welcome bonus</p>
                  </div>
                  <span className="font-mono font-black text-emerald-600 text-sm">+₹150.00</span>
                </div>
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
                  <p className="text-sm font-black text-emerald-600">₹{walletBalance || 150}.00</p>
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
                onClick={() => setCurrentView('complaints')}
                className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between transition-colors"
              >
                <span>📞 24/7 Customer Support Desk</span>
                <span>→</span>
              </button>
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>📜 Terms of Service &amp; Privacy Policy</span>
                <span className="text-emerald-600 font-extrabold">Standard</span>
              </div>
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
                <select
                  value={extendHours}
                  onChange={e => setExtendHours(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="3">3 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="6">6 Hours</option>
                </select>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
                Extension fee: <strong className="text-slate-800">₹{(extendHours * (extendingBooking.spaceId?.pricePerHour || 0)).toFixed(0)}</strong> · Extension is only permitted if the slot remains unoccupied during the extended time window.
              </div>
              <button
                type="submit"
                disabled={extendLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl text-sm shadow transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {extendLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking Slot Availability...
                  </>
                ) : 'Confirm Extension'}
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
