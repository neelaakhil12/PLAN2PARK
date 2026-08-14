import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import Header from '../../components/Header';
import { AuthContext } from '../../context/AuthContext';
import { getBaseApiUrl } from '../../config/api';
import { useIsFocused } from '@react-navigation/native';

export default function WalletScreen() {
  const { token } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isFocused && token) {
      fetchWalletData();
    }
  }, [isFocused, token]);

  const fetchWalletData = async () => {
    try {
      const baseUrl = await getBaseApiUrl();
      const [walletRes, bookingsRes] = await Promise.all([
        fetch(`${baseUrl}/auth/wallet`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${baseUrl}/bookings/my-bookings`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (walletRes.ok) {
        const wData = await walletRes.json();
        setBalance(wData.walletBalance || 0);

        if (wData.walletTransactions && wData.walletTransactions.length > 0) {
          setTransactions(wData.walletTransactions);
        } else if (bookingsRes.ok) {
          const bData = await bookingsRes.json();
          const bList = Array.isArray(bData) ? bData : [];
          // Map bookings into transaction ledger items
          const mapped = bList.map((b) => ({
            _id: b._id,
            type: b.status === 'cancelled' && b.refundAmount > 0 ? 'credit' : 'debit',
            amount: b.status === 'cancelled' && b.refundAmount > 0 ? b.refundAmount : b.totalAmount,
            description: b.status === 'cancelled' && b.refundAmount > 0
              ? `Refund (${b.refundPolicyApplied === 'half' ? '50% Half' : '100% Full'}) for ${b.spaceId?.title || 'Parking Spot'}`
              : `Parking Reservation • ${b.spaceId?.title || 'Spot'} (${b.vehicleNumber || 'Car'})`,
            date: b.updatedAt || b.createdAt,
          }));
          setTransactions(mapped);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="PlanToPark Wallet" subtitle="Cancellation Refunds & Digital Wallet" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchWalletData();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Wallet Balance Banner */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Refund & Wallet Balance</Text>
          <Text style={styles.balanceVal}>₹{Number(balance).toLocaleString('en-IN')}.00</Text>
          <Text style={styles.balanceTag}>⚡ Auto-credited on cancellation & usable for parking</Text>
        </View>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Wallet Ledger & Cancellation Refunds</Text>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>💳</Text>
            <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }}>No wallet transactions yet</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Refunds from cancelled bookings will automatically appear here.
            </Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.type === 'credit';
            return (
              <View key={tx._id || Math.random().toString()} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={[styles.txIconBox, { backgroundColor: isCredit ? '#064e3b' : '#334155' }]}>
                    <Text style={styles.txIcon}>{isCredit ? '💸' : '🚗'}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>{tx.description || (isCredit ? 'Cancellation Refund' : 'Parking Booking')}</Text>
                    <Text style={styles.txSub}>{new Date(tx.date || Date.now()).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={isCredit ? styles.txAmtPlus : styles.txAmtMinus}>
                    {isCredit ? '+' : '-'} ₹{tx.amount || 0}.00
                  </Text>
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
  content: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  balanceLabel: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.85,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceVal: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '900',
    marginVertical: 8,
  },
  balanceTag: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 12,
  },
  txCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIcon: {
    fontSize: 20,
  },
  txInfo: {
    flex: 1,
    paddingRight: 8,
  },
  txTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  txSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  txAmtMinus: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
  },
  txAmtPlus: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
});
