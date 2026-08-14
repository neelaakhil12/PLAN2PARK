import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { getBaseApiUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';
import PinLocationModal from '../../components/PinLocationModal';
import ProfileEditorModal from '../../components/ProfileEditorModal';

// Geocoding distance calculation helper (Haversine Formula)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return dist < 0.1 ? 0.1 : Math.round(dist * 10) / 10;
}

export default function SeekerHomeScreen({ navigation }) {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEv, setFilterEv] = useState(false);

  // Location pinning state (prompts upon login/open)
  const [pinnedLocation, setPinnedLocation] = useState('Almasguda (17.313, 78.545)');
  const [showPinModal, setShowPinModal] = useState(true);

  // Profile completion state (ONLY for newly registered users)
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    fetchSpaces();
    checkProfileCompletion();
  }, [user]);

  const checkProfileCompletion = async () => {
    if (!user?._id) return;
    try {
      const isCompleted = await AsyncStorage.getItem(`profile_completed_${user._id}`);
      if (user?.isNewlyRegistered && isCompleted !== 'true') {
        setShowProfileModal(true);
      } else {
        setShowProfileModal(false);
      }
    } catch (e) {
      setShowProfileModal(false);
    }
  };

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      // Fetch REAL parking spaces created by Owners in database
      const baseUrl = await getBaseApiUrl();
      let fetchedSpaces = [];

      try {
        const res = await fetch(`${baseUrl}/spaces`, {
          headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Remainder': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          fetchedSpaces = Array.isArray(data) ? data : data.spaces || [];
        }
      } catch (e) {
        console.log('Primary endpoint fetch issue, trying localhost:5000...');
      }

      // Localhost direct fallback if primary was empty
      if (fetchedSpaces.length === 0) {
        try {
          const localRes = await fetch('http://localhost:5000/api/spaces');
          if (localRes.ok) {
            const localData = await localRes.json();
            fetchedSpaces = Array.isArray(localData) ? localData : localData.spaces || [];
          }
        } catch (localErr) {
          console.warn('Localhost spaces fetch error:', localErr.message);
        }
      }

      setSpaces(fetchedSpaces);
    } catch (err) {
      console.error('Error fetching real owner spaces:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectPinnedLocation = (location) => {
    setPinnedLocation(location);
    setShowPinModal(false);
  };

  const handleSaveProfile = async (profileData) => {
    await updateProfile(profileData);
    if (user?._id) {
      await AsyncStorage.setItem(`profile_completed_${user._id}`, 'true');
    }
    setShowProfileModal(false);
  };

  // Extract seeker coordinates from pinnedLocation string
  const getPinnedCoords = () => {
    const match = (pinnedLocation || '').match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    const locLower = (pinnedLocation || '').toLowerCase();
    if (locLower.includes('hitech')) return { lat: 17.4435, lng: 78.3772 };
    if (locLower.includes('banjara')) return { lat: 17.4156, lng: 78.4347 };
    if (locLower.includes('madhapur')) return { lat: 17.4483, lng: 78.3915 };
    if (locLower.includes('jubilee')) return { lat: 17.4319, lng: 78.4071 };
    if (locLower.includes('gachibowli')) return { lat: 17.4401, lng: 78.3489 };
    return { lat: 17.3128, lng: 78.5450 }; // Almasguda default
  };

  const seekerCoords = getPinnedCoords();

  // Process spaces with Geocoding distance calculation & proximity sorting
  const processedSpaces = spaces.map((space) => {
    const sLat = space.coordinates?.lat || space.lat;
    const sLng = space.coordinates?.lng || space.lng;
    const dist = calculateDistanceKm(seekerCoords.lat, seekerCoords.lng, sLat, sLng);
    return {
      ...space,
      calculatedDist: dist !== null ? dist : 999,
      distBadge: dist !== null ? `${dist} km away` : 'Nearby',
    };
  });

  // Sort by nearest distance first
  const sortedSpaces = processedSpaces.sort((a, b) => a.calculatedDist - b.calculatedDist);

  // Apply search & EV filters
  const displaySpaces = sortedSpaces.filter((item) => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(queryLower) ||
      item.address?.toLowerCase().includes(queryLower) ||
      item.location?.toLowerCase().includes(queryLower) ||
      item.city?.toLowerCase().includes(queryLower);

    const matchesEv = filterEv ? item.hasEvCharger : true;
    return matchesSearch && matchesEv;
  });

  const renderSpotCard = ({ item }) => {
    const totalSlots = item.totalSlots || (item.slots ? item.slots.length : 5);
    const availableSlots = item.availableSlots !== undefined
      ? item.availableSlots
      : (item.slots ? item.slots.filter((s) => s.isAvailable !== false).length : totalSlots);
    const isFull = availableSlots <= 0;

    return (
      <TouchableOpacity
        style={[styles.spotCard, isFull && { opacity: 0.85 }]}
        onPress={() => navigation.navigate('SpotDetails', { space: item })}
        activeOpacity={0.88}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeGroup}>
            <Text style={styles.verifiedBadge}>VERIFIED OWNER SPOT</Text>
            {item.hasEvCharger && <Text style={styles.evBadge}>⚡ EV CHARGING</Text>}
          </View>
          <Text style={styles.priceTxt}>₹{item.pricePerHour || item.hourlyRate || 50}<Text style={styles.priceUnit}>/hr</Text></Text>
        </View>

        <Text style={styles.spotTitle}>{item.title || item.location || 'Owner Parking Space'}</Text>
        <Text style={styles.spotAddress}>📍 {item.address || item.location || ''}</Text>

        <View style={styles.distanceRow}>
          <View style={styles.distChip}>
            <Text style={styles.distIcon}>🎯</Text>
            <Text style={styles.distTxt}>{item.distBadge}</Text>
          </View>
          <Text style={styles.vehiclePill}>🚗 {item.suitableVehicles ? item.suitableVehicles.join(', ') : '4-wheeler'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Available Slots</Text>
            <Text style={[styles.metaVal, { color: isFull ? '#ef4444' : '#10b981', fontWeight: '800' }]}>
              {isFull ? '🔴 FULL (0 Left)' : `🟢 ${availableSlots} of ${totalSlots} Slots Free`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, isFull && { backgroundColor: '#334155' }]}
            onPress={() => navigation.navigate('SpotDetails', { space: item })}
          >
            <Text style={styles.bookBtnTxt}>{isFull ? 'View Info' : 'Book Spot →'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* App Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.name || 'Seeker'} 👋</Text>
          <Text style={styles.headerSub}>Find secure owner parking nearby</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Pinned Location Banner */}
      <TouchableOpacity
        style={styles.pinnedBanner}
        onPress={() => setShowPinModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.pinnedIcon}>📍</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedTitle}>SEARCH NEAR PINNED LOCATION</Text>
          <Text style={styles.pinnedLocTxt} numberOfLines={1}>{pinnedLocation}</Text>
        </View>
        <View style={styles.changePinBadge}>
          <Text style={styles.changePinTxt}>Change Pin 🎯</Text>
        </View>
      </TouchableOpacity>

      {/* Search Bar & Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search specific area, landmark, or spot name..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterEv && styles.filterPillActive]}
            onPress={() => setFilterEv(!filterEv)}
          >
            <Text style={[styles.filterPillTxt, filterEv && styles.filterPillTxtActive]}>
              ⚡ EV Charging Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Spot List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTxt}>Fetching owner parking spaces from database...</Text>
        </View>
      ) : (
        <FlatList
          data={displaySpaces}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderSpotCard}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 40 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchSpaces();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🅿️</Text>
              <Text style={styles.emptyTitle}>No Owner Parking Spots Found</Text>
              <Text style={styles.emptySub}>No owner has added parking spaces in this area yet.</Text>
            </View>
          }
        />
      )}

      {/* Pin Location Modal */}
      <PinLocationModal
        visible={showPinModal}
        currentLocation={pinnedLocation}
        onSelectLocation={handleSelectPinnedLocation}
        onClose={() => setShowPinModal(false)}
      />

      {/* Profile Setup Modal for New Users */}
      <ProfileEditorModal
        visible={showProfileModal}
        isNewUser={true}
        currentUser={user}
        onSave={handleSaveProfile}
        onClose={() => setShowProfileModal(false)}
      />
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
    backgroundColor: COLORS.darkBg,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
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
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
  },
  pinnedIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  pinnedTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  pinnedLocTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 1,
  },
  changePinBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePinTxt: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterPillTxt: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filterPillTxtActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  spotCard: {
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
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  evBadge: {
    backgroundColor: '#3b82f6',
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceTxt: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  spotTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  spotAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  distChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  distIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  distTxt: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  vehiclePill: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaCol: {},
  metaLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  metaVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookBtnTxt: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTxt: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
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
