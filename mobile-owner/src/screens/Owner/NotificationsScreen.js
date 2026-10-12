import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
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
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import { endpoints, COMMON_HEADERS } from '../../config/api';
import Header from '../../components/Header';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Swipeable Notification Item Component for Owner
function SwipeableOwnerNotificationItem({ item, onDelete, onMarkRead, navigation, isStorageOwner }) {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15;
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > SCREEN_WIDTH * 0.35) {
          const direction = gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;
          Animated.timing(pan, {
            toValue: { x: direction, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDelete(item._id || item.id);
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'booking_request':
      case 'new_booking':
        return '📑';
      case 'payment_credit':
      case 'wallet_credit':
        return '💰';
      case 'slot_allotted':
        return '🅿️';
      case 'booking_confirmation':
        return '🎟️';
      case 'cancellation':
        return '❌';
      case 'review_received':
        return '⭐';
      default:
        return '📢';
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'booking_request':
      case 'new_booking':
        return { bg: '#1e3a8a30', border: '#3b82f6', text: '#60a5fa', label: 'BOOKING' };
      case 'payment_credit':
      case 'wallet_credit':
        return { bg: '#064e3b30', border: '#10b981', text: '#34d399', label: 'PAYMENT' };
      case 'slot_allotted':
        return { bg: '#854d0e30', border: '#eab308', text: '#facc15', label: 'SLOT ALLOTTED' };
      case 'cancellation':
        return { bg: '#88133730', border: '#f43f5e', text: '#fb7185', label: 'CANCELLED' };
      case 'review_received':
        return { bg: '#581c8730', border: '#a855f7', text: '#c084fc', label: 'REVIEW' };
      default:
        return { bg: '#1e293b', border: '#475569', text: '#94a3b8', label: 'ALERT' };
    }
  };

  const badge = getBadgeStyle(item.type);

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeBackground}>
        <Text style={styles.swipeActionTxt}>🗑️ Swipe to Clear</Text>
        <Text style={styles.swipeActionTxt}>🗑️ Swipe to Clear</Text>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          !item.isRead && styles.cardUnread,
          { transform: [{ translateX: pan.x }] },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBadgeRow}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 20 }}>{getNotifIcon(item.type)}</Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.typeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.typeBadgeTxt, { color: badge.text }]}>{badge.label}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.dateTxt}>
                {new Date(item.createdAt || Date.now()).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onDelete(item._id || item.id)}
            style={styles.deleteCardBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteCardTxt}>✕ Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.titleTxt}>{item.title}</Text>
        <Text style={styles.messageTxt}>{item.message}</Text>

        {/* Action Button for Bookings */}
        {['booking_request', 'new_booking', 'booking_confirmation', 'slot_allotted'].includes(item.type) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              navigation.navigate('Orders');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnTxt}>View Booking Orders →</Text>
          </TouchableOpacity>
        )}

        {/* Action Button for Payments */}
        {['payment_credit', 'wallet_credit'].includes(item.type) && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#10b981', backgroundColor: '#064e3b30' }]}
            onPress={() => {
              navigation.navigate('Wallet');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnTxt, { color: '#34d399' }]}>View Wallet Earnings →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.swipeHintTxt}>👈 Swipe left or right to dismiss 👉</Text>
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const isStorageOwner = user?.accountCategory === 'vehicle_storage_owner';
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(endpoints.getNotifications, {
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.log('Error fetching owner notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [token])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(endpoints.readAllNotifications, {
        method: 'POST',
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.log('Error marking all read:', err.message);
    }
  };

  const handleDeleteNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
    try {
      await fetch(endpoints.deleteNotification(id), {
        method: 'DELETE',
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.log('Error deleting notification:', err.message);
    }
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All Notifications?',
      'Are you sure you want to remove all alerts from your inbox?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            setUnreadCount(0);
            try {
              await fetch(endpoints.clearAllNotifications, {
                method: 'DELETE',
                headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
              });
            } catch (err) {
              console.log('Error clearing notifications:', err.message);
            }
          },
        },
      ]
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'bookings') {
      return ['booking_request', 'new_booking', 'booking_confirmation', 'slot_allotted', 'cancellation'].includes(n.type);
    }
    if (activeFilter === 'payments') {
      return ['payment_credit', 'wallet_credit'].includes(n.type);
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="In-App Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
        onBack={() => navigation.goBack()}
      />

      {/* Top Filter Chips & Actions */}
      <View style={styles.topActionsRow}>
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.pill, activeFilter === 'all' && styles.pillActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.pillTxt, activeFilter === 'all' && styles.pillTxtActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, activeFilter === 'bookings' && styles.pillActive]}
            onPress={() => setActiveFilter('bookings')}
          >
            <Text style={[styles.pillTxt, activeFilter === 'bookings' && styles.pillTxtActive]}>
              📑 Bookings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, activeFilter === 'payments' && styles.pillActive]}
            onPress={() => setActiveFilter('payments')}
          >
            <Text style={[styles.pillTxt, activeFilter === 'payments' && styles.pillTxtActive]}>
              💰 Earnings
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn} activeOpacity={0.8}>
              <Text style={styles.clearAllTxt}>🗑️ Clear All</Text>
            </TouchableOpacity>
          )}
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn} activeOpacity={0.8}>
              <Text style={styles.markReadTxt}>Mark read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={isStorageOwner ? COLORS.storageAccent : COLORS.ownerAccent} />
          <Text style={styles.loadingTxt}>Loading alerts & notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          renderItem={({ item }) => (
            <SwipeableOwnerNotificationItem
              item={item}
              onDelete={handleDeleteNotification}
              onMarkRead={handleMarkAllRead}
              navigation={navigation}
              isStorageOwner={isStorageOwner}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isStorageOwner ? COLORS.storageAccent : COLORS.ownerAccent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>Zero Notifications</Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'all'
                  ? 'Your notification inbox is clean. When seekers book your parking spots or earnings are credited, alerts will appear here.'
                  : `No ${activeFilter} notifications available at the moment.`}
              </Text>
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillActive: {
    backgroundColor: COLORS.ownerAccent || '#3b82f6',
    borderColor: COLORS.ownerAccent || '#3b82f6',
  },
  pillTxt: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  pillTxtActive: {
    color: COLORS.white,
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  clearAllTxt: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  markReadTxt: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  swipeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#991b1b',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeActionTxt: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardUnread: {
    borderColor: '#3b82f6',
    backgroundColor: '#0f1f38',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeTxt: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  dateTxt: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  deleteCardBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deleteCardTxt: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
  },
  titleTxt: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  messageTxt: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  actionBtn: {
    marginTop: 10,
    backgroundColor: '#1e3a8a30',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  actionBtnTxt: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
  },
  swipeHintTxt: {
    color: '#475569',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingTxt: {
    color: COLORS.textMuted,
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
