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
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { endpoints } from '../../config/api';
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
      const res = await fetch(endpoints.getMyBookings, {
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
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this reservation?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(endpoints.cancelBooking(bookingId), {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              Alert.alert('Cancelled', 'Booking cancelled successfully');
              fetchMyBookings();
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to cancel booking');
          }
        },
      },
    ]);
  };

  const renderBookingCard = ({ item }) => {
    const isCancelled = item.status === 'cancelled';
    const isCompleted = item.status === 'completed';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.passTitle}>🎟️ DIGITAL PARKING PASS</Text>
          <View
            style={[
              styles.statusBadge,
              isCancelled
                ? { backgroundColor: COLORS.danger }
                : isCompleted
                ? { backgroundColor: COLORS.textMuted }
                : { backgroundColor: COLORS.primary },
            ]}
          >
            <Text style={styles.statusTxt}>{(item.status || 'CONFIRMED').toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.spotName}>{item.spaceId?.title || 'Parking Location'}</Text>
        <Text style={styles.spotAddress}>📍 {item.spaceId?.address || 'City Center'}</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Vehicle Plate</Text>
            <Text style={styles.infoVal}>{item.vehicleNumber || item.vehiclePlate || 'N/A'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoVal}>{item.vehicleType || 'Vehicle'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Total Paid</Text>
            <Text style={[styles.infoVal, { color: COLORS.primary }]}>₹{item.totalAmount || 0}</Text>
          </View>
        </View>

        <View style={styles.timeBox}>
          <Text style={styles.timeTxt}>
            🕒 {new Date(item.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
            {new Date(item.endTime || Date.now() + 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {!isCancelled && !isCompleted && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelBooking(item._id)}
          >
            <Text style={styles.cancelTxt}>Cancel Reservation</Text>
          </TouchableOpacity>
        )}
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
    marginBottom: 10,
  },
  passTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTxt: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  spotName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 2,
  },
  spotAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoCol: {},
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
