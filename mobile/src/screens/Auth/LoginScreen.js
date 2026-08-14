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

export default function LoginScreen({ route, navigation }) {
  const role = route.params?.role || 'seeker';
  const { loginForRole } = useContext(AuthContext);

  const [email, setEmail] = useState(role === 'admin' ? 'plantopark@gmail.com' : '');
  const [password, setPassword] = useState(role === 'admin' ? 'Plan2park@12' : '');
  const [loading, setLoading] = useState(false);

  const roleTitle =
    role === 'seeker' ? 'Seeker Login' : role === 'owner' ? 'Owner Login' : 'Admin Login';
  const themeColor =
    role === 'seeker'
      ? COLORS.primary
      : role === 'owner'
      ? COLORS.ownerAccent
      : COLORS.adminAccent;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await loginForRole(role, email.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
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
            <Text style={styles.roleBadgeTxt}>{role.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.heading}>Welcome Back 👋</Text>
        <Text style={styles.subheading}>Enter your credentials to access your account</Text>

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
          title={`Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          onPress={handleLogin}
          loading={loading}
          variant={role === 'admin' ? 'admin' : 'primary'}
          style={{ marginTop: 12 }}
        />

        {role !== 'admin' && (
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { role })}>
              <Text style={[styles.signupLink, { color: themeColor }]}>Sign Up</Text>
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
});
