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
          <Text style={styles.brandTitle}>Plan2Park Owner</Text>
          <Text style={styles.tagline}>List Your Parking Space or Land & Earn Smart.</Text>
        </View>

        {/* ℹ️ Mandatory 1 Acre Land Requirement Notice before Login/Account creation */}
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteIcon}>🏢</Text>
            <Text style={styles.noteTitle}>VEHICLE STORAGE LAND REQUIREMENT</Text>
          </View>
          <Text style={styles.noteBody}>
            For listing land as a Commercial Vehicle Storage Yard for Banks & Auto Finance companies (seized vehicle stockyard), a <Text style={styles.noteHighlight}>minimum of 1.0 Acre land</Text> is strictly required.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Login into Plan2Park Owner App"
            onPress={() => navigation.navigate('Login', { role: 'owner' })}
            style={styles.loginBtn}
          />

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register', { role: 'owner', category: 'standard' })}
          >
            <Text style={styles.registerTxt}>Don't have an account? Register as Owner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.storageLandBtn}
            onPress={() => navigation.navigate('Register', { role: 'owner', category: 'vehicle_storage_owner' })}
          >
            <Text style={styles.storageLandTxt}>🏢 Register 1+ Acre Land for Bank Vehicle Storage →</Text>
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
    marginBottom: 16,
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
    fontSize: 14.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  noteContainer: {
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 14,
    padding: 14,
    marginVertical: 18,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteTitle: {
    color: '#f59e0b',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  noteBody: {
    color: '#e2e8f0',
    fontSize: 12.5,
    lineHeight: 18,
  },
  noteHighlight: {
    color: '#fbbf24',
    fontWeight: '800',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: COLORS.ownerAccent,
    paddingVertical: 15,
    borderRadius: 14,
  },
  registerBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  registerTxt: {
    color: COLORS.ownerAccent,
    fontSize: 14.5,
    fontWeight: '700',
  },
  storageLandBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
  },
  storageLandTxt: {
    color: '#f59e0b',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
