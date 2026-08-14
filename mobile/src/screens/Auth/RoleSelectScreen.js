import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Logo */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeTxt}>P</Text>
          </View>
          <Text style={styles.brandName}>PlanToPark</Text>
          <Text style={styles.tagline}>Smart Park. Smart Earn.</Text>
        </View>

        <Text style={styles.title}>Select Your Role</Text>
        <Text style={styles.subtitle}>Choose how you want to use PlanToPark today</Text>

        {/* Option 1: Seeker */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.primary }]}
          onPress={() => navigation.navigate('Login', { role: 'seeker' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#ecfdf5' }]}>
            <Text style={styles.cardEmoji}>🚗</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.roleTitle}>Parking Seeker</Text>
            <Text style={styles.roleDesc}>Find, reserve, and pay for verified parking spots near your destination instantly.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.primary }]}>→</Text>
        </TouchableOpacity>

        {/* Option 2: Spot Owner */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.ownerAccent }]}
          onPress={() => navigation.navigate('Login', { role: 'owner' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#f3e8ff' }]}>
            <Text style={styles.cardEmoji}>🅿️</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.roleTitle}>Space Owner</Text>
            <Text style={styles.roleDesc}>List your vacant garage or driveways and turn empty spaces into passive income.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.ownerAccent }]}>→</Text>
        </TouchableOpacity>

        {/* Option 3: Admin */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.adminAccent }]}
          onPress={() => navigation.navigate('Login', { role: 'admin' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.cardEmoji}>👑</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.roleTitle}>Platform Admin</Text>
            <Text style={styles.roleDesc}>Oversee system operations, verify listings, and manage user support.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.adminAccent }]}>→</Text>
        </TouchableOpacity>

        {/* Footer info */}
        <Text style={styles.footerNote}>🇮🇳 India's Most Trusted Parking Marketplace</Text>
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
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoBadgeTxt: {
    color: COLORS.white,
    fontSize: 32,
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
