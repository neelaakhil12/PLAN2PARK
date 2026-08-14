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
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function RegisterScreen({ route, navigation }) {
  const role = route.params?.role || 'seeker';
  const { signupForRole, serverIp, updateServerIp } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [customIp, setCustomIp] = useState(serverIp || '192.168.29.203');
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleTitle = role === 'seeker' ? 'Create Seeker Account' : 'Register Space Owner';
  const themeColor = role === 'seeker' ? COLORS.primary : COLORS.ownerAccent;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !contact.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all details (Name, Email, Mobile, Password)');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Weak Password', 'Password must be at least 4 characters long');
      return;
    }

    setLoading(true);
    try {
      await signupForRole(role, name.trim(), email.trim(), password.trim(), contact.trim());
      Alert.alert('🎉 Welcome!', 'Account registered successfully!', [
        { text: 'OK' }
      ]);
    } catch (err) {
      Alert.alert(
        'Registration Issue',
        err.message || 'Could not register account',
        [
          { text: 'OK' },
          { text: 'Server Settings', onPress: () => setShowConfig(true) }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIp = async () => {
    await updateServerIp(customIp.trim());
    Alert.alert('Server Saved', `Backend target set to http://${customIp.trim()}:5000/api`);
    setShowConfig(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title={roleTitle} subtitle="PlanToPark Mobile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Get Started 🚀</Text>
        <Text style={styles.subheading}>Join PlanToPark as a {role.toUpperCase()}</Text>

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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit phone number"
            placeholderTextColor={COLORS.textMuted}
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
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

        {/* Server IP Config Toggle */}
        <TouchableOpacity
          style={styles.configToggle}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.configToggleTxt}>⚙️ Backend Server IP ({serverIp || '192.168.29.203'})</Text>
        </TouchableOpacity>

        {showConfig && (
          <View style={styles.configBox}>
            <Text style={styles.configTitle}>Backend Server IPv4 Address</Text>
            <Text style={styles.configSub}>Default: 192.168.29.203 (Port 5000)</Text>
            <TextInput
              style={styles.configInput}
              value={customIp}
              onChangeText={setCustomIp}
              placeholder="e.g. 192.168.29.203"
              placeholderTextColor={COLORS.textMuted}
            />
            <Button title="Save Server IP" onPress={handleSaveIp} variant="secondary" />
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
  configToggle: {
    marginTop: 28,
    alignItems: 'center',
  },
  configToggleTxt: {
    color: COLORS.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  configBox: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  configTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  configSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },
  configInput: {
    backgroundColor: COLORS.darkBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.white,
    marginBottom: 10,
  },
});
