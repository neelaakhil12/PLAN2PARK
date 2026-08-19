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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import { getBaseApiUrl, endpoints } from '../../config/api';
import Header from '../../components/Header';

export default function BookingsScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleCancelBooking = async (item) => {
    const bookingId = item._id;
    const space = item.spaceId;
    const policy = space?.cancellationPolicy || 'full';
    const amount = Number(item.totalAmount) || 0;
    const estimatedRefund = policy === 'full' ? amount : policy === 'half' ? Number((amount * 0.5).toFixed(2)) : 0;
    const policyName = policy === 'full' ? '100% Full Refund' : policy === 'half' ? '50% Half Refund' : '0% Non-Refundable';

    const doCancel = async () => {
      // Optimistic update
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
          const msg = resData.message || (estimatedRefund > 0 
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

    const confirmMsg = amount > 0
      ? `Cancel this reservation?\n\nOwner Refund Policy: ${policyName}\nRefund to Your Wallet: ₹${estimatedRefund}`
      : `Cancel this reservation?\n\nThis spot will be released immediately.`;

    Alert.alert('Cancel Reservation', confirmMsg, [
      { text: 'No, Keep Pass', style: 'cancel' },
      { text: amount > 0 ? `Yes, Cancel (Get ₹${estimatedRefund} Refund)` : 'Yes, Cancel Pass', style: 'destructive', onPress: doCancel },
    ]);
  };

  const handleDeleteBooking = async (bookingId) => {
    const doDelete = async () => {
      // Optimistic delete
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          fetchMyBookings();
        }
      } catch (err) {
        console.error(err);
        fetchMyBookings();
      }
    };

    Alert.alert('Delete Pass', 'Permanently remove this parking pass from your list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const handleOpenMap = (space) => {
    if (!space) return;
    const lat = space.location?.coordinates?.[1] || space.coordinates?.lat || space.lat;
    const lng = space.location?.coordinates?.[0] || space.coordinates?.lng || space.lng;
    
    if (lat && lng) {
      const geoUrl = Platform.OS === 'android'
        ? `google.navigation:q=${lat},${lng}`
        : `maps://app?daddr=${lat},${lng}`;
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      
      Linking.canOpenURL(geoUrl).then((supported) => {
        if (supported) Linking.openURL(geoUrl);
        else Linking.openURL(webUrl);
      }).catch(() => {
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
    const isFailed = !isPaid && !isCancelled;
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
              isPaid
                ? { backgroundColor: '#10b98125', borderColor: '#10b981' }
                : isCancelled
                ? { backgroundColor: '#64748b25', borderColor: '#64748b' }
                : { backgroundColor: '#ef444425', borderColor: '#ef4444' },
            ]}
          >
            <Text
              style={[
                styles.statusTxt,
                isPaid
                  ? { color: '#10b981' }
                  : isCancelled
                  ? { color: '#94a3b8' }
                  : { color: '#ef4444' },
              ]}
            >
              {isPaid ? '✓ PAID & CONFIRMED' : isCancelled ? '🚫 CANCELLED' : '❌ PAYMENT FAILED'}
            </Text>
          </View>
        </View>

        {/* Big Slot Highlight / Refund Highlight */}
        <View style={[styles.slotHighlightBox, !isPaid && { borderColor: isCancelled ? '#64748b' : '#ef4444', backgroundColor: isCancelled ? '#64748b15' : '#ef444415' }]}>
          <Text style={[styles.slotHighlightLabel, !isPaid && { color: isCancelled ? '#94a3b8' : '#f87171' }]}>
            {isPaid ? 'YOUR ASSIGNED SLOT' : isCancelled ? (refundAmt > 0 ? 'REFUND CREDITED TO WALLET' : 'RESERVATION CANCELLED') : 'RESERVATION STATUS'}
          </Text>
          <Text style={[styles.slotHighlightVal, !isPaid && { color: isCancelled ? (refundAmt > 0 ? '#10b981' : '#94a3b8') : '#ef4444', fontSize: isCancelled ? 16 : 16 }]}>
            {isPaid ? `🅿️ ${slot}` : isCancelled ? (refundAmt > 0 ? `💸 ₹${refundAmt} Refunded to Wallet` : 'Cancelled (Released)') : 'Payment Incomplete (Failed)'}
          </Text>
        </View>

        {/* Spot Details */}
        <Text style={styles.spotName}>{space?.title || 'Parking Location'}</Text>
        <Text style={styles.spotAddress}>📍 {space?.address || 'City Center'}, {space?.city || 'Hyderabad'}</Text>

        {/* Google Maps Turn-by-Turn GPS Navigation Button */}
        <TouchableOpacity
          style={styles.gpsNavBtn}
          onPress={() => handleOpenMap(space)}
          activeOpacity={0.8}
        >
          <Text style={styles.gpsNavTxt}>🗺️ Open Turn-by-Turn GPS Navigation</Text>
        </TouchableOpacity>

        {/* Meta Info Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>VEHICLE</Text>
            <Text style={styles.metaVal}>{item.vehicleNumber || 'TS07AB1234'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>HOURS</Text>
            <Text style={styles.metaVal}>{item.hours || 2} hrs</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>AMOUNT</Text>
            <Text style={[styles.metaVal, { color: COLORS.primary }]}>₹{item.totalAmount || 0}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>REFUND POLICY</Text>
            <Text style={[styles.metaVal, { color: space?.cancellationPolicy === 'none' ? '#ef4444' : '#10b981' }]}>
              {space?.cancellationPolicy === 'full' ? '100% Full' : space?.cancellationPolicy === 'half' ? '50% Half' : 'None'}
            </Text>
          </View>
        </View>

        {/* Reservation Date & Time */}
        <View style={styles.timeRow}>
          <Text style={styles.timeTxt}>
            📅 {new Date(item.startTime || item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.timeTxt}>
            ⏰ {new Date(item.startTime || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
            {new Date(item.endTime || (new Date(item.startTime || item.createdAt).getTime() + (item.hours || 2) * 3600000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Action Buttons: Cancel vs Delete */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          {isPaid && !isCancelled && !isCompleted && (
            <TouchableOpacity
              style={[styles.cancelBtn, { flex: 1 }]}
              onPress={() => handleCancelBooking(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelTxt}>Cancel Reservation</Text>
            </TouchableOpacity>
          )}

          {/* Delete Button for any cancelled, completed, failed, or active pass */}
          <TouchableOpacity
            style={[styles.deletePassBtn, (isPaid && !isCancelled && !isCompleted) ? { width: 110 } : { flex: 1 }]}
            onPress={() => handleDeleteBooking(item._id)}
            activeOpacity={0.8}
          >
            <Text style={styles.deletePassTxt}>🗑️ Delete Pass</Text>
          </TouchableOpacity>
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passTitle: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusTxt: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  slotHighlightBox: {
    backgroundColor: '#064e3b25',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  spotName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  spotAddress: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  gpsNavBtn: {
    backgroundColor: '#1e3a8a30',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsNavTxt: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b50',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
    paddingTop: 10,
    marginBottom: 4,
  },
  timeTxt: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#450a0a20',
  },
  cancelTxt: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  deletePassBtn: {
    borderWidth: 1,
    borderColor: '#64748b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  deletePassTxt: {
    color: '#f87171',
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
