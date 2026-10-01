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
  Platform,
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
  const FENCING_OPTIONS = ['Compound Wall', 'Barbed Wire Fencing', 'Chain Link Mesh'];
  const [fencingTypes, setFencingTypes] = useState(['Compound Wall']);
  const [hasSecurityGuards, setHasSecurityGuards] = useState(true);

  const toggleFencingType = (fType) => {
    if (fencingTypes.includes(fType)) {
      if (fencingTypes.length === 1) {
        Alert.alert('Selection Required', 'Please select at least one boundary security/fencing feature.');
        return;
      }
      setFencingTypes(fencingTypes.filter((t) => t !== fType));
    } else {
      setFencingTypes([...fencingTypes, fType]);
    }
  };

  const toggleSelectAllFencing = () => {
    if (fencingTypes.length === FENCING_OPTIONS.length) {
      setFencingTypes([FENCING_OPTIONS[0]]);
    } else {
      setFencingTypes([...FENCING_OPTIONS]);
    }
  };

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
        ...(isStorageOwner ? { landAcres: parseFloat(landAcres), fencingType: fencingTypes.join(', '), hasSecurityGuards } : {}),
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
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.label}>Boundary Security / Fencing Type</Text>
                <TouchableOpacity onPress={toggleSelectAllFencing} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: COLORS.storageAccent, fontSize: 12, fontWeight: '800' }}>
                    {fencingTypes.length === FENCING_OPTIONS.length ? '✓ Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fencingRow}>
                {FENCING_OPTIONS.map((fType) => {
                  const isChecked = fencingTypes.includes(fType);
                  return (
                    <TouchableOpacity
                      key={fType}
                      style={[
                        styles.fencingOption,
                        isChecked && { borderColor: COLORS.storageAccent, backgroundColor: 'rgba(245, 158, 11, 0.12)' },
                      ]}
                      onPress={() => toggleFencingType(fType)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkboxBox,
                        isChecked && { backgroundColor: COLORS.storageAccent, borderColor: COLORS.storageAccent }
                      ]}>
                        {isChecked && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <Text style={[styles.fencingTxt, isChecked && { color: COLORS.storageAccent, fontWeight: '700' }]}>
                        {fType}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
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
  passwordInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
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
  fencingRow: {
    gap: 8,
  },
  fencingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    gap: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkMark: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 14,
  },
  fencingTxt: {
    color: '#cbd5e1',
    fontSize: 13.5,
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
