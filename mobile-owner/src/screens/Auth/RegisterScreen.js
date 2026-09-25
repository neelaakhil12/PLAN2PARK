import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function RegisterScreen({ route, navigation }) {
  const category = route.params?.category === 'vehicle_storage_owner' ? 'vehicle_storage_owner' : 'standard';
  const isStorageOwner = category === 'vehicle_storage_owner';

  const { signupForRole } = useContext(AuthContext);

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

  const roleTitle = isStorageOwner ? 'Register Vehicle Storage Land Owner' : 'Register Space Owner';
  const themeColor = isStorageOwner ? COLORS.storageAccent : COLORS.ownerAccent;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !contact.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name, Email, Mobile and Password');
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

    if (password.length < 4) {
      Alert.alert('Weak Password', 'Password must be at least 4 characters long');
      return;
    }

    setLoading(true);
    try {
      const extraData = {
        accountCategory: category,
        ...(isStorageOwner ? { landAcres: parseFloat(landAcres), fencingType, hasSecurityGuards } : {}),
      };

      // Always register as role 'owner' in Owner App
      await signupForRole('owner', name.trim(), email.trim(), password.trim(), contact.trim(), extraData);
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
      <Header title={roleTitle} subtitle="PlanToPark Owner" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: themeColor }]}>
            <Text style={[styles.roleBadgeTxt, isStorageOwner && { color: '#000000' }]}>
              {isStorageOwner ? '🏢 VEHICLE STORAGE (1+ ACRE)' : '🅿️ SPACE OWNER REGISTRATION'}
            </Text>
          </View>
        </View>

        <Text style={styles.heading}>
          {isStorageOwner ? 'List 1+ Acre Land 🏢' : 'Join as Space Owner 🅿️'}
        </Text>
        <Text style={styles.subheading}>
          {isStorageOwner
            ? 'Monetize your vacant 1+ Acre land for bank seized vehicle stockyard'
            : 'Turn your vacant driveway, garage, or commercial parking lot into income'}
        </Text>

        {/* ⚠️ Mandatory 1 Acre Policy Warning for Vehicle Storage */}
        {isStorageOwner && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ MANDATORY 1 ACRE LAND REQUIREMENT</Text>
            <Text style={styles.warningTxt}>
              To register as an authorized Vehicle Storage Yard for Banks & Auto Finance repossession, you must have a minimum of <Text style={{ fontWeight: '800', color: '#fbbf24' }}>1.0 Acre (43,560 sq ft)</Text> of secure, gated/fenced land.
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isStorageOwner ? 'Landowner / Company Name' : 'Full Name'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isStorageOwner ? 'e.g. Ramesh Reddy (Landowner)' : 'e.g. Ramesh Reddy'}
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

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

        {isStorageOwner && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Land Area (Acres - Minimum 1.0)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1.5"
                placeholderTextColor={COLORS.textMuted}
                value={landAcres}
                onChangeText={setLandAcres}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Boundary Security / Fencing Type</Text>
              <View style={styles.fencingRow}>
                {['Compound Wall', 'Barbed Wire Fencing', 'Chain Link Mesh'].map((fType) => (
                  <TouchableOpacity
                    key={fType}
                    style={[
                      styles.fencingOption,
                      fencingType === fType && { borderColor: COLORS.storageAccent, backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                    ]}
                    onPress={() => setFencingType(fType)}
                  >
                    <Text style={[styles.fencingTxt, fencingType === fType && { color: COLORS.storageAccent, fontWeight: '700' }]}>
                      {fType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.switchLabel}>24/7 Security Guards Available</Text>
                <Text style={styles.switchDesc}>Guards physically stationed at premises</Text>
              </View>
              <Switch
                value={hasSecurityGuards}
                onValueChange={setHasSecurityGuards}
                trackColor={{ false: '#334155', true: COLORS.storageAccent }}
                thumbColor="#ffffff"
              />
            </View>
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
          title={
            loading
              ? 'Registering...'
              : isStorageOwner
              ? 'Register as Vehicle Storage Land Owner'
              : 'Register as Space Owner'
          }
          onPress={handleRegister}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: themeColor }]}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerTxt}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Login', {
                role: 'owner',
                category,
              })
            }
          >
            <Text style={[styles.footerLink, { color: themeColor }]}>
              {isStorageOwner ? 'Login as Vehicle Storage Land Owner' : 'Login as Space Owner'}
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
    marginBottom: 20,
    lineHeight: 19,
  },
  warningBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#f59e0b',
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  warningTxt: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
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
  fencingRow: {
    gap: 8,
  },
  fencingOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  fencingTxt: {
    color: '#cbd5e1',
    fontSize: 12.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  switchDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
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
    fontSize: 13.5,
  },
  footerLink: {
    fontWeight: '700',
    fontSize: 13.5,
  },
});
