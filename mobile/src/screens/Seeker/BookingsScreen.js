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
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import { getBaseApiUrl } from '../../config/api';
import Header from '../../components/Header';

export default function BookingsScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Extend Modal States
  const [extendingBooking, setExtendingBooking] = useState(null);
  const [extendHours, setExtendHours] = useState(1);
  const [extendLoading, setExtendLoading] = useState(false);

  // Invoice Modal States
  const [invoiceBooking, setInvoiceBooking] = useState(null);

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
    }, [token])
  );

  // Handle Checkout
  const handleCheckOut = async (item) => {
    Alert.alert(
      'Check Out of Parking Spot',
      `Are you ready to check out from ${item.spaceId?.title || 'this spot'} (Slot: ${item.slotId || 'Slot-1'})?\n\nThis will release the spot for other drivers.`,
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

  // Handle Extend Submit
  const handleExtendSubmit = async () => {
    if (!extendingBooking) return;
    setExtendLoading(true);
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/bookings/${extendingBooking._id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ extendHours: Number(extendHours) }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          '🎉 Extension Confirmed',
          `Your reservation has been extended by ${extendHours} hour(s)!\nTotal fee updated to ₹${data.booking?.totalAmount || ''}.`
        );
        setExtendingBooking(null);
        setExtendHours(1);
        fetchMyBookings();
      } else {
        Alert.alert('Extension Error', data.message || 'Failed to extend booking');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect. Please try again.');
    } finally {
      setExtendLoading(false);
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (item) => {
    const bookingId = item._id;
    const space = item.spaceId;
    const policy = space?.cancellationPolicy || 'full';
    const amount = Number(item.totalAmount) || 0;
    const estimatedRefund = policy === 'full' ? amount : policy === 'half' ? Number((amount * 0.5).toFixed(2)) : 0;
    const policyName = policy === 'full' ? '100% Full Refund' : policy === 'half' ? '50% Half Refund' : '0% Non-Refundable';

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
              ? `Reservation cancelled successfully! ₹${estimatedRefund} has been refunded to your PlanToPark Wallet.`
              : 'Reservation cancelled.');
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
        ? `Cancel this reservation?\n\nOwner Refund Policy: ${policyName}\nRefund to Your Wallet: ₹${estimatedRefund}`
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
    const isPaid = item.paymentStatus === 'paid' || item.status === 'paid';
    const space = item.spaceId;
    const slot = item.slotId || 'Slot-1';
    const refundAmt = item.refundAmount || 0;

    return (
      <View style={styles.card}>
        {/* Pass Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.passTitle}>🎟️ DIGITAL PARKING PASS</Text>
          <View
            style={[
              styles.statusBadge,
              isCompleted
                ? { backgroundColor: '#3b82f625', borderColor: '#3b82f6' }
                : isPaid
                ? { backgroundColor: '#10b98125', borderColor: '#10b981' }
                : isCancelled
                ? { backgroundColor: '#64748b25', borderColor: '#64748b' }
                : { backgroundColor: '#ef444425', borderColor: '#ef4444' },
            ]}
          >
            <Text
              style={[
                styles.statusTxt,
                isCompleted
                  ? { color: '#60a5fa' }
                  : isPaid
                  ? { color: '#10b981' }
                  : isCancelled
                  ? { color: '#94a3b8' }
                  : { color: '#ef4444' },
              ]}
            >
              {isCompleted ? '✓ COMPLETED' : isPaid ? '✓ PAID' : isCancelled ? '🚫 CANCELLED' : '❌ UNPAID'}
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

        {/* Meta Info Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>VEHICLE</Text>
            <Text style={styles.metaVal}>{item.vehicleNumber || 'TS07WJ2099'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>DURATION</Text>
            <Text style={styles.metaVal}>{item.hours || 1} hours</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TOTAL FEE</Text>
            <Text style={[styles.metaVal, { color: COLORS.primary, fontSize: 14 }]}>₹{item.totalAmount || 0}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>START TIME</Text>
            <Text style={styles.metaVal}>
              {new Date(item.startTime || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* ── ACTION BUTTONS ROW (Invoice, Check Out, Extend, Cancel, Nav) ────────── */}
        <View style={styles.actionRow}>
          {/* 1. Invoice Button */}
          {isPaid && (
            <TouchableOpacity
              style={styles.invoiceBtn}
              onPress={() => setInvoiceBooking(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.invoiceBtnTxt}>🧾 Invoice</Text>
            </TouchableOpacity>
          )}

          {/* 2. Check Out Button */}
          {isPaid && !isCompleted && !isCancelled && (
            <TouchableOpacity
              style={styles.checkOutBtn}
              onPress={() => handleCheckOut(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.checkOutBtnTxt}>🚪 Check Out</Text>
            </TouchableOpacity>
          )}

          {/* 3. Extend Button */}
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

          {/* 4. Cancel Button */}
          {isPaid && !isCancelled && !isCompleted && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancelBooking(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          )}

          {/* 5. In-App / Google Maps Navigation */}
          {space && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => handleOpenMap(space)}
              activeOpacity={0.7}
            >
              <Text style={styles.navBtnTxt}>🗺️ Google Maps</Text>
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
    justifyContent: 'space-between',
    backgroundColor: '#1e293b50',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaVal: {
    color: COLORS.white,
    fontSize: 12,
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
