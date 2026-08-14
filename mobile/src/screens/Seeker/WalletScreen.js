import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function WalletScreen() {
  const [balance, setBalance] = useState(500);

  const handleAddMoney = (amount) => {
    setBalance((prev) => prev + amount);
    Alert.alert('Wallet Recharged', `₹${amount} added successfully to your PlanToPark Wallet!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="PlanToPark Wallet" subtitle="Instant One-Tap Payments" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Wallet Balance Banner */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceVal}>₹{balance}.00</Text>
          <Text style={styles.balanceTag}>⚡ Auto-applied at checkout</Text>
        </View>

        {/* Quick Top-up Options */}
        <Text style={styles.sectionTitle}>Add Money to Wallet</Text>
        <View style={styles.topUpRow}>
          {[100, 250, 500, 1000].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.amtBtn}
              onPress={() => handleAddMoney(amt)}
            >
              <Text style={styles.amtTxt}>+ ₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        <View style={styles.txCard}>
          <View style={styles.txRow}>
            <View style={styles.txIconBox}><Text style={styles.txIcon}>🚗</Text></View>
            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>Booking #P2P-8921</Text>
              <Text style={styles.txSub}>Hitech City Parking • 2 hrs</Text>
            </View>
            <Text style={styles.txAmtMinus}>- ₹80.00</Text>
          </View>
        </View>

        <View style={styles.txCard}>
          <View style={styles.txRow}>
            <View style={[styles.txIconBox, { backgroundColor: '#d1fae5' }]}><Text style={styles.txIcon}>➕</Text></View>
            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>Wallet Top-up</Text>
              <Text style={styles.txSub}>UPI Payment • Successful</Text>
            </View>
            <Text style={styles.txAmtPlus}>+ ₹500.00</Text>
          </View>
        </View>
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
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceVal: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 6,
  },
  balanceTag: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  topUpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  amtBtn: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  amtTxt: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIcon: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  txSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  txAmtMinus: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  txAmtPlus: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
