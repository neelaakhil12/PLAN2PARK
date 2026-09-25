import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>PlanToPark Seeker</Text>
          <Text style={styles.tagline}>SEARCH PARKING & SECURE STORAGE</Text>
        </View>

        <Text style={styles.title}>Select Your Service</Text>
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

        {/* Option 2: Banks & Auto Finance Companies */}
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
    paddingTop: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  logoImg: {
    width: 90,
    height: 90,
    borderRadius: 18,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.seekerAccent,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#94a3b8',
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 8,
  },
  miniBadgeCyan: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeCyanTxt: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 9,
  },
});
