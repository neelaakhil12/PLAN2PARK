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

export default function RegisterScreen({ route, navigation }) {
  const isBankSeeker = route.params?.category === 'bank_finance_seeker';

  const { signupForRole } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);

  const roleTitle = isBankSeeker ? 'Register Bank & Finance' : 'Create Seeker Account';
  const themeColor = isBankSeeker ? COLORS.bankAccent : COLORS.seekerAccent;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !contact.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name, Email, Mobile and Password');
      return;
    }

    if (isBankSeeker && !organizationName.trim()) {
      Alert.alert('Required', 'Please enter your Bank / NBFC / Recovery Agency Name');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Weak Password', 'Password must be at least 4 characters long');
      return;
    }

    setLoading(true);
    try {
      const extraData = {
        accountCategory: isBankSeeker ? 'bank_finance_seeker' : 'standard',
        ...(isBankSeeker ? { organizationName: organizationName.trim() } : {}),
      };

      await signupForRole('seeker', name.trim(), email.trim(), password.trim(), contact.trim(), extraData);
      Alert.alert('🎉 Welcome!', 'Account registered successfully!');
    } catch (err) {
      Alert.alert(
        'Registration Issue',
        err.message || 'Could not register account'
      );
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
              {isBankSeeker ? '🏦 BANK & AUTO FINANCE REGISTRATION' : '🚗 PARKING SEEKER REGISTRATION'}
            </Text>
          </View>
        </View>

        <Text style={styles.heading}>
          {isBankSeeker ? 'Bank & Finance Sign Up 🏦' : 'Join as Seeker 🚗'}
        </Text>
        <Text style={styles.subheading}>
          {isBankSeeker
            ? 'Access secured 1+ Acre yards for repossessed and seized vehicles'
            : 'Find, reserve, and park seamlessly across prime locations'}
        </Text>

        {isBankSeeker && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank / NBFC / Organization Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC Auto Loans / Shriram Finance"
              placeholderTextColor={COLORS.textMuted}
              value={organizationName}
              onChangeText={setOrganizationName}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isBankSeeker ? 'Authorized Officer Name' : 'Full Name'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isBankSeeker ? 'e.g. Rajesh Kumar (Recovery Manager)' : 'e.g. Akhil Kumar'}
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isBankSeeker ? 'Official Work Email' : 'Email Address'}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. name@bank.com"
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
        </View>

        <Button
          title={loading ? 'Creating Account...' : isBankSeeker ? 'Register Bank / Finance Dept' : 'Create Seeker Account'}
          onPress={handleRegister}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: themeColor }]}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerTxt}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Login', {
                role: 'seeker',
                category: isBankSeeker ? 'bank_finance_seeker' : 'standard',
              })
            }
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>
              {isBankSeeker ? 'Bank & Auto Finance Login' : 'Log In as Seeker'}
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
    marginTop: 22,
    paddingBottom: 24,
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
