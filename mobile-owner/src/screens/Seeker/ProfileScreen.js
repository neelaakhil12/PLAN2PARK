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
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Profile" subtitle="Account Settings" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarTxt}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'PlanToPark User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagTxt}>{(user?.role || 'seeker').toUpperCase()}</Text>
          </View>
        </View>

        {/* Saved Vehicles */}
        <Text style={styles.sectionTitle}>Saved Vehicles</Text>
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>🚗 TS 07 AB 1234 (Primary Car)</Text>
          <Text style={styles.itemSub}>Honda City • Sedan</Text>
        </View>

        {/* Support & Policies */}
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <TouchableOpacity style={styles.linkCard}>
          <Text style={styles.linkTxt}>📞 24/7 Customer Support Desk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard}>
          <Text style={styles.linkTxt}>📜 Terms of Service & Privacy Policy</Text>
        </TouchableOpacity>

        <Button
          title="Sign Out"
          onPress={logout}
          variant="danger"
          style={{ marginTop: 24 }}
        />
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
  profileCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  avatarBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTxt: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
  },
  userName: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  roleTagTxt: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 10,
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  itemTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  linkCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  linkTxt: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
