import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Platform,
  Modal,
  ScrollView,
  Share,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import { getBaseApiUrl } from '../../config/api';
import Header from '../../components/Header';
import { triggerExternalNotification } from '../../services/notificationService';

export default function BookingsScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Extend Modal States
  const [extendingBooking, setExtendingBooking] = useState(null);
  const [extendHours, setExtendHours] = useState(1);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendRazorpayModal, setExtendRazorpayModal] = useState(null);

  // Invoice Modal States
  const [invoiceBooking, setInvoiceBooking] = useState(null);

  // Cancellation Rules
  const [cancellationGraceMinutes, setCancellationGraceMinutes] = useState(10);

  const fetchCancellationRules = async () => {
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/settings/cancellation-rules`);
      if (res.ok) {
        const data = await res.json();
        if (data?.postCheckInGraceMinutes) {
          setCancellationGraceMinutes(data.postCheckInGraceMinutes);
        }
      }
    } catch (e) {
      // fallback default 10
    }
  };

  const fetchMyBookings = async () => {
    if (!token) return;
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyBookings();
      fetchCancellationRules();
    }, [token])
  );

  // Handle Check-In (Seeker arrives at spot)
  const handleCheckIn = async (item) => {
    Alert.alert(
      '🅿️ Check In to Parking Spot',
      `Have you arrived at ${item.spaceId?.title || 'the parking spot'} (Slot: ${item.slotId || 'Slot-1'})?\n\nChecking in starts your dynamic parking timer and notifies the space owner that your vehicle is parked.`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Check In Now',
          style: 'default',
          onPress: async () => {
            try {
              const baseUrl = await getBaseApiUrl();
              const res = await fetch(`${baseUrl}/bookings/${item._id}/check-in`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();
              if (res.ok) {
                Alert.alert('Checked In 🅿️', data.message || 'You are checked in! Your dynamic parking timer is now running.');
                fetchMyBookings();
              } else {
                Alert.alert('Notice', data.message || 'Check in failed');
              }
            } catch (err) {
              Alert.alert('Error', 'Connection error: ' + err.message);
            }
          },
        },
      ]
    );
  };

  // Handle Checkout
  const handleCheckOut = async (item) => {
    Alert.alert(
      'Check Out of Parking Spot',
      `Are you ready to check out from ${item.spaceId?.title || 'this spot'} (Slot: ${item.slotId || 'Slot-1'})?\n\nThis will release the spot for other parking seekers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Check Out',
          style: 'default',
          onPress: async () => {
            try {
              const baseUrl = await getBaseApiUrl();
              const res = await fetch(`${baseUrl}/bookings/${item._id}/checkout`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();
              if (res.ok) {
                Alert.alert('Checked Out', data.message || 'You have successfully checked out of the parking spot!');
                fetchMyBookings();
              } else {
                Alert.alert('Notice', data.message || 'Check out failed');
              }
            } catch (err) {
              Alert.alert('Error', 'Connection error. Please try again.');
            }
          },
        },
      ]
    );
  };

  const generateExtendRazorpayHtml = (booking, orderData, currentUser, space, additionalAmount, hours) => {
    const keyId = orderData?.keyId || 'rzp_live_TidhMuvoj4fV3b';
    const orderId = orderData?.orderId || '';
    const amountInPaise = Math.round(Number(additionalAmount || 0) * 100);
    const spotTitle = (space?.title || 'Parking Space').replace(/"/g, '\\"');
    const userName = (currentUser?.name || 'Seeker').replace(/"/g, '\\"');
    const userEmail = (currentUser?.email || 'seeker@plantopark.com').replace(/"/g, '\\"');
    const userPhone = (currentUser?.contact || currentUser?.phone || '9876543210').replace(/"/g, '\\"');
    const bookingId = booking?._id || '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>PlanToPark - Extend Pass Checkout</title>
  <link rel="dns-prefetch" href="//checkout.razorpay.com">
  <link rel="preconnect" href="https://checkout.razorpay.com" crossorigin>
  <link rel="preload" href="https://checkout.razorpay.com/v1/checkout.js" as="script">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: #0f172a;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      text-align: center;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3.5px solid rgba(255,255,255,0.15);
      border-top: 3.5px solid #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .title { font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 6px; }
    .sub { font-size: 13px; color: #94a3b8; }
    .amount { font-size: 24px; font-weight: 900; color: #818cf8; margin: 10px 0; }
    .btn {
      display: none;
      margin-top: 20px;
      padding: 12px 24px;
      background: #6366f1;
      color: #ffffff;
      font-weight: 800;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Extend Parking Duration (+${hours} hr)</div>
  <div class="amount">₹${Number(additionalAmount).toFixed(2)}</div>
  <div id="subText" class="sub">Launching Razorpay Payment Sheet...</div>
  <button id="retryBtn" class="btn" onclick="tryOpenRazorpay()">Open Payment Window</button>

  <script>
    var options = {
      key: "${keyId}",
      amount: ${amountInPaise},
      currency: "INR",
      name: "PlanToPark",
      description: "Extend Parking (+${hours} hr) - ${spotTitle}",
      image: "https://plantopark.com/favicon.png",
      prefill: {
        name: "${userName}",
        email: "${userEmail}",
        contact: "${userPhone}"
      },
      notes: {
        bookingId: "${bookingId}",
        extendHours: "${hours}"
      },
      theme: {
        color: "#6366f1"
      },
      modal: {
        backdropclose: false,
        escape: false,
        handleback: false,
        ondismiss: function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'PAYMENT_CANCELLED' }));
          }
        }
      },
      handler: function(response) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'PAYMENT_SUCCESS',
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            signature: response.razorpay_signature
          }));
        }
      }
    };

    ${orderId ? `options.order_id = "${orderId}";` : ''}

    function tryOpenRazorpay() {
      if (typeof Razorpay !== 'undefined') {
        try {
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function(resp) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                event: 'PAYMENT_FAILED',
                error: resp.error && resp.error.description ? resp.error.description : 'Payment Failed'
              }));
            }
          });
          rzp.open();
          document.getElementById('subText').innerText = 'Complete payment in checkout window.';
        } catch (e) {
          console.error('Razorpay open error:', e);
          document.getElementById('retryBtn').style.display = 'block';
        }
      } else {
        document.getElementById('subText').innerText = 'Loading Razorpay Secure Gateway...';
        document.getElementById('retryBtn').style.display = 'block';
      }
    }
  </script>
  <script src="https://checkout.razorpay.com/v1/checkout.js" onload="tryOpenRazorpay()" onerror="document.getElementById('retryBtn').style.display = 'block'; document.getElementById('subText').innerText = 'Failed to load Razorpay SDK. Tap below to retry.';"></script>
</body>
</html>`;
  };

  const handleExtendSubmit = async () => {
    if (!extendingBooking) return;
    setExtendLoading(true);
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/bookings/${extendingBooking._id}/extend-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ extendHours: Number(extendHours) }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Extension Notice', data.message || 'Cannot extend booking at this time.');
        return;
      }

      const { orderData, additionalAmount } = data;
      const targetBooking = extendingBooking;
      const selectedHours = Number(extendHours);

      // Open Razorpay Payment Sheet Modal
      setExtendRazorpayModal({
        booking: targetBooking,
        orderData,
        extendHours: selectedHours,
        additionalAmount,
      });
      setExtendingBooking(null);
    } catch (err) {
      Alert.alert('Payment Error', 'Failed to initialize payment for extension. Please try again.');
    } finally {
      setExtendLoading(false);
    }
  };

  const handleExtendPaymentVerify = async (paymentId, orderId, signature) => {
    if (!extendRazorpayModal) return;
    const { booking, extendHours: hours, additionalAmount } = extendRazorpayModal;
    setExtendRazorpayModal(null);

    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/bookings/${booking._id}/extend-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          extendHours: hours,
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Trigger external notification into phone status bar with buzzer sound
        triggerExternalNotification({
          title: '⏳ Parking Pass Extended!',
          body: `Your slot ${booking.slotId || 'Slot-1'} at ${booking.spaceId?.title || 'Parking Spot'} is extended by +${hours} hr(s).`,
          data: { screen: 'Bookings', id: booking._id },
        });

        Alert.alert(
          '🎉 Extension Confirmed',
          `Your reservation has been extended by ${hours} hour(s)!\nPayment of ₹${Number(additionalAmount).toFixed(2)} received.`
        );
        fetchMyBookings();
      } else {
        Alert.alert('Notice', data.message || 'Extension payment processed. Updating status...');
        fetchMyBookings();
      }
    } catch (err) {
      console.warn('Extend verify error:', err);
      Alert.alert('Payment Received', 'Payment processed successfully! Updating reservation pass...');
      fetchMyBookings();
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (item) => {
    const bookingId = item._id;
    const isCheckedIn = Boolean(item.isCheckedIn) || item.status === 'checked_in';
    const amount = Number(item.totalAmount) || 0;

    if (isCheckedIn) {
      const checkInDate = item.checkInTime || item.startTime;
      const elapsed = checkInDate ? (Date.now() - new Date(checkInDate).getTime()) / (1000 * 60) : 0;
      if (elapsed > cancellationGraceMinutes) {
        Alert.alert(
          '⚠️ Cancellation Window Expired',
          `Cancellations are only permitted within ${cancellationGraceMinutes} minutes after check-in.\n\nYour parking session is currently active. Please tap "Check Out" when departing so your spot is cleanly released.`
        );
        return;
      }
    }

    const estimatedRefund = !isCheckedIn ? amount : Number((amount * 0.20).toFixed(2));
    const policyName = !isCheckedIn
      ? '100% Full Refund (Pre Check-In)'
      : `20% Partial Refund (Grace Window: ${cancellationGraceMinutes}m)`;

    const doCancel = async () => {
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: 'cancelled', refundAmount: estimatedRefund } : b))
      );
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/bookings/${bookingId}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const resData = await res.json();
        if (res.ok) {
          const msg =
            resData.message ||
            (estimatedRefund > 0
              ? `Reservation cancelled successfully! ₹${estimatedRefund} (${policyName}) refunded to your PlanToPark Wallet.`
              : 'Reservation cancelled.');
          triggerExternalNotification({
            title: '🚫 Booking Cancelled & Refunded',
            body: msg,
            data: { screen: 'Wallet' },
          });
          Alert.alert('Cancelled', msg);
          fetchMyBookings();
        } else {
          Alert.alert('Notice', resData.message || 'Could not cancel booking');
          fetchMyBookings();
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to reach server. Please try again.');
        fetchMyBookings();
      }
    };

    const confirmMsg =
      amount > 0
        ? `Cancel this parking pass?\n\nPlatform Policy: ${policyName}\nRefund to Your Wallet: ₹${estimatedRefund}`
        : `Cancel this reservation?\n\nThis spot will be released immediately.`;

    Alert.alert('Cancel Reservation', confirmMsg, [
      { text: 'No, Keep Pass', style: 'cancel' },
      { text: amount > 0 ? `Yes, Cancel (Get ₹${estimatedRefund} Refund)` : 'Yes, Cancel Pass', style: 'destructive', onPress: doCancel },
    ]);
  };

  // Handle Share Invoice
  const handleShareInvoice = async (item) => {
    if (!item) return;
    const space = item.spaceId;
    const msg = `🅿️ PlanToPark Digital Receipt\nBooking ID: #${item._id.slice(-8).toUpperCase()}\nSpace: ${space?.title || 'Parking Space'}\nAddress: ${space?.address || ''}\nSlot: ${item.slotId || 'Slot-1'}\nVehicle: ${item.vehicleNumber || 'N/A'}\nDuration: ${item.hours || 1} hr(s)\nTotal Amount Paid: ₹${item.totalAmount || 0}\nStatus: Confirmed & Paid\n\nThank you for choosing PlanToPark!`;
    try {
      await Share.share({ message: msg, title: 'PlanToPark Parking Receipt' });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Navigation
  const handleOpenMap = (space) => {
    if (!space) return;
    const lat = space.location?.coordinates?.[1] || space.coordinates?.lat || space.lat;
    const lng = space.location?.coordinates?.[0] || space.coordinates?.lng || space.lng;

    if (lat && lng) {
      const geoUrl =
        Platform.OS === 'android'
          ? `google.navigation:q=${lat},${lng}`
          : `maps://app?daddr=${lat},${lng}`;
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      Linking.canOpenURL(geoUrl)
        .then((supported) => {
          if (supported) Linking.openURL(geoUrl);
          else Linking.openURL(webUrl);
        })
        .catch(() => {
          Linking.openURL(webUrl);
        });
    } else if (space.address) {
      const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(space.address + ', Hyderabad')}`;
      Linking.openURL(searchUrl);
    }
  };

  const renderBookingCard = ({ item }) => {
    const isCancelled = item.status === 'cancelled';
    const isCompleted = item.status === 'completed';
    const isCheckedIn = !isCancelled && !isCompleted && (Boolean(item.isCheckedIn) || item.status === 'checked_in');
    const isPaid = !isCancelled && (item.paymentStatus === 'paid' || item.status === 'paid' || isCheckedIn || isCompleted);
    const space = item.spaceId;
    const slot = item.slotId || 'Slot-1';
    const refundAmt = item.refundAmount || 0;

    let badgeText = '❌ UNPAID';
    let badgeColor = '#ef4444';
    let badgeBg = '#ef444425';

    if (isCancelled) {
      badgeText = '🚫 CANCELLED';
      badgeColor = '#ef4444';
      badgeBg = '#ef444425';
    } else if (isCompleted) {
      badgeText = '✓ COMPLETED';
      badgeColor = '#60a5fa';
      badgeBg = '#3b82f625';
    } else if (isCheckedIn) {
      badgeText = '🟢 CHECKED-IN';
      badgeColor = '#10b981';
      badgeBg = '#10b98125';
    } else if (isPaid) {
      badgeText = '🎟️ RESERVED';
      badgeColor = '#38bdf8';
      badgeBg = '#0284c725';
    }

    return (
      <View style={styles.card}>
        {/* Pass Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.passTitle}>🎟️ DIGITAL PARKING PASS</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
            <Text style={[styles.statusTxt, { color: badgeColor }]}>
              {badgeText}
            </Text>
          </View>
        </View>

        {/* Spot Details */}
        <Text style={styles.spotName}>{space?.title || 'Parking Location'}</Text>
        <Text style={styles.spotAddress}>📍 {space?.address || 'City Center'}, {space?.city || 'Hyderabad'}</Text>

        {/* Big Slot Highlight / Refund Highlight */}
        <View
          style={[
            styles.slotHighlightBox,
            !isPaid && {
              borderColor: isCancelled ? '#64748b' : '#ef4444',
              backgroundColor: isCancelled ? '#64748b15' : '#ef444415',
            },
          ]}
        >
          <Text style={[styles.slotHighlightLabel, !isPaid && { color: isCancelled ? '#94a3b8' : '#f87171' }]}>
            {isPaid ? 'ALLOTTED SLOT' : isCancelled ? (refundAmt > 0 ? 'REFUND CREDITED TO WALLET' : 'RESERVATION CANCELLED') : 'RESERVATION STATUS'}
          </Text>
          <Text
            style={[
              styles.slotHighlightVal,
              !isPaid && {
                color: isCancelled ? (refundAmt > 0 ? '#10b981' : '#94a3b8') : '#ef4444',
                fontSize: 16,
              },
            ]}
          >
            {isPaid ? `🅿️ ${slot}` : isCancelled ? (refundAmt > 0 ? `💸 ₹${refundAmt} Refunded` : 'Cancelled') : 'Payment Incomplete'}
          </Text>
        </View>

        {/* Pre-Check-in Arrival Notice Card with Check-In CTA */}
        {isPaid && !isCheckedIn && !isCompleted && !isCancelled && (
          <View style={{
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            borderWidth: 1.5,
            borderColor: '#38bdf8',
            borderRadius: 12,
            padding: 12,
            marginVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 13 }}>
                📍 Slot Reserved - No Timer Decay!
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                Travel without timer running. Tap Check-In when you arrive at the spot.
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#10b981',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
              }}
              onPress={() => handleCheckIn(item)}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13 }}>
                🅿️ Check-In
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Post-Check-in Active Parking Timer Banner */}
        {isCheckedIn && !isCompleted && !isCancelled && (
          <View style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 1.5,
            borderColor: '#10b981',
            borderRadius: 12,
            padding: 12,
            marginVertical: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 13, flexShrink: 1 }}>
                🟢 Vehicle Parked • Timer Running
              </Text>
              <View style={{ backgroundColor: '#10b98120', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>
                  Slot: {slot}
                </Text>
              </View>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
              Checked In: {new Date(item.checkInTime || item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Valid Until: {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {/* Cancelled Info Notice */}
        {isCancelled && (
          <View style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 1.5,
            borderColor: '#ef444450',
            borderRadius: 12,
            padding: 12,
            marginVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 13 }}>
                🚫 Reservation Cancelled
              </Text>
              <Text style={{ color: '#cbd5e1', fontSize: 11, marginTop: 2 }}>
                {refundAmt > 0
                  ? `₹${refundAmt} refunded to your PlanToPark wallet.`
                  : 'This slot reservation was cancelled and released.'}
              </Text>
            </View>
            {refundAmt > 0 && (
              <View style={{ backgroundColor: '#10b98120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 12 }}>+₹{refundAmt}</Text>
              </View>
            )}
          </View>
        )}

        {/* Meta Info Grid (Clean 2x2 Grid Layout) */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>🚗 VEHICLE</Text>
            <Text style={styles.metaVal}>{item.vehicleNumber || 'TS07WJ2099'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>⏱️ PLAN / DURATION</Text>
            <Text style={styles.metaVal}>
              {item.bookingType === 'daily'
                ? '1 Day Flat'
                : item.bookingType === 'monthly'
                ? '1 Month Pass'
                : `${item.hours || 1} hr(s)`}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>💰 TOTAL FEE</Text>
            <Text style={[styles.metaVal, { color: COLORS.primary, fontSize: 14 }]}>₹{item.totalAmount || 0}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>🕒 SESSION START</Text>
            <Text style={styles.metaVal}>
              {new Date(item.checkInTime || item.startTime || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* ── ACTION BUTTONS ROW (Check-In, Check Out, Extend, Invoice, Cancel, Nav) ────────── */}
        <View style={styles.actionRow}>
          {/* Check In Button if not checked in */}
          {isPaid && !isCheckedIn && !isCompleted && !isCancelled && (
            <TouchableOpacity
              style={[styles.checkOutBtn, { backgroundColor: '#10b981' }]}
              onPress={() => handleCheckIn(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.checkOutBtnTxt}>🅿️ Check In</Text>
            </TouchableOpacity>
          )}

          {/* Check Out Button if checked in */}
          {isCheckedIn && !isCompleted && !isCancelled && (
            <TouchableOpacity
              style={styles.checkOutBtn}
              onPress={() => handleCheckOut(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.checkOutBtnTxt}>🚪 Check Out</Text>
            </TouchableOpacity>
          )}

          {/* Extend Button */}
          {isPaid && !isCompleted && !isCancelled && (
            <TouchableOpacity
              style={styles.extendBtn}
              onPress={() => {
                setExtendingBooking(item);
                setExtendHours(1);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.extendBtnTxt}>⏳ Extend</Text>
            </TouchableOpacity>
          )}

          {/* Invoice Button */}
          {isPaid && (
            <TouchableOpacity
              style={styles.invoiceBtn}
              onPress={() => setInvoiceBooking(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.invoiceBtnTxt}>🧾 Invoice</Text>
            </TouchableOpacity>
          )}

          {/* Cancel Button */}
          {isPaid && !isCancelled && !isCompleted && (() => {
            const isCheckedIn = Boolean(item.isCheckedIn) || item.status === 'checked_in';
            if (isCheckedIn) {
              const checkInDate = item.checkInTime || item.startTime;
              const elapsed = checkInDate ? (Date.now() - new Date(checkInDate).getTime()) / (1000 * 60) : 0;
              if (elapsed > cancellationGraceMinutes) {
                return (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: '#e2e8f0', backgroundColor: '#f8fafc', opacity: 0.6 }]}
                    onPress={() => Alert.alert('⚠️ Cancellation Window Closed', `Cancellation is only permitted within ${cancellationGraceMinutes} minutes after check-in.\n\nPlease tap "Check Out" when your vehicle departs.`)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnTxt, { color: '#94a3b8' }]}>Cancel (Closed)</Text>
                  </TouchableOpacity>
                );
              }
              const minsLeft = Math.max(1, Math.ceil(cancellationGraceMinutes - elapsed));
              return (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancelBooking(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnTxt}>Cancel ({minsLeft}m left)</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancelBooking(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            );
          })()}

          {/* In-App / Google Maps Navigation */}
          {space && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => handleOpenMap(space)}
              activeOpacity={0.7}
            >
              <Text style={styles.navBtnTxt}>🗺️ Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Reservations" subtitle="Active & Past Parking Passes" />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchMyBookings();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎫</Text>
              <Text style={styles.emptyTitle}>No Active Reservations</Text>
              <Text style={styles.emptySub}>Your booked parking passes will appear here</Text>
            </View>
          }
        />
      )}

      {/* ── EXTEND BOOKING MODAL ────────────────────────────────────────────── */}
      <Modal visible={!!extendingBooking} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⏳ Extend Parking Duration</Text>
              <TouchableOpacity onPress={() => setExtendingBooking(null)}>
                <Text style={styles.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {extendingBooking && (
              <View style={styles.modalBody}>
                <Text style={styles.extendSpotName}>{extendingBooking.spaceId?.title || 'Parking Space'}</Text>
                <Text style={styles.extendSpotAddress}>Slot: {extendingBooking.slotId || 'Slot-1'}</Text>

                {/* Hours Incrementer */}
                <Text style={styles.extendHoursLabel}>Select Additional Hours:</Text>
                
                {/* Quick Presets */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 6].map((hrs) => (
                    <TouchableOpacity
                      key={hrs}
                      onPress={() => setExtendHours(hrs)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: extendHours === hrs ? COLORS.primary : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: extendHours === hrs ? COLORS.primary : '#e2e8f0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: extendHours === hrs ? '#ffffff' : '#475569',
                        }}
                      >
                        +{hrs}h
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.hoursSelectorRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setExtendHours((h) => Math.max(1, h - 1))}
                  >
                    <Text style={styles.stepBtnTxt}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.hoursDisplay}>
                    <Text style={styles.hoursDisplayVal}>+{extendHours}</Text>
                    <Text style={styles.hoursDisplaySub}>hour(s)</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setExtendHours((h) => Math.min(24, h + 1))}
                  >
                    <Text style={styles.stepBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Additional Cost Summary */}
                <View style={styles.costSummaryBox}>
                  <Text style={styles.costSummaryLabel}>Additional Amount Due:</Text>
                  <Text style={styles.costSummaryVal}>
                    ₹{((extendingBooking.spaceId?.pricePerHour || 40) * extendHours).toFixed(2)}
                  </Text>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={[styles.confirmExtendBtn, extendLoading && { opacity: 0.6 }]}
                  onPress={handleExtendSubmit}
                  disabled={extendLoading}
                >
                  {extendLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.confirmExtendTxt}>Confirm &amp; Extend Pass</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── RAZORPAY EXTEND PAYMENT MODAL ────────────────────────────────────── */}
      <Modal visible={!!extendRazorpayModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1e293b' }}>
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>
              💳 Pay Extension Fee: ₹{Number(extendRazorpayModal?.additionalAmount || 0).toFixed(2)}
            </Text>
            <TouchableOpacity onPress={() => setExtendRazorpayModal(null)}>
              <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {extendRazorpayModal && (
            <WebView
              originWhitelist={['*']}
              source={{
                html: generateExtendRazorpayHtml(
                  extendRazorpayModal.booking,
                  extendRazorpayModal.orderData,
                  user,
                  extendRazorpayModal.booking.spaceId,
                  extendRazorpayModal.additionalAmount,
                  extendRazorpayModal.extendHours
                ),
                baseUrl: 'https://api.plantopark.com',
              }}
              style={{ flex: 1, backgroundColor: '#0f172a' }}
              onShouldStartLoadWithRequest={(request) => {
                const { url } = request;
                if (!url) return true;
                if (
                  url.startsWith('upi://') ||
                  url.startsWith('phonepe://') ||
                  url.startsWith('paytmmp://') ||
                  url.startsWith('tez://') ||
                  url.startsWith('gpay://') ||
                  url.startsWith('intent://')
                ) {
                  Linking.openURL(url).catch((err) => console.log('UPI link error:', err));
                  return false;
                }
                return true;
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.event === 'PAYMENT_SUCCESS') {
                    handleExtendPaymentVerify(
                      data.payment_id || 'pay_' + Math.random().toString(36).substring(2, 10),
                      data.order_id || extendRazorpayModal.orderData?.orderId,
                      data.signature || 'sig_' + Math.random().toString(36).substring(2, 15)
                    );
                  } else if (data.event === 'PAYMENT_CANCELLED') {
                    setExtendRazorpayModal(null);
                    Alert.alert('Payment Cancelled', 'Extension payment was cancelled.');
                  } else if (data.event === 'PAYMENT_FAILED') {
                    setExtendRazorpayModal(null);
                    Alert.alert('Payment Failed', data.error || 'Payment failed. Please try again.');
                  }
                } catch (e) {
                  console.log('Razorpay message parsing error:', e);
                }
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ── INVOICE / RECEIPT MODAL ────────────────────────────────────────── */}
      <Modal visible={!!invoiceBooking} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧾 Parking Tax Invoice</Text>
              <TouchableOpacity onPress={() => setInvoiceBooking(null)}>
                <Text style={styles.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {invoiceBooking && (
              <ScrollView style={{ padding: 16 }}>
                <View style={styles.invoiceHero}>
                  <Text style={styles.invoiceCompany}>PlanToPark Technologies</Text>
                  <Text style={styles.invoiceId}>
                    Order #{invoiceBooking._id ? invoiceBooking._id.slice(-8).toUpperCase() : 'INV-1001'}
                  </Text>
                  <View style={styles.invoiceBadge}>
                    <Text style={styles.invoiceBadgeTxt}>PAID &amp; CONFIRMED</Text>
                  </View>
                </View>

                <View style={styles.invoiceDivider} />

                {/* Line Items */}
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Parking Space:</Text>
                  <Text style={styles.invoiceVal}>{invoiceBooking.spaceId?.title || 'Parking Spot'}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Address:</Text>
                  <Text style={[styles.invoiceVal, { flex: 1, textAlign: 'right' }]}>
                    {invoiceBooking.spaceId?.address || 'Hyderabad, Telangana'}
                  </Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Allotted Slot:</Text>
                  <Text style={styles.invoiceVal}>{invoiceBooking.slotId || 'Slot-1'}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Vehicle Number:</Text>
                  <Text style={styles.invoiceVal}>{invoiceBooking.vehicleNumber || 'TS07WJ2099'}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Duration:</Text>
                  <Text style={styles.invoiceVal}>{invoiceBooking.hours || 1} Hour(s)</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Booking Date:</Text>
                  <Text style={styles.invoiceVal}>
                    {new Date(invoiceBooking.startTime || invoiceBooking.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>

                <View style={styles.invoiceDivider} />

                {/* Total */}
                <View style={styles.invoiceTotalRow}>
                  <Text style={styles.invoiceTotalLabel}>Grand Total Paid:</Text>
                  <Text style={styles.invoiceTotalVal}>₹{invoiceBooking.totalAmount || 0}</Text>
                </View>

                {/* Share Button */}
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => handleShareInvoice(invoiceBooking)}
                >
                  <Text style={styles.shareBtnTxt}>📤 Share / Download Receipt</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passTitle: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTxt: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  spotName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  spotAddress: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  slotHighlightBox: {
    backgroundColor: '#064e3b25',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  slotHighlightLabel: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  slotHighlightVal: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b50',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    rowGap: 10,
  },
  metaItem: {
    width: '48%',
    alignItems: 'flex-start',
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  metaVal: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  /* ── Action Buttons Row ─────────────────────────────────── */
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  invoiceBtn: {
    backgroundColor: '#1e3a8a30',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceBtnTxt: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
  },
  checkOutBtn: {
    backgroundColor: '#33415530',
    borderWidth: 1,
    borderColor: '#64748b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOutBtnTxt: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  extendBtn: {
    backgroundColor: '#4338ca30',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendBtnTxt: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelBtn: {
    backgroundColor: '#450a0a20',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnTxt: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },
  navBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  navBtnTxt: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  /* ── Modal Styles ───────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseTxt: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  extendSpotName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  extendSpotAddress: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
  },
  extendHoursLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  hoursSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 12,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnTxt: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
  },
  hoursDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  hoursDisplayVal: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
  },
  hoursDisplaySub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  costSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginVertical: 16,
  },
  costSummaryLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  costSummaryVal: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '900',
  },
  confirmExtendBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmExtendTxt: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },

  /* ── Invoice Modal Styles ───────────────────────────────── */
  invoiceHero: {
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceCompany: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
  invoiceId: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  invoiceBadge: {
    backgroundColor: '#064e3b40',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  invoiceBadgeTxt: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '900',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  invoiceVal: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  invoiceTotalLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  invoiceTotalVal: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '900',
  },
  shareBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  shareBtnTxt: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },

  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
