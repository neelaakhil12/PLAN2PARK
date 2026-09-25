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
  const category = route.params?.category === 'vehicle_storage_owner' ? 'vehicle_storage_owner' : 'standard';
  const isStorage = category === 'vehicle_storage_owner';

  const { loginForRole } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const themeColor = isStorage ? COLORS.storageAccent : COLORS.ownerAccent;

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      // Owner app always logs in with role 'owner'
      await loginForRole('owner', email.trim(), password);
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
      <Header
        title={isStorage ? 'Vehicle Storage Land Owner Login' : 'Space Owner Login'}
        subtitle="PlanToPark Owner"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: themeColor }]}>
            <Text style={[styles.roleBadgeTxt, isStorage && { color: '#000000' }]}>
              {isStorage ? '🏢 VEHICLE STORAGE LAND OWNER (1+ ACRE)' : '🅿️ SPACE OWNER LOGIN'}
            </Text>
          </View>
        </View>

        <Text style={styles.heading}>
          {isStorage ? 'Vehicle Storage Partner 🏢' : 'Welcome Back 👋'}
        </Text>
        <Text style={styles.subheading}>
          {isStorage
            ? 'Enter your credentials to manage your 1+ Acre vehicle storage yards for banks & auto finance'
            : 'Enter your credentials to manage your listed parking spaces, driveways & garages'}
        </Text>

        {/* ℹ️ Mandatory 1 Acre Land Requirement Note for Vehicle Storage */}
        {isStorage && (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>⚠️ MANDATORY 1 ACRE LAND REQUIREMENT</Text>
            <Text style={styles.noteText}>
              A minimum of <Text style={{ fontWeight: '800', color: '#fbbf24' }}>1.0 Acre (43,560 sq ft)</Text> of secure, gated/fenced land is strictly required for listing Commercial Vehicle Storage / Bank Seized Vehicle Stockyards.
            </Text>
          </View>
        )}

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
            placeholder="e.g. owner@example.com"
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
            onPress={() => navigation.navigate('ForgotPassword', { role: 'owner', email })}
          >
            <Text style={{ color: themeColor, fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={
            loading
              ? 'Signing in...'
              : isStorage
              ? 'Sign In as Vehicle Storage Land Owner'
              : 'Sign In as Space Owner'
          }
          onPress={handleLogin}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: themeColor }]}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerTxt}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Register', {
                role: 'owner',
                category,
              })
            }
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>
              {isStorage ? 'Register as Vehicle Storage Land Owner' : 'Register as Space Owner'}
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
    paddingTop: 10,
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
    marginBottom: 16,
    lineHeight: 19,
  },
  noteBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  noteTitle: {
    color: '#f59e0b',
    fontWeight: '800',
    fontSize: 11,
    marginBottom: 3,
  },
  noteText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
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
    fontSize: 13.5,
  },
  footerLink: {
    fontWeight: '700',
    fontSize: 13.5,
  },
});
