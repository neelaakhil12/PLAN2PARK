import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Logo with updated branding */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>PlanToPark</Text>
          <Text style={styles.tagline}>PARK SMART, EARN SMART</Text>
        </View>

        <Text style={styles.title}>Select Your Portal</Text>
        <Text style={styles.subtitle}>Choose how you want to use PlanToPark today</Text>

        {/* Option 1: Seeker */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.seekerAccent }]}
          onPress={() => navigation.navigate('Login', { role: 'seeker', category: 'standard' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
            <Text style={styles.cardEmoji}>🚗</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.roleTitle}>Parking Seeker</Text>
            <Text style={styles.roleDesc}>Find, reserve, and pay for verified commuter parking spots near your destination instantly.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.seekerAccent }]}>→</Text>
        </TouchableOpacity>

        {/* Option 2: Spot Owner */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.ownerAccent }]}
          onPress={() => navigation.navigate('Login', { role: 'owner', category: 'standard' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
            <Text style={styles.cardEmoji}>🅿️</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.roleTitle}>Space Owner</Text>
            <Text style={styles.roleDesc}>List your vacant garage, driveways, or residential spots and turn empty space into income.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.ownerAccent }]}>→</Text>
        </TouchableOpacity>

        {/* Option 3: NEW! Vehicle Storage Landowner (Min 1 Acre) */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.storageAccent, backgroundColor: 'rgba(245, 158, 11, 0.06)' }]}
          onPress={() => navigation.navigate('Login', { role: 'owner', category: 'vehicle_storage_owner' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Text style={styles.cardEmoji}>🏢</Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.roleTitle}>Vehicle Storage Land</Text>
              <View style={styles.miniBadgeAmber}><Text style={styles.miniBadgeAmberTxt}>1+ ACRE</Text></View>
            </View>
            <Text style={styles.roleDesc}>List 1+ Acre secure land for Banks & Auto Finance companies to store seized & repossession vehicles.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.storageAccent }]}>→</Text>
        </TouchableOpacity>

        {/* Option 4: NEW! Banks & Auto Finance Companies */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.bankAccent, backgroundColor: 'rgba(14, 165, 233, 0.06)' }]}
          onPress={() => navigation.navigate('Login', { role: 'seeker', category: 'bank_finance_seeker' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(14, 165, 233, 0.2)' }]}>
            <Text style={styles.cardEmoji}>🏦</Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.roleTitle}>Banks & Auto Finance</Text>
              <View style={styles.miniBadgeCyan}><Text style={styles.miniBadgeCyanTxt}>REPO YARDS</Text></View>
            </View>
            <Text style={styles.roleDesc}>Book high-security 1+ Acre stockyards with 24/7 guards & CCTV for seized/repossessed vehicles.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.bankAccent }]}>→</Text>
        </TouchableOpacity>

        {/* Option 5: Admin */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: '#475569' }]}
          onPress={() => navigation.navigate('Login', { role: 'admin' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#1e293b' }]}>
            <Text style={styles.cardEmoji}>👑</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.roleTitle}>Platform Admin</Text>
            <Text style={styles.roleDesc}>Oversee system operations, verify listings, and manage user support.</Text>
          </View>
          <Text style={[styles.arrow, { color: '#94a3b8' }]}>→</Text>
        </TouchableOpacity>

        {/* Footer info */}
        <Text style={styles.footerNote}>🇮🇳 India's Most Trusted Parking & Stockyard Marketplace</Text>
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
    padding: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 28,
  },
  logoImg: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 12,
  },
  miniBadgeAmber: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeAmberTxt: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  miniBadgeCyan: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniBadgeCyanTxt: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginVertical: 8,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  arrow: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footerNote: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 28,
  },
});
