import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Plan2Park Owner</Text>
          <Text style={styles.tagline}>List Your Parking Space & Earn Smart.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Login into Plan2Park Owner App"
            onPress={() => navigation.navigate('Login', { role: 'owner' })}
            style={styles.loginBtn}
          />

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register', { role: 'owner' })}
          >
            <Text style={styles.registerTxt}>Don't have an account? Register as Owner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 28,
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  loginBtn: {
    backgroundColor: COLORS.ownerAccent,
    paddingVertical: 16,
    borderRadius: 14,
  },
  registerBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  registerTxt: {
    color: COLORS.ownerAccent,
    fontSize: 15,
    fontWeight: '700',
  },
});
