import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>PlanToPark</Text>
          <Text style={styles.tagline}>Park Smart • Earn Smart</Text>
          <Text style={styles.subTagline}>The all-in-one platform for parking seekers and space owners</Text>
        </View>

        {/* Portal Selection Options */}
        <View style={styles.buttonContainer}>
          <Text style={styles.chooseText}>Choose how you want to use PlanToPark:</Text>

          {/* Option 1: Seeker */}
          <TouchableOpacity
            style={[styles.portalCard, styles.seekerCard]}
            onPress={() => navigation.navigate('Login', { role: 'seeker', category: 'standard' })}
            activeOpacity={0.88}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.2)' }]}>
                <Text style={styles.iconEmoji}>🚗</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>I Want Parking</Text>
                <Text style={styles.cardDesc}>Find, navigate, and reserve parking spots instantly near you.</Text>
              </View>
              <Text style={[styles.arrow, { color: COLORS.seekerAccent }]}>→</Text>
            </View>
            <View style={styles.actionRow}>
              <Text style={[styles.loginLabel, { color: COLORS.seekerAccent }]}>Login as Seeker</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register', { role: 'seeker', category: 'standard' })}
              >
                <Text style={styles.registerSmall}>Sign Up →</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Option 2: Owner */}
          <TouchableOpacity
            style={[styles.portalCard, styles.ownerCard]}
            onPress={() => navigation.navigate('Login', { role: 'owner', category: 'standard' })}
            activeOpacity={0.88}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.2)' }]}>
                <Text style={styles.iconEmoji}>🅿️</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>I Have Parking</Text>
                <Text style={styles.cardDesc}>Monetize your empty driveways, garages, or private spots.</Text>
              </View>
              <Text style={[styles.arrow, { color: COLORS.ownerAccent }]}>→</Text>
            </View>
            <View style={styles.actionRow}>
              <Text style={[styles.loginLabel, { color: COLORS.ownerAccent }]}>Login as Space Owner</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register', { role: 'owner', category: 'standard' })}
              >
                <Text style={styles.registerSmall}>Sign Up →</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerNote}>© PlanToPark • Safe, Secure & Verified Spaces</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 24,
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subTagline: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  chooseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
  },
  portalCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1.5,
  },
  seekerCard: {
    borderColor: 'rgba(37, 99, 235, 0.5)',
  },
  ownerCard: {
    borderColor: 'rgba(124, 58, 237, 0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconEmoji: {
    fontSize: 24,
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12.5,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  arrow: {
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  loginLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  registerSmall: {
    color: '#94a3b8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },
});
