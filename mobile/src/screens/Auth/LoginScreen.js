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
import GoogleSignInButton from '../../components/GoogleSignInButton';

export default function LoginScreen({ route, navigation }) {
  const { loginForRole, googleLogin } = useContext(AuthContext);

  const role = route?.params?.role === 'owner' ? 'owner' : 'seeker';
  const category = route?.params?.category || 'standard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isOwner = role === 'owner';
  const themeColor = isOwner ? COLORS.ownerAccent : COLORS.seekerAccent;
  const roleTitle = isOwner ? 'Space Owner Login' : 'Parking Seeker Login';
  const roleBadgeTxt = isOwner ? '🅿️ SPACE OWNER PORTAL' : '🚗 PARKING SEEKER PORTAL';
  const portalSubtitle = isOwner ? 'I Have Parking' : 'I Want Parking';

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password');
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await loginForRole(role, email.trim(), password, category);
    } catch (err) {
      const msg = err.message || 'Invalid credentials';
      setErrorMsg(msg);
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (googleToken) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await googleLogin(role, googleToken);
    } catch (err) {
      if (err.notFound) {
        Alert.alert(
          'No Account Found',
          isOwner
            ? 'No space owner account found with this Google email. Please sign up first.'
            : 'No parking seeker account found with this Google email. Please sign up first.',
          [
            {
              text: 'Sign Up',
              onPress: () =>
                navigation.navigate('Register', {
                  role,
                  category,
                  email: err.email,
                  name: err.name,
                }),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        const msg = err.message || 'Google sign-in failed';
        setErrorMsg(msg);
        Alert.alert('Google Sign-In Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header
        title={roleTitle}
        subtitle={portalSubtitle}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.roleBadgeTxt}>{roleBadgeTxt}</Text>
          </View>
        </View>

        <Text style={styles.heading}>Welcome Back 👋</Text>
        <Text style={styles.subheading}>
          {isOwner
            ? 'Log in to manage your spaces, incoming bookings, and payouts.'
            : 'Log in to find, navigate, and reserve verified parking spots.'}
        </Text>

        {/* Platform Notice */}
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={15} color="#fbbf24" style={{ marginRight: 6 }} />
            <Text style={styles.warningTitle}>IMPORTANT PLATFORM NOTICE</Text>
          </View>
          <Text style={styles.warningText}>
            Plan To Park acts only as a technology platform connecting parking providers and vehicle owners. Plan to park is not responsible for any kind of disturbances like theft, dent, or fight between space owner and vehicle owner. Both should coordinate with each other.
          </Text>
        </View>

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
              style={styles.passwordInput}
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
          title={loading ? 'Signing in...' : isOwner ? 'Sign In as Space Owner' : 'Sign In as Parking Seeker'}
          onPress={handleLogin}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: themeColor }]}
        />

        {/* Google Sign In */}
        <GoogleSignInButton
          onAuthSuccess={handleGoogleSuccess}
          text={`Sign in with Google (${isOwner ? 'Owner' : 'Seeker'})`}
          disabled={loading}
        />

        {/* Register Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerTxt}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Register', {
                role,
                category,
              })
            }
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>
              {isOwner ? 'Sign Up as Space Owner' : 'Sign Up as Parking Seeker'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Portal Switch */}
        <View style={styles.switchBox}>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() =>
              navigation.replace('Login', {
                role: isOwner ? 'seeker' : 'owner',
                category: 'standard',
              })
            }
          >
            <Text style={styles.switchTxt}>
              {isOwner
                ? '🚗 Want to find parking instead? Switch to Seeker Login'
                : '🅿️ Have parking space to list? Switch to Owner Login'}
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
    marginBottom: 18,
    lineHeight: 19,
  },
  warningBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningTitle: {
    color: '#fbbf24',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  warningText: {
    color: '#fef3c7',
    fontSize: 11.5,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  errorText: {
    color: '#fee2e2',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 12,
  },
  submitBtn: {
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerTxt: {
    color: COLORS.textMuted,
    fontSize: 13.5,
  },
  footerLink: {
    fontWeight: '700',
    fontSize: 13.5,
  },
  switchBox: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  switchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  switchTxt: {
    color: '#cbd5e1',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
