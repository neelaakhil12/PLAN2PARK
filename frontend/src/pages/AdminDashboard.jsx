import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Users, MapPin, Car, DollarSign, TrendingUp, UserCheck,
  UserX, CheckCircle, XCircle, Activity, Layers, BarChart3,
  Bell, ChevronDown, Calendar, Search, LogOut, Settings,
  AlertTriangle, ShieldAlert, Heart, ClipboardList, HelpCircle, Star, MessageSquare,
  Menu, X, Send, Tag, Sparkles, Megaphone, FileText, Edit2, Trash2, Plus,
  Percent, Upload, Eye, Landmark, Smartphone, Check, ExternalLink
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
  const [spacesTab, setSpacesTab] = useState('all');
  const [spacesSearch, setSpacesSearch] = useState('');
  const [usersTab, setUsersTab] = useState('all');
  const [usersSearch, setUsersSearch] = useState('');
  const [overviewDirTab, setOverviewDirTab] = useState('spaces');
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotPrefixes, setSlotPrefixes] = useState({});
  const [resolvingId, setResolvingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);
  const [selectedOwnerForDetail, setSelectedOwnerForDetail] = useState(null);
  const [selectedStorageOwnerForDetail, setSelectedStorageOwnerForDetail] = useState(null);
  const [selectedSeekerForDetail, setSelectedSeekerForDetail] = useState(null);
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

  // ── Wallet & Payout Management States ──
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [commissionInput, setCommissionInput] = useState('10');
  const [savingCommission, setSavingCommission] = useState(false);
  const [approvingPayout, setApprovingPayout] = useState(null);
  const [payoutReceiptFile, setPayoutReceiptFile] = useState(null);
  const [payoutReceiptPreview, setPayoutReceiptPreview] = useState('');
  const [payoutUtr, setPayoutUtr] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState(null);
  const [payoutsFilter, setPayoutsFilter] = useState('all');

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

  const [terms, setTerms] = useState([]);
  const [termsType, setTermsType] = useState('owner');
  const [editingTerm, setEditingTerm] = useState(null);
  const [termClauseInput, setTermClauseInput] = useState('');
  const [termOrderInput, setTermOrderInput] = useState(1);
  const [termSearchQuery, setTermSearchQuery] = useState('');
  const [termLoading, setTermLoading] = useState(false);
  const [showAddTermModal, setShowAddTermModal] = useState(false);

  const fetchTerms = async () => {
    try {
      const res = await fetch(`${API_URL}/terms/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTerms(await res.json());
      }
    } catch (e) {
      console.error('Fetch terms error:', e);
    }
  };

  const handleSaveTerm = async (e) => {
    e.preventDefault();
    if (!termClauseInput.trim()) return;
    setTermLoading(true);
    try {
      if (editingTerm) {
        const res = await fetch(`${API_URL}/terms/admin/${editingTerm._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            clause: termClauseInput.trim(),
            order: termOrderInput,
            type: termsType,
          })
        });
        if (res.ok) {
          const updated = await res.json();
          setTerms(prev => prev.map(t => t._id === updated._id ? updated : t));
          setEditingTerm(null);
          setTermClauseInput('');
          setShowAddTermModal(false);
        }
      } else {
        const res = await fetch(`${API_URL}/terms/admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            clause: termClauseInput.trim(),
            order: termOrderInput,
            type: termsType,
          })
        });
        if (res.ok) {
          const created = await res.json();
          setTerms(prev => [...prev, created]);
          setTermClauseInput('');
          setShowAddTermModal(false);
        }
      }
    } catch (err) {
      alert('Error saving term: ' + err.message);
    } finally {
      setTermLoading(false);
    }
  };

  const handleDeleteTerm = async (id) => {
    if (!window.confirm('Are you sure you want to delete this term clause?')) return;
    try {
      const res = await fetch(`${API_URL}/terms/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTerms(prev => prev.filter(t => t._id !== id));
      }
    } catch (err) {
      alert('Delete term error: ' + err.message);
    }
  };

  const handleToggleTermActive = async (term) => {
    try {
      const res = await fetch(`${API_URL}/terms/admin/${term._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !term.isActive })
      });
      if (res.ok) {
        const updated = await res.json();
        setTerms(prev => prev.map(t => t._id === updated._id ? updated : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [rAnal, rUsers, rSpaces, rBookings, rComplaints, rReviews, rTerms] = await Promise.all([
        fetch(`${API_URL}/analytics/admin`, { headers }),
        fetch(`${API_URL}/auth/admin/users`, { headers }),
        fetch(`${API_URL}/spaces/admin/all`, { headers }),
        fetch(`${API_URL}/bookings/admin-bookings`, { headers }), // lists bookings
        fetch(`${API_URL}/complaints`, { headers }),
        fetch(`${API_URL}/reviews`, { headers }),
        fetch(`${API_URL}/terms/admin/all`, { headers }),
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
      } else {
        try {
          const rFb = await fetch(`${API_URL}/spaces?includeInactive=true`, { headers });
          if (rFb.ok) {
            const data = await rFb.json();
            setSpaces(data);
            spaceList = data;
          }
        } catch (e) {}
      }
      if (rBookings.ok) {
        const data = await rBookings.json();
        setBookings(data);
        bookingList = data;
      }
      if (rComplaints.ok) setComplaints(await rComplaints.json());
      if (rReviews.ok) setReviews(await rReviews.json());
      if (rTerms && rTerms.ok) setTerms(await rTerms.json());

      // Fetch wallet payouts & commission
      try {
        const [rPayouts, rComm] = await Promise.all([
          fetch(`${API_URL}/wallet/admin/requests`, { headers }),
          fetch(`${API_URL}/wallet/admin/commission`, { headers }),
        ]);
        if (rPayouts.ok) {
          const pData = await rPayouts.json();
          setPayoutRequests(pData.requests || []);
        }
        if (rComm.ok) {
          const cData = await rComm.json();
          setCommissionRate(cData.commissionPercentage || 10);
          setCommissionInput(String(cData.commissionPercentage || 10));
        }
      } catch (e) {}

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

  const handleToggleSpaceActive = async (spaceId, currentActive) => {
    try {
      const res = await fetch(`${API_URL}/spaces/admin/toggle/${spaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (res.ok) {
        setSpaces(prev => prev.map(s => s._id === spaceId ? { ...s, isActive: !currentActive } : s));
      } else {
        const res2 = await fetch(`${API_URL}/spaces/${spaceId}/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ isActive: !currentActive })
        });
        if (res2.ok) {
          setSpaces(prev => prev.map(s => s._id === spaceId ? { ...s, isActive: !currentActive } : s));
        }
      }
    } catch (e) {
      console.error('Toggle space error:', e);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName || 'User'}"? This action cannot be undone and will delete all their listings.`)) return;
    try {
      const res = await fetch(`${API_URL}/auth/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('User account deleted successfully.');
        setUsers(prev => prev.filter(u => u._id !== userId));
        setSpaces(prev => prev.filter(s => (s.ownerId?._id || s.ownerId) !== userId));
        if (selectedOwnerForDetail?._id === userId) setSelectedOwnerForDetail(null);
        if (selectedStorageOwnerForDetail?._id === userId) setSelectedStorageOwnerForDetail(null);
        if (selectedSeekerForDetail?._id === userId) setSelectedSeekerForDetail(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete user');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting user: ' + e.message);
    }
  };

  const handleDeleteSpace = async (spaceId, spaceTitle) => {
    if (!window.confirm(`Are you sure you want to delete parking space "${spaceTitle || 'Space'}"?`)) return;
    try {
      let res = await fetch(`${API_URL}/spaces/admin/${spaceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}/spaces/${spaceId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (res.ok) {
        alert('Parking space deleted successfully.');
        setSpaces(prev => prev.filter(s => s._id !== spaceId));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to delete parking space');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting space: ' + e.message);
    }
  };

  useEffect(() => {
    setSelectedOwnerForDetail(null);
    setSelectedStorageOwnerForDetail(null);
    setSelectedSeekerForDetail(null);
  }, [currentView]);

  const handleResolveComplaint = async (id) => {
    const res = await fetch(`${API_URL}/complaints/${id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reply: replyText, status: 'resolved' }),
    });
    if (res.ok) { alert('Complaint ticket marked resolved.'); setResolvingId(null); setReplyText(''); fetchData(); }
  };

  const handleSaveCommission = async (e) => {
    e.preventDefault();
    setSavingCommission(true);
    try {
      const res = await fetch(`${API_URL}/wallet/admin/commission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commissionPercentage: Number(commissionInput) }),
      });
      if (res.ok) {
        setCommissionRate(Number(commissionInput));
        alert(`Platform commission rate updated to ${commissionInput}% successfully!`);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update commission rate.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCommission(false);
    }
  };

  const handleApprovePayoutSubmit = async (e) => {
    e.preventDefault();
    if (!approvingPayout) return;
    setSubmittingApproval(true);
    try {
      const fd = new FormData();
      if (payoutUtr) fd.append('transactionReference', payoutUtr.trim());
      if (payoutNotes) fd.append('adminNotes', payoutNotes.trim());
      if (payoutReceiptFile) fd.append('receiptImage', payoutReceiptFile);

      const res = await fetch(`${API_URL}/wallet/admin/approve/${approvingPayout._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        alert('Payout request approved and marked paid successfully!');
        setApprovingPayout(null);
        setPayoutReceiptFile(null);
        setPayoutReceiptPreview('');
        setPayoutUtr('');
        setPayoutNotes('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to approve payout request.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleRejectPayout = async (requestId, ownerName, amount) => {
    const reason = window.prompt(`Please enter the rejection reason for ${ownerName}'s ₹${amount} withdrawal request:`, 'Bank details or UPI ID could not be verified.');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_URL}/wallet/admin/reject/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        alert('Payout request rejected. Funds refunded back to owner wallet.');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to reject payout request.');
      }
    } catch (err) {
      alert(err.message);
    }
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
    spaces: 'Parking Spaces Directory & Approvals',
    owners: '🏢 Space Owners & Listings',
    'storage-owners': '🚜 Vehicle Storage Land Owners & Yards',
    seekers: '🚗 Parking Seekers (Drivers & Commuters)',
    users: 'All Registered Platform Users',
    bookings: 'Platform Bookings',
    revenue: 'Revenue Reports & Ledger',
    payouts: '💸 Owner Withdrawals & Payout Requests',
    promotions: 'Promotional Offers & Push Broadcasts',
    terms: '📜 Terms & Conditions Management',
    complaints: 'Complaints',
    reviews: 'Support Reviews',
    notifications: 'Notifications',
  };

  const menuItems = [
    { id: 'overview', path: '/admin/dashboard', label: 'Dashboard Overview', icon: <Layers className="h-4.5 w-4.5" /> },
    { id: 'spaces', path: '/admin/spaces', label: '🅿️ Parking Spaces', icon: <MapPin className="h-4.5 w-4.5 text-indigo-400" /> },
    { id: 'owners', path: '/admin/owners', label: '🏢 Space Owners', icon: <UserCheck className="h-4.5 w-4.5 text-amber-400" /> },
    { id: 'storage-owners', path: '/admin/storage-owners', label: '🚜 Vehicle Storage Land Owners', icon: <MapPin className="h-4.5 w-4.5 text-emerald-400" /> },
    { id: 'seekers', path: '/admin/seekers', label: '🚗 Parking Seekers', icon: <Car className="h-4.5 w-4.5 text-blue-400" /> },
    { id: 'users', path: '/admin/users', label: '👥 Users Management', icon: <Users className="h-4.5 w-4.5 text-emerald-400" /> },
    { id: 'bookings', path: '/admin/bookings', label: 'Platform Bookings', icon: <ClipboardList className="h-4.5 w-4.5" /> },
    { id: 'revenue', path: '/admin/revenue', label: 'Revenue & Invoices', icon: <DollarSign className="h-4.5 w-4.5 text-emerald-400" /> },
    { id: 'payouts', path: '/admin/payouts', label: '💸 Owner Withdrawals', icon: <DollarSign className="h-4.5 w-4.5 text-amber-400" /> },
    { id: 'promotions', path: '/admin/promotions', label: '📢 Promotional Offers', icon: <Megaphone className="h-4.5 w-4.5 text-amber-400" /> },
    { id: 'terms', path: '/admin/terms', label: '📜 Terms & Conditions', icon: <FileText className="h-4.5 w-4.5 text-indigo-400" /> },
    { id: 'complaints', path: '/admin/complaints', label: 'Complaints', icon: <AlertTriangle className="h-4.5 w-4.5 text-rose-400" /> },
    { id: 'reviews', path: '/admin/reviews', label: 'Support Reviews', icon: <MessageSquare className="h-4.5 w-4.5 text-purple-400" /> },
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
              ? spaces.filter(s => s.status === 'pending').length
              : item.id === 'owners'
              ? users.filter(u => u.role === 'owner' && u.status === 'pending').length
              : item.id === 'seekers'
              ? users.filter(u => u.role === 'seeker' && u.status === 'pending').length
              : item.id === 'users'
              ? users.filter(u => u.status === 'pending').length
              : item.id === 'payouts'
              ? payoutRequests.filter(r => r.status === 'pending').length
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

                  {/* ── OVERVIEW DIRECTORY SHOWCASE: Parking Spaces, Parking Owners, Parking Seekers ── */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    {/* Header + Selector Tabs */}
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                          <Layers className="h-5 w-5 text-amber-500" />
                          Platform Marketplace Directory
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Direct live directory of all Parking Spaces, registered Parking Owners, and active Parking Seekers.
                        </p>
                      </div>

                      {/* Tab Buttons */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0">
                        <button
                          type="button"
                          onClick={() => setOverviewDirTab('spaces')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            overviewDirTab === 'spaces'
                              ? 'bg-white text-indigo-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Parking Spaces</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700">
                            {spaces.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOverviewDirTab('owners')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            overviewDirTab === 'owners'
                              ? 'bg-white text-amber-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Parking Owners</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-50 text-amber-700">
                            {users.filter(u => u.role === 'owner').length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOverviewDirTab('seekers')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            overviewDirTab === 'seekers'
                              ? 'bg-white text-blue-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Car className="h-3.5 w-3.5" />
                          <span>Parking Seekers</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700">
                            {users.filter(u => u.role === 'seeker').length}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Content Section 1: Parking Spaces */}
                    {overviewDirTab === 'spaces' && (
                      <div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold">
                              <tr>
                                <th className="px-6 py-3.5">Parking Spot</th>
                                <th className="px-6 py-3.5">Host / Owner</th>
                                <th className="px-6 py-3.5">Rate</th>
                                <th className="px-6 py-3.5">Capacity</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {spaces.length === 0 ? (
                                <tr>
                                  <td colSpan="6" className="text-center py-8 text-slate-400">
                                    No parking spaces found in database.
                                  </td>
                                </tr>
                              ) : (
                                spaces.map(sp => (
                                  <tr key={sp._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={sp.image || 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=200&q=80'}
                                          alt={sp.title || sp.address}
                                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=200&q=80'; }}
                                        />
                                        <div>
                                          <p className="font-bold text-slate-900 leading-snug">{sp.title || sp.address}</p>
                                          <p className="text-xs text-slate-400 truncate max-w-xs">{sp.address}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                              {sp.city || 'Hyderabad'}
                                            </span>
                                            {sp.hasEvCharger && (
                                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                                ⚡ EV Ready
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <p className="font-bold text-slate-800">{sp.ownerId?.name || 'Host'}</p>
                                      <p className="text-xs text-slate-400">{sp.ownerId?.email || sp.ownerId?.contact || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="font-black text-slate-900 text-sm">₹{sp.pricePerHour || 50}</span>
                                      <span className="text-xs text-slate-400">/hr</span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-xs">
                                        <span className="font-bold text-slate-800">{sp.totalSlots || 5}</span> slots
                                        {sp.availableSlots !== undefined && (
                                          <p className="text-[11px] text-emerald-600 font-bold">{sp.availableSlots} available</p>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col items-start gap-1">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                          sp.status === 'approved'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : sp.status === 'pending'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                                        }`}>
                                          {sp.status || 'approved'}
                                        </span>
                                        <span className={`text-[10px] font-bold ${sp.isActive !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
                                          {sp.isActive !== false ? '● Live' : '○ Offline'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {sp.locationLink && (
                                          <a
                                            href={sp.locationLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                          >
                                            <MapPin className="h-3 w-3" /> Map
                                          </a>
                                        )}
                                        <button
                                          onClick={() => handleToggleSpaceActive(sp._id, sp.isActive !== false)}
                                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            sp.isActive !== false
                                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                          }`}
                                        >
                                          {sp.isActive !== false ? 'Disable' : 'Activate'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            Showing all {spaces.length} parking spaces
                          </span>
                          <button
                            onClick={() => navigate('/admin/spaces')}
                            className="text-xs text-indigo-600 font-bold hover:underline"
                          >
                            Go to Parking Spaces Directory →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content Section 2: Parking Owners */}
                    {overviewDirTab === 'owners' && (
                      <div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold">
                              <tr>
                                <th className="px-6 py-3.5">Owner / Host</th>
                                <th className="px-6 py-3.5">Unique ID</th>
                                <th className="px-6 py-3.5">Contact</th>
                                <th className="px-6 py-3.5">Spaces Listed</th>
                                <th className="px-6 py-3.5">Verification</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {users.filter(u => u.role === 'owner').length === 0 ? (
                                <tr>
                                  <td colSpan="6" className="text-center py-8 text-slate-400">
                                    No place owners registered yet.
                                  </td>
                                </tr>
                              ) : (
                                users.filter(u => u.role === 'owner').map(owner => {
                                  const ownerSpaces = spaces.filter(s => (s.ownerId?._id || s.ownerId) === owner._id);
                                  return (
                                    <tr key={owner._id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-sm shrink-0 border border-amber-200">
                                            {owner.name?.charAt(0)?.toUpperCase() || 'H'}
                                          </div>
                                          <div>
                                            <p className="font-bold text-slate-900">{owner.name}</p>
                                            <p className="text-xs text-slate-400">{owner.email}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                          {owner.uniqueId || 'PO000001'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-slate-600 text-xs font-mono">
                                        {owner.contact || 'No phone'}
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="font-black text-slate-800 text-sm">
                                          {ownerSpaces.length}
                                        </span>{' '}
                                        <span className="text-xs text-slate-400">spaces</span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <StatusBadge status={owner.status} />
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        {owner.status === 'pending' ? (
                                          <div className="flex items-center justify-end gap-2">
                                            <button
                                              onClick={() => handleUserVerify(owner._id, 'verified')}
                                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                            >
                                              Approve
                                            </button>
                                            <button
                                              onClick={() => handleUserVerify(owner._id, 'rejected')}
                                              className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => navigate('/admin/owners')}
                                            className="text-xs text-amber-600 font-bold hover:underline"
                                          >
                                            View Host Details →
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            Total {users.filter(u => u.role === 'owner').length} registered hosts
                          </span>
                          <button
                            onClick={() => navigate('/admin/owners')}
                            className="text-xs text-amber-600 font-bold hover:underline"
                          >
                            Go to Parking Owners Directory →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content Section 3: Parking Seekers */}
                    {overviewDirTab === 'seekers' && (
                      <div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold">
                              <tr>
                                <th className="px-6 py-3.5">Seeker / Driver</th>
                                <th className="px-6 py-3.5">Unique ID</th>
                                <th className="px-6 py-3.5">Phone</th>
                                <th className="px-6 py-3.5">Wallet Balance</th>
                                <th className="px-6 py-3.5">Total Bookings</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {users.filter(u => u.role === 'seeker').length === 0 ? (
                                <tr>
                                  <td colSpan="7" className="text-center py-8 text-slate-400">
                                    No parking seekers registered yet.
                                  </td>
                                </tr>
                              ) : (
                                users.filter(u => u.role === 'seeker').map(seeker => {
                                  const seekerBookings = bookings.filter(b => (b.seekerId?._id || b.seekerId) === seeker._id);
                                  return (
                                    <tr key={seeker._id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-black flex items-center justify-center text-sm shrink-0 border border-blue-200">
                                            {seeker.name?.charAt(0)?.toUpperCase() || 'D'}
                                          </div>
                                          <div>
                                            <p className="font-bold text-slate-900">{seeker.name}</p>
                                            <p className="text-xs text-slate-400">{seeker.email}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                          {seeker.uniqueId || 'VO000001'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-slate-600 text-xs font-mono">
                                        {seeker.contact || 'No phone'}
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="font-bold text-emerald-600">
                                          ₹{seeker.walletBalance || 0}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="font-black text-slate-800 text-sm">
                                          {seekerBookings.length}
                                        </span>{' '}
                                        <span className="text-xs text-slate-400">trips</span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <StatusBadge status={seeker.status} />
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        {seeker.status === 'pending' ? (
                                          <div className="flex items-center justify-end gap-2">
                                            <button
                                              onClick={() => handleUserVerify(seeker._id, 'verified')}
                                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                            >
                                              Approve
                                            </button>
                                            <button
                                              onClick={() => handleUserVerify(seeker._id, 'rejected')}
                                              className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => navigate('/admin/seekers')}
                                            className="text-xs text-blue-600 font-bold hover:underline"
                                          >
                                            View Driver Details →
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            Total {users.filter(u => u.role === 'seeker').length} registered commuters
                          </span>
                          <button
                            onClick={() => navigate('/admin/seekers')}
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            Go to Parking Seekers Directory →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ── VIEW: TERMS & CONDITIONS MANAGEMENT ────────────────────── */}
              {currentView === 'terms' && (() => {
                const filteredTerms = terms
                  .filter(t => t.type === termsType)
                  .filter(t => !termSearchQuery || t.clause.toLowerCase().includes(termSearchQuery.toLowerCase()))
                  .sort((a, b) => a.order - b.order);

                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          <FileText className="h-6 w-6 text-indigo-500" />
                          Terms & Conditions Live Editor
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Manage, edit, add, or delete legal clauses for Space Owners and Parking Seekers. Updates reflect instantly in the mobile apps.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setEditingTerm(null);
                          setTermClauseInput('');
                          const maxOrd = Math.max(0, ...terms.filter(t => t.type === termsType).map(t => t.order || 0));
                          setTermOrderInput(maxOrd + 1);
                          setShowAddTermModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all shrink-0"
                      >
                        <Plus className="h-4 w-4" /> Add New Clause
                      </button>
                    </div>

                    {/* Navigation Filter Tabs & Search */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 bg-slate-200/60 p-1.5 rounded-2xl w-full sm:w-auto">
                        <button
                          onClick={() => setTermsType('owner')}
                          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            termsType === 'owner'
                              ? 'bg-white text-indigo-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>🏢 Place Owner Terms</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-600">
                            {terms.filter(t => t.type === 'owner').length}
                          </span>
                        </button>
                        <button
                          onClick={() => setTermsType('seeker')}
                          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            termsType === 'seeker'
                              ? 'bg-white text-blue-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>🚗 Parking Seeker Terms</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600">
                            {terms.filter(t => t.type === 'seeker').length}
                          </span>
                        </button>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search clauses..."
                          value={termSearchQuery}
                          onChange={(e) => setTermSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    </div>

                    {/* Clauses List Table */}
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-sm">
                            {termsType === 'owner' ? 'Place Owner (Space Provider)' : 'Parking Seeker (Vehicle Owner)'} Clauses
                          </h3>
                          <p className="text-[11px] text-slate-400">Total {filteredTerms.length} active clauses loaded</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-400 text-xs uppercase">
                            <tr>
                              <th className="px-6 py-3 w-16">#</th>
                              <th className="px-6 py-3">Clause Description</th>
                              <th className="px-6 py-3 w-28 text-center">Status</th>
                              <th className="px-6 py-3 w-32 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredTerms.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="text-center py-12 text-slate-400">
                                  No clauses found matching your search.
                                </td>
                              </tr>
                            ) : (
                              filteredTerms.map((t, idx) => (
                                <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center font-mono">
                                      {t.order || idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-800 font-medium text-xs leading-relaxed max-w-xl">
                                    {t.clause}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <button
                                      onClick={() => handleToggleTermActive(t)}
                                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                        t.isActive
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                      }`}
                                    >
                                      {t.isActive ? '✓ Active' : 'Inactive'}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => {
                                          setEditingTerm(t);
                                          setTermClauseInput(t.clause);
                                          setTermOrderInput(t.order || idx + 1);
                                          setShowAddTermModal(true);
                                        }}
                                        className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center transition-colors"
                                        title="Edit Clause"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTerm(t._id)}
                                        className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
                                        title="Delete Clause"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Add / Edit Modal */}
                    {showAddTermModal && (
                      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-scaleUp">
                          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                              <FileText className="h-5 w-5 text-indigo-500" />
                              {editingTerm ? 'Edit Term Clause' : 'Add New Term Clause'}
                            </h3>
                            <button
                              onClick={() => setShowAddTermModal(false)}
                              className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <form onSubmit={handleSaveTerm} className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Target Application</label>
                              <select
                                value={termsType}
                                onChange={(e) => setTermsType(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-400"
                              >
                                <option value="owner">🏢 Place Owner App</option>
                                <option value="seeker">🚗 Parking Seeker App</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Clause Number (Order)</label>
                              <input
                                type="number"
                                min="1"
                                value={termOrderInput}
                                onChange={(e) => setTermOrderInput(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-400"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Clause Content</label>
                              <textarea
                                rows="5"
                                required
                                placeholder="Enter clause description..."
                                value={termClauseInput}
                                onChange={(e) => setTermClauseInput(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setShowAddTermModal(false)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={termLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                              >
                                {termLoading ? 'Saving...' : editingTerm ? 'Update Clause' : 'Create Clause'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── VIEW: USERS MANAGEMENT (ALL USERS) ────────────────────── */}
              {currentView === 'users' && (() => {
                const filteredUsers = users
                  .filter(u => {
                    if (usersTab === 'owner') return u.role === 'owner';
                    if (usersTab === 'seeker') return u.role === 'seeker';
                    return true;
                  })
                  .filter(u => {
                    if (!usersSearch) return true;
                    const q = usersSearch.toLowerCase();
                    return (
                      (u.name && u.name.toLowerCase().includes(q)) ||
                      (u.email && u.email.toLowerCase().includes(q)) ||
                      (u.contact && u.contact.toLowerCase().includes(q)) ||
                      (u.uniqueId && u.uniqueId.toLowerCase().includes(q))
                    );
                  });

                return (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                          <Users className="h-5 w-5 text-emerald-500" />
                          Platform User Directory
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          View, filter, verify, and manage all registered Parking Owners (hosts) and Parking Seekers (commuters).
                        </p>
                      </div>

                      {/* Role Filter Tabs */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0">
                        <button
                          type="button"
                          onClick={() => setUsersTab('all')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            usersTab === 'all'
                              ? 'bg-white text-slate-900 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({users.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setUsersTab('owner')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            usersTab === 'owner'
                              ? 'bg-white text-amber-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Owners ({users.filter(u => u.role === 'owner').length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUsersTab('seeker')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            usersTab === 'seeker'
                              ? 'bg-white text-blue-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Car className="h-3.5 w-3.5" />
                          <span>Seekers ({users.filter(u => u.role === 'seeker').length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search users by name, email, phone, ID..."
                        value={usersSearch}
                        onChange={e => setUsersSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                      />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold">
                            <tr>
                              <th className="px-6 py-3.5">User Details</th>
                              <th className="px-6 py-3.5">Unique ID</th>
                              <th className="px-6 py-3.5">Phone</th>
                              <th className="px-6 py-3.5">System Role</th>
                              <th className="px-6 py-3.5">Mail Status</th>
                              <th className="px-6 py-3.5">Account Status</th>
                              <th className="px-6 py-3.5">Registered</th>
                              <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="text-center py-12 text-slate-400 font-bold">
                                  No users match the selected criteria.
                                </td>
                              </tr>
                            ) : (
                              filteredUsers.map(u => (
                                <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      {u.profileImage ? (
                                        <img src={u.profileImage} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                                      ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black uppercase text-sm shrink-0 ${
                                          u.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {u.name?.charAt(0) || 'U'}
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
                                  <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider ${
                                      u.role === 'owner'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                      {u.uniqueId || (u.role === 'owner' ? 'PO000001' : 'VO000001')}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 text-xs font-mono">{u.contact || 'No phone'}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                      u.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                      {u.role === 'owner' ? '🏢 Owner (Host)' : '🚗 Seeker (Driver)'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {u.isEmailVerified ? (
                                      <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Verified</span>
                                    ) : (
                                      <span className="text-amber-500 text-xs font-bold">Pending OTP</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4"><StatusBadge status={u.status} /></td>
                                  <td className="px-6 py-4 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {u.status === 'pending' ? (
                                        <>
                                          <button onClick={() => handleUserVerify(u._id, 'verified')} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">Approve</button>
                                          <button onClick={() => handleUserVerify(u._id, 'rejected')} className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">Reject</button>
                                        </>
                                      ) : (
                                        <span className="text-slate-400 text-xs font-medium">Reviewed</span>
                                      )}
                                      {u.role !== 'admin' && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteUser(u._id, u.name)}
                                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                                          title="Delete User Account"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── VIEW: SPACE OWNERS (HOSTS) DIRECTORY & DETAILS ────────────────────── */}
              {currentView === 'owners' && (() => {
                const ownerUsers = users.filter(u => u.role === 'owner' && u.accountCategory !== 'vehicle_storage_owner');
                const filteredOwners = ownerUsers.filter(o => {
                  if (!usersSearch) return true;
                  const q = usersSearch.toLowerCase();
                  return (
                    (o.name && o.name.toLowerCase().includes(q)) ||
                    (o.email && o.email.toLowerCase().includes(q)) ||
                    (o.contact && o.contact.toLowerCase().includes(q)) ||
                    (o.uniqueId && o.uniqueId.toLowerCase().includes(q))
                  );
                });

                // DETAIL VIEW FOR SELECTED SPACE OWNER
                if (selectedOwnerForDetail) {
                  const owner = selectedOwnerForDetail;
                  const ownerSpaces = spaces.filter(s => (s.ownerId?._id || s.ownerId) === owner._id);
                  const osSummary = ownerSummaries.find(os => os.ownerId === owner._id);

                  return (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Back button and quick actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setSelectedOwnerForDetail(null)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          ← Back to All Space Owners
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(owner._id, owner.name)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" /> Delete Owner Account
                          </button>
                        </div>
                      </div>

                      {/* Owner Profile Banner Card */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 font-black text-2xl flex items-center justify-center border border-amber-200 shrink-0">
                              {owner.name?.charAt(0)?.toUpperCase() || 'H'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="font-black text-slate-900 text-xl">{owner.name}</h3>
                                <StatusBadge status={owner.status} />
                                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  ID: {owner.uniqueId || 'PO000001'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Space Owner & Host • Member since {new Date(owner.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {owner.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => { handleUserVerify(owner._id, 'verified'); setSelectedOwnerForDetail(prev => ({ ...prev, status: 'verified' })); }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                                >
                                  Approve Host
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { handleUserVerify(owner._id, 'rejected'); setSelectedOwnerForDetail(prev => ({ ...prev, status: 'rejected' })); }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-3 py-1.5 rounded-xl text-xs"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setPayoutOwnerId(owner._id);
                                setPayoutAmount(osSummary ? osSummary.owedAmount.toString() : '0');
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                            >
                              <DollarSign className="h-4 w-4" /> Payout / Ledger
                            </button>
                          </div>
                        </div>

                        {/* Detailed Profile Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Email Address</span>
                            <span className="font-bold text-slate-900 break-all">{owner.email}</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Contact Phone</span>
                            <span className="font-mono font-bold text-slate-900">{owner.contact || 'Not provided'}</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Listed Spots</span>
                            <span className="font-black text-indigo-600 text-sm">{ownerSpaces.length} Parking Spaces</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Pending Payout</span>
                            <span className="font-black text-amber-600 text-sm">₹{osSummary?.owedAmount || 0}</span>
                          </div>
                        </div>

                        {/* Bank Details section */}
                        <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="font-bold text-amber-900 block">Bank Account Settlement Details</span>
                            <div className="flex flex-wrap items-center gap-4 mt-1 text-slate-600">
                              <span><strong>Bank:</strong> {owner.bankAccountDetails?.bankName || 'Not added'}</span>
                              <span><strong>A/C:</strong> {owner.bankAccountDetails?.accountNumber || 'Not added'}</span>
                              <span><strong>IFSC:</strong> {owner.bankAccountDetails?.ifscCode || 'Not added'}</span>
                              <span><strong>Holder:</strong> {owner.bankAccountDetails?.accountName || owner.name}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 bg-white border border-amber-200 text-amber-800 rounded-lg">
                            Direct Bank Transfer Ready
                          </span>
                        </div>
                      </div>

                      {/* Listed Parking Spaces for this Owner */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-indigo-500" />
                            Listed Parking Spots by {owner.name} ({ownerSpaces.length})
                          </h4>
                        </div>

                        {ownerSpaces.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold shadow-sm">
                            <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            No parking spaces listed yet by this owner.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {ownerSpaces.map(sp => (
                              <div key={sp._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="p-5">
                                  <div className="flex gap-4">
                                    <div className="w-28 h-28 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative">
                                      <img
                                        src={sp.image || (sp.images && sp.images[0]) || 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600&q=80'}
                                        alt={sp.title || sp.address}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600&q=80'; }}
                                      />
                                      {sp.hasEvCharger && (
                                        <span className="absolute bottom-1.5 left-1.5 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                                          ⚡ EV
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className="font-extrabold text-slate-900 text-sm truncate">{sp.title || sp.address}</h5>
                                        <span className="text-rose-500 font-black text-sm whitespace-nowrap">₹{sp.pricePerHour || 50}/hr</span>
                                      </div>
                                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{sp.address}</p>
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                          Capacity: {sp.totalSlots || 1} slots
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                          Available: {sp.availableSlots ?? sp.totalSlots}
                                        </span>
                                        <StatusBadge status={sp.status} />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Vehicle compatibility badges */}
                                  {sp.suitableVehicles && sp.suitableVehicles.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
                                      {sp.suitableVehicles.map((v, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold uppercase">
                                          {v}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {sp.locationLink && (
                                      <a
                                        href={sp.locationLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                      >
                                        <MapPin className="h-3 w-3" /> Map
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSpaceActive(sp._id, sp.isActive !== false)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        sp.isActive !== false
                                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      {sp.isActive !== false ? 'Set Offline' : 'Set Live'}
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSpace(sp._id, sp.title || sp.address)}
                                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete Spot
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // DIRECTORY LIST VIEW FOR SPACE OWNERS
                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                          <UserCheck className="h-6 w-6 text-amber-500" />
                          Space Owners (Hosts) Directory
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Driveway providers, residential and commercial parking lot hosts.
                        </p>
                      </div>

                      {/* Stat summary pills */}
                      <div className="flex items-center gap-3">
                        <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                          Total Owners: {ownerUsers.length}
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                          Verified: {ownerUsers.filter(o => o.status === 'verified').length}
                        </div>
                        {ownerUsers.some(o => o.status === 'pending') && (
                          <div className="px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold animate-pulse">
                            Pending: {ownerUsers.filter(o => o.status === 'pending').length}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search space owners by name, email, phone, ID..."
                        value={usersSearch}
                        onChange={e => setUsersSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                    </div>

                    {/* Owners Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredOwners.length === 0 ? (
                        <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold">
                          No space owners found matching search.
                        </div>
                      ) : (
                        filteredOwners.map(owner => {
                          const ownerSpaces = spaces.filter(s => (s.ownerId?._id || s.ownerId) === owner._id);
                          const osSummary = ownerSummaries.find(os => os.ownerId === owner._id);

                          return (
                            <div key={owner._id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center border border-amber-200 shrink-0">
                                      {owner.name?.charAt(0)?.toUpperCase() || 'H'}
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-slate-900 text-base leading-tight">{owner.name}</h4>
                                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        ID: {owner.uniqueId || 'PO000001'}
                                      </span>
                                    </div>
                                  </div>
                                  <StatusBadge status={owner.status} />
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Email:</span>
                                    <span className="font-medium text-slate-800 truncate max-w-[180px]">{owner.email}</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Phone:</span>
                                    <span className="font-mono font-bold text-slate-800">{owner.contact || 'Not provided'}</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Listed Spots:</span>
                                    <span className="font-black text-indigo-600">{ownerSpaces.length} spots</span>
                                  </p>
                                  {osSummary && (
                                    <p className="flex items-center justify-between">
                                      <span className="text-slate-400">Pending Payout:</span>
                                      <span className="font-black text-amber-600">₹{osSummary.owedAmount || 0}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Spaces Preview Badge List */}
                                {ownerSpaces.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Listed Parking Spots:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ownerSpaces.slice(0, 3).map(sp => (
                                        <span key={sp._id} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold truncate max-w-[160px]">
                                          🅿️ {sp.title || sp.address} ({sp.totalSlots} slots)
                                        </span>
                                      ))}
                                      {ownerSpaces.length > 3 && (
                                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold">
                                          +{ownerSpaces.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOwnerForDetail(owner)}
                                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <MapPin className="h-3.5 w-3.5" /> View Details & Spots
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(owner._id, owner.name)}
                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-colors"
                                    title="Delete Owner Account"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                {owner.status === 'pending' && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUserVerify(owner._id, 'verified')}
                                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 rounded-xl text-xs transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUserVerify(owner._id, 'rejected')}
                                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold py-1.5 rounded-xl text-xs transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── VIEW: VEHICLE STORAGE LAND OWNERS DIRECTORY & DETAILS ───────── */}
              {currentView === 'storage-owners' && (() => {
                const storageOwners = users.filter(u => u.role === 'owner' && (u.accountCategory === 'vehicle_storage_owner' || (u.landAcres && u.landAcres > 0)));
                const filteredStorageOwners = storageOwners.filter(o => {
                  if (!usersSearch) return true;
                  const q = usersSearch.toLowerCase();
                  return (
                    (o.name && o.name.toLowerCase().includes(q)) ||
                    (o.email && o.email.toLowerCase().includes(q)) ||
                    (o.contact && o.contact.toLowerCase().includes(q)) ||
                    (o.uniqueId && o.uniqueId.toLowerCase().includes(q)) ||
                    (o.organizationName && o.organizationName.toLowerCase().includes(q))
                  );
                });

                // DETAIL VIEW FOR SELECTED STORAGE LAND OWNER
                if (selectedStorageOwnerForDetail) {
                  const owner = selectedStorageOwnerForDetail;
                  const ownerSpaces = spaces.filter(s => (s.ownerId?._id || s.ownerId) === owner._id);
                  const osSummary = ownerSummaries.find(os => os.ownerId === owner._id);

                  return (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Back button and quick actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setSelectedStorageOwnerForDetail(null)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          ← Back to All Storage Land Owners
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(owner._id, owner.name)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" /> Delete Land Owner Account
                          </button>
                        </div>
                      </div>

                      {/* Storage Owner Profile Banner Card */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-2xl flex items-center justify-center border border-emerald-200 shrink-0">
                              🚜
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="font-black text-slate-900 text-xl">{owner.name}</h3>
                                <StatusBadge status={owner.status} />
                                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ID: {owner.uniqueId || 'SO000001'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Vehicle Storage Land Owner • {owner.organizationName || 'Private Land Facility'} • Member since {new Date(owner.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {owner.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => { handleUserVerify(owner._id, 'verified'); setSelectedStorageOwnerForDetail(prev => ({ ...prev, status: 'verified' })); }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                                >
                                  Approve Facility
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { handleUserVerify(owner._id, 'rejected'); setSelectedStorageOwnerForDetail(prev => ({ ...prev, status: 'rejected' })); }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-3 py-1.5 rounded-xl text-xs"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setPayoutOwnerId(owner._id);
                                setPayoutAmount(osSummary ? osSummary.owedAmount.toString() : '0');
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                            >
                              <DollarSign className="h-4 w-4" /> Payout / Ledger
                            </button>
                          </div>
                        </div>

                        {/* Land & Storage Yard Specifics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
                          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                            <span className="text-emerald-700 block font-semibold mb-1">Land Area (Acres)</span>
                            <span className="font-black text-emerald-950 text-base">{owner.landAcres ? `${owner.landAcres} Acres` : 'Specified in Listings'}</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Fencing & Boundary</span>
                            <span className="font-bold text-slate-900">{owner.fencingType || 'Standard Security Fencing'}</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">24/7 Security Guards</span>
                            <span className="font-bold text-slate-900">{owner.hasSecurityGuards ? '✅ On-site Guards' : '❌ Automated / Self-lock'}</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Active Storage Yards</span>
                            <span className="font-black text-emerald-600 text-base">{ownerSpaces.length} Listed Yards</span>
                          </div>
                        </div>

                        {/* Contact & Settlement Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Direct Contact</span>
                            <p className="font-bold text-slate-900">{owner.contact || 'No phone'} • <span className="font-normal text-slate-600">{owner.email}</span></p>
                          </div>
                          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100">
                            <span className="text-amber-800 block font-semibold mb-1">Bank Settlement Account</span>
                            <p className="font-bold text-slate-900">
                              {owner.bankAccountDetails?.bankName || 'Bank on file'}: {owner.bankAccountDetails?.accountNumber || 'Pending'} ({owner.bankAccountDetails?.ifscCode || 'IFSC'})
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Listed Storage Yards for this Land Owner */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-emerald-500" />
                            Vehicle Storage Listed Yards & Spots by {owner.name} ({ownerSpaces.length})
                          </h4>
                        </div>

                        {ownerSpaces.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold shadow-sm">
                            <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            No vehicle storage yards listed yet by this land owner.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {ownerSpaces.map(sp => (
                              <div key={sp._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="p-5">
                                  <div className="flex gap-4">
                                    <div className="w-28 h-28 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative">
                                      <img
                                        src={sp.image || (sp.images && sp.images[0]) || 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&q=80'}
                                        alt={sp.title || sp.address}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&q=80'; }}
                                      />
                                      <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                                        🚜 YARD
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className="font-extrabold text-slate-900 text-sm truncate">{sp.title || sp.address}</h5>
                                        <span className="text-emerald-600 font-black text-sm whitespace-nowrap">₹{sp.pricePerHour || 50}/hr</span>
                                      </div>
                                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{sp.address}</p>
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                                          Capacity: {sp.totalSlots || 10} bays
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                          Available: {sp.availableSlots ?? sp.totalSlots}
                                        </span>
                                        <StatusBadge status={sp.status} />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {sp.locationLink && (
                                      <a
                                        href={sp.locationLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                      >
                                        <MapPin className="h-3 w-3" /> Map
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSpaceActive(sp._id, sp.isActive !== false)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        sp.isActive !== false
                                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      {sp.isActive !== false ? 'Set Offline' : 'Set Live'}
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSpace(sp._id, sp.title || sp.address)}
                                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete Yard
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // DIRECTORY LIST VIEW FOR STORAGE LAND OWNERS
                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                          <MapPin className="h-6 w-6 text-emerald-500" />
                          Vehicle Storage Land Owners Directory
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Open land, yard, warehouse, and commercial vehicle storage facility providers.
                        </p>
                      </div>

                      {/* Stat summary pills */}
                      <div className="flex items-center gap-3">
                        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                          Total Land Owners: {storageOwners.length}
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                          Verified: {storageOwners.filter(o => o.status === 'verified').length}
                        </div>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search storage land owners by name, phone, acres, facility..."
                        value={usersSearch}
                        onChange={e => setUsersSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
                      />
                    </div>

                    {/* Storage Land Owners Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredStorageOwners.length === 0 ? (
                        <div className="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold">
                          No vehicle storage land owners found matching search.
                        </div>
                      ) : (
                        filteredStorageOwners.map(owner => {
                          const ownerSpaces = spaces.filter(s => (s.ownerId?._id || s.ownerId) === owner._id);

                          return (
                            <div key={owner._id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center border border-emerald-200 shrink-0">
                                      🚜
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-slate-900 text-base leading-tight">{owner.name}</h4>
                                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ID: {owner.uniqueId || 'SO000001'}
                                      </span>
                                    </div>
                                  </div>
                                  <StatusBadge status={owner.status} />
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Land Area:</span>
                                    <span className="font-black text-emerald-700">{owner.landAcres ? `${owner.landAcres} Acres` : 'Yard Listed'}</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Security:</span>
                                    <span className="font-medium text-slate-800">{owner.hasSecurityGuards ? '✅ 24/7 Guarded' : 'Fenced Plot'}</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Phone:</span>
                                    <span className="font-mono font-bold text-slate-800">{owner.contact || 'Not provided'}</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Email:</span>
                                    <span className="font-medium text-slate-800 truncate max-w-[180px]">{owner.email}</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="text-slate-400">Storage Yards:</span>
                                    <span className="font-black text-indigo-600">{ownerSpaces.length} Listed Yards</span>
                                  </p>
                                </div>
                              </div>

                              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStorageOwnerForDetail(owner)}
                                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <MapPin className="h-3.5 w-3.5" /> View Details & Yards
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(owner._id, owner.name)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-colors"
                                  title="Delete Land Owner Account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── VIEW: PARKING SEEKERS (COMMUTERS) DIRECTORY & DETAILS ─────────── */}
              {currentView === 'seekers' && (() => {
                const seekerUsers = users.filter(u => u.role === 'seeker');
                const filteredSeekers = seekerUsers.filter(s => {
                  if (!usersSearch) return true;
                  const q = usersSearch.toLowerCase();
                  return (
                    (s.name && s.name.toLowerCase().includes(q)) ||
                    (s.email && s.email.toLowerCase().includes(q)) ||
                    (s.contact && s.contact.toLowerCase().includes(q)) ||
                    (s.uniqueId && s.uniqueId.toLowerCase().includes(q))
                  );
                });

                // DETAIL VIEW FOR SELECTED SEEKER
                if (selectedSeekerForDetail) {
                  const seeker = selectedSeekerForDetail;
                  const seekerBookings = bookings.filter(b => (b.seekerId?._id || b.seekerId) === seeker._id);

                  return (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Back button and quick actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setSelectedSeekerForDetail(null)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          ← Back to All Parking Seekers
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(seeker._id, seeker.name)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" /> Delete Seeker Account
                          </button>
                        </div>
                      </div>

                      {/* Seeker Profile Banner Card */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-800 font-black text-2xl flex items-center justify-center border border-blue-200 shrink-0">
                              {seeker.name?.charAt(0)?.toUpperCase() || 'D'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="font-black text-slate-900 text-xl">{seeker.name}</h3>
                                <StatusBadge status={seeker.status} />
                                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  ID: {seeker.uniqueId || 'VO000001'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Parking Seeker & Commuter • Member since {new Date(seeker.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-right">
                              <span className="text-[10px] text-emerald-600 font-bold uppercase block">Wallet Balance</span>
                              <span className="font-black text-emerald-700 text-lg">₹{seeker.walletBalance || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Profile Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs">
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Email Address</span>
                            <span className="font-bold text-slate-900 break-all">{seeker.email}</span>
                            <span className="block mt-1 text-[10px] text-emerald-600 font-bold">
                              {seeker.isEmailVerified ? '✓ Email Verified' : 'OTP Pending'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Contact Phone</span>
                            <span className="font-mono font-bold text-slate-900">{seeker.contact || 'Not provided'}</span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Driving License</span>
                            <span className="font-mono font-bold text-slate-900">{seeker.driverLicenseNumber || 'On Record'}</span>
                            {seeker.driverLicenseImage && (
                              <a href={seeker.driverLicenseImage} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-blue-600 font-bold hover:underline mt-1">
                                View License Photo ↗
                              </a>
                            )}
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl">
                            <span className="text-slate-400 block font-semibold mb-1">Total Parking Bookings</span>
                            <span className="font-black text-blue-600 text-sm">{seekerBookings.length} Trips Completed</span>
                          </div>
                        </div>

                        {/* Registered Vehicles */}
                        {seeker.vehicles && seeker.vehicles.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Registered Vehicles:</span>
                            <div className="flex flex-wrap gap-2">
                              {seeker.vehicles.map((v, i) => (
                                <div key={i} className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs flex items-center gap-2">
                                  <Car className="h-3.5 w-3.5 text-blue-600" />
                                  <span className="font-mono font-bold text-slate-800">{v.plateNumber || v.vehicleNumber}</span>
                                  <span className="text-slate-500 uppercase text-[10px]">({v.vehicleType || 'Car'})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Seeker Booking Trips History */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-blue-500" />
                            Parking Trips & Bookings by {seeker.name} ({seekerBookings.length})
                          </h4>
                        </div>

                        {seekerBookings.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold shadow-sm">
                            <Car className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            No parking trips booked yet by this commuter.
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold">
                                  <tr>
                                    <th className="px-6 py-3.5">Parking Spot</th>
                                    <th className="px-6 py-3.5">Slot ID</th>
                                    <th className="px-6 py-3.5">Vehicle</th>
                                    <th className="px-6 py-3.5">Timing</th>
                                    <th className="px-6 py-3.5">Amount</th>
                                    <th className="px-6 py-3.5">Payment</th>
                                    <th className="px-6 py-3.5">Trip Status</th>
                                    <th className="px-6 py-3.5 text-right">Invoice</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                                  {seekerBookings.map(b => (
                                    <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900">{b.spaceId?.title || b.spaceId?.address || 'Parking Location'}</p>
                                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{b.spaceId?.address || 'Hyderabad'}</p>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                          {b.slotId || 'A-1'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                        {b.vehicleNumber || b.vehiclePlate || 'TS09XX0000'}
                                      </td>
                                      <td className="px-6 py-4 text-slate-600">
                                        <div>{new Date(b.startTime || b.createdAt).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-slate-400">
                                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 font-black text-slate-900">
                                        ₹{b.totalAmount || 0}
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          b.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                          {b.paymentStatus || 'paid'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <StatusBadge status={b.status} />
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <button
                                          type="button"
                                          onClick={() => setViewingInvoiceId(b._id)}
                                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          View Bill
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // DIRECTORY LIST/TABLE VIEW FOR SEEKERS
                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                          <Car className="h-6 w-6 text-blue-500" />
                          Parking Seekers (Drivers & Commuters) Directory
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Registered commuters and vehicle drivers finding parking across Hyderabad.
                        </p>
                      </div>

                      {/* Stat summary pills */}
                      <div className="flex items-center gap-3">
                        <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                          Total Commuters: {seekerUsers.length}
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                          Verified: {seekerUsers.filter(s => s.status === 'verified').length}
                        </div>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search seekers by name, email, phone, ID..."
                        value={usersSearch}
                        onChange={e => setUsersSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>

                    {/* Seekers Table */}
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold">
                            <tr>
                              <th className="px-6 py-3.5">Commuter Name</th>
                              <th className="px-6 py-3.5">Unique ID</th>
                              <th className="px-6 py-3.5">Phone Contact</th>
                              <th className="px-6 py-3.5">Wallet Balance</th>
                              <th className="px-6 py-3.5">Total Bookings</th>
                              <th className="px-6 py-3.5">Email Status</th>
                              <th className="px-6 py-3.5">Profile Status</th>
                              <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredSeekers.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="text-center py-12 text-slate-400 font-bold">
                                  No parking seekers found matching search.
                                </td>
                              </tr>
                            ) : (
                              filteredSeekers.map(seeker => {
                                const seekerBookings = bookings.filter(b => (b.seekerId?._id || b.seekerId) === seeker._id);

                                return (
                                  <tr key={seeker._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-black flex items-center justify-center text-sm shrink-0 border border-blue-200">
                                          {seeker.name?.charAt(0)?.toUpperCase() || 'D'}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-900">{seeker.name}</p>
                                          <p className="text-xs text-slate-400">{seeker.email}</p>
                                          {seeker.driverLicenseImage && (
                                            <a href={seeker.driverLicenseImage} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-0.5 inline-block">
                                              View Driving License
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        {seeker.uniqueId || 'VO000001'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-xs font-mono">
                                      {seeker.contact || 'No phone'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="font-bold text-emerald-600 text-sm">
                                        ₹{seeker.walletBalance || 0}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="font-black text-slate-800 text-sm">
                                        {seekerBookings.length}
                                      </span>{' '}
                                      <span className="text-xs text-slate-400">trips</span>
                                    </td>
                                    <td className="px-6 py-4">
                                      {seeker.isEmailVerified ? (
                                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                                          <CheckCircle className="h-3.5 w-3.5" /> Verified
                                        </span>
                                      ) : (
                                        <span className="text-amber-500 text-xs font-bold">Pending OTP</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4">
                                      <StatusBadge status={seeker.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedSeekerForDetail(seeker)}
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                        >
                                          View Details
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteUser(seeker._id, seeker.name)}
                                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                                          title="Delete Seeker Account"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── VIEW: PARKING SPACES (ALL & PENDING) ─────────────────────── */}
              {currentView === 'spaces' && (() => {
                const filteredSpaces = spaces
                  .filter(sp => {
                    if (spacesTab === 'approved') return sp.status === 'approved' && sp.isActive !== false;
                    if (spacesTab === 'pending') return sp.status === 'pending';
                    if (spacesTab === 'inactive') return sp.isActive === false || sp.status === 'rejected';
                    return true;
                  })
                  .filter(sp => {
                    if (!spacesSearch) return true;
                    const q = spacesSearch.toLowerCase();
                    return (
                      (sp.title && sp.title.toLowerCase().includes(q)) ||
                      (sp.address && sp.address.toLowerCase().includes(q)) ||
                      (sp.city && sp.city.toLowerCase().includes(q)) ||
                      (sp.ownerId?.name && sp.ownerId.name.toLowerCase().includes(q)) ||
                      (sp.ownerId?.email && sp.ownerId.email.toLowerCase().includes(q))
                    );
                  });

                const totalSlotsCount = spaces.reduce((acc, s) => acc + (s.totalSlots || 0), 0);

                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                          <MapPin className="h-6 w-6 text-indigo-500" />
                          Parking Spaces Directory & Approvals
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Inspect, verify, activate/disable, and monitor all active driveway and yard parking spots.
                        </p>
                      </div>

                      {/* Summary Metrics */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                          Total Spaces: <span className="text-indigo-600">{spaces.length}</span>
                        </div>
                        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
                          Active & Live: {spaces.filter(s => s.status === 'approved' && s.isActive !== false).length}
                        </div>
                        <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700">
                          Total Slots: {totalSlotsCount}
                        </div>
                        {spaces.some(s => s.status === 'pending') && (
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 animate-pulse">
                            Needs Approval: {spaces.filter(s => s.status === 'pending').length}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filter Tabs & Search */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setSpacesTab('all')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            spacesTab === 'all'
                              ? 'bg-white text-indigo-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All Spaces ({spaces.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpacesTab('approved')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            spacesTab === 'approved'
                              ? 'bg-white text-emerald-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Active / Live ({spaces.filter(s => s.status === 'approved' && s.isActive !== false).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpacesTab('pending')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            spacesTab === 'pending'
                              ? 'bg-white text-amber-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Awaiting Approval ({spaces.filter(s => s.status === 'pending').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpacesTab('inactive')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            spacesTab === 'inactive'
                              ? 'bg-white text-rose-700 shadow-sm font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Offline ({spaces.filter(s => s.isActive === false || s.status === 'rejected').length})
                        </button>
                      </div>

                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search spot name, address, host..."
                          value={spacesSearch}
                          onChange={e => setSpacesSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Spaces Grid */}
                    {filteredSpaces.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                        <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold">No parking spaces found matching this filter.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filteredSpaces.map(space => (
                          <div key={space._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row hover:shadow-md transition-shadow">
                            <div className="sm:w-48 h-48 sm:h-auto relative shrink-0 bg-slate-100">
                              <img
                                src={space.image || (space.images && space.images[0]) || 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600&q=80'}
                                alt={space.title || space.address}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600&q=80'; }}
                              />
                              <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                {space.city || 'Hyderabad'}
                              </span>
                              {space.hasEvCharger && (
                                <span className="absolute bottom-3 left-3 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                                  ⚡ EV Charging
                                </span>
                              )}
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                  <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                                    {space.title || space.address}
                                  </h4>
                                  <div className="text-right shrink-0">
                                    <span className="text-rose-500 font-black text-base">₹{space.pricePerHour || 50}</span>
                                    <span className="text-slate-400 text-[10px]">/hr</span>
                                  </div>
                                </div>

                                <p className="text-slate-500 text-xs line-clamp-2">{space.address}</p>

                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                                  <p className="text-slate-500">
                                    Host: <strong className="text-slate-800">{space.ownerId?.name || 'Host'}</strong> ({space.ownerId?.contact || space.ownerId?.email || 'Contact on file'})
                                  </p>
                                  <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-1">
                                    <span>Capacity: <strong className="text-slate-900">{space.totalSlots || 5} slots</strong></span>
                                    {space.availableSlots !== undefined && (
                                      <span className="text-emerald-600 font-bold">{space.availableSlots} available</span>
                                    )}
                                  </div>

                                  {/* Vehicle compatibility badges */}
                                  {space.suitableVehicles && space.suitableVehicles.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {space.suitableVehicles.map((v, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold uppercase">
                                          {v}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={space.status} />
                                  <span className={`text-[10px] font-bold ${space.isActive !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {space.isActive !== false ? '● Live' : '○ Offline'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {space.locationLink && (
                                    <a
                                      href={space.locationLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                    >
                                      <MapPin className="h-3 w-3" /> Map
                                    </a>
                                  )}

                                  {space.status === 'pending' ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        placeholder="Prefix (e.g. SPOT-)"
                                        value={slotPrefixes[space._id] || ''}
                                        onChange={e => setSlotPrefixes(p => ({ ...p, [space._id]: e.target.value }))}
                                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg text-xs px-2 py-1"
                                      />
                                      <button
                                        onClick={() => handleSpaceApprove(space._id, 'approved')}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-xs"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleSpaceApprove(space._id, 'rejected')}
                                        className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold px-3 py-1 rounded-lg text-xs"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleToggleSpaceActive(space._id, space.isActive !== false)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                          space.isActive !== false
                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        }`}
                                      >
                                        {space.isActive !== false ? 'Set Offline' : 'Set Live'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSpace(space._id, space.title || space.address)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                                        title="Delete Parking Space"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

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

              {/* ── VIEW: OWNER WITHDRAWALS & PAYOUTS ─────────────────── */}
              {currentView === 'payouts' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Top Stats & Quick Commission Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Pending Requests Stat */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Payouts</p>
                        <h4 className="text-3xl font-black text-amber-500 mt-1">
                          {payoutRequests.filter(p => p.status === 'pending').length}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Totaling ₹{payoutRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                        <DollarSign className="h-7 w-7 text-amber-500" />
                      </div>
                    </div>

                    {/* Cleared Payouts Stat */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cleared Payouts</p>
                        <h4 className="text-3xl font-black text-emerald-600 mt-1">
                          {payoutRequests.filter(p => p.status === 'approved').length}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Totaling ₹{payoutRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                        <CheckCircle className="h-7 w-7 text-emerald-600" />
                      </div>
                    </div>

                    {/* Platform Commission Rate Config Box */}
                    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            <Percent className="h-3.5 w-3.5" /> Platform Commission
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-extrabold border border-indigo-400/30">
                            Active: {commissionRate}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Deducted on every seeker payment before crediting host wallet.
                        </p>
                      </div>
                      <form onSubmit={handleSaveCommission} className="flex items-center gap-2 mt-4">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={commissionInput}
                            onChange={(e) => setCommissionInput(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-400 pr-7"
                          />
                          <span className="absolute right-3 top-2 text-sm text-slate-300 font-bold">%</span>
                        </div>
                        <button
                          type="submit"
                          disabled={savingCommission}
                          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 disabled:opacity-50 text-white text-xs font-black rounded-xl transition shadow flex items-center gap-1"
                        >
                          {savingCommission ? 'Saving...' : 'Update'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Main Payout Requests Container */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
                    {/* Header & Tabs */}
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                          Owner Withdrawal Requests
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Review payout requests from Space Hosts and Vehicle Storage Land Owners. Approve with UTR &amp; receipt proof screenshot.
                        </p>
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 shrink-0 self-start sm:self-auto">
                        {[
                          { id: 'all', label: `All (${payoutRequests.length})` },
                          { id: 'pending', label: `Pending (${payoutRequests.filter(p => p.status === 'pending').length})` },
                          { id: 'approved', label: `Approved (${payoutRequests.filter(p => p.status === 'approved').length})` },
                          { id: 'rejected', label: `Rejected (${payoutRequests.filter(p => p.status === 'rejected').length})` },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setPayoutsFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                              payoutsFilter === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4">Owner / Host</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Payout Method</th>
                            <th className="px-6 py-4">Transfer Details</th>
                            <th className="px-6 py-4">Date Requested</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Proof &amp; Ref</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {payoutRequests
                            .filter(p => payoutsFilter === 'all' || p.status === payoutsFilter)
                            .map((payout) => {
                              const owner = payout.ownerId || {};
                              const isPending = payout.status === 'pending';
                              const isApproved = payout.status === 'approved';
                              const isRejected = payout.status === 'rejected';

                              return (
                                <tr key={payout._id} className="hover:bg-slate-50/50 transition-colors">
                                  {/* Owner Column */}
                                  <td className="px-6 py-4">
                                    <div className="font-extrabold text-slate-800">
                                      {owner.name || 'Unknown Host'}
                                    </div>
                                    <div className="text-xs text-slate-400 font-normal">
                                      {owner.email || 'No email'} • {owner.phone || 'No phone'}
                                    </div>
                                    <div className="mt-1">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                        Wallet: ₹{Number(owner.walletBalance || 0).toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Amount */}
                                  <td className="px-6 py-4">
                                    <div className="text-base font-black text-slate-900">
                                      ₹{Number(payout.amount).toLocaleString('en-IN')}
                                    </div>
                                  </td>

                                  {/* Method */}
                                  <td className="px-6 py-4">
                                    {payout.payoutMethod === 'upi' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                                        <Smartphone className="h-3.5 w-3.5 text-purple-600" /> UPI
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                        <Landmark className="h-3.5 w-3.5 text-blue-600" /> Bank Transfer
                                      </span>
                                    )}
                                  </td>

                                  {/* Details */}
                                  <td className="px-6 py-4">
                                    {payout.payoutMethod === 'upi' ? (
                                      <div>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase">UPI ID</p>
                                        <p className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                                          {payout.payoutDetails?.upiId || 'Not provided'}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="text-xs space-y-0.5">
                                        <p><span className="text-slate-400 font-bold">A/C:</span> <span className="font-mono font-bold text-slate-800">{payout.payoutDetails?.accountNumber || '—'}</span></p>
                                        <p><span className="text-slate-400 font-bold">IFSC:</span> <span className="font-mono font-bold text-slate-800">{payout.payoutDetails?.ifscCode || '—'}</span></p>
                                        <p><span className="text-slate-400 font-bold">Name:</span> {payout.payoutDetails?.accountHolderName || '—'}</p>
                                        {payout.payoutDetails?.bankName && (
                                          <p><span className="text-slate-400 font-bold">Bank:</span> {payout.payoutDetails.bankName}</p>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Date */}
                                  <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                    {new Date(payout.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(payout.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="px-6 py-4">
                                    {isPending && (
                                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        Pending
                                      </span>
                                    )}
                                    {isApproved && (
                                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                        Approved
                                      </span>
                                    )}
                                    {isRejected && (
                                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                        Rejected
                                      </span>
                                    )}
                                  </td>

                                  {/* Proof & Ref */}
                                  <td className="px-6 py-4">
                                    {isApproved && (
                                      <div className="space-y-1">
                                        {payout.transactionReference && (
                                          <div className="text-[11px] text-slate-600">
                                            <span className="text-slate-400 font-bold">UTR: </span>
                                            <span className="font-mono font-bold text-slate-800">{payout.transactionReference}</span>
                                          </div>
                                        )}
                                        {payout.adminReceiptImage ? (
                                          <button
                                            type="button"
                                            onClick={() => setViewingReceiptUrl(payout.adminReceiptImage.startsWith('http') ? payout.adminReceiptImage : `${API_URL}${payout.adminReceiptImage}`)}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                                          >
                                            <Eye className="h-3 w-3" /> View Receipt
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic">No receipt attached</span>
                                        )}
                                      </div>
                                    )}
                                    {isRejected && payout.adminNotes && (
                                      <p className="text-xs text-rose-600 italic max-w-xs truncate" title={payout.adminNotes}>
                                        "{payout.adminNotes}"
                                      </p>
                                    )}
                                    {isPending && (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-6 py-4 text-right whitespace-nowrap">
                                    {isPending ? (
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => {
                                            setApprovingPayout(payout);
                                            setPayoutUtr('');
                                            setPayoutNotes('');
                                            setPayoutReceiptFile(null);
                                            setPayoutReceiptPreview('');
                                          }}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                                        >
                                          <Check className="h-3.5 w-3.5" /> Approve &amp; Clear
                                        </button>
                                        <button
                                          onClick={() => handleRejectPayout(payout._id, owner.name || 'Owner', payout.amount)}
                                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-xs font-semibold text-slate-400">Processed</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>

                      {payoutRequests.filter(p => payoutsFilter === 'all' || p.status === payoutsFilter).length === 0 && (
                        <div className="text-center py-12">
                          <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 font-extrabold text-sm">No payout requests found.</p>
                          <p className="text-slate-400 text-xs mt-1">When space or land owners withdraw their wallet balance, requests will appear here.</p>
                        </div>
                      )}
                    </div>
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

      {/* ── APPROVE PAYOUT & UPLOAD RECEIPT MODAL ───────────────────────── */}
      {approvingPayout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative text-left my-8">
            <button
              onClick={() => {
                setApprovingPayout(null);
                setPayoutReceiptFile(null);
                setPayoutReceiptPreview('');
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-200">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Approve &amp; Clear Payout</h3>
                <p className="text-xs text-slate-400">Upload payment proof screenshot and enter UTR reference.</p>
              </div>
            </div>

            {/* Payout Details Summary Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-xs text-slate-500 font-bold">Owner:</span>
                <span className="text-xs font-black text-slate-800">{approvingPayout.ownerId?.name || 'Owner'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-xs text-slate-500 font-bold">Payout Amount:</span>
                <span className="text-base font-black text-emerald-600">₹{Number(approvingPayout.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-start pb-2 border-b border-slate-200/60">
                <span className="text-xs text-slate-500 font-bold">Transfer Mode:</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {approvingPayout.payoutMethod === 'upi' ? 'UPI Transfer' : 'Bank NEFT/IMPS'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-black tracking-wider block mb-1">
                  Destination Info:
                </span>
                {approvingPayout.payoutMethod === 'upi' ? (
                  <div className="bg-white p-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800">
                    UPI ID: {approvingPayout.payoutDetails?.upiId || 'N/A'}
                  </div>
                ) : (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-0.5">
                    <p><span className="text-slate-400">A/C:</span> <strong className="font-mono">{approvingPayout.payoutDetails?.accountNumber}</strong></p>
                    <p><span className="text-slate-400">IFSC:</span> <strong className="font-mono">{approvingPayout.payoutDetails?.ifscCode}</strong></p>
                    <p><span className="text-slate-400">Holder:</span> <strong>{approvingPayout.payoutDetails?.accountHolderName}</strong></p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleApprovePayoutSubmit} className="space-y-4">
              {/* UTR / Transaction Reference Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  UTR / Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={payoutUtr}
                  onChange={(e) => setPayoutUtr(e.target.value)}
                  placeholder="e.g. 427819381029 or UPI-REF-9921"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Upload Screenshot / Receipt */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Proof of Payment Screenshot (PhonePe / GPay / Bank Receipt)
                </label>
                
                {payoutReceiptPreview ? (
                  <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 p-2 flex items-center justify-between">
                    <img src={payoutReceiptPreview} alt="Receipt Preview" className="h-20 w-20 object-cover rounded-xl" />
                    <div className="flex-1 px-3">
                      <p className="text-xs font-bold text-slate-700 truncate">{payoutReceiptFile?.name}</p>
                      <p className="text-[10px] text-slate-400">{(payoutReceiptFile?.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPayoutReceiptFile(null);
                        setPayoutReceiptPreview('');
                      }}
                      className="text-rose-500 hover:text-rose-700 p-2"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/20 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload className="h-7 w-7 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Click to upload payment screenshot</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG accepted</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPayoutReceiptFile(file);
                          setPayoutReceiptPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Cleared via PhonePe UPI transfer"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setApprovingPayout(null);
                    setPayoutReceiptFile(null);
                    setPayoutReceiptPreview('');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApproval}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  {submittingApproval ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm &amp; Clear Payout</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FULL RECEIPT PREVIEW MODAL ────────────────────────────────────── */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 px-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-emerald-400" /> Payment Proof Receipt Screenshot
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open original
                </a>
                <button
                  onClick={() => setViewingReceiptUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={viewingReceiptUrl}
                alt="Receipt screenshot"
                className="max-h-[70vh] w-auto rounded-xl object-contain shadow-lg"
              />
            </div>
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
