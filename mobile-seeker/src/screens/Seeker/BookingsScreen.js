import React, { useState, useEffect, useContext } from 'react';
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
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { getBaseApiUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';
import Header from '../../components/Header';

export default function BookingsScreen({ navigation }) {
  const { token } = useContext(AuthContext);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(Array.isArray(data) ? data : data.bookings || []);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const doCancel = async () => {
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/bookings/${bookingId}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('Reservation cancelled successfully');
          } else {
            Alert.alert('Cancelled', 'Booking cancelled successfully');
          }
          fetchMyBookings();
        } else {
          const err = await res.json();
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(err.message || 'Could not cancel booking');
          } else {
            Alert.alert('Error', err.message || 'Could not cancel booking');
          }
        }
      } catch (err) {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert('Failed to cancel booking');
        } else {
          Alert.alert('Error', 'Failed to cancel booking');
        }
      }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Are you sure you want to cancel this reservation?')) {
        doCancel();
      }
    } else {
      Alert.alert('Cancel Booking', 'Are you sure you want to cancel this reservation?', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    const doDelete = async () => {
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
      }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Remove this parking pass from list?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Pass', 'Remove this pass from your list?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleOpenMap = (space) => {
    if (!space) return;
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
  };

  const renderBookingCard = ({ item }) => {
    const isCancelled = item.status === 'cancelled';
    const isCompleted = item.status === 'completed';
    const isPaid = item.paymentStatus === 'paid' || item.status === 'paid';
    const isFailed = !isPaid && !isCancelled;
    const space = item.spaceId;
    const slot = item.slotId || 'Slot-1';

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

        {/* Big Slot Highlight */}
        <View style={[styles.slotHighlightBox, !isPaid && { borderColor: '#ef4444', backgroundColor: '#ef444415' }]}>
          <Text style={[styles.slotHighlightLabel, !isPaid && { color: '#f87171' }]}>
            {isPaid ? 'YOUR ASSIGNED SLOT' : 'RESERVATION STATUS'}
          </Text>
          <Text style={[styles.slotHighlightVal, !isPaid && { color: '#ef4444', fontSize: 16 }]}>
            {isPaid ? `🅿️ ${slot}` : isCancelled ? 'Reservation Cancelled' : 'Payment Incomplete (Failed)'}
          </Text>
        </View>

        {/* Spot Details */}
        <Text style={styles.spotName}>{space?.title || 'Parking Location'}</Text>
        <Text style={styles.spotAddress}>📍 {space?.address || 'City Center'}, {space?.city || 'Hyderabad'}</Text>

        {/* Google Maps Turn-by-Turn GPS Navigation Button */}
        {isPaid && (
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={() => handleOpenMap(space)}
            activeOpacity={0.85}
          >
            <Text style={styles.navigateBtnIcon}>🗺️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.navigateBtnTitle}>Navigate to Parking Spot (Google Maps)</Text>
              <Text style={styles.navigateBtnSub}>Turn-by-turn driving directions straight to the spot</Text>
            </View>
            <Text style={styles.navigateBtnArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Booking Details Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Vehicle Plate</Text>
            <Text style={styles.infoVal}>{item.vehicleNumber || item.vehiclePlate || 'N/A'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoVal}>{item.hours || 1} Hour(s)</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Total Amount</Text>
            <Text style={[styles.infoVal, { color: isPaid ? '#10b981' : '#ef4444', fontWeight: '800' }]}>₹{item.totalAmount || 0}</Text>
          </View>
        </View>

        <View style={styles.timeBox}>
          <Text style={styles.timeTxt}>
            🕒 {new Date(item.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
            {new Date(item.endTime || Date.now() + 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          {isPaid && !isCancelled && !isCompleted && (
            <TouchableOpacity
              style={[styles.cancelBtn, { flex: 1 }]}
              onPress={() => handleCancelBooking(item._id)}
            >
              <Text style={styles.cancelTxt}>Cancel Reservation</Text>
            </TouchableOpacity>
          )}

          {(!isPaid || isCancelled || isCompleted) && (
            <TouchableOpacity
              style={[styles.cancelBtn, { flex: 1, borderColor: '#ef444480' }]}
              onPress={() => handleDeleteBooking(item._id)}
            >
              <Text style={[styles.cancelTxt, { color: '#f87171' }]}>🗑️ Delete Pass</Text>
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
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTxt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slotHighlightBox: {
    backgroundColor: '#064e3b35',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  slotHighlightLabel: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  slotHighlightVal: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
  },
  spotName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 2,
  },
  spotAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  navigateBtn: {
    backgroundColor: '#3b82f618',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  navigateBtnIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  navigateBtnTitle: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '800',
  },
  navigateBtnSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  navigateBtnArrow: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoCol: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  timeBox: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  timeTxt: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  cancelTxt: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
