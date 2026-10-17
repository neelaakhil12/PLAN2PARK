import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { getBaseApiUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';
import { useIsFocused } from '@react-navigation/native';

export default function OwnerBookingsScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'paid', 'allotted'

  useEffect(() => {
    if (isFocused && token) {
      fetchOwnerBookings();
    }
  }, [isFocused, token]);

  const fetchOwnerBookings = async () => {
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/bookings/owner-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'paid') return b.paymentStatus === 'paid' || b.status === 'paid';
    if (filter === 'pending') return b.paymentStatus === 'unpaid' || b.status === 'allotted';
    return true;
  });

  const totalEarnings = bookings
    .reduce((sum, b) => {
      const earn = b.ownerEarnings !== undefined && b.ownerEarnings !== null
        ? Number(b.ownerEarnings)
        : (b.paymentStatus === 'paid' ? Number(b.totalAmount || 0) * 0.9 : 0);
      return sum + (isNaN(earn) ? 0 : earn);
    }, 0);

  const handleCallSeeker = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleOwnerCheckIn = async (bookingId, vehicleNumber) => {
    const doCheckIn = async () => {
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/bookings/${bookingId}/check-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
        });
        const data = await res.json();
        if (res.ok) {
          const msg = `Vehicle ${vehicleNumber || ''} checked in successfully! Dynamic parking timer has started.`;
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(msg);
          } else {
            Alert.alert('Checked In 🅿️', msg);
          }
          fetchOwnerBookings();
        } else {
          Alert.alert('Notice', data.message || 'Could not check in booking');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to reach server: ' + err.message);
      }
    };

    const confirmMsg = `Confirm Check-In for vehicle ${vehicleNumber || 'this booking'}? Dynamic timer will start now.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(confirmMsg)) doCheckIn();
    } else {
      Alert.alert('Check-In Commuter', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Check In', onPress: doCheckIn },
      ]);
    }
  };

  const handleOwnerCheckOut = async (bookingId, vehicleNumber, slotId) => {
    const doCheckOut = async () => {
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/bookings/${bookingId}/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
        });
        const data = await res.json();
        if (res.ok) {
          const msg = `Vehicle ${vehicleNumber || ''} checked out. Slot ${slotId || ''} is now freed and available for new bookings!`;
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(msg);
          } else {
            Alert.alert('Checked Out 👋', msg);
          }
          fetchOwnerBookings();
        } else {
          Alert.alert('Notice', data.message || 'Could not check out');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to reach server: ' + err.message);
      }
    };

    const confirmMsg = `Check out vehicle ${vehicleNumber || 'this booking'}? Slot ${slotId || ''} will be released immediately.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(confirmMsg)) doCheckOut();
    } else {
      Alert.alert('Check-Out Vehicle', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Check Out & Free Slot', onPress: doCheckOut },
      ]);
    }
  };

  const handleDeleteBooking = async (bookingId, vehicleNumber) => {
    const doDelete = async () => {
      try {
        // Optimistically remove from state immediately
        setBookings((prev) => prev.filter((b) => b._id !== bookingId));

        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
        });

        if (res.ok) {
          fetchOwnerBookings();
        } else {
          const err = await res.json().catch(() => ({}));
          const errMsg = err.message || 'Could not delete booking order';
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(errMsg);
          } else {
            Alert.alert('Error', errMsg);
          }
          fetchOwnerBookings();
        }
      } catch (e) {
        console.error('Delete booking error:', e);
        fetchOwnerBookings();
      }
    };

    const confirmTitle = 'Delete Booking Order';
    const confirmMsg = `Are you sure you want to delete order for ${vehicleNumber || 'this booking'}?`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(confirmMsg)) {
        doDelete();
      }
    } else {
      Alert.alert(confirmTitle, confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Seeker Bookings & Orders 📑</Text>
          <Text style={styles.headerSub}>Manage reservations and earnings</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOwnerBookings();
            }}
            tintColor={COLORS.ownerAccent}
          />
        }
      >
        {/* Earnings Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryVal}>₹{Number(totalEarnings).toFixed(2).replace(/\.00$/, '')}</Text>
            <Text style={styles.summaryLabel}>Total Earnings (100% Payout)</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryVal, { color: '#10b981' }]}>{bookings.length}</Text>
            <Text style={styles.summaryLabel}>Total Orders</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: `All (${bookings.length})` },
            { id: 'paid', label: `Paid (${bookings.filter((b) => b.paymentStatus === 'paid' || b.status === 'paid').length})` },
            { id: 'pending', label: `Failed (${bookings.filter((b) => b.paymentStatus !== 'paid' && b.status !== 'paid').length})` },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterPill, filter === item.id && styles.filterPillActive]}
              onPress={() => setFilter(item.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillTxt, filter === item.id && styles.filterPillTxtActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bookings List */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.ownerAccent} style={{ marginTop: 30 }} />
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Booking Orders Found</Text>
            <Text style={styles.emptySub}>
              {filter === 'all'
                ? 'When seekers book your parking spots, their orders and payments will show here in real time.'
                : 'No bookings match this filter.'}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => {
            const isCheckedIn = Boolean(booking.isCheckedIn) || booking.status === 'checked_in';
            const isCompleted = booking.status === 'completed';
            const isCancelled = booking.status === 'cancelled';
            const isPaid = booking.paymentStatus === 'paid' || booking.status === 'paid' || isCheckedIn || isCompleted;

            let badgeText = '🔴 FAILED';
            let badgeColor = '#ef4444';
            let badgeBg = '#ef444420';

            if (isCompleted) {
              badgeText = '✓ COMPLETED';
              badgeColor = '#60a5fa';
              badgeBg = '#3b82f620';
            } else if (isCheckedIn) {
              badgeText = '🟢 CHECKED-IN';
              badgeColor = '#10b981';
              badgeBg = '#10b98125';
            } else if (isCancelled) {
              badgeText = '🚫 CANCELLED';
              badgeColor = '#94a3b8';
              badgeBg = '#64748b20';
            } else if (isPaid) {
              badgeText = '🎟️ ALLOTTED (PAID)';
              badgeColor = '#38bdf8';
              badgeBg = '#0284c725';
            }

            const spotTitle = booking.spaceId?.title || 'Parking Space';
            const seekerName = booking.seekerName || booking.seekerId?.name || 'Seeker';
            const seekerPhone = booking.seekerContact || booking.seekerId?.contact || '';
            const slot = booking.slotId || 'Slot-1';
            const amount = booking.totalAmount || 0;
            const myShare = booking.ownerEarnings !== undefined && booking.ownerEarnings !== null ? booking.ownerEarnings : amount;
            const dateStr = new Date(booking.createdAt).toLocaleString('en-IN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View key={booking._id} style={styles.bookingCard}>
                {/* Top Row: Spot name & Status badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.spotTitle}>{spotTitle}</Text>
                    <Text style={styles.slotBadge}>🅿️ Slot: {slot}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
                    <Text style={[styles.statusTxt, { color: badgeColor }]}>
                      {badgeText}
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>🚗 Vehicle</Text>
                    <Text style={styles.detailVal}>{booking.vehicleNumber || 'TS07AB1234'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>👤 Seeker Name</Text>
                    <Text style={styles.detailVal}>{seekerName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>⏱️ Duration</Text>
                    <Text style={styles.detailVal}>{booking.hours || 1} Hour(s)</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>💰 Your Payout</Text>
                    <Text style={[styles.detailVal, { color: '#10b981', fontWeight: '800' }]}>
                      ₹{isCancelled && booking.refundAmount > 0 ? `${myShare} (Retained)` : myShare}
                    </Text>
                  </View>
                </View>

                {/* Check-In / Departure Status Information */}
                {isCheckedIn && (
                  <View style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    marginHorizontal: 12,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
                      🚗 Vehicle Parked & Timer Running
                    </Text>
                    {booking.checkInTime && (
                      <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                        In: {new Date(booking.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                )}

                {isCompleted && booking.checkOutTime && (
                  <View style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    marginHorizontal: 12,
                    marginBottom: 10,
                  }}>
                    <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '700' }}>
                      👋 Departed at {new Date(booking.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Slot Free
                    </Text>
                  </View>
                )}

                {/* Footer with date and actions */}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateTxt}>📅 {dateStr}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Check In Button for Owner */}
                    {isPaid && !isCheckedIn && !isCompleted && !isCancelled && (
                      <TouchableOpacity
                        style={styles.checkInBtn}
                        onPress={() => handleOwnerCheckIn(booking._id, booking.vehicleNumber)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.checkInBtnTxt}>🅿️ Check In</Text>
                      </TouchableOpacity>
                    )}

                    {/* Check Out Button for Owner */}
                    {isCheckedIn && !isCompleted && !isCancelled && (
                      <TouchableOpacity
                        style={styles.checkOutBtn}
                        onPress={() => handleOwnerCheckOut(booking._id, booking.vehicleNumber, slot)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.checkOutBtnTxt}>🚪 Check Out</Text>
                      </TouchableOpacity>
                    )}

                    {seekerPhone ? (
                      <TouchableOpacity style={styles.callBtn} onPress={() => handleCallSeeker(seekerPhone)}>
                        <Text style={styles.callBtnTxt}>📞 Call</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.deleteOrderBtn}
                      onPress={() => handleDeleteBooking(booking._id, booking.vehicleNumber)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.deleteOrderBtnTxt}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
    backgroundColor: COLORS.darkBg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ownerAccent,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  filterPillActive: {
    backgroundColor: COLORS.ownerAccent,
    borderColor: COLORS.ownerAccent,
  },
  filterPillTxt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTxtActive: {
    color: COLORS.white,
  },
  bookingCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  spotTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  slotBadge: {
    fontSize: 12,
    color: COLORS.ownerAccent,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTxt: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0f172a80',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  detailItem: {
    width: '46%',
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  detailVal: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  dateTxt: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  callBtn: {
    backgroundColor: '#3b82f620',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  callBtnTxt: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  checkInBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkInBtnTxt: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  checkOutBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkOutBtnTxt: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  deleteOrderBtn: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  deleteOrderBtnTxt: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
