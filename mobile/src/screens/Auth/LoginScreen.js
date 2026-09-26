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
  const initialRole = route.params?.role || 'owner';
  const initialCategory = route.params?.category || (initialRole === 'owner' ? 'vehicle_storage_owner' : 'standard');
  const [currentCategory, setCurrentCategory] = useState(initialCategory);
  const role = (currentCategory === 'bank_finance_seeker') ? 'seeker' : (currentCategory === 'vehicle_storage_owner' ? 'owner' : initialRole);

  const { loginForRole } = useContext(AuthContext);

  const [email, setEmail] = useState(role === 'admin' ? 'plantopark@gmail.com' : '');
  const [password, setPassword] = useState(role === 'admin' ? 'Plan2park@12' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isStorageOwner = currentCategory === 'vehicle_storage_owner';
  const isBankSeeker = currentCategory === 'bank_finance_seeker';

  const roleTitle = isStorageOwner
    ? 'Vehicle Storage Login'
    : isBankSeeker
    ? 'Banks & Finance Login'
    : role === 'seeker'
    ? 'Seeker Login'
    : role === 'owner'
    ? 'Owner Login'
    : 'Admin Login';

  const themeColor = isStorageOwner
    ? COLORS.storageAccent
    : isBankSeeker
    ? COLORS.bankAccent
    : role === 'seeker'
    ? COLORS.seekerAccent
    : role === 'owner'
    ? COLORS.ownerAccent
    : COLORS.adminAccent;

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await loginForRole(role, email.trim(), password, currentCategory);
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
      <Header title={roleTitle} subtitle="PlanToPark Mobile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.roleBadgeTxt}>
              {isStorageOwner
                ? '🏢 VEHICLE STORAGE (1+ ACRE)'
                : isBankSeeker
                ? '🏦 BANKS & AUTO FINANCE'
                : role.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Quick Portal Switcher */}
        {role !== 'admin' && (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 7,
                paddingHorizontal: 4,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: currentCategory === 'standard' ? COLORS.ownerAccent : '#1e293b',
              }}
              onPress={() => setCurrentCategory('standard')}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                🅿️ Space Owner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1.2,
                paddingVertical: 7,
                paddingHorizontal: 4,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: isStorageOwner ? COLORS.storageAccent : '#1e293b',
              }}
              onPress={() => setCurrentCategory('vehicle_storage_owner')}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: isStorageOwner ? '#000000' : '#ffffff' }}>
                🏢 Storage (1+ Ac)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1.1,
                paddingVertical: 7,
                paddingHorizontal: 4,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: isBankSeeker ? COLORS.bankAccent : '#1e293b',
              }}
              onPress={() => setCurrentCategory('bank_finance_seeker')}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                🏦 Banks & Repo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.heading}>
          {isStorageOwner ? 'Vehicle Storage Partner 🏢' : isBankSeeker ? 'Bank & Auto Finance 🏦' : 'Welcome Back 👋'}
        </Text>
        <Text style={styles.subheading}>
          {isStorageOwner
            ? 'Monetize 1+ Acre secure land for seized and financed vehicle storage'
            : isBankSeeker
            ? 'Search & reserve secured 1+ Acre stockyards for repossessed vehicles'
            : 'Enter your credentials to access your account'}
        </Text>

        {/* ⚠️ Mandatory 1 Acre Policy Warning for Vehicle Storage */}
        {isStorageOwner && (
          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderWidth: 1.5,
            borderColor: COLORS.storageAccent,
            borderRadius: 14,
            padding: 12,
            marginBottom: 16,
          }}>
            <Text style={{ color: COLORS.storageAccent, fontWeight: '900', fontSize: 12, marginBottom: 4 }}>
              ⚠️ MANDATORY 1 ACRE LAND REQUIREMENT
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 16 }}>
              A minimum of 1.0 Acre (43,560 sq ft) of secure, gated/fenced land is strictly required to register and list as an authorized Vehicle Storage Yard for banks and auto finance companies.
            </Text>
          </View>
        )}

        {!!errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Login Failed</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {role === 'admin' && (
          <TouchableOpacity
            style={styles.demoBox}
            onPress={() => {
              setEmail('plantopark@gmail.com');
              setPassword('Plan2park@12');
            }}
          >
            <Text style={styles.demoTitle}>💡 Default Admin Credentials</Text>
            <Text style={styles.demoText}>Email: plantopark@gmail.com</Text>
            <Text style={styles.demoText}>Password: Plan2park@12</Text>
          </TouchableOpacity>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. name@example.com"
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
            onPress={() => navigation.navigate('ForgotPassword', { role, email })}
          >
            <Text style={{ color: themeColor, fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={`Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          onPress={handleLogin}
          loading={loading}
          variant={role === 'admin' ? 'admin' : 'primary'}
          style={{ marginTop: 12 }}
        />

        {role !== 'admin' && (
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { role, category: currentCategory })}>
              <Text style={[styles.signupLink, { color: themeColor }]}>
                {isStorageOwner ? 'Register 1+ Acre Land' : isBankSeeker ? 'Register Bank / Repo Dept' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  },
  badgeRow: {
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeTxt: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 24,
  },
  demoBox: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: COLORS.adminAccent,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  demoTitle: {
    color: COLORS.adminAccent,
    fontWeight: '700',
    marginBottom: 4,
  },
  demoText: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.white,
    fontSize: 15,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  signupLink: {
    fontWeight: '700',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingRight: 10,
  },
  eyeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
