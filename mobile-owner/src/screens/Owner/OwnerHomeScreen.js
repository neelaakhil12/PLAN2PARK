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
      const [spacesRes, analyticsRes] = await Promise.all([
        fetch(`${baseUrl}/spaces/owner/my-spaces`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/analytics/owner`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (spacesRes.ok) {
        const spacesData = await spacesRes.json();
        setSpots(Array.isArray(spacesData) ? spacesData : spacesData.spaces || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setTotalEarnings(analyticsData.earnings || 0);
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
      console.error(err);
      fetchOwnerSpots(); // Revert on failure
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
            <Text style={styles.metricVal}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricLabel}>Total Earnings</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: COLORS.ownerAccent }]}>{spots.length}</Text>
            <Text style={styles.metricLabel}>Listed Spots</Text>
          </View>
        </View>

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
            return (
              <View key={spot._id} style={styles.spotItem}>
                <View style={styles.spotInfo}>
                  <Text style={styles.spotTitle}>{spot.title}</Text>
                  <Text style={styles.spotAddress}>📍 {spot.address}, {spot.city}</Text>
                  <Text style={styles.spotPrice}>Rate: ₹{spot.hourlyRate}/hr • {spot.totalSpots} spots</Text>
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
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  spotInfo: {
    flex: 1,
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
