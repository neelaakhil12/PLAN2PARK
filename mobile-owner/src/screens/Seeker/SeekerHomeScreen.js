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
import { AuthContext } from '../../context/AuthContext';
import { endpoints } from '../../config/api';
import { COLORS } from '../../theme/colors';

export default function SeekerHomeScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEv, setFilterEv] = useState(false);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const res = await fetch(endpoints.getSpaces, {
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Remainder': 'true' }
      });
      const data = await res.json();
      if (res.ok) {
        setSpaces(Array.isArray(data) ? data : data.spaces || []);
      }
    } catch (err) {
      console.error('Error fetching spaces:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredSpaces = spaces.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEv = filterEv ? item.hasEvCharger : true;
    return matchesSearch && matchesEv;
  });

  const renderSpotCard = ({ item }) => (
    <TouchableOpacity
      style={styles.spotCard}
      onPress={() => navigation.navigate('SpotDetails', { space: item })}
      activeOpacity={0.88}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badgeGroup}>
          <Text style={styles.verifiedBadge}>VERIFIED</Text>
          {item.hasEvCharger && <Text style={styles.evBadge}>⚡ EV CHARGING</Text>}
        </View>
        <Text style={styles.priceTxt}>₹{item.hourlyRate || 40}<Text style={styles.priceUnit}>/hr</Text></Text>
      </View>

      <Text style={styles.spotTitle}>{item.title}</Text>
      <Text style={styles.spotAddress}>📍 {item.address || 'Central Area'}, {item.city || 'Hyderabad'}</Text>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Available Spots</Text>
          <Text style={styles.metaVal}>{item.totalSpots || 5} Spots</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('SpotDetails', { space: item })}
        >
          <Text style={styles.bookBtnTxt}>Book Spot →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* App Header with Notch Top Inset */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.name || 'Seeker'} 👋</Text>
          <Text style={styles.headerSub}>Find secure parking nearby</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location, area or landmark..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {/* Filter Pills */}
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
          <Text style={styles.loadingTxt}>Fetching available parking spots...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSpaces}
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
              <Text style={styles.emptyTitle}>No Parking Spots Found</Text>
              <Text style={styles.emptySub}>Try searching for another location or clear filters</Text>
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
  searchSection: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    marginBottom: 12,
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
