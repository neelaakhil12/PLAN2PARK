import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';
import Header from '../../components/Header';
import GoogleSignInButton from '../../components/GoogleSignInButton';

export default function RegisterScreen({ route, navigation }) {
  const { signupForRole, googleRegister } = useContext(AuthContext);

  const role = route?.params?.role === 'owner' ? 'owner' : 'seeker';
  const category = route?.params?.category || 'standard';
  const initialEmail = route?.params?.email || '';
  const initialName = route?.params?.name || '';

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOwner = role === 'owner';
  const themeColor = isOwner ? COLORS.ownerAccent : COLORS.seekerAccent;
  const roleTitle = isOwner ? 'Create Owner Account' : 'Create Seeker Account';
  const roleBadgeTxt = isOwner ? '🅿️ SPACE OWNER REGISTRATION' : '🚗 PARKING SEEKER REGISTRATION';
  const portalSubtitle = isOwner ? 'I Have Parking' : 'I Want Parking';

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !contact.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name, Email, Mobile and Password');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Weak Password', 'Password must be at least 4 characters long');
      return;
    }

    setLoading(true);
    try {
      const extraData = {
        accountCategory: category,
      };

      await signupForRole(role, name.trim(), email.trim(), password.trim(), contact.trim(), extraData);
      Alert.alert('🎉 Welcome!', 'Account registered successfully!');
    } catch (err) {
      Alert.alert('Registration Issue', err.message || 'Could not register account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (googleToken) => {
    setLoading(true);
    try {
      await googleRegister(role, googleToken, contact);
      Alert.alert('🎉 Welcome!', 'Account registered successfully with Google!');
    } catch (err) {
      Alert.alert('Registration Issue', err.message || 'Google registration failed');
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

        <Text style={styles.heading}>{isOwner ? 'Join as Space Owner 🅿️' : 'Join as Seeker 🚗'}</Text>
        <Text style={styles.subheading}>
          {isOwner
            ? 'Monetize your vacant spaces and start earning predictable income.'
            : 'Find, reserve, and park seamlessly across prime locations.'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Akhil Kumar"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

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
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 9876543210"
            placeholderTextColor={COLORS.textMuted}
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
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
        </View>

        <Button
          title={loading ? 'Creating Account...' : isOwner ? 'Create Space Owner Account' : 'Create Seeker Account'}
          onPress={handleRegister}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: themeColor }]}
        />

        {/* Google Registration */}
        <GoogleSignInButton
          onAuthSuccess={handleGoogleSuccess}
          text={`Sign up with Google (${isOwner ? 'Owner' : 'Seeker'})`}
          disabled={loading}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerTxt}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Login', {
                role,
                category,
              })
            }
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>
              {isOwner ? 'Log In as Owner' : 'Log In as Seeker'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Portal Switch */}
        <View style={styles.switchBox}>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() =>
              navigation.replace('Register', {
                role: isOwner ? 'seeker' : 'owner',
                category: 'standard',
              })
            }
          >
            <Text style={styles.switchTxt}>
              {isOwner
                ? '🚗 Want to find parking instead? Switch to Seeker Sign Up'
                : '🅿️ Have parking space to list? Switch to Owner Sign Up'}
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
  inputGroup: {
    marginBottom: 16,
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
    borderColor: COLORS.borderDark,
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
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 0,
    color: COLORS.white,
    fontSize: 15,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
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
    paddingBottom: 24,
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
