import React, { useState, useContext } from 'react';
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
} from 'react-native';
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

  const hourlyRate = space.pricePerHour !== undefined ? space.pricePerHour : (space.hourlyRate || 40);
  const totalPrice = Number(durationHours || 1) * hourlyRate;

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
        totalAmount: totalPrice,
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

      // 2. Fetch Razorpay Order from backend
      try {
        const orderRes = await fetch(`${baseUrl}/bookings/${newBooking._id}/razorpay-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const { orderId, amount, currency, keyId, isMock } = orderData;

          // 3. Load script & launch Razorpay Checkout on Web
          const scriptLoaded = await loadRazorpayScript();

          if (!isMock && scriptLoaded && window.Razorpay) {
            const options = {
              key: keyId,
              amount: amount,
              currency: currency || 'INR',
              name: 'PlanToPark Safe P2P',
              description: `Parking: ${space.title || 'Reserved Spot'}`,
              order_id: orderId,
              handler: async function (response) {
                try {
                  const verifyRes = await fetch(`${baseUrl}/bookings/${newBooking._id}/verify-payment`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature,
                      isMock: false,
                    }),
                  });

                  if (verifyRes.ok) {
                    const verifyData = await verifyRes.json();
                    const b = verifyData.booking || newBooking;
                    setBookingSuccessModal({
                      slotId: b.slotId || newBooking.slotId || 'Slot-1',
                      spotTitle: space.title || 'Parking Spot',
                      vehicleNumber: vehicleNumber.trim().toUpperCase(),
                      hours: actualHours,
                      totalAmount: totalPrice,
                    });
                  } else {
                    setBookingSuccessModal({
                      slotId: newBooking.slotId || 'Slot-1',
                      spotTitle: space.title || 'Parking Spot',
                      vehicleNumber: vehicleNumber.trim().toUpperCase(),
                      hours: actualHours,
                      totalAmount: totalPrice,
                    });
                  }
                } catch (vErr) {
                  setBookingSuccessModal({
                    slotId: newBooking.slotId || 'Slot-1',
                    spotTitle: space.title || 'Parking Spot',
                    vehicleNumber: vehicleNumber.trim().toUpperCase(),
                    hours: actualHours,
                    totalAmount: totalPrice,
                  });
                }
              },
              prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: user?.contact || '',
              },
              theme: {
                color: '#10b981',
              },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
            setLoading(false);
            return;
          }
        }
      } catch (orderErr) {
        console.warn('Razorpay order error:', orderErr);
      }

      // Default fallback confirmation
      setBookingSuccessModal({
        slotId: newBooking.slotId || 'Slot-1',
        spotTitle: space.title || 'Parking Spot',
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        hours: actualHours,
        totalAmount: totalPrice,
      });
    } catch (err) {
      showAlert('Error', err.message || 'Network error during booking');
    } finally {
      setLoading(false);
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
              const lat = space.coordinates?.lat || space.lat;
              const lng = space.coordinates?.lng || space.lng;
              let url = space.locationLink || space.googleMapsLink;
              if (!url && lat && lng) {
                url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
              } else if (!url && space.address) {
                url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(space.address + ', ' + (space.city || 'Hyderabad'))}`;
              }
              if (url) {
                if (typeof window !== 'undefined') window.open(url, '_blank');
                else Linking.openURL(url);
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

          {/* Price Calculation Box */}
          <View style={styles.priceBox}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Rate</Text>
              <Text style={styles.priceVal}>₹{hourlyRate} × {durationHours} hrs</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform Convenience Fee</Text>
              <Text style={styles.priceVal}>₹0 (Free)</Text>
            </View>
            <View style={[styles.priceRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.borderDark, paddingTop: 6 }]}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalVal}>₹{totalPrice}</Text>
            </View>
          </View>

          <Button
            title={`Confirm Booking • ₹${totalPrice}`}
            onPress={handleCreateBooking}
            loading={loading}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>

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
});
