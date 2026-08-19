import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { getBaseApiUrl, endpoints, COMMON_HEADERS } from '../../config/api';
import { COLORS } from '../../theme/colors';
import PinLocationModal from '../../components/PinLocationModal';
import ProfileEditorModal from '../../components/ProfileEditorModal';
import DynamicParkingMap, { getSpotDemand } from '../../components/DynamicParkingMap';

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

const RADIUS_OPTIONS = [
  { label: 'All', value: null, icon: '🌐' },
  { label: '1 km', value: 1, icon: '🎯' },
  { label: '5 km', value: 5, icon: '🎯' },
  { label: '10 km', value: 10, icon: '🎯' },
  { label: '15 km', value: 15, icon: '🎯' },
  { label: '20 km', value: 20, icon: '🎯' },
  { label: '25 km', value: 25, icon: '🎯' },
];

export default function SeekerHomeScreen({ navigation }) {
  const { user, token, updateProfile, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [spaces, setSpaces] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEv, setFilterEv] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(null); // null (All), 1, 5, 10, 15, 20 km
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [selectedMapSpot, setSelectedMapSpot] = useState(null);

  // Location pinning state (prompts upon login/open)
  const [pinnedLocation, setPinnedLocation] = useState('Almasguda (17.313, 78.545)');
  const [showPinModal, setShowPinModal] = useState(true);

  // Profile completion state (ONLY for newly registered users)
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Parse coordinates from pinnedLocation (e.g. "Almasguda (17.313, 78.545)")
  const userCoords = useMemo(() => {
    const match = pinnedLocation.match(/\(([0-9.]+),\s*([0-9.]+)\)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    return { lat: 17.313, lng: 78.545 };
  }, [pinnedLocation]);

  const fetchUnreadNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(endpoints.getNotifications, {
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifs(data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadNotifications();
    }, [token])
  );

  useEffect(() => {
    fetchSpaces();
    checkProfileCompletion();
    fetchUnreadNotifications();
  }, [user, token]);

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
    const sLat = space.coordinates?.lat || space.lat || (space.location?.coordinates && space.location.coordinates[1]);
    const sLng = space.coordinates?.lng || space.lng || (space.location?.coordinates && space.location.coordinates[0]);
    const dist = calculateDistanceKm(seekerCoords.lat, seekerCoords.lng, sLat, sLng);
    return {
      ...space,
      calculatedDist: dist !== null ? dist : 999,
      distBadge: dist !== null ? `${dist} km away` : 'Nearby',
    };
  });

  // Sort by nearest distance first
  const sortedSpaces = [...processedSpaces].sort((a, b) => (a.calculatedDist || 999) - (b.calculatedDist || 999));

  // Apply search, EV, Active status & Distance Radius filters
  const displaySpaces = sortedSpaces.filter((item) => {
    // Hide offline spaces from seeker list
    if (item.isActive === false) return false;

    // Distance Radius Filter
    if (selectedRadius !== null && item.calculatedDist !== null && item.calculatedDist > selectedRadius) {
      return false;
    }

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
    const demand = getSpotDemand({ ...item, totalSlots, availableSlots });

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

        {/* Distance + Vehicle + Live Demand Badges Row */}
        <View style={styles.distanceRow}>
          <View style={styles.distChip}>
            <Text style={styles.distIcon}>🎯</Text>
            <Text style={styles.distTxt}>{item.distBadge}</Text>
          </View>
          <Text style={styles.vehiclePill}>🚗 {item.suitableVehicles ? item.suitableVehicles.join(', ') : '4-wheeler'}</Text>
          <View style={[styles.cardDemandBadge, { backgroundColor: demand.bg, borderColor: demand.color }]}>
            <Text style={[styles.cardDemandTxt, { color: demand.color }]}>
              {demand.badge}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTagline}>Helps users decide before traveling.</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Real-Time Capacity</Text>
            <Text style={[styles.metaVal, { color: demand.color, fontWeight: '800' }]} numberOfLines={1}>
              {isFull ? '🔴 FULL (0 Left)' : `🟢 ${availableSlots} of ${totalSlots} Slots Free`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, isFull && { backgroundColor: '#334155' }]}
            onPress={() => navigation.navigate('SpotDetails', { space: item })}
            activeOpacity={0.85}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.notifBellBtn}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 20 }}>🔔</Text>
            {unreadNotifs > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeTxt}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutTxt}>Logout</Text>
          </TouchableOpacity>
        </View>
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

      {/* Search Bar & Distance Filter Options */}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {RADIUS_OPTIONS.map((opt) => {
            const isSelected = selectedRadius === opt.value;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setSelectedRadius(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterPillTxt, isSelected && styles.filterPillTxtActive]}>
                  {opt.icon} {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.filterPill, filterEv && styles.filterPillActive]}
            onPress={() => setFilterEv(!filterEv)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillTxt, filterEv && styles.filterPillTxtActive]}>
              ⚡ EV Only
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Parking Demand Heat Map Info Banner */}
      <View style={styles.heatMapBanner}>
        <View style={styles.heatMapHeader}>
          <Text style={styles.heatMapTitle}>🔥 Parking Demand Heat Map</Text>
          <View style={styles.heatMapLegend}>
            <View style={styles.legendPill}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendTxt}>Easy</Text>
            </View>
            <View style={styles.legendPill}>
              <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.legendTxt}>Moderate</Text>
            </View>
            <View style={styles.legendPill}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendTxt}>Full</Text>
            </View>
          </View>
        </View>
        <Text style={styles.heatMapTagline}>Helps users decide before traveling.</Text>
      </View>

      {/* View Mode Toggle Switch (Map vs List) */}
      <View style={styles.viewModeRow}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'map' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('map')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewModeTxt, viewMode === 'map' && styles.viewModeTxtActive]}>
            🗺️ Live Map View ({displaySpaces.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewModeTxt, viewMode === 'list' && styles.viewModeTxtActive]}>
            📋 List View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content: Map or List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTxt}>Fetching owner parking spaces from database...</Text>
        </View>
      ) : viewMode === 'map' ? (
        <View style={{ flex: 1 }}>
          <DynamicParkingMap
            userLat={userCoords.lat}
            userLng={userCoords.lng}
            userLocationName={pinnedLocation}
            spots={displaySpaces}
            selectedSpot={selectedMapSpot}
            onSelectSpot={(spot, navigateDirectly) => {
              if (navigateDirectly) {
                navigation.navigate('SpotDetails', { space: spot });
              } else {
                setSelectedMapSpot(spot);
              }
            }}
            onCloseCard={() => setSelectedMapSpot(null)}
          />
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
    backgroundColor: '#334155',
  },
  logoutTxt: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  notifBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.darkBg,
  },
  notifBadgeTxt: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
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
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingRight: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginRight: 8,
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
  heatMapBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heatMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  heatMapTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  heatMapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendTxt: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
  },
  heatMapTagline: {
    color: '#94a3b8',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardDemandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
  },
  cardDemandTxt: {
    fontSize: 9,
    fontWeight: '900',
  },
  cardTagline: {
    color: '#94a3b8',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 2,
  },
  viewModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#0b1120',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  viewModeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewModeTxt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  viewModeTxtActive: {
    color: '#ffffff',
    fontWeight: '900',
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
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  distChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  distIcon: {
    fontSize: 11,
    marginRight: 3,
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
    gap: 10,
  },
  metaCol: {
    flex: 1,
    marginRight: 8,
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    flexShrink: 0,
  },
  bookBtnTxt: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
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
