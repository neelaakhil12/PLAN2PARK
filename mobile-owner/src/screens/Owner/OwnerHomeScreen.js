import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { endpoints, getBaseApiUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';

import { useIsFocused } from '@react-navigation/native';

export default function OwnerHomeScreen({ navigation }) {
  const { user, token, logout } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [spots, setSpots] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused && token) {
      fetchOwnerSpots();
    }
  }, [isFocused, token]);

  const fetchOwnerSpots = async () => {
    try {
      const baseUrl = await getBaseApiUrl();
      const [spacesRes, analyticsRes, bookingsRes] = await Promise.all([
        fetch(`${baseUrl}/spaces/owner/my-spaces`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/analytics/owner`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/bookings/owner-bookings`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (spacesRes.ok) {
        const spacesData = await spacesRes.json();
        setSpots(Array.isArray(spacesData) ? spacesData : spacesData.spaces || []);
      }

      let calculatedEarnings = 0;
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const bList = Array.isArray(bookingsData) ? bookingsData : [];
        setRecentBookings(bList);
        calculatedEarnings = bList
          .reduce((sum, b) => {
            const earn = b.ownerEarnings !== undefined && b.ownerEarnings !== null
              ? Number(b.ownerEarnings)
              : (b.paymentStatus === 'paid' ? Number(b.totalAmount || 0) * 0.9 : 0);
            return sum + (isNaN(earn) ? 0 : earn);
          }, 0);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        const backendEarnings = Number(analyticsData.earnings || 0);
        setTotalEarnings(calculatedEarnings > 0 ? calculatedEarnings : backendEarnings);
      } else {
        setTotalEarnings(calculatedEarnings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleStatus = async (spotId, currentActiveState) => {
    const newActiveState = !currentActiveState;

    // Optimistic local state update
    setSpots((prevSpots) =>
      prevSpots.map((s) =>
        s._id === spotId ? { ...s, isActive: newActiveState } : s
      )
    );

    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/spaces/${spotId}/toggle`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ isActive: newActiveState }),
      });
      if (!res.ok) {
        fetchOwnerSpots(); // Revert if failed
      }
    } catch (err) {
      console.error('Error toggling spot status:', err);
      fetchOwnerSpots();
    }
  };

  const handleDeleteSpot = (spotId, spotTitle) => {
    const doDelete = async () => {
      try {
        const baseUrl = await getBaseApiUrl();
        const res = await fetch(`${baseUrl}/spaces/${spotId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          fetchOwnerSpots();
        }
      } catch (err) {
        console.error('Error deleting spot:', err);
      }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`Are you sure you want to delete "${spotTitle || 'this spot'}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Spot', `Are you sure you want to delete "${spotTitle || 'this spot'}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header with notch padding */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>Space Owner Hub 🅿️</Text>
          <Text style={styles.headerSub}>Welcome, {user?.name || 'Owner'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOwnerSpots();
            }}
            tintColor={COLORS.ownerAccent}
          />
        }
      >
        {/* Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>
              ₹{Number(totalEarnings).toFixed(2).replace(/\.00$/, '')}
            </Text>
            <Text style={styles.metricLabel}>Net Earnings (90%)</Text>
          </View>
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Orders')}
            activeOpacity={0.8}
          >
            <Text style={[styles.metricVal, { color: '#10b981' }]}>{recentBookings.length}</Text>
            <Text style={styles.metricLabel}>Total Orders →</Text>
          </TouchableOpacity>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: COLORS.ownerAccent }]}>{spots.length}</Text>
            <Text style={styles.metricLabel}>Listed Spots</Text>
          </View>
        </View>

        {/* Live Booking Orders Preview Banner */}
        {recentBookings.length > 0 && (
          <TouchableOpacity
            style={styles.ordersAlertBanner}
            onPress={() => navigation.navigate('Orders')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ordersAlertTitle}>📑 {recentBookings.length} Driver Booking(s) Received</Text>
              <Text style={styles.ordersAlertSub}>
                Latest: {recentBookings[0]?.vehicleNumber || 'Vehicle'} • Slot {recentBookings[0]?.slotId || '1'} • ₹{recentBookings[0]?.totalAmount || 0}
              </Text>
            </View>
            <Text style={styles.ordersAlertArrow}>View Orders →</Text>
          </TouchableOpacity>
        )}

        {/* Add Spot Banner */}
        <TouchableOpacity
          style={styles.addBanner}
          onPress={() => navigation.navigate('AddSpot')}
          activeOpacity={0.85}
        >
          <View style={styles.addBannerCol}>
            <Text style={styles.addBannerTitle}>+ List New Parking Space</Text>
            <Text style={styles.addBannerSub}>Turn your driveways into recurring income</Text>
          </View>
          <Text style={styles.addBannerArrow}>→</Text>
        </TouchableOpacity>

        {/* Manage Spots Section */}
        <Text style={styles.sectionTitle}>My Parking Spots</Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.ownerAccent} style={{ marginTop: 20 }} />
        ) : spots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTxt}>No parking spots added yet</Text>
          </View>
        ) : (
          spots.map((spot) => {
            const isActive = spot.isActive !== false;
            const spotRate = spot.pricePerHour !== undefined ? spot.pricePerHour : (spot.hourlyRate || 40);
            const spotSlots = spot.totalSlots || (spot.slots ? spot.slots.length : null) || spot.totalSpots || 1;

            return (
              <View key={spot._id} style={styles.spotItem}>
                <View style={styles.spotHeaderRow}>
                  <View style={styles.spotInfo}>
                    <Text style={styles.spotTitle}>{spot.title || 'Parking Spot'}</Text>
                    <Text style={styles.spotAddress}>📍 {spot.address || 'Address'}, {spot.city || 'Hyderabad'}</Text>
                    <Text style={styles.spotPrice}>Rate: ₹{spotRate}/hr • {spotSlots} slots {spot.hasEvCharger ? '• ⚡ EV Available' : ''}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.toggleCol}
                    onPress={() => handleToggleStatus(spot._id, isActive)}
                    onClick={() => handleToggleStatus(spot._id, isActive)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleLabel, { color: isActive ? '#10b981' : '#94a3b8' }]}>
                      {isActive ? 'Active' : 'Offline'}
                    </Text>
                    <View style={[styles.customToggleTrack, { backgroundColor: isActive ? '#10b981' : '#334155' }]}>
                      <View style={[styles.customToggleThumb, { alignSelf: isActive ? 'flex-end' : 'flex-start' }]} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.spotActionsRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('AddSpot', { spot })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editBtnTxt}>✏️ Edit Spot</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteSpot(spot._id, spot.title)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnTxt}>🗑️ Delete</Text>
                  </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: COLORS.ownerAccent,
    fontWeight: '600',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.cardBg,
  },
  logoutTxt: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  ordersAlertBanner: {
    backgroundColor: '#10b98115',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ordersAlertTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },
  ordersAlertSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  ordersAlertArrow: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 10,
  },
  addBanner: {
    backgroundColor: COLORS.ownerAccent,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addBannerCol: {
    flex: 1,
  },
  addBannerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  addBannerSub: {
    color: '#e9d5ff',
    fontSize: 12,
    marginTop: 2,
  },
  addBannerArrow: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  spotItem: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  spotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotInfo: {
    flex: 1,
    paddingRight: 10,
  },
  spotTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  spotAddress: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginVertical: 3,
  },
  spotPrice: {
    color: COLORS.ownerAccent,
    fontSize: 12,
    fontWeight: '600',
  },
  spotActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#3b82f620',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnTxt: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnTxt: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleCol: {
    alignItems: 'center',
    padding: 6,
  },
  toggleLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 4,
    fontWeight: '700',
  },
  customToggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
  emptyTxt: {
    color: COLORS.textMuted,
  },
});
