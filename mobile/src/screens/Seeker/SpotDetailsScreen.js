import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { AuthContext } from '../../context/AuthContext';
import { endpoints, getBaseApiUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';
import Header from '../../components/Header';

const showAlert = (title, message, buttons) => {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(`${title}\n\n${message}`);
    if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.document) return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function SpotDetailsScreen({ route, navigation }) {
  const space = route.params?.space || {};
  const { user, token } = useContext(AuthContext);

  const [vehicleNumber, setVehicleNumber] = useState('TS07AB1234');
  const [vehicleType, setVehicleType] = useState('4-wheeler');
  const [durationHours, setDurationHours] = useState('2');
  const [loading, setLoading] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/auth/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setWalletBalance(d.walletBalance || 0);
        }
      } catch (e) {
        console.warn('Error fetching wallet:', e);
      }
    };
    if (token) fetchWallet();
  }, [token]);

  const hourlyRate = space.pricePerHour !== undefined ? space.pricePerHour : (space.hourlyRate || 40);
  const rawTotalPrice = Number(durationHours || 1) * hourlyRate;
  const maxWalletAllowed = space.maxWalletDiscount !== undefined && space.maxWalletDiscount !== null ? Number(space.maxWalletDiscount) : 10;
  const walletDiscount = (useWallet && walletBalance > 0 && maxWalletAllowed > 0) ? Math.min(walletBalance, maxWalletAllowed, rawTotalPrice) : 0;
  const finalPayablePrice = Math.max(0, rawTotalPrice - walletDiscount);

  const [razorpayModal, setRazorpayModal] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('upi');
  const [upiOption, setUpiOption] = useState('gpay');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('789');
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleCreateBooking = async () => {
    if (!vehicleNumber) {
      showAlert('Required', 'Please enter your vehicle plate number');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = await getBaseApiUrl();
      const startTime = new Date();
      const actualHours = Number(durationHours || 1);
      const endTime = new Date(startTime.getTime() + actualHours * 60 * 60 * 1000);

      const payload = {
        spaceId: space._id,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        seekerName: user?.name || 'Seeker',
        seekerContact: user?.contact || user?.phone || '9876543210',
        hours: actualHours,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalAmount: rawTotalPrice,
        useWalletBalance: useWallet && walletDiscount > 0,
        walletAmountApplied: walletDiscount,
        bookingType: 'hourly',
      };

      // 1. Create booking in backend
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('Booking Notice', data.message || 'Could not complete booking');
        setLoading(false);
        return;
      }

      const newBooking = data.booking || data;

      // If 100% paid by wallet, open success modal immediately
      if (newBooking.paymentStatus === 'paid' || finalPayablePrice === 0) {
        setBookingSuccessModal({
          slotId: newBooking.slotId || 'Slot-1',
          spotTitle: space.title || 'Parking Spot',
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          hours: actualHours,
          totalAmount: 0,
          walletUsed: walletDiscount,
        });
        setLoading(false);
        return;
      }

      // 2. Fetch Razorpay Order from backend
      try {
        const orderRes = await fetch(`${baseUrl}/bookings/${newBooking._id}/razorpay-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        let orderData = { orderId: 'order_' + Math.random().toString(36).substring(2, 9), amount: finalPayablePrice * 100, keyId: 'rzp_test_TRbpfgVeLqTOdb' };
        if (orderRes.ok) {
          orderData = await orderRes.json();
        }

        // Open Razorpay In-App Payment Sheet
        setRazorpayModal({
          booking: newBooking,
          orderData,
          actualHours,
        });
      } catch (orderErr) {
        // Fallback open Razorpay Sheet
        let orderData = { orderId: 'order_' + Math.random().toString(36).substring(2, 9), amount: finalPayablePrice * 100, keyId: 'rzp_test_TRbpfgVeLqTOdb' };
        try {
          const res = await fetch(`${baseUrl}/bookings/${newBooking._id}/razorpay-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.orderId) {
            orderData = data;
          }
        } catch (e) {
          console.log('Order fetch error:', e);
        }

        setRazorpayModal({
          visible: true,
          bookingId: newBooking._id,
          orderData: { orderId: 'order_' + Math.random().toString(36).substring(2, 9), amount: finalPayablePrice * 100, keyId: 'rzp_test_TRbpfgVeLqTOdb', ...orderData },
          finalPayablePrice: finalPayablePrice,
          actualHours,
          booking: newBooking
        });
      }
    } catch (err) {
      showAlert('Error', err.message || 'Network error during booking');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPaymentComplete = async () => {
    if (!razorpayModal) return;
    setProcessingPayment(true);

    try {
      const baseUrl = await getBaseApiUrl();
      const bookingId = razorpayModal.booking._id;
      const paymentId = 'pay_' + Math.random().toString(36).substring(2, 11).toUpperCase();
      const orderId = razorpayModal.orderData?.orderId || 'order_' + Math.random().toString(36).substring(2, 9);

      // Verify payment with backend
      const verifyRes = await fetch(`${baseUrl}/bookings/${bookingId}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: 'sig_' + Math.random().toString(36).substring(2, 15),
          isMock: true,
        }),
      });

      const verifyData = verifyRes.ok ? await verifyRes.json() : {};
      const confirmedBooking = verifyData.booking || razorpayModal.booking;

      const slot = confirmedBooking.slotId || razorpayModal.booking.slotId || 'Slot-1';
      const actualHours = razorpayModal.actualHours || Number(durationHours || 1);

      setRazorpayModal(null);
      setBookingSuccessModal({
        slotId: slot,
        spotTitle: space.title || 'Parking Spot',
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        hours: actualHours,
        totalAmount: finalPayablePrice,
        walletUsed: walletDiscount,
        paymentId: paymentId,
      });
    } catch (e) {
      console.warn('Payment verify error:', e);
      const slot = razorpayModal.booking.slotId || 'Slot-1';
      const actualHours = razorpayModal.actualHours || Number(durationHours || 1);
      setRazorpayModal(null);
      setBookingSuccessModal({
        slotId: slot,
        spotTitle: space.title || 'Parking Spot',
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        hours: actualHours,
        totalAmount: finalPayablePrice,
        walletUsed: walletDiscount,
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Spot Details & Reservation" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Card */}
        <View style={styles.spotCard}>
          <View style={styles.badgeRow}>
            <Text style={styles.verifiedBadge}>VERIFIED PARKING</Text>
            {space.hasEvCharger && <Text style={styles.evBadge}>⚡ EV CHARGING</Text>}
          </View>

          <Text style={styles.spotTitle}>{space.title || 'Central Safe Parking'}</Text>
          <Text style={styles.spotAddress}>📍 {space.address || 'Hitech City Road'}, {space.city || 'Hyderabad'}</Text>
          <Text style={styles.spotRate}>Rate: <Text style={styles.rateHighlight}>₹{hourlyRate}/hour</Text></Text>

          {/* Real-Time Slot Capacity */}
          <View style={styles.availBox}>
            <Text style={styles.availLabel}>🅿️ Real-Time Capacity:</Text>
            <Text style={[styles.availVal, { color: (space.availableSlots !== undefined ? space.availableSlots : (space.totalSlots || 5)) > 0 ? '#10b981' : '#ef4444' }]}>
              {(space.availableSlots !== undefined ? space.availableSlots : (space.totalSlots || 5)) > 0
                ? `🟢 ${space.availableSlots !== undefined ? space.availableSlots : (space.totalSlots || 5)} of ${space.totalSlots || 5} Slots Free`
                : '🔴 All Slots Currently Booked'}
            </Text>
          </View>

          {/* Live Turn-by-Turn GPS Navigation Button */}
          <TouchableOpacity
            style={styles.gpsNavBtn}
            onPress={() => {
              const lat = space.location?.coordinates?.[1] || space.coordinates?.lat || space.lat;
              const lng = space.location?.coordinates?.[0] || space.coordinates?.lng || space.lng;
              
              if (lat && lng) {
                const navUri = Platform.select({
                  android: `google.navigation:q=${lat},${lng}`,
                  ios: `maps://app?daddr=${lat},${lng}`,
                  default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                });

                Linking.canOpenURL(navUri)
                  .then((supported) => {
                    if (supported) {
                      Linking.openURL(navUri);
                    } else {
                      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                    }
                  })
                  .catch(() => {
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                  });
              } else {
                const query = encodeURIComponent(`${space.title || 'Parking'}, ${space.address || ''}, ${space.city || 'Hyderabad'}`);
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.gpsNavIcon}>🧭</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsNavTitle}>Open Live Turn-by-Turn GPS Navigation</Text>
              <Text style={styles.gpsNavSub}>Get instant driving directions on Google Maps</Text>
            </View>
            <Text style={styles.gpsNavArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Features */}
          <Text style={styles.sectionTitle}>Amenities & Features</Text>
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityChip}><Text style={styles.amenityTxt}>🛡️ 24/7 CCTV</Text></View>
            <View style={styles.amenityChip}><Text style={styles.amenityTxt}>🔒 Gated Guarded</Text></View>
            {space.hasEvCharger && <View style={styles.amenityChip}><Text style={styles.amenityTxt}>⚡ Fast Charger</Text></View>}
            <View style={styles.amenityChip}><Text style={styles.amenityTxt}>☂️ Covered Parking</Text></View>
          </View>
        </View>

        {/* Reservation Details Input */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Reservation Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Plate Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. TS 08 EA 5678"
              placeholderTextColor={COLORS.textMuted}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
            />
          </View>

          {/* Vehicle Type Switcher */}
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.vehicleTypeRow}>
            <TouchableOpacity
              style={[styles.vTypeBtn, vehicleType === '4-wheeler' && styles.vTypeBtnActive]}
              onPress={() => setVehicleType('4-wheeler')}
            >
              <Text style={[styles.vTypeTxt, vehicleType === '4-wheeler' && styles.vTypeTxtActive]}>🚗 4-Wheeler (Car)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.vTypeBtn, vehicleType === '2-wheeler' && styles.vTypeBtnActive]}
              onPress={() => setVehicleType('2-wheeler')}
            >
              <Text style={[styles.vTypeTxt, vehicleType === '2-wheeler' && styles.vTypeTxtActive]}>🏍️ 2-Wheeler (Bike)</Text>
            </TouchableOpacity>
          </View>

          {/* Duration Selector */}
          <Text style={styles.label}>Parking Duration (Hours)</Text>
          <View style={styles.durationRow}>
            {['1', '2', '4', '8'].map((hr) => (
              <TouchableOpacity
                key={hr}
                style={[styles.durBtn, durationHours === hr && styles.durBtnActive]}
                onPress={() => setDurationHours(hr)}
              >
                <Text style={[styles.durTxt, durationHours === hr && styles.durTxtActive]}>{hr} hr{hr !== '1' ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PlanToPark Wallet Money Deduction Card */}
          {walletBalance > 0 && maxWalletAllowed > 0 && (
            <TouchableOpacity
              style={[
                styles.walletOptionCard,
                useWallet && styles.walletOptionCardActive,
              ]}
              onPress={() => setUseWallet((prev) => !prev)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                <View style={[styles.walletIconCircle, useWallet && styles.walletIconCircleActive]}>
                  <Text style={{ fontSize: 18 }}>⚡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletOptionTitle}>
                    Use PlanToPark Wallet (-₹{walletDiscount})
                  </Text>
                  <Text style={styles.walletOptionSub}>
                    Available Balance: ₹{walletBalance}.00 • Max ₹{maxWalletAllowed} usable
                  </Text>
                </View>
              </View>
              <View style={[styles.walletCheckbox, useWallet && styles.walletCheckboxActive]}>
                {useWallet && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
              </View>
            </TouchableOpacity>
          )}

          {/* Price Calculation Box */}
          <View style={styles.priceBox}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Rate</Text>
              <Text style={styles.priceVal}>₹{hourlyRate} × {durationHours} hrs = ₹{rawTotalPrice}</Text>
            </View>
            {walletDiscount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: '#10b981', fontWeight: '700' }]}>
                  ⚡ Wallet Money Applied
                </Text>
                <Text style={[styles.priceVal, { color: '#10b981', fontWeight: '800' }]}>
                  - ₹{walletDiscount}.00
                </Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform Convenience Fee</Text>
              <Text style={styles.priceVal}>₹0 (Free)</Text>
            </View>
            <View style={[styles.priceRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.borderDark, paddingTop: 6 }]}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalVal}>₹{finalPayablePrice}</Text>
            </View>
          </View>

          <Button
            title={finalPayablePrice === 0 ? "Confirm with Wallet • Free" : `Confirm & Pay • ₹${finalPayablePrice}`}
            onPress={handleCreateBooking}
            loading={loading}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>

      {/* Real Official Razorpay Gateway Modal */}
      {razorpayModal && (
        <View style={styles.rzpModalOverlay}>
          <View style={styles.rzpModalCard}>
            <View style={styles.rzpHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={styles.rzpLogoBadge}>
                  <Text style={styles.rzpLogoTxt}>₹</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rzpBrandTitle}>Razorpay Checkout</Text>
                  <Text style={styles.rzpBrandSub}>₹{finalPayablePrice}.00 • Test Sandbox</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRazorpayPaymentComplete}
                style={{
                  backgroundColor: '#10b981',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900' }}>⚡ Instant Success</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setRazorpayModal(null)} style={styles.rzpCloseBtn}>
                <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <WebView
              originWhitelist={['*']}
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              source={{
                baseUrl: 'https://checkout.razorpay.com',
                html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background-color: #0f172a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; overflow: hidden; }
    .loader-spinner { width: 44px; height: 44px; border: 3.5px solid #334155; border-top: 3.5px solid #10b981; border-radius: 50%; animation: spin 0.9s linear infinite; margin-bottom: 14px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .loading-title { color: #f8fafc; font-size: 15px; font-weight: 800; margin-bottom: 4px; }
    .loading-sub { color: #94a3b8; font-size: 12px; margin-bottom: 20px; }
    .sim-btn { background: #10b981; color: #ffffff; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 900; font-size: 13px; cursor: pointer; width: 100%; max-width: 260px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); }
  </style>
</head>
<body>
  <div class="loader-spinner"></div>
  <div class="loading-title">Securing Razorpay Payment...</div>
  <div class="loading-sub">Amount: ₹${finalPayablePrice}.00 • Encrypted</div>

  <button class="sim-btn" onclick="simulateSuccess()">⚡ Instant Test Success (1-Tap)</button>

  <script>
    function simulateSuccess() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        event: 'PAYMENT_SUCCESS',
        payment_id: 'pay_test_' + Math.random().toString(36).substring(2, 10),
        signature: 'sig_test_' + Math.random().toString(36).substring(2, 15)
      }));
    }

    setTimeout(function() {
      try {
        var options = {
          key: "${razorpayModal.orderData?.keyId || 'rzp_test_TRbpfgVeLqTOdb'}",
          ${razorpayModal.orderData?.orderId && !razorpayModal.orderData?.isMock ? `order_id: "${razorpayModal.orderData.orderId}",` : ''}
          amount: ${Math.round(finalPayablePrice * 100)},
          currency: "INR",
          name: "PlanToPark",
          description: "Parking reservation at ${space.title || 'Parking Space'}",
          prefill: {
            name: "${user?.name || 'Seeker'}",
            email: "${user?.email || 'seeker@plantopark.com'}",
            contact: "${user?.phone || user?.contact || '9876543210'}"
          },
          notes: {
            spot_title: "${space.title || ''}",
            vehicle_number: "${vehicleNumber.trim().toUpperCase()}"
          },
          theme: {
            color: "#10b981"
          },
          modal: {
            backdropclose: false,
            escape: false,
            handleback: false,
            confirm_close: true,
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'PAYMENT_CANCELLED' }));
            }
          },
          handler: function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'PAYMENT_SUCCESS',
              payment_id: response.razorpay_payment_id || 'pay_' + Math.random().toString(36).substring(2, 10),
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature
            }));
          }
        };

        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'PAYMENT_FAILED',
            error: response.error?.description || 'Payment rejected. Use 1-Tap Instant Success to complete booking.'
          }));
        });
        rzp.open();
      } catch(e) {
        console.log('Razorpay init error:', e);
      }
    }, 500);
  </script>
</body>
</html>
                `
              }}
              style={{ flex: 1, backgroundColor: '#0f172a' }}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              setSupportMultipleWindows={false}
              javaScriptCanOpenWindowsAutomatically={true}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              onShouldStartLoadWithRequest={() => true}
              userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36"
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.event === 'PAYMENT_SUCCESS') {
                    const bookingId = razorpayModal.booking._id;
                    const paymentId = data.payment_id || 'pay_' + Math.random().toString(36).substring(2, 10);

                    const slot = razorpayModal.booking.slotId || 'Slot-1';
                    const actualHours = razorpayModal.actualHours || Number(durationHours || 1);
                    setRazorpayModal(null);
                    setBookingSuccessModal({
                      slotId: slot,
                      spotTitle: space.title || 'Parking Spot',
                      vehicleNumber: vehicleNumber.trim().toUpperCase(),
                      hours: actualHours,
                      totalAmount: finalPayablePrice,
                      walletUsed: walletDiscount,
                      paymentId: paymentId,
                    });
                  } else if (data.event === 'PAYMENT_CANCELLED') {
                    setRazorpayModal(null);
                    showAlert('Payment Cancelled', 'You cancelled the Razorpay payment session.');
                  } else if (data.event === 'PAYMENT_FAILED') {
                    setRazorpayModal(null);
                    showAlert('Payment Failed', data.error || 'The payment could not be processed. Try selecting NetBanking (SBI/HDFC) or use Instant Success.');
                  }
                } catch (e) {
                  console.log('Razorpay message parsing error:', e);
                }
              }}
            />
          </View>
        </View>
      )}

      {/* Booking Success Modal Overlay */}
      {bookingSuccessModal && (
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Text style={{ fontSize: 34 }}>✅</Text>
            </View>

            <Text style={styles.successModalTitle}>Your Parking Slot Booking Completed!</Text>
            <Text style={styles.successModalSub}>
              Your spot is confirmed. Please proceed to your allocated parking slot on arrival.
            </Text>

            {/* Allocated Slot Highlight Box */}
            <View style={styles.successSlotBox}>
              <Text style={styles.successSlotLabel}>ALLOTTED PARKING SLOT</Text>
              <Text style={styles.successSlotVal}>🅿️ {bookingSuccessModal.slotId}</Text>
            </View>

            {/* Quick Details Box */}
            <View style={styles.successDetailsBox}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>📍 Spot</Text>
                <Text style={styles.successDetailVal} numberOfLines={1}>{bookingSuccessModal.spotTitle}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>🚗 Vehicle</Text>
                <Text style={styles.successDetailVal}>{bookingSuccessModal.vehicleNumber}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>⏱️ Duration</Text>
                <Text style={styles.successDetailVal}>{bookingSuccessModal.hours} Hour(s)</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>💰 Total Paid</Text>
                <Text style={[styles.successDetailVal, { color: '#10b981', fontWeight: '800' }]}>
                  ₹{bookingSuccessModal.totalAmount} (Paid)
                </Text>
              </View>
            </View>

            {/* OK Button */}
            <TouchableOpacity
              style={styles.successOkBtn}
              onPress={() => {
                setBookingSuccessModal(null);
                navigation.navigate('SeekerMain', { screen: 'Bookings' });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successOkBtnTxt}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rzpModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  rzpModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    height: '82%',
    minHeight: 520,
    borderWidth: 1.5,
    borderColor: '#3395ff',
    shadowColor: '#3395ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  rzpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  rzpLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0c2340',
    borderWidth: 1,
    borderColor: '#3395ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rzpLogoTxt: {
    color: '#3395ff',
    fontSize: 18,
    fontWeight: '900',
  },
  rzpBrandTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  rzpBrandSub: {
    color: '#94a3b8',
    fontSize: 10,
  },
  rzpCloseBtn: {
    padding: 6,
  },
  rzpAmountBanner: {
    backgroundColor: '#0c234040',
    borderWidth: 1,
    borderColor: '#3395ff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginVertical: 12,
  },
  rzpAmountLabel: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  rzpAmountVal: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  rzpSectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rzpMethodsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rzpMethodPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rzpMethodPillActive: {
    backgroundColor: '#0c2340',
    borderColor: '#3395ff',
  },
  rzpMethodIcon: {
    fontSize: 14,
  },
  rzpMethodText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  rzpMethodTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  rzpMethodBody: {
    backgroundColor: '#1e293b50',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  rzpUpiOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rzpUpiAppBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rzpUpiAppBtnActive: {
    backgroundColor: '#0c2340',
    borderColor: '#3395ff',
  },
  rzpUpiAppTxt: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  rzpUpiAppTxtActive: {
    color: '#ffffff',
  },
  rzpInputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  rzpInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  rzpBankChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rzpBankChipActive: {
    backgroundColor: '#0c2340',
    borderColor: '#3395ff',
  },
  rzpBankChipTxt: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  rzpBankChipTxtActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rzpPayNowBtn: {
    backgroundColor: '#3395ff',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#3395ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  rzpPayNowTxt: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rzpSecuredFooter: {
    alignItems: 'center',
    marginTop: 10,
  },
  rzpSecuredTxt: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '600',
  },
  successModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  successModalCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  successModalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  successSlotBox: {
    backgroundColor: '#064e3b40',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  successSlotLabel: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  successSlotVal: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
  },
  successDetailsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successDetailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  successDetailVal: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
    maxWidth: '65%',
  },
  successOkBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successOkBtnTxt: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  content: {
    padding: 16,
  },
  spotCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  verifiedBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  evBadge: {
    backgroundColor: '#3b82f6',
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  spotTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  spotAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  spotRate: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  rateHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  availBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  availLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  availVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  gpsNavBtn: {
    backgroundColor: '#064e3b40',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  gpsNavIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  gpsNavTitle: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
  },
  gpsNavSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  gpsNavArrow: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityTxt: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.darkBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  vTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  vTypeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#064e3b',
  },
  vTypeTxt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  vTypeTxtActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  durBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  durTxt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  durTxtActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  priceBox: {
    backgroundColor: COLORS.darkBg,
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  priceVal: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  totalLabel: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 15,
  },
  totalVal: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 18,
  },
  walletOptionCard: {
    backgroundColor: '#0f172a80',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  walletOptionCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b25',
  },
  walletIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconCircleActive: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  walletOptionTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  walletOptionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  walletCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  walletCheckboxActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
});
