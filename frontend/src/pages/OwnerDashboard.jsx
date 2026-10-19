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
  Zap, FileText, Check, AlertCircle, RefreshCw, Wallet, ArrowUpRight,
  ArrowDownLeft, Landmark, QrCode, CheckCircle2
} from 'lucide-react';
import Invoice from './Invoice';

const OwnerDashboard = () => {
  const { token, API_URL, logout, user, setUser, getImageUrl } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view: 'dashboard', 'orders', 'wallet', 'add_spot', 'profile'
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

  // Wallet states
  const [walletData, setWalletData] = useState({
    walletBalance: 0,
    availableBalance: 0,
    pendingWithdrawal: 0,
    totalWithdrawn: 0,
    totalGrossEarned: 0,
    platformCommissionRate: 15,
    minWithdrawalAmount: 2000,
    bankAccountDetails: {},
    transactions: [],
    payoutRequests: [],
  });
  const [walletTab, setWalletTab] = useState('payouts'); // 'payouts' or 'ledger'
  const [walletLoading, setWalletLoading] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('upi'); // 'upi' or 'bank'
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [withdrawIfscCode, setWithdrawIfscCode] = useState('');
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [withdrawQrFile, setWithdrawQrFile] = useState(null);
  const [withdrawQrPreview, setWithdrawQrPreview] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [viewingReceiptModal, setViewingReceiptModal] = useState(null);

  // Edit / Active space state
  const [editingSpot, setEditingSpot] = useState(null);
  const [profileImgError, setProfileImgError] = useState(false);
  const [showSupportDeskModal, setShowSupportDeskModal] = useState(false);
  const [supportContacts, setSupportContacts] = useState({
    supportPhone: '+91 8919360467',
    supportEmail: 'plantopark@gmail.com',
    supportWhatsapp: '+91 8919360467',
    supportHours: '24/7 Dedicated Support Desk',
  });

  // Helper for pristine empty Add Spot form (matches Owner Mobile App 1:1)
  const getEmptySpotForm = () => ({
    title: '',
    address: '',
    city: '',
    location: '',
    pincode: '',
    googleMapsLink: '',
    totalSlots: '',
    pricePerHour: '',
    pricePerDay: '',
    pricePerWeek: '',
    pricePerMonth: '',
    maxWalletDiscount: '10',
    cancellationPolicy: 'full',
    hasEvCharger: false,
    hasCctv: false,
    isCovered: false,
    isActive: true,
    imageUrl: '',
    imageFile: null,
    images: [],
    lat: null,
    lng: null,
    suitableVehicles: ['hatchback', 'sedan', 'suv', '2-wheeler'],
    spaceCategory: user?.accountCategory === 'vehicle_storage_owner' ? 'commercial_vehicle_storage' : 'standard',
    landAcres: '',
    monthlyStorageRate: '',
    hasCompoundWall: true,
    has24x7Guards: true,
    hasFloodLights: true,
  });

  // Add / Edit Spot Form
  const [spotForm, setSpotForm] = useState(getEmptySpotForm());
  const [submittingSpot, setSubmittingSpot] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [parsingMapsLink, setParsingMapsLink] = useState(false);
  const [mapsSuccessMsg, setMapsSuccessMsg] = useState('');
  const spotFileInputRef = useRef(null);

  const handleStartAddSpot = () => {
    setEditingSpot(null);
    setSpotForm(getEmptySpotForm());
    setCurrentView('add_spot');
  };

  const handleSpotImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentImages = spotForm.images || [];
    const remainingSlots = Math.max(0, 8 - currentImages.length);
    if (remainingSlots <= 0) {
      alert('You have reached the maximum limit of 8 photos.');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    Promise.all(
      filesToProcess.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      })
    ).then(newBase64Images => {
      const validImages = newBase64Images.filter(Boolean);
      setSpotForm(prev => {
        const updated = [...(prev.images || []), ...validImages].slice(0, 8);
        return {
          ...prev,
          images: updated,
          imageUrl: updated[0] || prev.imageUrl,
          imageFile: filesToProcess[0] || prev.imageFile,
        };
      });
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveSpotImage = (indexToRemove) => {
    setSpotForm(prev => {
      const updated = (prev.images || []).filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updated,
        imageUrl: updated[0] || '',
        imageFile: updated.length === 0 ? null : prev.imageFile,
      };
    });
  };

  const handleSetPrimaryCover = (index) => {
    setSpotForm(prev => {
      const current = prev.images || [];
      const selected = current[index];
      const rest = current.filter((_, idx) => idx !== index);
      const reordered = [selected, ...rest];
      return {
        ...prev,
        images: reordered,
        imageUrl: selected,
      };
    });
  };

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

  // Fetch owner wallet data
  const fetchWalletData = async () => {
    if (!token) return;
    setWalletLoading(true);
    try {
      const res = await fetch(`${API_URL}/wallet/owner?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletData(data);
        if (data.walletBalance !== undefined) {
          setTotalEarnings(data.walletBalance);
        }
        if (data.bankAccountDetails) {
          if (data.bankAccountDetails.upiId) setWithdrawUpiId(prev => prev || data.bankAccountDetails.upiId);
          if (data.bankAccountDetails.accountName) setWithdrawAccountName(prev => prev || data.bankAccountDetails.accountName);
          if (data.bankAccountDetails.accountNumber) setWithdrawAccountNumber(prev => prev || data.bankAccountDetails.accountNumber);
          if (data.bankAccountDetails.ifscCode) setWithdrawIfscCode(prev => prev || data.bankAccountDetails.ifscCode);
          if (data.bankAccountDetails.bankName) setWithdrawBankName(prev => prev || data.bankAccountDetails.bankName);
        }
      }
    } catch (err) {
      console.warn('Error fetching owner wallet:', err);
    } finally {
      setWalletLoading(false);
    }
  };

  // Submit withdrawal request
  const handleWithdrawSubmit = async (e) => {
    if (e) e.preventDefault();
    const num = Number(withdrawAmount);
    const minLimit = walletData.minWithdrawalAmount || 2000;
    const available = walletData.availableBalance !== undefined
      ? walletData.availableBalance
      : Math.max(0, (walletData.walletBalance || 0) - (walletData.pendingWithdrawal || 0));

    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    if (num > available) {
      alert(`Insufficient available balance. You can withdraw up to ₹${available.toFixed(2)}.`);
      return;
    }
    if (num < minLimit) {
      alert(`Minimum withdrawal limit is ₹${minLimit}. You cannot withdraw less than ₹${minLimit}.`);
      return;
    }

    if (withdrawMethod === 'upi') {
      if (!withdrawUpiId.trim()) {
        alert('Please enter a valid UPI ID (e.g. name@okaxis).');
        return;
      }
    } else {
      if (!withdrawAccountName.trim() || !withdrawAccountNumber.trim() || !withdrawIfscCode.trim()) {
        alert('Please complete all bank fields (Account Name, Account Number, and IFSC Code).');
        return;
      }
    }

    setSubmittingWithdrawal(true);
    try {
      const fd = new FormData();
      fd.append('amount', String(num));
      fd.append('payoutMethod', withdrawMethod);
      if (withdrawMethod === 'upi') {
        fd.append('upiId', withdrawUpiId.trim());
      } else {
        fd.append('accountName', withdrawAccountName.trim());
        fd.append('accountNumber', withdrawAccountNumber.trim());
        fd.append('ifscCode', withdrawIfscCode.trim().toUpperCase());
        fd.append('bankName', withdrawBankName.trim());
      }
      if (withdrawQrFile) {
        fd.append('qrImage', withdrawQrFile);
      }

      const res = await fetch(`${API_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Withdrawal request submitted successfully! Admin will process and transfer funds.');
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawQrFile(null);
        setWithdrawQrPreview('');
        fetchWalletData();
      } else {
        alert(data.message || 'Failed to submit withdrawal request.');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      alert('Error submitting withdrawal request.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  // Fetch all owner data from AWS backend
  const fetchOwnerData = async () => {
    if (!token) return;
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [spacesRes, analyticsRes, bookingsRes, profileRes, walletRes] = await Promise.all([
        fetch(`${API_URL}/spaces/owner/my-spaces`, { headers: h }),
        fetch(`${API_URL}/analytics/owner`, { headers: h }),
        fetch(`${API_URL}/bookings/owner-bookings`, { headers: h }),
        fetch(`${API_URL}/auth/profile`, { headers: h }),
        fetch(`${API_URL}/wallet/owner?t=${Date.now()}`, { headers: h })
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
          if (b.status === 'cancelled') return sum;
          const earn = (b.ownerEarnings !== undefined && b.ownerEarnings !== null)
            ? Number(b.ownerEarnings)
            : (b.paymentStatus === 'paid' ? Number(b.totalAmount || 0) : 0);
          return sum + (isNaN(earn) ? 0 : earn);
        }, 0);
      }

      let backendEarnings = 0;
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        backendEarnings = Number(analyticsData.earnings || 0);
        setAnalytics(analyticsData);
      }

      if (walletRes && walletRes.ok) {
        const wData = await walletRes.json();
        setWalletData(wData);
        setTotalEarnings(wData.walletBalance !== undefined ? wData.walletBalance : (calculatedEarnings > 0 ? calculatedEarnings : backendEarnings));
      } else {
        setTotalEarnings(calculatedEarnings > 0 ? calculatedEarnings : backendEarnings);
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
      try {
        const supportRes = await fetch(`${API_URL}/settings/support`);
        if (supportRes.ok) {
          const sData = await supportRes.json();
          setSupportContacts(prev => ({ ...prev, ...sData }));
        }
      } catch (sErr) {}
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

  // Owner Manual Check-In
  const handleOwnerCheckIn = async (bookingId, vehicleNumber) => {
    if (!window.confirm(`Confirm Check-In for vehicle ${vehicleNumber || 'this booking'}?\n\nDynamic parking timer will start from this moment.`)) return;
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🅿️ Vehicle ${vehicleNumber || ''} checked in successfully! Dynamic parking timer has started.`);
        fetchOwnerData();
      } else {
        alert(data.message || 'Could not check in booking');
      }
    } catch (err) {
      alert('Network error while checking in: ' + err.message);
    }
  };

  // Owner Manual Check-Out & Slot Release
  const handleOwnerCheckOut = async (bookingId, vehicleNumber, slotId) => {
    if (!window.confirm(`Check out vehicle ${vehicleNumber || 'this booking'}?\n\nSlot ${slotId || ''} will be freed and made available for new bookings immediately.`)) return;
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(`👋 Vehicle ${vehicleNumber || ''} checked out. Slot ${slotId || ''} is now freed!`);
        fetchOwnerData();
      } else {
        alert(data.message || 'Could not check out');
      }
    } catch (err) {
      alert('Network error while checking out: ' + err.message);
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
      pincode: spot.pincode || '500097',
      googleMapsLink: spot.locationLink || spot.googleMapsLink || '',
      totalSlots: String(spot.totalSlots || (spot.slots ? spot.slots.length : 5)),
      pricePerHour: String(hourly),
      pricePerDay: String(spot.pricePerDay || (Number(hourly) * 8)),
      pricePerWeek: String(spot.pricePerWeek || (Number(hourly) * 8 * 6)),
      pricePerMonth: String(spot.pricePerMonth || (Number(hourly) * 8 * 25)),
      maxWalletDiscount: String(spot.maxWalletDiscount ?? 10),
      cancellationPolicy: 'full',
      hasEvCharger: !!spot.hasEvCharger,
      hasCctv: !!spot.hasCctv,
      isCovered: !!spot.isCovered,
      isActive: spot.isActive !== false,
      imageUrl: spot.image || (Array.isArray(spot.images) && spot.images.length > 0 ? spot.images[0] : ''),
      imageFile: null,
      images: Array.isArray(spot.images) && spot.images.length > 0 ? spot.images : (spot.image ? [spot.image] : []),
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
            const city = data.address?.city || data.address?.town || data.address?.state_district || '';
            const pincode = data.address?.postcode || '';
            setSpotForm(p => ({ ...p, lat, lng, address: addr, city, location: city, pincode }));
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

  // Parse Google Maps link & auto-fill address, city, pincode, coordinates
  const handleParseMapsLink = async (urlInput) => {
    let rawUrl = (urlInput || spotForm.googleMapsLink || '').trim();
    if (!rawUrl) {
      alert('Please enter or paste a Google Maps link first.');
      return;
    }

    // Clean up quotes, backticks, leading slashes
    rawUrl = rawUrl.replace(/^['"`\s]+|['"`\s]+$/g, '');
    if (rawUrl.startsWith('//')) {
      rawUrl = 'https:' + rawUrl;
    } else if (rawUrl.startsWith('/')) {
      rawUrl = 'https:/' + rawUrl;
    } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl;
    }

    setParsingMapsLink(true);
    setMapsSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/spaces/parse-maps-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
      });

      const data = await res.json();

      if (res.ok && data && (data.address || data.lat || data.fullUrl)) {
        let finalAddr = data.address || '';
        let detectedCity = data.city || '';
        let detectedPin = data.pincode || spotForm.pincode || '';
        let detectedLat = data.lat ? Number(data.lat) : null;
        let detectedLng = data.lng ? Number(data.lng) : null;

        // Extract coordinates client-side if missing
        if (!detectedLat || !detectedLng) {
          const dMatch = rawUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          if (dMatch) {
            detectedLat = parseFloat(dMatch[1]);
            detectedLng = parseFloat(dMatch[2]);
          } else {
            const atMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) {
              detectedLat = parseFloat(atMatch[1]);
              detectedLng = parseFloat(atMatch[2]);
            } else {
              const qMatch = rawUrl.match(/[?&]q=(-?\d+\.\d+)(?:%2c|%2C|,)(-?\d+\.\d+)/i);
              if (qMatch) {
                detectedLat = parseFloat(qMatch[1]);
                detectedLng = parseFloat(qMatch[2]);
              }
            }
          }
        }

        // Extract 6-digit Indian PIN code from address if present
        if (finalAddr) {
          const pinMatch = finalAddr.match(/\b(5\d{5})\b/) || finalAddr.match(/\b(\d{6})\b/);
          if (pinMatch) detectedPin = pinMatch[1];
        }

        // Normalize city
        const addrLower = (finalAddr || '').toLowerCase();
        if (addrLower.includes('hyderabad')) detectedCity = 'Hyderabad';
        else if (addrLower.includes('secunderabad')) detectedCity = 'Secunderabad';
        else if (addrLower.includes('cyberabad')) detectedCity = 'Hyderabad';

        setSpotForm(p => {
          let updatedTitle = p.title;
          if (!updatedTitle.trim()) {
            if (data.colonyArea) updatedTitle = `Parking at ${data.colonyArea}`;
            else if (finalAddr) updatedTitle = `Parking near ${finalAddr.split(',')[0].trim()}`;
          }
          return {
            ...p,
            googleMapsLink: rawUrl,
            address: finalAddr || p.address,
            city: detectedCity,
            location: detectedCity,
            pincode: detectedPin,
            lat: detectedLat !== null ? detectedLat : p.lat,
            lng: detectedLng !== null ? detectedLng : p.lng,
            title: updatedTitle,
          };
        });

        setMapsSuccessMsg('✅ Address, City, Pincode & Location auto-filled!');
        setTimeout(() => setMapsSuccessMsg(''), 6000);
      } else {
        await parseCoordinatesFallback(rawUrl);
      }
    } catch (err) {
      console.warn('Backend parse-maps-link failed, running fallback:', err);
      await parseCoordinatesFallback(rawUrl);
    } finally {
      setParsingMapsLink(false);
    }
  };

  const parseCoordinatesFallback = async (rawUrl) => {
    let lat = null;
    let lng = null;

    const dMatch = rawUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dMatch) {
      lat = parseFloat(dMatch[1]);
      lng = parseFloat(dMatch[2]);
    } else {
      const atMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        lat = parseFloat(atMatch[1]);
        lng = parseFloat(atMatch[2]);
      } else {
        const qMatch = rawUrl.match(/[?&]q=(-?\d+\.\d+)(?:%2c|%2C|,)(-?\d+\.\d+)/i);
        if (qMatch) {
          lat = parseFloat(qMatch[1]);
          lng = parseFloat(qMatch[2]);
        }
      }
    }

    if (lat && lng) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        const addr = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const city = data.address?.city || data.address?.town || data.address?.suburb || 'Hyderabad';
        const pin = data.address?.postcode || '500097';

        setSpotForm(p => ({
          ...p,
          googleMapsLink: rawUrl,
          lat,
          lng,
          address: addr,
          city,
          location: city,
          pincode: pin,
          title: p.title || `Parking at ${city}`,
        }));
        setMapsSuccessMsg('✅ Address, City & Pincode auto-filled!');
        setTimeout(() => setMapsSuccessMsg(''), 6000);
      } catch (e) {
        setSpotForm(p => ({
          ...p,
          googleMapsLink: rawUrl,
          lat,
          lng,
          address: p.address || `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        }));
        setMapsSuccessMsg('✅ Coordinates extracted from link!');
        setTimeout(() => setMapsSuccessMsg(''), 6000);
      }
    } else {
      alert('Could not auto-extract details from this link. Please enter address details manually or use GPS.');
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
        const hourly = Number(spotForm.pricePerHour || 50);
        const daily = spotForm.pricePerDay ? Number(spotForm.pricePerDay) : Math.round(hourly * 8);
        const monthly = spotForm.pricePerMonth ? Number(spotForm.pricePerMonth) : Math.round(hourly * 8 * 25);
        const slotsCount = Number(spotForm.totalSlots || 5);

        fd.append('pricePerHour', hourly);
        fd.append('hourlyRate', hourly);
        fd.append('totalSlots', slotsCount);
        fd.append('totalSpots', slotsCount);
        fd.append('pricePerDay', daily);
        fd.append('pricePerWeek', Number(spotForm.pricePerWeek || (hourly * 8 * 6)));
        fd.append('pricePerMonth', monthly);
      }

      fd.append('maxWalletDiscount', Number(spotForm.maxWalletDiscount ?? 10));
      fd.append('cancellationPolicy', 'full');
      fd.append('isActive', spotForm.isActive !== false);
      fd.append('hasEvCharger', user?.accountCategory === 'vehicle_storage_owner' ? false : spotForm.hasEvCharger);
      fd.append('hasCctv', spotForm.hasCctv);
      fd.append('isCovered', spotForm.isCovered);
      fd.append('lat', spotForm.lat);
      fd.append('lng', spotForm.lng);
      fd.append('pincode', spotForm.pincode || '500097');
      fd.append('googleMapsLink', spotForm.googleMapsLink || '');
      fd.append('locationLink', spotForm.googleMapsLink || '');
      fd.append('suitableVehicles', JSON.stringify(spotForm.suitableVehicles));
      
      if (spotForm.images && spotForm.images.length > 0) {
        fd.append('images', JSON.stringify(spotForm.images));
        fd.append('imageUrl', spotForm.images[0]);
      } else if (spotForm.imageUrl) {
        fd.append('imageUrl', spotForm.imageUrl);
      }
      if (spotForm.imageFile) {
        fd.append('imageFile', spotForm.imageFile);
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
        setSpotForm(getEmptySpotForm());
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

  // Filter bookings for Orders view (Matches Owner Mobile App 1:1)
  const filteredBookings = bookings.filter((b) => {
    const isCancelled = b.status === 'cancelled';
    const isCompleted = b.status === 'completed';
    const isCheckedIn = !isCancelled && !isCompleted && (Boolean(b.isCheckedIn) || b.status === 'checked_in');
    const isPaid = !isCancelled && (b.paymentStatus === 'paid' || b.status === 'paid' || isCheckedIn || isCompleted);

    if (orderFilter === 'paid') return isPaid;
    if (orderFilter === 'pending') return isCancelled || !isPaid;
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
                onClick={handleStartAddSpot}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" /> List New Spot
              </button>
            </div>

            {/* 3 Metric Cards matching Mobile App 1:1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Earnings / Wallet Card */}
              <div
                onClick={() => setCurrentView('wallet')}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-6 shadow-sm cursor-pointer transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                    ₹{Number(walletData?.walletBalance !== undefined ? walletData.walletBalance : totalEarnings).toFixed(2).replace(/\.00$/, '')}
                  </p>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1 group-hover:bg-emerald-100 transition-colors">
                    <Wallet className="h-3 w-3" /> Wallet →
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 group-hover:text-emerald-700 transition-colors">
                  Wallet Balance (Available Payout)
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

            {/* Add Spot Promo Banner */}
            <div className="w-full">
              <div
                onClick={handleStartAddSpot}
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
            </div>

            {/* My Parking Spots Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">My Parking Listings</h2>
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
                    onClick={handleStartAddSpot}
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
                                Monthly: <span className="text-amber-600 font-black">₹{spot.monthlyStorageRate || 1500}/car</span> • {spotSlots} slots
                              </p>
                            ) : (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-bold text-slate-700">
                                  Hourly: <span className="text-blue-600 font-extrabold">₹{spotRate}/hr</span> • Daily: <span className="text-emerald-600 font-extrabold">₹{spot.pricePerDay || (spotRate * 8)}/day</span> • Monthly: <span className="text-purple-600 font-extrabold">₹{spot.pricePerMonth || (spotRate * 8 * 25)}/mo</span>
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  Capacity: <span className="font-extrabold text-slate-800">{spotSlots} Slots</span> {spot.hasEvCharger ? '• ⚡ EV Available' : ''}
                                </p>
                              </div>
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
                { id: 'paid', label: `Paid & Active (${bookings.filter(b => b.status !== 'cancelled' && (b.paymentStatus === 'paid' || b.status === 'paid' || b.status === 'checked_in' || b.status === 'completed')).length})` },
                { id: 'pending', label: `Failed / Cancelled (${bookings.filter(b => b.status === 'cancelled' || (b.paymentStatus !== 'paid' && b.status !== 'paid' && b.status !== 'checked_in' && b.status !== 'completed')).length})` },
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

            {/* Bookings List Cards (Matching Owner Mobile App 1:1) */}
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Loading booking orders...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2">
                <p className="text-4xl">📭</p>
                <h3 className="font-extrabold text-slate-800 text-base">No booking orders found</h3>
                <p className="text-xs text-slate-400">
                  {orderFilter === 'all'
                    ? 'When seekers book your parking spots, their orders and payments will show here in real time.'
                    : 'No bookings match this filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredBookings.map(item => {
                  const isCancelled = item.status === 'cancelled';
                  const isCompleted = item.status === 'completed';
                  const isCheckedIn = !isCancelled && !isCompleted && (Boolean(item.isCheckedIn) || item.status === 'checked_in');
                  const isPaid = !isCancelled && (item.paymentStatus === 'paid' || item.status === 'paid' || isCheckedIn || isCompleted);
                  const space = item.spaceId;
                  const slot = item.slotId || 'Slot-1';
                  const amount = item.totalAmount || 0;
                  const myShare = item.ownerEarnings !== undefined && item.ownerEarnings !== null ? item.ownerEarnings : (isPaid ? Math.round(amount * 0.9) : 0);
                  const seekerName = item.seekerName || item.seekerId?.name || 'Seeker';
                  const seekerPhone = item.seekerContact || item.seekerId?.contact || '';

                  let badgeText = '🔴 FAILED';
                  let badgeClass = 'bg-rose-50 text-rose-600 border-rose-200';

                  if (isCancelled) {
                    badgeText = '🚫 CANCELLED';
                    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                  } else if (isCompleted) {
                    badgeText = '✓ COMPLETED';
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
                  } else if (isCheckedIn) {
                    badgeText = '🟢 CHECKED-IN';
                    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-black shadow-xs animate-pulse';
                  } else if (isPaid) {
                    badgeText = '🎟️ ALLOTTED (PAID)';
                    badgeClass = 'bg-sky-50 text-sky-700 border-sky-300 font-bold';
                  }

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
                        <span className={`px-2.5 py-1 rounded-full text-xs border ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </div>

                      {/* Big Slot Highlight */}
                      <div className={`p-3.5 rounded-2xl border text-center ${
                        isCancelled
                          ? 'bg-slate-100 border-slate-200 text-slate-500'
                          : isCheckedIn
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                          : isPaid
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {isPaid || isCheckedIn ? 'YOUR ASSIGNED SLOT' : 'RESERVATION STATUS'}
                        </p>
                        <p className="text-lg font-black font-mono mt-0.5">
                          {isPaid || isCheckedIn ? `🅿️ ${slot}` : item.status.toUpperCase()}
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

                      {/* Details Grid (Matches Owner Mobile App 4-Item Grid 1:1) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">🚗 Vehicle</p>
                          <p className="font-mono font-extrabold text-slate-900 mt-0.5 uppercase truncate">{item.vehicleNumber || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">👤 Seeker Name</p>
                          <p className="font-extrabold text-slate-900 mt-0.5 truncate">{seekerName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">⏱️ Duration</p>
                          <p className="font-extrabold text-slate-900 mt-0.5">{item.hours || 1} Hour(s)</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">💰 Your Payout</p>
                          <p className={`font-black mt-0.5 ${isCancelled ? (myShare > 0 ? 'text-amber-600' : 'text-slate-400') : 'text-emerald-600'}`}>
                            ₹{isCancelled ? (myShare > 0 ? `${myShare} (Retained)` : '0.00 (Refunded)') : myShare}
                          </p>
                        </div>
                      </div>

                      {/* Check-In / Timer Running Live Status Information */}
                      {isCheckedIn && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2 font-bold text-emerald-800">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            🚗 Vehicle Parked &amp; Timer Running
                          </span>
                          {item.checkInTime && (
                            <span className="text-slate-500 font-medium text-[11px]">
                              In: {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Cancelled Banner with Refund Details */}
                      {isCancelled && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-rose-700">
                            🚫 Order Cancelled • Slot Released
                          </span>
                          {item.refundAmount > 0 && (
                            <span className="text-slate-500 font-medium text-[11px]">
                              Refunded to Seeker: ₹{item.refundAmount}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Departure Banner */}
                      {isCompleted && item.checkOutTime && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-3.5 py-2 text-xs font-semibold">
                          👋 Departed at {new Date(item.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Slot Available
                        </div>
                      )}

                      {/* Action Buttons & Timestamp */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400">
                          📅 {new Date(item.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex flex-wrap items-center gap-2 ml-auto">
                          {/* Manual Check-In by Owner */}
                          {isPaid && !isCheckedIn && !isCompleted && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleOwnerCheckIn(item._id, item.vehicleNumber)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
                              title="Check in this vehicle and start dynamic timer"
                            >
                              🅿️ Check In
                            </button>
                          )}

                          {/* Manual Check-Out by Owner */}
                          {isCheckedIn && !isCompleted && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleOwnerCheckOut(item._id, item.vehicleNumber, slot)}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
                              title="Check out this vehicle and free up the slot"
                            >
                              🚪 Check Out
                            </button>
                          )}

                          {seekerPhone ? (
                            <a
                              href={`tel:${seekerPhone}`}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                            >
                              <Phone className="h-3.5 w-3.5" /> Call ({seekerPhone})
                            </a>
                          ) : null}

                          <button
                            onClick={() => handleDeleteBooking(item._id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Delete booking order"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── VIEW: OWNER WALLET & PAYOUTS (MATCHES OWNER MOBILE APP 1:1) ──── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentView === 'wallet' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-16">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className="h-10 w-10 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-xs font-bold"
                  title="Back to Dashboard"
                >
                  ←
                </button>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    Host Wallet &amp; Payouts <span className="text-xl">💰</span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Track live booking earnings, submit withdrawal requests, and monitor bank transfer receipts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchWalletData}
                disabled={walletLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${walletLoading ? 'animate-spin text-emerald-600' : ''}`} />
                {walletLoading ? 'Refreshing...' : 'Refresh Wallet'}
              </button>
            </div>

            {/* ── Main Hero Card: Live Wallet Balance ── */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-emerald-300 text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" /> Available Wallet Balance
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      {100 - (walletData.platformCommissionRate || 15)}% Net Host Share
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-2">
                    <p className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${Number(walletData.walletBalance || 0) < 0 ? 'text-rose-400' : 'text-white'}`}>
                      ₹{Number(walletData.walletBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {Number(walletData.walletBalance || 0) < 0 && (
                    <div className="inline-flex items-center gap-2 mt-3 bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 rounded-xl text-rose-200 text-xs font-bold">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      Negative Balance: Debited for cancellation refund adjustment. Future earnings will automatically reconcile this balance.
                    </div>
                  )}

                  {walletData.pendingWithdrawal > 0 && (
                    <div className="inline-flex items-center gap-2 mt-3 bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 rounded-xl text-amber-200 text-xs font-bold">
                      <Clock className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                      ₹{Number(walletData.pendingWithdrawal).toLocaleString('en-IN', { maximumFractionDigits: 2 })} in pending withdrawal awaiting Admin settlement
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-3 font-medium max-w-xl">
                    {walletData.pendingWithdrawal > 0
                      ? `Available to withdraw immediately: ₹${Number(walletData.availableBalance !== undefined ? walletData.availableBalance : Math.max(0, (walletData.walletBalance || 0) - walletData.pendingWithdrawal)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}. Net earnings credited automatically upon booking verification.`
                      : `Net booking revenues are automatically credited to your wallet balance after the ${walletData.platformCommissionRate || 15}% platform commission deduction.`}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const available = walletData.availableBalance !== undefined
                        ? walletData.availableBalance
                        : Math.max(0, (walletData.walletBalance || 0) - (walletData.pendingWithdrawal || 0));
                      if ((walletData.walletBalance || 0) <= 0) {
                        alert('You currently have ₹0 wallet balance to withdraw.');
                        return;
                      }
                      setWithdrawAmount(available > 0 ? String(available) : '');
                      setShowWithdrawModal(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    <DollarSign className="h-4 w-4" /> Request Withdrawal
                  </button>
                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    Min limit: ₹{walletData.minWithdrawalAmount || 2000}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Quick Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Gross Bookings</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                  ₹{Number(walletData.totalGrossEarned || 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Cumulative space earnings</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transferred / Paid</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-1">
                  ₹{Number(walletData.totalWithdrawn || 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">Successfully disbursed to bank</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Payouts</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-600 font-mono mt-1">
                  ₹{Number(walletData.pendingWithdrawal || 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-amber-600 font-medium mt-1">Under review by system admin</p>
              </div>
            </div>

            {/* ── Section Navigation Tabs (Withdrawal Requests vs Wallet Ledger) ── */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setWalletTab('payouts')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      walletTab === 'payouts'
                        ? 'bg-white text-slate-900 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Withdrawal Requests ({walletData.payoutRequests?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletTab('ledger')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      walletTab === 'ledger'
                        ? 'bg-white text-slate-900 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Wallet History &amp; Ledger ({walletData.transactions?.length || 0})
                  </button>
                </div>
              </div>

              {/* TAB 1: WITHDRAWAL REQUESTS */}
              {walletTab === 'payouts' && (
                <div className="divide-y divide-slate-100">
                  {(!walletData.payoutRequests || walletData.payoutRequests.length === 0) ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <p className="text-3xl">💳</p>
                      <p className="text-sm font-bold text-slate-700">No Withdrawal Requests Yet</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        When you request a payout, your settlement status, payment method, and transfer receipt proof will be listed here.
                      </p>
                    </div>
                  ) : (
                    walletData.payoutRequests.map((pr) => {
                      const isApproved = pr.status === 'approved';
                      const isPending = pr.status === 'pending';
                      const isRejected = pr.status === 'rejected';

                      return (
                        <div key={pr._id} className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-400">
                                #{pr._id.toString().slice(-6).toUpperCase()}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                isApproved
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {isApproved && '✓ Transferred'}
                                {isPending && '⏳ Pending Admin Approval'}
                                {isRejected && '✕ Rejected'}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-lg">
                                {pr.payoutMethod?.toUpperCase() || 'UPI'}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-slate-700">
                              {pr.payoutMethod === 'upi' ? (
                                <span>UPI ID: <strong className="font-mono text-slate-900">{pr.payoutDetails?.upiId || 'Not specified'}</strong></span>
                              ) : (
                                <span>
                                  Bank: <strong className="text-slate-900">{pr.payoutDetails?.bankName || 'Bank'}</strong> • A/C: <strong className="font-mono text-slate-900">{pr.payoutDetails?.accountNumber}</strong> ({pr.payoutDetails?.accountName}) • IFSC: <span className="font-mono">{pr.payoutDetails?.ifscCode}</span>
                                </span>
                              )}
                            </p>

                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span>Requested: {new Date(pr.requestedAt || pr.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              {pr.processedAt && (
                                <span>• Processed: {new Date(pr.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              )}
                              {pr.transactionReference && (
                                <span className="font-mono text-slate-600 font-bold">• Ref: {pr.transactionReference}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                            <div className="text-right">
                              <p className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                                ₹{Number(pr.amount || 0).toFixed(2)}
                              </p>
                            </div>

                            {pr.adminReceiptImage && (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptModal(getImageUrl(pr.adminReceiptImage))}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <FileText className="h-3.5 w-3.5" /> View Receipt Proof
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: WALLET HISTORY & TRANSACTION LEDGER */}
              {walletTab === 'ledger' && (
                <div className="divide-y divide-slate-100">
                  {(!walletData.transactions || walletData.transactions.length === 0) ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <p className="text-3xl">📑</p>
                      <p className="text-sm font-bold text-slate-700">No Transactions Yet</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Your booking earnings credits, withdrawal debits, and platform fees will appear here in chronological order.
                      </p>
                    </div>
                  ) : (
                    walletData.transactions.map((tx, idx) => {
                      const isCredit = tx.type === 'credit';
                      return (
                        <div key={tx._id || idx} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                              isCredit
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>
                              {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                                {tx.description || (isCredit ? 'Booking Net Revenue Credit' : 'Withdrawal Request Settlement')}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>{new Date(tx.date || tx.createdAt || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                {tx.status && (
                                  <span className={`px-2 py-0.2 rounded font-bold uppercase text-[9px] ${
                                    tx.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {tx.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-base sm:text-lg font-black font-mono ${
                              isCredit ? 'text-emerald-600' : 'text-slate-900'
                            }`}>
                              {isCredit ? '+' : '-'}₹{Number(tx.amount || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
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
                  onChange={e => {
                    const val = e.target.value;
                    const trimmed = val.trim();
                    if (trimmed.includes('maps.google.') || trimmed.includes('goo.gl') || trimmed.includes('google.com/maps')) {
                      setSpotForm(p => ({ ...p, googleMapsLink: trimmed }));
                      handleParseMapsLink(trimmed);
                    } else {
                      setSpotForm(p => ({ ...p, address: val }));
                    }
                  }}
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
                      placeholder="e.g. Hyderabad"
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
                      placeholder="e.g. 500097"
                      value={spotForm.pincode}
                      onChange={e => setSpotForm(p => ({ ...p, pincode: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Google Maps Link (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    Google Maps Link (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleParseMapsLink(spotForm.googleMapsLink)}
                    disabled={parsingMapsLink || !spotForm.googleMapsLink.trim()}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-extrabold text-xs px-3 py-1 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {parsingMapsLink ? (
                      <>
                        <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span>Auto-Filling...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Auto-Fill Details</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Paste Google Maps URL here (e.g. https://maps.google.com/?q=...)"
                  value={spotForm.googleMapsLink}
                  onChange={e => {
                    const val = e.target.value;
                    setSpotForm(p => ({ ...p, googleMapsLink: val }));
                    const trimmed = val.trim();
                    if (trimmed.includes('maps.google.') || trimmed.includes('goo.gl') || trimmed.includes('google.com/maps') || trimmed.includes('/maps?q=')) {
                      handleParseMapsLink(trimmed);
                    }
                  }}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                {mapsSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <span className="text-base">📍</span>
                    <span>{mapsSuccessMsg}</span>
                  </div>
                )}
                {parsingMapsLink && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Resolving address, city and coordinates from Google Maps...</span>
                  </div>
                )}
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
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">Hourly Rate (₹)</label>
                      <input
                        type="number"
                        required
                        min={5}
                        placeholder="e.g. 50"
                        value={spotForm.pricePerHour}
                        onChange={e => {
                          const val = e.target.value;
                          setSpotForm(p => {
                            const num = Number(val);
                            const updates = { pricePerHour: val };
                            if (!p.pricePerDay || p.pricePerDay === String(Math.round(Number(p.pricePerHour || 0) * 8))) {
                              updates.pricePerDay = val ? String(Math.round(num * 8)) : '';
                            }
                            if (!p.pricePerMonth || p.pricePerMonth === String(Math.round(Number(p.pricePerHour || 0) * 8 * 25))) {
                              updates.pricePerMonth = val ? String(Math.round(num * 8 * 25)) : '';
                            }
                            return { ...p, ...updates };
                          });
                        }}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">Total Capacity (Slots)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={100}
                        placeholder="e.g. 5"
                        value={spotForm.totalSlots}
                        onChange={e => setSpotForm(p => ({ ...p, totalSlots: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Daily & Monthly Tier Pricing Inputs (Matching Owner App 1:1) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">Daily Rate (₹/day)</label>
                      <input
                        type="number"
                        min={10}
                        placeholder="e.g. 400"
                        value={spotForm.pricePerDay}
                        onChange={e => setSpotForm(p => ({ ...p, pricePerDay: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                      <p className="text-[11px] text-slate-400 font-semibold">24-hour flat booking</p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider">Monthly Rate (₹/mo)</label>
                      <input
                        type="number"
                        min={100}
                        placeholder="e.g. 6000"
                        value={spotForm.pricePerMonth}
                        onChange={e => setSpotForm(p => ({ ...p, pricePerMonth: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                      <p className="text-[11px] text-slate-400 font-semibold">30-day monthly pass</p>
                    </div>
                  </div>
                </>
              )}

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
                    {(spotForm.suitableVehicles || []).length} of 4 Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      id: '2-wheeler',
                      title: '2-Wheeler',
                      icon: '🏍️',
                      subtitle: 'Bikes & Scooters',
                      examples: 'Activa, Pulsar, Splendor',
                    },
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

              {/* 9. EV Charger Facility Switch Toggle (Hidden for Vehicle Storage Yards) */}
              {user?.accountCategory !== 'vehicle_storage_owner' && (
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
              )}

              {/* Spot Availability Status Switch Toggle (When Editing Spot) */}
              {editingSpot && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      🟢 Spot Availability Status
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Is this spot open &amp; accepting seeker bookings?
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSpotForm(p => ({ ...p, isActive: !p.isActive }))}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        spotForm.isActive !== false ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          spotForm.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-extrabold uppercase ${spotForm.isActive !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {spotForm.isActive !== false ? 'ONLINE' : 'CLOSED'}
                    </span>
                  </div>
                </div>
              )}

              {/* 10. Multi-Photo Upload Section (Matching Mobile App Experience) */}
              <div className="space-y-3 pt-4 border-t border-slate-200/80 md:col-span-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📸</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        {spotForm.spaceCategory === 'commercial_vehicle_storage' ? '1+ Acre Land & Yard Photos' : 'Parking Spot Photos & Cover Image'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Upload clear photos of your parking space, gate, entrance, and driveway (up to 8 photos).
                      </p>
                    </div>
                  </div>
                  {(spotForm.images || []).length > 0 ? (
                    <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                      ✓ {(spotForm.images || []).length} Photo{(spotForm.images || []).length > 1 ? 's' : ''} Added
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Up to 8 photos</span>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={spotFileInputRef}
                  multiple
                  accept="image/*"
                  onChange={handleSpotImageUpload}
                  className="hidden"
                />

                {/* Upload Drop Zone / Button */}
                <div
                  onClick={() => spotFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 text-center transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-xs border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 transition-colors">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800 group-hover:text-emerald-700">
                    Click to Browse Photos or Drag &amp; Drop here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PNG, JPG, JPEG, WEBP (Select multiple photos at once)
                  </p>
                </div>

                {/* Photos Preview Gallery */}
                {(spotForm.images || []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                        Uploaded Photos (First photo is Primary Cover):
                      </p>
                      <button
                        type="button"
                        onClick={() => setSpotForm(p => ({ ...p, images: [], imageUrl: '', imageFile: null }))}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        Remove All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                      {(spotForm.images || []).map((imgUri, idx) => {
                        const displayUrl = typeof imgUri === 'string' && imgUri.startsWith('data:')
                          ? imgUri
                          : (getImageUrl ? getImageUrl(imgUri) : imgUri);

                        return (
                          <div
                            key={idx}
                            className={`relative rounded-2xl overflow-hidden aspect-4/3 border-2 bg-slate-900 group shadow-sm transition-all ${
                              idx === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <img
                              src={displayUrl}
                              alt={`Spot ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800';
                              }}
                            />

                            {/* Cover Badge or Make Cover Action */}
                            {idx === 0 ? (
                              <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                                ⭐ Primary Cover
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetPrimaryCover(idx);
                                }}
                                className="absolute bottom-2 left-2 bg-slate-900/85 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow transition-colors cursor-pointer"
                              >
                                Set as Cover
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSpotImage(idx);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-black shadow transition-transform hover:scale-110 cursor-pointer"
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}

                      {/* Add more slot button if under 8 photos */}
                      {(spotForm.images || []).length < 8 && (
                        <div
                          onClick={() => spotFileInputRef.current?.click()}
                          className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 aspect-4/3 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-600 transition-all cursor-pointer group"
                        >
                          <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold">Add More</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                <button
                  type="button"
                  onClick={() => setShowSupportDeskModal(true)}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-slate-800 font-extrabold text-sm transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">📞 24/7 Owner Support Desk</span>
                  <span className="text-indigo-600 text-xs font-bold">Contact →</span>
                </button>
                <Link
                  to="/terms"
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-slate-800 font-extrabold text-sm transition-colors block"
                >
                  <span className="flex items-center gap-2">🏢 Terms &amp; Conditions for Space Owner</span>
                  <span className="text-indigo-600 text-xs font-bold">30 Clauses →</span>
                </Link>
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

        {/* ── 24/7 OWNER SUPPORT DESK MODAL ── */}
        {showSupportDeskModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowSupportDeskModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>

              <div className="mb-4">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  LIVE 24/7 HELPDESK
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">📞 24/7 Owner Support Desk</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official PlanToPark Support • Immediate assistance for space listings &amp; yard operations.
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <a
                  href={`tel:${(supportContacts.storageYardSupportPhone || supportContacts.ownerSupportPhone || supportContacts.supportPhone || '+918919360467').replace(/[^\d+]/g, '')}`}
                  className="flex items-center justify-between p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-blue-900 font-bold text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📞</span>
                    <div>
                      <div className="text-[10px] text-blue-600 uppercase font-extrabold">Call Official Phone</div>
                      <div className="text-sm font-black">{supportContacts.storageYardSupportPhone || supportContacts.ownerSupportPhone || supportContacts.supportPhone || '+91 8919360467'}</div>
                    </div>
                  </div>
                  <span className="text-blue-600 font-black">Call →</span>
                </a>

                <a
                  href={`https://wa.me/${(supportContacts.supportWhatsapp || supportContacts.supportPhone || '918919360467').replace(/[^\d]/g, '')}?text=Hello%20PlanToPark%20Support%2C%20I%20am%20a%20host%20requesting%20assistance.`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-emerald-900 font-bold text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💬</span>
                    <div>
                      <div className="text-[10px] text-emerald-600 uppercase font-extrabold">Chat on WhatsApp</div>
                      <div className="text-sm font-black">{supportContacts.supportWhatsapp || supportContacts.supportPhone || '+91 8919360467'}</div>
                    </div>
                  </div>
                  <span className="text-emerald-600 font-black">Chat →</span>
                </a>

                <a
                  href={`mailto:${supportContacts.storageYardSupportEmail || supportContacts.ownerSupportEmail || supportContacts.supportEmail || 'plantopark@gmail.com'}?subject=Host%20Support%20Request`}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-800 font-bold text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">✉️</span>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-extrabold">Support Email</div>
                      <div className="text-sm font-black">{supportContacts.storageYardSupportEmail || supportContacts.ownerSupportEmail || supportContacts.supportEmail || 'plantopark@gmail.com'}</div>
                    </div>
                  </div>
                  <span className="text-slate-600 font-black">Email →</span>
                </a>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 text-center font-medium border border-slate-100">
                ⏱️ <strong>Operating Hours:</strong> {supportContacts.supportHours || '24/7 Dedicated Support Desk'}
              </div>
            </div>
          </div>
        )}
        {/* ── WITHDRAWAL REQUEST MODAL ── */}
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative text-left my-8 border border-slate-100">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 mb-1">Request Balance Withdrawal</h3>
              <p className="text-slate-500 text-xs mb-5">
                Withdraw your available earnings directly to your bank account or UPI ID. Platform settlements are processed by Admin with official transfer proof.
              </p>

              {/* Balance Summary Box */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between mb-5">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Available to Withdraw</span>
                  <span className="text-2xl font-black text-emerald-950 font-mono">
                    ₹{Number(walletData.availableBalance !== undefined ? walletData.availableBalance : Math.max(0, (walletData.walletBalance || 0) - (walletData.pendingWithdrawal || 0))).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Min Withdrawal</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">₹{walletData.minWithdrawalAmount || 2000}</span>
                </div>
              </div>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Withdrawal Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`e.g. ${walletData.minWithdrawalAmount || 2000}`}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-base font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      const avail = walletData.availableBalance !== undefined
                        ? walletData.availableBalance
                        : Math.max(0, (walletData.walletBalance || 0) - (walletData.pendingWithdrawal || 0));
                      const presets = [avail, 500, 1000, 2000].filter(v => v > 0);
                      const uniquePresets = Array.from(new Set(presets));
                      return uniquePresets.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setWithdrawAmount(String(val))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            withdrawAmount === String(val)
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val === avail ? `Full (₹${val})` : `₹${val}`}
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Method Switcher */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Disbursement Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('upi')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        withdrawMethod === 'upi'
                          ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode className="h-4 w-4" /> Instant UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('bank')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        withdrawMethod === 'bank'
                          ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Landmark className="h-4 w-4" /> Bank Account
                    </button>
                  </div>
                </div>

                {withdrawMethod === 'upi' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Your UPI ID
                    </label>
                    <input
                      type="text"
                      required
                      value={withdrawUpiId}
                      onChange={(e) => setWithdrawUpiId(e.target.value)}
                      placeholder="e.g. mobile@okhdfcbank or user@paytm"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        required
                        value={withdrawAccountName}
                        onChange={(e) => setWithdrawAccountName(e.target.value)}
                        placeholder="Name as per Bank records"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Bank Name</label>
                      <input
                        type="text"
                        required
                        value={withdrawBankName}
                        onChange={(e) => setWithdrawBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank, SBI, ICICI"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Account Number</label>
                        <input
                          type="text"
                          required
                          value={withdrawAccountNumber}
                          onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                          placeholder="Account Number"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">IFSC Code</label>
                        <input
                          type="text"
                          required
                          value={withdrawIfscCode}
                          onChange={(e) => setWithdrawIfscCode(e.target.value.toUpperCase())}
                          placeholder="e.g. HDFC0001234"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium uppercase focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional QR upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    UPI QR Code Screenshot (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setWithdrawQrFile(file);
                        setWithdrawQrPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {withdrawQrPreview && (
                    <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                      <img src={withdrawQrPreview} alt="QR Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingWithdrawal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl text-sm shadow transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submittingWithdrawal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                        Submitting Withdrawal...
                      </>
                    ) : (
                      'Confirm & Request Withdrawal'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── VIEW RECEIPT PROOF MODAL ── */}
        {viewingReceiptModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 relative text-left my-8 border border-slate-100">
              <button
                type="button"
                onClick={() => setViewingReceiptModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">Admin Transfer Proof Receipt</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Official bank transfer or payment confirmation attached by Admin.</p>

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center max-h-[70vh]">
                <img
                  src={viewingReceiptModal}
                  alt="Admin Transfer Receipt Proof"
                  className="w-full h-auto max-h-[68vh] object-contain rounded-2xl"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <a
                  href={viewingReceiptModal}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Open Full Image ↗
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OwnerDashboard;
