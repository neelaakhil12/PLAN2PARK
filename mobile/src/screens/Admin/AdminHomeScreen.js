import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';

export default function AdminHomeScreen() {
  const { user, logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>System Admin Hub 👑</Text>
          <Text style={styles.headerSub}>{user?.email || 'plantopark@gmail.com'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Admin KPI Cards */}
        <View style={styles.grid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>128</Text>
            <Text style={styles.kpiLabel}>Total Users</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: COLORS.primary }]}>42</Text>
            <Text style={styles.kpiLabel}>Active Spots</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: COLORS.adminAccent }]}>310</Text>
            <Text style={styles.kpiLabel}>Total Bookings</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#3b82f6' }]}>₹24,800</Text>
            <Text style={styles.kpiLabel}>Platform Revenue</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>System Operations</Text>

        <TouchableOpacity style={styles.adminActionCard}>
          <Text style={styles.adminActionIcon}>🛡️</Text>
          <View style={styles.adminActionInfo}>
            <Text style={styles.adminActionTitle}>Verify Owner Spots</Text>
            <Text style={styles.adminActionSub}>Review pending space listings & security approval</Text>
          </View>
          <Text style={styles.badgeCount}>3 Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminActionCard}>
          <Text style={styles.adminActionIcon}>👥</Text>
          <View style={styles.adminActionInfo}>
            <Text style={styles.adminActionTitle}>Manage Users & Roles</Text>
            <Text style={styles.adminActionSub}>Inspect Seekers, Owners & Admin permissions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminActionCard}>
          <Text style={styles.adminActionIcon}>🚨</Text>
          <View style={styles.adminActionInfo}>
            <Text style={styles.adminActionTitle}>Complaints & Support Tickets</Text>
            <Text style={styles.adminActionSub}>Resolve parking disputes & refund requests</Text>
          </View>
        </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.adminAccent,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  kpiVal: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.white,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  adminActionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  adminActionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  adminActionInfo: {
    flex: 1,
  },
  adminActionTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  adminActionSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badgeCount: {
    backgroundColor: COLORS.adminAccent,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
