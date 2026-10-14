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
import Button from '../../components/Button';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>PlanToPark Seeker</Text>
          <Text style={styles.tagline}>Park Smart. Find & Reserve Parking Spots Instantly.</Text>
        </View>

        <View style={styles.buttonContainer}>
          {/* Parking Seeker Login */}
          <Button
            title="Login as Parking Seeker"
            onPress={() => navigation.navigate('Login', { role: 'seeker', category: 'standard' })}
            style={styles.loginBtn}
          />

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register', { role: 'seeker', category: 'standard' })}
          >
            <Text style={styles.registerTxt}>Don't have an account? Sign Up as Parking Seeker</Text>
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 26,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
  },
  registerBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  registerTxt: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerTxt: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginHorizontal: 12,
  },
  bankLoginBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderWidth: 1.5,
    borderColor: '#0ea5e9',
    borderRadius: 14,
    padding: 14,
  },
  bankBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  bankTextCol: {
    flex: 1,
  },
  bankBtnTitle: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  bankBtnSubtitle: {
    color: '#94a3b8',
    fontSize: 11.5,
    lineHeight: 16,
  },
  bankRegisterBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  bankRegisterTxt: {
    color: '#0ea5e9',
    fontSize: 13,
    fontWeight: '700',
  },
});
