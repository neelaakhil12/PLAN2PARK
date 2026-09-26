import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function LoginScreen({ route, navigation }) {
  const isBankSeeker = route.params?.category === 'bank_finance_seeker';

  const { loginForRole } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const roleTitle = isBankSeeker ? 'Banks & Finance Login' : 'Parking Seeker Login';
  const themeColor = isBankSeeker ? COLORS.bankAccent : COLORS.seekerAccent;

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await loginForRole('seeker', email.trim(), password, isBankSeeker ? 'bank_finance_seeker' : 'standard');
    } catch (err) {
      const msg = err.message || 'Invalid credentials';
      setErrorMsg(msg);
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title={roleTitle} subtitle="PlanToPark Seeker" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.roleBadgeTxt}>
              {isBankSeeker ? '🏦 BANKS & AUTO FINANCE LOGIN' : '🚗 PARKING SEEKER LOGIN'}
            </Text>
          </View>
        </View>

        <Text style={styles.heading}>
          {isBankSeeker ? 'Bank & Auto Finance 🏦' : 'Welcome Back 👋'}
        </Text>
        <Text style={styles.subheading}>
          {isBankSeeker
            ? 'Search & reserve secured 1+ Acre stockyards for repossessed vehicles'
            : 'Enter your credentials to search and reserve parking spots'}
        </Text>

        {!!errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Login Failed</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder={isBankSeeker ? 'e.g. recovery@bank.com' : 'e.g. name@example.com'}
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={{ alignSelf: 'flex-end', marginTop: 8 }}
            onPress={() => navigation.navigate('ForgotPassword', { role: 'seeker', email })}
          >
            <Text style={{ color: themeColor, fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={loading ? 'Signing in...' : isBankSeeker ? 'Sign In as Bank / Auto Finance' : 'Sign In as Parking Seeker'}
          onPress={handleLogin}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: themeColor }]}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerTxt}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Register', {
                role: 'seeker',
                category: isBankSeeker ? 'bank_finance_seeker' : 'standard',
              })
            }
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>
              {isBankSeeker ? 'Register Bank / Repo Dept' : 'Sign Up as Parking Seeker'}
            </Text>
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
  content: {
    padding: 24,
    paddingTop: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleBadgeTxt: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  eyeBtn: {
    padding: 8,
  },
  submitBtn: {
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingBottom: 20,
  },
  footerTxt: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  footerLink: {
    fontWeight: '700',
    fontSize: 14,
  },
});
