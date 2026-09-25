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
  const initialRole = route.params?.role || 'owner';
  const category = route.params?.category || (initialRole === 'owner' ? 'vehicle_storage_owner' : 'standard');
  const role = (category === 'bank_finance_seeker') ? 'seeker' : (category === 'vehicle_storage_owner' ? 'owner' : initialRole);
  const { signupForRole } = useContext(AuthContext);

  const isStorageOwner = category === 'vehicle_storage_owner';
  const isBankSeeker = category === 'bank_finance_seeker';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Storage Landowner specific fields
  const [landAcres, setLandAcres] = useState('1.0');
  const [fencingType, setFencingType] = useState('Compound Wall');
  const [hasSecurityGuards, setHasSecurityGuards] = useState(true);

  // Bank & Auto Finance specific fields
  const [organizationName, setOrganizationName] = useState('');

  const roleTitle = isStorageOwner
    ? 'Register 1+ Acre Stockyard'
    : isBankSeeker
    ? 'Register Bank & Repo Dept'
    : role === 'seeker'
    ? 'Create Seeker Account'
    : 'Register Space Owner';

  const themeColor = isStorageOwner
    ? COLORS.storageAccent
    : isBankSeeker
    ? COLORS.bankAccent
    : role === 'seeker'
    ? COLORS.seekerAccent
    : COLORS.ownerAccent;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !contact.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all details (Name, Email, Mobile, Password)');
      return;
    }

    if (isStorageOwner) {
      const acres = parseFloat(landAcres);
      if (isNaN(acres) || acres < 1.0) {
        Alert.alert(
          '1 Acre Minimum Required',
          'A minimum of 1.0 Acre of secure land is strictly required to register as an authorized Vehicle Storage Yard for banks and auto finance companies.'
        );
        return;
      }
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
        accountCategory: category,
        ...(isStorageOwner ? { landAcres: parseFloat(landAcres), fencingType, hasSecurityGuards } : {}),
        ...(isBankSeeker ? { organizationName: organizationName.trim() } : {}),
      };

      await signupForRole(role, name.trim(), email.trim(), password.trim(), contact.trim(), extraData);
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
      <Header title={roleTitle} subtitle="PlanToPark Mobile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>
          {isStorageOwner ? 'List 1+ Acre Land 🏢' : isBankSeeker ? 'Bank & Finance Sign Up 🏦' : 'Get Started 🚀'}
        </Text>
        <Text style={styles.subheading}>
          {isStorageOwner
            ? 'Monetize your vacant 1+ Acre land for bank seized vehicle stockyard'
            : isBankSeeker
            ? 'Access secured 1+ Acre yards for repossessed vehicles'
            : `Join PlanToPark as a ${role.toUpperCase()}`}
        </Text>

        {/* ⚠️ Mandatory 1 Acre Policy Warning for Vehicle Storage */}
        {isStorageOwner && (
          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderWidth: 1.5,
            borderColor: COLORS.storageAccent,
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
          }}>
            <Text style={{ color: COLORS.storageAccent, fontWeight: '900', fontSize: 13, marginBottom: 4 }}>
              ⚠️ MANDATORY 1 ACRE LAND REQUIREMENT
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18 }}>
              To register as an authorized Vehicle Storage Yard for Banks & Auto Finance repossession, you must have a minimum of 1.0 Acre (43,560 sq ft) of secure, gated/fenced land.
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Bank & Finance: Organization Name */}
        {isBankSeeker && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank / Finance / Repo Agency Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC Bank Auto Loans / Shiva Agency"
              placeholderTextColor={COLORS.textMuted}
              value={organizationName}
              onChangeText={setOrganizationName}
            />
          </View>
        )}

        {/* Storage Landowner: Land Area in Acres */}
        {isStorageOwner && (
          <>
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.label}>Total Land Area (Acres) *</Text>
                <Text style={{ fontSize: 11, color: COLORS.storageAccent, fontWeight: '800' }}>MIN 1.0 ACRE</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="1.0"
                placeholderTextColor={COLORS.textMuted}
                value={landAcres}
                onChangeText={setLandAcres}
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                Contiguous land size available for vehicle stockyard.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fencing & Boundary Security</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {['Compound Wall', 'High Chain-link', 'Barbed Wire'].map((fence) => (
                  <TouchableOpacity
                    key={fence}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: fencingType === fence ? COLORS.storageAccent : '#1e293b',
                      borderWidth: 1,
                      borderColor: fencingType === fence ? COLORS.storageAccent : '#334155',
                    }}
                    onPress={() => setFencingType(fence)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: fencingType === fence ? '#000000' : '#ffffff' }}>
                      {fence}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#1e293b',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: hasSecurityGuards ? COLORS.storageAccent : '#334155',
                marginBottom: 16,
              }}
              onPress={() => setHasSecurityGuards(!hasSecurityGuards)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>🛡️ 24/7 Security Guards Available</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>Are guards on site day and night?</Text>
              </View>
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: hasSecurityGuards ? COLORS.storageAccent : 'transparent',
                borderWidth: 2,
                borderColor: hasSecurityGuards ? COLORS.storageAccent : '#64748b',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {hasSecurityGuards && <Text style={{ color: '#000000', fontSize: 12, fontWeight: '900' }}>✓</Text>}
              </View>
            </TouchableOpacity>
          </>
        )}

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
          title={`Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: 12, backgroundColor: themeColor }}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
            <Text style={[styles.loginLink, { color: themeColor }]}>Sign In</Text>
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
    paddingBottom: 40,
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
  inputGroup: {
    marginBottom: 16,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  loginLink: {
    fontWeight: '700',
    fontSize: 14,
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
